# Backend — Plataforma de Diagramas UML

Spring Boot 3.5 / Java 21. Expone **REST** (acceso, administración y soporte), **GraphQL** (diagramas, IA,
tareas y código) y **WebSocket/STOMP** (edición colaborativa), según el reparto de la arquitectura lógica.

## Requisitos

- JDK 21 (en este equipo `JAVA_HOME` apunta a `jdk-17`: fíjalo a `jdk-21`)
- Maven **no** hace falta instalarlo: usa el wrapper incluido (`./mvnw`, `mvnw.cmd` en Windows)
- PostgreSQL 16 (o Docker, ver `infra/`)
- Docker en ejecución para los tests (Testcontainers levanta PostgreSQL y Redis reales)

## Configuración

Todas las variables salen del `.env` de la raíz del repositorio (copia `.env.example`). El arranque
falla de forma explícita si `JWT_SECRET` tiene menos de 32 bytes o si falta `SEED_ADMIN_PASSWORD` la
primera vez. Ningún secreto está en el código ni en `application.yml`.

Perfiles: `dev` (por defecto; crea además una empresa demo), `test`, `prod`.

## Compilar, ejecutar y probar

```bash
./mvnw clean package                   # compila y empaqueta
./mvnw spring-boot:run                 # arranca en http://localhost:8080
./mvnw test                            # toda la suite: 107 pruebas
./mvnw test -Dtest=DiagramOperationApplierTest   # una sola clase
```

Con la infraestructura de `infra/docker-compose.yml` levantada, el backend arranca contra ella sin más
configuración. Para trabajar sin Redis ni RabbitMQ, pon `COLLAB_DISTRIBUTED=false`: la colaboración usa
entonces la implementación local en memoria (un solo nodo).

Comprobación rápida: `curl http://localhost:8080/actuator/health` → `{"status":"UP"}`.

## Datos semilla

Al primer arranque se crean la empresa `platform` y el usuario `admin` (`SOFTWARE_ADMIN`) con la contraseña
de `SEED_ADMIN_PASSWORD`. En perfil `dev` se agrega la empresa `demo` con un usuario por rol
(`companyadmin`, `designer`, `developer`), todos con esa misma contraseña.

```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"companySlug":"platform","username":"admin","password":"<SEED_ADMIN_PASSWORD>"}'
```

## Estructura

| Paquete | Módulo lógico | Contenido |
|---|---|---|
| `access` | Acceso y Administración | auth + JWT, empresas, usuarios, proyectos, datos semilla |
| `design` | Diseño Colaborativo | diagramas, `DiagramOperationApplier`, versionado, `collab` (STOMP, locks) |
| `copilot` | Integración Copilot IA | chats, cliente HTTP a `ai-service`, normalizador, diagrama de secuencia |
| `codegen` | Generación de Código | tareas, `generated_code`, generador Java/Spring Boot |
| `support` | Servicios de Soporte | notificaciones (FCM), XMI (`ArchitectAdapter`), almacenamiento (S3/local) |
| `common` | Transversal | errores, seguridad, configuración, utilidades |

La base de datos la gestiona **Flyway** (`src/main/resources/db/migration`): `V1` es el DDL del documento
tal cual y `V2` agrega los `CHECK`, los `UNIQUE` de nombre y los índices.

## Puntos de diseño que conviene conocer antes de tocar el código

- **`DiagramOperationApplier` es la única autoridad de validación.** El editor manual, el canal WebSocket,
  la IA y el import XMI pasan por él. Trabaja sobre una copia: si algo falla, el diagrama queda intacto.
- **`company_id` sale siempre del JWT**, nunca del body ni de la URL. Un recurso de otra empresa responde
  `404`, no `403`, para no revelar su existencia.
- **La salida de la IA nunca se cree.** `OperationNormalizer` traduce nombres a ids y el applier revalida todo.
- **`CollabPort`** tiene dos implementaciones intercambiables (`LocalCollab` en memoria y `RedisRabbitCollab`);
  se elige con `COLLAB_DISTRIBUTED` sin tocar los servicios.
- **Las escrituras de un diagrama se serializan** con un bloqueo de fila (`findForUpdate`), lo que da el orden
  total por `version` que necesita la convergencia.

## Tests

`*Test` son unitarios (rápidos, sin contenedores) y `*IT` de integración (PostgreSQL real vía Testcontainers
y un `ai-service` simulado en memoria; nunca se llama a un LLM). Cada prueba de aceptación del documento
(CP-01 … CP-09) tiene cobertura automatizada:

| CP | Dónde |
|---|---|
| CP-01 relación duplicada | `DiagramOperationApplierTest`, `DesignIT`, `CollabStompIT` |
| CP-02 autoguardado persiste | `DesignIT` |
| CP-03 clase generada por IA | `CopilotIT` |
| CP-04 fallo/timeout de IA | `CopilotIT`, `AiClientTest` |
| CP-05 generar código | `CodegenIT`, `JavaSpringBootGeneratorTest` (compila lo generado en memoria) |
| CP-06 diagrama incompleto | `CodegenIT` |
| CP-07 round-trip XMI | `XmiAdapterTest` |
| CP-08 sincronización offline | control optimista: `DesignIT` (el cliente móvil queda fuera de este servicio) |
| CP-09 colaboración en vivo | `CollabStompIT` (modo local) y `DistributedCollabIT` (Redis + RabbitMQ reales) |

`DistributedCollabIT` levanta Redis y RabbitMQ con Testcontainers y arranca el backend con
`COLLAB_DISTRIBUTED=true`. Es la única prueba que ejercita el broker relay, así que cubre los fallos que
solo aparecen en el modo de producción (por ejemplo, un arranque roto del relay).

Además: aislamiento multi-tenant, autorización por rol de cada CU, `VERSION_CONFLICT`, `ELEMENT_LOCKED`,
XXE en la importación XMI y zip-slip en la descarga.
