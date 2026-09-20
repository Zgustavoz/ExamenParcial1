# Puesta en marcha

> ¿Solo quieres probarlo? **[PROBAR_RAPIDO.md](PROBAR_RAPIDO.md)** lo levanta en 5 minutos, con un recorrido
> por los casos de uso. Esta guía es la larga, con todos los detalles.

Guía paso a paso para levantar el proyecto. Todos los comandos son de **PowerShell en Windows** y están
probados en este equipo. Hay dos caminos:

- **[Camino A — Todo con Docker](#camino-a--todo-con-docker)**: un solo comando levanta los seis servicios.
  Es el camino para demostrar el sistema funcionando.
- **[Camino B — Modo desarrollo](#camino-b--modo-desarrollo)**: la infraestructura en Docker y el backend
  en tu IDE, para editar código y reiniciar rápido.

---

## 1. Requisitos

| Herramienta | Para qué | Cómo comprobar |
|---|---|---|
| **Docker Desktop** | todos los servicios | `docker version` |
| **JDK 21** | compilar y ejecutar el backend | `java -version` |
| **Python 3.11+** | ejecutar el `ai-service` fuera de Docker | `python --version` |
| **Node 22+** | ejecutar el cliente web fuera de Docker | `node --version` |

**Maven no hace falta instalarlo**: el proyecto incluye el *Maven Wrapper* (`backend\mvnw.cmd`), que se
descarga solo la primera vez que lo usas.

Para el **Camino A** basta con Docker. JDK, Python y Node solo se necesitan en el Camino B.

> **Docker Desktop tiene que estar abierto** antes de cualquier comando. Si `docker version` da un error
> de *pipe* o *daemon*, ábrelo desde el menú Inicio y espera a que el icono deje de animarse.

---

## 2. Configurar el `.env` (una sola vez)

El archivo `.env` de la raíz ya existe, con contraseñas aleatorias generadas y **fuera del control de
versiones** (está en `.gitignore`). Si trabajas en otro equipo, créalo copiando la plantilla:

```powershell
cd C:\Universidad_Gustavo\1-2026\Software_I\ExamenParcial1
copy .env.example .env
```

En ese caso completa al menos estas cuatro claves (sin comillas ni espacios):

```
DB_PASSWORD=...
JWT_SECRET=...            # mínimo 32 caracteres, o el backend no arranca
SEED_ADMIN_PASSWORD=...   # contraseña del usuario admin y de los usuarios demo
RABBIT_PASSWORD=...
```

### Para que el asistente de IA funcione

El Copilot necesita un proveedor LLM. **Mientras no completes estas claves, el asistente responderá
"no está disponible"** (el resto del sistema funciona igual):

```
AI_INTERNAL_KEY=...       # cualquier cadena larga; la comparten backend y ai-service
LLM_API_KEY=...           # tu clave de OpenAI
LLM_MODEL=...             # el nombre del modelo a usar
```

Para usar **Gemini** (clave gratuita de [Google AI Studio](https://aistudio.google.com/apikey), empieza por
`AIza`). `LLM_PROVIDER` se queda en `openai` porque ese valor significa «cliente compatible con la API de
OpenAI», no «usar OpenAI»; lo que cambia es la URL base:

```
LLM_PROVIDER=openai
LLM_API_KEY=AIza...
LLM_MODEL=gemini-flash-lite-latest
LLM_BASE_URL=https://generativelanguage.googleapis.com/v1beta/openai
```

> **Elige un modelo «lite», no `gemini-flash-latest`.** Ese último es un modelo que «piensa» antes de
> responder: con una petición mínima ya tarda ~6 s y con el prompt real del Copilot supera el límite de
> 25 s (`LLM_TIMEOUT_SECONDS`), así que el asistente respondería «tardó demasiado». `gemini-flash-lite-latest`
> responde en ~1,5 s. Los modelos `gemini-2.5-*` ya no están disponibles para cuentas nuevas (HTTP 404).
> Para ver qué modelos admite tu clave: `GET https://generativelanguage.googleapis.com/v1beta/openai/models`
> con la cabecera `Authorization: Bearer <tu clave>`.

Gemini acepta el parámetro `response_format` del `ai-service`; si otro proveedor lo rechazara (HTTP 400), el
servicio reintenta sin él automáticamente.

Para usar un LLM local (Ollama, LM Studio…) en vez de OpenAI:

```
LLM_PROVIDER=local
LLM_BASE_URL=http://host.docker.internal:11434/v1
LLM_MODEL=...
```

### Para recibir avisos push en el navegador (opcional)

La configuración **web** de Firebase, que es pública (la secreta es la de `FCM_CREDENTIALS_PATH`):

```
VITE_FIREBASE_API_KEY=...            # Configuración del proyecto → Tus apps → app web
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_VAPID_KEY=...          # Cloud Messaging → Certificados push web → Generar par de claves
```

Sin estas variables la aplicación funciona igual: la pantalla de notificaciones indica que el push no está
configurado. Como Vite las incrusta al compilar, **si las cambias hay que reconstruir** la imagen web
(`docker compose … up -d --build nginx`). En una ventana de incógnito no funcionan: Chrome deshabilita ahí
la Push API a propósito.

### Anotar la contraseña del administrador

La necesitarás para iniciar sesión:

```powershell
Select-String -Path .env -Pattern "^SEED_ADMIN_PASSWORD="
```

---

## Camino A — Todo con Docker

### Paso 1: levantar los servicios

Desde la **raíz del repositorio**:

```powershell
cd C:\Universidad_Gustavo\1-2026\Software_I\ExamenParcial1
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

`--env-file .env` es obligatorio porque el `.env` vive en la raíz y no junto al `docker-compose.yml`.

> **La primera vez tarda unos 10 minutos**: descarga las imágenes base y compila el backend dentro del
> contenedor. Las siguientes veces son mucho más rápidas gracias a la caché.

El comando termina cuando los seis contenedores están sanos. Si se queda esperando y falla con
`dependency failed to start`, ve a [Problemas frecuentes](#problemas-frecuentes).

### Paso 2: comprobar que todo está arriba

```powershell
docker compose --env-file .env -f infra/docker-compose.yml ps
```

Debes ver los seis servicios en `Up` y `(healthy)`:

```
ai-service   Up (healthy)
backend      Up (healthy)
nginx        Up (healthy)   # la aplicacion web
postgres     Up (healthy)
rabbitmq     Up (healthy)
redis        Up (healthy)
```

| Servicio | Dirección | Para qué |
|---|---|---|
| Backend | http://localhost:8080 | REST, GraphQL y WebSocket |
| Aplicación web | http://localhost:8081 | **la SPA**, más el proxy de `/api`, `/graphql` y `/ws` |
| RabbitMQ | http://localhost:15672 | consola de administración (usuario y contraseña del `.env`) |
| PostgreSQL | localhost:**15432** | puerto desplazado para no chocar con otro PostgreSQL local |
| Redis | localhost:**16379** | ídem |
| ai-service | — | **no se publica**: solo es accesible desde la red interna, por diseño |

### Paso 3: probar que responde

```powershell
curl.exe -s http://localhost:8080/actuator/health
```

Respuesta esperada: `{"status":"UP"}`.

Iniciar sesión como diseñador de la empresa de ejemplo. Usa `Invoke-RestMethod`, que evita pelearse con
el escapado de comillas de PowerShell (toma la contraseña del propio `.env`):

```powershell
cd C:\Universidad_Gustavo\1-2026\Software_I\ExamenParcial1
$pass = (Select-String -Path .env -Pattern "^SEED_ADMIN_PASSWORD=").Line.Split('=')[1]
$body = @{ companySlug = 'demo'; username = 'designer'; password = $pass } | ConvertTo-Json
$sesion = Invoke-RestMethod -Uri http://localhost:8080/api/auth/login -Method Post `
                            -ContentType 'application/json' -Body $body
$sesion.user.username    # designer
$sesion.user.roles       # DESIGNER
```

El token va en la cabecera `Authorization` del resto de llamadas:

```powershell
$h = @{ Authorization = "Bearer " + $sesion.token }
Invoke-RestMethod -Uri http://localhost:8080/api/projects -Headers $h
```

A través de Nginx funciona igual cambiando el puerto a `8081`.

### Usuarios disponibles al arrancar

| Empresa (`companySlug`) | Usuario | Rol |
|---|---|---|
| `platform` | `admin` | `SOFTWARE_ADMIN` |
| `demo` | `companyadmin` | `COMPANY_ADMIN` |
| `demo` | `designer` | `DESIGNER` |
| `demo` | `developer` | `DEVELOPER` |

Todos usan la contraseña de `SEED_ADMIN_PASSWORD`. La empresa `demo` solo se crea en el perfil `dev`,
que es el predeterminado.

### Paso 4: detener

```powershell
# Detener sin borrar nada (los datos se conservan)
docker compose --env-file .env -f infra/docker-compose.yml stop

# Volver a arrancar
docker compose --env-file .env -f infra/docker-compose.yml start

# Borrar los contenedores pero conservar la base de datos
docker compose --env-file .env -f infra/docker-compose.yml down

# Borrar TAMBIÉN la base de datos (empezar de cero)
docker compose --env-file .env -f infra/docker-compose.yml down -v
```

> **Si cambias código, `--build` es obligatorio.** Sin él, Docker reutiliza la imagen anterior y no verás
> tus cambios: `... up -d --build`.

---

## Camino B — Modo desarrollo

La infraestructura en Docker y los servicios en tu máquina, para no reconstruir imágenes en cada cambio.

### Paso 1: solo la infraestructura

```powershell
cd C:\Universidad_Gustavo\1-2026\Software_I\ExamenParcial1
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis rabbitmq
```

Los valores del `.env` ya apuntan a `localhost` con los puertos correctos (`15432`, `16379`, `61613`),
así que no hay que tocar nada.

### Paso 2: fijar Java 21

**En este equipo `JAVA_HOME` apunta a `jdk-17`**, y el proyecto necesita 21. En cada terminal nueva:

```powershell
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
```

Para no repetirlo, déjalo permanente (abre una terminal nueva después):

```powershell
[Environment]::SetEnvironmentVariable("JAVA_HOME", "C:\Program Files\Java\jdk-21", "User")
```

### Paso 3: arrancar el backend

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Está listo cuando el log dice `Started PlatformApplication`. Queda en http://localhost:8080.

Alternativa, generando el `.jar`:

```powershell
.\mvnw.cmd clean package -DskipTests
java -jar target\platform-0.1.0.jar
```

> Si no quieres levantar Redis ni RabbitMQ, pon `COLLAB_DISTRIBUTED=false` en el `.env`: la colaboración
> usa entonces una implementación en memoria de un solo nodo. Todo lo demás funciona igual.

### Paso 4: arrancar el cliente web

En **otra terminal**, desde la raiz del repositorio:

```powershell
cd web
npm install
npm run dev
```

Queda en http://localhost:4200 y hace de proxy de `/api`, `/graphql` y `/ws` hacia el backend del 8080,
asi que la SPA y la API comparten origen igual que en produccion.

### Paso 5: arrancar el ai-service

En **otra terminal**:

```powershell
cd C:\Universidad_Gustavo\1-2026\Software_I\ExamenParcial1\ai-service
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000
```

Comprobar: `curl.exe -s http://localhost:8000/health` → `{"status":"ok"}`.

> Si PowerShell bloquea `Activate.ps1`, ejecuta una vez:
> `Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass`

---

## Ejecutar las pruebas

### Backend (107 pruebas)

**Docker Desktop tiene que estar abierto**: las pruebas de integración levantan PostgreSQL, Redis y
RabbitMQ reales con Testcontainers.

```powershell
cd backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd test
```

Tarda unos 4 minutos. Para una sola clase:

```powershell
.\mvnw.cmd test -Dtest=DiagramOperationApplierTest
```

### Cliente web (164 pruebas)

No necesita Docker ni el backend: la API va simulada.

```powershell
cd web
npm install
npm test
```

### ai-service (52 pruebas)

No necesita Docker ni llama a ningún LLM real.

```powershell
cd ai-service
.\.venv\Scripts\Activate.ps1
pytest
```

---

## Problemas frecuentes

### `ports are not available: ... bind: An attempt was made to access a socket...`

Otro programa ocupa ese puerto. Averigua cuál:

```powershell
docker ps --format "{{.Names}} {{.Ports}}"
netstat -ano | Select-String ":8080"
```

En este equipo ya hay un PostgreSQL y un Redis del proyecto *retrovision*; por eso los puertos de este
proyecto están desplazados a `15432` y `16379`. Si aún hay conflicto, cambia `DB_PORT` o `REDIS_PORT` en
el `.env` y vuelve a levantar.

### `dependency failed to start: container diagramas-backend-1 is unhealthy`

El backend no arrancó. Mira por qué:

```powershell
docker logs diagramas-backend-1 --tail 50
```

Causas habituales:
- **`JWT_SECRET` de menos de 32 caracteres** → alarga el valor en el `.env`.
- **`SEED_ADMIN_PASSWORD` vacío** → es obligatorio la primera vez, para crear el usuario `admin`.
- **Cambiaste código y no reconstruiste** → vuelve a levantar con `--build`.

### `No compatible version of Reactor Netty`

Estás usando una imagen antigua, anterior a la corrección de esa dependencia. Reconstruye:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

### El asistente de IA responde "no está disponible"

Es el comportamiento correcto cuando el `ai-service` no puede hablar con el proveedor LLM. Revisa que
`LLM_API_KEY` y `LLM_MODEL` estén completos en el `.env` y reinicia:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d --force-recreate ai-service
docker logs diagramas-ai-service-1 --tail 30
```

Tu diagrama **nunca se modifica** cuando el asistente falla: esa garantía está cubierta por pruebas.

### Las pruebas fallan con errores de Docker o Testcontainers

Docker Desktop no está abierto, o se quedó sin memoria. Ábrelo, espera a que arranque del todo y repite.

### `mvnw.cmd` falla al descargar Maven

Necesita internet la primera vez (descarga Maven a `%USERPROFILE%\.m2\wrapper`). Si estás detrás de un
proxy, usa un Maven instalado en el sistema en lugar del wrapper.

### La compilación falla con errores raros de "paquete no existe"

Compilación incremental corrupta. Limpia y repite:

```powershell
.\mvnw.cmd clean test-compile
```

---

## Ver los logs

```powershell
# Todos los servicios, en vivo
docker compose --env-file .env -f infra/docker-compose.yml logs -f

# Solo el backend
docker logs diagramas-backend-1 -f

# Solo el asistente de IA
docker logs diagramas-ai-service-1 -f
```

---

## Siguientes pasos

- [docs/API.md](API.md) — todos los endpoints REST, GraphQL y STOMP con sus códigos de error.
- [docs/DECISIONS.md](DECISIONS.md) — por qué el sistema está construido así.
- [docs/PLAN_WEB.md](PLAN_WEB.md) - el estado de cada caso de uso del cliente web.
- [backend/README.md](../backend/README.md), [ai-service/README.md](../ai-service/README.md) y
  [web/README.md](../web/README.md).
