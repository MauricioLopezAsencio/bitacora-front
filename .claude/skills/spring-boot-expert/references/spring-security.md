# Spring Security Reference

## Filter Chain Configuration

```java
@Configuration
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final MdcFilter mdcFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .exceptionHandling(ex -> ex
                .authenticationEntryPoint(unauthorizedEntryPoint())
                .accessDeniedHandler(accessDeniedHandler())
            )
            .authorizeHttpRequests(auth -> auth
                .requestMatchers("/api/public/**", "/actuator/health").permitAll()
                .requestMatchers("/api/admin/**").hasAuthority("ADMIN")
                .anyRequest().authenticated()
            )
            .addFilterBefore(mdcFilter, UsernamePasswordAuthenticationFilter.class)
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
            .build();
    }

    @Bean
    AuthenticationEntryPoint unauthorizedEntryPoint() {
        return (request, response, ex) -> {
            response.setStatus(401);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            response.getWriter().write("""
                {"status":401,"message":"No autorizado","errorCode":"AUTH_TOKEN_INVALID"}
                """);
        };
    }
}
```

---

## JWT Service

```java
@Service
@RequiredArgsConstructor
public class JwtService {

    private final JwtProperties jwtProperties;
    private final RedisTemplate<String, String> redisTemplate;

    public String generateToken(UserDetails user, Map<String, Object> extraClaims) {
        final String jti = UUID.randomUUID().toString();
        return Jwts.builder()
            .claims(extraClaims)
            .subject(user.getUsername())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + jwtProperties.getExpiration()))
            .id(jti)
            .signWith(getSigningKey(), Jwts.SIG.HS256)
            .compact();
    }

    public void revokeToken(String jti) {
        redisTemplate.opsForValue().set(
            blacklistKey(jti), "revoked",
            jwtProperties.getExpiration(), TimeUnit.MILLISECONDS
        );
    }

    public void validateJti(String jti) {
        if (Boolean.TRUE.equals(redisTemplate.hasKey(blacklistKey(jti)))) {
            throw new JtiRevocadoException("Token revocado: " + jti);
        }
    }

    private String blacklistKey(String jti) { return "blacklist:" + jti; }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        final String jti = extractClaim(token, Claims::getId);
        validateJti(jti);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private boolean isTokenExpired(String token) {
        return extractClaim(token, Claims::getExpiration).before(new Date());
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSigningKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSigningKey() {
        return Keys.hmacShaKeyFor(
            Decoders.BASE64.decode(jwtProperties.getSecret())
        );
    }
}
```

---

## JWT Auth Filter

```java
@Component
@RequiredArgsConstructor
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(HttpServletRequest request,
            HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        final String authHeader = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        final String jwt = authHeader.substring(7);
        try {
            final String username = jwtService.extractUsername(jwt);
            if (username != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                final var userDetails = userDetailsService.loadUserByUsername(username);
                if (jwtService.isTokenValid(jwt, userDetails)) {
                    final var authToken = new UsernamePasswordAuthenticationToken(
                        userDetails, null, userDetails.getAuthorities()
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    MDC.put("authenticatedUser", username);
                }
            }
        } catch (JwtException ex) {
            log.warn("JWT validation failed: {}", ex.getMessage());
        }
        filterChain.doFilter(request, response);
    }
}
```

---

## MFA Flow with MFA_STATUS Claim

```java
// Token with MFA_STATUS claim
public String generatePreAuthToken(String username) {
    return Jwts.builder()
        .subject(username)
        .claim("MFA_STATUS", "PENDING")
        .expiration(new Date(System.currentTimeMillis() + 300_000)) // 5 min
        .signWith(getSigningKey())
        .compact();
}

public String generateFullAuthToken(UserDetails user) {
    return generateToken(user, Map.of("MFA_STATUS", "VERIFIED"));
}

// Guard in filter: reject tokens with MFA_STATUS=PENDING on protected routes
@Component
public class MfaGuardFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain) {
        final var mfaStatus = extractMfaStatus(req);
        if ("PENDING".equals(mfaStatus) && !req.getRequestURI().startsWith("/api/auth/mfa")) {
            res.setStatus(403);
            return;
        }
        chain.doFilter(req, res);
    }
}
```

---

## Permission-Based Access Control

```java
// Granular authority strings (not roles)
@PreAuthorize("hasAuthority('TRANSACCIONES_LECTURA')")
public List<TransaccionDto> listar() { ... }

@PreAuthorize("hasAuthority('TRANSACCIONES_ESCRITURA')")
public TransaccionDto crear(TransaccionCreateRequest req) { ... }

// Complex: custom evaluator
@PreAuthorize("@permissionEvaluator.canAccess(authentication, #clienteId, 'CLIENTE_WRITE')")
public void actualizar(UUID clienteId, ClienteDto dto) { ... }

// Custom evaluator
@Component
public class PermissionEvaluator {
    public boolean canAccess(Authentication auth, UUID resourceId, String permission) {
        // Check ownership + authority
        return auth.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals(permission))
            && isResourceOwner(auth.getName(), resourceId);
    }
}
```

---

## SecurityUtils Helper

```java
@UtilityClass
public class SecurityUtils {

    public static String currentUsername() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .map(Authentication::getName)
            .orElse("anonymous");
    }

    public static boolean hasAuthority(String authority) {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .map(auth -> auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals(authority)))
            .orElse(false);
    }

    public static List<String> currentAuthorities() {
        return Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
            .map(auth -> auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .toList())
            .orElse(List.of());
    }
}
```

---

## AWS ALB + Cognito Integration

```yaml
# application.yml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          # ALB forwards Cognito token in X-Amzn-Oidc-Data header
          issuer-uri: https://cognito-idp.{region}.amazonaws.com/{userPoolId}
```

```java
// Extract ALB-forwarded identity
@Component
public class AlbJwtFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain) {
        final String albToken = req.getHeader("X-Amzn-Oidc-Data");
        if (albToken != null) {
            // Decode and set SecurityContext from ALB token
        }
        chain.doFilter(req, res);
    }
}
```