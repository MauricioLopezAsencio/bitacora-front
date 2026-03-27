# Database Reference — SQL Server 2022

## Naming Convention (Mandatory)

### Table Prefixes
| Prefix | Type |
|--------|------|
| `ct_` | Catalogs / master data |
| `mv_` | Movements / transactions (header) |
| `dt_` | Detail (lines dependent on header) |
| `h_`  | History (versioned / active period) |
| `bt_` | Audit log / event trace |

### Column Prefixes
| Prefix | SQL Type | Usage |
|--------|----------|-------|
| `ds_` | `NVARCHAR` | Descriptions, names, text |
| `cv_` | `NVARCHAR` short | Business keys, codes (UNIQUE candidates) |
| `fc_` | `DATE`/`DATETIME2` | Dates and timestamps |
| `bo_` | `BIT` | Booleans (affirmative semantics only) |
| `id_` | `BIGINT`/`INT` | Foreign keys ONLY |

**Rules:**
- All lowercase, snake_case, no accents, no ñ
- No non-standard abbreviations
- No `bo_no_*` (double negation forbidden)

---

## Full DDL Template — Catalog

```sql
CREATE TABLE ct_<entity> (
    -- 1. PK
    id                      INT IDENTITY(1,1)   NOT NULL,
    -- 2. Business columns (cv_ and ds_ prefixes)
    cv_<codigo>             NVARCHAR(50)        NOT NULL,
    ds_<nombre>             NVARCHAR(255)       NOT NULL,
    -- 3. Optional flags
    bo_activo               BIT                 NOT NULL DEFAULT 1,
    -- 4. Tracking (MANDATORY, always last)
    ds_creado_por           NVARCHAR(255)           NULL,
    ds_actualizado_por      NVARCHAR(255)           NULL,
    fc_creacion             DATETIME2(7)            NULL,
    fc_ultima_actualizacion DATETIME2(7)            NULL,
    CONSTRAINT PK_ct_<entity>              PRIMARY KEY (id),
    CONSTRAINT UQ_ct_<entity>__cv_<codigo> UNIQUE (cv_<codigo>)
);
GO
```

## Full DDL Template — Movement (header)

```sql
CREATE TABLE mv_<entity> (
    id                      BIGINT IDENTITY(1,1) NOT NULL,
    id_<parent>             BIGINT               NOT NULL,
    fc_evento               DATETIME2            NOT NULL,
    ds_observaciones        NVARCHAR(500)            NULL,
    ds_creado_por           NVARCHAR(255)            NULL,
    ds_actualizado_por      NVARCHAR(255)            NULL,
    fc_creacion             DATETIME2(7)             NULL,
    fc_ultima_actualizacion DATETIME2(7)             NULL,
    CONSTRAINT PK_mv_<entity>                     PRIMARY KEY (id),
    CONSTRAINT FK_mv_<entity>__ct_<parent> FOREIGN KEY (id_<parent>)
        REFERENCES ct_<parent>(id)
);
GO
```

## Full DDL Template — History

```sql
CREATE TABLE h_<entity> (
    id                      BIGINT IDENTITY(1,1) NOT NULL,
    id_<entity>             BIGINT               NOT NULL,
    fc_inicio               DATETIME2            NOT NULL,
    fc_fin                  DATETIME2                NULL,
    bo_actual               BIT                  NOT NULL DEFAULT 1,
    ds_creado_por           NVARCHAR(255)            NULL,
    ds_actualizado_por      NVARCHAR(255)            NULL,
    fc_creacion             DATETIME2(7)             NULL,
    fc_ultima_actualizacion DATETIME2(7)             NULL,
    CONSTRAINT PK_h_<entity> PRIMARY KEY (id),
    CONSTRAINT FK_h_<entity>__ct_<entity> FOREIGN KEY (id_<entity>)
        REFERENCES ct_<entity>(id)
);
GO
```

---

## Triggers (Mandatory per Table)

Every table requires exactly **two triggers**:

### INSERT trigger
```sql
CREATE TRIGGER tr_<tabla>_insert
ON <tabla>
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora DATETIME2(7) = SYSDATETIME();
    UPDATE <tabla>
    SET    fc_creacion             = @ahora,
           fc_ultima_actualizacion = @ahora
    WHERE  id IN (SELECT id FROM inserted);
END;
GO
```

### UPDATE trigger
```sql
CREATE TRIGGER tr_<tabla>_update
ON <tabla>
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE <tabla>
    SET    fc_ultima_actualizacion = SYSDATETIME()
    WHERE  id IN (SELECT id FROM inserted);
END;
GO
```

