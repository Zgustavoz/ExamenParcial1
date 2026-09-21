# API del backend

Base: `http://localhost:8080` (tras Nginx, el mismo origen que la SPA).

Todas las rutas salvo `POST /api/auth/login` y `/actuator/health` exigen la cabecera
`Authorization: Bearer <token>`. El `company_id` se toma **siempre del token**: no se envía nunca en el
cuerpo ni en la URL.

## Formato de error

Igual en REST (cuerpo de la respuesta) y en GraphQL (dentro de `extensions`):

```json
{ "code": "DUPLICATE_RELATIONSHIP",
  "message": "La conexión entre esas clases ya existe.",
  "details": {},
  "timestamp": "2026-09-19T12:00:00Z" }
```

| `code` | HTTP | Cuándo |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | empresa, usuario o contraseña incorrectos |
| `UNAUTHORIZED` | 401 | falta el token o no es válido |
| `USER_INACTIVE` / `COMPANY_DISABLED` | 403 | la cuenta o la empresa están desactivadas |
| `FORBIDDEN` | 403 | el rol no permite la operación |
| `NOT_FOUND` | 404 | no existe **o** pertenece a otra empresa |
| `DUPLICATE_COMPANY` / `DUPLICATE_USER` | 409 | nombre, slug, username o correo repetidos |
| `DUPLICATE_PROJECT` / `DUPLICATE_DIAGRAM` | 409 | nombre repetido en la empresa / en el proyecto |
| `VERSION_CONFLICT` | 409 | `baseVersion` no coincide (`details` trae el estado actual) |
| `ELEMENT_LOCKED` | 409 | otro usuario está editando ese elemento |
| `VALIDATION_ERROR` | 422 | datos incompletos o inválidos |
| `DUPLICATE_CLASS` / `INVALID_DATATYPE` | 422 | reglas del diagrama (CU-08) |
| `DUPLICATE_RELATIONSHIP` / `INVALID_RELATIONSHIP` | 422 | relación repetida o herencia circular |
| `OUT_OF_BOUNDS` | 422 | `x`/`y` fuera de 0..10000 |
| `INVALID_JSON` | 422 | `content_json` con forma inválida |
| `DIAGRAM_INCOMPLETE` | 422 | el diagrama no tiene clases con atributos o métodos |
| `XMI_INVALID` | 422 | XMI inválido, incompatible o demasiado grande |
| `GENERATION_FAILED` | 500 | falló la generación de código |
| `AI_INVALID_RESPONSE` | 502 | el asistente devolvió algo inutilizable |
| `AI_UNAVAILABLE` | 503 | el asistente no está disponible |
| `AI_TIMEOUT` | 504 | el asistente tardó demasiado |

Los mensajes van en español y nunca incluyen trazas internas.

## REST

### Autenticación — CU-01

| Método y ruta | Roles | Notas |
|---|---|---|
| `POST /api/auth/login` | público | `{companySlug, username, password}` → `{token, user}` |
| `GET /api/auth/me` | todos | usuario del token |

```bash
curl -X POST localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"companySlug":"demo","username":"designer","password":"..."}'
```

Redirección post-login sugerida al cliente web: `SOFTWARE_ADMIN` → `/admin/companies`,
`COMPANY_ADMIN` → `/company/users`, `DESIGNER` y `DEVELOPER` → `/projects`.

### Empresas — CU-02 (`SOFTWARE_ADMIN`)

| Método y ruta | Notas |
|---|---|
| `GET /api/companies` | listado completo (única excepción al filtro por empresa) |
| `POST /api/companies` | `{name, slug}`; el slug admite minúsculas, números y guiones |
| `PUT /api/companies/{id}` | `{name, slug}` |
| `PATCH /api/companies/{id}/status` | `{active}` |
| `POST /api/companies/{id}/admins` | crea el primer `COMPANY_ADMIN`: `{username, email, password, fullName}` |

### Usuarios — CU-03 (`COMPANY_ADMIN`)

| Método y ruta | Notas |
|---|---|
| `GET /api/users` | solo los de la empresa del token |
| `POST /api/users` | `{username, email, password, fullName, roles}`; roles ⊂ {`COMPANY_ADMIN`,`DESIGNER`,`DEVELOPER`} |
| `PUT /api/users/{id}` | igual, con `password` opcional (vacío = sin cambio) |
| `PATCH /api/users/{id}/status` | `{active}`; desactivar nunca borra |

### Proyectos — CU-04, CU-05

| Método y ruta | Roles | Notas |
|---|---|---|
| `GET /api/projects?q=&page=&size=` | todos | paginado; `q` filtra por nombre y descripción |
| `POST /api/projects` | `COMPANY_ADMIN`, `DESIGNER` | `{name, description}`; `owner_id` = usuario del token |
| `GET /api/projects/{id}` | todos | |

