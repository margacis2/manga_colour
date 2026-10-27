import os
import re
import zipfile
import tempfile
import io
from pathlib import Path
from typing import List, Tuple, Dict, Any, Optional
from PIL import Image, ImageOps, ImageFile
from app.core.config import settings
from app.core.storage import storage

# Configure Pillow safety limits against decompression bombs
Image.MAX_IMAGE_PIXELS = 80_000_000  # 80 megapixels max
ImageFile.LOAD_TRUNCATED_IMAGES = False

ALLOWED_IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}
ALLOWED_ARCHIVE_EXTENSIONS = {".zip", ".cbz"}

def natural_sort_key(s: str):
    """Sorts strings containing numbers in human natural order (e.g. page_1, page_2, page_10)."""
    return [int(text) if text.isdigit() else text.lower() for text in re.split(r'(\d+)', s)]

def validate_archive_safety(zip_file: zipfile.ZipFile) -> None:
    """
    Validates zip entries for:
    - Path traversal attacks (leading slashes, '..', absolute paths)
    - Decompression bomb detection (uncompressed ratio and total size)
    - Disallowed executable/binary files
    """
    total_uncompressed_size = 0
    total_file_count = 0

    for info in zip_file.infolist():
        if info.is_dir():
            continue

        filename = info.filename
        
        # Check path traversal
        normalized = os.path.normpath(filename)
        if normalized.startswith("..") or os.path.isabs(filename) or "://" in filename:
            raise ValueError(f"Unsafe file path detected in archive: {filename}")
        
        # Check extension
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            # Skip hidden files like .DS_Store, Thumbs.db, but reject executable files outright
            if ext in {".exe", ".bat", ".cmd", ".sh", ".py", ".dll", ".so", ".vbs", ".ps1"}:
                raise ValueError(f"Prohibited executable file found in archive: {filename}")
            continue

        total_file_count += 1
        total_uncompressed_size += info.file_size

        # Check single file max size
        if info.file_size > settings.MAX_UNCOMPRESSED_PAGE_SIZE_BYTES:
            raise ValueError(
                f"File {filename} exceeds maximum allowed page size ({settings.MAX_UNCOMPRESSED_PAGE_SIZE_BYTES} bytes)"
            )

    if total_file_count > settings.MAX_PAGES_PER_CHAPTER:
        raise ValueError(f"Archive contains {total_file_count} pages, exceeding limit of {settings.MAX_PAGES_PER_CHAPTER}")

    if total_uncompressed_size > settings.MAX_ARCHIVE_SIZE_BYTES:
        raise ValueError(
            f"Archive total uncompressed size ({total_uncompressed_size} bytes) exceeds safety limit ({settings.MAX_ARCHIVE_SIZE_BYTES} bytes)"
        )


def process_and_store_image(
    image_bytes: bytes, original_filename: str
) -> Tuple[str, str, int, int, str]:
    """
    Validates image integrity with Pillow, normalizes orientation,
    generates a thumbnail, saves both to storage atomically.
    Returns: (original_storage_key, checksum, width, height, thumbnail_storage_key)
    """
    # Verify image integrity
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            img.verify()
    except Exception as e:
        raise ValueError(f"Corrupted or invalid image file {original_filename}: {str(e)}")

    # Re-open for actual reading (verify() invalidates image object)
    with Image.open(io.BytesIO(image_bytes)) as img:
        # Normalize orientation using EXIF if present
        try:
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass

        width, height = img.size
        if width > settings.MAX_IMAGE_DIMENSION or height > settings.MAX_IMAGE_DIMENSION:
            raise ValueError(
                f"Image dimensions {width}x{height} exceed maximum permitted limit of {settings.MAX_IMAGE_DIMENSION}px"
            )

        # Generate thumbnail
        thumb = img.copy()
        thumb.thumbnail((360, 500), Image.Resampling.LANCZOS)
        if thumb.mode in ("RGBA", "P"):
            thumb = thumb.convert("RGB")
        
        thumb_buffer = io.BytesIO()
        thumb.save(thumb_buffer, format="JPEG", quality=85, optimize=True)
        thumb_bytes = thumb_buffer.getvalue()

    # Save original to storage
    ext = Path(original_filename).suffix.lower()
    if ext not in ALLOWED_IMAGE_EXTENSIONS:
        ext = ".png"
    
    orig_key, orig_checksum, _ = storage.save_bytes(image_bytes, "originals", ext)
    thumb_key, _, _ = storage.save_bytes(thumb_bytes, "thumbnails", ".jpg")

    return orig_key, orig_checksum, width, height, thumb_key


def extract_archive_pages(archive_bytes: bytes) -> List[Dict[str, Any]]:
    """
    Extracts, orders, and safely stores all valid manga pages from an archive.
    Returns list of dicts with page metadata.
    """
    with zipfile.ZipFile(io.BytesIO(archive_bytes)) as zf:
        validate_archive_safety(zf)

        # Collect and naturally sort image filenames
        image_entries = [
            info for info in zf.infolist()
            if not info.is_dir() and Path(info.filename).suffix.lower() in ALLOWED_IMAGE_EXTENSIONS
            and not Path(info.filename).name.startswith(".")
        ]

        # Natural sort on filename
        image_entries.sort(key=lambda info: natural_sort_key(Path(info.filename).name))

        pages_data = []
        for index, entry in enumerate(image_entries, start=1):
            with zf.open(entry) as f:
                img_bytes = f.read()
            
            orig_name = Path(entry.filename).name
            orig_key, checksum, width, height, thumb_key = process_and_store_image(
                img_bytes, orig_name
            )

            pages_data.append({
                "page_number": index,
                "original_filename": orig_name,
                "original_file_path": orig_key,
                "original_checksum": checksum,
                "original_width": width,
                "original_height": height,
                "thumbnail_path": thumb_key,
            })

        return pages_data
