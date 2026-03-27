# Testing Reference — TDD Patterns

## The Three Laws (Uncle Bob)
1. Write NO production code unless making a failing test pass
2. Write only enough test code to fail (compile failures count)
3. Write only enough production code to pass the failing test

## Test Naming Convention
```
should{ExpectedBehavior}When{Condition}

Examples:
shouldReturn200WhenClienteExists
shouldThrow404WhenClienteNotFound
shouldRejectTokenWhenJtiBlacklisted
shouldPersistClienteWhenAllFieldsValid
shouldRedirectToMfaWhenMfaStatusPending
```

---

## Unit Test — Service Layer

```java
@ExtendWith(MockitoExtension.class)
class ClienteServiceTest {

    @Mock private CtClienteRepository clienteRepository;
    @Mock private ClienteMapper mapper;
    @InjectMocks private ClienteServiceImpl service;

    // ======================== FIND BY ID ========================
    @Test
    void shouldReturnClienteDtoWhenClienteExists() {
        // Arrange
        final var entity = CtCliente.builder().id(1L).cvCliente("CLI-001").build();
        final var dto = ClienteDto.builder().id(1L).cvCliente("CLI-001").build();
        when(clienteRepository.findById(1L)).thenReturn(Optional.of(entity));
        when(mapper.toDto(entity)).thenReturn(dto);

        // Act
        final var result = service.findById(1L);

        // Assert
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getCvCliente()).isEqualTo("CLI-001");
        verify(clienteRepository).findById(1L);
        verifyNoMoreInteractions(clienteRepository);
    }

    @Test
    void shouldThrowEntityNotFoundWhenClienteDoesNotExist() {
        // Arrange
        when(clienteRepository.findById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> service.findById(99L))
            .isInstanceOf(EntityNotFoundException.class)
            .hasMessageContaining("99");
    }

    // ======================== CREATE ========================
    @Test
    void shouldPersistAndReturnDtoWhenCreateRequestIsValid() {
        // Arrange
        final var request = ClienteCreateRequest.builder()
            .cvCliente("CLI-002").dsNombre("Test Corp").build();
        final var entity = CtCliente.builder().id(2L).cvCliente("CLI-002").build();
        final var dto = ClienteDto.builder().id(2L).build();

        when(clienteRepository.existsByCvCliente("CLI-002")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(clienteRepository.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(dto);

        // Act
        final var result = service.create(request);

        // Assert
        assertThat(result.getId()).isEqualTo(2L);
        verify(clienteRepository).save(entity);
    }

    @Test
    void shouldThrowBusinessRuleExceptionWhenCvClienteDuplicated() {
        // Arrange
        final var request = ClienteCreateRequest.builder().cvCliente("CLI-001").build();
        when(clienteRepository.existsByCvCliente("CLI-001")).thenReturn(true);

        // Act & Assert
        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(BusinessRuleException.class)
            .hasMessageContaining("duplicado");
        verify(clienteRepository, never()).save(any());
    }
}
```

---

## Controller Test — @WebMvcTest

```java
@WebMvcTest(ClienteController.class)
@Import({SecurityTestConfig.class, GlobalExceptionHandler.class})
class ClienteControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean ClienteService clienteService;

    // ======================== GET ========================
    @Test
    @WithMockUser(authorities = "CLIENTES_LECTURA")
    void shouldReturn200AndApiResponseWhenClienteFound() throws Exception {
        final var dto = ClienteDto.builder().id(1L).cvCliente("CLI-001").build();
        when(clienteService.findById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/clientes/1")
                .contentType(MediaType.APPLICATION_JSON))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value(200))
            .andExpect(jsonPath("$.transactionId").isNotEmpty())
            .andExpect(jsonPath("$.timestamp").isNotEmpty())
            .andExpect(jsonPath("$.data.cvCliente").value("CLI-001"));
    }

    @Test
    @WithMockUser(authorities = "CLIENTES_LECTURA")
    void shouldReturn404WhenClienteNotFound() throws Exception {
        when(clienteService.findById(99L))
            .thenThrow(new EntityNotFoundException("Cliente 99 no encontrado"));

        mockMvc.perform(get("/api/v1/clientes/99"))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.status").value(404))
            .andExpect(jsonPath("$.errorCode").value("NOT_FOUND"));
    }

    // ======================== POST ========================
    @Test
    @WithMockUser(authorities = "CLIENTES_ESCRITURA")
    void shouldReturn201WhenClienteCreated() throws Exception {
        final var request = new ClienteCreateRequest("CLI-003", "Nueva Corp");
        final var dto = ClienteDto.builder().id(3L).build();
        when(clienteService.create(any())).thenReturn(dto);

        mockMvc.perform(post("/api/v1/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.status").value(201));
    }

    @Test
    @WithMockUser(authorities = "CLIENTES_ESCRITURA")
    void shouldReturn422WhenValidationFails() throws Exception {
        final var invalidRequest = new ClienteCreateRequest("", ""); // blank fields

        mockMvc.perform(post("/api/v1/clientes")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(invalidRequest)))
            .andExpect(status().isUnprocessableEntity())
            .andExpect(jsonPath("$.status").value(422))
            .andExpect(jsonPath("$.validationErrors").isNotEmpty());
    }

    @Test
    void shouldReturn401WhenNotAuthenticated() throws Exception {
        mockMvc.perform(get("/api/v1/clientes/1"))
            .andExpect(status().isUnauthorized());
    }

    @Test
    @WithMockUser(authorities = "OTHER_AUTHORITY")
    void shouldReturn403WhenInsufficientAuthority() throws Exception {
        mockMvc.perform(get("/api/v1/clientes/1"))
            .andExpect(status().isForbidden());
    }
}
```

