# Observability & Traceability Reference

## MDC Filter (Full Implementation)

```java
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class MdcFilter extends OncePerRequestFilter {

    private static final String HEADER_TRANSACTION_ID = "X-Transaction-Id";
    private static final String HEADER_CORRELATION_ID = "X-Correlation-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest req,
            HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {

        final String transactionId = Optional
            .ofNullable(req.getHeader(HEADER_TRANSACTION_ID))
            .filter(s -> !s.isBlank())
            .orElse(UUID.randomUUID().toString());

        final String correlationId = Optional
            .ofNullable(req.getHeader(HEADER_CORRELATION_ID))
            .orElse(transactionId);

        MDC.put("transactionId", transactionId);
        MDC.put("correlationId", correlationId);
        MDC.put("method", req.getMethod());
        MDC.put("path", req.getRequestURI());
        MDC.put("remoteAddr", getClientIp(req));

        res.setHeader(HEADER_TRANSACTION_ID, transactionId);
        res.setHeader(HEADER_CORRELATION_ID, correlationId);

        final long start = System.currentTimeMillis();
        try {
            chain.doFilter(req, res);
        } finally {
            MDC.put("durationMs", String.valueOf(System.currentTimeMillis() - start));
            MDC.put("httpStatus", String.valueOf(res.getStatus()));
            MDC.clear();
        }
    }

    private String getClientIp(HttpServletRequest req) {
        return Optional.ofNullable(req.getHeader("X-Forwarded-For"))
            .map(xff -> xff.split(",")[0].trim())
            .orElse(req.getRemoteAddr());
    }
}
```

---

## Logback Configuration (JSON for ECS/CloudWatch)

```xml
<!-- logback-spring.xml -->
<configuration>
    <springProfile name="!local">
        <!-- JSON for production (ECS/CloudWatch) -->
        <appender name="JSON_CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder class="net.logstash.logback.encoder.LogstashEncoder">
                <includeMdcKeyName>transactionId</includeMdcKeyName>
                <includeMdcKeyName>correlationId</includeMdcKeyName>
                <includeMdcKeyName>method</includeMdcKeyName>
                <includeMdcKeyName>path</includeMdcKeyName>
                <includeMdcKeyName>durationMs</includeMdcKeyName>
                <includeMdcKeyName>httpStatus</includeMdcKeyName>
                <includeMdcKeyName>authenticatedUser</includeMdcKeyName>
            </encoder>
        </appender>
        <root level="INFO">
            <appender-ref ref="JSON_CONSOLE"/>
        </root>
    </springProfile>

    <springProfile name="local">
        <!-- Human-readable for local dev -->
        <appender name="CONSOLE" class="ch.qos.logback.core.ConsoleAppender">
            <encoder>
                <pattern>%d{HH:mm:ss} [%thread] %highlight(%-5level) [txId=%X{transactionId}] %logger{36} - %msg%n</pattern>
            </encoder>
        </appender>
        <root level="DEBUG">
            <appender-ref ref="CONSOLE"/>
        </root>
    </springProfile>
</configuration>
```

---

## Structured Logging Patterns

```java
// Service layer: use kv() from net.logstash.logback.argument.StructuredArguments
import static net.logstash.logback.argument.StructuredArguments.kv;

@Slf4j
@Service
public class ClienteServiceImpl implements ClienteService {

    public ClienteDto create(ClienteCreateRequest req) {
        log.info("Creating cliente",
            kv("cvCliente", req.getCvCliente()),
            kv("transactionId", MDC.get("transactionId")));

        final var entity = mapper.toEntity(req);
        final var saved = repository.save(entity);

        log.info("Cliente created",
            kv("clienteId", saved.getId()),
            kv("cvCliente", saved.getCvCliente()));

        return mapper.toDto(saved);
    }

    public ClienteDto findById(Long id) {
        log.debug("Finding cliente by id", kv("clienteId", id));

        return repository.findById(id)
            .map(entity -> {
                log.debug("Cliente found", kv("clienteId", id));
                return mapper.toDto(entity);
            })
            .orElseThrow(() -> {
                log.warn("Cliente not found", kv("clienteId", id));
                return new EntityNotFoundException("Cliente " + id + " no encontrado");
            });
    }
}
```

