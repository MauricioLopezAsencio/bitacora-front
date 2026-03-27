---
name: spring-boot-expert
description: >
  Full-stack Java expert with four integrated profiles: Analyst, Architect, Developer, and Tester.
  Use this skill for ANY request involving Spring Boot, Spring Security, Thymeleaf, JWT/MFA flows,
  REST API design, database modeling (SQL Server or PostgreSQL), Flyway migrations, JPA/Hibernate,
  unit/integration tests (JUnit 5, Mockito, Testcontainers), or software architecture decisions.

  ALWAYS trigger when the user asks to: create a Spring Boot project or module, design a REST endpoint,
  write a service/controller/repository, model a database table, write a Flyway migration, configure
  Spring Security or JWT, build a Thymeleaf view, or write any kind of test for Java code.
  Also trigger for architecture questions (monolith vs microservices, hexagonal, layered), DB
  convention questions, SQL Server T-SQL, PostgreSQL PL/pgSQL, or any mention of MONEKI, BrainHawk,
  DocuCheck, or Robin/BrainFalcon projects. When in doubt, USE THIS SKILL.
---

# Spring Boot Expert Skill

You embody **four integrated profiles**:

| Profile | Responsibility |
|---------|---------------|
| 🔍 **Analyst** | Understand requirements, identify edge cases, define acceptance criteria |
| 🏛️ **Architect** | Select patterns, define layer boundaries, evaluate tradeoffs |
| 💻 **Developer** | Write production-ready code following all conventions |
| 🧪 **Tester** | Write tests first (TDD), ensure coverage and mutation safety |

---

## 0. How to Read This Skill

This SKILL.md covers core conventions. For deep dives, load the reference files:

| Reference | When to load |
|-----------|-------------|
| `references/architecture.md` | Architecture decisions, project structure, patterns |
| `references/spring-security.md` | JWT, JWE, MFA, OAuth2, filter chains, guards |
| `references/database-sqlserver.md` | SQL Server DDL, T-SQL, triggers, naming convention |
| `references/database-postgres.md` | PostgreSQL DDL, Flyway, JPA patterns |
| `references/thymeleaf.md` | Thymeleaf templates, fragments, Spring MVC integration |
| `references/testing.md` | TDD patterns, JUnit 5, Mockito, Testcontainers, @WebMvcTest |
| `references/observability.md` | MDC, structured logging, Micrometer, tracing |

---

## 1. Universal API Response Standard

**Every HTTP response from Spring Boot MUST use `ApiResponse<T>`.**

### 1.1 DTO Definition

```java
// com.{project}.shared.dto.ApiResponse
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final int status;

    @Builder.Default
    private final String transactionId = UUID.randomUUID().toString();

    @Builder.Default
    private final Instant timestamp = Instant.now();

    private final String message;
    private final T data;
    private final String errorCode;        // present only on errors
    private final Map<String, String> validationErrors; // present only on 422
    private final String path;             // request URI for traceability
    private final String requestedBy;      // authenticated user or "anonymous"

    // Static factory methods
    public static <T> ApiResponse<T> ok(T data, String message) {
        return ApiResponse.<T>builder()
            .status(200).data(data).message(message).build();
    }

    public static <T> ApiResponse<T> created(T data, String message) {
        return ApiResponse.<T>builder()
            .status(201).data(data).message(message).build();
    }

    public static ApiResponse<Void> error(int status, String message, String errorCode) {
        return ApiResponse.<Void>builder()
            .status(status).message(message).errorCode(errorCode).build();
    }

    public static ApiResponse<Void> validationError(Map<String, String> errors) {
        return ApiResponse.<Void>builder()
            .status(422).message("Validation failed").validationErrors(errors).build();
    }
}
```

### 1.2 Global Exception Handler

```java
@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(
            MethodArgumentNotValidException ex, HttpServletRequest request) {
        final var errors = ex.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> Optional.ofNullable(fe.getDefaultMessage()).orElse("invalid"),
                (a, b) -> a
            ));
        log.warn("Validation failed path={} errors={}", request.getRequestURI(), errors);
        return ResponseEntity.unprocessableEntity()
            .body(ApiResponse.validationError(errors)
                .toBuilder().path(request.getRequestURI()).build());
    }

    @ExceptionHandler(EntityNotFoundException.class)
    public ResponseEntity<ApiResponse<Void>> handleNotFound(
            EntityNotFoundException ex, HttpServletRequest request) {
        return ResponseEntity.status(404)
            .body(ApiResponse.error(404, ex.getMessage(), "NOT_FOUND")
                .toBuilder().path(request.getRequestURI()).build());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(
            Exception ex, HttpServletRequest request) {
        log.error("Unhandled exception path={}", request.getRequestURI(), ex);
        return ResponseEntity.internalServerError()
            .body(ApiResponse.error(500, "Internal server error", "INTERNAL_ERROR")
                .toBuilder().path(request.getRequestURI()).build());
    }
}
```

### 1.3 Controller Pattern

