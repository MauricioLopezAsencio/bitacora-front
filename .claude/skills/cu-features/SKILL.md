---
name: cu-features
description: >
  Registra tareas de un caso de uso en CASOS_FEATURES.md siguiendo el formato estándar del proyecto VALIA,
  separando tareas de backend y frontend con ID, tipo, complejidad y estimado en minutos.
  Úsala cuando el usuario diga: "registra las tareas del CU", "agrega las features del caso de uso",
  "documenta el CU-N en CASOS_FEATURES", "genera las tareas del caso de uso", "vamos a trabajar el CU-N",
  o cualquier variante que implique extraer y registrar tareas de un CASO_USO_N.md.
---

# CU-Features Skill — Documentación de Casos de Uso

## Objetivo

Leer un archivo `CASO_USO_N.md`, extraer todas las tareas necesarias para su implementación,
y agregarlas en `CASOS_FEATURES.md` bajo el bloque `## CU-N — <Nombre>`, respetando el formato
oficial del proyecto y separando las tareas por capa (Backend / Frontend).

---

## Paso 1 — Leer los archivos necesarios

Antes de generar nada, lee siempre:

1. `CASO_USO_N.md` — el caso de uso que se va a documentar
2. `CASOS_FEATURES.md` — para respetar el formato existente y no duplicar IDs

---

## Paso 2 — Extraer tareas

Analiza el caso de uso completo: escenarios, elementos de pantalla, reglas de negocio y flujos alternos.

### Reglas de extracción

**Backend (Spring Boot):**

- Una tarea `L` por cada grupo de tablas nuevas requeridas (DDL + triggers + datos iniciales separados)
- Una tarea `A` por cada endpoint REST que el caso de uso requiere (listado, detalle, procesar, enviar, cambiar, etc.)
- Una tarea `C` por cada integración externa (correo, FTP, API, webservice, Pi Consolidador)
- Una tarea `H` si hay procesos automatizados o schedulers
- Una tarea `N` si hay reglas de seguridad o control de acceso específicas del CU

**Frontend (Angular):**

- Una tarea `K` por cada pantalla o vista principal
- Una tarea `K` por cada modal o ventana emergente distinta
- Una tarea `K` por cada comportamiento condicional relevante (habilitación de botones, visibilidad de columnas/acciones)
- Una tarea `K` para las notificaciones toast si aplican al módulo
- Una tarea `K` para componentes reutilizables propios del CU (carga de archivos, vista previa, árbol, etc.)

### No generes tareas para:
- Funcionalidades ya cubiertas en CUs previos (autenticación, sesión, menú lateral)
- Componentes compartidos ya implementados (header, footer, paginador genérico)
- Detalles visuales menores que forman parte de una tarea `K` más grande

---

## Paso 3 — Formato de cada tarea

```
| {ID} | {Letra} - {Nombre del tipo}: {descripción clara y concisa} | {Letra} | {Baja|Media} | {minutos} |
```

### Reglas de ID

```
CU{número}-{Letra}{secuencia}

Ejemplos:
CU7-L1   → primera tarea L del CU-7
CU7-A3   → tercera tarea A del CU-7
CU7-K10  → décima tarea K del CU-7
```

- La secuencia es independiente por letra (A1, A2, A3 / K1, K2, K3…)
- Nunca reutilices un ID ya existente en el archivo

### Estimados de referencia

| Complejidad | Baja (min) | Media (min) |
|-------------|------------|-------------|
| L (datos)   | 20 – 40    | 50 – 80     |
| A (endpoint)| 40 – 70    | 90 – 150    |
| C (correo/API) | 50 – 80 | 100 – 150   |
| K (interfaz)| 30 – 60    | 80 – 130    |
| N (seguridad)| 30 – 50   | 60 – 100    |

---

## Paso 4 — Estructura del bloque a agregar en CASOS_FEATURES.md

```markdown
## CU-N — <Nombre del caso de uso>

### Backend

| ID | Feature | Tipo | Complejidad | Estimado (min) |
|----|---------|------|-------------|----------------|
| CUN-L1 | L - Gestión de datos: ... | L | Baja | 30 |
| CUN-A1 | A - Implementación de endpoint: ... | A | Media | 120 |
...

### Frontend

| ID | Feature | Tipo | Complejidad | Estimado (min) |
|----|---------|------|-------------|----------------|
| CUN-K1 | K - Implementación de interfaz: ... | K | Media | 110 |
...
```

> Si el caso de uso no tiene tareas de backend o de frontend, omite esa subsección.

---

## Paso 5 — Insertar en CASOS_FEATURES.md

- Agrega el bloque **al final del archivo**, después del último `---`
- Si ya existe un bloque `## CU-N` vacío (`| | | | | |`), reemplázalo completo
- No modifiques ningún otro bloque existente
- Termina el bloque con una línea `---`

---

## Qué NO hacer

- No incluyas tareas de pruebas unitarias o de integración (el archivo solo registra features de implementación)
- No inventes funcionalidades que no estén en el caso de uso
- No uses descripciones genéricas como "implementar módulo" — sé específico con lo que hace cada endpoint o pantalla
- No modifiques la tabla de nomenclatura de tipos ni otros CUs ya documentados

---

## Ejemplo de salida esperada

Para un CU de ejemplo con 2 endpoints y 3 pantallas:

```markdown
## CU-8 — Autorización de Correcciones

### Backend

| ID | Feature | Tipo | Complejidad | Estimado (min) |
|----|---------|------|-------------|----------------|
| CU8-L1 | L - Gestión de datos: tabla bt_autorizacion_correccion con schema, tracking y triggers | L | Media | 60 |
| CU8-A1 | A - Implementación de endpoint: listar propuestas pendientes de autorización con filtros | A | Media | 110 |
| CU8-A2 | A - Implementación de endpoint: autorizar o rechazar propuesta de mitigación con justificación | A | Media | 100 |
| CU8-C1 | C - Integración de servicio de correo: notificación de autorización aprobada o rechazada al revisor | C | Baja | 60 |

### Frontend

| ID | Feature | Tipo | Complejidad | Estimado (min) |
|----|---------|------|-------------|----------------|
| CU8-K1 | K - Implementación de interfaz: pantalla principal Autorización de correcciones con tabla y filtros | K | Media | 110 |
| CU8-K2 | K - Implementación de interfaz: modal Vista previa del reporte corregido en modo solo lectura | K | Media | 80 |
| CU8-K3 | K - Implementación de interfaz: modal Autorizar o Rechazar con campo de justificación obligatorio | K | Media | 90 |
| CU8-K4 | K - Implementación de interfaz: notificaciones toast de éxito y error en el flujo de autorización | K | Baja | 30 |

---
```
 