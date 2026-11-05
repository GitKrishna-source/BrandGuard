from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BrandGuard API"
    app_env: str = "development"
    database_url: str = "sqlite:///./brandguard.db"
    frontend_origin: str = "http://localhost:3000"
    auth_secret: str = "development-only-change-this-secret"
    access_token_expire_minutes: int = 30
    demo_login_enabled: bool = True
    max_upload_bytes: int = 10_000_000
    ai_provider: Literal["groq", "gemini", "local"] = "groq"
    groq_api_key: str | None = None
    groq_model: str = "qwen/qwen3.8-27b"
    groq_vision_model: str = "qwen/qwen3.8-27b"
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-flash-lite-latest"
    auth_users_json: str = '{"creator":{"username":"creator@brandguard.local","password":"creator-demo","role":"creator"},"manager":{"username":"manager@brandguard.local","password":"manager-demo","role":"manager"},"legal":{"username":"legal@brandguard.local","password":"legal-demo","role":"legal"}}'

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        case_sensitive=False,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
