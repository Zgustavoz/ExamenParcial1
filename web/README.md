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

## Estructura

```
src/
├─ app/routes.tsx        mapa de rutas y roles permitidos por ruta
├─ auth/guards.tsx       RequireAuth, RequireRole, RedirectIfAuthenticated, HomeRedirect
├─ stores/auth-store.ts  sesión (JWT + usuario) en Zustand, persistida en localStorage
├─ lib/
│  ├─ api/http.ts        cliente REST: adjunta el JWT, cierra sesión en 401
│  ├─ api/graphql.ts     cliente GraphQL: mismos errores que REST (`extensions.code`)
│  ├─ api/errors.ts      ApiError y códigos de la sección 7.1
│  ├─ query-client.ts    TanStack Query (no reintenta 4xx)
│  └─ roles.ts           pantalla de inicio por rol
├─ components/ui/        componentes de shadcn/ui
└─ pages/                pantallas (por ahora provisionales)
```

## Convenciones

- **Errores:** cualquier fallo de REST o GraphQL se lanza como `ApiError` con `code` (sección 7.1) y un
  `message` ya en español; mostrar `error.message`, nunca el error crudo.
- **Multi-tenant:** el `company_id` nunca se envía; el backend lo toma del JWT.
- **Componentes de UI:** añadir con `npx shadcn@latest add <componente>`.
- **Iconos:** siempre de `lucide-react`.
