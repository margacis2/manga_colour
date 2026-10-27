import io
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.storage import storage
from app.models.entities import Page, PageAnnotation, User
from app.schemas.schemas import PageResponse, PageApprovalUpdate, PageAnnotationUpdate
from app.api.deps import get_current_user

router = APIRouter(prefix="/pages", tags=["Pages"])

@router.get("/{page_id}", response_model=PageResponse)
def get_page_details(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    return page

@router.get("/{page_id}/original")
def get_original_image(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Streams the pristine original manga page image."""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    local_path = storage.get_absolute_path(page.original_file_path)
    if local_path and local_path.exists():
        media_type = "image/png" if local_path.suffix.lower() == ".png" else "image/jpeg"
        return FileResponse(local_path, media_type=media_type)
    
    # Read bytes via storage provider
    try:
        data = storage.read_bytes(page.original_file_path)
        return StreamingResponse(io.BytesIO(data), media_type="image/png")
    except Exception:
        raise HTTPException(status_code=404, detail="Image file not found on storage")

@router.get("/{page_id}/processed")
def get_processed_image(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Streams the AI colorized page image, or falls back to original if not yet colorized."""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    path_to_use = page.current_output_path or page.original_file_path
    local_path = storage.get_absolute_path(path_to_use)
    if local_path and local_path.exists():
        media_type = "image/png" if local_path.suffix.lower() == ".png" else "image/jpeg"
        return FileResponse(local_path, media_type=media_type)
    
    try:
        data = storage.read_bytes(path_to_use)
        return StreamingResponse(io.BytesIO(data), media_type="image/png")
    except Exception:
        raise HTTPException(status_code=404, detail="Image file not found on storage")

@router.get("/{page_id}/thumbnail")
def get_page_thumbnail(
    page_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Streams the cached thumbnail image."""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page or not page.thumbnail_path:
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    local_path = storage.get_absolute_path(page.thumbnail_path)
    if local_path and local_path.exists():
        return FileResponse(local_path, media_type="image/jpeg")
    
    try:
        data = storage.read_bytes(page.thumbnail_path)
        return StreamingResponse(io.BytesIO(data), media_type="image/jpeg")
    except Exception:
        raise HTTPException(status_code=404, detail="Thumbnail file not found on storage")

@router.patch("/{page_id}/approval", response_model=PageResponse)
def update_page_approval(
    page_id: str,
    update: PageApprovalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Marks a page as approved or unapproved by the artist."""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    page.approved = update.approved
    db.commit()
    db.refresh(page)
    return page

@router.post("/{page_id}/annotation")
def save_page_annotation(
    page_id: str,
    annotation_in: PageAnnotationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Persists manual canvas edits, brush strokes, and notes for a page."""
    page = db.query(Page).filter(Page.id == page_id).first()
    if not page:
        raise HTTPException(status_code=404, detail="Page not found")
    
    annotation = db.query(PageAnnotation).filter(PageAnnotation.page_id == page_id).first()
    if not annotation:
        annotation = PageAnnotation(page_id=page_id)
        db.add(annotation)
    
    if annotation_in.character_id is not None:
        annotation.character_id = annotation_in.character_id
    if annotation_in.manual_edits_json is not None:
        annotation.manual_edits_json = annotation_in.manual_edits_json
    if annotation_in.notes is not None:
        annotation.notes = annotation_in.notes
        
    db.commit()
    return {"status": "success", "annotation_id": annotation.id}