### N:M table triggers (composite PK — no single `id`)
```sql
CREATE TRIGGER tr_<tabla>_insert
ON <tabla> AFTER INSERT AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ahora DATETIME2(7) = SYSDATETIME();
    UPDATE t
    SET    t.fc_creacion = @ahora, t.fc_ultima_actualizacion = @ahora
    FROM   <tabla> t
    INNER  JOIN inserted i ON t.id_col1 = i.id_col1 AND t.id_col2 = i.id_col2;
END;
GO

CREATE TRIGGER tr_<tabla>_update
ON <tabla> AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    IF TRIGGER_NESTLEVEL() > 1 RETURN;
    UPDATE t
    SET    t.fc_ultima_actualizacion = SYSDATETIME()
    FROM   <tabla> t
    INNER  JOIN inserted i ON t.id_col1 = i.id_col1 AND t.id_col2 = i.id_col2;
END;
GO
```

---

## Constraints & Index Naming

```sql
PK_<tabla>                        -- Primary Key
FK_<hija>__<padre>                -- Foreign Key (DOUBLE underscore)
UQ_<tabla>__<columna>             -- Unique constraint
IX_<tabla>__<col1>[_<col2>...]    -- Index

-- Examples:
CONSTRAINT PK_ct_usuario          PRIMARY KEY (id)
CONSTRAINT FK_mv_venta__ct_cliente FOREIGN KEY (id_cliente) REFERENCES ct_cliente(id)
CONSTRAINT UQ_ct_usuario__cv_usuario UNIQUE (cv_usuario)
CREATE INDEX IX_mv_venta__id_cliente_fc_evento ON mv_venta(id_cliente, fc_evento);
```

---

## JPA Entity for SQL Server

```java
@Entity
@Table(name = "ct_cliente")
@Getter @Setter @Builder
@NoArgsConstructor @AllArgsConstructor
public class CtCliente extends AuditableEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "cv_cliente", nullable = false, unique = true, length = 50)
    private String cvCliente;

    @Column(name = "ds_nombre", nullable = false, length = 255)
    private String dsNombre;

    @Column(name = "ds_correo", nullable = false, length = 255)
    private String dsCorreo;

    @Column(name = "bo_activo", nullable = false)
    @Builder.Default
    private Boolean boActivo = true;

    // FK relationship
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_estatus", nullable = false,
        foreignKey = @ForeignKey(name = "FK_ct_cliente__ct_estatus_usuario"))
    private CtEstatusUsuario estatus;
}
```

---

## Flyway for SQL Server

### Migration file naming
```
src/main/resources/db/migration/
├── V1__create_catalog_tables.sql
├── V2__create_movement_tables.sql
├── V3__create_indexes.sql
└── V4__seed_catalog_data.sql
```

### application.yml (SQL Server)
```yaml
spring:
  datasource:
    url: jdbc:sqlserver://${DB_HOST}:${DB_PORT};databaseName=${DB_NAME};encrypt=true;trustServerCertificate=false
    driver-class-name: com.microsoft.sqlserver.jdbc.SQLServerDriver
    username: ${DB_USER}
    password: ${DB_PASS}
  jpa:
    database-platform: org.hibernate.dialect.SQLServerDialect
    hibernate:
      ddl-auto: validate
    show-sql: false
  flyway:
    enabled: true
    locations: classpath:db/migration
    baseline-on-migrate: true
    table: flyway_schema_history
```

---

## T-SQL Patterns

### Pagination
```sql
SELECT *
FROM   ct_cliente
ORDER  BY id
OFFSET (@page * @pageSize) ROWS
FETCH  NEXT @pageSize ROWS ONLY;
```

### Soft Delete Pattern
```sql
-- Never use DELETE; set bo_activo = 0
UPDATE ct_cliente
SET    bo_activo        = 0,
       ds_actualizado_por = @usuario
WHERE  id = @id;
```

### Audit Query
```sql
SELECT b.ds_tabla,
       b.ds_accion,
       b.ds_usuario,
       b.fc_creacion,
       b.ds_datos_anteriores,
       b.ds_datos_nuevos
FROM   bt_auditoria b
WHERE  b.id_entidad = @entidadId
  AND  b.ds_tabla   = 'ct_cliente'
ORDER  BY b.fc_creacion DESC;
```

---

## DDL Checklist

- [ ] Table has correct prefix (`ct_` `mv_` `dt_` `h_` `bt_`)
- [ ] PK column named exactly `id`
- [ ] PK constraint: `PK_<tabla>`
- [ ] FK columns: `id_<entity>`, constraint: `FK_<child>__<parent>` (double underscore)
- [ ] All columns have prefix (`ds_` `cv_` `fc_` `bo_` `id_`)
- [ ] Tracking columns at end (4 fields)
- [ ] Both triggers created (`_insert` and `_update`)
- [ ] `TRIGGER_NESTLEVEL() > 1 RETURN` in UPDATE trigger
- [ ] No `bo_no_*` (no double negation)
- [ ] UQ constraints: `UQ_<tabla>__<columna>`
- [ ] Indexes: `IX_<tabla>__<cols>`