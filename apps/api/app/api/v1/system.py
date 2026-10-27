import os
import psutil
import shutil
import subprocess
import importlib
import importlib.util
from typing import Dict, Any, Optional
from fastapi import APIRouter
from app.core.config import settings
from app.schemas.schemas import HardwareStatusResponse

router = APIRouter(prefix="/system", tags=["System & Hardware"])

def find_nvidia_smi() -> Optional[str]:
    """Finds the nvidia-smi binary on PATH or standard Windows installation locations."""
    # Check PATH
    smi = shutil.which("nvidia-smi")
    if smi:
        return smi
    
    # Check common Windows paths
    candidates = [
        os.path.join(os.environ.get("WINDIR", r"C:\Windows"), "System32", "nvidia-smi.exe"),
        r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe",
    ]
    for path in candidates:
        if os.path.isfile(path):
            return path
    return None

def check_nvidia_smi() -> Dict[str, Any]:
    """Runs nvidia-smi query to get reliable VRAM metrics on Windows."""
    smi_path = find_nvidia_smi()
    if not smi_path:
        return {"available": False, "name": None, "total": None, "used": None, "free": None}

    creation_flags = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    try:
        output = subprocess.check_output(
            [smi_path, "--query-gpu=name,memory.total,memory.used,memory.free", "--format=csv,noheader,nounits"],
            encoding="utf-8",
            timeout=3,
            creationflags=creation_flags
        )
        lines = [line.strip() for line in output.strip().splitlines() if line.strip()]
        if lines:
            parts = [p.strip() for p in lines[0].split(",")]
            if len(parts) >= 4:
                try:
                    total_mb = float(parts[1])
                    used_mb = float(parts[2])
                    free_mb = float(parts[3])
                except (ValueError, TypeError):
                    total_mb, used_mb, free_mb = None, None, None

                return {
                    "available": True,
                    "name": parts[0],
                    "total": total_mb,
                    "used": used_mb,
                    "free": free_mb
                }
    except Exception:
        pass

    return {"available": False, "name": None, "total": None, "used": None, "free": None}

@router.get("/hardware", response_model=HardwareStatusResponse)
def get_hardware_status():
    mem = psutil.virtual_memory()
    cpu_pct = psutil.cpu_percent(interval=None)

    # Dynamically check for optional PyTorch & CUDA without triggering static LSP missing module errors
    torch_available = False
    cuda_available = False
    cuda_version = None

    if importlib.util.find_spec("torch") is not None:
        try:
            torch = importlib.import_module("torch")
            torch_available = True
            cuda_available = bool(torch.cuda.is_available())
            if cuda_available:
                cuda_version = str(torch.version.cuda)
        except Exception:
            pass

    gpu_info = check_nvidia_smi()
    model_installed = (
        os.path.exists("data/models/colorization/manga-colorize-fp16.onnx")
        or os.path.exists(os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "models", "colorization", "manga-colorize-fp16.onnx"))
    )

    return HardwareStatusResponse(
        gpu_available=gpu_info["available"] or cuda_available,
        gpu_name=gpu_info["name"] or ("NVIDIA CUDA GPU" if cuda_available else None),
        gpu_memory_total_mb=gpu_info["total"],
        gpu_memory_used_mb=gpu_info["used"],
        gpu_memory_free_mb=gpu_info["free"],
        cpu_percent=cpu_pct,
        ram_total_gb=round(mem.total / (1024**3), 2),
        ram_used_gb=round(mem.used / (1024**3), 2),
        torch_available=torch_available,
        cuda_available=cuda_available,
        cuda_version=cuda_version,
        active_worker_running=True,
        default_provider=settings.DEFAULT_PROVIDER,
        model_weights_installed=model_installed
    )

@router.get("/providers")
def get_providers_info():
    return [
        {
            "id": "local_gpu",
            "name": "Local NVIDIA RTX 3050 (4GB VRAM)",
            "description": "Fast on-device GPU inference. Optimized with fp16 & line-art compositing.",
            "is_available": True,
            "recommended": True
        },
        {
            "id": "local_cpu",
            "name": "Local CPU Fallback",
            "description": "Runs on multi-core CPU. Reliable, zero VRAM usage, suitable for any PC.",
            "is_available": True,
            "recommended": False
        },
        {
            "id": "colab",
            "name": "Google Colab Free/Pro Workflow",
            "description": "Export chapter job package for zero-cost remote processing on Colab T4 GPU.",
            "is_available": True,
            "recommended": False
        },
        {
            "id": "remote_worker",
            "name": "Authenticated Remote Worker",
            "description": "Dispatches batch jobs to a configured high-VRAM cloud GPU worker with token auth.",
            "is_available": bool(settings.WORKER_SECRET_TOKEN),
            "recommended": False
        }
    ]

@router.get("/styles")
def get_color_styles():
    """Returns authoritative manga colorization styles with metadata and parameter descriptions."""
    from app.services.color_styles import get_all_styles
    return get_all_styles()

@router.get("/health")
def health_check():
    return {
        "status": "healthy",
        "app_name": settings.APP_NAME,
        "mode": settings.APP_MODE,
        "storage_type": settings.STORAGE_TYPE
    }
