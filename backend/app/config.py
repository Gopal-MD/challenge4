"""Application configuration using Pydantic Settings."""
from pydantic_settings import BaseSettings
from pydantic import field_validator


class Settings(BaseSettings):
    """All configuration loaded from environment variables or .env file."""

    # Google Cloud
    google_cloud_project: str = ""
    google_maps_api_key: str = ""
    vertex_ai_location: str = "us-central1"

    # Firestore
    use_real_firestore: bool = False

    # App
    log_level: str = "INFO"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:5174"]

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: str | list) -> list[str]:
        if isinstance(v, str):
            return [origin.strip() for origin in v.split(",")]
        return v

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
