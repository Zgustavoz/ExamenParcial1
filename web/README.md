# web — cliente React

SPA del editor de diagramas UML. Consume la API del backend (REST, GraphQL y STOMP; ver
[docs/API.md](../docs/API.md)). Decisiones de stack: D-27 y D-28 en [docs/DECISIONS.md](../docs/DECISIONS.md).

## Stack

React 19 · TypeScript · Vite · React Router · TanStack Query · Zustand · axios (REST) · graphql-request
(GraphQL) · `@stomp/stompjs` (colaboración) · `@xyflow/react` (editor de clases) · Mermaid (secuencia) ·
shadcn/ui + Tailwind CSS 4 + lucide-react. Tema **solo claro**. Pruebas con Vitest + Testing Library.

## Requisitos

Node 22 y el backend levantado en `http://localhost:8080` (ver
[docs/PUESTA_EN_MARCHA.md](../docs/PUESTA_EN_MARCHA.md)).

## Ejecutar

```powershell
cd web
npm install
npm run dev          # http://localhost:4200
```

En desarrollo Vite hace de proxy de `/api`, `/graphql` y `/ws` hacia el backend, igual que hará Nginx en
producción: la SPA y la API comparten origen, así que no hay CORS. Para apuntar a otro backend:

```powershell
$env:VITE_BACKEND_URL = "http://otro-host:8080"; npm run dev
```

Usuarios de prueba (contraseña = `SEED_ADMIN_PASSWORD` del `.env`): `platform/admin`, `demo/companyadmin`,
`demo/designer`, `demo/developer`.

## Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | servidor de desarrollo |
| `npm run build` | comprueba tipos y genera `dist/` |
| `npm test` | ejecuta las pruebas una vez (`npm run test:watch` para modo interactivo) |
| `npm run lint` | oxlint |
| `npm run e2e` | CP-01 y CP-02 con Playwright contra el sistema desplegado |

## Casos de uso cubiertos

| Pantalla | Casos de uso |
|---|---|
| `pages/auth` | CU-01 iniciar sesión |
| `pages/admin` | CU-02 empresas y su primer administrador |
| `pages/company` | CU-03 usuarios de la empresa |
| `pages/projects` | CU-04 y CU-05 proyectos · CU-06 crear diagrama · CU-16 importar XMI |
| `pages/diagrams/editor` | CU-07 … CU-10 edición · CU-12 y CU-13 asistente · CU-16 exportar · CU-17 colaboración · CU-20 secuencia |
| `pages/diagrams` | CU-11 visor · CU-14 y CU-15 código |
| `pages/notifications` | CU-19 notificaciones y avisos push del navegador |

CU-18 (modo offline) es obligatorio solo en el móvil; en web es opcional (D-11) y no se implementó.
El estado detallado está en [docs/PLAN_WEB.md](../docs/PLAN_WEB.md).

## Avisos push (CU-19)

El navegador puede recibir avisos de Firebase Cloud Messaging, incluso con la pestaña cerrada. Se activa
desde *Notificaciones* → **Activar avisos**, que pide permiso y registra el token con
`PUT /api/me/fcm-token`.

Necesita las variables `VITE_FIREBASE_*` del `.env` de la raíz (configuración **web** del proyecto, que es
pública; la credencial secreta del servidor es otra). Sin ellas la pantalla lo indica y el resto de la
aplicación funciona igual. Vite solo expone al navegador lo que empieza por `VITE_`, así que el resto del
`.env` no llega al cliente.

Detalles que conviene conocer:

- **Hace falta la clave VAPID** (`VITE_FIREBASE_VAPID_KEY`): Chrome suele exigirla.
- **En incógnito no funciona**: Chrome deshabilita ahí la Push API a propósito.
- Como Vite incrusta esas variables al compilar, **cambiarlas obliga a reconstruir** la imagen (`--build`).
- El service worker (`public/firebase-messaging-sw.js`) no puede leer variables de Vite: la aplicación le
  pasa la configuración en la query string al registrarlo.
- Al cerrar sesión se invalida el token, para que la siguiente cuenta que entre en ese navegador no reciba
  los avisos de la anterior.

## Estructura

```
src/
├─ app/routes.tsx        mapa de rutas y roles permitidos por ruta
├─ auth/guards.tsx       RequireAuth, RequireRole, RedirectIfAuthenticated, HomeRedirect
├─ stores/auth-store.ts  sesión (JWT + usuario) en Zustand, persistida en localStorage
├─ components/
│  ├─ diagram/           lienzo React Flow: nodo de clase, aristas UML y vista de secuencia
│  ├─ layout/            cabecera con navegación por rol
│  └─ ui/                componentes de shadcn/ui
├─ lib/
│  ├─ api/               clientes REST y GraphQL por módulo, y ApiError (sección 7.1)
│  ├─ push/              avisos push del navegador con Firebase Cloud Messaging (CU-19)
│  ├─ collab/            sesión STOMP del diagrama (CU-17)
│  ├─ diagram/           tipos de content_json, vocabulario de operaciones y su aplicación local
│  ├─ query-client.ts    TanStack Query (no reintenta 4xx)
│  └─ roles.ts           pantalla de inicio por rol
└─ pages/                una carpeta por módulo funcional
```

## Cómo se edita un diagrama

El cliente **nunca** modifica `content_json` por su cuenta. Cada edición se traduce a una de las 13
operaciones de la sección 7.3 y se envía por WebSocket a `/app/diagram/{id}/op`; el servidor la valida con el
`DiagramOperationApplier`, la aplica, incrementa `version` y la difunde. El cliente refleja lo que vuelve
(D-29). Si la versión recibida no es la siguiente a la local, se recarga el diagrama entero en lugar de
arriesgar una divergencia (D-30).

## Pruebas de aceptación (CP-01 y CP-02)

Se ejecutan como caja negra sobre el entorno desplegado, igual que en el documento. Necesitan el stack
levantado y la contraseña de los usuarios de ejemplo:

```powershell
docker compose --env-file ..\.env -f ..\infra\docker-compose.yml up -d --build
$env:E2E_PASSWORD = (Select-String -Path ..\.env -Pattern "^SEED_ADMIN_PASSWORD=").Line.Split('=')[1]
npm run e2e
```

`CORS_ALLOWED_ORIGINS` tiene que incluir `http://localhost:8081`: el navegador envía la cabecera `Origin`
también en peticiones del mismo origen, y sin ese valor el backend responde `403`.

## Convenciones

- **Errores:** cualquier fallo de REST o GraphQL se lanza como `ApiError` con `code` (sección 7.1) y un
  `message` ya en español; mostrar `error.message`, nunca el error crudo.
- **Multi-tenant:** el `company_id` nunca se envía; el backend lo toma del JWT.
- **Componentes de UI:** añadir con `npx shadcn@latest add <componente>`.
- **Iconos:** siempre de `lucide-react`.