---

## Audit Trail Entity

```java
@Entity
@Table(name = "bt_auditoria")
@Getter @Builder @NoArgsConstructor @AllArgsConstructor
public class BtAuditoria {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "ds_tabla", nullable = false)
    private String dsTabla;

    @Column(name = "ds_accion", nullable = false)
    private String dsAccion;  // INSERT, UPDATE, DELETE

    @Column(name = "id_entidad", nullable = false)
    private Long idEntidad;

    @Column(name = "cv_transaction_id")
    private String cvTransactionId;  // MDC transactionId

    @Column(name = "ds_usuario")
    private String dsUsuario;

    @Column(name = "ds_datos_anteriores", columnDefinition = "TEXT")
    private String dsDatosAnteriores;  // JSON

    @Column(name = "ds_datos_nuevos", columnDefinition = "TEXT")
    private String dsDatosNuevos;  // JSON

    @Column(name = "fc_creacion")
    private Instant fcCreacion;
}
```

### Audit Service
```java
@Service
@RequiredArgsConstructor
@Slf4j
public class AuditoriaService {

    private final BtAuditoriaRepository auditoriaRepository;
    private final ObjectMapper objectMapper;

    public void registrar(String tabla, String accion, Long entidadId,
                          Object datosAnteriores, Object datosNuevos) {
        try {
            final var auditoria = BtAuditoria.builder()
                .dsTabla(tabla)
                .dsAccion(accion)
                .idEntidad(entidadId)
                .cvTransactionId(MDC.get("transactionId"))
                .dsUsuario(SecurityUtils.currentUsername())
                .dsDatosAnteriores(toJson(datosAnteriores))
                .dsDatosNuevos(toJson(datosNuevos))
                .fcCreacion(Instant.now())
                .build();
            auditoriaRepository.save(auditoria);
        } catch (Exception ex) {
            log.error("Failed to save audit trail",
                kv("tabla", tabla), kv("accion", accion), kv("entidadId", entidadId), ex);
        }
    }

    private String toJson(Object obj) {
        if (obj == null) return null;
        try { return objectMapper.writeValueAsString(obj); }
        catch (JsonProcessingException e) { return obj.toString(); }
    }
}
```

---

## Micrometer Metrics

```java
@Service
@RequiredArgsConstructor
public class ClienteServiceImpl implements ClienteService {

    private final MeterRegistry meterRegistry;
    private final Counter clientesCreados;
    private final Timer clientesBusquedaTimer;

    @PostConstruct
    void initMetrics() {
        clientesCreados = Counter.builder("app.clientes.created")
            .description("Total clientes creados")
            .register(meterRegistry);
        clientesBusquedaTimer = Timer.builder("app.clientes.findById.duration")
            .description("Tiempo de búsqueda de cliente por ID")
            .register(meterRegistry);
    }

    public ClienteDto findById(Long id) {
        return clientesBusquedaTimer.recordCallable(() -> {
            // ... business logic
        });
    }

    public ClienteDto create(ClienteCreateRequest req) {
        final var result = // ... create logic
        clientesCreados.increment();
        return result;
    }
}
```

---

## Health Check Endpoint

```java
@Component
public class DatabaseHealthIndicator implements HealthIndicator {

    private final DataSource dataSource;

    @Override
    public Health health() {
        try (var conn = dataSource.getConnection();
             var stmt = conn.createStatement()) {
            stmt.execute("SELECT 1");
            return Health.up()
                .withDetail("database", "reachable")
                .build();
        } catch (Exception ex) {
            return Health.down()
                .withDetail("database", "unreachable")
                .withException(ex)
                .build();
        }
    }
}
```

```yaml
# application.yml
management:
  endpoints:
    web:
      exposure:
        include: health, info, metrics, prometheus
  endpoint:
    health:
      show-details: when-authorized
  metrics:
    export:
      cloudwatch:
        enabled: true
        namespace: ${APP_NAME}
```