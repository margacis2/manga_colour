import io
import zipfile
from pathlib import Path
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse, StreamingResponse
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.storage import storage
from app.models.entities import Chapter, Project, Page, ExportJob, User
from app.schemas.schemas import ExportCreate, ExportJobResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/exports", tags=["Export"])

@router.post("", response_model=ExportJobResponse, status_code=status.HTTP_201_CREATED)
def create_export_job(
    export_in: ExportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == export_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    chapter = None
    if export_in.chapter_id:
        chapter = db.query(Chapter).filter(Chapter.id == export_in.chapter_id).first()
        if not chapter:
            raise HTTPException(status_code=404, detail="Chapter not found")

    # Fetch pages to bundle
    pages_query = db.query(Page).join(Chapter).filter(Chapter.project_id == export_in.project_id)
    if export_in.chapter_id:
        pages_query = pages_query.filter(Page.chapter_id == export_in.chapter_id)
    
    pages = pages_query.order_by(Page.chapter_id, Page.page_number).all()
    if not pages:
        raise HTTPException(status_code=400, detail="No pages available for export")

    export_format = export_in.format.lower()
    
    if export_format == "pdf":
        from app.services.pdf_export_service import PDFExportService
        image_bytes_list: list[bytes] = []
        for p in pages:
            file_key = p.current_output_path if (export_in.include_colorized and p.current_output_path) else p.original_file_path
            try:
                page_bytes = storage.read_bytes(file_key)
                image_bytes_list.append(page_bytes)
            except Exception:
                continue

        if not image_bytes_list:
            raise HTTPException(status_code=400, detail="No readable page images could be found for PDF export")

        try:
            if export_in.pdf_mode == "webtoon":
                export_bytes = PDFExportService.generate_webtoon_pdf(
                    image_bytes_list=image_bytes_list,
                    quality_preset=export_in.compression_quality or "balanced",
                    webtoon_gap=export_in.webtoon_gap or 0
                )
            else:
                export_bytes = PDFExportService.generate_standard_pdf(
                    image_bytes_list=image_bytes_list,
                    quality_preset=export_in.compression_quality or "balanced",
                    include_page_numbers=bool(export_in.include_page_numbers)
                )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"PDF generation failed: {str(e)}")

        storage_key, checksum, size_bytes = storage.save_bytes(export_bytes, "exports", ".pdf")
    else:
        # Bundle pages into zip/cbz in memory
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for p in pages:
                file_key = p.current_output_path if (export_in.include_colorized and p.current_output_path) else p.original_file_path
                try:
                    page_bytes = storage.read_bytes(file_key)
                    ext = Path(file_key).suffix.lower() or ".png"
                    archive_name = f"page_{p.page_number:04d}{ext}"
                    zf.writestr(archive_name, page_bytes)
                except Exception:
                    continue

        archive_data = zip_buffer.getvalue()
        ext = ".cbz" if export_format == "cbz" else ".zip"
        storage_key, checksum, size_bytes = storage.save_bytes(archive_data, "exports", ext)

    export_job = ExportJob(
        user_id=current_user.id,
        project_id=export_in.project_id,
        chapter_id=export_in.chapter_id,
        format=export_format,
        include_colorized=export_in.include_colorized,
        status="completed",
        output_storage_path=storage_key,
        file_size_bytes=size_bytes,
        completed_at=datetime.now(timezone.utc)
    )
    db.add(export_job)
    db.commit()
    db.refresh(export_job)
    return export_job

@router.get("/{export_id}/download")
def download_export(
    export_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    export_job = db.query(ExportJob).filter(ExportJob.id == export_id).first()
    if not export_job or not export_job.output_storage_path:
        raise HTTPException(status_code=404, detail="Export not found or still processing")

    local_path = storage.get_absolute_path(export_job.output_storage_path)
    filename = f"manga_export_{export_job.id[:8]}.{export_job.format}"
    
    if local_path and local_path.exists():
        return FileResponse(
            local_path,
            filename=filename,
            media_type="application/octet-stream"
        )

    data = storage.read_bytes(export_job.output_storage_path)
    return StreamingResponse(
        io.BytesIO(data),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
