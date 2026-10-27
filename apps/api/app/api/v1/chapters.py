import io
from typing import List, Optional
from pathlib import Path
from PIL import Image
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.storage import storage
from app.models.entities import Chapter, Project, Page, User
from app.schemas.schemas import (
    ChapterCreate, 
    ChapterUpdate, 
    ChapterDetailResponse, 
    PageResponse,
    StorageStatsResponse,
    OptimizeStorageRequest,
    OptimizeStorageResult
)
from app.api.deps import get_current_user
from app.services.archive_service import (
    extract_archive_pages,
    process_and_store_image,
    ALLOWED_IMAGE_EXTENSIONS,
    ALLOWED_ARCHIVE_EXTENSIONS
)

router = APIRouter(prefix="/chapters", tags=["Chapters"])

@router.post("/project/{project_id}", response_model=ChapterDetailResponse, status_code=status.HTTP_201_CREATED)
def create_chapter(
    project_id: str,
    chapter_in: ChapterCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_admin and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    chapter = Chapter(
        project_id=project_id,
        chapter_number=chapter_in.chapter_number,
        title=chapter_in.title,
        sequence_order=chapter_in.sequence_order
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter

@router.get("/{chapter_id}", response_model=ChapterDetailResponse)
def get_chapter(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if not current_user.is_admin and chapter.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    return chapter

@router.post("/{chapter_id}/import-archive", response_model=ChapterDetailResponse)
async def import_archive_to_chapter(
    chapter_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Imports a CBZ or ZIP archive into a chapter.
    Safely validates against path traversal, zip bombs, and extracts in natural page order.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if not current_user.is_admin and chapter.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    filename = file.filename or "chapter.zip"
    ext = Path(filename).suffix.lower()
    if ext not in ALLOWED_ARCHIVE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid file extension {ext}. Allowed: {', '.join(ALLOWED_ARCHIVE_EXTENSIONS)}"
        )
    
    content = await file.read()
    try:
        pages_metadata = extract_archive_pages(content)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Archive validation/extraction failed: {str(e)}")

    if not pages_metadata:
        raise HTTPException(status_code=400, detail="No valid manga images found inside the archive")

    # Get current max page number in chapter to append cleanly
    current_max_page = db.query(Page).filter(Page.chapter_id == chapter_id).count()

    new_pages = []
    for meta in pages_metadata:
        current_max_page += 1
        page = Page(
            chapter_id=chapter_id,
            page_number=current_max_page,
            original_filename=meta["original_filename"],
            original_file_path=meta["original_file_path"],
            original_checksum=meta["original_checksum"],
            original_width=meta["original_width"],
            original_height=meta["original_height"],
            thumbnail_path=meta["thumbnail_path"],
            processing_status="pending"
        )
        db.add(page)
        new_pages.append(page)

    # Update chapter page count
    chapter.page_count += len(new_pages)
    
    # If project has no cover, use first page thumbnail
    if not chapter.project.cover_page_id and new_pages:
        chapter.project.cover_page_id = new_pages[0].id

    db.commit()
    db.refresh(chapter)
    return chapter

@router.post("/{chapter_id}/import-images", response_model=ChapterDetailResponse)
async def import_individual_images(
    chapter_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Imports one or more individual image files (PNG, JPG, WebP) into a chapter."""
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if not current_user.is_admin and chapter.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    current_max_page = db.query(Page).filter(Page.chapter_id == chapter_id).count()

    added_count = 0
    for file in files:
        filename = file.filename or "page.png"
        ext = Path(filename).suffix.lower()
        if ext not in ALLOWED_IMAGE_EXTENSIONS:
            continue
        
        content = await file.read()
        try:
            orig_key, orig_checksum, width, height, thumb_key = process_and_store_image(
                content, filename
            )
        except Exception as e:
            continue
        
        current_max_page += 1
        page = Page(
            chapter_id=chapter_id,
            page_number=current_max_page,
            original_filename=filename,
            original_file_path=orig_key,
            original_checksum=orig_checksum,
            original_width=width,
            original_height=height,
            thumbnail_path=thumb_key,
            processing_status="pending"
        )
        db.add(page)
        added_count += 1

    chapter.page_count += added_count
    db.commit()
    db.refresh(chapter)
    return chapter

@router.delete("/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_chapter(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if not current_user.is_admin and chapter.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    db.delete(chapter)
    db.commit()
    return None

@router.get("/{chapter_id}/storage-stats", response_model=StorageStatsResponse)
def get_chapter_storage_stats(
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes disk usage for chapter: original scans vs colorized processed outputs.
    Estimates potential savings from lossless/balanced WebP compression.
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")

    orig_bytes = 0
    proc_bytes = 0
    colorized_count = 0

    for page in chapter.pages:
        # Original size
        if page.original_file_path:
            p_orig = storage.get_absolute_path(page.original_file_path)
            if p_orig and p_orig.exists():
                orig_bytes += p_orig.stat().st_size

        # Processed size
        if page.current_output_path:
            colorized_count += 1
            p_proc = storage.get_absolute_path(page.current_output_path)
            if p_proc and p_proc.exists():
                proc_bytes += p_proc.stat().st_size

    total_bytes = orig_bytes + proc_bytes
    # Potential savings: ~45% of processed files can typically be saved via WebP
    potential_savings = int(proc_bytes * 0.45)
    savings_pct = (potential_savings / total_bytes * 100.0) if total_bytes > 0 else 0.0

    return StorageStatsResponse(
        chapter_id=chapter.id,
        project_id=chapter.project_id,
        total_pages=len(chapter.pages),
        colorized_pages=colorized_count,
        originals_size_bytes=orig_bytes,
        processed_size_bytes=proc_bytes,
        total_size_bytes=total_bytes,
        potential_savings_bytes=potential_savings,
        savings_percent=round(savings_pct, 1)
    )

@router.post("/{chapter_id}/optimize", response_model=OptimizeStorageResult)
def optimize_chapter_storage(
    chapter_id: str,
    req: OptimizeStorageRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Optimizes processed colorized output files for the chapter using WebP.
    PRESERVES ORIGINAL MANGA SCANS INTACT (originals are never touched).
    """
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if not chapter:
        raise HTTPException(status_code=404, detail="Chapter not found")
    if not current_user.is_admin and chapter.project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    pages_optimized = 0
    before_bytes = 0
    after_bytes = 0

    # Determine WebP quality & max dimension
    preset = req.preset.lower()
    if preset == "small":
        webp_quality = 65
        max_dim = 1200
    elif preset == "high":
        webp_quality = 90
        max_dim = None
    else:  # balanced
        webp_quality = 80
        max_dim = 1800

    for page in chapter.pages:
        if not page.current_output_path:
            continue

        orig_proc_path = storage.get_absolute_path(page.current_output_path)
        if not orig_proc_path or not orig_proc_path.exists():
            continue

        old_file_size = orig_proc_path.stat().st_size
        before_bytes += old_file_size

        try:
            # Read and optimize
            raw_bytes = storage.read_bytes(page.current_output_path)
            img = Image.open(io.BytesIO(raw_bytes))

            if img.mode != "RGB":
                img = img.convert("RGB")

            if max_dim:
                w, h = img.size
                if max(w, h) > max_dim:
                    ratio = max_dim / max(w, h)
                    img = img.resize((int(w * ratio), int(h * ratio)), Image.Resampling.LANCZOS)

            buf = io.BytesIO()
            img.save(buf, format="WEBP", quality=webp_quality, method=6)
            new_bytes = buf.getvalue()
            new_file_size = len(new_bytes)

            # Only replace if smaller or format converted
            if new_file_size < old_file_size or not page.current_output_path.endswith(".webp"):
                old_key = page.current_output_path
                new_key, new_checksum, _ = storage.save_bytes(new_bytes, "processed", ".webp")
                
                # Delete old processed file safely
                try:
                    storage.delete(old_key)
                except Exception:
                    pass

                page.current_output_path = new_key
                page.current_output_checksum = new_checksum
                pages_optimized += 1
                after_bytes += new_file_size
            else:
                after_bytes += old_file_size
        except Exception:
            after_bytes += old_file_size
            continue

    db.commit()

    saved = max(0, before_bytes - after_bytes)
    pct = (saved / before_bytes * 100.0) if before_bytes > 0 else 0.0

    return OptimizeStorageResult(
        pages_optimized=pages_optimized,
        before_bytes=before_bytes,
        after_bytes=after_bytes,
        bytes_saved=saved,
        percent_saved=round(pct, 1)
    )

