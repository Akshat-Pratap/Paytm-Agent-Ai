"""Central configuration — env-driven with demo defaults."""
import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "Autonomous Resolution Hub"
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./resolution_hub.db")
    AI_MODE: str = os.getenv("AI_MODE", "demo")  # demo | live
    LLM_PROVIDER: str = os.getenv("LLM_PROVIDER", "demo")  # demo | gemini | openai | ollama
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", "")
    LLM_MODEL: str = os.getenv("LLM_MODEL", "gemini-1.5-flash")
    LLM_BASE_URL: str = os.getenv("LLM_BASE_URL", "")
    AUTO_REFUND_LIMIT: float = float(os.getenv("AUTO_REFUND_LIMIT", "25000"))
    MAX_REFUND_RETRIES: int = int(os.getenv("MAX_REFUND_RETRIES", "2"))
    AGENT_STEP_DELAY: float = float(os.getenv("AGENT_STEP_DELAY", "0.35"))
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
    JWT_SECRET: str = os.getenv("JWT_SECRET", "dev-secret-change-me")
    JWT_EXPIRE_HOURS: int = int(os.getenv("JWT_EXPIRE_HOURS", "168"))  # 7 days
    ADMIN_USERNAME: str = os.getenv("ADMIN_USERNAME", "ADMIN")
    ADMIN_PASSWORD_HASH: str = os.getenv("ADMIN_PASSWORD_HASH", "")  # bcrypt of 123456 if empty fallback in code

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
