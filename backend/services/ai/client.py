import hashlib
import threading
from typing import Any

import httpx

from db.config import GOOGLE_KEY_FILE, app_config, config_float, parse_key_list

class GoogleAIError(Exception):
    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message

class GoogleKeyPool:
    def __init__(self) -> None:
        self._index = 0
        self._lock = threading.Lock()

    def next_key(self, keys: list[str]) -> tuple[str, int]:
        if not keys:
            raise ValueError("Missing Google Gemini API key. Set GOOGLE_API_KEYS, GOOGLE_API_KEY, or backend/data/google_api_keys.txt.")
        with self._lock:
            key_index = self._index % len(keys)
            self._index = (self._index + 1) % len(keys)
        return keys[key_index], key_index


google_key_pool = GoogleKeyPool()


def secret_fingerprint(value: str) -> str:
    return hashlib.sha256(value.encode("utf-8")).hexdigest()[:12]


def _dedupe_keys(keys: list[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for key in keys:
        cleaned = key.strip()
        if not cleaned or cleaned in seen:
            continue
        seen.add(cleaned)
        result.append(cleaned)
    return result


def load_google_api_keys() -> list[str]:
    keys: list[str] = []
    for name in ["GOOGLE_API_KEYS", "GEMINI_API_KEYS", "GOOGLE_API_KEY", "GEMINI_API_KEY"]:
        keys.extend(parse_key_list(app_config(name)))
    if GOOGLE_KEY_FILE.exists():
        for line in GOOGLE_KEY_FILE.read_text(encoding="utf-8", errors="ignore").splitlines():
            cleaned = line.strip()
            if cleaned and not cleaned.startswith("#"):
                keys.append(cleaned)
    return _dedupe_keys(keys)


def google_key_status() -> dict[str, Any]:
    keys = load_google_api_keys()
    return {
        "enabled": bool(keys),
        "provider": "google_gemini",
        "key_configured": bool(keys),
        "configured_keys": len(keys),
        "key_fingerprints": [secret_fingerprint(key) for key in keys],
    }


def google_ai_endpoint() -> str:
    return app_config("GOOGLE_AI_ENDPOINT", "https://generativelanguage.googleapis.com/v1beta").rstrip("/")

def get_google_api_key() -> tuple[str, int]:
    return google_key_pool.next_key(load_google_api_keys())

def validate_model(model: str) -> str:
    # Only allow 2.5-flash or 1.5-pro for reliability
    allowed = ["gemini-2.5-flash", "gemini-1.5-pro", "gemini-1.5-flash"]
    if model not in allowed:
        return "gemini-2.5-flash"
    return model

def post_google_generate_content(api_key: str, model: str, prompt: str, temperature: float = 0.2) -> dict[str, Any]:
    valid_model = validate_model(model)
    url = f"{google_ai_endpoint()}/models/{valid_model}:generateContent"
    
    body = {
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": 1200,
            "responseMimeType": "application/json",
        },
    }
    try:
        response = httpx.post(
            url,
            headers={"x-goog-api-key": api_key, "Content-Type": "application/json"},
            json=body,
            timeout=config_float("GOOGLE_AI_TIMEOUT_SECONDS", 30, minimum=3, maximum=120),
        )
    except httpx.HTTPError as exc:
        raise GoogleAIError(0, str(exc)) from exc
    
    if response.status_code >= 400:
        message = response.text[:240] if response.text else response.reason_phrase
        raise GoogleAIError(response.status_code, message)
        
    return response.json()
