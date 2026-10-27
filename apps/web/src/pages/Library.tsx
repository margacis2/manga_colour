import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  BookOpen, 
  Trash2, 
  Plus, 
  Upload, 
  Play, 
  CheckCircle2, 
  Folder,
  Layers,
  Eye
} from 'lucide-react';
import { api } from '../api/client';
import { ChapterDetail } from '../types';

export const Library: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project_id');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);

  const [newChapterTitle, setNewChapterTitle] = useState('');
  const [newChapterNum, setNewChapterNum] = useState<number>(1);
  const [isChapterModalOpen, setIsChapterModalOpen] = useState(false);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const { data: chapterDetail, isLoading: loadingChapter } = useQuery({
    queryKey: ['chapter', selectedChapterId],
    queryFn: () => (selectedChapterId ? api.getChapter(selectedChapterId) : null),
    enabled: !!selectedChapterId,
  });

  // Auto-select first chapter when project opens
  React.useEffect(() => {
    if (activeProject?.chapters && activeProject.chapters.length > 0 && !selectedChapterId) {
      setSelectedChapterId(activeProject.chapters[0].id);
    }
  }, [activeProject, selectedChapterId]);

  const createChapterMutation = useMutation({
    mutationFn: (data: { projectId: string; title: string; num: number }) =>
      api.createChapter(data.projectId, data.title, data.num),
    onSuccess: (newChap) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedChapterId(newChap.id);
      setIsChapterModalOpen(false);
      setNewChapterTitle('');
      setNewChapterNum((prev) => prev + 1);
    },
  });

  const deleteChapterMutation = useMutation({
    mutationFn: (id: string) => api.deleteChapter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setSelectedChapterId(null);
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => api.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });

  if (projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <Folder className="w-16 h-16 text-studio-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">Your Library is Empty</h2>
        <p className="text-slate-500 text-sm max-w-md mx-auto">
          Start by creating your first project from the dashboard or directly import a chapter archive.
        </p>
        <Link
          to="/"
          className="inline-flex items-center px-4 py-2 rounded-xl bg-studio-600 text-white font-semibold text-sm shadow hover:bg-studio-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Project Selector Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Current Project:
          </label>
          <select
            value={activeProject?.id || ''}
            onChange={(e) => {
              setSearchParams({ project_id: e.target.value });
              setSelectedChapterId(null);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-studio-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {activeProject && (
            <>
              <button
                onClick={() => setIsChapterModalOpen(true)}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-studio-50 hover:bg-studio-100 text-studio-700 text-xs font-semibold transition"
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add Chapter
              </button>
              <Link
                to={`/import?project_id=${activeProject.id}`}
                className="inline-flex items-center px-3 py-1.5 rounded-xl bg-studio-600 hover:bg-studio-700 text-white text-xs font-semibold shadow transition"
              >
                <Upload className="w-3.5 h-3.5 mr-1" />
                Import Pages
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete project "${activeProject.title}" and all its chapters?`)) {
                    deleteProjectMutation.mutate(activeProject.id);
                  }
                }}
                className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                title="Delete Project"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Chapters & Pages Layout */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Chapter List Column */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
            Chapters ({activeProject?.chapters?.length || 0})
          </h3>
          <div className="space-y-2">
            {activeProject?.chapters?.map((chap) => {
              const isSelected = chap.id === selectedChapterId;
              return (
                <div
                  key={chap.id}
                  onClick={() => setSelectedChapterId(chap.id)}
                  className={`p-3 rounded-2xl cursor-pointer border transition flex items-center justify-between ${
                    isSelected
                      ? 'bg-studio-50 border-studio-200 text-studio-900 shadow-sm'
                      : 'bg-white border-slate-100 hover:border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="truncate pr-2">
                    <p className="text-xs font-bold truncate">{chap.title}</p>
                    <p className="text-[11px] text-slate-400">
                      Ch. {chap.chapter_number} • {chap.page_count} pages
                    </p>
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-studio-500 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Page Grid Column */}
        <div className="md:col-span-3 space-y-4">
          {chapterDetail ? (
            <>
              {/* Chapter Action Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div>
                  <h2 className="text-base font-bold text-slate-800">
                    {chapterDetail.title}
                  </h2>
                  <p className="text-xs text-slate-400">
                    {chapterDetail.pages?.length || 0} pages imported
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Link
                    to={`/reader?project_id=${activeProject.id}&chapter_id=${chapterDetail.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-studio-600 hover:bg-studio-700 text-white text-xs font-semibold shadow transition"
                  >
                    <Eye className="w-3.5 h-3.5 mr-1" />
                    Read Vertical Manga
                  </Link>
                  <Link
                    to={`/processing?project_id=${activeProject.id}&chapter_id=${chapterDetail.id}`}
                    className="inline-flex items-center px-3 py-1.5 rounded-xl bg-sakura-50 hover:bg-sakura-100 text-sakura-600 text-xs font-semibold transition"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" />
                    Batch Colorize
                  </Link>
                  <button
                    onClick={() => {
                      if (confirm(`Delete chapter "${chapterDetail.title}"?`)) {
                        deleteChapterMutation.mutate(chapterDetail.id);
                      }
                    }}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title="Delete Chapter"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pages Grid */}
              {chapterDetail.pages && chapterDetail.pages.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {chapterDetail.pages.map((page) => (
                    <div
                      key={page.id}
                      className="group relative bg-white rounded-2xl overflow-hidden border border-slate-100 shadow-sm hover:shadow-md hover:border-studio-200 transition"
                    >
                      {/* Thumbnail Container */}
                      <div className="aspect-[3/4] bg-slate-100 relative overflow-hidden flex items-center justify-center">
                        <img
                          src={`/api/v1/pages/${page.id}/thumbnail`}
                          alt={`Page ${page.page_number}`}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {/* Status Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 text-white backdrop-blur-sm">
                            p. {page.page_number}
                          </span>
                          {page.approved && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500 text-white">
                              <CheckCircle2 className="w-2.5 h-2.5 mr-1" />
                              Approved
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay */}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 p-2">
                          <Link
                            to={`/editor?page_id=${page.id}`}
                            className="px-3 py-1.5 rounded-xl bg-white text-slate-800 text-xs font-semibold shadow hover:bg-studio-50 transition"
                          >
                            Review & Edit
                          </Link>
                        </div>
                      </div>

                      {/* Footer Info */}
                      <div className="p-2.5 flex items-center justify-between text-[11px] text-slate-500">
                        <span className="truncate max-w-[120px]" title={page.original_filename}>
                          {page.original_filename}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-semibold ${
                          page.processing_status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {page.processing_status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
                  <p className="text-sm font-semibold text-slate-700">No pages in this chapter</p>
                  <p className="text-xs text-slate-400">Import a CBZ or ZIP archive or drag individual manga pages.</p>
                  <Link
                    to={`/import?project_id=${activeProject.id}&chapter_id=${chapterDetail.id}`}
                    className="inline-flex items-center px-4 py-2 rounded-xl bg-studio-600 text-white font-semibold text-xs shadow hover:bg-studio-700 transition"
                  >
                    Import to this Chapter
                  </Link>
                </div>
              )}
            </>
          ) : (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 text-slate-400 text-sm">
              Select or create a chapter to inspect pages.
            </div>
          )}
        </div>
      </div>

      {/* Add Chapter Modal */}
      {isChapterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Add Chapter</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chapter Number
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={newChapterNum}
                  onChange={(e) => setNewChapterNum(parseFloat(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Chapter Title
                </label>
                <input
                  type="text"
                  value={newChapterTitle}
                  onChange={(e) => setNewChapterTitle(e.target.value)}
                  placeholder="e.g. Chapter 2: Morning Practice"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsChapterModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!newChapterTitle.trim() || createChapterMutation.isPending}
                onClick={() =>
                  createChapterMutation.mutate({
                    projectId: activeProject.id,
                    title: newChapterTitle.trim(),
                    num: newChapterNum,
                  })
                }
                className="px-4 py-1.5 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                {createChapterMutation.isPending ? 'Adding...' : 'Add Chapter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
