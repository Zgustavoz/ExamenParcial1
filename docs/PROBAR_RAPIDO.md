# Probar el sistema completo en 5 minutos

Guía corta para ver el frontend y el backend funcionando juntos. Para la instalación detallada y la
resolución de problemas, ve a **[PUESTA_EN_MARCHA.md](PUESTA_EN_MARCHA.md)**.

Hay dos caminos. Elige según lo que quieras hacer:

| Quiero… | Camino | Dónde se abre |
|---|---|---|
| **Ver el sistema funcionando** (demo, evaluación) | [A — todo en Docker](#camino-a--todo-en-docker) | http://localhost:8081 |
| **Editar el frontend** y ver los cambios al instante | [B — backend en Docker, web en tu máquina](#camino-b--frontend-en-caliente) | http://localhost:4200 |

En ambos casos la SPA y la API comparten origen, así que no hay problemas de CORS.

---

## Camino A — Todo en Docker

**Requisito:** Docker Desktop abierto.

```powershell
cd C:\SW1\ExamenParcial1
docker compose --env-file .env -f infra/docker-compose.yml up -d --build
```

`--env-file .env` es obligatorio: el `.env` vive en la raíz, no junto al compose. La primera vez tarda unos
10 minutos porque compila el backend y la SPA.

Comprueba que los seis servicios estén sanos:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml ps
```

```
ai-service   Up (healthy)
backend      Up (healthy)
nginx        Up (healthy)    <- la aplicación web
postgres     Up (healthy)
rabbitmq     Up (healthy)
redis        Up (healthy)
```

Abre **http://localhost:8081** e inicia sesión.

> **Si cambias código, `--build` es obligatorio.** Sin él Docker reutiliza la imagen anterior y no verás tus
> cambios.

---

## Camino B — Frontend en caliente

Para trabajar en el frontend sin reconstruir la imagen en cada cambio.

**1. Solo la infraestructura y el backend:**

```powershell
cd C:\SW1\ExamenParcial1
docker compose --env-file .env -f infra/docker-compose.yml up -d postgres redis rabbitmq backend ai-service
```

**2. El cliente web, en otra terminal:**

```powershell
cd C:\SW1\ExamenParcial1\web
npm install
npm run dev
```

Abre **http://localhost:4200**. Vite hace de proxy de `/api`, `/graphql` y `/ws` hacia el backend del 8080,
y recarga el navegador en cuanto guardas un archivo.

---

## Con qué usuario entrar

La contraseña de todos es la de `SEED_ADMIN_PASSWORD` en el `.env`:

```powershell
Select-String -Path .env -Pattern "^SEED_ADMIN_PASSWORD="
```

| Empresa | Usuario | Rol | Entra en |
|---|---|---|---|
| `demo` | `designer` | Diseñador | Proyectos |
| `demo` | `developer` | Desarrollador | Proyectos |
| `demo` | `companyadmin` | Administrador de empresa | Usuarios |
| `platform` | `admin` | Administrador de la plataforma | Empresas |

El campo **Empresa** del login pide el identificador (`demo` o `platform`), no el nombre: un usuario solo es
único dentro de su empresa.

---

## Recorrido para ver todo funcionando

Entra como **`demo` / `designer`** y sigue este orden. Cada paso corresponde a un caso de uso.

1. **Crear un proyecto** (CU-04) → botón «Nuevo proyecto».
2. **Abrir el proyecto y crear un diagrama** (CU-06) → «Nuevo diagrama». Se abre el editor.
3. **Agregar dos clases** (CU-07) → botón «Agregar clase», dos veces.
4. **Ponerles atributos y métodos** (CU-08) → haz clic en una clase y usa el panel de la derecha.
5. **Relacionarlas** (CU-09) → arrastra de un punto azul del borde de una clase al de la otra, elige el tipo
   y las multiplicidades.
6. **Comprobar que no admite relaciones duplicadas** (CP-01) → repite la misma relación entre las mismas dos
   clases: aparece el aviso «la conexión entre esas clases ya existe».
7. **Comprobar el guardado automático** (CP-02) → mueve una clase, recarga con F5 y verás que sigue donde la
   dejaste. La versión sube con cada cambio.
8. **Generar el código** (CU-14) → botón «Código» y luego «Generar código». Con un diagrama vacío o con
   clases sin nada dentro lo rechaza a propósito (CP-06).
9. **Descargar el ZIP** (CU-15) → cierra sesión, entra como `developer`, ve al mismo diagrama, «Código» y
   «Descargar ZIP».
10. **Exportar e importar XMI** (CU-16) → en el editor, botón «XMI» para descargar; luego, desde la pantalla
    del proyecto, «Importar XMI» con ese mismo archivo.
11. **Ver las notificaciones** (CU-19) → en la barra superior. Al generar código aparece una de «Código
    listo».

### Ver la colaboración en tiempo real (CU-17, CP-09)

Necesitas dos sesiones distintas:

1. Abre el editor del mismo diagrama en una **ventana normal** y en otra **de incógnito**.
2. Entra en cada una con un usuario distinto. Si no tienes un segundo diseñador, créalo como
   `companyadmin` en «Usuarios» (contraseña de **mínimo 8 caracteres**).
3. Agrega una clase en una ventana: aparece en la otra **sin recargar**.
4. Selecciona una clase en la primera: en la otra se ve atenuada, con el nombre de quien la está editando, y
   su panel queda de solo lectura.

### El asistente de IA

El chat está en el editor, pestaña **«Asistente»**. Responderá **«no está disponible»** mientras el `.env` no
tenga `LLM_API_KEY` y `LLM_MODEL`: es el comportamiento correcto, y tu diagrama nunca se modifica cuando el
asistente falla. Lo mismo ocurre con el botón «Secuencia» (CU-20), que necesita la IA.

Para activarlo, completa en el `.env` y reinicia el `ai-service`:

```
AI_INTERNAL_KEY=cualquier-cadena-larga
LLM_API_KEY=tu-clave-de-openai
LLM_MODEL=el-modelo-a-usar
```

```powershell
docker compose --env-file .env -f infra/docker-compose.yml up -d --force-recreate ai-service
```

---

## Ejecutar las pruebas

```powershell
# Cliente web: 164 pruebas, no necesita Docker ni el backend
cd web
npm test

# Pruebas de aceptación CP-01 y CP-02 sobre el sistema desplegado (con el stack levantado)
$env:E2E_PASSWORD = (Select-String -Path ..\.env -Pattern "^SEED_ADMIN_PASSWORD=").Line.Split('=')[1]
npm run e2e

# Backend: 107 pruebas (necesita Docker abierto, usa Testcontainers)
cd ..\backend
$env:JAVA_HOME = "C:\Program Files\Java\jdk-21"
.\mvnw.cmd test
```

---

## Si algo falla

| Síntoma | Causa y arreglo |
|---|---|
| **403 al iniciar sesión** | `CORS_ALLOWED_ORIGINS` no incluye el origen desde el que abres la aplicación. Tiene que valer `http://localhost:4200,http://localhost:8081`. Reinicia el backend después de cambiarlo. |
| **La página carga pero no hay datos** | El backend no está arriba: `curl.exe http://localhost:8080/actuator/health` debe responder `{"status":"UP"}`. |
| **«Sin conexión» en el editor** | El WebSocket no llegó al backend. Revisa que `rabbitmq` y `redis` estén sanos, o pon `COLLAB_DISTRIBUTED=false` en el `.env` para usar la implementación en memoria de un solo nodo. |
| **Cambié el frontend y no lo veo** | En el Camino A hay que reconstruir: `... up -d --build`. En el Camino B basta con guardar el archivo. |
| **`dependency failed to start`** | El backend no arrancó. Mira `docker logs diagramas-backend-1 --tail 50`. Lo habitual es un `JWT_SECRET` de menos de 32 caracteres. |
| **Puerto ocupado** | PostgreSQL y Redis se publican en `15432` y `16379` para no chocar con otros. Si aún hay conflicto, cambia `DB_PORT` o `REDIS_PORT` en el `.env`. |

Para parar todo sin perder la base de datos:

```powershell
docker compose --env-file .env -f infra/docker-compose.yml stop
```

---

## Demostrar el backend generado desde el móvil

El cliente Flutter existe solo para esto: se dicta una orden y el registro aparece en la API que generó la
plataforma. Detalles en [mobile/README.md](../mobile/README.md); aquí va el guion de la demostración.

**1. Un diagrama con algo que registrar.** Como `designer`, cree un diagrama con una clase `Cliente` y los
atributos `nombre` y `email`.

**2. Genere y descargue el código.** Botón **Código** → **Generar código**; entre como `developer` y
**Descargar ZIP**.

**3. Ponga en marcha el backend generado.** Descomprima el ZIP y:

```powershell
cd <carpeta-del-zip>
mvn spring-boot:run
```

Queda en `http://localhost:8090` con una base H2 en `./data`. Compruébelo en Postman:

```
GET http://localhost:8090/api/clientes     → []
```

**4. Dicte desde el móvil.**

```powershell
cd mobile
flutter run --dart-define=API_URL=http://10.0.2.2:8080
```

Entre, elija el diagrama, pulse el micrófono y diga:

> registra un cliente con nombre Juan Pérez y email juan@ejemplo.com

**5. Enséñelo en Postman.** El mismo `GET` de antes ahora devuelve el cliente:

```json
[{"id":"…","nombre":"Juan Pérez","email":"juan@ejemplo.com"}]
```

> **El asistente no hace falta.** Si el `.env` no tiene `LLM_API_KEY`, la orden la interpreta un intérprete
> local que entiende «registra un `<entidad>` con `<campo> <valor>`». La app avisa cuando ha sido así
> («interpretado sin IA»).

| Síntoma | Causa |
|---|---|
| «No se pudo contactar con el backend generado» | La app generada no está en marcha, o no está en `http://localhost:8090`. Ajuste `GENERATED_APP_URL` en el `.env`. |
| «No entendí la orden» | Nombre la entidad y algún campo tal como están en el diagrama: «registra un cliente con nombre Ana». |
| El móvil no llega a la plataforma | En emulador use `10.0.2.2`; en un móvil físico, la IP del PC en la wifi. |
