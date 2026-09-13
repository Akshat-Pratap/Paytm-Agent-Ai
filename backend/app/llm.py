"""LLM abstraction: demo (deterministic) | gemini | openai-compatible | ollama.
Core financial safety rules NEVER depend on the LLM output."""
import json
import httpx
from .config import settings


class LLMService:
    provider = settings.LLM_PROVIDER
    mode = settings.AI_MODE

    @classmethod
    def enhance(cls, agent_name: str, prompt: str, fallback: dict) -> dict:
        """Return structured reasoning. In demo mode returns fallback + note.
        In live mode attempts provider call, validates JSON, else falls back."""
        if cls.mode == "demo" or cls.provider == "demo" or not settings.LLM_API_KEY:
            out = dict(fallback)
            out["_llm"] = {"provider": "demo", "note": "deterministic demo reasoning"}
            return out
        try:
            if cls.provider == "gemini":
                return cls._call_gemini(prompt, fallback)
            elif cls.provider in ("openai", "ollama"):
                return cls._call_openai_compatible(prompt, fallback)
        except Exception as e:
            out = dict(fallback)
            out["_llm"] = {"provider": cls.provider, "error": str(e)[:300], "fallback": True}
            return out
        out = dict(fallback)
        out["_llm"] = {"provider": cls.provider, "fallback": True}
        return out

    @classmethod
    def _call_gemini(cls, prompt: str, fallback: dict) -> dict:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={settings.LLM_API_KEY}"
        body = {"contents": [{"parts": [{"text": prompt + "\nRespond with JSON only."}]}]}
        r = httpx.post(url, json=body, timeout=15)
        r.raise_for_status()
        data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
        out = dict(fallback)
        out["_llm"] = {"provider": "gemini", "raw_keys": list(parsed.keys())}
        return out

    @classmethod
    def _call_openai_compatible(cls, prompt: str, fallback: dict) -> dict:
        base = settings.LLM_BASE_URL or "http://localhost:11434/v1"
        url = base.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {settings.LLM_API_KEY}"} if settings.LLM_API_KEY else {}
        body = {"model": settings.LLM_MODEL or "llama3",
                "messages": [{"role": "user", "content": prompt + "\nRespond with JSON only."}]}
        r = httpx.post(url, json=body, headers=headers, timeout=20)
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
        out = dict(fallback)
        out["_llm"] = {"provider": cls.provider, "raw_keys": list(parsed.keys())}
        return out
