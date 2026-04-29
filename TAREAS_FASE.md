# Tareas — Nuevo campo "Fase" en registros de Scoca

## Contexto

Se va a cambiar la forma en la que se guardan los registros en Scoca: se agrega un nuevo campo llamado **`fase`**.

- El campo **solo aplica** para registros con tipo de actividad **"Servicio"**.
- También aplica para **bt-backend / bitácora**, pero **únicamente para mostrar** (no se persiste en BD propia).
- En el formulario de captura se debe mostrar un campo de selección (dropdown) que se **emparejará automáticamente** según el tipo de actividad seleccionada, siguiendo la secuencia:

### Secuencia de fases (orden de presentación)

1. Análisis y Diseño
2. Desarrollo y Construcción
3. Pruebas
4. Despliegue
5. Garantía
6. No Aplica

### Mapeo: Tipo de actividad → Fase por defecto

| Tipo de actividad             | Fase por defecto          |
|-------------------------------|---------------------------|
| Análisis                      | Análisis y Diseño         |
| Arquitectura                  | Desarrollo y Construcción |
| Atención de defecto           | Pruebas                   |
| Bases de datos                | Desarrollo y Construcción |
| Capacitación                  | Despliegue                |
| Capacitación al usuario       | Despliegue                |
| Codificación                  | Desarrollo y Construcción |
| Desarrollo                    | Desarrollo y Construcción |
| Despliegue                    | Despliegue                |
| Diseño                        | Análisis y Diseño         |
| Diversos                      | Garantía                  |
| Elaboración de documentos     | Análisis y Diseño         |
| Entregables                   | Despliegue                |
| Implementación                | Despliegue                |
| Investigación                 | Análisis y Diseño         |
| Legales y trámites            | Garantía                  |
| Plan de trabajo               | Análisis y Diseño         |
| Pruebas                       | Pruebas                   |
| Reportes                      | Garantía                  |
| Seguimiento a cumplimiento    | Garantía                  |
| Seguridad de la información   | Desarrollo y Construcción |
| Sesión externa                | Garantía                  |
| Sesión interna                | Garantía                  |
| Soporte                       | Garantía                  |
| Tableros                      | Desarrollo y Construcción |
| Ventas/comercial              | Garantía                  |

> **Regla:** El emparejamiento es automático al seleccionar el tipo de actividad, pero el usuario puede sobrescribir la fase manualmente antes de guardar.

---

## Tareas — Backend (bt-backend)

### BE-01 — Catálogo de fases
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 30 min
- Crear constantes / enum `Fase` con los 6 valores de la secuencia (Análisis y Diseño, Desarrollo y Construcción, Pruebas, Despliegue, Garantía, No Aplica).
- Exponer endpoint `GET /api/v1/actividades/fases` que devuelva el catálogo en orden de secuencia, dentro de `ApiResponse<List<FaseDto>>`.

### BE-02 — Mapeo tipo de actividad → fase
- **Tipo:** Feature
- **Complejidad:** Media
- **Estimado:** 45 min
- Crear `MapeoTipoActividadFase` (Map estático o servicio) con las 26 reglas de la tabla anterior.
- Normalizar la búsqueda: case-insensitive y sin acentos, para tolerar variaciones en el nombre del catálogo Scoca.
- Default cuando no hay match: `No Aplica`.

### BE-03 — DTO `RegistroActividadDto` con campo `fase`
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 20 min
- Agregar campo `fase` (String) al DTO de entrada del POST de registro de actividades.
- Validación: `fase` es obligatorio cuando el tipo de actividad sea **"Servicio"**; opcional / ignorado en otros tipos.

### BE-04 — Envío de `fase` a Scoca
- **Tipo:** Feature
- **Complejidad:** Media
- **Estimado:** 60 min
- Modificar `BitacoraService.registrarActividadConParticion()` para incluir el campo `fase` en el body que se envía a Scoca cuando el tipo de actividad sea "Servicio".
- Verificar el contrato exacto del endpoint de Scoca (nombre del campo: `fase`, `idFase`, etc.) antes de codificar.
- Aplicar el mismo campo en los PUT que parten/recortan registros existentes para no perderlo en las particiones.

