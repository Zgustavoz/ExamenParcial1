# Decisiones de diseño

Las decisiones **D-01 … D-13** vienen fijadas por `INSTRUCCIONES_AGENTE_CLAUDE.md` (sección 13). Las
**D-14 en adelante** son puntos que el documento no cubría y que hubo que resolver para implementar el
backend; todas siguen el criterio de la regla 0.5: elegir la opción más simple y dejarla anotada.

## Decisiones del documento

| ID | Tema | Decisión | Dónde se ve |
|---|---|---|---|
| D-01 | Login sin empresa | `username` es único **por empresa**, así que el login exige `companySlug`. | `AuthService` |
| D-02 | Software Admin sin empresa | `users.company_id` es `NOT NULL`, así que el `SOFTWARE_ADMIN` pertenece a la empresa semilla `platform`. | `DataInitializer` |
| D-03 | Historial de versiones | Solo el contador `version` del DDL. La tabla `diagram_versions` con snapshots queda como mejora futura. | `Diagram.version` |
| D-04 | Alcance del generador | Solo entidades JPA + esqueleto mínimo compilable. Un `generated_code` **por archivo**, agrupados por `task_id`. | `JavaSpringBootGenerator` |
| D-05 | `Architect_Adapter` | Módulo interno del backend tras la interfaz `ArchitectAdapter`, no un microservicio. | `support.xmi` |
| D-06 | Voz | La transcripción ocurre en el cliente; al backend llega texto con `inputType = VOZ`. | `CopilotService` |
| D-07 | IA: aplicar vs. confirmar | Se aplica y persiste al recibir una respuesta válida; `confirmAiChanges` es idempotente. | `CopilotService.confirm` |
| D-08 | Restricciones faltantes | Los `CHECK` y los `UNIQUE` de nombre se agregan en la migración `V2`. | `V2__constraints_and_indexes.sql` |
| D-09 | Nombres heredados | El microservicio se llama `ai-service`; «Workflow Engine» queda fuera de alcance. | — |
| D-10 | «Diagrama completo» | ≥ 1 clase y ninguna clase vacía (cada una con ≥ 1 atributo o método). | `DiagramCompleteness` |
| D-11 | Offline | Obligatorio en móvil (SQLite); en web es opcional. | fuera de este servicio |
| D-12 | REST vs GraphQL | REST para acceso/soporte, GraphQL para diagramas/IA/tareas/código, WebSocket para colaboración. | `web/` de cada módulo |
| D-13 | Secciones vacías del DOCX | Cubiertas por los CU, el modelo lógico y los componentes del documento de instrucciones. | — |

## Decisiones tomadas durante la implementación

### D-14 — XMI con JAXP/DOM en lugar de EMF o XMLBeans

El documento permite «Eclipse EMF/UML2 **o** Apache XMLBeans». Se usó **JAXP/DOM**, que ya viene en el JDK:
evita arrastrar el runtime de EMF (decenas de MB y un modelo de metadatos completo) para lo único que se
necesita, que es un mapeo acotado de ~10 elementos UML. El contrato sigue siendo la interfaz
`ArchitectAdapter`, así que cambiar de implementación no toca a quien la usa.

### D-15 — Los `xmi:id` llevan el prefijo `id_`

Los ids internos del diagrama son UUID cortos que pueden empezar por dígito, y un `xmi:id` debe ser un
NCName de XML (no puede empezar por dígito). Se exporta con el prefijo `id_` y se quita al importar, de
modo que el round-trip conserva los ids originales.

### D-16 — Una conversación de IA por (diagrama, usuario), privada

El DDL de `ai_chats` no define el alcance de una conversación. Se eligió una conversación continua por
diagrama y usuario: es lo que permite «continuar la conversación con contexto» de CU-13 sin inventar una
gestión de hilos que ningún caso de uso pide. Un diseñador **no** ve las conversaciones de otro, aunque
compartan el diagrama: son notas de trabajo personales.

### D-17 — La contraseña se verifica antes que el estado de la cuenta

CU-01 distingue «usuario inactivo» y «empresa deshabilitada» de «credenciales incorrectas». Para no
convertir esos mensajes en un oráculo que revele qué usuarios existen, primero se comprueba la contraseña
y solo después se informa del estado de la cuenta. Quien no conoce la contraseña siempre recibe
`INVALID_CREDENTIALS`.

### D-18 — El lote de operaciones de la IA es atómico

Cuando la IA propone varias operaciones, o se aplican todas o ninguna (`applyAll`). Una aplicación parcial
dejaría el diagrama en un estado que el usuario no pidió ni revisó, y CP-04 exige que un fallo deje el
diagrama intacto. Los tipos de dato se validan al final del lote, para que una clase pueda referenciar a
otra creada en el mismo lote sin importar el orden.