Respuesta paginada: `{content, page, size, totalElements, totalPages}`.

### XMI — CU-16 (`DESIGNER`)

| Método y ruta | Notas |
|---|---|
| `GET /api/diagrams/{id}/xmi` | descarga XMI 2.5.1 / UML 2.5.1 |
| `POST /api/diagrams/xmi/import` | multipart: `file` + `projectId`; máximo 5 MB, extensión `.xmi`/`.xml` |

La importación deshabilita DTD y entidades externas (protección XXE) y rechaza con `XMI_INVALID` lo que no
pueda mapear. Un XMI sin información de layout se auto-posiciona en grilla.

### Código generado — CU-15 (`DEVELOPER`)

| Método y ruta | Notas |
|---|---|
| `GET /api/generated-code?diagramId=` | historial de generaciones agrupado por tarea |
| `GET /api/generated-code/tasks/{taskId}/download` | ZIP con todos los archivos de esa tarea |

Las rutas dentro del ZIP se saneadas contra zip-slip: nunca contienen `..`, rutas absolutas ni unidades.

### Notificaciones — CU-19 (todos)

| Método y ruta | Notas |
|---|---|
| `GET /api/notifications?unreadOnly=&page=&size=` | solo las del usuario del token |
| `PATCH /api/notifications/{id}/read` | marcar como leída |
| `PUT /api/me/fcm-token` | `{token}`; actualiza `fcm_token` y `fcm_updated_at` → 204 |

Tipos emitidos: `TASK_ASSIGNED` (al crear una tarea) y `CODE_READY` (al terminar CU-14).

## GraphQL — `POST /graphql`

Requiere JWT. El escalar `JSON` transporta `content_json` y los resultados sin esquematizar.

```graphql
type Query {
  diagrams(projectId: ID!): [Diagram!]!     # CU-05/11
  diagram(id: ID!): Diagram                 # CU-11
  aiChats(diagramId: ID!): [AiChat!]!       # CU-13
  tasks(diagramId: ID, status: String): [Task!]!
  task(id: ID!): Task
  myTasks(status: String): [Task!]!        # CU-21: asignadas a mí + automáticas que lancé
  tasksCreatedByMe: [Task!]!               # CU-21: las que encargué a otras personas
}

type Mutation {
  createDiagram(projectId: ID!, name: String!, description: String): Diagram!               # CU-06  DESIGNER
  saveDiagram(id: ID!, contentJson: JSON!, baseVersion: Int!): Diagram!                     # CU-10/18 DESIGNER
  sendAiInstruction(diagramId: ID!, instruction: String!, inputType: InputType!): AiResult! # CU-12  DESIGNER
  confirmAiChanges(diagramId: ID!): Diagram!                                                # CU-12  DESIGNER
  generateBackendCode(diagramId: ID!, language: String!): Task!                             # CU-14  DESIGNER/DEVELOPER
  generateSequenceDiagram(sourceDiagramId: ID!): Diagram!                                   # CU-20  DESIGNER
  createTask(input: NewTaskInput!): Task!                                                   # CU-21
  updateTaskStatus(id: ID!, status: String!): Task!                                         # CU-21
  updateTask(id: ID!, input: EditTaskInput!): Task!                                         # CU-21
  deleteTask(id: ID!): ID!                                                                  # CU-21
}

enum InputType { TEXTO VOZ }
```

### Guardado con control optimista

`saveDiagram` exige el `baseVersion` que el cliente tenía. Si no coincide responde `VERSION_CONFLICT` con
el estado actual en `extensions.details`:

```json
{ "currentVersion": 7, "contentJson": { "...": "estado del servidor" } }
```

El cliente recarga desde ahí (es también el mecanismo que usa la sincronización offline de CU-18).

### `content_json`

Diagrama de clases recién creado:

```json
{ "schemaVersion": 1, "type": "CLASS", "classes": [], "relationships": [] }
```

- `visibility` ∈ `PUBLIC | PRIVATE | PROTECTED | PACKAGE` (por defecto: atributos `PRIVATE`, métodos y
  clases `PUBLIC`).
- `stereotype` ∈ `null | interface | abstract | enum`.
- `relationships[].type` ∈ `ASSOCIATION | AGGREGATION | COMPOSITION | GENERALIZATION | REALIZATION | DEPENDENCY`.
- Multiplicidad: `^(\d+|\*)(\.\.(\d+|\*))?$`.
- Tipos permitidos: `String, int, Integer, long, Long, double, Double, float, boolean, Boolean, UUID,
  LocalDate, LocalDateTime, BigDecimal`, el nombre de otra clase del diagrama, y `List<T>` / `Set<T>` de
  los anteriores; `void` solo como tipo de retorno.
