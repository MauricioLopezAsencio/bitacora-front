# Angular Reference

## Project Setup

```bash
# Crear proyecto Angular con routing y SCSS
ng new app --routing --style=scss

# Crear módulos base (arquitectura limpia)
ng g module core
ng g module shared

# Crear módulo feature con lazy loading (ESCALABLE)
ng g module features/clientes --route clientes --module app.module
```

```ts
// environment.ts
export const environment = {
  production: false,

  // URLs de microservicios (NO hardcodear en servicios)
  apiClientes: 'http://localhost:8080/api',
  apiAuth: 'http://localhost:8081/api'
};
```

---

## Project Structure

```
src/app/
├── core/                 # Servicios singleton + config global
│   ├── services/
│   ├── interceptors/
│   └── guards/
├── shared/               # Componentes reutilizables
│   ├── components/
│   ├── models/
│   ├── pipes/
│   └── directives/
├── features/             # Arquitectura por dominio
│   └── clientes/
│       ├── pages/        # Smart components
│       ├── components/   # Dumb components
│       ├── services/
│       ├── models/
│       └── clientes-routing.module.ts
```

---

## Base Layout Component

```html
<!-- app.component.html -->
<!-- Layout principal reutilizable -->
<div class="layout">

  <!-- Navbar global -->
  <app-navbar></app-navbar>

  <!-- Contenido dinámico por routing -->
  <main class="container">
    <router-outlet></router-outlet>
  </main>

</div>
```

---

## Component → Service Pattern

```ts
// clientes.page.ts
@Component({
  selector: 'app-clientes-page',
  templateUrl: './clientes.page.html'
})
export class ClientesPage implements OnInit {

  clientes: Cliente[] = [];
  currentPage = 0;
  totalPages = 0;

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {
    // Llamada a microservicio (NO lógica en el componente)
    this.clienteService.list(this.currentPage)
      .subscribe(response => {
        this.clientes = response.content;
        this.totalPages = response.totalPages;
      });
  }
}
```

---

## Service (Microservices Connection)

```ts
// cliente.service.ts
@Injectable({ providedIn: 'root' })
export class ClienteService {

  private api = environment.apiClientes;

  constructor(private http: HttpClient) {}

  list(page: number): Observable<Page<Cliente>> {
    // Comunicación con backend REST
    return this.http.get<Page<Cliente>>(`${this.api}/clientes?page=${page}`);
  }

  findById(id: number): Observable<Cliente> {
    return this.http.get<Cliente>(`${this.api}/clientes/${id}`);
  }

  create(req: ClienteCreateRequest): Observable<void> {
    return this.http.post<void>(`${this.api}/clientes`, req);
  }
}
```

---

## HTTP Interceptor (JWT)

```ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    // Obtener token desde storage (puede venir de AuthService)
    const token = localStorage.getItem('token');

    if (token) {
      // Clonar request y agregar Authorization header
      const cloned = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
      return next.handle(cloned);
    }

    return next.handle(req);
  }
}
```

---

## Angular Templates

### List view with pagination

```html
<!-- clientes.page.html -->
<main>

  <!-- Mensajes tipo flash -->
  <div *ngIf="successMessage" class="alert alert-success">
    {{ successMessage }}
  </div>

  <!-- Botón condicionado por rol -->
  <button *ngIf="isAdmin"
          routerLink="/clientes/nuevo"
          class="btn btn-primary">
    Nuevo Cliente
  </button>

  <!-- Tabla -->
  <table class="table">
    <thead>
      <tr>
        <th>Código</th><th>Nombre</th><th>Estatus</th><th>Acciones</th>
      </tr>
    </thead>

    <tbody>
      <tr *ngFor="let c of clientes">
        <td>{{ c.cvCliente }}</td>
        <td>{{ c.dsNombre }}</td>
        <td>
          <span [ngClass]="c.boActivo ? 'badge bg-success' : 'badge bg-secondary'">
            {{ c.boActivo ? 'Activo' : 'Inactivo' }}
          </span>
        </td>
        <td>
          <a [routerLink]="['/clientes', c.id]">Ver</a>
        </td>
      </tr>

      <!-- Empty state -->
      <tr *ngIf="clientes.length === 0">
        <td colspan="4" class="text-center">
          No se encontraron clientes
        </td>
      </tr>
    </tbody>
  </table>

  <!-- Paginación -->
  <nav *ngIf="totalPages > 1">
    <ul class="pagination">
      <li *ngFor="let i of [].constructor(totalPages); let idx = index"
          [class.active]="idx === currentPage"
          class="page-item">

        <a class="page-link"
           (click)="currentPage = idx; loadClientes()">
          {{ idx + 1 }}
        </a>

      </li>
    </ul>
  </nav>

</main>
```

---

### Form with validation

```html
<!-- clientes-form.page.html -->
<main>

  <form [formGroup]="form" (ngSubmit)="submit()">

    <!-- CSRF no aplica directamente en Angular (lo maneja backend) -->

    <div class="mb-3">
      <label>Código Cliente</label>

      <input type="text"
             formControlName="cvCliente"
             class="form-control"
             [ngClass]="{'is-invalid': form.controls.cvCliente.invalid && form.touched}">

      <div class="invalid-feedback" *ngIf="form.controls.cvCliente.errors">
        Campo requerido
      </div>
    </div>

    <div class="mb-3">
      <label>Estatus</label>

      <select formControlName="idEstatus" class="form-select">
        <option value="">-- Seleccionar --</option>
        <option *ngFor="let e of estatusList" [value]="e.id">
          {{ e.dsEstatusUsuario }}
        </option>
      </select>
    </div>

    <button type="submit" class="btn btn-primary">Guardar</button>
    <a routerLink="/clientes" class="btn btn-secondary">Cancelar</a>

  </form>

</main>
```

---

## Reactive Form (TypeScript)

```ts
// clientes-form.page.ts
export class ClientesFormPage {

  form: FormGroup;

  constructor(private fb: FormBuilder) {

    // Definición del formulario reactivo (VALIDACIONES)
    this.form = this.fb.group({
      cvCliente: ['', Validators.required],
      idEstatus: ['']
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    // Enviar al backend
    console.log(this.form.value);
  }
}
```

---

## Route Guards (Security)

```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  canActivate(): boolean {

    // Validar autenticación (puede venir de AuthService)
    const token = localStorage.getItem('token');

    if (!token) {
      // Redirección si no está autenticado
      window.location.href = '/login';
      return false;
    }

    return true;
  }
}
```

---

## Responsive Design (Mobile First)

```scss
/* styles.scss */

/* Base mobile */
.container {
  padding: 1rem;
}

/* Tablet */
@media (min-width: 768px) {
  .container {
    max-width: 720px;
  }
}

/* Desktop */
@media (min-width: 1024px) {
  .container {
    max-width: 1140px;
  }
}
```

---

## Microservices Best Practices

```ts
// Buenas prácticas IMPORTANTES

// 1. NO hardcodear URLs → usar environment
// 2. Manejar errores con interceptor
// 3. Separar servicios por dominio
// 4. Usar DTOs tipados (interfaces)
// 5. Centralizar autenticación (AuthService)
// 6. Usar RxJS (map, catchError)
```

---
