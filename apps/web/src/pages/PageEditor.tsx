import React, { useState, useRef, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Sliders, 
  Save, 
  Sparkles, 
  Palette as PaletteIcon,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Eye,
  FileCheck
} from 'lucide-react';
import { api } from '../api/client';
import { Page, Palette, CharacterProfile } from '../types';

export const PageEditor: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const pageId = searchParams.get('page_id') || '';

  const [sliderPos, setSliderPos] = useState<number>(50); // 0 to 100%
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [notes, setNotes] = useState<string>('');
  const [selectedCharId, setSelectedCharId] = useState<string>('');
  const [selectedPaletteId, setSelectedPaletteId] = useState<string>('');
  const [isApproved, setIsApproved] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: page, isLoading: loadingPage } = useQuery({
    queryKey: ['page', pageId],
    queryFn: () => (pageId ? api.getPage(pageId) : null),
    enabled: !!pageId,
  });

  const { data: chapterDetail } = useQuery({
    queryKey: ['chapter', page?.chapter_id],
    queryFn: () => (page?.chapter_id ? api.getChapter(page.chapter_id) : null),
    enabled: !!page?.chapter_id,
  });

  const { data: characters = [] } = useQuery({
    queryKey: ['characters', chapterDetail?.project_id],
    queryFn: () => (chapterDetail?.project_id ? api.getCharacters(chapterDetail.project_id) : []),
    enabled: !!chapterDetail?.project_id,
  });

  const { data: palettes = [] } = useQuery({
    queryKey: ['palettes', chapterDetail?.project_id],
    queryFn: () => (chapterDetail?.project_id ? api.getPalettes(chapterDetail.project_id) : []),
    enabled: !!chapterDetail?.project_id,
  });

  useEffect(() => {
    if (page) {
      setIsApproved(page.approved);
    }
  }, [page]);

  const approvalMutation = useMutation({
    mutationFn: (approved: boolean) => api.updatePageApproval(pageId, approved),
    onSuccess: (updatedPage) => {
      setIsApproved(updatedPage.approved);
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      queryClient.invalidateQueries({ queryKey: ['chapter', page?.chapter_id] });
    },
  });

  const saveAnnotationMutation = useMutation({
    mutationFn: () =>
      api.saveAnnotation(pageId, {
        character_id: selectedCharId || undefined,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['page', pageId] });
      alert('Annotations and palette reference saved!');
    },
  });

  // Slider drag handling
  const handleMouseMove = (e: React.MouseEvent | MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPos(pct);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  // Next / Prev page in chapter
  const pages = chapterDetail?.pages || [];
  const currentIndex = pages.findIndex((p) => p.id === pageId);
  const prevPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex >= 0 && currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  if (loadingPage || !page) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-studio-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(-1)}
            className="p-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-base font-bold text-slate-800">
              Page {page.page_number} Inspection & Approval
            </h1>
            <p className="text-xs text-slate-400">
              {page.original_filename} • {page.original_width}x{page.original_height}px
            </p>
          </div>
        </div>

        {/* Approval & Navigation Controls */}
        <div className="flex items-center space-x-2">
          {prevPage && (
            <Link
              to={`/editor?page_id=${prevPage.id}`}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </Link>
          )}
          {nextPage && (
            <Link
              to={`/editor?page_id=${nextPage.id}`}
              className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </Link>
          )}

          <button
            onClick={() => approvalMutation.mutate(!isApproved)}
            className={`inline-flex items-center px-4 py-2 rounded-xl text-xs font-bold transition shadow ${
              isApproved
                ? 'bg-emerald-500 hover:bg-emerald-600 text-white'
                : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            <span>{isApproved ? 'Approved for Export' : 'Approve Page'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Comparison Slider & Adjustments */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Interactive Comparison Split Slider */}
        <div className="lg:col-span-3 bg-slate-900 rounded-3xl p-4 flex flex-col items-center justify-center relative overflow-hidden select-none">
          <div
            ref={containerRef}
            className="relative max-h-[80vh] w-auto overflow-hidden rounded-2xl cursor-ew-resize shadow-2xl"
            onMouseDown={() => setIsDragging(true)}
          >
            {/* Colorized Image (Base layer) */}
            <img
              src={`/api/v1/pages/${page.id}/processed`}
              alt="Colorized Page"
              className="max-h-[75vh] w-auto object-contain block pointer-events-none"
            />

            {/* Original B&W Image (Clipped overlay) */}
            <div
              className="absolute inset-0 overflow-hidden"
              style={{ width: `${sliderPos}%` }}
            >
              <img
                src={`/api/v1/pages/${page.id}/original`}
                alt="Original B&W Page"
                className="max-h-[75vh] w-auto object-contain max-w-none block pointer-events-none"
              />
            </div>

            {/* Divider Line & Handle */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-20 flex items-center justify-center"
              style={{ left: `${sliderPos}%` }}
            >
              <div className="w-7 h-7 -ml-3.5 rounded-full bg-white text-slate-800 shadow-xl flex items-center justify-center text-[10px] font-bold">
                ⬌
              </div>
            </div>

            {/* Labels */}
            <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-sm text-white text-[11px] font-semibold z-10">
              Original B&W
            </span>
            <span className="absolute bottom-3 right-3 px-2.5 py-1 rounded-full bg-studio-600/80 backdrop-blur-sm text-white text-[11px] font-semibold z-10">
              AI Colorized
            </span>
          </div>

          <p className="text-slate-400 text-xs mt-3">
            Drag the slider horizontally to compare fine line art retention and screentone coloring.
          </p>
        </div>

        {/* Quality Controls & Notes Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <FileCheck className="w-4 h-4 mr-1.5 text-studio-600" />
              Page Metadata & QA
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Status</span>
                <span className="font-semibold text-emerald-600 uppercase text-[10px]">
                  {page.processing_status}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Model Version</span>
                <span className="font-semibold text-slate-700">
                  {page.model_version || 'Anime Soft v1'}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-50">
                <span className="text-slate-400">Engine</span>
                <span className="font-semibold text-slate-700">
                  {page.provider_name || 'RTX 3050 Local'}
                </span>
              </div>
            </div>

            {/* Character Association */}
            <div className="space-y-1.5 pt-2">
              <label className="block text-xs font-semibold text-slate-600">
                Primary Character in Scene
              </label>
              <select
                value={selectedCharId}
                onChange={(e) => setSelectedCharId(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:ring-2 focus:ring-studio-500 font-medium"
              >
                <option value="">Auto-detected / Background</option>
                {characters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Artist Notes */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Artist Review Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adjust background gym lighting, fix Chinatsu uniform color..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-studio-500"
              />
            </div>

            <button
              onClick={() => saveAnnotationMutation.mutate()}
              disabled={saveAnnotationMutation.isPending}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow transition flex items-center justify-center space-x-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save QA Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
