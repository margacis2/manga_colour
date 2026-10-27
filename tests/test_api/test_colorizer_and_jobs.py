import io
import pytest
from PIL import Image
from fastapi.testclient import TestClient
from app.main import app
from app.services.colorizer_service import colorize_manga_page

client = TestClient(app)

def create_sample_manga_page() -> bytes:
    """Generates a small test black-and-white manga panel in memory."""
    img = Image.new("L", (100, 150), color=255) # white paper
    # Draw simple black line
    for x in range(20, 80):
        img.putpixel((x, 50), 0) # black line
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()

def test_colorizer_service_function():
    manga_bytes = create_sample_manga_page()
    palette = {
        "skin_tone": "#ffe3d1",
        "hair_color": "#2d2424",
        "accent_color": "#38a5f8"
    }
    colorized_bytes = colorize_manga_page(manga_bytes, palette_data=palette, style="anime_soft")
    assert len(colorized_bytes) > 0
    with Image.open(io.BytesIO(colorized_bytes)) as result_img:
        assert result_img.mode == "RGB"
        assert result_img.size == (100, 150)

def test_palettes_and_reading_flow():
    # 1. Create Project
    p_res = client.post("/api/v1/projects", json={"title": "Palette Test Project"})
    assert p_res.status_code == 201
    proj_id = p_res.json()["id"]

    # 2. Create Character
    c_res = client.post(f"/api/v1/palettes/projects/{proj_id}/characters", json={
        "name": "Chinatsu Kano",
        "notes": "Protagonist"
    })
    assert c_res.status_code == 201
    char_id = c_res.json()["id"]

    # 3. Create Palette
    pal_res = client.post(f"/api/v1/palettes/projects/{proj_id}/palettes", json={
        "name": "Eimei High Uniform",
        "character_id": char_id,
        "hair_colors": ["#d4a373"],
        "eye_colors": ["#5c4d3c"],
        "skin_tones": ["#fff0e5"],
        "clothing_colors": ["#1e3a8a"],
        "accessories_colors": ["#facc15"],
        "is_default": True
    })
    assert pal_res.status_code == 201
    pal_id = pal_res.json()["id"]

    # 4. List Palettes
    list_res = client.get(f"/api/v1/palettes/projects/{proj_id}/palettes")
    assert list_res.status_code == 200
    assert any(p["id"] == pal_id for p in list_res.json())

    # 5. Create Chapter & Import Single Page
    ch_res = client.post(f"/api/v1/chapters/project/{proj_id}", json={
        "chapter_number": 1.0,
        "title": "Ch 1"
    })
    assert ch_res.status_code == 201
    chap_id = ch_res.json()["id"]

    page_bytes = create_sample_manga_page()
    import_res = client.post(
        f"/api/v1/chapters/{chap_id}/import-images",
        files=[("files", ("page01.png", page_bytes, "image/png"))]
    )
    assert import_res.status_code == 200
    pages = import_res.json()["pages"]
    assert len(pages) == 1
    page_id = pages[0]["id"]

    # 6. Test Reading Progress API
    rp_res = client.post("/api/v1/reading-progress", json={
        "project_id": proj_id,
        "chapter_id": chap_id,
        "last_read_page_number": 1,
        "scroll_position": 0.0,
        "completed": True
    })
    assert rp_res.status_code == 200
    assert rp_res.json()["last_read_page_number"] == 1

    get_rp = client.get(f"/api/v1/reading-progress/{proj_id}/{chap_id}")
    assert get_rp.status_code == 200
    assert get_rp.json()["completed"] is True

    # 7. Test Export API
    export_res = client.post("/api/v1/exports", json={
        "project_id": proj_id,
        "chapter_id": chap_id,
        "format": "cbz",
        "include_colorized": True
    })
    assert export_res.status_code == 201
    export_id = export_res.json()["id"]

    download_res = client.get(f"/api/v1/exports/{export_id}/download")
    assert download_res.status_code == 200
    assert len(download_res.content) > 0

    # Clean up project
    del_res = client.delete(f"/api/v1/projects/{proj_id}")
    assert del_res.status_code == 204
