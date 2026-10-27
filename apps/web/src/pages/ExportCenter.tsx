import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Download, 
  FileArchive, 
  FileCheck2, 
  CheckCircle2, 
  Sparkles, 
  Loader2, 
  Layers, 
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { api } from '../api/client';
import { ExportJob } from '../types';

export const ExportCenter: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project_id') || '';
  const initialChapterId = searchParams.get('chapter_id') || '';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapterId);
  const [exportFormat, setExportFormat] = useState<'cbz' | 'zip' | 'pdf'>('cbz');
  const [includeColorized, setIncludeColorized] = useState<boolean>(true);
  const [pdfMode, setPdfMode] = useState<'standard' | 'webtoon'>('standard');
  const [compressionQuality, setCompressionQuality] = useState<'original' | 'balanced' | 'small'>('balanced');
  const [includePageNumbers, setIncludePageNumbers] = useState<boolean>(false);
  const [webtoonGap, setWebtoonGap] = useState<number>(0);
  const [completedJob, setCompletedJob] = useState<ExportJob | null>(null);

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

  const exportMutation = useMutation({
    mutationFn: () =>
      api.createExport({
        project_id: selectedProjectId,
        chapter_id: selectedChapterId || undefined,
        format: exportFormat,
        include_colorized: includeColorized,
        pdf_mode: exportFormat === 'pdf' ? pdfMode : undefined,
        compression_quality: exportFormat === 'pdf' ? compressionQuality : undefined,
        include_page_numbers: exportFormat === 'pdf' ? includePageNumbers : undefined,
        webtoon_gap: exportFormat === 'pdf' ? webtoonGap : undefined,
      }),
    onSuccess: (job) => {
      setCompletedJob(job);
    },
  });

  const formats = [
    {
      id: 'cbz',
      name: 'CBZ (Comic Book Zip)',
      desc: 'Industry standard for manga reader apps (Tachiyomi, Mihon, CDisplayEx, Panels).',
      badge: 'Recommended',
    },
    {
      id: 'zip',
      name: 'Standard ZIP Archive',
      desc: 'Clean, naturally ordered folder of original PNG/JPG colorized pages.',
      badge: null,
    },
    {
      id: 'pdf',
      name: 'High-Res PDF Document',
      desc: 'Combined single-document format for tablet e-readers, Kindle, and print.',
      badge: null,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-2">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center">
          <Download className="w-6 h-6 mr-2 text-studio-600" />
          Manga Release & Export Studio
        </h1>
        <p className="text-sm text-slate-500">
          Bundle your colorized manga chapters into pristine CBZ, ZIP, or PDF releases. All metadata, page orders, and high-DPI quality are preserved without recompression artifacts.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        {/* Destination Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Select Project
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedChapterId('');
                setCompletedJob(null);
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

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              Select Chapter
            </label>
            <select
              value={selectedChapterId}
              onChange={(e) => {
                setSelectedChapterId(e.target.value);
                setCompletedJob(null);
              }}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 text-slate-800 focus:outline-none focus:ring-2 focus:ring-studio-500"
            >
              <option value="">Full Project (All Chapters)</option>
              {activeProject?.chapters?.map((c) => (
                <option key={c.id} value={c.id}>
                  Ch. {c.chapter_number}: {c.title} ({c.page_count} pages)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Format Cards */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-semibold text-slate-600">
            Export Packaging Format
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {formats.map((fmt) => (
              <div
                key={fmt.id}
                onClick={() => setExportFormat(fmt.id as any)}
                className={`p-4 rounded-2xl border cursor-pointer transition flex flex-col justify-between ${
                  exportFormat === fmt.id
                    ? 'border-studio-500 bg-studio-50/70 shadow-sm'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">{fmt.name}</span>
                    {fmt.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-studio-200 text-studio-800">
                        {fmt.badge}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">{fmt.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PDF Customization Options */}
        {exportFormat === 'pdf' && (
          <div className="p-5 rounded-2xl bg-studio-50/60 border border-studio-100 space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-studio-900 uppercase tracking-wider flex items-center">
                <Sparkles className="w-3.5 h-3.5 mr-1.5 text-studio-600" />
                PDF Rendering Engine & Layout Settings
              </span>
              <span className="text-[11px] text-studio-600 font-medium">Validated with pypdf</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* PDF Mode Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Page Layout Format
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPdfMode('standard')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition ${
                      pdfMode === 'standard'
                        ? 'border-studio-500 bg-white shadow-sm font-bold text-studio-900'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div>Standard Manga</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Paginated 1 page/sheet</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPdfMode('webtoon')}
                    className={`p-2.5 rounded-xl border text-left text-xs transition ${
                      pdfMode === 'webtoon'
                        ? 'border-studio-500 bg-white shadow-sm font-bold text-studio-900'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <div>Webtoon Vertical</div>
                    <div className="text-[10px] text-slate-400 font-normal mt-0.5">Continuous strip scroll</div>
                  </button>
                </div>
              </div>

              {/* Quality Preset Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Resolution & Compression
                </label>
                <select
                  value={compressionQuality}
                  onChange={(e) => setCompressionQuality(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-studio-500"
                >
                  <option value="balanced">Balanced (1800px max, optimized size & clarity)</option>
                  <option value="original">Original (Full uncompressed scan DPI)</option>
                  <option value="small">Compact (1200px max, lightweight for mobile/email)</option>
                </select>
              </div>
            </div>

            {/* Sub-options for Standard vs Webtoon */}
            <div className="pt-2 border-t border-studio-100 flex flex-wrap items-center justify-between gap-4">
              {pdfMode === 'standard' ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pageNums"
                    checked={includePageNumbers}
                    onChange={(e) => setIncludePageNumbers(e.target.checked)}
                    className="rounded text-studio-600 focus:ring-studio-500"
                  />
                  <label htmlFor="pageNums" className="text-xs text-slate-700 font-medium">
                    Include bottom chapter page numbers (- 1 / 24 -)
                  </label>
                </div>
              ) : (
                <div className="flex items-center space-x-3 text-xs text-slate-700">
                  <span className="font-semibold">Webtoon Panel Gap:</span>
                  {[0, 10, 20, 30].map((gap) => (
                    <button
                      key={gap}
                      type="button"
                      onClick={() => setWebtoonGap(gap)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        webtoonGap === gap
                          ? 'bg-studio-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {gap === 0 ? '0px (Seamless)' : `${gap}px`}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Color Switch */}
        <div className="flex items-center space-x-2 pt-2">
          <input
            type="checkbox"
            id="includeColor"
            checked={includeColorized}
            onChange={(e) => setIncludeColorized(e.target.checked)}
            className="rounded text-studio-600 focus:ring-studio-500"
          />
          <label htmlFor="includeColor" className="text-xs font-medium text-slate-700">
            Include AI Colorized pages (uncheck to export original raw B&W line art archive)
          </label>
        </div>

        {/* Export Button */}
        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Instant on-device packaging with zero external telemetry
          </span>
          <button
            type="button"
            disabled={exportMutation.isPending || !selectedProjectId}
            onClick={() => exportMutation.mutate()}
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-studio-200 transition active:scale-95"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Packaging Release...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Generate & Package Release
              </>
            )}
          </button>
        </div>

        {/* Completed Download Card */}
        {completedJob && (
          <div className="p-6 rounded-3xl bg-emerald-50 border border-emerald-100 flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-200">
                <FileCheck2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">
                  Release Ready for Download!
                </h3>
                <p className="text-xs text-emerald-800 font-medium">
                  {completedJob.format.toUpperCase()} Archive • {(completedJob.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
                </p>
              </div>
            </div>

            <a
              href={`/api/v1/exports/${completedJob.id}/download`}
              download
              className="inline-flex items-center px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-200 transition active:scale-95"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Archive ({completedJob.format.toUpperCase()})
            </a>
          </div>
        )}
      </div>
    </div>
  );
};
