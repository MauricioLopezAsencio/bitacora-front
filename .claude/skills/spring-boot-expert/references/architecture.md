# Architecture Reference

## Architecture Selection Guide

| Context | Recommended Pattern | When |
|---------|--------------------|----|
| Single team, unified domain | **Layered Monolith** | MONEKI, DocuCheck |
| Complex domain, testability | **Hexagonal (Ports & Adapters)** | BrainHawk ML pipeline |
| Independent scaling/deploy | **Microservices** | MS-AUTH, MS-CLIENTES split |
| Simple CRUD + views | **Spring MVC + Thymeleaf** | Robin admin panel |

---

## Layered Monolith

### Full Package Structure
```
src/main/java/{base}/
├── shared/
│   ├── dto/
│   │   ├── ApiResponse.java          # Universal response wrapper
│   │   ├── PageResponse.java         # Paginated response
│   │   └── ErrorCode.java            # Enum with codes + HTTP status
│   ├── exception/
│   │   ├── GlobalExceptionHandler.java
│   │   ├── EntityNotFoundException.java
│   │   ├── BusinessRuleException.java
│   │   └── UnauthorizedException.java
│   ├── security/
│   │   ├── SecurityConfig.java
│   │   ├── JwtAuthFilter.java
│   │   ├── JwtService.java
│   │   └── SecurityUtils.java
│   ├── filter/
│   │   ├── MdcFilter.java
│   │   └── ApiVersionFilter.java
│   └── config/
│       ├── AppConfig.java
│       ├── JpaConfig.java            # @EnableJpaAuditing
│       └── SwaggerConfig.java
│
├── {domain}/                         # One package per bounded context
│   ├── controller/
│   │   └── {Domain}Controller.java
│   ├── service/
│   │   ├── {Domain}Service.java      # Interface
│   │   └── {Domain}ServiceImpl.java  # Implementation
│   ├── repository/
│   │   └── {Domain}Repository.java   # JpaRepository extension
│   ├── entity/
│   │   └── {Domain}.java             # @Entity
│   ├── dto/
│   │   ├── {Domain}Dto.java          # Read model
│   │   ├── {Domain}CreateRequest.java
│   │   ├── {Domain}UpdateRequest.java
│   │   └── {Domain}Mapper.java       # MapStruct
│   └── exception/
│       └── {Domain}Exception.java
│
└── Application.java
```

### Layer Rules (enforced via ArchUnit tests)
- Controllers depend on Services (interface only)
- Services depend on Repositories (interface only)
- Entities are never returned from Services
- DTOs are never persisted
- `shared` packages can be accessed by any layer
- No circular dependencies between domain packages

### ArchUnit Test Example
```java
@AnalyzeClasses(packagesOf = Application.class)
class ArchitectureTest {

    @ArchTest
    static final ArchRule noEntityInController = noClasses()
        .that().resideInAPackage("..controller..")
        .should().dependOnClassesThat()
        .areAnnotatedWith(Entity.class);

    @ArchTest
    static final ArchRule servicesShouldNotDependOnControllers = noClasses()
        .that().resideInAPackage("..service..")
        .should().dependOnClassesThat()
        .resideInAPackage("..controller..");
}
```

---

## Hexagonal Architecture

### Package Structure
```
src/main/java/{base}/
├── domain/
│   ├── model/
│   │   └── {Aggregate}.java         # Pure Java, no annotations
│   ├── port/
│   │   ├── input/
│   │   │   └── {UseCase}Port.java   # Interface for inbound
│   │   └── output/
│   │       └── {Repository}Port.java # Interface for outbound
│   ├── service/
│   │   └── {Domain}DomainService.java
│   └── exception/
│       └── {Domain}DomainException.java
│
├── application/
│   └── usecase/
│       └── {Action}{Domain}UseCase.java  # implements InputPort
│
├── infrastructure/
│   ├── persistence/
│   │   ├── entity/
│   │   │   └── {Domain}JpaEntity.java
│   │   ├── repository/
│   │   │   └── {Domain}JpaRepository.java
│   │   └── adapter/
│   │       └── {Domain}PersistenceAdapter.java  # implements OutputPort
│   ├── web/
│   │   ├── controller/
│   │   │   └── {Domain}Controller.java
│   │   └── dto/
│   │       └── {Domain}Request/Response.java
│   └── security/
│
└── shared/
    └── (same as layered monolith)
```

