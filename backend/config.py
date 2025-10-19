from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_title: str = "Dashboard Backend"
    version: str = "1.0.0"
    debug: bool = False
    ui_base_url: str = "http://localhost:8000"
    dadata_api_key: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
