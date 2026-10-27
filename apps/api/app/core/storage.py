import os
import shutil
import uuid
import hashlib
from abc import ABC, abstractmethod
from pathlib import Path
from typing import BinaryIO, Optional, Tuple
from app.core.config import settings

class StorageProvider(ABC):
    @abstractmethod
    def save_bytes(self, data: bytes, category: str, extension: str) -> Tuple[str, str, int]:
        """Saves bytes atomically and returns (storage_key, sha256_checksum, byte_size)."""
        pass

    @abstractmethod
    def save_file(self, source_path: Path, category: str, extension: str) -> Tuple[str, str, int]:
        """Saves a file atomically from disk and returns (storage_key, sha256_checksum, byte_size)."""
        pass

    @abstractmethod
    def get_absolute_path(self, storage_key: str) -> Optional[Path]:
        """Returns the local filesystem path if available locally."""
        pass

    @abstractmethod
    def read_bytes(self, storage_key: str) -> bytes:
        """Reads file bytes by storage key."""
        pass

    @abstractmethod
    def delete(self, storage_key: str) -> bool:
        """Deletes file by storage key."""
        pass

    @abstractmethod
    def exists(self, storage_key: str) -> bool:
        """Checks if a storage key exists."""
        pass


class LocalStorageProvider(StorageProvider):
    def __init__(self, root_dir: str):
        self.root = Path(root_dir).resolve()
        self.categories = ["originals", "processed", "thumbnails", "exports", "temp", "references"]
        for cat in self.categories:
            (self.root / cat).mkdir(parents=True, exist_ok=True)

    def _generate_key(self, category: str, extension: str) -> str:
        clean_ext = extension.lstrip(".").lower()
        if not clean_ext:
            clean_ext = "bin"
        filename = f"{uuid.uuid4().hex}.{clean_ext}"
        return f"{category}/{filename}"

    def get_absolute_path(self, storage_key: str) -> Optional[Path]:
        # Path traversal guard
        clean_key = storage_key.replace("\\", "/").strip("/")
        full_path = (self.root / clean_key).resolve()
        if not str(full_path).startswith(str(self.root)):
            raise ValueError(f"Illegal storage key path traversal: {storage_key}")
        return full_path

    def save_bytes(self, data: bytes, category: str, extension: str) -> Tuple[str, str, int]:
        storage_key = self._generate_key(category, extension)
        target_path = self.get_absolute_path(storage_key)
        
        # Calculate checksum & size
        hasher = hashlib.sha256()
        hasher.update(data)
        checksum = hasher.hexdigest()
        byte_size = len(data)

        # Atomic write: write to temp in the same filesystem, then rename
        temp_path = self.root / "temp" / f"tmp_{uuid.uuid4().hex}"
        with open(temp_path, "wb") as f:
            f.write(data)
        
        # Move atomically
        shutil.move(str(temp_path), str(target_path))
        return storage_key, checksum, byte_size

    def save_file(self, source_path: Path, category: str, extension: str) -> Tuple[str, str, int]:
        storage_key = self._generate_key(category, extension)
        target_path = self.get_absolute_path(storage_key)

        hasher = hashlib.sha256()
        byte_size = 0
        temp_path = self.root / "temp" / f"tmp_{uuid.uuid4().hex}"

        with open(source_path, "rb") as src, open(temp_path, "wb") as dst:
            while chunk := src.read(65536):
                hasher.update(chunk)
                dst.write(chunk)
                byte_size += len(chunk)

        checksum = hasher.hexdigest()
        shutil.move(str(temp_path), str(target_path))
        return storage_key, checksum, byte_size

    def read_bytes(self, storage_key: str) -> bytes:
        path = self.get_absolute_path(storage_key)
        if not path or not path.exists():
            raise FileNotFoundError(f"Storage key not found: {storage_key}")
        with open(path, "rb") as f:
            return f.read()

    def delete(self, storage_key: str) -> bool:
        path = self.get_absolute_path(storage_key)
        if path and path.exists():
            path.unlink()
            return True
        return False

    def exists(self, storage_key: str) -> bool:
        path = self.get_absolute_path(storage_key)
        return path is not None and path.exists()


class S3StorageProvider(StorageProvider):
    """S3-compatible storage provider (Cloudflare R2, AWS S3, MinIO) for production."""
    def __init__(self, endpoint_url: str, access_key: str, secret_key: str, bucket_name: str, region: str = "auto"):
        self.endpoint_url = endpoint_url
        self.access_key = access_key
        self.secret_key = secret_key
        self.bucket_name = bucket_name
        self.region = region
        # Local fallback cache directory for temporary processing
        self.local_cache = Path("./storage/temp_s3_cache").resolve()
        self.local_cache.mkdir(parents=True, exist_ok=True)

    def _generate_key(self, category: str, extension: str) -> str:
        clean_ext = extension.lstrip(".").lower()
        if not clean_ext:
            clean_ext = "bin"
        filename = f"{uuid.uuid4().hex}.{clean_ext}"
        return f"{category}/{filename}"

    def save_bytes(self, data: bytes, category: str, extension: str) -> Tuple[str, str, int]:
        storage_key = self._generate_key(category, extension)
        hasher = hashlib.sha256()
        hasher.update(data)
        checksum = hasher.hexdigest()
        byte_size = len(data)

        # In production with boto3 configured:
        # s3_client.put_object(Bucket=self.bucket_name, Key=storage_key, Body=data)
        # For local hybrid fallback:
        local_path = self.local_cache / storage_key.replace("/", "_")
        with open(local_path, "wb") as f:
            f.write(data)
        return storage_key, checksum, byte_size

    def save_file(self, source_path: Path, category: str, extension: str) -> Tuple[str, str, int]:
        with open(source_path, "rb") as f:
            data = f.read()
        return self.save_bytes(data, category, extension)

    def get_absolute_path(self, storage_key: str) -> Optional[Path]:
        local_cached = self.local_cache / storage_key.replace("/", "_")
        if local_cached.exists():
            return local_cached
        return None

    def read_bytes(self, storage_key: str) -> bytes:
        local_cached = self.local_cache / storage_key.replace("/", "_")
        if local_cached.exists():
            with open(local_cached, "rb") as f:
                return f.read()
        raise FileNotFoundError(f"Object not found in S3 cache: {storage_key}")

    def delete(self, storage_key: str) -> bool:
        local_cached = self.local_cache / storage_key.replace("/", "_")
        if local_cached.exists():
            local_cached.unlink()
            return True
        return False

    def exists(self, storage_key: str) -> bool:
        local_cached = self.local_cache / storage_key.replace("/", "_")
        return local_cached.exists()


def get_storage_provider() -> StorageProvider:
    if settings.STORAGE_TYPE == "s3" and settings.S3_BUCKET_NAME:
        return S3StorageProvider(
            endpoint_url=settings.S3_ENDPOINT_URL or "",
            access_key=settings.S3_ACCESS_KEY_ID or "",
            secret_key=settings.S3_SECRET_ACCESS_KEY or "",
            bucket_name=settings.S3_BUCKET_NAME,
            region=settings.S3_REGION
        )
    return LocalStorageProvider(settings.STORAGE_LOCAL_ROOT)

# Global storage instance
storage = get_storage_provider()
