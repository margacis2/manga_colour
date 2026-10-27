import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import User, Project, Chapter, Page, ProcessingJob, ProcessingTask

client = TestClient(app)

def test_job_queue_deletion_and_retry():
    db: Session = SessionLocal()
    try:
        # Create project and chapter
        p_res = client.post("/api/v1/projects", json={"title": "Queue Test Project"})
        assert p_res.status_code == 201
        proj_id = p_res.json()["id"]

        ch_res = client.post(f"/api/v1/chapters/project/{proj_id}", json={"chapter_number": 1.0, "title": "Ch 1"})
        assert ch_res.status_code == 201
        ch_id = ch_res.json()["id"]

        user = db.query(User).filter(User.email == "local@bluebox.studio").first()

        # Create a job with 2 tasks
        job = ProcessingJob(
            user_id=user.id,
            project_id=proj_id,
            chapter_id=ch_id,
            status="processing",
            total_pages=2,
            completed_pages=0,
            model_name="anime_soft",
            provider="local_gpu"
        )
        db.add(job)
        db.commit()
        db.refresh(job)

        task1 = ProcessingTask(job_id=job.id, page_id="dummy1", task_order=1, status="failed", error_message="VRAM glitch")
        task2 = ProcessingTask(job_id=job.id, page_id="dummy2", task_order=2, status="cancelled")
        db.add_all([task1, task2])
        db.commit()

        # Attempt to delete while status is processing -> should be 400
        del_res = client.delete(f"/api/v1/jobs/{job.id}")
        assert del_res.status_code == 400

        # Cancel job
        cancel_res = client.post(f"/api/v1/jobs/{job.id}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # Retry job -> failed and cancelled tasks should be reset to queued
        retry_res = client.post(f"/api/v1/jobs/{job.id}/retry")
        assert retry_res.status_code == 200
        assert retry_res.json()["status"] == "queued"

        # Mark job completed to test final deletion
        job.status = "completed"
        db.commit()

        # Delete job -> should return 204
        final_del = client.delete(f"/api/v1/jobs/{job.id}")
        assert final_del.status_code == 204

        # Verify job is gone
        get_res = client.get(f"/api/v1/jobs/{job.id}")
        assert get_res.status_code == 404
    finally:
        db.close()
