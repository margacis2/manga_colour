import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, ForeignKey, Text, JSON, Enum
)
from sqlalchemy.orm import relationship
from app.core.database import Base

def generate_uuid() -> str:
    return uuid.uuid4().hex

class User(Base):
    __tablename__ = "users"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    projects = relationship("Project", back_populates="owner", cascade="all, delete-orphan")
    jobs = relationship("ProcessingJob", back_populates="user", cascade="all, delete-orphan")
    reading_progress = relationship("ReadingProgress", back_populates="user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=True)
    cover_page_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    owner = relationship("User", back_populates="projects")
    chapters = relationship("Chapter", back_populates="project", cascade="all, delete-orphan", order_by="Chapter.sequence_order")
    character_profiles = relationship("CharacterProfile", back_populates="project", cascade="all, delete-orphan")
    palettes = relationship("Palette", back_populates="project", cascade="all, delete-orphan")

    @property
    def cover_thumbnail_url(self):
        for ch in self.chapters:
            url = ch.cover_thumbnail_url
            if url:
                return url
        return None


class Chapter(Base):
    __tablename__ = "chapters"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_number = Column(Float, nullable=False, default=1.0)
    title = Column(String(255), nullable=False)
    sequence_order = Column(Integer, default=0, index=True)
    page_count = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="chapters")
    pages = relationship("Page", back_populates="chapter", cascade="all, delete-orphan", order_by="Page.page_number")

    @property
    def cover_thumbnail_url(self):
        if self.pages:
            first_p = self.pages[0]
            if first_p.thumbnail_path:
                return f"/api/v1/pages/{first_p.id}/thumbnail"
            elif first_p.current_output_path:
                return f"/api/v1/pages/{first_p.id}/output"
            elif first_p.original_file_path:
                return f"/api/v1/pages/{first_p.id}/original"
        return None

    @property
    def first_page_id(self):
        if self.pages:
            return self.pages[0].id
        return None

    @property
    def processing_status(self):
        if not self.pages:
            return "empty"
        completed = sum(1 for p in self.pages if p.processing_status == "completed")
        if completed == len(self.pages):
            return "completed"
        if any(p.processing_status == "processing" for p in self.pages):
            return "processing"
        if any(p.processing_status == "failed" for p in self.pages):
            return "failed"
        if any(p.processing_status in ("queued", "preparing") for p in self.pages):
            return "queued"
        return "pending"


class Page(Base):
    __tablename__ = "pages"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    page_number = Column(Integer, nullable=False, index=True)
    original_filename = Column(String(255), nullable=False)
    
    # Storage keys (safe UUID keys, not raw user paths)
    original_file_path = Column(String(255), nullable=False)
    original_checksum = Column(String(64), nullable=False, index=True)
    original_width = Column(Integer, nullable=True)
    original_height = Column(Integer, nullable=True)
    
    current_output_path = Column(String(255), nullable=True)
    current_output_checksum = Column(String(64), nullable=True)
    thumbnail_path = Column(String(255), nullable=True)
    
    # State tracking: pending | queued | processing | completed | failed
    processing_status = Column(String(32), default="pending", index=True)
    approved = Column(Boolean, default=False, index=True)
    
    # Model & engine details
    model_version = Column(String(64), nullable=True)
    provider_name = Column(String(64), nullable=True)
    job_settings = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    chapter = relationship("Chapter", back_populates="pages")
    annotations = relationship("PageAnnotation", back_populates="page", cascade="all, delete-orphan")
    tasks = relationship("ProcessingTask", back_populates="page", cascade="all, delete-orphan")


class CharacterProfile(Base):
    __tablename__ = "character_profiles"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="character_profiles")
    references = relationship("CharacterReference", back_populates="character", cascade="all, delete-orphan")
    palettes = relationship("Palette", back_populates="character", cascade="all, delete-orphan")


