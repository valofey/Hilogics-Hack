from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    app_title: str = "Dashboard Backend"
    version: str = "1.0.0"
    debug: bool = False
    base_url: str = "http://localhost:8000"

    class Config:
        env_file = ".env"


settings = Settings()
