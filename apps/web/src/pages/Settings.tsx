import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Settings as SettingsIcon, 
  Cpu, 
  HardDrive, 
  Server, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Activity,
  Layers,
  ShieldCheck,
  Sun,
  Moon,
  Monitor
} from 'lucide-react';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export const Settings: React.FC = () => {
  const { theme, actualTheme, setTheme } = useTheme();

  const { data: hardware, isLoading: loadingHardware, refetch: refetchHardware } = useQuery({
    queryKey: ['hardware'],
    queryFn: api.getHardware,
    refetchInterval: 5000,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: api.getHealth,
  });

  const { data: providers = [] } = useQuery({
    queryKey: ['providers'],
    queryFn: api.getProviders,
  });

  const vramUsedPct = hardware?.gpu_memory_total_mb && hardware?.gpu_memory_used_mb
    ? Math.round((hardware.gpu_memory_used_mb / hardware.gpu_memory_total_mb) * 100)
    : 0;

  const ramUsedPct = hardware?.ram_total_gb && hardware?.ram_used_gb
    ? Math.round((hardware.ram_used_gb / hardware.ram_total_gb) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm transition-colors">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
            <Cpu className="w-6 h-6 mr-2 text-studio-600 dark:text-studio-400" />
            Hardware & Studio Configuration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time diagnostics for your local NVIDIA RTX 3050 GPU, VRAM allocation, and UI themes.
          </p>
        </div>

        <button
          onClick={() => refetchHardware()}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
          Poll Diagnostics
        </button>
      </div>

      {/* Interface Theme Configuration Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-6 border border-slate-100 dark:border-slate-700 shadow-sm space-y-4 transition-colors">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center">
              <Sun className="w-4 h-4 mr-2 text-amber-500" />
              Interface Theme & Reading Mode
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select your visual preference. System mode automatically mirrors your operating system.
            </p>
          </div>
          <span className="text-xs font-bold text-studio-600 dark:text-studio-400 capitalize">
            {theme} ({actualTheme} active)
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-2xl border text-left transition flex items-center space-x-3.5 ${
              theme === 'light'
                ? 'border-studio-500 bg-studio-50/70 text-studio-900 shadow-sm ring-1 ring-studio-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center flex-shrink-0">
              <Sun className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">Light Theme</div>
              <div className="text-[11px] text-slate-400">Crisp high-key studio daylight</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-2xl border text-left transition flex items-center space-x-3.5 ${
              theme === 'dark'
                ? 'border-studio-500 bg-studio-50/20 dark:bg-studio-950/40 text-studio-900 dark:text-studio-100 shadow-sm ring-1 ring-studio-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-studio-50 dark:bg-studio-950/60 text-studio-600 dark:text-studio-400 flex items-center justify-center flex-shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">Dark Theme</div>
              <div className="text-[11px] text-slate-400">Sleek slate #0f172a contrast</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-2xl border text-left transition flex items-center space-x-3.5 ${
              theme === 'system'
                ? 'border-studio-500 bg-studio-50/70 dark:bg-studio-950/40 text-studio-900 dark:text-studio-100 shadow-sm ring-1 ring-studio-500'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-slate-300 text-slate-700 dark:text-slate-300'
            }`}
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center flex-shrink-0">
              <Monitor className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold">System Default</div>
              <div className="text-[11px] text-slate-400">Follows Windows OS mode</div>
            </div>
          </button>
        </div>

        <div className="p-3 bg-studio-50 dark:bg-slate-900/60 rounded-2xl border border-studio-100 dark:border-slate-700 text-[11px] text-studio-800 dark:text-slate-300 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>
            <strong>Artwork Integrity Guarantee:</strong> Manga artwork and canvas pixels are never inverted or color-filtered by the dark mode theme.
          </span>
        </div>
      </div>

      {/* Hardware Telemetry Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* GPU VRAM Telemetry */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  {hardware?.gpu_name || (hardware?.gpu_available ? 'NVIDIA RTX 3050' : 'Inference CPU')}
                </h3>
                <p className="text-[11px] text-slate-400">
                  {hardware?.gpu_available ? 'Dedicated GPU Acceleration Active' : 'Fallback Multi-Core CPU'}
                </p>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              hardware?.gpu_available ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
            }`}>
              {hardware?.gpu_available ? 'GPU READY' : 'CPU MODE'}
            </span>
          </div>

          {/* VRAM Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>VRAM Allocation</span>
              <span>
                {hardware?.gpu_memory_used_mb ? Math.round(hardware.gpu_memory_used_mb) : 0} /{' '}
                {hardware?.gpu_memory_total_mb ? Math.round(hardware.gpu_memory_total_mb) : 0} MB ({vramUsedPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-purple-600 h-full rounded-full transition-all duration-300"
                style={{ width: `${vramUsedPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Free VRAM</span>
              <span className="text-sm font-bold text-slate-800">
                {hardware?.gpu_memory_free_mb ? `${Math.round(hardware.gpu_memory_free_mb)} MB` : 'N/A'}
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CUDA State</span>
              <span className="text-sm font-bold text-slate-800">
                {hardware?.cuda_available ? (hardware?.cuda_version ? `v${hardware.cuda_version}` : 'Active') : 'Disabled / CPU'}
              </span>
            </div>
          </div>
        </div>

        {/* System CPU & RAM */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-studio-50 text-studio-600 flex items-center justify-center">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">System Resources</h3>
                <p className="text-[11px] text-slate-400">Host RAM & Multi-threading CPU</p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-studio-100 text-studio-800">
              HEALTHY
            </span>
          </div>

          {/* RAM Progress */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-xs font-medium text-slate-600">
              <span>RAM Usage</span>
              <span>
                {hardware?.ram_used_gb || 0} / {hardware?.ram_total_gb || 0} GB ({ramUsedPct}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-studio-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${ramUsedPct}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CPU Utilization</span>
              <span className="text-sm font-bold text-slate-800">
                {hardware?.cpu_percent || 0}%
              </span>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">Worker Pool</span>
              <span className="text-sm font-bold text-emerald-600">
                1 Local Daemon Running
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Available Inference Providers */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <Layers className="w-4 h-4 mr-2 text-studio-600" />
          Configured Engine Providers
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {providers.map((p) => (
            <div
              key={p.id}
              className="p-4 rounded-2xl border border-slate-100 bg-slate-50/60 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800">{p.name}</span>
                {p.recommended && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-sakura-100 text-sakura-600">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">{p.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Storage and Security Architecture */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-3">
        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
          <ShieldCheck className="w-4 h-4 mr-2 text-emerald-600" />
          Security & Privacy Protection
        </h2>
        <div className="text-xs text-slate-600 space-y-2 leading-relaxed">
          <p>
            • <strong>100% Local Confidentiality:</strong> All manga archives, images, character palettes, and trained weights remain strictly on your local computer storage.
          </p>
          <p>
            • <strong>Path Traversal Defense:</strong> Archives are decompressed with cryptographic path sanitization, preventing arbitrary file overwrite.
          </p>
          <p>
            • <strong>Atomic Storage Engine:</strong> Images are saved with SHA-256 integrity checksums to prevent corruption.
          </p>
        </div>
      </div>
    </div>
  );
};
