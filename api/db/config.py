from functools import lru_cache
from pathlib import Path
from typing import Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application-level configuration for storage and security."""

    storage_root: Path = Field(default=Path("storage"))
    templates_dir: Path = Field(default=Path("samples"))
    temp_root: Path = Field(default=Path("storage/temp"))
    database_filename: str = Field(default="auditoria.db")
    max_zip_size_mb: int = Field(default=100, ge=1)
    audit_token: Optional[str] = None

    model_config = SettingsConfigDict(
        env_prefix="AUDIT_",
        env_file=".env",
        env_file_encoding="utf-8",
    )

    @property
    def database_path(self) -> Path:
        return self.storage_root / self.database_filename

    @property
    def database_url(self) -> str:
        return f"sqlite:///{self.database_path}"

    @property
    def processing_dir(self) -> Path:
        return self.storage_root / "processing"

    @property
    def results_dir(self) -> Path:
        return self.storage_root / "results"

    @property
    def exports_dir(self) -> Path:
        return self.storage_root / "exports"

    @property
    def static_root(self) -> Path:
        return self.storage_root / "public"


@lru_cache
def get_settings() -> Settings:
    return Settings()
