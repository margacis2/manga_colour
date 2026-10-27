from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ProcessingJob, ProcessingTask, Page, Chapter, Project, User
from app.schemas.schemas import JobCreate, ProcessingJobResponse
from app.api.deps import get_current_user
from app.services.colorizer_service import run_job_synchronously_or_async

router = APIRouter(prefix="/jobs", tags=["Processing Jobs"])

@router.post("", response_model=ProcessingJobResponse, status_code=status.HTTP_201_CREATED)
def create_processing_job(
    job_in: JobCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    project = db.query(Project).filter(Project.id == job_in.project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    # Determine pages to process
    pages_query = db.query(Page).join(Chapter).filter(Chapter.project_id == job_in.project_id)
    if job_in.chapter_id:
        pages_query = pages_query.filter(Page.chapter_id == job_in.chapter_id)
    if job_in.page_ids:
        pages_query = pages_query.filter(Page.id.in_(job_in.page_ids))
    if job_in.skip_approved:
        pages_query = pages_query.filter(Page.approved == False)

    pages_to_process = pages_query.order_by(Page.chapter_id, Page.page_number).all()
    if not pages_to_process:
        raise HTTPException(
            status_code=400,
            detail="No eligible pages found to process (pages may already be approved or chapter is empty)"
        )

    job = ProcessingJob(
        user_id=current_user.id,
        project_id=job_in.project_id,
        chapter_id=job_in.chapter_id,
        status="queued",
        provider=job_in.provider,
        model_name=job_in.model_name,
        total_pages=len(pages_to_process),
        completed_pages=0,
        failed_pages=0,
        config_json=job_in.config
    )
    db.add(job)
    db.flush()

    for order, page in enumerate(pages_to_process, start=1):
        task = ProcessingTask(
            job_id=job.id,
            page_id=page.id,
            task_order=order,
            status="queued"
        )
        db.add(task)
        page.processing_status = "queued"

    db.commit()
    db.refresh(job)
    background_tasks.add_task(run_job_synchronously_or_async, job.id)
    return job

@router.get("", response_model=List[ProcessingJobResponse])
def list_jobs(
    project_id: Optional[str] = None,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ProcessingJob)
    if project_id:
        query = query.filter(ProcessingJob.project_id == project_id)
    return query.order_by(ProcessingJob.created_at.desc()).limit(limit).all()

@router.get("/{job_id}", response_model=ProcessingJobResponse)
def get_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job

@router.post("/{job_id}/cancel", response_model=ProcessingJobResponse)
def cancel_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    if job.status in ("completed", "failed", "cancelled"):
        return job
    
    job.status = "cancelled"
    job.completed_at = datetime.now(timezone.utc)
    
    # Cancel pending tasks
    for task in job.tasks:
        if task.status in ("queued", "preparing", "processing"):
            task.status = "cancelled"
            task.error_message = "Cancelled by user"

    db.commit()
    db.refresh(job)
    return job

@router.post("/{job_id}/retry", response_model=ProcessingJobResponse)
def retry_failed_job_tasks(
    job_id: str,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    
    # Reset failed/cancelled tasks to queued, and count pending queued tasks
    retried_count = 0
    queued_count = 0
    for task in job.tasks:
        if task.status in ("failed", "cancelled"):
            task.status = "queued"
            task.retry_count += 1
            task.error_message = None
            retried_count += 1
        elif task.status in ("queued", "preparing", "processing"):
            queued_count += 1
    
    if retried_count > 0 or queued_count > 0:
        job.status = "queued"
        job.error_message = None
        job.failed_pages = max(0, job.failed_pages - retried_count)
        db.commit()
        db.refresh(job)
        background_tasks.add_task(run_job_synchronously_or_async, job.id)

    return job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_processing_job(
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Deletes a batch processing job and its associated tasks.
    Safely rejects deletion if the job is actively running (must be cancelled first).
    Ensures original manga pages, project records, and palettes remain safe.
    """
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job.status == "processing":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an active running job. Please cancel the job first and wait for the worker to stop."
        )

    db.delete(job)
    db.commit()
    return None

