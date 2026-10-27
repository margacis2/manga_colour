import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings

client = TestClient(app)

def test_health_endpoint():
    response = client.get("/api/v1/system/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["app_name"] == settings.APP_NAME
    assert data["mode"] == "local"

def test_hardware_status_endpoint():
    response = client.get("/api/v1/system/hardware")
    assert response.status_code == 200
    data = response.json()
    assert "cpu_percent" in data
    assert "ram_total_gb" in data
    assert data["ram_total_gb"] > 0
    assert "gpu_available" in data
    assert "default_provider" in data

def test_providers_endpoint():
    response = client.get("/api/v1/system/providers")
    assert response.status_code == 200
    providers = response.json()
    provider_ids = [p["id"] for p in providers]
    assert "local_gpu" in provider_ids
    assert "local_cpu" in provider_ids
    assert "colab" in provider_ids

def test_project_crud_lifecycle():
    # 1. Create Project
    create_payload = {
        "title": "Blue Box Test Project",
        "description": "Taiki and Chinatsu fan color test project"
    }
    res = client.post("/api/v1/projects", json=create_payload)
    assert res.status_code == 201
    created_project = res.json()
    project_id = created_project["id"]
    assert created_project["title"] == create_payload["title"]

    # 2. Get Project
    res = client.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 200
    assert res.json()["id"] == project_id

    # 3. List Projects
    res = client.get("/api/v1/projects")
    assert res.status_code == 200
    items = res.json()
    assert any(p["id"] == project_id for p in items)

    # 4. Create Chapter
    chap_payload = {
        "chapter_number": 1.0,
        "title": "Chapter 1: Spring Feather",
        "sequence_order": 1
    }
    res = client.post(f"/api/v1/chapters/project/{project_id}", json=chap_payload)
    assert res.status_code == 201
    created_chap = res.json()
    assert created_chap["title"] == chap_payload["title"]

    # 5. Delete Project
    res = client.delete(f"/api/v1/projects/{project_id}")
    assert res.status_code == 204

    # 6. Verify Deletion
    res = client.get(f"/api/v1/projects/{project_id}")
    assert res.status_code == 404
