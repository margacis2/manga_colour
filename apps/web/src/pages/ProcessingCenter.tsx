import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  Layers, 
  Play, 
  CheckCircle2, 
  AlertCircle, 
  RotateCw, 
  XCircle, 
  Cpu, 
  Clock, 
  Check, 
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  BookOpen,
  Trash2,
  AlertTriangle,
  Filter,
  Cloud
} from 'lucide-react';
import { api } from '../api/client';
import { ProcessingJob, ProcessingTask } from '../types';

export const ProcessingCenter: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project_id') || '';
  const initialChapterId = searchParams.get('chapter_id') || '';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapterId);
  const [selectedProvider, setSelectedProvider] = useState<string>('local_gpu');
  const [selectedModel, setSelectedModel] = useState<string>('anime_soft');
  const [skipApproved, setSkipApproved] = useState<boolean>(true);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled'>('all');
  const [jobToDelete, setJobToDelete] = useState<ProcessingJob | null>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  React.useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  const { data: jobs = [], isLoading: loadingJobs } = useQuery({
    queryKey: ['jobs', selectedProjectId],
    queryFn: () => api.getJobs(selectedProjectId || undefined),
    refetchInterval: 3000,
  });

  const { data: hardware } = useQuery({
    queryKey: ['hardware'],
    queryFn: api.getHardware,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: api.getProviders,
  });

  const createJobMutation = useMutation({
    mutationFn: () =>
      api.createJob({
        project_id: selectedProjectId,
        chapter_id: selectedChapterId || undefined,
        provider: selectedProvider,
        model_name: selectedModel,
        skip_approved: skipApproved,
      }),
    onSuccess: (newJob) => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setExpandedJobId(newJob.id);
    },
  });

  const cancelJobMutation = useMutation({
    mutationFn: (jobId: string) => api.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const retryJobMutation = useMutation({
    mutationFn: (jobId: string) => api.retryJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: (jobId: string) => api.deleteJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      setJobToDelete(null);
    },
  });

  const colorStyles = [
    {
      id: 'anime_soft',
      name: 'Anime Soft Watercolor',
      desc: 'Balanced pastel tones, gentle shading, perfect for romance and slice of life (Blue Box style).',
    },
    {
      id: 'vibrant_shonen',
      name: 'Vibrant Shonen Action',
      desc: 'High saturation, dynamic contrast, punchy primary colors for high-energy scenes.',
    },
    {
      id: 'pastel_shojo',
      name: 'Dreamy Pastel Shojo',
      desc: 'Soft warm aesthetic, light highlights, low contrast for emotional pages.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center">
            <Layers className="w-6 h-6 mr-2 text-studio-600" />
            Batch Colorization Engine
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Accelerated manga colorization pipeline. Preserves line art, speech text bubbles, and applies character palette consistency.
          </p>
        </div>

        {/* Live GPU Badge */}
        <div className="flex items-center space-x-3 px-4 py-2 bg-slate-50 rounded-2xl border border-slate-200 text-xs">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
          <span className="font-semibold text-slate-700">
            {hardware?.gpu_available ? 'NVIDIA GPU Accelerated' : 'CPU Inference'}
          </span>
          {hardware?.gpu_memory_free_mb && (
            <span className="text-slate-400">
              ({Math.round(hardware.gpu_memory_free_mb)} MB Free)
            </span>
          )}
        </div>
      </div>

      {/* Model Weights Missing Warning Banner */}
      {hardware && (hardware as any).model_weights_installed === false && (
        <div className="p-4 rounded-3xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-sm flex items-start space-x-3.5">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-900 dark:text-amber-100">AI Model Weights Not Installed On This Computer</h4>
            <p className="text-amber-700 dark:text-amber-300 leading-relaxed">
              The required ONNX weights file (<code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-[11px] font-mono">data/models/colorization/manga-colorize-fp16.onnx</code>) is missing on this machine. Git excludes heavy model binaries (~61.6 MB).
            </p>
            <div className="pt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="font-semibold text-amber-950 dark:text-amber-100">Ways to run:</span>
              <span>1. Copy the model file into <code className="bg-amber-100 dark:bg-amber-900/60 px-1 rounded font-mono">data/models/colorization/</code></span>
              <span>•</span>
              <a
                href="https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb"
                target="_blank"
                rel="noreferrer"
                className="font-bold text-amber-900 dark:text-amber-200 underline hover:text-amber-950"
              >
                2. Run in Google Colab (Free T4 Cloud GPU) ↗
              </a>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Launcher Configuration Card */}
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Play className="w-4 h-4 mr-2 text-studio-600" />
              Configure Batch Job
            </h2>

            {/* Target Project */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Target Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-studio-500"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Target Chapter */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Target Chapter
              </label>
              <select
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-studio-500"
              >
                <option value="">All Chapters in Project</option>
                {activeProject?.chapters?.map((c) => (
                  <option key={c.id} value={c.id}>
                    Ch. {c.chapter_number}: {c.title} ({c.page_count} pages)
                  </option>
                ))}
              </select>
            </div>

            {/* Color Style Selection */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-600">
                Colorization Style
              </label>
              <div className="space-y-2">
                {colorStyles.map((style) => (
                  <div
                    key={style.id}
                    onClick={() => setSelectedModel(style.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition ${
                      selectedModel === style.id
                        ? 'border-studio-500 bg-studio-50 text-studio-900 shadow-sm'
                        : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">{style.name}</span>
                      {selectedModel === style.id && (
                        <Check className="w-3.5 h-3.5 text-studio-600" />
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">{style.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hardware Inference Engine */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Inference Engine
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-studio-500"
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedProvider === 'colab' && (
              <div className="p-3.5 bg-purple-50 dark:bg-purple-950/40 rounded-2xl border border-purple-200 dark:border-purple-800 text-xs text-purple-900 dark:text-purple-200 space-y-2">
                <div className="font-bold flex items-center text-purple-900 dark:text-purple-100">
                  <Cloud className="w-4 h-4 mr-1.5 text-purple-600 dark:text-purple-400" />
                  Google Colab Cloud GPU Workflow
                </div>
                <p className="text-[11px] text-purple-700 dark:text-purple-300 leading-relaxed">
                  Colab runs AI colorization remotely on Google Cloud's free T4 GPUs. Ideal for laptops without local model weights or dedicated GPUs.
                </p>
                <a
                  href="https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] shadow-sm transition"
                >
                  Open Colab Notebook ↗
                </a>
              </div>
            )}

            {/* Skip Approved Checkbox */}
            <div className="flex items-center space-x-2 pt-1">
              <input
                type="checkbox"
                id="skipApprove"
                checked={skipApproved}
                onChange={(e) => setSkipApproved(e.target.checked)}
                className="rounded text-studio-600 focus:ring-studio-500"
              />
              <label htmlFor="skipApprove" className="text-xs text-slate-600">
                Skip already approved pages (preserves finalized art)
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="button"
              disabled={createJobMutation.isPending || !selectedProjectId}
              onClick={() => createJobMutation.mutate()}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-studio-600 to-sakura-500 hover:from-studio-700 hover:to-sakura-600 text-white font-bold text-sm shadow-md shadow-studio-200 transition flex items-center justify-center space-x-2 active:scale-95 disabled:opacity-50"
            >
              {createJobMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Enqueuing Job...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Batch Colorization</span>
                </>
              )}
            </button>
            {createJobMutation.isError && (
              <p className="text-xs text-rose-600 mt-1">
                {(createJobMutation.error as any)?.message || 'Failed to start job.'}
              </p>
            )}
          </div>
        </div>

        {/* Jobs History and Live Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              Processing Jobs & Progress Queue ({jobs.length})
            </h2>
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['jobs'] })}
              className="text-xs text-studio-600 hover:text-studio-700 font-semibold flex items-center"
            >
              <RotateCw className="w-3.5 h-3.5 mr-1" /> Refresh
            </button>
          </div>

          {/* Status Filters */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            {(['all', 'queued', 'processing', 'completed', 'failed', 'cancelled'] as const).map((tab) => {
              const count = tab === 'all'
                ? jobs.length
                : tab === 'queued'
                ? jobs.filter((j) => ['queued', 'preparing'].includes(j.status)).length
                : tab === 'processing'
                ? jobs.filter((j) => ['processing', 'validating'].includes(j.status)).length
                : jobs.filter((j) => j.status === tab).length;

              return (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition flex items-center space-x-1.5 ${
                    statusFilter === tab
                      ? 'bg-studio-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                  }`}
                >
                  <span className="capitalize">{tab}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    statusFilter === tab ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {loadingJobs ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-100">
              <Loader2 className="w-6 h-6 animate-spin text-studio-500 mx-auto" />
              <p className="text-xs text-slate-400 mt-2">Loading processing queue...</p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="p-16 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-700">No jobs queued or running</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Configure a batch colorization job on the left to start coloring your manga pages.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs
                .filter((job) => {
                  if (statusFilter === 'all') return true;
                  if (statusFilter === 'queued') return ['queued', 'preparing'].includes(job.status);
                  if (statusFilter === 'processing') return ['processing', 'validating'].includes(job.status);
                  return job.status === statusFilter;
                })
                .map((job) => {
                const percent = job.total_pages > 0
                  ? Math.round((job.completed_pages / job.total_pages) * 100)
                  : 0;
                const isExpanded = expandedJobId === job.id;

                return (
                  <div
                    key={job.id}
                    className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 transition"
                  >
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs ${
                          job.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          job.status === 'processing' ? 'bg-studio-100 text-studio-700' :
                          job.status === 'failed' ? 'bg-rose-100 text-rose-700' :
                          job.status === 'cancelled' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {job.status === 'completed' ? <CheckCircle2 className="w-5 h-5" /> :
                           job.status === 'processing' ? <Loader2 className="w-5 h-5 animate-spin" /> :
                           job.status === 'failed' ? <AlertCircle className="w-5 h-5" /> :
                           <Clock className="w-5 h-5" />}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-800">
                            Batch Job #{job.id.slice(0, 8)}
                          </h3>
                          <p className="text-[11px] text-slate-400">
                            {job.model_name} • {job.provider} • {new Date(job.created_at).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          job.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                          job.status === 'processing' ? 'bg-studio-100 text-studio-800 animate-pulse' :
                          job.status === 'failed' ? 'bg-rose-100 text-rose-800' :
                          job.status === 'cancelled' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {job.status.toUpperCase()}
                        </span>

                        {job.status === 'processing' && (
                          <button
                            onClick={() => cancelJobMutation.mutate(job.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Cancel Job"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}

                        {(job.status === 'failed' || job.status === 'cancelled') && (
                          <button
                            onClick={() => retryJobMutation.mutate(job.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-studio-600 hover:bg-studio-50"
                            title="Retry Failed Tasks / Resume Job"
                          >
                            <RotateCw className="w-4 h-4" />
                          </button>
                        )}

                        {job.status === 'processing' ? (
                          <button
                            disabled
                            className="p-1 rounded-lg text-slate-200 cursor-not-allowed"
                            title="Active job running. Cancel first before deleting."
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => setJobToDelete(job)}
                            className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                            title="Delete Batch Job"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        <button
                          onClick={() => setExpandedJobId(isExpanded ? null : job.id)}
                          className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs text-slate-500 font-medium">
                        <span>{job.completed_pages} of {job.total_pages} pages processed</span>
                        <span>{percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            job.status === 'completed' ? 'bg-emerald-500' :
                            job.status === 'failed' ? 'bg-rose-500' : 'bg-studio-500'
                          }`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>

                    {/* Error Banner on Job Failure */}
                    {(job.status === 'failed' || job.error_message || (job.tasks && job.tasks.some(t => t.error_message))) && (
                      <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-900 dark:text-rose-200 space-y-2">
                        <div className="flex items-center font-bold text-rose-900 dark:text-rose-100">
                          <AlertCircle className="w-4 h-4 mr-1.5 text-rose-600 dark:text-rose-400 flex-shrink-0" />
                          <span>Inference Error Details</span>
                        </div>
                        <p className="font-mono text-[11px] text-rose-700 dark:text-rose-300 break-words leading-relaxed">
                          {job.error_message || (job.tasks?.find(t => t.error_message)?.error_message) || 'Inference engine failed to colorize pages.'}
                        </p>
                        {((job.error_message || '').includes('manga-colorize-fp16.onnx') || (job.tasks?.some(t => (t.error_message || '').includes('manga-colorize-fp16.onnx')))) && (
                          <div className="pt-2 text-[11px] text-rose-900 dark:text-rose-200 border-t border-rose-200 dark:border-rose-800 space-y-1">
                            <p className="font-semibold">💡 Why this failed on this laptop:</p>
                            <p className="text-rose-700 dark:text-rose-300">
                              Git repositories do not include heavy neural network model weights (~61.6 MB).
                            </p>
                            <div className="pt-1 flex flex-wrap gap-2">
                              <span>1. Copy <code className="bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono">manga-colorize-fp16.onnx</code> to <code className="bg-rose-100 dark:bg-rose-900/60 px-1 py-0.5 rounded font-mono">data/models/colorization/</code></span>
                              <span>•</span>
                              <a
                                href="https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb"
                                target="_blank"
                                rel="noreferrer"
                                className="font-bold underline text-rose-900 dark:text-rose-100 hover:text-rose-950"
                              >
                                2. Or colorize on Google Colab (Free T4 Cloud GPU) ↗
                              </a>
                            </div>
                          </div>
                        )}
                        {((job.error_message || '').includes('Google Colab Workflow') || job.provider === 'colab') && (
                          <div className="pt-2 text-[11px] text-rose-900 dark:text-rose-200 border-t border-rose-200 dark:border-rose-800">
                            <strong>Notice:</strong> The Colab workflow runs in Google Colab's cloud environment. Open <a href="https://colab.research.google.com/github/margacis2/manga_colour/blob/main/notebooks/colab_colorization.ipynb" target="_blank" rel="noreferrer" className="underline font-bold text-rose-900 dark:text-rose-100">notebooks/colab_colorization.ipynb ↗</a> to colorize online.
                          </div>
                        )}
                      </div>
                    )}

                    {/* Expanded Task Details */}
                    {isExpanded && job.tasks && (
                      <div className="pt-3 border-t border-slate-100 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                          Tasks Breakdown ({job.tasks.length} pages)
                        </span>
                        <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                          {job.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1.5 text-xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-700">
                                  Page Task #{task.task_order}
                                </span>
                                <div className="flex items-center space-x-2">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    task.status === 'completed' ? 'bg-emerald-100 text-emerald-800' :
                                    task.status === 'processing' ? 'bg-studio-100 text-studio-800 animate-pulse' :
                                    task.status === 'failed' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                                  }`}>
                                    {task.status}
                                  </span>
                                  {task.status === 'completed' && (
                                    <Link
                                      to={`/editor?page_id=${task.page_id}`}
                                      className="text-[11px] font-semibold text-studio-600 hover:underline"
                                    >
                                      View
                                    </Link>
                                  )}
                                </div>
                              </div>
                              {task.error_message && (
                                <p className="text-[11px] text-rose-600 font-mono break-words bg-rose-50/80 p-1.5 rounded-lg border border-rose-100">
                                  {task.error_message}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Delete Job Confirmation Modal */}
      {jobToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full border border-slate-100 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-slate-800">
                Delete Batch Job #{jobToDelete.id.slice(0, 8)}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will remove the job record and its tasks from the processing queue.
              </p>
              <div className="p-3 bg-emerald-50 rounded-2xl text-[11px] text-emerald-800 text-left">
                <strong>Data Safe:</strong> Original manga pages, colorized artwork in your library, project records, and palettes are completely preserved.
              </div>
            </div>
            <div className="flex items-center space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setJobToDelete(null)}
                className="flex-1 py-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteJobMutation.isPending}
                onClick={() => deleteJobMutation.mutate(jobToDelete.id)}
                className="flex-1 py-2.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-200 transition flex items-center justify-center space-x-1.5 disabled:opacity-50"
              >
                {deleteJobMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Job</span>
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
