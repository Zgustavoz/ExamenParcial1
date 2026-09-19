"""Proveedores LLM sobre la API de chat-completions (OpenAI o un LLM local compatible: Ollama, vLLM, LM Studio...)."""

import logging

import httpx

from .base import LlmTimeout, LlmUnavailable

log = logging.getLogger(__name__)


class OpenAICompatibleProvider:
    def __init__(
        self,
        *,
        base_url: str,
        model: str,
        api_key: str = "",
        timeout: float = 25.0,
        json_mode: bool = True,
        client: httpx.Client | None = None,
    ) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.api_key = api_key
        self.timeout = timeout
        self.json_mode = json_mode
        self._client = client or httpx.Client(timeout=timeout)

    def complete(self, system: str, messages: list[dict]) -> str:
        if not self.model:
            raise LlmUnavailable("LLM_MODEL no está configurado")
        payload: dict = {
            "model": self.model,
            "messages": [{"role": "system", "content": system}, *messages],
            "temperature": 0.2,
        }
        if self.json_mode:
            payload["response_format"] = {"type": "json_object"}
        headers = {"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
        try:
            response = self._client.post(
                f"{self.base_url}/chat/completions", json=payload, headers=headers, timeout=self.timeout
            )
        except httpx.TimeoutException as exc:
            raise LlmTimeout("El proveedor LLM no respondió a tiempo") from exc
        except httpx.HTTPError as exc:
            raise LlmUnavailable("No se pudo contactar al proveedor LLM") from exc

        if response.status_code in (408, 504):
            raise LlmTimeout("El proveedor LLM no respondió a tiempo")
        if response.status_code >= 400:
            # 401/403 (clave inválida), 429 (cuota) y 5xx se tratan como servicio no disponible.
            log.warning("El proveedor LLM respondió HTTP %s", response.status_code)
            raise LlmUnavailable(f"El proveedor LLM respondió HTTP {response.status_code}")
        try:
            return response.json()["choices"][0]["message"]["content"] or ""
        except (ValueError, KeyError, IndexError, TypeError) as exc:
            raise LlmUnavailable("Respuesta inesperada del proveedor LLM") from exc
