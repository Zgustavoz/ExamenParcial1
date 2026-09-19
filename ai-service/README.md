# ai-service — Copilot IA

FastAPI + Pydantic. Traduce instrucciones en lenguaje natural a **operaciones de diagrama** y deriva
diagramas de secuencia. Es un servicio **interno**: solo lo consume el backend por la red de Docker y
Nginx no lo proxifica.

## Requisitos

- Python 3.11+
- Un proveedor LLM: OpenAI o un servidor local compatible con la API de chat-completions
  (Ollama, vLLM, LM Studio…). El proveedor se elige con `LLM_PROVIDER` y **ningún modelo está fijado en
  el código**: se configura con `LLM_MODEL`.

## Configuración

Las variables salen del `.env` de la raíz del repositorio (`AI_INTERNAL_KEY`, `LLM_PROVIDER`, `LLM_API_KEY`,
`LLM_MODEL`, `LLM_BASE_URL`, `LLM_TIMEOUT_SECONDS`). Sin `AI_INTERNAL_KEY` el servicio rechaza todas las
peticiones: falla cerrado.

`LLM_TIMEOUT_SECONDS` debe ser **menor** que el `AI_TIMEOUT_SECONDS` del backend, para que el backend
reciba un 504 controlado en vez de cortar por su cuenta.

## Ejecutar y probar

```bash
python -m venv .venv && .venv/Scripts/activate     # Linux/macOS: source .venv/bin/activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --port 8000          # desarrollo
pytest                                             # 52 pruebas, sin llamadas reales al LLM
```

```bash
curl http://localhost:8000/health
```

## API

Todos los endpoints salvo `/health` exigen la cabecera `X-Internal-Key`.

### `POST /v1/interpret`

```json
{ "instruction": "agrega una clase Cliente con nombre y email",
  "inputType": "TEXTO",
  "contentJson": { "schemaVersion": 1, "type": "CLASS", "classes": [], "relationships": [] },
  "history": [{ "role": "user", "content": "..." }] }
```

Respuesta: `{ "explanation": "...", "operations": [ ... ] }`. Las operaciones usan el vocabulario compartido
y referencian las clases **por nombre**; el backend las resuelve a `id`.

### `POST /v1/sequence`

Entrada `{ "contentJson": { ... } }` → `{ "lifelines": [...], "messages": [...] }`. El prompt pide preferir
nombres de métodos que existan en las clases.

## Códigos de error

| HTTP | Situación | Lo traduce el backend a |
|---|---|---|
| 504 | el proveedor LLM no respondió a tiempo | `AI_TIMEOUT` |
| 503 | proveedor caído, sin credenciales o sin cuota | `AI_UNAVAILABLE` |
| 502 | el LLM no devolvió un JSON válido tras el reintento | `AI_INVALID_RESPONSE` |
| 401 | `X-Internal-Key` ausente o incorrecta | — |
| 422 | la petición del backend no cumple el esquema | — |

## Decisiones de implementación

- **La salida se valida con Pydantic** contra el vocabulario de operaciones antes de responder. Si el JSON
  es inválido se reintenta **una vez** recordándole el formato al modelo; si vuelve a fallar → 502.
  Un fallo del proveedor (timeout, caída) **no** se reintenta.
- **El diagrama y la instrucción del usuario son datos, no instrucciones.** Van dentro de `<diagram_json>`
  y `<user_instruction>`, y se escapan los cierres de esas etiquetas para que el contenido no pueda
  hacerse pasar por instrucciones del sistema.
- **No se registran en log** ni las instrucciones ni el contenido de los diagramas.
- El backend **revalida** todo lo que devuelve este servicio: una respuesta maliciosa o incoherente no
  puede corromper un diagrama.
