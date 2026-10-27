# Blue Box Color Studio 🌸
### AI Manga Colorization & Reading Studio with Hardware Acceleration

[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC.svg)](https://tailwindcss.com/)
[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

**Blue Box Color Studio** is a modern full-stack, local-first studio designed for manga artists, scanlators, and fan-colorizers. It provides an end-to-end workflow: decompressing original manga archives, AI batch colorization with character palette consistency, interactive split-screen quality control, vertical webtoon reading, storage optimization, and professional PDF / CBZ export.

---

## 🌟 Key Features

### 1. 🎨 5-Channel AI Colorization Pipeline
- **Luminance-Preserving Neural Inference**: Leverages `manga-colorize-fp16.onnx` executed via OpenCV DNN (`cv2.dnn`) with AVX2 CPU and CUDA acceleration.
- **Pure Line-Art Preservation**: Maps input line art to CIELAB luminance ($L^*$), runs chromatic inference for $a^*$ and $b^*$ channels, and applies luminance reconstruction to eliminate color cast while keeping original screentones, ink lines, and speech bubbles sharp.
- **Character Palette Consistency**: Injects character reference color palettes (hair, eyes, skin tones, uniforms) into the inference context for consistent coloring across panels and chapters.
- **Style Presets**: Supports *Anime Soft Watercolor*, *Vibrant Shonen Action*, and *Dreamy Pastel Shojo*.

### 2. ⚡ Job Queue Management & Task Resumption
- **Safe State Transitions**: Control batch jobs with pause, cancel, retry, and safe deletion.
- **Active Job Guard**: Deletion of active running jobs is rejected to prevent half-written files or corrupted states.
- **Smart Retries**: Retries and resumes failed, cancelled, or pending tasks from where they stopped.
- **Real-time Status Filters**: Filter job queues by `All`, `Queued`, `Processing`, `Completed`, `Failed`, or `Cancelled`.
- **Audit Confirmation**: Deletion modals clearly state that original manga scans remain protected and untouched on disk.

### 3. 📜 Webtoon & Standard Manga PDF Export
- **Continuous Webtoon Strip Mode**:
  - Merges chapter pages into seamless vertical reading strips.
  - Scales all panels to a uniform width while preserving natural aspect ratios.
  - Configurable inter-panel gap spacing (0 to 60px).
  - Splices large strips into manageable chunks to eliminate PDF reader canvas limits.
- **Standard Paginated Mode**:
  - Full-page aspect-fit layouts with optional clean page numbering.
- **Alpha Channel Solid-White Compositing**: Transparent PNG/RGBA manga scans are automatically composited onto solid white to prevent inverted black backgrounds in PDF readers.
- **Quality Presets**: `Original` (lossless), `Balanced` (WebP/JPEG 85%), and `Small` (compressed WebP/JPEG 70%).
- **Automated PDF Integrity Validation**: Output files are verified using `pypdf` prior to delivery.

### 4. 🗜️ Storage Optimization & Compression
- **Zero-Loss Workflow**: Original manga scans (`storage/originals/*`) are immutable and never modified or compressed.
- **Processed Artifact Optimization**: Analyzes colorized output pages, resizes oversized derivatives, and converts images to modern WebP.
- **Live Space Audit**: Interactive endpoints report storage usage, before-and-after bytes, and percentage saved.

### 5. 🗂️ Dashboard & Chapter Cover Index
- **Visual Chapter Indexing**: Displays first-page thumbnail covers on project and chapter chips with native lazy loading (`loading="lazy"`).
- **Project Telemetry**: Real-time project overview showing chapter count, page count, and processing status.
- **Safe Project Deletion**: Comprehensive cleanup removes project records, chapters, pages, palettes, and generated files while blocking deletion if background tasks are running.

### 6. 🌙 Modern Dark Theme
- **Theme Modes**: Choose between `Light`, `Dark`, or `System` synchronization.
- **Instant Navbar Switcher & Settings Configuration**: Easily toggle from the top bar or set your default in Settings.
- **Artwork Inversion Protection**: Strict CSS rules (`filter: none !important`) guarantee that original and colorized manga scans never suffer from accidental browser inversion or color corruption.

---

## 💻 Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| **OS** | Windows 10/11 (64-bit), Linux, macOS | Windows 11 (64-bit) |
| **GPU** | Integrated Graphics (AVX2 CPU Fallback) | NVIDIA RTX 3050 Laptop GPU (4GB VRAM) or higher |
| **RAM** | 8 GB System Memory | 16 GB System Memory |
| **Disk Space** | 2 GB free (plus manga storage) | 10 GB+ SSD storage |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- [Python 3.11+](https://www.python.org/downloads/)
- [Node.js 18+](https://nodejs.org/)

### 2. Clone the Repository
```bash
git clone https://github.com/your-username/manga_colour.git
cd manga_colour
```

### 3. Backend Setup
Create and activate a virtual environment, then install dependencies:
```powershell
# Windows PowerShell
python -m venv .venv
.venv\Scripts\Activate.ps1

pip install -r requirements.txt
```

Verify your environment configuration:
```powershell
cp .env.example .env
```

### 4. Model Weights Placement
Ensure the pretrained ONNX colorization weights are located in `data/models/colorization/`:
```text
manga_colour/
└── data/
    └── models/
        └── colorization/
            └── manga-colorize-fp16.onnx  (approx. 61.6 MB)
```
> *Note: If the model file is absent, the backend automatically initializes in safe demo inference mode and notifies the user via API logs.*

### 5. Frontend Setup
```powershell
cd apps/web
npm install
cd ../..
```

---

## 🏃 Running the Application

### Launch Backend Server (FastAPI)
```powershell
$env:PYTHONPATH="apps/api"
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```
- **API Documentation**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check**: [http://localhost:8000/api/v1/system/health](http://localhost:8000/api/v1/system/health)

### Launch Frontend App (Vite + React)
```powershell
cd apps/web
npm run dev
```
- **Web Application**: [http://localhost:5173](http://localhost:5173)

---

## 🧪 Automated Testing

Blue Box Color Studio includes full automated unit and integration tests covering API endpoints, ONNX inference, queue management, storage optimization, and PDF exports.

Run tests using pytest:
```powershell
.venv\Scripts\pytest.exe
```

Test production frontend build:
```powershell
cd apps/web
npm run build
```

---

## 📂 Project Architecture

```text
manga_colour/
├── apps/
│   ├── api/                     # FastAPI Backend
│   │   ├── app/
│   │   │   ├── api/v1/          # Endpoints (Projects, Chapters, Jobs, Exports, Palettes)
│   │   │   ├── core/            # Config, Database engine, Storage abstraction
│   │   │   ├── models/          # SQLAlchemy ORM entities
│   │   │   ├── schemas/         # Pydantic request/response models
│   │   │   └── services/        # Colorizer, PDF Export, Archive unpacker, Worker
│   │   └── main.py              # Application entrypoint
│   └── web/                     # Vite + React Frontend
│       ├── src/
│       │   ├── components/      # Navbar, Reader, QA Slider, Layout
│       │   ├── context/         # ThemeContext (Light/Dark/System)
│       │   ├── pages/           # Dashboard, ProcessingCenter, ExportCenter, Settings
│       │   └── types/           # TypeScript API interfaces
│       └── tailwind.config.js
├── data/
│   └── models/                  # Neural network weights
├── storage/                     # Local file storage (originals, processed, exports)
├── tests/                       # Pytest test suite
├── .env.example                 # Sanitized configuration template
├── pytest.ini                   # Pytest configuration
└── README.md
```

---

## ❓ Troubleshooting & FAQs

### 1. CUDA Out of Memory (OOM) on 4GB VRAM
- The colorization engine automatically operates with memory-efficient patch tiling and OpenCV DNN AVX2 processing. If you encounter GPU VRAM constraints, set `CUDA_VISIBLE_DEVICES=""` in `.env` to execute via multi-threaded CPU acceleration.

### 2. Inverted Black Pages in PDF Readers
- Transparent PNG manga scans have an alpha channel. The export engine automatically composites pages over an opaque white background (`Image.new("RGB", size, (255, 255, 255))`) to avoid dark backgrounds in external readers.

### 3. Port Conflicts
- If port `8000` or `5173` is occupied, change the port in `.env` and specify `--port <PORT>` in the uvicorn or vite execution commands.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