---

## Microservices

### Service Catalog Pattern
```yaml
# Each MS has its own:
# - Spring Boot app
# - Database schema (schema isolation, not DB isolation for small teams)
# - Flyway migration path: classpath:db/migration/{service}/
# - Own API version: /api/v1/{service}/

services:
  ms-auth:       # JWT issuance, MFA, sessions
  ms-clientes:   # Client profile, KYC
  ms-onboarding: # Registration flows
  ms-gateway:    # Spring Cloud Gateway or AWS API Gateway
```

### Inter-Service Communication
```java
// Prefer events over direct calls for non-blocking operations
// Use @FeignClient for synchronous calls (with circuit breaker)
@FeignClient(name = "ms-clientes", fallback = ClienteFallback.class)
public interface ClienteClient {
    @GetMapping("/api/v1/clientes/{id}")
    ApiResponse<ClienteDto> findById(@PathVariable Long id);
}

// Event-driven (SNS/SQS or Kafka)
@Component
public class ClienteEventPublisher {
    public void publishClienteCreated(ClienteCreatedEvent event) {
        // SNS publish with transactionId in headers
    }
}
```

---

## API Versioning Strategy

```java
// URL versioning (recommended for MONEKI)
/api/v1/clientes
/api/v2/clientes   // breaking changes only

// Version validation filter
@Component
public class ApiVersionFilter extends OncePerRequestFilter {
    private static final String SUPPORTED_VERSION = "1";

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain) {
        final var requestedVersion = req.getHeader("X-API-Version");
        if (requestedVersion != null && !SUPPORTED_VERSION.equals(requestedVersion)) {
            res.setStatus(426); // Upgrade Required
            return;
        }
        chain.doFilter(req, res);
    }
}
```

---

## Error Codes Enum Pattern

```java
public enum ErrorCode {
    // Auth
    AUTH_TOKEN_EXPIRED(401, "Token expirado"),
    AUTH_TOKEN_INVALID(401, "Token inválido"),
    AUTH_MFA_REQUIRED(403, "MFA requerido"),
    AUTH_INSUFFICIENT_PERMISSIONS(403, "Permisos insuficientes"),

    // Domain
    ENTITY_NOT_FOUND(404, "Entidad no encontrada"),
    DUPLICATE_ENTRY(409, "Registro duplicado"),
    BUSINESS_RULE_VIOLATION(422, "Regla de negocio violada"),

    // System
    INTERNAL_ERROR(500, "Error interno del servidor"),
    EXTERNAL_SERVICE_ERROR(502, "Error en servicio externo"),
    SERVICE_UNAVAILABLE(503, "Servicio no disponible");

    public final int httpStatus;
    public final String defaultMessage;

    ErrorCode(int httpStatus, String defaultMessage) {
        this.httpStatus = httpStatus;
        this.defaultMessage = defaultMessage;
    }
}
```

---

## PageResponse Wrapper

```java
@Getter
@Builder
public class PageResponse<T> {
    private final List<T> content;
    private final int page;
    private final int size;
    private final long totalElements;
    private final int totalPages;
    private final boolean last;

    public static <T> PageResponse<T> from(Page<T> page) {
        return PageResponse.<T>builder()
            .content(page.getContent())
            .page(page.getNumber())
            .size(page.getSize())
            .totalElements(page.getTotalElements())
            .totalPages(page.getTotalPages())
            .last(page.isLast())
            .build();
    }
}

// Usage in controller:
return ResponseEntity.ok(
    ApiResponse.ok(PageResponse.from(page), "Resultados")
);
```