# Thymeleaf Reference

## Project Setup

```xml
<!-- pom.xml -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-thymeleaf</artifactId>
</dependency>
<dependency>
    <groupId>org.thymeleaf.extras</groupId>
    <artifactId>thymeleaf-extras-springsecurity6</artifactId>
</dependency>
```

```yaml
# application.yml
spring:
  thymeleaf:
    prefix: classpath:/templates/
    suffix: .html
    mode: HTML
    encoding: UTF-8
    cache: false  # true in production
```

---

## Template Structure

```
src/main/resources/
├── templates/
│   ├── layout/
│   │   ├── base.html          # Main layout with fragments
│   │   ├── navbar.html
│   │   └── sidebar.html
│   ├── auth/
│   │   ├── login.html
│   │   ├── mfa.html
│   │   └── register.html
│   ├── {domain}/
│   │   ├── list.html
│   │   ├── detail.html
│   │   └── form.html
│   └── error/
│       ├── 403.html
│       ├── 404.html
│       └── 500.html
└── static/
    ├── css/
    ├── js/
    └── img/
```

---

## Base Layout Fragment

```html
<!-- layout/base.html -->
<!DOCTYPE html>
<html xmlns:th="http://www.thymeleaf.org"
      xmlns:sec="http://www.thymeleaf.org/extras/spring-security"
      th:fragment="layout(title, content)">
<head>
    <meta charset="UTF-8">
    <title th:replace="${title}">App</title>
    <link rel="stylesheet" th:href="@{/css/main.css}">
</head>
<body>
    <nav th:replace="~{layout/navbar :: navbar}"></nav>

    <main class="container">
        <div th:replace="${content}"></div>
    </main>

    <script th:src="@{/js/main.js}"></script>
</body>
</html>
```

---

## Controller → View Pattern

```java
// Spring MVC Controller (not @RestController)
@Controller
@RequestMapping("/clientes")
@RequiredArgsConstructor
public class ClienteViewController {

    private final ClienteService clienteService;

    @GetMapping
    public String list(@RequestParam(defaultValue = "0") int page,
                       @RequestParam(defaultValue = "20") int size,
                       Model model) {
        final var pageResult = clienteService.listar(PageRequest.of(page, size));
        model.addAttribute("clientes", pageResult.getContent());
        model.addAttribute("currentPage", page);
        model.addAttribute("totalPages", pageResult.getTotalPages());
        return "clientes/list";     // → templates/clientes/list.html
    }

    @GetMapping("/{id}")
    public String detail(@PathVariable Long id, Model model) {
        model.addAttribute("cliente", clienteService.findById(id));
        return "clientes/detail";
    }

    @GetMapping("/nuevo")
    public String newForm(Model model) {
        model.addAttribute("clienteForm", new ClienteCreateRequest());
        model.addAttribute("estatusList", clienteService.listarEstatus());
        return "clientes/form";
    }

    @PostMapping
    public String create(@Valid @ModelAttribute("clienteForm") ClienteCreateRequest req,
                         BindingResult bindingResult, Model model,
                         RedirectAttributes redirectAttrs) {
        if (bindingResult.hasErrors()) {
            return "clientes/form";
        }
        clienteService.create(req);
        redirectAttrs.addFlashAttribute("successMessage", "Cliente creado exitosamente");
        return "redirect:/clientes";
    }
}
```

---

## Thymeleaf Templates

### List view with pagination
```html
<!-- clientes/list.html -->
<html th:replace="~{layout/base :: layout(~{::title}, ~{::main})}">
<title>Clientes</title>
<main>
    <!-- Flash messages -->
    <div th:if="${successMessage}" class="alert alert-success"
         th:text="${successMessage}"></div>

    <!-- Security-based rendering -->
    <a sec:authorize="hasAuthority('CLIENTES_ESCRITURA')"
       th:href="@{/clientes/nuevo}" class="btn btn-primary">
        Nuevo Cliente
    </a>

    <!-- Table -->
    <table class="table">
        <thead>
            <tr>
                <th>Código</th><th>Nombre</th><th>Estatus</th><th>Acciones</th>
            </tr>
        </thead>
        <tbody>
            <tr th:each="c : ${clientes}">
                <td th:text="${c.cvCliente}"></td>
                <td th:text="${c.dsNombre}"></td>
                <td>
                    <span th:class="${c.boActivo} ? 'badge bg-success' : 'badge bg-secondary'"
                          th:text="${c.boActivo} ? 'Activo' : 'Inactivo'"></span>
                </td>
                <td>
                    <a th:href="@{/clientes/{id}(id=${c.id})}">Ver</a>
                </td>
            </tr>
            <tr th:if="${#lists.isEmpty(clientes)}">
                <td colspan="4" class="text-center">No se encontraron clientes</td>
            </tr>
        </tbody>
    </table>

    <!-- Pagination -->
    <nav th:if="${totalPages > 1}">
        <ul class="pagination">
            <li th:each="i : ${#numbers.sequence(0, totalPages - 1)}"
                th:class="${i == currentPage} ? 'page-item active' : 'page-item'">
                <a class="page-link"
                   th:href="@{/clientes(page=${i})}"
                   th:text="${i + 1}"></a>
            </li>
        </ul>
    </nav>
</main>
</html>
```

