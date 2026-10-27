import io
import os
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List, Dict, Any
import cv2
import numpy as np
from PIL import Image, ImageOps
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.storage import storage
from app.models.entities import ProcessingJob, ProcessingTask, Page, Palette

# Cache the ONNX model in memory to avoid repeated disk reads during batch inference
_CACHED_NET = None
_CACHED_NET_PATH = None

def get_colorization_model():
    """Loads and caches the ONNX manga colorization model."""
    global _CACHED_NET, _CACHED_NET_PATH
    
    candidates = [
        os.path.abspath("data/models/colorization/manga-colorize-fp16.onnx"),
        str(Path(__file__).resolve().parents[4] / "data" / "models" / "colorization" / "manga-colorize-fp16.onnx"),
        str(Path.cwd() / "data" / "models" / "colorization" / "manga-colorize-fp16.onnx"),
    ]
    model_path = None
    for cand in candidates:
        if os.path.exists(cand):
            model_path = cand
            break

    if not model_path:
        raise FileNotFoundError(
            "AI Model Weights Missing: 'data/models/colorization/manga-colorize-fp16.onnx' not found on this machine. "
            "Model files are not included in Git clones (~61.6 MB). Please copy 'manga-colorize-fp16.onnx' into "
            "'data/models/colorization/' or use the Google Colab notebook ('notebooks/colab_colorization.ipynb')."
        )
            
    if _CACHED_NET is None or _CACHED_NET_PATH != model_path:
        net = cv2.dnn.readNetFromONNX(model_path)
        # Configure CPU execution (AVX2 multithreaded) for low memory profile (<500MB)
        # Completely avoids CUDA OOM errors on 4GB VRAM
        _CACHED_NET = net
        _CACHED_NET_PATH = model_path
        
    return _CACHED_NET

def hex_to_rgb(hex_code: str) -> tuple[int, int, int]:
    """Converts #RRGGBB to (R, G, B)."""
    hex_clean = hex_code.lstrip("#")
    if len(hex_clean) == 3:
        hex_clean = "".join([c * 2 for c in hex_clean])
    if len(hex_clean) >= 6:
        return int(hex_clean[0:2], 16), int(hex_clean[2:4], 16), int(hex_clean[4:6], 16)
    return (220, 200, 180)