### BE-05 — Resolución automática de fase en `ActividadService`
- **Tipo:** Feature
- **Complejidad:** Media
- **Estimado:** 45 min
- En `ActividadService.expandirEnFranjas()` (o en el DTO de salida `ActividadResultDto`), agregar el campo `fase` resuelto automáticamente según el tipo de actividad de cada slot.
- Solo poblar `fase` cuando el tipo de actividad sea "Servicio"; en los demás casos enviarlo como `null`.

### BE-06 — Mostrar `fase` al consultar registros existentes
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 30 min
- Al leer registros existentes de Scoca (vista de bitácora), mapear el campo `fase` recibido y exponerlo en el DTO de respuesta.
- Solo se muestra; no se edita desde bt-backend.

### BE-07 — Pruebas unitarias
- **Tipo:** Test
- **Complejidad:** Media
- **Estimado:** 60 min
- Test unitario del mapeo tipo de actividad → fase (los 26 casos + caso default + case-insensitive + sin acentos).
- Test de `BitacoraService.registrarActividadConParticion()` validando que `fase` se envía solo en tipo "Servicio".
- Test de validación: rechazar registro de "Servicio" sin `fase`.

---

## Tareas — Frontend (bitacora-front)
 ya hay una interface que se llama src/app/components/actividad/actividad.component.html y ahi esta casi todo el desarrollo tu solo vas agregar el campo que falta en la tabla. para poder hacer el guardado y el listado de las actividades
### FE-01 — Modelo / interface `Fase`
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 15 min
- Crear interface `Fase` y servicio Angular para consumir `GET /api/v1/actividades/fases`.

### FE-02 — Dropdown de fase en formulario de registro
- **Tipo:** Feature
- **Complejidad:** Media
- **Estimado:** 60 min
- Agregar control reactivo `fase` al formulario de registro de actividad.
- El dropdown solo es **visible y obligatorio** cuando el tipo de actividad seleccionada sea **"Servicio"**.
- Las opciones deben mostrarse en el orden de la secuencia oficial.

### FE-03 — Auto-emparejamiento al seleccionar tipo de actividad
- **Tipo:** Feature
- **Complejidad:** Media
- **Estimado:** 45 min
- Al cambiar el tipo de actividad, setear automáticamente la fase según el mapeo (preferentemente usar el dato que venga ya resuelto desde el backend en `ActividadResultDto`).
- El usuario puede modificar manualmente la fase después del auto-set.

### FE-04 — Mostrar `fase` en vista de bitácora
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 30 min
- Agregar columna / etiqueta "Fase" en la grilla o tarjeta de registros existentes.
- Solo lectura; mostrar guion ("—") cuando el registro no tenga fase (tipo distinto a "Servicio").

### FE-05 — Validaciones de UI
- **Tipo:** Feature
- **Complejidad:** Baja
- **Estimado:** 20 min
- Mostrar mensaje de error cuando el tipo "Servicio" se seleccione sin elegir fase.
- Deshabilitar botón de guardar mientras la fase obligatoria esté vacía.

---

## Resumen de esfuerzo

| Área     | Tareas | Estimado total |
|----------|--------|----------------|
| Backend  | 7      | ~290 min (~4.8 h) |
| Frontend | 5      | ~170 min (~2.8 h) |
| **Total**| **12** | **~460 min (~7.6 h)** |

---

## Pendientes / dudas a confirmar antes de implementar

- [ ] Nombre exacto del campo en el contrato de Scoca (`fase`, `idFase`, `cvFase`, etc.).
- [ ] ¿Scoca espera el valor como string libre o como id de catálogo? Si es id, hay que pedir el catálogo de fases a Scoca en lugar de hardcodearlo.
- [ ] Confirmar el nombre exacto del tipo de actividad "Servicio" tal como aparece en el catálogo de Scoca (mayúsculas/acentos).
- [ ] ¿La fase debe persistir también cuando se hacen los PUT de partición de slots existentes? (asumido **sí** en BE-04.)
