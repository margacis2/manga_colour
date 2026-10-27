import io
import pytest
from PIL import Image
import pypdf
from app.services.pdf_export_service import PDFExportService

def create_sample_png(width=400, height=600, color=(200, 50, 50), mode="RGB", alpha=False):
    buf = io.BytesIO()
    if alpha:
        img = Image.new("RGBA", (width, height), (color[0], color[1], color[2], 180))
    else:
        img = Image.new(mode, (width, height), color)
    img.save(buf, format="PNG")
    return buf.getvalue()

def test_standard_pdf_export():
    img1 = create_sample_png(400, 600, (255, 0, 0))
    img2 = create_sample_png(500, 700, (0, 255, 0))
    img3 = create_sample_png(450, 650, (0, 0, 255), alpha=True)

    pdf_bytes = PDFExportService.generate_standard_pdf(
        image_bytes_list=[img1, img2, img3],
        quality_preset="balanced",
        include_page_numbers=True
    )

    assert len(pdf_bytes) > 0
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) == 3

def test_webtoon_pdf_export():
    img1 = create_sample_png(400, 600, (100, 100, 100))
    img2 = create_sample_png(800, 1200, (150, 150, 150))
    img3 = create_sample_png(600, 900, (200, 200, 200), alpha=True)

    pdf_bytes = PDFExportService.generate_webtoon_pdf(
        image_bytes_list=[img1, img2, img3],
        quality_preset="balanced",
        webtoon_gap=10
    )

    assert len(pdf_bytes) > 0
    reader = pypdf.PdfReader(io.BytesIO(pdf_bytes))
    assert len(reader.pages) >= 1

def test_rgba_and_transparency_handling():
    img_rgba = create_sample_png(300, 300, (10, 20, 30), alpha=True)
    raw = Image.open(io.BytesIO(img_rgba))
    norm = PDFExportService.normalize_image(raw, quality_preset="small")
    assert norm.mode == "RGB"
    assert max(norm.size) <= 1200
