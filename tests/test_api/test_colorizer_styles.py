import io
import cv2
import numpy as np
import pytest
from PIL import Image
from fastapi.testclient import TestClient

from app.main import app
from app.services.color_styles import (
    STYLE_CONFIGS,
    STYLE_ANIME_SOFT,
    STYLE_VIBRANT_SHONEN,
    STYLE_PASTEL_SHOJO,
    normalize_style_id,
    get_style_definition,
    get_all_styles,
    apply_style_postprocessing,
    compute_image_statistics,
)
from app.services.colorizer_service import colorize_manga_page

client = TestClient(app)

def create_synthetic_manga_page(width=400, height=500):
    """
    Creates an in-memory synthetic manga test page with:
    - Pure white speech bubble (#FFFFFF)
    - Pure black ink line art (#000000)
    - Midtone character skin and clothes
    """
    img = np.full((height, width), 220, dtype=np.uint8)
    
    # White speech bubble in upper right
    cv2.circle(img, (width - 100, 100), 70, 255, -1)
    # Speech bubble black border
    cv2.circle(img, (width - 100, 100), 70, 0, 2)
    
    # Black line art ink strokes
    cv2.line(img, (50, 150), (250, 450), 0, 4)
    cv2.line(img, (80, 100), (80, 480), 0, 3)
    cv2.rectangle(img, (40, 40), (width - 40, height - 40), 0, 2)
    
    # Shaded character/clothing region (midtones)
    cv2.rectangle(img, (100, 200), (220, 360), 140, -1)
    
    bgr = cv2.cvtColor(img, cv2.COLOR_GRAY2BGR)
    success, encoded = cv2.imencode(".png", bgr)
    assert success
    return encoded.tobytes(), img