---

## Security Test Config

```java
// test/java/.../config/SecurityTestConfig.java
@TestConfiguration
public class SecurityTestConfig {
    @Bean
    public SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
        return http
            .csrf(AbstractHttpConfigurer::disable)
            .authorizeHttpRequests(auth -> auth.anyRequest().permitAll())
            .build();
    }
}
```

---

## Repository Test — @DataJpaTest + Testcontainers

```java
@DataJpaTest
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
@Testcontainers
class CtClienteRepositoryTest {

    @Container
    static PostgreSQLContainer<?> postgres =
        new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry reg) {
        reg.add("spring.datasource.url", postgres::getJdbcUrl);
        reg.add("spring.datasource.username", postgres::getUsername);
        reg.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired CtClienteRepository repository;

    @Test
    void shouldSetFcCreacionOnInsert() {
        final var saved = repository.save(
            CtCliente.builder().cvCliente("CLI-001").dsNombre("Test").build()
        );
        assertThat(saved.getFcCreacion()).isNotNull();
    }

    @Test
    void shouldFindActivoClientes() {
        repository.save(CtCliente.builder().cvCliente("A").dsNombre("A").boActivo(true).build());
        repository.save(CtCliente.builder().cvCliente("B").dsNombre("B").boActivo(false).build());

        final var result = repository.findAllBoActivoTrue();

        assertThat(result).hasSize(1)
            .allMatch(CtCliente::getBoActivo);
    }
}
```

---

## Integration Test — @SpringBootTest

```java
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class ClienteIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15-alpine");

    @DynamicPropertySource
    static void props(DynamicPropertyRegistry reg) {
        reg.add("spring.datasource.url", postgres::getJdbcUrl);
        reg.add("spring.datasource.username", postgres::getUsername);
        reg.add("spring.datasource.password", postgres::getPassword);
    }

    @Autowired TestRestTemplate restTemplate;
    @Autowired JwtService jwtService;

    private String token;

    @BeforeEach
    void setUp() {
        token = jwtService.generateToken(testUser(), Map.of());
    }

    @Test
    void shouldCreateAndRetrieveCliente() {
        // Create
        final var createReq = new ClienteCreateRequest("CLI-E2E", "E2E Corp");
        final var createResp = restTemplate.exchange(
            "/api/v1/clientes", HttpMethod.POST,
            withAuth(createReq), new ParameterizedTypeReference<ApiResponse<ClienteDto>>() {}
        );
        assertThat(createResp.getStatusCode()).isEqualTo(HttpStatus.CREATED);

        final Long id = createResp.getBody().getData().getId();

        // Retrieve
        final var getResp = restTemplate.exchange(
            "/api/v1/clientes/" + id, HttpMethod.GET,
            withAuth(null), new ParameterizedTypeReference<ApiResponse<ClienteDto>>() {}
        );
        assertThat(getResp.getBody().getData().getCvCliente()).isEqualTo("CLI-E2E");
    }

    private <T> HttpEntity<T> withAuth(T body) {
        final var headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return new HttpEntity<>(body, headers);
    }
}
```

---

## Thymeleaf Controller Test

```java
@WebMvcTest(ClienteViewController.class)
class ClienteViewControllerTest {

    @Autowired MockMvc mockMvc;
    @MockBean ClienteService service;

    @Test
    @WithMockUser
    void shouldRenderListViewWithClientes() throws Exception {
        when(service.listar(any())).thenReturn(Page.empty());

        mockMvc.perform(get("/clientes"))
            .andExpect(status().isOk())
            .andExpect(view().name("clientes/list"))
            .andExpect(model().attributeExists("clientes"));
    }

    @Test
    @WithMockUser
    void shouldRedirectAfterSuccessfulCreate() throws Exception {
        when(service.create(any())).thenReturn(ClienteDto.builder().id(1L).build());

        mockMvc.perform(post("/clientes")
                .param("cvCliente", "CLI-001")
                .param("dsNombre", "Test Corp")
                .with(csrf()))
            .andExpect(status().is3xxRedirection())
            .andExpect(redirectedUrl("/clientes"));
    }
}
```

---

## Coverage Requirements (JaCoCo)

```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <configuration>
        <rules>
            <rule>
                <element>BUNDLE</element>
                <limits>
                    <limit>
                        <counter>LINE</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.80</minimum>
                    </limit>
                    <limit>
                        <counter>BRANCH</counter>
                        <value>COVEREDRATIO</value>
                        <minimum>0.70</minimum>
                    </limit>
                </limits>
            </rule>
        </rules>
        <excludes>
            <exclude>**/*Application.class</exclude>
            <exclude>**/*Config.class</exclude>
            <exclude>**/*Dto.class</exclude>
            <exclude>**/entity/**</exclude>
        </excludes>
    </configuration>
</plugin>
```