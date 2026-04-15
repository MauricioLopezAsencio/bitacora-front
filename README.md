<div align="center">

# 📋 Bitácora Front

**Plataforma interna de registro de actividades laborales**  
integrada con Microsoft 365 y el sistema SCO.

[![Angular](https://img.shields.io/badge/Angular-17-dd0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5-7952b3?style=for-the-badge&logo=bootstrap&logoColor=white)](https://getbootstrap.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-3178c6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Render](https://img.shields.io/badge/Deploy-Render-46e3b7?style=for-the-badge&logo=render&logoColor=white)](https://render.com)

</div>

---

## ✨ ¿Qué hace la aplicación?

<table>
  <tr>
    <td>🔐 <strong>Login</strong></td>
    <td>Autenticación con JWT. El token se renueva automáticamente cuando quedan menos de 10 minutos de vigencia.</td>
  </tr>
  <tr>
    <td>📊 <strong>Dashboard</strong></td>
    <td>Vista principal con resumen de actividad del sistema.</td>
  </tr>
  <tr>
    <td>📅 <strong>Actividades Microsoft</strong></td>
    <td>Consulta eventos del calendario de Microsoft 365, los empareja con proyectos SCO y los registra en Bitácora desde una sola pantalla.</td>
  </tr>
  <tr>
    <td>📝 <strong>Bitácora</strong></td>
    <td>Registro manual de actividades laborales por empleado.</td>
  </tr>
  <tr>
    <td>👥 <strong>Empleados</strong></td>
    <td>Gestión del catálogo de empleados.</td>
  </tr>
  <tr>
    <td>🔧 <strong>Herramientas</strong></td>
    <td>Catálogo de herramientas asignadas por empleado.</td>
  </tr>
  <tr>
    <td>✉️ <strong>Correos</strong></td>
    <td>Configuración y envío de correos, incluye envío masivo.</td>
  </tr>
  <tr>
    <td>⚙️ <strong>Configuración</strong></td>
    <td>Ajustes generales del sistema.</td>
  </tr>
</table>

---

## 🛠️ Stack tecnológico

| Categoría | Tecnología |
|-----------|-----------|
| Framework | Angular 17 (NgModules) |
| UI | Bootstrap 5, Bootstrap Icons, PrimeNG |
| Gráficas | Chart.js vía PrimeNG |
| Paginación | ngx-pagination |
| Modales | SweetAlert2 |
| Auth Microsoft | @azure/msal-browser |
| HTTP | Angular HttpClient + RxJS |

---

## 🚀 Desarrollo local

```bash
# Instalar dependencias
npm install

# Levantar servidor de desarrollo
npm start
# → http://localhost:4200
```

> Configura la URL del backend y las credenciales de Azure AD en:
> `src/app/utils/Constants.ts`

---

## 📦 Build y despliegue

```bash
npm run build
# Salida: dist/angular-16-crud/
```

El proyecto está alojado en **Render**.  
Cada `git push` a `master` dispara un **redeploy automático**.

---

## 🗺️ Rutas de la aplicación

| Ruta | Vista |
|------|-------|
| `/login` | Inicio de sesión |
| `/` | Dashboard |
| `/bitacora` | Registro de bitácora |
| `/empleado` | Gestión de empleados |
| `/herramienta` | Catálogo de herramientas |
| `/configuracion` | Configuración general |
| `/configuracion/correos` | Configuración de correos |
| `/actividades` | Actividades Microsoft 365 |

---

<div align="center">
  <sub>Desarrollado con ❤️ · Desplegado en Render · Integrado con Microsoft 365</sub>
</div>
