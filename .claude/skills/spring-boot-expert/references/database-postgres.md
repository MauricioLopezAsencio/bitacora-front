# Database Reference — PostgreSQL

## Naming Convention (Same Prefixes as SQL Server)

Same prefix rules apply: `ct_`, `mv_`, `dt_`, `h_`, `bt_` for tables; `ds_`, `cv_`, `fc_`, `bo_`, `id_` for columns.

**PostgreSQL-specific differences:**
- PK: `BIGSERIAL` or `BIGINT GENERATED ALWAYS AS IDENTITY`
- Timestamps: `TIMESTAMPTZ` (always timezone-aware)
- No `DATETIME2` — use `TIMESTAMPTZ`
- Booleans: native `BOOLEAN` (no `BIT`)
- Text: `TEXT` or `VARCHAR(n)` (no `NVARCHAR`)

---

## DDL Templates

### Catalog Table
```sql
CREATE TABLE ct_<entity> (
    id                      BIGSERIAL           NOT NULL,
    cv_<codigo>             VARCHAR(50)         NOT NULL,
    ds_<nombre>             VARCHAR(255)        NOT NULL,
    bo_activo               BOOLEAN             NOT NULL DEFAULT TRUE,
    ds_creado_por           VARCHAR(255),
    ds_actualizado_por      VARCHAR(255),
    fc_creacion             TIMESTAMPTZ,
    fc_ultima_actualizacion TIMESTAMPTZ,
    CONSTRAINT PK_ct_<entity>              PRIMARY KEY (id),
    CONSTRAINT UQ_ct_<entity>__cv_<codigo> UNIQUE (cv_<codigo>)
);
```

### Movement Table
```sql
CREATE TABLE mv_<entity> (
    id                      BIGSERIAL           NOT NULL,
    id_<parent>             BIGINT              NOT NULL,
    fc_evento               TIMESTAMPTZ         NOT NULL,
    ds_observaciones        TEXT,
    ds_creado_por           VARCHAR(255),
    ds_actualizado_por      VARCHAR(255),
    fc_creacion             TIMESTAMPTZ,
    fc_ultima_actualizacion TIMESTAMPTZ,
    CONSTRAINT PK_mv_<entity>                     PRIMARY KEY (id),
    CONSTRAINT FK_mv_<entity>__ct_<parent>
        FOREIGN KEY (id_<parent>) REFERENCES ct_<parent>(id)
);
```

---

## Trigger Function (PostgreSQL — replaces SQL Server triggers)

PostgreSQL uses a **shared trigger function** per pattern:

```sql
-- Shared function for INSERT (sets both timestamps)
CREATE OR REPLACE FUNCTION fn_set_timestamps_insert()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fc_creacion             := NOW();
    NEW.fc_ultima_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Shared function for UPDATE (sets only fc_ultima_actualizacion)
CREATE OR REPLACE FUNCTION fn_set_timestamp_update()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fc_ultima_actualizacion := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to each table:
CREATE TRIGGER tr_ct_<entity>_insert
    BEFORE INSERT ON ct_<entity>
    FOR EACH ROW EXECUTE FUNCTION fn_set_timestamps_insert();

CREATE TRIGGER tr_ct_<entity>_update
    BEFORE UPDATE ON ct_<entity>
    FOR EACH ROW EXECUTE FUNCTION fn_set_timestamp_update();
```

---

## Flyway for PostgreSQL

```
src/main/resources/db/migration/
├── V1__create_trigger_functions.sql   ← Create shared functions first
├── V2__create_catalog_tables.sql
├── V3__create_triggers.sql
├── V4__create_indexes.sql
└── V5__seed_data.sql
```

### application.yml (PostgreSQL)
```yaml
spring:
  datasource:
    url: jdbc:postgresql://${DB_HOST}:${DB_PORT}/${DB_NAME}
    driver-class-name: org.postgresql.Driver
    username: ${DB_USER}
    password: ${DB_PASS}
    hikari:
      maximum-pool-size: 20
      minimum-idle: 5
      connection-timeout: 30000
  jpa:
    database-platform: org.hibernate.dialect.PostgreSQLDialect
    hibernate:
      ddl-auto: validate
    properties:
      hibernate:
        default_schema: public
        jdbc:
          time_zone: UTC
  flyway:
    enabled: true
    locations: classpath:db/migration
    schemas: public
```

---

## JPA Entity for PostgreSQL

```java
@Entity
@Table(name = "ct_cliente", schema = "public")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CtCliente extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cv_cliente", nullable = false, unique = true)
    private String cvCliente;

    @Column(name = "ds_nombre", nullable = false)
    private String dsNombre;

    @Column(name = "bo_activo", nullable = false)
    @Builder.Default
    private Boolean boActivo = true;
}
```

---

## Repository Patterns

```java
public interface CtClienteRepository extends JpaRepository<CtCliente, Long> {

    Optional<CtCliente> findByCvCliente(String cvCliente);

    @Query("""
        SELECT c FROM CtCliente c
        WHERE (:activo IS NULL OR c.boActivo = :activo)
          AND (:nombre IS NULL OR LOWER(c.dsNombre) LIKE LOWER(CONCAT('%', :nombre, '%')))
        """)
    Page<CtCliente> findByFilters(
        @Param("activo") Boolean activo,
        @Param("nombre") String nombre,
        Pageable pageable
    );

    // Read-only hint for performance
    @QueryHints(@QueryHint(name = org.hibernate.annotations.QueryHints.READ_ONLY, value = "true"))
    @Transactional(readOnly = true)
    List<CtCliente> findAllBoActivoTrue();
}
```

---

## PostgreSQL-Specific Patterns

### UTC → Local Timezone in Views (BrainHawk pattern)
```sql
CREATE OR REPLACE VIEW vw_leads_funnel AS
SELECT
    l.id,
    l.ds_nombre,
    l.fc_creacion AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City' AS fc_creacion_mx,
    e.cv_estatus
FROM mv_lead l
JOIN ct_estatus_lead e ON e.id = l.id_estatus;
```

### dblink for Cross-DB Queries
```sql
-- Load extension once:
CREATE EXTENSION IF NOT EXISTS dblink;

-- Query another DB:
SELECT * FROM dblink(
    'host=localhost dbname=braindb user=app password=secret',
    'SELECT id, ds_nombre FROM ct_cliente WHERE bo_activo = true'
) AS remote(id BIGINT, ds_nombre VARCHAR(255));
```

### VACUUM Strategy (n8n pattern)
```sql
-- Manual VACUUM for large tables
VACUUM ANALYZE execution_data;

-- Auto-vacuum tuning for high-write tables
ALTER TABLE mv_evento SET (
    autovacuum_vacuum_scale_factor = 0.01,
    autovacuum_analyze_scale_factor = 0.005
);
```

---

## Testcontainers Setup

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class CtClienteRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15-alpine")
            .withDatabaseName("testdb")
            .withUsername("test")
            .withPassword("test");

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired CtClienteRepository repository;

    @Test
    void shouldFindClienteByCvCliente() {
        // Arrange
        repository.save(CtCliente.builder()
            .cvCliente("CLI-001")
            .dsNombre("Test SA de CV")
            .build());

        // Act
        final var result = repository.findByCvCliente("CLI-001");

        // Assert
        assertThat(result).isPresent();
        assertThat(result.get().getDsNombre()).isEqualTo("Test SA de CV");
    }
}
```