- El servidor asigna los `id` que falten y posiciona en grilla las clases sin `x`/`y`.

Diagrama de secuencia (`type = SEQUENCE`, con `source_diagram_id` apuntando al de clases):

```json
{ "schemaVersion": 1, "type": "SEQUENCE",
  "lifelines": [{ "id": "l1", "name": "Cliente", "classId": "c1" }],
  "messages":  [{ "id": "s1", "order": 1, "fromId": "l1", "toId": "l2", "name": "crearPedido", "kind": "SYNC" }] }
```

`kind` ∈ `SYNC | ASYNC | RETURN | SELF`.

## WebSocket / STOMP — CU-17

Endpoint `/ws`. El JWT viaja en la cabecera `Authorization` del frame **CONNECT**; suscribirse al tema de
un diagrama de otra empresa cierra la conexión.

| Destino | Dirección | Cuerpo |
|---|---|---|
| `/app/diagram/{id}/join` | SEND | `{}` |
| `/app/diagram/{id}/leave` | SEND | `{}` |
| `/app/diagram/{id}/lock` | SEND | `{"elementId": "c1"}` |
| `/app/diagram/{id}/unlock` | SEND | `{"elementId": "c1"}` |
| `/app/diagram/{id}/op` | SEND | `{"op": { ...operación... }}` |
| `/topic/diagram.{id}` | SUBSCRIBE | operaciones, presencia y locks |
| `/user/queue/errors` | SUBSCRIBE | errores del emisor, en el formato 7.1 |

Mensaje difundido:

```json
{ "type": "OP", "diagramId": "...", "userId": "...", "username": "designer",
  "elementId": "c1", "op": { "...": "operación normalizada, con los ids asignados" },
  "version": 7, "ts": 1758300000000, "participants": null }
```

`type` ∈ `OP | LOCK | UNLOCK | JOIN | LEAVE | ERROR`. Los mensajes `JOIN` y `LEAVE` traen la lista
`participants` actualizada.

### Vocabulario de operaciones

`ADD_CLASS` · `UPDATE_CLASS` · `MOVE_CLASS` · `REMOVE_CLASS` · `ADD_ATTRIBUTE` · `UPDATE_ATTRIBUTE` ·
`REMOVE_ATTRIBUTE` · `ADD_METHOD` · `UPDATE_METHOD` · `REMOVE_METHOD` · `ADD_RELATIONSHIP` ·
`UPDATE_RELATIONSHIP` · `REMOVE_RELATIONSHIP`

```json
{"op":"ADD_CLASS","class":{"name":"Cliente","x":120,"y":80,
  "attributes":[{"name":"nombre","type":"String"}],"methods":[]}}
{"op":"MOVE_CLASS","classId":"c1","x":300,"y":120}
{"op":"ADD_RELATIONSHIP","relationship":{"type":"ASSOCIATION","sourceId":"c1","targetId":"c2",
  "sourceMultiplicity":"1","targetMultiplicity":"0..*"}}
```

Cada operación válida incrementa `version` en 1. Si falla, el diagrama **no** se modifica y el error llega
solo al emisor por `/user/queue/errors`.

### Reconexión

Tras una caída, el cliente reconecta con backoff exponencial, reenvía `join` y pide el estado completo con
`diagram(id)` para reconciliar por `version`. Los locks de una sesión se liberan solos al desconectarse
(y expiran a los 30 s).

### Tareas — CU-21

Las manuales (`type = MANUAL`) se crean con diagrama y persona asignada obligatorios, y empiezan en
`PENDING`. El estado solo avanza `PENDING → IN_PROGRESS → COMPLETED`; cualquier otro salto, y tocar a mano
una tarea automática, responde `INVALID_STATE_TRANSITION`.

| Quién | Puede |
|---|---|
| Asignado, creador o `COMPANY_ADMIN` | avanzar el estado (`updateTaskStatus`) |
| Creador o `COMPANY_ADMIN` | editar y eliminar (`updateTask`, `deleteTask`) |

`updateTask` cambia título, descripción y a quién está asignada; el diagrama no se cambia. Si la persona
asignada cambia, se avisa a la que la recibe (`TASK_ASSIGNED`). Al avanzar el estado se avisa a quien la
creó (`TASK_STATUS_CHANGED`). Asignar a alguien que no sea un usuario activo de la empresa responde
`USER_NOT_ELIGIBLE`.

Los campos `assignedToName` y `createdByName` del tipo `Task` resuelven el nombre de esas personas, y solo
se calculan si el cliente los pide.

`GET /api/users/assignable` (cualquier rol) devuelve `{id, username, displayName}` de los usuarios activos
de la empresa, que es lo justo para elegir a quién asignar una tarea.
