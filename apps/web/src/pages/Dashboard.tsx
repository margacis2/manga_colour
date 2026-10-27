import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  FolderPlus, 
  Upload, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Cpu, 
  ArrowRight,
  BookOpen,
  Trash2,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { api } from '../api/client';
import { Project } from '../types';

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');

  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ['jobs'],
    queryFn: () => api.getJobs(),
    refetchInterval: 5000,
  });

  const { data: hardware } = useQuery({
    queryKey: ['hardware'],
    queryFn: api.getHardware,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: api.getProviders,
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; description: string }) =>
      api.createProject(data.title, data.description),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsModalOpen(false);
      setNewTitle('');
      setNewDesc('');
    },
  });

  const deleteProjectMutation = useMutation({
    mutationFn: (projectId: string) => api.deleteProject(projectId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setProjectToDelete(null);
      setDeleteError(null);
    },
    onError: (err: any) => {
      setDeleteError(err.message || 'Failed to delete project.');
    },
  });

  // Calculate stats
  const totalProjects = projects.length;
  const totalChapters = projects.reduce((acc, p) => acc + (p.chapters?.length || 0), 0);
  const totalPages = projects.reduce(
    (acc, p) => acc + (p.chapters?.reduce((cAcc, c) => cAcc + (c.page_count || 0), 0) || 0),
    0
  );
  const completedJobsPages = jobs.reduce((acc, j) => acc + (j.completed_pages || 0), 0);
  const failedJobsPages = jobs.reduce((acc, j) => acc + (j.failed_pages || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-studio-500 via-studio-600 to-sakura-400 p-8 text-white shadow-xl shadow-studio-100">
        <div className="relative z-10 max-w-2xl space-y-3">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-sm text-white">
            <Sparkles className="w-3.5 h-3.5 mr-1 text-sakura-200" />
            AI Manga Colorization Studio
          </span>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
            Welcome to Blue Box Color Studio
          </h1>
          <p className="text-studio-100 text-sm sm:text-base leading-relaxed">
            Create vivid, full-color manga chapters with local NVIDIA GPU acceleration, character palette consistency, and vertical-scroll webtoon reading.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white text-studio-700 font-semibold text-sm shadow-md hover:bg-studio-50 transition active:scale-95"
            >
              <FolderPlus className="w-4 h-4 mr-2 text-studio-600" />
              New Project
            </button>
            <Link
              to="/import"
              className="inline-flex items-center px-4 py-2 rounded-xl bg-studio-700/40 hover:bg-studio-700/60 backdrop-blur-sm text-white font-semibold text-sm border border-white/20 transition active:scale-95"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Chapter
            </Link>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-studio-50 flex items-center justify-center text-studio-600">
            <BookOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Projects</p>
            <p className="text-2xl font-bold text-slate-800">{totalProjects}</p>
            <p className="text-xs text-slate-500">{totalChapters} chapters ({totalPages} pages)</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Colorized Pages</p>
            <p className="text-2xl font-bold text-slate-800">{completedJobsPages}</p>
            <p className="text-xs text-emerald-600 font-medium">Successfully processed</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Failed / Retried</p>
            <p className="text-2xl font-bold text-slate-800">{failedJobsPages}</p>
            <p className="text-xs text-slate-500">Zero data loss</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">GPU Engine</p>
            <p className="text-base font-bold text-slate-800 truncate">
              {hardware?.gpu_available ? 'RTX 3050 Laptop' : 'CPU Mode'}
            </p>
            <p className="text-xs text-slate-500">
              {hardware?.gpu_memory_free_mb ? `${Math.round(hardware.gpu_memory_free_mb)} MB Free` : 'Ready'}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content Grid: Projects & Jobs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Projects List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800 flex items-center">
              <span>Your Manga Projects</span>
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-semibold bg-studio-100 text-studio-700">
                {projects.length}
              </span>
            </h2>
            <Link to="/library" className="text-xs font-semibold text-studio-600 hover:text-studio-700 flex items-center">
              View All <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </div>

          {loadingProjects ? (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-100">
              <div className="animate-spin w-6 h-6 border-2 border-studio-500 border-t-transparent rounded-full mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Loading library...</p>
            </div>
          ) : projects.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-studio-50 text-studio-500 flex items-center justify-center mx-auto">
                <FolderPlus className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">No projects yet</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a project to organize chapters, manage character palettes, and start fan-colorization.
              </p>
              <button
                onClick={() => setIsModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-studio-600 hover:bg-studio-700 text-white font-medium text-xs shadow transition"
              >
                Create First Project
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {projects.slice(0, 4).map((project) => (
                <div
                  key={project.id}
                  className="bg-white rounded-3xl p-5 border border-slate-100 hover:border-studio-200 hover:shadow-md transition group space-y-4"
                >
                  <div className="flex flex-col sm:flex-row gap-4">
                    {/* Project Cover / First Page Thumbnail */}
                    <div className="w-24 h-32 rounded-2xl overflow-hidden bg-slate-100 flex-shrink-0 border border-slate-100 shadow-sm relative">
                      {project.cover_thumbnail_url ? (
                        <img
                          src={project.cover_thumbnail_url}
                          alt={project.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50">
                          <BookOpen className="w-8 h-8" />
                          <span className="text-[10px] text-slate-400 mt-1">No Scans</span>
                        </div>
                      )}
                    </div>

                    {/* Project Info & Metadata */}
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <Link
                          to={`/library?project_id=${project.id}`}
                          className="text-base font-bold text-slate-800 hover:text-studio-600 transition truncate"
                        >
                          {project.title}
                        </Link>
                        <div className="flex items-center space-x-1">
                          <span className="text-[11px] text-slate-400">
                            {new Date(project.created_at).toLocaleDateString()}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setDeleteError(null);
                              setProjectToDelete(project);
                            }}
                            className="p-1 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition ml-1"
                            title="Delete Manga Project"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {project.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      {/* Chapter Cover & First-Page Index */}
                      {project.chapters && project.chapters.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Chapter Index ({project.chapters.length})
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {project.chapters.slice(0, 3).map((c) => (
                              <Link
                                key={c.id}
                                to={`/editor?chapter_id=${c.id}`}
                                className="flex items-center space-x-2 p-1.5 pr-2.5 rounded-xl bg-slate-50 hover:bg-studio-50 border border-slate-100 transition group/chip"
                              >
                                <div className="w-6 h-8 rounded-lg overflow-hidden bg-slate-200 flex-shrink-0">
                                  {c.cover_thumbnail_url ? (
                                    <img
                                      src={c.cover_thumbnail_url}
                                      alt={`Ch. ${c.chapter_number}`}
                                      loading="lazy"
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[9px] text-slate-400">
                                      {c.chapter_number}
                                    </div>
                                  )}
                                </div>
                                <div className="text-[11px]">
                                  <div className="font-bold text-slate-700 group-hover/chip:text-studio-700">
                                    Ch. {c.chapter_number}
                                  </div>
                                  <div className="text-[10px] text-slate-400">
                                    {c.page_count} pages • {c.processing_status || 'ready'}
                                  </div>
                                </div>
                              </Link>
                            ))}
                            {project.chapters.length > 3 && (
                              <Link
                                to={`/library?project_id=${project.id}`}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[11px] font-semibold text-slate-500 flex items-center"
                              >
                                +{project.chapters.length - 3} more
                              </Link>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      {project.chapters?.length || 0} chapters •{' '}
                      {project.chapters?.reduce((acc, c) => acc + (c.page_count || 0), 0) || 0} pages total
                    </span>
                    <div className="flex space-x-2">
                      <Link
                        to={`/import?project_id=${project.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 hover:bg-studio-50 text-slate-700 hover:text-studio-700 transition"
                      >
                        Import Chapter
                      </Link>
                      <Link
                        to={`/library?project_id=${project.id}`}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold bg-studio-600 hover:bg-studio-700 text-white shadow-sm shadow-studio-200 transition"
                      >
                        Open Studio
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Jobs & Providers Sidebar */}
        <div className="space-y-6">
          {/* Active / Recent Jobs */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 flex items-center">
                <Layers className="w-4 h-4 mr-1.5 text-studio-600" />
                Recent Processing Jobs
              </h3>
              <Link to="/processing" className="text-xs font-semibold text-studio-600 hover:text-studio-700">
                Center
              </Link>
            </div>

            {jobs.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">No recent processing tasks</p>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 3).map((job) => (
                  <div key={job.id} className="p-3 bg-slate-50 rounded-xl space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-slate-700 uppercase tracking-wider text-[10px]">
                        Job {job.id.slice(0, 8)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                        job.status === 'processing' ? 'bg-studio-100 text-studio-800 animate-pulse' :
                        job.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {job.status}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-studio-500 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${job.total_pages ? (job.completed_pages / job.total_pages) * 100 : 0}%`
                        }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500">
                      <span>{job.completed_pages} / {job.total_pages} pages</span>
                      <span>{job.provider}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Engine Providers */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
            <h3 className="text-sm font-bold text-slate-800">Processing Destinations</h3>
            <div className="space-y-2">
              {providers.map((p) => (
                <div key={p.id} className="p-2.5 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800">{p.name}</span>
                    <p className="text-[11px] text-slate-400">{p.description}</p>
                  </div>
                  {p.recommended && (
                    <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sakura-100 text-sakura-600">
                      Primary
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Create New Manga Project</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Project Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Blue Box Chapter 1-10 Fan Color"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Description
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Notes about translation, character color consistency..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium transition"
              >
                Cancel
              </button>
              <button
                disabled={!newTitle.trim() || createMutation.isPending}
                onClick={() => createMutation.mutate({ title: newTitle.trim(), description: newDesc.trim() })}
                className="px-5 py-2 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white text-xs font-semibold shadow transition"
              >
                {createMutation.isPending ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Project Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                Delete "{projectToDelete.title}"?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will permanently delete this manga project including all its chapters ({projectToDelete.chapters?.length || 0}), pages, colorized artwork, and custom character palettes.
              </p>
              <div className="p-3 bg-amber-50 rounded-2xl text-[11px] text-amber-800 text-left space-y-1">
                <strong>Safety Guard:</strong>
                <div>If any batch colorization job is currently running on this project, deletion will be blocked until the job is cancelled or finished.</div>
              </div>
              {deleteError && (
                <div className="p-3 bg-rose-50 rounded-2xl text-xs text-rose-700 font-semibold text-left">
                  {deleteError}
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setProjectToDelete(null);
                  setDeleteError(null);
                }}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteProjectMutation.isPending}
                onClick={() => deleteProjectMutation.mutate(projectToDelete.id)}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {deleteProjectMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Project...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
