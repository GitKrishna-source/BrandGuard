from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "BrandGuard API"
    app_env: str = "development"
    database_url: str = "sqlite:///./brandguard.db"
    frontend_origin: str = "http://localhost:3000"
    auth_secret: str = "development-only-change-this-secret"
    access_token_expire_minutes: int = 30
    max_upload_bytes: int = 10_000_000
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"
    auth_users_json: str = '{"creator":{"username":"creator@brandguard.local","password":"creator-demo","role":"creator"},"manager":{"username":"manager@brandguard.local","password":"manager-demo","role":"manager"},"legal":{"username":"legal@brandguard.local","password":"legal-demo","role":"legal"}}'

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False, extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()