class CharacterReference(Base):
    __tablename__ = "character_references"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    character_id = Column(String(36), ForeignKey("character_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    image_storage_path = Column(String(255), nullable=False)
    approved_reference = Column(Boolean, default=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    character = relationship("CharacterProfile", back_populates="references")


class Palette(Base):
    __tablename__ = "palettes"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    character_id = Column(String(36), ForeignKey("character_profiles.id", ondelete="CASCADE"), nullable=True, index=True)
    name = Column(String(255), nullable=False)
    
    # Color hex arrays: e.g. ["#332211", "#553322"]
    hair_colors = Column(JSON, default=list)
    eye_colors = Column(JSON, default=list)
    skin_tones = Column(JSON, default=list)
    clothing_colors = Column(JSON, default=list)
    accessories_colors = Column(JSON, default=list)
    extra_colors = Column(JSON, default=list)
    
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    project = relationship("Project", back_populates="palettes")
    character = relationship("CharacterProfile", back_populates="palettes")


class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # State: queued | preparing | processing | validating | paused | completed | failed | cancelled
    status = Column(String(32), default="queued", index=True)
    provider = Column(String(64), default="local_gpu")
    model_name = Column(String(64), default="manga_color_v1")
    
    total_pages = Column(Integer, default=0)
    completed_pages = Column(Integer, default=0)
    failed_pages = Column(Integer, default=0)
    
    config_json = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="jobs")
    tasks = relationship("ProcessingTask", back_populates="job", cascade="all, delete-orphan", order_by="ProcessingTask.task_order")


class ProcessingTask(Base):
    __tablename__ = "processing_tasks"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    job_id = Column(String(36), ForeignKey("processing_jobs.id", ondelete="CASCADE"), nullable=False, index=True)
    page_id = Column(String(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True)
    task_order = Column(Integer, default=0)
    
    # State: queued | preparing | processing | validating | completed | failed | cancelled
    status = Column(String(32), default="queued", index=True)
    retry_count = Column(Integer, default=0)
    
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    error_message = Column(Text, nullable=True)
    log_output = Column(Text, nullable=True)

    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    job = relationship("ProcessingJob", back_populates="tasks")
    page = relationship("Page", back_populates="tasks")


class ModelInstallation(Base):
    __tablename__ = "model_installations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    model_key = Column(String(64), unique=True, nullable=False, index=True)
    name = Column(String(255), nullable=False)
    version = Column(String(32), nullable=False)
    architecture = Column(String(64), nullable=False)
    license = Column(String(64), nullable=False)
    is_downloaded = Column(Boolean, default=False)
    local_path = Column(String(255), nullable=True)
    vram_required_gb = Column(Float, default=2.0)
    supports_lineart = Column(Boolean, default=True)
    checksum = Column(String(64), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class ProviderConfiguration(Base):
    __tablename__ = "provider_configurations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    provider_type = Column(String(64), nullable=False, unique=True)  # local_gpu, local_cpu, colab, remote_worker
    name = Column(String(255), nullable=False)
    is_enabled = Column(Boolean, default=True)
    endpoint_url = Column(String(255), nullable=True)
    auth_token = Column(String(255), nullable=True)
    max_concurrency = Column(Integer, default=1)
    is_default = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))


class PageAnnotation(Base):
    __tablename__ = "page_annotations"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    page_id = Column(String(36), ForeignKey("pages.id", ondelete="CASCADE"), nullable=False, index=True)
    character_id = Column(String(36), ForeignKey("character_profiles.id", ondelete="SET NULL"), nullable=True)
    mask_storage_path = Column(String(255), nullable=True)
    manual_edits_json = Column(JSON, nullable=True)  # Stores brush strokes, fills, overlays
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    page = relationship("Page", back_populates="annotations")


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=True)
    format = Column(String(16), default="cbz")  # cbz | zip | pdf
    include_colorized = Column(Boolean, default=True)
    status = Column(String(32), default="pending")  # pending | processing | completed | failed
    output_storage_path = Column(String(255), nullable=True)
    file_size_bytes = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    completed_at = Column(DateTime, nullable=True)


class ReadingProgress(Base):
    __tablename__ = "reading_progress"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    project_id = Column(String(36), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    chapter_id = Column(String(36), ForeignKey("chapters.id", ondelete="CASCADE"), nullable=False, index=True)
    last_read_page_number = Column(Integer, default=1)
    scroll_position = Column(Float, default=0.0)
    completed = Column(Boolean, default=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reading_progress")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(64), nullable=False)
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(36), nullable=True)
    details_json = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
