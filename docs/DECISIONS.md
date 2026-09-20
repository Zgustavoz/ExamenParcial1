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
