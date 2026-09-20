# Plan del cliente web (React)

Checklist de construcción de `web/`. Cada caso de uso se marca cuando su pantalla funciona contra el backend
real, tiene sus excepciones cubiertas y la suite (`npm test`) está en verde. Al terminar cada uno va un commit.

Referencias: [API.md](API.md) para los contratos, [DECISIONS.md](DECISIONS.md) para D-27 (React) y D-28
(React Flow), y `CLAUDE.md` para los casos de uso y las pruebas de aceptación CP-01 … CP-09.

## F0 — Base

- [x] Andamiaje Vite + React + TypeScript, alias `@/`, proxy de `/api`, `/graphql` y `/ws`
- [x] shadcn/ui + Tailwind 4 + lucide-react, tema claro
- [x] Sesión en Zustand (JWT + usuario), persistida en `localStorage`
- [x] Cliente REST (axios) y cliente GraphQL (graphql-request) con `ApiError` común (sección 7.1)
- [x] Guardas de ruta `RequireAuth` / `RequireRole` y redirección por rol
- [x] Vitest + Testing Library

## F1 — Ciclo C1: acceso y administración

- [x] **CU-01 Iniciar sesión** — formulario con empresa, usuario y contraseña; redirección por rol; errores
      `INVALID_CREDENTIALS`, `USER_INACTIVE`, `COMPANY_DISABLED`
- [x] **CU-02 Gestionar empresas** (`SOFTWARE_ADMIN`) — listar, crear, editar, activar/desactivar y crear el
      primer `COMPANY_ADMIN`; error `DUPLICATE_COMPANY`
- [x] **CU-03 Gestionar usuarios de empresa** (`COMPANY_ADMIN`) — crear, editar y desactivar; roles sin
      `SOFTWARE_ADMIN`; errores `DUPLICATE_USER` y `VALIDATION_ERROR`
- [x] **CU-04 Crear proyecto** (`COMPANY_ADMIN`, `DESIGNER`) — error `DUPLICATE_PROJECT`
- [x] **CU-05 Consultar proyectos** (todos) — listado paginado con filtro por texto; lista vacía sin error
- [x] Layout de la aplicación: barra superior, navegación por rol y cierre de sesión

## F2 — Ciclo C2: diseño de diagramas

- [x] **CU-06 Crear diagrama de clases** (`DESIGNER`) — error `DUPLICATE_DIAGRAM`
- [x] **CU-11 Consultar diagrama** (todos) — visor de solo lectura con zoom, clases y secuencia
- [x] **CU-07 Editar diagrama manualmente** (`DESIGNER`) — lienzo React Flow, paleta, arrastrar y soltar,
      autoguardado con *debounce* (CP-02); errores `OUT_OF_BOUNDS` y `DUPLICATE_RELATIONSHIP` (CP-01)
- [x] **CU-08 Gestionar clases, atributos y métodos** (`DESIGNER`) — panel de propiedades; errores
      `DUPLICATE_CLASS` e `INVALID_DATATYPE`
- [x] **CU-09 Gestionar relaciones** (`DESIGNER`) — tipo, multiplicidades y roles; error
      `INVALID_RELATIONSHIP` (herencia circular)
- [x] **CU-10 Guardar y versionar** (`DESIGNER`) — `saveDiagram` con `baseVersion` y recarga ante
      `VERSION_CONFLICT`

## F3 — Ciclo C3: IA y generación de código

- [ ] **CU-12 Generar o modificar diagrama con IA** (`DESIGNER`) — chat con texto y voz (Web Speech API,
      `inputType=VOZ`); el diagrama queda intacto ante `AI_TIMEOUT` y `AI_UNAVAILABLE` (CP-04)
- [ ] **CU-13 Consultar historial de conversación IA** (`DESIGNER`)
- [ ] **CU-14 Generar código backend** (`DESIGNER`, `DEVELOPER`) — error `DIAGRAM_INCOMPLETE` (CP-06)
- [ ] **CU-15 Descargar código generado** (`DEVELOPER`) — historial por tarea y descarga del ZIP

## F4 — Ciclo C4: integración, colaboración y notificaciones

- [ ] **CU-16 Exportar/Importar XMI** (`DESIGNER`) — descarga y carga con `XMI_INVALID`
- [ ] **CU-17 Colaborar en tiempo real** (`DESIGNER`, `DEVELOPER`) — STOMP, participantes, bloqueo por
      elemento (`ELEMENT_LOCKED`) y reconexión con *backoff* (CP-09)
- [ ] **CU-19 Notificaciones** (todos) — listado y marcar como leída
- [ ] **CU-20 Generar diagrama de secuencia** (`DESIGNER`) — render con Mermaid

> CU-18 (modo offline) es obligatorio solo en móvil: en web es opcional (D-11) y queda fuera de este plan.

## F5 — Cierre

- [ ] Dockerfile multi-stage de `web/` y `dist` servido por Nginx en el Compose
- [ ] E2E con Playwright de CP-01 y CP-02
- [ ] Repaso final del README y de la guía de puesta en marcha