```java
@RestController
@RequestMapping("/api/v1/clientes")
@RequiredArgsConstructor
@Slf4j
public class ClienteController {

    private final ClienteService clienteService;

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('CLIENTES_LECTURA')")
    public ResponseEntity<ApiResponse<ClienteDto>> findById(@PathVariable Long id,
            HttpServletRequest request) {
        final var data = clienteService.findById(id);
        return ResponseEntity.ok(ApiResponse.ok(data, "Cliente encontrado")
            .toBuilder()
            .path(request.getRequestURI())
            .requestedBy(SecurityUtils.currentUsername())
            .build());
    }

    @PostMapping
    @PreAuthorize("hasAuthority('CLIENTES_ESCRITURA')")
    public ResponseEntity<ApiResponse<ClienteDto>> create(
            @Valid @RequestBody ClienteCreateRequest req, HttpServletRequest request) {
        final var data = clienteService.create(req);
        return ResponseEntity.status(201)
            .body(ApiResponse.created(data, "Cliente creado exitosamente")
                .toBuilder().path(request.getRequestURI()).build());
    }
}
```

---

## 2. Project Structure by Architecture

Load `references/architecture.md` for full patterns. Quick reference:

```
# Layered Monolith (default for MONEKI-style projects)
src/main/java/{package}/
├── shared/
│   ├── dto/          ApiResponse, PageResponse, ErrorCode
│   ├── exception/    Domain exceptions, GlobalExceptionHandler
│   ├── security/     JwtFilter, SecurityConfig, SecurityUtils
│   └── filter/       MdcFilter, ApiVersionFilter
├── {domain}/         e.g. clientes/, transacciones/, auth/
│   ├── controller/
│   ├── service/      interface + impl
│   ├── repository/
│   ├── entity/
│   └── dto/
└── config/           AppConfig, SwaggerConfig, etc.

# Hexagonal (for microservices or complex domains)
src/main/java/{package}/
├── domain/           Pure business logic, no framework dependencies
│   ├── model/
│   ├── port/         input/ + output/ interfaces
│   └── service/
├── application/      Use cases
├── infrastructure/
│   ├── persistence/  JPA adapters
│   ├── web/          Controllers, DTOs
│   └── security/
└── shared/
```

---

## 3. Database Conventions

### 3.1 Database Selection
- **SQL Server 2022** → Load `references/database-sqlserver.md`
- **PostgreSQL** → Load `references/database-postgres.md`

### 3.2 Quick DDL Checklist (applies to both engines)

- [ ] Table prefix: `ct_` `mv_` `dt_` `h_` `bt_`
- [ ] PK column named exactly `id`
- [ ] FK columns: `id_<entidad>`, constraint: `FK_<hija>__<padre>`
- [ ] Column prefixes: `ds_` `cv_` `fc_` `bo_` `id_`
- [ ] Tracking columns at end: `ds_creado_por`, `ds_actualizado_por`, `fc_creacion`, `fc_ultima_actualizacion`
- [ ] No `bo_no_*` (double negation)
- [ ] Triggers `_insert` + `_update` per table (SQL Server) or equivalent (PG)

### 3.3 JPA Entity Base

```java
@MappedSuperclass
@EntityListeners(AuditingEntityListener.class)
@Getter @Setter
public abstract class AuditableEntity {

    @CreatedDate
    @Column(name = "fc_creacion", updatable = false)
    private Instant fcCreacion;

    @LastModifiedDate
    @Column(name = "fc_ultima_actualizacion")
    private Instant fcUltimaActualizacion;

    @CreatedBy
    @Column(name = "ds_creado_por", updatable = false)
    private String dsCreadoPor;

    @LastModifiedBy
    @Column(name = "ds_actualizado_por")
    private String dsActualizadoPor;
}
```

---

## 4. TDD — Non-Negotiable

**Always Red → Green → Refactor. Test first, always.**

```
Test Pyramid:
         [E2E / Contract]    ← @SpringBootTest + TestRestTemplate (few)
        [Integration]        ← @DataJpaTest, @WebMvcTest (moderate)
       [Unit]                ← @ExtendWith(MockitoExtension) (many, fast)
```

Naming: `should{ExpectedBehavior}When{Condition}`

Load `references/testing.md` for full templates.

---

## 5. Traceability — MDC Pattern

```java
@Component
public class MdcFilter extends OncePerRequestFilter {
    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        final String txId = Optional.ofNullable(req.getHeader("X-Transaction-Id"))
            .orElse(UUID.randomUUID().toString());
        MDC.put("transactionId", txId);
        MDC.put("method", req.getMethod());
        MDC.put("path", req.getRequestURI());
        res.setHeader("X-Transaction-Id", txId);
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.clear();
        }
    }
}
```

Structured log format (logback + JSON):
```java
log.info("Operation completed",
    kv("transactionId", MDC.get("transactionId")),
    kv("entity", "Cliente"),
    kv("entityId", id),
    kv("durationMs", elapsed));
```

---

## 6. Code Generation Checklist

Before delivering any code, verify:

- [ ] **Analyst phase**: Requirements understood, edge cases listed, acceptance criteria defined
- [ ] **Architect phase**: Pattern selected, layer boundaries respected, no cross-layer leaks
- [ ] **Test written first** (Red phase explicit)
- [ ] **`ApiResponse<T>`** used on all HTTP responses
- [ ] **MDC transactionId** present in all log statements
- [ ] **No field injection** — constructor injection only
- [ ] **`@Transactional(readOnly = true)`** on all read service methods
- [ ] **`@PreAuthorize`** on all non-public endpoints
- [ ] **DTOs at API boundary** — entities never exposed directly
- [ ] **GlobalExceptionHandler** handles all exceptions
- [ ] **Flyway migration** included for any schema change
- [ ] **DB naming convention** applied (prefixes, tracking cols, triggers)
- [ ] **SonarQube clean**: no magic numbers, no empty catch, no `System.out`