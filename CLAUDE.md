# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Dev server (port 4200)
npm start

# Production build — output: dist/angular-16-crud/
npm run build

# Run tests
npm test
```

Render deploys automatically on every push to `master`. Build command used by Render: `npm run build`. Publish directory: `dist/angular-16-crud`.

## Architecture

Single NgModule app (non-standalone). Angular 17 with `AppModule` as the root module — no lazy loading.

### Key files

| File | Purpose |
|------|---------|
| `src/app/utils/Constants.ts` | `baseUrl` for all API calls + MSAL Azure AD config. **Change `baseUrl` here when switching environments.** |
| `src/styles.css` | Global design tokens (`--color-*`, `--glass-*`, `--radius-*`, `--transition-*`). All components consume these CSS variables. |
| `src/app/interceptors/auth.interceptor.ts` | Attaches `Authorization: Bearer <token>` to every request. Also auto-refreshes the JWT when < 10 min remain. On 401 it calls `AuthService.logout()`. |
| `src/app/guards/auth.guard.ts` | Functional guard (`CanActivateFn`). Redirects to `/login` if no token in localStorage. |

### Auth flow

JWT stored in `localStorage` under keys `bt_token`, `bt_username`, `bt_expires_at`. `AuthService` handles login, refresh and logout. `AuthInterceptor` is the single place that reads and attaches the token.

### Microsoft / MSAL

`MsalAuthService` wraps `@azure/msal-browser` for acquiring a `Calendars.Read` token via popup. Azure AD credentials (`clientId`, `tenantId`) must be set in `Constants.ts`. The token is stored only in `sessionStorage` by MSAL — never persisted by the app.

### API response envelope

All backend responses follow `{ status, message, data: T }`. Some endpoints double-wrap (e.g. `data.tiposActividad` returns `{ status, statusCode, data: CatalogoItem[], message }`). Always unwrap accordingly — do not assume `data` is directly the array.

### UI conventions

- **Glassmorphism** theme throughout. Use `var(--glass-bg)`, `var(--glass-border)`, `var(--glass-shadow)` for card surfaces.
- **Responsive tables** use the card pattern: `display: grid; grid-template-columns: 8rem 1fr` on `<td>` at ≤767 px, with `::before { content: attr(data-label) }` for column labels. Every `<td>` in a table must carry a `data-label` attribute.
- **Pagination**: `ngx-pagination` with `previousLabel=""` and `nextLabel=""`. Do not override ngx-pagination's default white styles.
- **Modals**: SweetAlert2 for all loading spinners, confirmations and errors.

### Services → endpoints

| Service | Endpoints used |
|---------|---------------|
| `AuthService` | `POST auth/login`, `POST auth/refresh` |
| `BitacoraService` | `POST bitacora/registros`, etc. |
| `ActividadService` | `POST actividades`, `GET bitacora/actividades/{idTipo}?username&password`, `POST bitacora/actividades` |
| `CorreoService` | correo/configuracion endpoints |

### Routes rule

Per `.claude/rules/routes.md`: maintain a `ROUTES.md` at the repo root describing every controller route (GET/POST/PUT/DELETE) and which view it maps to. Update it whenever routes change.
