from __future__ import annotations

import os
from functools import lru_cache
from typing import List

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="FS_",
        env_file=".env",
        extra="ignore",
    )

    result_base_dir_path: str = Field(
        default_factory=lambda: os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    )
    port: int = 5000
    secret_key: str = "put_your_high_secured_secret_here" #not a real secret
    cors_origins: List[str] = Field(default_factory=lambda: ["*"])
    allow_registrations: bool = True
    allow_delete: bool = True
    enable_api_keys: bool = True
    supported_file_extension: List[str] = Field(default_factory=list)
    non_supported_file_extension: List[str] = Field(default_factory=list)
    database_url: str = ""
    data_retention_days: int = 0
    cleanup_interval_hours: int = 24
    cleanup_exclude_dirs: List[str] = Field(default_factory=list)

    def resolved_database_url(self) -> str:
        if self.database_url:
            return self.database_url
        package_dir = os.path.dirname(os.path.abspath(__file__))
        db_path = os.path.join(package_dir, "site.db")
        if not os.path.exists(db_path):
            db_path = os.path.join(self.result_base_dir_path, "site.db")
        return "sqlite:///" + db_path


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
