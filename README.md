# 🌸 Blue Box Color Studio

### AI Manga Colorization, Character Palettes & Webtoon Reading Studio

Colorize manga chapters, organize your projects, review AI-generated pages, and export your favorite chapters in a reader-friendly format.

**No powerful GPU? You can use the Google Colab notebook to run supported colorization workflows on a cloud GPU, then bring the generated images back into your local studio.**

[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-Frontend-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?logo=vite&logoColor=white)](https://vite.dev/)
[![Release](https://img.shields.io/badge/Release-v1.2.1-emerald.svg)](https://github.com/margacis2/manga_colour/releases)
[![Google Colab](https://img.shields.io/badge/Google_Colab-Cloud_GPU-F9AB00?logo=googlecolab&logoColor=black)](https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb)

---

## ✨ What is Blue Box Color Studio?

Blue Box Color Studio is a local-first manga colorization and reading application built for manga fans, artists, and fan-colorization projects.

It combines AI-assisted colorization with project organization, character color palettes, batch processing, quality review, compression, and manga export tools in one interface.

Whether you're working with a few pages or an entire chapter, the goal is to make the workflow easier to manage without requiring you to manually handle every image.

## 🚀 Key Features

### ☁️ 1. Google Colab — Colorize Without a Powerful GPU

Don't have a dedicated NVIDIA graphics card? The included Colab notebook provides an alternative way to run the supported AI colorization workflow using a cloud runtime.

- Run supported inference workloads on an available Google Colab GPU.
- Upload manga page images or prepare your input using the notebook's supported workflow.
- Process pages without relying entirely on your computer's GPU.
- Download the generated images and import them into your local studio.
- Keep your computer available for reading, organizing projects, and reviewing results while supported inference runs remotely.

**Best for:** laptops with integrated graphics, limited VRAM, or computers that struggle with local AI inference.

**Important:** Colab GPU availability, runtime limits, session disconnections, and storage restrictions depend on Google and your account. You may need to upload or download files manually. The notebook does not automatically make every feature of the local web application run in the cloud.

➡️ **[Open Google Colab](https://colab.research.google.com/)**

Notebook: [`notebooks/colab_colorization.ipynb`](notebooks/colab_colorization.ipynb)

Open the notebook from the repository, select **Open in Colab** if available, choose an available GPU runtime, and follow the notebook's setup and inference instructions.

### 🎨 2. AI Manga Colorization & Distinct Style Engine (v1.2.1)

- Colorize supported black-and-white manga pages with the configured AI model.
- Run supported inference locally using the configured backend.
- Choose from 3 distinct, edge-aware colorization aesthetics:
  - **Anime Soft Watercolor** (`anime_soft_watercolor`): Balanced pastel tones, gentle shading, warm natural skin tones, and soft watercolor rolloff inspired by *Blue Box*.
  - **Vibrant Shonen Action** (`vibrant_shonen_action`): High saturation (+42%), dynamic S-curve contrast, punchy primary reds and blues, and energetic action lighting.
  - **Dreamy Pastel Shojo** (`dreamy_pastel_shojo`): Delicate blush highlights, lifted luminous shadows, soft ethereal glow, and gentle romantic atmosphere.
- Clean line-art preservation keeps ink strokes deep black without color bleed or halos.
- Pure white speech bubble retention ensures dialogue text and margins remain clean paper white (#FFFFFF).
- Preserve original scans while saving generated colorized outputs separately.
- Review generated pages before accepting them into your final collection.

Colorization results vary depending on the source artwork, model, settings, and inference environment. AI-generated colors may require manual review.

### 🎭 3. Character Palettes

Maintain a more consistent appearance for recurring characters across pages and chapters.

- Configure character color palettes, including available skin, hair, and clothing colors.
- Reuse project palettes during supported processing workflows.
- Keep character colors organized with the manga project.
- Review pages for unwanted color changes or inconsistent character appearances.

Palette consistency depends on how the configured model and pipeline use palette information. A palette does not guarantee perfect character recognition or identical colors in every panel.

### ⚡ 4. Batch Processing & Job Queue

Manage chapter colorization without losing track of individual jobs.

- Queue processing tasks for manga pages.
- Track queued, processing, completed, failed, and cancelled jobs.
- View page counts and job progress.
- Cancel supported active jobs.
- Retry failed or incomplete tasks where supported.
- Delete eligible jobs with confirmation.
- Protect original manga scans from accidental modification.

The application uses job and task states to track processing. Actual progress and available actions depend on the current backend and worker state.

### 🔍 5. Manga Page Review & Quality Control

Inspect the original manga page alongside its generated colorized version.

- Compare original and colorized artwork.
- Inspect details such as line art, screentones, faces, and speech bubbles.
- Review page metadata and processing information.
- Add quality-assurance notes.
- Approve pages after checking their output.

This workflow helps identify pages that need another colorization attempt or manual correction.

### 📚 6. Manga Reader

Organize and read your imported manga chapters in one place.

- Browse projects and their chapters.
- Navigate through chapter pages.
- View original and processed artwork where available.
- Use optimized images for a smoother browsing experience.
- Keep manga content organized by project and chapter.

Reader functionality depends on the files imported and processed by the application.

### 📄 7. Webtoon-Style & Standard PDF Export

Export chapters in formats suited to different reading preferences.

**Webtoon Vertical**
- Arrange manga pages in chapter order as a vertical reading strip.
- Preserve image proportions.
- Configure spacing between pages.
- Choose an available output quality preset.

**Standard Manga PDF**
- Place images on individual PDF pages.
- Fit images proportionally to the page.
- Optionally include page numbers where supported.

Additional export features include image-mode handling, transparency compositing, and output validation.

Very long Webtoon PDF pages may not be supported by every PDF viewer. For compatibility, use standard paginated PDF when necessary.

### 🗜️ 8. Image Compression & Storage Optimization

Large manga chapters can consume substantial disk space. The studio includes tools to optimize supported generated images.

- Generate optimized image derivatives.
- Use WebP for supported web and reading workflows.
- Compare original and optimized storage usage.
- View available chapter and project storage statistics.
- Choose from supported quality presets.
- Keep original manga scans separate from optimized outputs.

Compression results depend on image format, dimensions, content, and quality settings. Lossy compression can reduce fine line-art and screentone quality, so retain the original scans.

### 🗂️ 9. Project Dashboard & Chapter Covers

Keep your manga collection organized.

- View manga projects from the Dashboard.
- Display first-page thumbnails when available.
- Browse chapter indexes and page counts.
- View available processing status.
- Open projects directly from the Dashboard.
- Delete projects through a confirmation flow.

Project deletion can affect related chapters, jobs, palettes, and generated files. Always review the confirmation dialog before proceeding.

### 🌙 10. Light Mode, Dark Mode & System Theme

Choose a comfortable interface for long reading or editing sessions.

- Light theme.
- Dark theme.
- System theme that follows your operating-system preference.
- Theme selection in Settings.
- Quick theme switching from the navigation bar.
- Persistent theme preference across sessions.

Theme changes are intended for the application interface and should not alter the actual colors of manga artwork.

---

## 🖥️ Hardware & Usage Options

| Your setup | Recommended approach |
|---|---|
| Computer with a compatible NVIDIA GPU | Try local AI inference |
| Laptop with 4 GB VRAM | Test local inference with suitable model settings; monitor memory usage |
| Integrated graphics or limited VRAM | Use the Colab notebook for supported inference workloads |
| Limited disk space | Use optimized derivatives and review storage usage |
| Large chapters | Process in manageable batches and use compression carefully |

### Local hardware

The application can run on Windows with Python and Node.js installed. Other operating systems may require adjustments to the setup commands.

An NVIDIA GPU is not automatically required for every application feature, but local AI inference can be limited by available memory, model requirements, and backend support.

**Google Colab is an alternative inference workflow, not a guarantee of unlimited or permanent free GPU access.**

---

## 🛠️ Installation — Local Application

### Prerequisites

- Python 3.11 or another version supported by the project's dependencies.
- Node.js and npm.
- Git.
- Sufficient disk space for the application, model files, manga images, and generated outputs.

### 1. Clone the repository

```bash
git clone https://github.com/margacis2/manga_colour.git
cd manga_colour
```

### 2. Configure the backend

In Windows PowerShell:

```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Check `.env.example` and configure the required settings for your environment. Do not commit secrets or private configuration values.

### 3. Install frontend dependencies

```powershell
cd apps/web
npm install
cd ../..
```

### 4. Configure the AI model

Follow the model setup instructions and use the exact checkpoint location expected by the current configuration.

Do not download model weights from untrusted sources. Check the model's original repository, license, and required files before use.

**Important:** a successful application startup does not prove that the real inference model is loaded. Verify the model files and backend logs before processing a complete chapter.

### 5. Start the backend

From the project root:

```powershell
$env:PYTHONPATH="apps/api"
.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

API documentation: [http://localhost:8000/docs](http://localhost:8000/docs)

### 6. Start the frontend

Open a second terminal:

```powershell
cd apps/web
npm run dev
```

Open the local URL printed by Vite, usually:

[http://localhost:5173](http://localhost:5173)

---

## ☁️ Using the Google Colab Notebook

The notebook is intended for users who cannot comfortably run the supported AI inference workflow on their own computer.

1. Open [`notebooks/colab_colorization.ipynb`](notebooks/colab_colorization.ipynb) in GitHub.
2. Choose **Open in Colab**, or upload the notebook to Google Colab.
3. Select a GPU runtime if one is available.
4. Follow the notebook's dependency installation and model setup cells.
5. Provide your own supported input images.
6. Run the inference cells and inspect the generated results.
7. Download the output images.
8. Import the results into your local Blue Box Color Studio project using the application's supported import workflow.

Notebook instructions and available options may change with the configured model and dependencies. If a runtime disconnects, you may need to rerun setup cells or upload your files again. Do not assume temporary Colab storage persists between sessions.

---

## 🧪 Development & Testing

Run backend tests from the repository root:

```powershell
.venv\Scripts\pytest.exe
```

Build the frontend:

```powershell
cd apps/web
npm run build
```

A successful test run does not replace testing the actual model, a real multi-page chapter, PDF exports, image compression, and project deletion with disposable test data.

---

## 📁 Project Structure

```text
manga_colour/
├── apps/
│   ├── api/                  # FastAPI backend
│   │   └── app/
│   │       ├── api/v1/       # API routes
│   │       ├── core/         # Configuration, database, storage
│   │       ├── models/       # Database models
│   │       ├── schemas/      # Request and response schemas
│   │       └── services/     # Colorization, jobs, export
│   └── web/                  # React + Vite frontend
├── notebooks/
│   └── colab_colorization.ipynb  # Colab inference workflow
├── data/
│   └── models/               # Local model files; do not commit weights
├── storage/                  # Local manga and generated files
├── tests/                    # Automated tests
├── .env.example              # Example configuration
├── .gitignore
└── README.md
```

Actual files and directories may vary between releases.

---

## 🔐 Privacy & Copyright

- The local application is designed to work with locally stored project files.
- When using Google Colab, files uploaded to the notebook are processed in the cloud environment; review Google's terms and privacy practices before uploading private content.
- Do not upload API keys, credentials, personal data, or private manga collections to a public repository.
- Only import or redistribute manga, artwork, and model files that you have permission to use.
- Keep copyrighted manga scans, generated chapter images, local databases, model weights, and temporary files out of public Git commits unless you have the appropriate rights.

---

## ⚠️ Troubleshooting

**The output looks like a yellow tint instead of proper colorization**

Check that the real pretrained model is loaded and that the configured inference pipeline is being used. A tint or blending fallback is not equivalent to neural manga colorization.

**The local GPU runs out of memory**

Try smaller batches or the Colab workflow supported by the notebook. Close other GPU-intensive applications and check the model's VRAM requirements.

**PDF export fails**

Try exporting a small chapter first, verify that the source images are readable, and use Standard Manga PDF if your PDF viewer cannot handle a very tall Webtoon page.

**Compression makes the artwork blurry**

Use a higher quality setting or a lossless format for fine line art and screentones. Keep the original scans.

**Colab disconnects**

Colab sessions have runtime and storage limits. Save or download generated outputs before the session ends.

---

## 🗺️ Roadmap

Potential areas for continued development include:

- More reliable cross-chapter character color consistency.
- Better page-level quality checks and retry workflows.
- Additional export formats and reader improvements.
- Improved model setup and hardware diagnostics.
- More convenient transfer of Colab-generated images into local projects.

Roadmap items are not promises that a feature is already implemented.

---

## 🙌 Contributing

Bug reports, reproducible test cases, and improvements are welcome.

Before submitting a change:

1. Explain the problem and the expected behavior.
2. Test backend changes with the relevant pytest tests.
3. Build the frontend after UI changes.
4. Avoid including manga scans, model weights, secrets, or personal data in commits.

---

## 📜 License & Attribution

The license for this application's code is determined by the repository's `LICENSE` file. Third-party models, dependencies, and pretrained weights may have separate licenses and usage restrictions.

Before redistributing a model or publishing a release, review its original license and include the required attribution.

---

**Built for manga fans who want to bring their favorite pages to life. 🌸**