### D-19 — Almacenamiento local cuando no hay bucket S3

`StorageService` usa S3 (o MinIO/LocalStack vía `S3_ENDPOINT`) si `S3_BUCKET` está definido, y si no
escribe en disco local. Así el entorno de desarrollo no necesita credenciales de AWS. El ZIP de CU-15 se
genera en memoria desde `generated_code` y no depende del almacenamiento.

### D-20 — Solo se genera Java/Spring Boot

`generateBackendCode` acepta `language` pero el único destino soportado es `JAVA` (se aceptan variantes
como «java» o «Java/Spring Boot»). Cualquier otro lenguaje responde `VALIDATION_ERROR`: más lenguajes
están explícitamente fuera de alcance (sección 15).

### D-21 — El coste de BCrypt es configurable

`app.bcrypt-strength` vale 10 por defecto (el de Spring Security) y baja a 4 en las pruebas de integración.
Con el valor de producción, las ~100 pruebas que crean usuarios y hacen login tardaban minutos en hashear.
El valor de producción no cambia.

### D-22 — El fallo de una tarea de generación se persiste, no se deshace

`CodeGenerationService` no es transaccional: cada paso (crear la tarea, marcarla en progreso, completarla o
marcarla `FAILED`) va en su propia transacción. Si la generación falla, la tarea debe quedar registrada como
`FAILED` para el historial; una única transacción la habría borrado con el rollback.

### D-23 — Las notificaciones push se envían después del commit

`NotificationService` inserta la fila de `notifications` dentro de la transacción del llamador y registra el
envío FCM para **después del commit**, de forma asíncrona. Así nunca se notifica algo que acabó en rollback,
y un fallo de FCM no rompe el flujo principal (CU-19 lo exige explícitamente).

### D-24 — El broker relay necesita `reactor-netty-http`, no solo `-core`

Spring decide si hay una versión compatible de Reactor Netty comprobando la presencia de
`reactor.netty.http.client.HttpClient`, que vive en `reactor-netty-http`. Con solo `reactor-netty-core`
el contexto arranca en modo local pero **falla al arrancar** con `COLLAB_DISTRIBUTED=true`
(«No compatible version of Reactor Netty»). Como el resto de la suite usa la implementación local, se
agregó `DistributedCollabIT`, que levanta Redis y RabbitMQ reales y ejercita el relay de extremo a extremo.

### D-25 — Los puertos publicados por Compose están desplazados

PostgreSQL se publica en `15432` y Redis en `16379` (configurables con `DB_PORT` y `REDIS_PORT`), no en
sus puertos estándar. Es habitual tener ya otro PostgreSQL o Redis corriendo en la máquina de desarrollo,
y el arranque fallaba con un conflicto de puertos. Dentro de la red de Docker los servicios siguen usando
los puertos estándar.

### D-26 — La suite de Maven ejecuta también las clases `*IT`

Surefire solo recoge `*Test` por defecto. Se configuró para incluir `*IT`, de modo que `mvn test` ejecute
toda la suite de una vez. Es lo más simple mientras no exista un pipeline que separe fases.

## Decisiones del cliente web

### D-27 — El frontend web es React, no Angular

`INSTRUCCIONES_AGENTE_CLAUDE.md` fijaba Angular para `web/`. Se cambió a **React + TypeScript + Vite** por
decisión del equipo. Lo que el documento pedía de Angular tiene su equivalente directo: rutas *lazy* con
`React.lazy`, `AuthGuard`/`RoleGuard` como componentes de ruta protegida (`RequireAuth`, `RequireRole`),
`HttpInterceptor` como interceptor de axios, y `@stomp/rx-stomp` como `@stomp/stompjs` (rx-stomp es un
envoltorio de RxJS sobre ese mismo cliente, y aquí no se usa RxJS). Estado del servidor con TanStack Query;
sesión y estado del editor con Zustand. El contrato con el backend (REST, GraphQL, STOMP), las pantallas, los
roles y la redirección post-login **no cambian**.

Para GraphQL se usa `graphql-request` como simple transporte, sin caché normalizada (Apollo/urql): el
`content_json` cambia por operaciones y por WebSocket, y una caché normalizada solo añadiría problemas de
sincronización. La UI usa shadcn/ui sobre Tailwind, con iconos de `lucide-react` y tema claro.

### D-28 — React Flow en lugar de JointJS

El editor de clases usa `@xyflow/react` (React Flow, MIT). El backend no depende de la librería del editor:
solo conoce `content_json` y el vocabulario de 13 operaciones. La clase UML (nombre, atributos, métodos) es un
nodo personalizado y las relaciones son aristas personalizadas con marcadores UML propios (rombo vacío/lleno,
triángulo, línea punteada, multiplicidades y roles como etiquetas). Los `id` de nodo y arista son los del
servidor, nunca los que genere la librería.

