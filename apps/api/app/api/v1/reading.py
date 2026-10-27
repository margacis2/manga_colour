from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.entities import ReadingProgress, User
from app.schemas.schemas import ReadingProgressUpdate, ReadingProgressResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/reading-progress", tags=["Reading Progress"])

@router.get("/{project_id}/{chapter_id}", response_model=ReadingProgressResponse)
def get_reading_progress(
    project_id: str,
    chapter_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id,
        ReadingProgress.project_id == project_id,
        ReadingProgress.chapter_id == chapter_id
    ).first()

    if not progress:
        return ReadingProgressResponse(
            id="initial",
            user_id=current_user.id,
            project_id=project_id,
            chapter_id=chapter_id,
            last_read_page_number=1,
            scroll_position=0.0,
            completed=False,
            updated_at=None or progress and progress.updated_at
        )
    return progress

@router.post("", response_model=ReadingProgressResponse)
def save_reading_progress(
    progress_in: ReadingProgressUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    progress = db.query(ReadingProgress).filter(
        ReadingProgress.user_id == current_user.id,
        ReadingProgress.project_id == progress_in.project_id,
        ReadingProgress.chapter_id == progress_in.chapter_id
    ).first()

    if not progress:
        progress = ReadingProgress(
            user_id=current_user.id,
            project_id=progress_in.project_id,
            chapter_id=progress_in.chapter_id
        )
        db.add(progress)

    progress.last_read_page_number = progress_in.last_read_page_number
    progress.scroll_position = progress_in.scroll_position
    progress.completed = progress_in.completed

    db.commit()
    db.refresh(progress)
    return progress
