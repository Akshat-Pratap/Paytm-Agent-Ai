"""LLM abstraction: demo (deterministic) | gemini | openai-compatible | ollama.
Core financial safety rules NEVER depend on the LLM output."""
import json
import httpx
from .config import settings


class LLMService:
    """Read settings per-call so env changes take effect without reimport."""

    @classmethod
    def _cfg(cls):
        from .config import settings as _s
        return _s.AI_MODE, _s.LLM_PROVIDER, _s.LLM_API_KEY

    @classmethod
    def enhance(cls, agent_name: str, prompt: str, fallback: dict) -> dict:
        """Return structured reasoning. In demo mode returns fallback + note.
        In live mode attempts provider call, validates JSON, else falls back.
        LLM output is narrative-only: numeric decisions in fallback are preserved."""
        mode, provider, api_key = cls._cfg()
        if mode == "demo" or provider == "demo" or not api_key:
            out = dict(fallback)
            out["_llm"] = {"provider": "demo", "note": "deterministic demo reasoning"}
            return out
        try:
            if provider == "gemini":
                return cls._call_gemini(prompt, fallback)
            elif provider in ("openai", "ollama"):
                return cls._call_openai_compatible(prompt, fallback)
        except Exception as e:
            out = dict(fallback)
            out["_llm"] = {"provider": provider, "error": str(e)[:300], "fallback": True}
            return out
        out = dict(fallback)
        out["_llm"] = {"provider": provider, "fallback": True}
        return out

    @classmethod
    def _call_gemini(cls, prompt: str, fallback: dict) -> dict:
        _, _, api_key = cls._cfg()
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.LLM_MODEL}:generateContent?key={api_key}"
        body = {"contents": [{"parts": [{"text": prompt + "\nRespond with JSON only."}]}]}
        r = httpx.post(url, json=body, timeout=15)
        r.raise_for_status()
        data = r.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
        out = dict(fallback)
        # Preserve deterministic financial fields; only attach narrative keys
        narrative = {k: v for k, v in parsed.items() if k not in fallback}
        out["_llm"] = {"provider": "gemini", "raw_keys": list(parsed.keys()), "narrative_keys": list(narrative.keys())}
        out.update({k: v for k, v in narrative.items() if isinstance(v, (str, int, float, list))})
        return out

    @classmethod
    def _call_openai_compatible(cls, prompt: str, fallback: dict) -> dict:
        _, provider, api_key = cls._cfg()
        base = settings.LLM_BASE_URL or "http://localhost:11434/v1"
        url = base.rstrip("/") + "/chat/completions"
        headers = {"Authorization": f"Bearer {api_key}"} if api_key else {}
        body = {"model": settings.LLM_MODEL or "llama3",
                "messages": [{"role": "user", "content": prompt + "\nRespond with JSON only."}]}
        r = httpx.post(url, json=body, headers=headers, timeout=20)
        r.raise_for_status()
        text = r.json()["choices"][0]["message"]["content"]
        parsed = json.loads(text[text.find("{"): text.rfind("}") + 1])
        out = dict(fallback)
        narrative = {k: v for k, v in parsed.items() if k not in fallback}
        out["_llm"] = {"provider": provider, "raw_keys": list(parsed.keys()), "narrative_keys": list(narrative.keys())}
        out.update({k: v for k, v in narrative.items() if isinstance(v, (str, int, float, list))})
        return out