### D-29 — Toda edición del diagrama viaja como operación por WebSocket

El editor no modifica `content_json` por su cuenta ni lo envía entero en cada cambio: manda la operación a
`/app/diagram/{id}/op`, y el servidor la valida con el `DiagramOperationApplier`, la aplica, incrementa
`version` y la difunde. El cliente refleja lo que vuelve difundido. Es lo que pide la sección 11.1 («la
validación del servidor es la autoridad») y el flujo 9.1, y de paso hace que CP-01 y CP-09 funcionen por
construcción.

Como consecuencia, **el autoguardado de CP-02 es automático**: cada operación —incluido `MOVE_CLASS` al
soltar una clase— queda persistida en el momento, sin necesidad de un temporizador. El botón «Guardar»
cubre el camino explícito de CU-10 (`saveDiagram` con `baseVersion`), que además es el que gestiona el
`VERSION_CONFLICT` y el que usará la sincronización offline de CU-18.

### D-30 — El cliente repite los valores por omisión al aplicar una operación difundida

La operación que difunde el servidor lleva los ids que asignó, pero no los valores por omisión: el applier
los pone sobre su propia copia (`deepCopy`) al guardar en `content_json`. Un `ADD_CLASS` difundido, por
ejemplo, no trae `visibility`, `stereotype` ni `methods`. El reductor local los repite con los mismos
criterios (clases `PUBLIC`, atributos `PRIVATE`, métodos `PUBLIC` y `void`) para que el estado local quede
idéntico al del servidor. Si además se pierde algún mensaje intermedio —la versión recibida no es la
siguiente a la local— se recarga el diagrama entero en lugar de arriesgar una divergencia.

### D-31 — Un solo punto de conexión por lado en el nodo de clase

El nodo tenía un punto de origen y otro de destino apilados en cada lado. Al estar en la misma posición, el
de arriba intercepta el puntero y la conexión no se puede soltar sobre el de abajo: arrastrar de una clase a
otra no funcionaba. Ahora hay **un solo punto por lado** y el lienzo usa `ConnectionMode.Loose`, que permite
empezar y terminar en cualquiera de ellos. Lo destapó la prueba de aceptación CP-01, que no pasaba de la
primera conexión.

### D-32 — `CORS_ALLOWED_ORIGINS` incluye el origen de la SPA servida por Nginx

El navegador envía la cabecera `Origin` también en peticiones del mismo origen cuando no son `GET` ni
`HEAD`. Con la SPA servida en `http://localhost:8081` y solo `http://localhost:4200` en la lista, el backend
respondía `403` a todo `POST`, incluido el login: la aplicación era inusable en el despliegue con Docker,
aunque `curl` funcionara. La plantilla `.env.example` incluye ahora ambos orígenes.

## Decisiones del cliente móvil

### D-33 — El móvil se reduce a demostrar el backend generado

La sección 11.2 del enunciado describe un cliente Flutter completo: consulta de diagramas, chat con la IA,
notificaciones push y modo offline con SQLite (CU-18). Por decisión del equipo se recortó a **una sola
pantalla con un botón de micrófono**, cuyo único objetivo es demostrar que el código que genera la
plataforma funciona de verdad: se dicta «registra un cliente…» y el registro aparece en la API generada.