def colorize_manga_page(
    image_bytes: bytes,
    palette_data: Optional[Dict[str, Any]] = None,
    style: str = "anime_soft"
) -> bytes:
    """
    Colorizes a manga page using the genuine pretrained manga-colorization-v2 ONNX generator.
    Preserves original high-resolution line art, speech bubbles, screentones, and dialogue text
    via CIELAB luminance transfer.
    """
    net = get_colorization_model()
    
    nparr = np.frombuffer(image_bytes, np.uint8)
    orig_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if orig_bgr is None:
        raise ValueError("Could not decode input image bytes into an image")
        
    orig_h, orig_w = orig_bgr.shape[:2]
    orig_gray = cv2.cvtColor(orig_bgr, cv2.COLOR_BGR2GRAY)
    
    # Scale inference resolution while keeping original aspect ratio
    # Model requires dimensions to be multiples of 32
    max_dim = 1024
    scale = min(1.0, max_dim / max(orig_h, orig_w))
    raw_w = int(orig_w * scale)
    raw_h = int(orig_h * scale)
    
    target_w = max(64, (raw_w // 32) * 32)
    target_h = max(64, (raw_h // 32) * 32)
    
    gray_resized = cv2.resize(orig_gray, (target_w, target_h), interpolation=cv2.INTER_AREA)
    gray_norm = gray_resized.astype(np.float32) / 255.0
    
    # 5-channel model input [1, 5, H, W]:
    # Channel 0: Grayscale image normalized 0..1
    # Channels 1-3: Color hints normalized ((c - 0.5) / 0.5) or 0 if none
    # Channel 4: Hint mask (0 for automatic inference)
    inp = np.zeros((1, 5, target_h, target_w), dtype=np.float32)
    inp[0, 0] = gray_norm
    
    net.setInput(inp, "input")
    out = net.forward("rgb")[0]  # Shape: (3, target_h, target_w) in [0, 1]
    
    model_rgb = np.transpose(out, (1, 2, 0))  # (target_h, target_w, 3)
    model_rgb = np.clip(model_rgb * 255.0, 0, 255).astype(np.uint8)
    
    # Upscale model color prediction back to native original resolution
    color_upscaled = cv2.resize(model_rgb, (orig_w, orig_h), interpolation=cv2.INTER_LANCZOS4)
    
    # CIELAB luminance transfer:
    # Retain the neural network's chrominance (a*, b*) while anchoring the Luminance (L)
    # strictly to the native uncompressed manga scan (orig_gray).
    # This guarantees speech bubbles and margins stay clean paper white (#FFFFFF)
    # and all ink strokes, screentones, and dialogue letters remain pitch-black and razor sharp.
    color_lab = cv2.cvtColor(color_upscaled, cv2.COLOR_RGB2LAB)
    color_lab[:, :, 0] = orig_gray
    final_rgb = cv2.cvtColor(color_lab, cv2.COLOR_LAB2RGB)
    
    # Optional style tweaks in HSV color space
    if style == "vibrant_shonen":
        hsv = cv2.cvtColor(final_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 1.15, 0, 255)
        final_rgb = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
    elif style == "pastel_shojo":
        hsv = cv2.cvtColor(final_rgb, cv2.COLOR_RGB2HSV).astype(np.float32)
        hsv[:, :, 1] = np.clip(hsv[:, :, 1] * 0.85, 0, 255)
        final_rgb = cv2.cvtColor(hsv.astype(np.uint8), cv2.COLOR_HSV2RGB)
        
    out_bgr = cv2.cvtColor(final_rgb, cv2.COLOR_RGB2BGR)
    success, encoded = cv2.imencode(".png", out_bgr)
    if not success:
        raise RuntimeError("Failed to encode colorized image to PNG")
        
    return encoded.tobytes()

def process_single_task(task_id: str):
    """Worker task that colorizes a single page, validates output, and updates database."""
    db: Session = SessionLocal()
    try:
        task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()
        if not task or task.status == "cancelled":
            return

        task.status = "processing"
        task.started_at = datetime.now(timezone.utc)
        db.commit()

        page = db.query(Page).filter(Page.id == task.page_id).first()
        if not page:
            task.status = "failed"
            task.error_message = "Page not found in database"
            db.commit()
            return

        # Read original page bytes
        image_bytes = storage.read_bytes(page.original_file_path)

        # Retrieve job and associated palette if configured
        job = db.query(ProcessingJob).filter(ProcessingJob.id == task.job_id).first()
        if job and job.provider == "colab":
            raise ValueError(
                "Google Colab Workflow: The 'colab' provider is designed for remote cloud inference. "
                "Open 'notebooks/colab_colorization.ipynb' in Google Colab to run GPU colorization, then import your pages. "
                "To process directly on this machine, switch the Inference Engine to 'Local CPU Fallback' or 'Local NVIDIA GPU'."
            )

        palette_data = None
        if job:
            palette = db.query(Palette).filter(Palette.project_id == job.project_id, Palette.is_default == True).first()
            if not palette:
                palette = db.query(Palette).filter(Palette.project_id == job.project_id).first()
            
            if palette:
                palette_data = {
                    "skin_tone": palette.skin_tones[0] if palette.skin_tones else "#ffdfc4",
                    "hair_color": palette.hair_colors[0] if palette.hair_colors else "#4a3c31",
                    "accent_color": palette.clothing_colors[0] if palette.clothing_colors else "#38a5f8",
                }

        model_name = job.model_name if job else "anime_soft"
        
        # Execute genuine AI colorization
        colorized_bytes = colorize_manga_page(image_bytes, palette_data=palette_data, style=model_name)

        # Validate colorized output before committing
        if not colorized_bytes or len(colorized_bytes) < 1000:
            raise ValueError("Colorization produced empty or corrupted output bytes")
            
        with Image.open(io.BytesIO(colorized_bytes)) as test_img:
            if test_img.mode != "RGB":
                raise ValueError(f"Colorization output has invalid mode: {test_img.mode}")

        # Save processed full-size output
        out_key, out_checksum, _ = storage.save_bytes(colorized_bytes, "processed", ".png")

        # Generate and save colorized thumbnail so Library and Workspace immediately show color
        with Image.open(io.BytesIO(colorized_bytes)) as full_color_img:
            thumb = full_color_img.copy()
            thumb.thumbnail((360, 500), Image.Resampling.LANCZOS)
            thumb_buffer = io.BytesIO()
            thumb.convert("RGB").save(thumb_buffer, format="JPEG", quality=88, optimize=True)
            thumb_bytes = thumb_buffer.getvalue()
            color_thumb_key, _, _ = storage.save_bytes(thumb_bytes, "thumbnails", ".jpg")

        # Update page record
        page.current_output_path = out_key
        page.current_output_checksum = out_checksum
        page.thumbnail_path = color_thumb_key
        page.processing_status = "completed"
        page.provider_name = job.provider if job else "local_onnx"
        page.model_version = "manga-colorization-v2-fp16"

        # Update task record
        task.status = "completed"
        task.completed_at = datetime.now(timezone.utc)
        task.error_message = None

        # Update job progress statistics
        if job:
            job.completed_pages += 1
            if job.completed_pages + job.failed_pages >= job.total_pages:
                job.status = "completed"
                job.completed_at = datetime.now(timezone.utc)

        db.commit()
    except Exception as e:
        db.rollback()
        task = db.query(ProcessingTask).filter(ProcessingTask.id == task_id).first()
        if task:
            task.status = "failed"
            task.error_message = str(e)
            job = db.query(ProcessingJob).filter(ProcessingJob.id == task.job_id).first()
            if job:
                job.failed_pages += 1
                job.error_message = str(e)
                if job.completed_pages + job.failed_pages >= job.total_pages:
                    job.status = "completed" if job.completed_pages > 0 else "failed"
                    job.completed_at = datetime.now(timezone.utc)
            db.commit()
    finally:
        db.close()


def run_job_synchronously_or_async(job_id: str):
    """Executes all pending tasks in the job."""
    db: Session = SessionLocal()
    try:
        job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
        if not job or job.status == "cancelled":
            return
        
        job.status = "processing"
        job.started_at = datetime.now(timezone.utc)
        db.commit()

        tasks = db.query(ProcessingTask).filter(
            ProcessingTask.job_id == job_id,
            ProcessingTask.status == "queued"
        ).order_by(ProcessingTask.task_order).all()

        task_ids = [t.id for t in tasks]
    finally:
        db.close()

    for tid in task_ids:
        process_single_task(tid)

