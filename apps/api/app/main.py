from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path

from app.core.config import settings
from app.core.database import engine, Base
from app.models import entities  # ensure models are registered
from app.api.v1 import (
    auth,
    projects,
    chapters,
    pages,
    palettes,
    jobs,
    system,
    exports,
    reading
)

# Create database tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    description="Complete Full-Stack AI Manga Colorization Web Application with GPU Acceleration & Batch Processing",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API Routers
app.include_router(auth.router, prefix="/api/v1")
app.include_router(projects.router, prefix="/api/v1")
app.include_router(chapters.router, prefix="/api/v1")
app.include_router(pages.router, prefix="/api/v1")
app.include_router(palettes.router, prefix="/api/v1")
app.include_router(jobs.router, prefix="/api/v1")
app.include_router(system.router, prefix="/api/v1")
app.include_router(exports.router, prefix="/api/v1")
app.include_router(reading.router, prefix="/api/v1")

@app.get("/")
def root():
    return {
        "message": f"Welcome to {settings.APP_NAME} API",
        "docs": "/docs",
        "health": "/api/v1/system/health"
    }
