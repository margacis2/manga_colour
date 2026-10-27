export interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface ChapterSummary {
  id: string;
  chapter_number: number;
  title: string;
  sequence_order: number;
  page_count: number;
  created_at: string;
  cover_thumbnail_url?: string;
  first_page_id?: string;
  processing_status?: string;
}

export interface Project {
  id: string;
  title: string;
  description?: string;
  cover_page_id?: string;
  cover_thumbnail_url?: string;
  created_at: string;
  updated_at: string;
  chapters: ChapterSummary[];
}

export interface Page {
  id: string;
  chapter_id: string;
  page_number: number;
  original_filename: string;
  original_file_path: string;
  original_checksum: string;
  original_width?: number;
  original_height?: number;
  current_output_path?: string;
  current_output_checksum?: string;
  thumbnail_path?: string;
  processing_status: 'pending' | 'queued' | 'preparing' | 'processing' | 'validating' | 'completed' | 'failed' | 'cancelled';
  approved: boolean;
  model_version?: string;
  provider_name?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface ChapterDetail {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string;
  sequence_order: number;
  page_count: number;
  created_at: string;
  pages: Page[];
}

export interface Palette {
  id: string;
  project_id?: string;
  character_id?: string;
  name: string;
  hair_colors: string[];
  eye_colors: string[];
  skin_tones: string[];
  clothing_colors: string[];
  accessories_colors: string[];
  extra_colors: string[];
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export interface CharacterProfile {
  id: string;
  project_id: string;
  name: string;
  notes?: string;
  created_at: string;
  palettes: Palette[];
  references: Array<{
    id: string;
    character_id: string;
    image_storage_path: string;
    approved_reference: boolean;
    notes?: string;
    created_at: string;
  }>;
}

export interface ProcessingTask {
  id: string;
  job_id: string;
  page_id: string;
  task_order: number;
  status: string;
  retry_count: number;
  started_at?: string;
  completed_at?: string;
  error_message?: string;
}

export interface ProcessingJob {
  id: string;
  project_id: string;
  chapter_id?: string;
  status: 'queued' | 'preparing' | 'processing' | 'validating' | 'paused' | 'completed' | 'failed' | 'cancelled';
  provider: string;
  model_name: string;
  total_pages: number;
  completed_pages: number;
  failed_pages: number;
  config_json?: any;
  error_message?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  tasks: ProcessingTask[];
}

export interface HardwareStatus {
  gpu_available: boolean;
  gpu_name?: string;
  gpu_memory_total_mb?: number;
  gpu_memory_used_mb?: number;
  gpu_memory_free_mb?: number;
  cpu_percent: number;
  ram_total_gb: number;
  ram_used_gb: number;
  torch_available: boolean;
  cuda_available: boolean;
  cuda_version?: string;
  active_worker_running: boolean;
  default_provider: string;
}

export interface ProviderInfo {
  id: string;
  name: string;
  description: string;
  is_available: boolean;
  recommended: boolean;
}

export interface ExportJob {
  id: string;
  project_id: string;
  chapter_id?: string;
  format: 'cbz' | 'zip' | 'pdf';
  include_colorized: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  output_storage_path?: string;
  file_size_bytes: number;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}
