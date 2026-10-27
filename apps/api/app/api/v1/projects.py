from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.storage import storage
from app.models.entities import Project, User, Chapter, Page, ProcessingJob
from app.schemas.schemas import ProjectCreate, ProjectUpdate, ProjectResponse, StorageStatsResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("", response_model=List[ProjectResponse])
def list_projects(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Project)
    if not current_user.is_admin:
        query = query.filter(Project.user_id == current_user.id)
    return query.order_by(Project.created_at.desc()).offset(skip).limit(limit).all()

@router.post("", response_model=ProjectResponse, status_code=status.HTTP_201_CREATED)
def create_project(
    project_in: ProjectCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = Project(
        title=project_in.title,
        description=project_in.description,
        user_id=current_user.id
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    return project

@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_admin and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to access this project")
    return project

@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(
    project_id: str,
    project_in: ProjectUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_admin and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    if project_in.title is not None:
        project.title = project_in.title
    if project_in.description is not None:
        project.description = project_in.description
    if project_in.cover_page_id is not None:
        project.cover_page_id = project_in.cover_page_id
        
    db.commit()
    db.refresh(project)
    return project

@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Safely deletes a manga project.
    Rejects deletion if any batch processing jobs for this project are currently running.
    Cleans up project page files, thumbnails, and outputs without touching global models or shared data.
    Cascades database records cleanly.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_admin and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    # Safety check: ensure no active jobs are processing for this project
    active_job = db.query(ProcessingJob).filter(
        ProcessingJob.project_id == project_id,
        ProcessingJob.status == "processing"
    ).first()
    if active_job:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete project while Batch Job #{active_job.id[:8]} is actively running. Please cancel the job first."
        )

    # Collect project-specific files to clean up
    files_to_delete = []
    for chapter in project.chapters:
        for page in chapter.pages:
            if page.original_file_path:
                files_to_delete.append(page.original_file_path)
            if page.current_output_path:
                files_to_delete.append(page.current_output_path)
            if page.thumbnail_path:
                files_to_delete.append(page.thumbnail_path)

    # Delete files from disk safely
    for file_key in files_to_delete:
        try:
            storage.delete(file_key)
        except Exception:
            pass

    # Cascade delete database records
    db.delete(project)
    db.commit()
    return None

@router.get("/{project_id}/storage-stats", response_model=StorageStatsResponse)
def get_project_storage_stats(
    project_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Computes total storage statistics across all chapters in the project.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    if not current_user.is_admin and project.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    orig_bytes = 0
    proc_bytes = 0
    total_pages = 0
    colorized_count = 0

    for chapter in project.chapters:
        for page in chapter.pages:
            total_pages += 1
            if page.original_file_path:
                p_orig = storage.get_absolute_path(page.original_file_path)
                if p_orig and p_orig.exists():
                    orig_bytes += p_orig.stat().st_size
            if page.current_output_path:
                colorized_count += 1
                p_proc = storage.get_absolute_path(page.current_output_path)
                if p_proc and p_proc.exists():
                    proc_bytes += p_proc.stat().st_size

    total_bytes = orig_bytes + proc_bytes
    potential_savings = int(proc_bytes * 0.45)
    savings_pct = (potential_savings / total_bytes * 100.0) if total_bytes > 0 else 0.0

    return StorageStatsResponse(
        project_id=project.id,
        total_pages=total_pages,
        colorized_pages=colorized_count,
        originals_size_bytes=orig_bytes,
        processed_size_bytes=proc_bytes,
        total_size_bytes=total_bytes,
        potential_savings_bytes=potential_savings,
        savings_percent=round(savings_pct, 1)
    )