class TestColorizerStyles:
    def test_style_configurations_differ_meaningfully(self):
        """Verifies each style has distinct, non-identical parameters and valid metadata."""
        canonical_styles = [STYLE_ANIME_SOFT, STYLE_VIBRANT_SHONEN, STYLE_PASTEL_SHOJO]
        assert len(canonical_styles) == 3
        
        configs = [get_style_definition(s) for s in canonical_styles]
        
        # Verify names and taglines are distinct
        names = [c["name"] for c in configs]
        assert len(set(names)) == 3
        
        # Verify parameter configurations differ meaningfully
        saturations = [c["params"]["saturation_scale"] for c in configs]
        assert len(set(saturations)) == 3
        assert configs[1]["params"]["saturation_scale"] > configs[0]["params"]["saturation_scale"]
        assert configs[0]["params"]["saturation_scale"] > configs[2]["params"]["saturation_scale"]
        
        # Verify tone curve / shadow lifts differ
        shadow_lifts = [c["params"]["shadow_lift"] for c in configs]
        assert configs[2]["params"]["shadow_lift"] > 0  # Shojo lifts shadows
        assert configs[1]["params"]["shadow_lift"] < 0  # Shonen deepens shadows
        
        # Verify swatches exist
        for c in configs:
            assert len(c["swatches"]) == 4

    def test_style_id_normalization_and_aliases(self):
        """Verifies legacy aliases and uppercase inputs map correctly to canonical style IDs."""
        # Canonical mappings
        assert normalize_style_id(STYLE_ANIME_SOFT) == STYLE_ANIME_SOFT
        assert normalize_style_id(STYLE_VIBRANT_SHONEN) == STYLE_VIBRANT_SHONEN
        assert normalize_style_id(STYLE_PASTEL_SHOJO) == STYLE_PASTEL_SHOJO
        
        # Legacy aliases
        assert normalize_style_id("anime_soft") == STYLE_ANIME_SOFT
        assert normalize_style_id("vibrant_shonen") == STYLE_VIBRANT_SHONEN
        assert normalize_style_id("pastel_shojo") == STYLE_PASTEL_SHOJO
        assert normalize_style_id("shonen") == STYLE_VIBRANT_SHONEN
        assert normalize_style_id("shojo") == STYLE_PASTEL_SHOJO
        assert normalize_style_id("manga_color_v1") == STYLE_ANIME_SOFT
        
        # Safe fallback on unknown or empty
        assert normalize_style_id(None) == STYLE_ANIME_SOFT
        assert normalize_style_id("") == STYLE_ANIME_SOFT
        assert normalize_style_id("non_existent_style") == STYLE_ANIME_SOFT

    def test_api_style_endpoints(self):
        """Verifies the /system/styles endpoint exposes all styles with complete metadata."""
        resp = client.get("/api/v1/system/styles")
        assert resp.status_code == 200
        styles = resp.json()
        assert len(styles) == 3
        ids = [s["id"] for s in styles]
        assert STYLE_ANIME_SOFT in ids
        assert STYLE_VIBRANT_SHONEN in ids
        assert STYLE_PASTEL_SHOJO in ids

    def test_job_style_propagation_and_retry(self):
        """Verifies selected style travels from job creation through queue and survives retry."""
        # 1. Create project & chapter
        proj_resp = client.post("/api/v1/projects", json={"title": "Style Test Project"})
        assert proj_resp.status_code == 201
        proj_id = proj_resp.json()["id"]
        
        chap_resp = client.post(f"/api/v1/chapters/project/{proj_id}", json={"chapter_number": 1.0, "title": "Ch 1"})
        assert chap_resp.status_code == 201
        chap_id = chap_resp.json()["id"]
        
        # 2. Upload a test page
        img_bytes, _ = create_synthetic_manga_page()
        upload_resp = client.post(
            f"/api/v1/chapters/{chap_id}/import-images",
            files=[("files", ("page1.png", img_bytes, "image/png"))]
        )
        assert upload_resp.status_code == 200
        
        # 3. Create job with vibrant_shonen_action
        job_resp = client.post("/api/v1/jobs", json={
            "project_id": proj_id,
            "chapter_id": chap_id,
            "model_name": "vibrant_shonen_action",
            "provider": "local_cpu"
        })
        assert job_resp.status_code == 201
        job_data = job_resp.json()
        assert job_data["model_name"] == STYLE_VIBRANT_SHONEN
        job_id = job_data["id"]
        
        # 4. Fetch job details
        get_job = client.get(f"/api/v1/jobs/{job_id}")
        assert get_job.status_code == 200
        assert get_job.json()["model_name"] == STYLE_VIBRANT_SHONEN
        
        # 5. Cancel and retry job: style MUST be preserved
        client.post(f"/api/v1/jobs/{job_id}/cancel")
        retry_resp = client.post(f"/api/v1/jobs/{job_id}/retry")
        assert retry_resp.status_code == 200
        assert retry_resp.json()["model_name"] == STYLE_VIBRANT_SHONEN

    def test_lineart_and_speech_bubble_preservation(self):
        """Verifies clean paper white in speech bubbles and razor sharp black ink lines."""
        img_bytes, orig_gray = create_synthetic_manga_page(300, 300)
        
        # Create a mock base RGB colorization (e.g. warm beige tone)
        base_rgb = np.full((300, 300, 3), (180, 200, 220), dtype=np.uint8)
        
        for style_id in [STYLE_ANIME_SOFT, STYLE_VIBRANT_SHONEN, STYLE_PASTEL_SHOJO]:
            styled_rgb = apply_style_postprocessing(base_rgb, orig_gray, style_id)
            assert styled_rgb.shape == (300, 300, 3)
            
            # Check pure black line ink (x=80, y=200 has an ink line)
            # Should remain very dark black (RGB < 15, 15, 15)
            assert np.all(styled_rgb[200, 80] <= 15)
            
            # Check white speech bubble (center at 200, 100)
            # Should remain clean paper white (RGB >= 250, 250, 250)
            assert np.all(styled_rgb[100, 200] >= 250)

    def test_measurable_statistical_differences_between_styles(self):
        """Verifies that all three styles produce measurably distinct color statistics."""
        # Use synthetic art canvas with varied midtones
        np.random.seed(42)
        h, w = 300, 300
        orig_gray = np.full((h, w), 180, dtype=np.uint8)
        # Add gradient to simulate manga screentone / lighting
        for y in range(h):
            orig_gray[y, :] = int(60 + (y / h) * 160)
            
        # Add simulated character coloring with clothes & hair chrominance
        raw_rgb = np.zeros((h, w, 3), dtype=np.uint8)
        raw_rgb[:, :, 0] = 210  # Reddish
        raw_rgb[:, :, 1] = 140  # Greenish
        raw_rgb[:, :, 2] = 120  # Blueish
        
        soft_rgb = apply_style_postprocessing(raw_rgb, orig_gray, STYLE_ANIME_SOFT)
        shonen_rgb = apply_style_postprocessing(raw_rgb, orig_gray, STYLE_VIBRANT_SHONEN)
        shojo_rgb = apply_style_postprocessing(raw_rgb, orig_gray, STYLE_PASTEL_SHOJO)
        
        stats_soft = compute_image_statistics(soft_rgb)
        stats_shonen = compute_image_statistics(shonen_rgb)
        stats_shojo = compute_image_statistics(shojo_rgb)
        
        # 1. Shonen Action MUST have highest saturation
        assert stats_shonen["mean_saturation"] > stats_soft["mean_saturation"]
        # 2. Shojo Pastel MUST have lower saturation than Anime Soft
        assert stats_shojo["mean_saturation"] < stats_soft["mean_saturation"]
        # 3. Shojo MUST have lifted shadow luminance
        assert stats_shojo["mean_luminance"] > stats_soft["mean_luminance"]
        # 4. Color grading differs in LAB a* / b*
        assert stats_shonen["mean_lab_a"] != stats_soft["mean_lab_a"]
        assert stats_shojo["mean_lab_b"] < stats_shonen["mean_lab_b"]