El modo offline (CU-18, CP-08) se recortó a lo que el móvil hace, que es dictar órdenes: ver [D-36](#d-36--las-órdenes-dictadas-sin-conexión-se-guardan-en-sqlite-y-se-envían-al-volver).
Las notificaciones push y la consulta de diagramas siguen fuera de esta pantalla. El resto del sistema no
cambia.

### D-34 — El generador emite también repositorios y controladores REST

D-04 limitaba el generador a entidades JPA más un esqueleto compilable, y la sección 15 dejaba los
repositorios y controladores como mejora futura. Con ese alcance el código generado **no expone ninguna
API**, así que no había dónde registrar nada ni qué enseñar en Postman: la demostración del móvil era
imposible.

Ahora, por cada clase concreta del diagrama (ni interfaces, ni enums, ni abstractas, que no se instancian)
se generan un `JpaRepository` y un `@RestController` con el CRUD completo en `/api/<entidad>s`. El proyecto
arranca contra **H2 en un archivo local** y en el puerto 8090, de modo que el ZIP se ejecuta sin instalar
ni configurar nada; apuntando `DB_URL` a PostgreSQL funciona igual.

### D-35 — La orden hablada se interpreta en el servidor, con respaldo sin IA

El móvil transcribe la voz (D-06) y envía **solo texto** a la plataforma, que es quien traduce la orden a
una llamada HTTP y la ejecuta contra el backend generado. Así la clave del LLM no sale del servidor, el
móvil necesita una sola dirección, y todo el camino se puede probar con `curl` sin compilar la app.

La traducción la hace el asistente (`POST /v1/command` del `ai-service`). Si no está configurado o falla,
actúa un **intérprete local** que entiende órdenes del tipo «registra un `<entidad>` con `<campo> <valor>`»:
la demostración no depende de que el LLM esté disponible. La respuesta dice cuál de los dos actuó.

Por seguridad, la ruta que se ejecuta tiene que ser una de las que el diagrama expone: una ruta inventada o
absoluta se rechaza con `AI_INVALID_RESPONSE`, para que una respuesta del LLM no pueda dirigir la petición
a otro servidor.

### D-36 — Las órdenes dictadas sin conexión se guardan en SQLite y se envían al volver

CU-18 pide que, sin conexión, lo que el usuario hace se guarde en el dispositivo y se envíe al reconectar.
En este móvil lo único que el usuario «hace» es dictar una orden, así que eso es lo que se guarda: una tabla
`pending_ops` en SQLite (`sqflite`) con la orden, el diagrama, el estado (`PENDING | SYNCING | DONE |
FAILED`), los intentos y el último error. Se descartó `CONFLICT` de la sección 11.2: una orden es un comando,
no un guardado con `baseVersion`, y no puede chocar con la versión de nadie.

- **Cuándo se guarda.** Si `connectivity_plus` dice que no hay red, la orden va directa a la cola sin llamar al
  servidor (evita esperar 30 s de *timeout*). Si dice que hay red pero el envío falla por la red o porque el
  backend generado no responde (`NETWORK_ERROR`, `AI_UNAVAILABLE`, `AI_TIMEOUT`, `INTERNAL_ERROR`), también
  se guarda: una wifi sin salida a internet cuenta como conectada y no hay que perder la orden por eso.
- **Cuándo NO se guarda.** Un rechazo del servidor («no entiendo la orden», validación) se muestra al usuario
  y no se encola: reintentarlo daría lo mismo. Si llega estando ya en cola, la orden pasa a `FAILED` y se
  sigue con la siguiente.
- **Cuándo se envía.** Al recuperar la red, cada 20 s mientras haya pendientes (por si la red no cambió pero el
  servidor volvió), al volver a entrar en la app y con el botón «Sincronizar ahora».
- **En orden y de una en una.** Se envían en el orden en que se dictaron. Un fallo de red detiene el envío y
  deja el resto pendiente, porque lo que va detrás también fallaría y enviarlo antes rompería el orden. Una
  orden nueva dictada mientras hay pendientes va detrás de ellas.
- **Cada usuario, lo suyo.** Cada orden guarda `empresa/usuario` y solo se envía con la sesión de quien la
  dictó: en un móvil compartido, otro usuario no ejecuta órdenes ajenas.
- **Sesión vencida.** El token no se guarda en el dispositivo. Si vence antes de reconectar, el servidor
  responde `UNAUTHORIZED`, las órdenes se conservan y la pantalla pide volver a entrar; al hacerlo, se envían.

Limitaciones asumidas:

- **Entrega «al menos una vez».** Si la petición llegó al servidor pero la respuesta se perdió, la orden se
  reenvía y podría registrarse dos veces. Evitarlo exige una clave de idempotencia en el servidor, que hoy no
  existe.
- **Sin sesión no se puede empezar offline.** Entrar exige red; el modo offline cubre perder la conexión con la
  sesión ya abierta, y conserva lo pendiente si la app se cierra.
- **El dictado depende del dispositivo.** El reconocimiento de voz de Android puede necesitar internet; sin
  él, se puede escribir la orden y se guarda igual.

### D-37 — El generador no serializa el extremo inverso de las relaciones

El generador crea cada relación en los dos sentidos (`@OneToMany(mappedBy…)` y `@ManyToOne`) y el controlador
devuelve la entidad tal cual. Con datos enlazados, un cliente contenía a sus pedidos, cada pedido a su cliente,
y así sin fin: Jackson cortaba con «Document nesting depth exceeds the maximum» y `GET /api/clientes` llegaba
como JSON truncado con HTTP 200. Se vio al arrancar el backend generado del diagrama «Tienda en línea» y
enlazar un pedido con un cliente; con registros sueltos (lo que hace el móvil) no ocurría.

Ahora el extremo inverso (`mappedBy`) lleva `@JsonIgnore`, de modo que cada relación se serializa por un solo
lado: se ve `pedido.cliente` y `pedido.productos`, y se crean desde ahí. Contrapartida: `cliente.pedidos` no
aparece en `GET /api/clientes`; se consulta en `GET /api/pedidos`. Se descartó `@JsonIgnoreProperties`: con tres
o más entidades sigue habiendo ciclos (cliente → pedidos → productos → pedidos → cliente…).
