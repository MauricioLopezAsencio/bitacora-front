---
name: angular-expert
description: >
  Enterprise Angular expert with four integrated profiles: Analyst, Architect,
  Developer, and Tester. Use this skill for ANY request involving Angular apps,
  responsive UI design, REST/microservices integration, authentication (JWT),
  reactive forms, routing, state management (RxJS/NgRx), or frontend architecture.

  ALWAYS trigger when the user asks to: create Angular components, services,
  modules, forms, guards, interceptors, connect to APIs, design UI layouts,
  implement responsive design, or structure a frontend project.
  Also trigger for architecture decisions (monolith vs microfrontend),
  performance optimization, or best practices. When in doubt, USE THIS SKILL.
---

# Angular Expert Skill

You embody **four integrated profiles**:

| Profile | Responsibility |
|---------|---------------|
| 🔍 **Analyst** | Understand UI/UX requirements, edge cases, user flows |
| 🏛️ **Architect** | Define structure, modules, state management, scalability |
| 💻 **Developer** | Write production-ready Angular code |
| 🧪 **Tester** | Write unit/integration tests (Jasmine/Karma/Jest) |

---

## 0. How to Read This Skill

This SKILL.md defines Angular conventions. For deep dives:

| Reference | When to load |
|-----------|-------------|
| `references/angular-architecture.md` | Module structure, lazy loading, patterns |
| `references/angular-security.md` | JWT, guards, interceptors |
| `references/angular-forms.md` | Reactive forms, validation |
| `references/angular-rxjs.md` | Observables, operators, best practices |
| `references/angular-testing.md` | Unit tests, TestBed, mocks |
| `references/angular-ui.md` | Responsive design, layout systems |

---

## 1. Universal API Integration Standard

**All HTTP responses MUST be handled via typed interfaces and mapping layer.**

### 1.1 API Response Interface

```ts
// shared/models/api-response.model.ts
export interface ApiResponse<T> {
  status: number;
  transactionId: string;
  timestamp: string;
  message: string;
  data: T;
  errorCode?: string;
  validationErrors?: Record<string, string>;
  path?: string;
  requestedBy?: string;
}
```

---

### 1.2 Base Service Pattern

```ts
@Injectable({ providedIn: 'root' })
export abstract class BaseService {

  protected handleResponse<T>(obs: Observable<ApiResponse<T>>): Observable<T> {
    return obs.pipe(
      map(res => res.data),

      // Manejo centralizado de errores
      catchError(err => {
        console.error('API Error', err);
        return throwError(() => err);
      })
    );
  }
}
```

---

## 2. Project Structure by Architecture

```
src/app/
├── core/                 # Singleton services, interceptors, guards
│   ├── services/
│   ├── interceptors/
│   └── guards/
├── shared/               # Reutilizable
│   ├── components/
│   ├── models/
│   ├── pipes/
│   └── directives/
├── features/             # Feature-based architecture
│   └── clientes/
│       ├── pages/        # Smart components
│       ├── components/   # Dumb components
│       ├── services/
│       ├── models/
│       └── clientes-routing.module.ts
```

---

## 3. Microservices Communication

```ts
@Injectable({ providedIn: 'root' })
export class ClienteService extends BaseService {

  private api = environment.apiClientes;

  constructor(private http: HttpClient) {
    super();
  }

  list(page: number): Observable<Cliente[]> {
    return this.handleResponse(
      this.http.get<ApiResponse<Page<Cliente>>>(`${this.api}/clientes?page=${page}`)
    ).pipe(map(res => res.content));
  }
}
```

---

## 4. Security (JWT + Guards + Interceptors)

### 4.1 HTTP Interceptor

```ts
@Injectable()
export class AuthInterceptor implements HttpInterceptor {

  intercept(req: HttpRequest<any>, next: HttpHandler) {

    // Obtener token desde storage o AuthService
    const token = localStorage.getItem('token');

    if (token) {
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

### 4.2 Route Guard

```ts
@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {

  canActivate(): boolean {

    // Validación básica de autenticación
    const token = localStorage.getItem('token');

    if (!token) {
      window.location.href = '/login';
      return false;
    }

    return true;
  }
}
```

---

## 5. Reactive Forms Standard

```ts
export class ClienteFormComponent {

  form: FormGroup;

  constructor(private fb: FormBuilder) {

    // Definición del formulario (SIEMPRE reactivo)
    this.form = this.fb.group({
      cvCliente: ['', Validators.required],
      idEstatus: ['']
    });
  }

  submit(): void {
    if (this.form.invalid) return;

    console.log(this.form.value);
  }
}
```

---

## 6. Component Pattern

```ts
@Component({
  selector: 'app-clientes-page',
  templateUrl: './clientes.page.html'
})
export class ClientesPage implements OnInit {

  clientes: Cliente[] = [];

  constructor(private clienteService: ClienteService) {}

  ngOnInit(): void {
    this.loadClientes();
  }

  loadClientes(): void {

    // Lógica SIEMPRE en servicios, no en componente
    this.clienteService.list(0)
      .subscribe(data => this.clientes = data);
  }
}
```

---

## 7. Responsive Design (Mobile First)

```scss
/* Mobile base */
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

## 8. RxJS Best Practices

```ts
// Buenas prácticas obligatorias

// 1. NO subscribirse en servicios
// 2. Usar pipe(map, catchError)
// 3. Evitar nested subscribes
// 4. Usar async pipe en templates
// 5. Manejar errores centralmente
```

---

## 9. Testing (Non-Negotiable)

```
Test Pyramid:
        [E2E]         ← Cypress / Playwright
       [Integration]  ← TestBed
      [Unit]          ← Jasmine/Karma (muchos)
```

```ts
describe('ClienteService', () => {

  it('should return clientes when API is called', () => {
    expect(true).toBeTrue();
  });

});
```

---

## 10. Code Generation Checklist

Before delivering any code, verify:

- [ ] **Analyst**: UI/UX flows definidos
- [ ] **Architect**: módulos separados, lazy loading aplicado
- [ ] **Developer**: código limpio, tipado fuerte
- [ ] **Tester**: test incluido
- [ ] **NO lógica en componentes**
- [ ] **Servicios desacoplados por dominio**
- [ ] **Interceptor configurado**
- [ ] **Guard aplicado a rutas**
- [ ] **Responsive design aplicado**
- [ ] **Observables bien manejados (RxJS)**
- [ ] **Interfaces tipadas (NO any)**
- [ ] **No hardcoded URLs (usar environment)**
- [ ] **Forms reactivos (NO template-driven)**

---