### Form with validation errors
```html
<!-- clientes/form.html -->
<main>
    <form th:action="@{/clientes}" th:object="${clienteForm}" method="post">
        <input type="hidden" th:name="${_csrf.parameterName}" th:value="${_csrf.token}">

        <div class="mb-3">
            <label for="cvCliente">Código Cliente</label>
            <input id="cvCliente" type="text" class="form-control"
                   th:field="*{cvCliente}"
                   th:classappend="${#fields.hasErrors('cvCliente')} ? 'is-invalid'">
            <div class="invalid-feedback" th:errors="*{cvCliente}"></div>
        </div>

        <div class="mb-3">
            <label for="idEstatus">Estatus</label>
            <select id="idEstatus" class="form-select" th:field="*{idEstatus}">
                <option value="">-- Seleccionar --</option>
                <option th:each="e : ${estatusList}"
                        th:value="${e.id}"
                        th:text="${e.dsEstatusUsuario}"></option>
            </select>
        </div>

        <button type="submit" class="btn btn-continue">Guardar</button>
        <a th:href="@{/clientes}" class="btn btn-secondary">Cancelar</a>
    </form>
</main>
```

---

## Multi-Step Form Flow (Session-Based)

```java
// Session DTO for wizard state
@SessionAttributes("registroWizard")
@Controller
@RequestMapping("/onboarding")
public class OnboardingController {

    @ModelAttribute("registroWizard")
    public RegistroWizardDto initWizard() {
        return new RegistroWizardDto();
    }

    @GetMapping("/paso1")
    public String paso1() { return "onboarding/paso1"; }

    @PostMapping("/paso1")
    public String procesarPaso1(
            @Valid @ModelAttribute("registroWizard") RegistroWizardDto wizard,
            BindingResult result) {
        if (result.hasErrors()) return "onboarding/paso1";
        return "redirect:/onboarding/paso2";
    }

    @PostMapping("/finalizar")
    public String finalizar(
            @ModelAttribute("registroWizard") RegistroWizardDto wizard,
            SessionStatus status, RedirectAttributes redirectAttrs) {
        clienteService.completarRegistro(wizard);
        status.setComplete();  // clears session attribute
        redirectAttrs.addFlashAttribute("successMessage", "Registro completado");
        return "redirect:/dashboard";
    }
}
```

---

## Thymeleaf + Spring Security Extras

```html
<!-- Show element only to authenticated users -->
<div sec:authorize="isAuthenticated()">
    Bienvenido, <span sec:authentication="name"></span>
</div>

<!-- Show based on authority -->
<button sec:authorize="hasAuthority('ADMIN')">Panel Admin</button>

<!-- Hide from specific role -->
<div sec:authorize="!hasAuthority('INVITADO')">Contenido restringido</div>

<!-- Show current user's principal property -->
<span sec:authentication="principal.email"></span>
```

---

## CSRF Configuration for Thymeleaf + REST mix

```java
@Bean
public SecurityFilterChain thymeleafChain(HttpSecurity http) throws Exception {
    return http
        // Enable CSRF for Thymeleaf routes
        .csrf(csrf -> csrf
            .ignoringRequestMatchers("/api/**") // REST API uses JWT
        )
        .sessionManagement(s -> s
            .sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED)
        )
        .formLogin(form -> form
            .loginPage("/auth/login")
            .loginProcessingUrl("/auth/login")
            .defaultSuccessUrl("/dashboard")
            .failureUrl("/auth/login?error=true")
        )
        .logout(logout -> logout
            .logoutUrl("/auth/logout")
            .logoutSuccessUrl("/auth/login?logout=true")
            .invalidateHttpSession(true)
            .deleteCookies("JSESSIONID")
        )
        .build();
}
```