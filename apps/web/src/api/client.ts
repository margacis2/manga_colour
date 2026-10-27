import {
  Project,
  ChapterDetail,
  Page,
  CharacterProfile,
  Palette,
  ProcessingJob,
  HardwareStatus,
  ProviderInfo,
  ColorStyle,
  ExportJob
} from '../types';

const API_BASE = '/api/v1';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers: Record<string, string> = {
    ...(options?.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If not FormData, default content-type to application/json
  if (!(options?.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `HTTP Error ${res.status}`;
    try {
      const err = await res.json();
      errorMsg = err.detail || errorMsg;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  if (res.status === 204) {
    return {} as T;
  }

  return res.json();
}

export const api = {
  // Projects
  getProjects: () => request<Project[]>('/projects'),
  getProject: (id: string) => request<Project>(`/projects/${id}`),
  createProject: (title: string, description?: string) =>
    request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  deleteProject: (id: string) =>
    request<void>(`/projects/${id}`, { method: 'DELETE' }),

  // Chapters
  createChapter: (projectId: string, title: string, chapterNumber: number = 1.0) =>
    request<ChapterDetail>(`/chapters/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({ title, chapter_number: chapterNumber }),
    }),
  getChapter: (chapterId: string) => request<ChapterDetail>(`/chapters/${chapterId}`),
  deleteChapter: (chapterId: string) =>
    request<void>(`/chapters/${chapterId}`, { method: 'DELETE' }),
  importArchive: (chapterId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return request<ChapterDetail>(`/chapters/${chapterId}/import-archive`, {
      method: 'POST',
      body: formData,
    });
  },
  importImages: (chapterId: string, files: File[]) => {
    const formData = new FormData();
    files.forEach((f) => formData.append('files', f));
    return request<ChapterDetail>(`/chapters/${chapterId}/import-images`, {
      method: 'POST',
      body: formData,
    });
  },

  // Pages
  getPage: (pageId: string) => request<Page>(`/pages/${pageId}`),
  updatePageApproval: (pageId: string, approved: boolean) =>
    request<Page>(`/pages/${pageId}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ approved }),
    }),
  saveAnnotation: (pageId: string, annotation: { character_id?: string; manual_edits_json?: any; notes?: string }) =>
    request<{ status: string; annotation_id: string }>(`/pages/${pageId}/annotation`, {
      method: 'POST',
      body: JSON.stringify(annotation),
    }),

  // Palettes & Characters
  getCharacters: (projectId: string) =>
    request<CharacterProfile[]>(`/palettes/projects/${projectId}/characters`),
  createCharacter: (projectId: string, name: string, notes?: string) =>
    request<CharacterProfile>(`/palettes/projects/${projectId}/characters`, {
      method: 'POST',
      body: JSON.stringify({ name, notes }),
    }),
  deleteCharacter: (characterId: string) =>
    request<void>(`/palettes/characters/${characterId}`, { method: 'DELETE' }),

  getPalettes: (projectId: string) =>
    request<Palette[]>(`/palettes/projects/${projectId}/palettes`),
  createPalette: (projectId: string, paletteData: Partial<Palette>) =>
    request<Palette>(`/palettes/projects/${projectId}/palettes`, {
      method: 'POST',
      body: JSON.stringify(paletteData),
    }),
  deletePalette: (paletteId: string) =>
    request<void>(`/palettes/${paletteId}`, { method: 'DELETE' }),

  // Processing Jobs
  createJob: (jobData: {
    project_id: string;
    chapter_id?: string;
    page_ids?: string[];
    provider?: string;
    model_name?: string;
    skip_approved?: boolean;
    config?: any;
  }) =>
    request<ProcessingJob>('/jobs', {
      method: 'POST',
      body: JSON.stringify(jobData),
    }),
  getJobs: (projectId?: string) =>
    request<ProcessingJob[]>(`/jobs${projectId ? `?project_id=${projectId}` : ''}`),
  getJob: (jobId: string) => request<ProcessingJob>(`/jobs/${jobId}`),
  cancelJob: (jobId: string) => request<ProcessingJob>(`/jobs/${jobId}/cancel`, { method: 'POST' }),
  retryJob: (jobId: string) => request<ProcessingJob>(`/jobs/${jobId}/retry`, { method: 'POST' }),
  deleteJob: (jobId: string) => request<void>(`/jobs/${jobId}`, { method: 'DELETE' }),

  // System & Hardware
  getHardware: () => request<HardwareStatus>('/system/hardware'),
  getProviders: () => request<ProviderInfo[]>('/system/providers'),
  getStyles: () => request<ColorStyle[]>('/system/styles'),
  getHealth: () => request<{ status: string; app_name: string; mode: string }>('/system/health'),

  // Reading Progress
  getReadingProgress: (projectId: string, chapterId: string) =>
    request<any>(`/reading-progress/${projectId}/${chapterId}`),
  saveReadingProgress: (data: { project_id: string; chapter_id: string; last_read_page_number: number; scroll_position: number; completed: boolean }) =>
    request<any>('/reading-progress', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // Exports
  createExport: (data: {
    project_id: string;
    chapter_id?: string;
    format: string;
    include_colorized: boolean;
    pdf_mode?: 'standard' | 'webtoon';
    compression_quality?: 'original' | 'balanced' | 'small';
    include_page_numbers?: boolean;
    webtoon_gap?: number;
  }) =>
    request<ExportJob>('/exports', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
