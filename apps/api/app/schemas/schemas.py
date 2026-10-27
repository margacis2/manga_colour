from datetime import datetime
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, EmailStr, Field, ConfigDict

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    is_active: bool = True
    is_admin: bool = False

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6)
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# Project Schemas
class ProjectCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: Optional[str] = None

class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    cover_page_id: Optional[str] = None

class ChapterSummary(BaseModel):
    id: str
    chapter_number: float
    title: str
    sequence_order: int
    page_count: int
    created_at: datetime
    cover_thumbnail_url: Optional[str] = None
    first_page_id: Optional[str] = None
    processing_status: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProjectResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    cover_page_id: Optional[str] = None
    cover_thumbnail_url: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    chapters: List[ChapterSummary] = []
    model_config = ConfigDict(from_attributes=True)


# Chapter Schemas
class ChapterCreate(BaseModel):
    chapter_number: float = 1.0
    title: str = Field(min_length=1, max_length=255)
    sequence_order: int = 0

class ChapterUpdate(BaseModel):
    chapter_number: Optional[float] = None
    title: Optional[str] = None
    sequence_order: Optional[int] = None


# Page Schemas
class PageResponse(BaseModel):
    id: str
    chapter_id: str
    page_number: int
    original_filename: str
    original_file_path: str
    original_checksum: str
    original_width: Optional[int] = None
    original_height: Optional[int] = None
    current_output_path: Optional[str] = None
    current_output_checksum: Optional[str] = None
    thumbnail_path: Optional[str] = None
    processing_status: str
    approved: bool
    model_version: Optional[str] = None
    provider_name: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChapterDetailResponse(BaseModel):
    id: str
    project_id: str
    chapter_number: float
    title: str
    sequence_order: int
    page_count: int
    created_at: datetime
    pages: List[PageResponse] = []
    model_config = ConfigDict(from_attributes=True)

class PageApprovalUpdate(BaseModel):
    approved: bool

class PageAnnotationUpdate(BaseModel):
    character_id: Optional[str] = None
    manual_edits_json: Optional[Dict[str, Any]] = None
    notes: Optional[str] = None


# Character & Palette Schemas
class CharacterProfileCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    notes: Optional[str] = None

class PaletteCreate(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    character_id: Optional[str] = None
    hair_colors: List[str] = []
    eye_colors: List[str] = []
    skin_tones: List[str] = []
    clothing_colors: List[str] = []
    accessories_colors: List[str] = []
    extra_colors: List[str] = []
    is_default: bool = False

class PaletteResponse(PaletteCreate):
    id: str
    project_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CharacterReferenceResponse(BaseModel):
    id: str
    character_id: str
    image_storage_path: str
    approved_reference: bool
    notes: Optional[str] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class CharacterProfileResponse(BaseModel):
    id: str
    project_id: str
    name: str
    notes: Optional[str] = None
    created_at: datetime
    palettes: List[PaletteResponse] = []
    references: List[CharacterReferenceResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Processing Job Schemas
class JobCreate(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    page_ids: Optional[List[str]] = None
    provider: str = "local_gpu"
    model_name: str = "anime_soft_watercolor"
    config: Optional[Dict[str, Any]] = None
    skip_approved: bool = True

class ProcessingTaskResponse(BaseModel):
    id: str
    job_id: str
    page_id: str
    task_order: int
    status: str
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    error_message: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)

class ProcessingJobResponse(BaseModel):
    id: str
    project_id: str
    chapter_id: Optional[str] = None
    status: str
    provider: str
    model_name: str
    total_pages: int
    completed_pages: int
    failed_pages: int
    config_json: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime
    tasks: List[ProcessingTaskResponse] = []
    model_config = ConfigDict(from_attributes=True)


# Export Schemas
class ExportCreate(BaseModel):
    project_id: str
    chapter_id: Optional[str] = None
    format: str = "cbz"  # cbz | zip | pdf
    include_colorized: bool = True
    pdf_mode: Optional[str] = "standard"  # standard | webtoon
    compression_quality: Optional[str] = "balanced"  # original | balanced | small
    include_page_numbers: Optional[bool] = False
    webtoon_gap: Optional[int] = 0  # vertical gap in px for webtoon mode

class ExportJobResponse(BaseModel):
    id: str
    project_id: str
    chapter_id: Optional[str] = None
    format: str
    include_colorized: bool
    status: str
    output_storage_path: Optional[str] = None
    file_size_bytes: int = 0
    error_message: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# Reading Progress Schemas
class ReadingProgressUpdate(BaseModel):
    project_id: str
    chapter_id: str
    last_read_page_number: int
    scroll_position: float = 0.0
    completed: bool = False

class ReadingProgressResponse(ReadingProgressUpdate):
    id: str
    user_id: str
    updated_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# System & Hardware Schemas
class HardwareStatusResponse(BaseModel):
    gpu_available: bool
    gpu_name: Optional[str] = None
    gpu_memory_total_mb: Optional[float] = None
    gpu_memory_used_mb: Optional[float] = None
    gpu_memory_free_mb: Optional[float] = None
    cpu_percent: float
    ram_total_gb: float
    ram_used_gb: float
    torch_available: bool
    cuda_available: bool
    cuda_version: Optional[str] = None
    active_worker_running: bool
    default_provider: str
    model_weights_installed: bool = False


# Storage Optimization Schemas
class StorageStatsResponse(BaseModel):
    chapter_id: Optional[str] = None
    project_id: Optional[str] = None
    total_pages: int
    colorized_pages: int
    originals_size_bytes: int
    processed_size_bytes: int
    total_size_bytes: int
    potential_savings_bytes: int
    savings_percent: float

class OptimizeStorageRequest(BaseModel):
    preset: str = "balanced"  # high | balanced | small
    convert_to_webp: bool = True

class OptimizeStorageResult(BaseModel):
    pages_optimized: int
    before_bytes: int
    after_bytes: int
    bytes_saved: int
    percent_saved: float

