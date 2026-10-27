import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

    APP_NAME: str = "Blue Box Color Studio"
    APP_VERSION: str = "1.2.1"
    APP_MODE: str = "local"  # local | production | hybrid
    DEBUG: bool = True
    SECRET_KEY: str = "dev-secret-change-in-production-blue-box-studio-secret-key-32chars"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    API_PORT: int = 8000
    API_HOST: str = "127.0.0.1"
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
        "http://127.0.0.1:8000"
    ]

    # Database
    DATABASE_URL: str = "sqlite:///./data/bluebox.db"

    # Storage
    STORAGE_TYPE: str = "local"  # local | s3
    STORAGE_LOCAL_ROOT: str = "./storage"
    S3_ENDPOINT_URL: str | None = None
    S3_ACCESS_KEY_ID: str | None = None
    S3_SECRET_ACCESS_KEY: str | None = None
    S3_BUCKET_NAME: str | None = None
    S3_REGION: str = "auto"

    # Processing & hardware defaults
    DEFAULT_PROVIDER: str = "local_gpu"  # local_gpu | local_cpu | colab | remote_worker
    FALLBACK_TO_CPU: bool = True
    MAX_VRAM_GB: float = 4.0
    MAX_BATCH_SIZE: int = 4
    WORKER_CONCURRENCY: int = 1
    WORKER_POLL_INTERVAL_SECONDS: float = 1.0

    # Remote worker token
    WORKER_SECRET_TOKEN: str | None = None

    # Archive safety limits
    MAX_ARCHIVE_SIZE_BYTES: int = 500 * 1024 * 1024  # 500 MB
    MAX_UNCOMPRESSED_PAGE_SIZE_BYTES: int = 30 * 1024 * 1024  # 30 MB per image
    MAX_IMAGE_DIMENSION: int = 10000  # Max 10,000 px dimension
    MAX_PAGES_PER_CHAPTER: int = 500

settings = Settings()
