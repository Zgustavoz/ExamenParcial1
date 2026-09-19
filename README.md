# Plataforma de Diagramas UML

Plataforma multi-tenant (por empresa) para diseñar diagramas de clases UML, con asistente de IA,
generación de código backend, importación/exportación XMI y colaboración en tiempo real.

> **Estado actual: solo el backend.** Están implementados y probados `backend/` (Spring Boot) y
> `ai-service/` (FastAPI), más la infraestructura para levantarlos. Los clientes `web/` (Angular) y
> `mobile/` (Flutter) todavía no se han desarrollado.

## Estructura

```
/
├─ backend/      Spring Boot 3.5 / Java 21: REST + GraphQL + WebSocket/STOMP
├─ ai-service/   FastAPI / Python 3.11: Copilot IA (servicio interno)
├─ infra/        docker-compose.yml, nginx/, rabbitmq/
├─ docs/         DECISIONS.md, API.md
├─ .env.example  plantilla de variables de entorno
└─ CLAUDE.md     especificación funcional completa
```

## Puesta en marcha

Requisitos: Docker (con Compose). Para desarrollar sin contenedores: JDK 21, Maven 3.9+ y Python 3.11+.

```bash
cp .env.example .env     # Windows: copy .env.example .env
```

Completa en el `.env` al menos `DB_PASSWORD`, `JWT_SECRET` (≥ 32 bytes), `SEED_ADMIN_PASSWORD` y
`RABBIT_PASSWORD`; para que el asistente funcione, también `AI_INTERNAL_KEY`, `LLM_API_KEY` y `LLM_MODEL`.

```bash
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

`--env-file` es necesario porque el `.env` vive en la raíz y no junto al compose.

| Servicio | URL | Notas |
|---|---|---|
| Backend | http://localhost:8080 | REST, GraphQL y WebSocket |
| Nginx | http://localhost:8081 | proxy de `/api`, `/graphql` y `/ws`; servirá la SPA |
| RabbitMQ | http://localhost:15672 | consola de administración |
| ai-service | — | **no** se publica: solo accesible desde la red interna |

Comprobar que está arriba:

```bash
curl http://localhost:8080/actuator/health
curl -X POST http://localhost:8080/api/auth/login -H 'Content-Type: application/json' \
  -d '{"companySlug":"platform","username":"admin","password":"<SEED_ADMIN_PASSWORD>"}'
```

En perfil `dev` existe además la empresa `demo` con un usuario por rol (`companyadmin`, `designer`,
`developer`), todos con la contraseña de `SEED_ADMIN_PASSWORD`.

## Desarrollo

```bash
cd backend      && mvn spring-boot:run       # necesita PostgreSQL; con COLLAB_DISTRIBUTED=false no usa Redis/RabbitMQ
cd ai-service   && uvicorn app.main:app --reload --port 8000
```

## Pruebas

```bash
cd backend    && mvn test     # unitarias + integración (Testcontainers: requiere Docker en ejecución)
cd ai-service && pytest       # 52 pruebas, sin llamadas reales a ningún LLM
```

Las nueve pruebas de aceptación del documento (CP-01 … CP-09) tienen cobertura automatizada; el detalle
de qué clase cubre cada una está en [backend/README.md](backend/README.md).

## Seguridad

- Ningún secreto en el repositorio: todo sale del `.env`, que está en `.gitignore`.
- `company_id` se toma siempre del JWT; un recurso de otra empresa responde `404`, no `403`.
- La importación XMI está protegida contra XXE y la descarga ZIP contra zip-slip.
- El backend revalida toda la salida del `ai-service`; el asistente no es una vía para corromper datos.
- Las contraseñas se almacenan con BCrypt y nunca aparecen en logs ni en las respuestas.

## Documentación

- [docs/API.md](docs/API.md) — contratos REST, GraphQL y STOMP, con los códigos de error.
- [docs/DECISIONS.md](docs/DECISIONS.md) — decisiones de diseño y por qué se tomaron.
- [backend/README.md](backend/README.md) y [ai-service/README.md](ai-service/README.md) — cada servicio.
- [CLAUDE.md](CLAUDE.md) — especificación funcional completa (casos de uso, modelo de datos, flujos).
