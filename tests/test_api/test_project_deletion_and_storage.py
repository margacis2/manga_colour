import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.core.database import SessionLocal
from app.models.entities import User, Project, Chapter, Page, ProcessingJob

client = TestClient(app)

def test_project_storage_stats_and_safe_deletion():
    db: Session = SessionLocal()
    try:
        # 1. Create a project
        res = client.post(
            "/api/v1/projects",
            json={"title": "Test Deletion Project", "description": "For testing safe delete"}
        )
        assert res.status_code == 201
        project_id = res.json()["id"]

        # 2. Get storage stats
        stats_res = client.get(f"/api/v1/projects/{project_id}/storage-stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert "total_pages" in stats
        assert "total_size_bytes" in stats
        assert stats["project_id"] == project_id

        # 3. Simulate an active running job - deletion should be blocked with 400
        local_user = db.query(User).filter(User.email == "local@bluebox.studio").first()
        running_job = ProcessingJob(
            user_id=local_user.id,
            project_id=project_id,
            status="processing",
            total_pages=10
        )
        db.add(running_job)
        db.commit()

        del_res = client.delete(f"/api/v1/projects/{project_id}")
        assert del_res.status_code == 400
        assert "actively running" in del_res.json()["detail"]

        # 4. Cancel/complete job - deletion should now succeed with 204
        running_job.status = "cancelled"
        db.commit()

        del_res_success = client.delete(f"/api/v1/projects/{project_id}")
        assert del_res_success.status_code == 204

        # 5. Verify project is deleted
        get_res = client.get(f"/api/v1/projects/{project_id}")
        assert get_res.status_code == 404
    finally:
        db.close()


def test_chapter_storage_stats_and_optimization():
    from PIL import Image
    import io
    from app.core.storage import storage

    db: Session = SessionLocal()
    try:
        # Create project & chapter
        res = client.post(
            "/api/v1/projects",
            json={"title": "Storage Test Project", "description": "Testing optimization"}
        )
        assert res.status_code == 201
        project_id = res.json()["id"]

        ch_res = client.post(
            f"/api/v1/chapters/project/{project_id}",
            json={"chapter_number": 1, "title": "Chapter 1", "sequence_order": 1}
        )
        assert ch_res.status_code == 201
        chapter_id = ch_res.json()["id"]

        # Create dummy original and processed uncompressed PNG pages
        img = Image.new("RGB", (600, 800), color=(200, 100, 50))
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        raw_png = img_bytes.getvalue()

        orig_key, orig_cs, _ = storage.save_bytes(raw_png, "originals", ".png")
        proc_key, proc_cs, _ = storage.save_bytes(raw_png, "processed", ".png")

        page = Page(
            chapter_id=chapter_id,
            page_number=1,
            original_filename="page1.png",
            original_file_path=orig_key,
            original_checksum=orig_cs,
            original_width=600,
            original_height=800,
            current_output_path=proc_key,
            current_output_checksum=proc_cs,
            processing_status="completed"
        )
        db.add(page)
        db.commit()

        # 1. Check storage stats
        stats_res = client.get(f"/api/v1/chapters/{chapter_id}/storage-stats")
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert stats["total_pages"] == 1
        assert stats["processed_size_bytes"] > 0
        assert stats["originals_size_bytes"] > 0

        # 2. Run optimization (preset balanced)
        opt_res = client.post(
            f"/api/v1/chapters/{chapter_id}/optimize",
            json={"preset": "balanced"}
        )
        assert opt_res.status_code == 200
        opt_data = opt_res.json()
        assert opt_data["pages_optimized"] == 1
        assert opt_data["after_bytes"] < opt_data["before_bytes"]
        assert opt_data["bytes_saved"] > 0

        # 3. Verify original scan file is UNTOUCHED
        orig_path = storage.get_absolute_path(page.original_file_path)
        assert orig_path.exists()
        assert orig_path.suffix.lower() == ".png"

        # 4. Verify processed file is now WebP
        db.refresh(page)
        assert page.current_output_path.endswith(".webp")
        new_proc_path = storage.get_absolute_path(page.current_output_path)
        assert new_proc_path.exists()

        # Clean up project
        client.delete(f"/api/v1/projects/{project_id}")
    finally:
        db.close()

