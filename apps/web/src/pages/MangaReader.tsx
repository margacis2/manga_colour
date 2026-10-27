import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  BookOpen, 
  ChevronLeft, 
  ChevronRight, 
  Maximize, 
  Minimize, 
  Sparkles, 
  Layers, 
  Columns, 
  ZoomIn, 
  ZoomOut, 
  Sliders, 
  CheckCircle2, 
  ArrowLeft,
  ArrowRight,
  Eye,
  Settings as SettingsIcon,
  Sun
} from 'lucide-react';
import { api } from '../api/client';
import { ChapterDetail, Page } from '../types';

export const MangaReader: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const projectId = searchParams.get('project_id') || '';
  const chapterId = searchParams.get('chapter_id') || '';

  const [readingMode, setReadingMode] = useState<'webtoon' | 'paged'>('webtoon');
  const [showColorized, setShowColorized] = useState<boolean>(true);
  const [compareMode, setCompareMode] = useState<'normal' | 'side-by-side'>('normal');
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [readingDirection, setReadingDirection] = useState<'rtl' | 'ltr'>('rtl');

  const containerRef = useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  const activeProject = projects.find((p) => p.id === projectId) || projects[0];

  const { data: chapterDetail, isLoading: loadingChapter } = useQuery({
    queryKey: ['chapter', chapterId || activeProject?.chapters?.[0]?.id],
    queryFn: () => {
      const targetId = chapterId || activeProject?.chapters?.[0]?.id;
      return targetId ? api.getChapter(targetId) : null;
    },
    enabled: !!(chapterId || activeProject?.chapters?.[0]?.id),
  });

  const pages = chapterDetail?.pages || [];

  // Fetch saved reading progress
  const { data: savedProgress } = useQuery({
    queryKey: ['reading-progress', activeProject?.id, chapterDetail?.id],
    queryFn: () => (activeProject && chapterDetail ? api.getReadingProgress(activeProject.id, chapterDetail.id) : null),
    enabled: !!(activeProject && chapterDetail),
  });

  // Restore saved page
  useEffect(() => {
    if (savedProgress && savedProgress.last_read_page_number > 0 && pages.length > 0) {
      const idx = Math.min(savedProgress.last_read_page_number - 1, pages.length - 1);
      setCurrentPageIndex(Math.max(0, idx));
    }
  }, [savedProgress, pages.length]);

  // Save progress mutation
  const saveProgressMutation = useMutation({
    mutationFn: (pageNumber: number) => {
      if (!activeProject || !chapterDetail) return Promise.resolve();
      return api.saveReadingProgress({
        project_id: activeProject.id,
        chapter_id: chapterDetail.id,
        last_read_page_number: pageNumber,
        scroll_position: 0,
        completed: pageNumber >= pages.length,
      });
    },
  });

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'c' || e.key === 'C') {
        setShowColorized((prev) => !prev);
      } else if (e.key === 'f' || e.key === 'F') {
        toggleFullscreen();
      } else if (e.key === 'm' || e.key === 'M') {
        setReadingMode((prev) => (prev === 'webtoon' ? 'paged' : 'webtoon'));
      } else if (readingMode === 'paged') {
        if (readingDirection === 'rtl') {
          if (e.key === 'ArrowLeft') nextPaged();
          if (e.key === 'ArrowRight') prevPaged();
        } else {
          if (e.key === 'ArrowRight') nextPaged();
          if (e.key === 'ArrowLeft') prevPaged();
        }
      }
    },
    [readingMode, readingDirection, currentPageIndex, pages.length]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const nextPaged = () => {
    if (currentPageIndex < pages.length - 1) {
      const nextIdx = currentPageIndex + 1;
      setCurrentPageIndex(nextIdx);
      saveProgressMutation.mutate(nextIdx + 1);
    }
  };

  const prevPaged = () => {
    if (currentPageIndex > 0) {
      const prevIdx = currentPageIndex - 1;
      setCurrentPageIndex(prevIdx);
      saveProgressMutation.mutate(prevIdx + 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  // Chapter navigation
  const currentChapterIndex =
    activeProject?.chapters?.findIndex((c) => c.id === chapterDetail?.id) ?? -1;
  const prevChapter = currentChapterIndex > 0 ? activeProject?.chapters[currentChapterIndex - 1] : null;
  const nextChapter =
    currentChapterIndex >= 0 && currentChapterIndex < (activeProject?.chapters?.length || 0) - 1
      ? activeProject?.chapters[currentChapterIndex + 1]
      : null;

  if (loadingChapter) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-studio-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!chapterDetail || pages.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <BookOpen className="w-16 h-16 text-studio-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Manga Pages Found</h2>
        <p className="text-slate-500 text-sm">
          Please select a chapter with imported pages from your library.
        </p>
        <Link
          to={`/library?project_id=${activeProject?.id}`}
          className="inline-flex items-center px-4 py-2 rounded-xl bg-studio-600 text-white font-semibold text-xs shadow hover:bg-studio-700 transition"
        >
          Back to Library
        </Link>
      </div>
    );
  }

  const currentPage = pages[currentPageIndex];

  return (
    <div
      ref={containerRef}
      className={`min-h-screen bg-slate-950 text-slate-100 flex flex-col ${
        isFullscreen ? 'p-0' : 'pb-12'
      }`}
    >
      {/* Top Floating Control Bar */}
      <div className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Back, Title & Chapter Switcher */}
        <div className="flex items-center space-x-3">
          <Link
            to={`/library?project_id=${activeProject?.id}`}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Back to Library"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-white text-sm truncate max-w-[200px] sm:max-w-[300px]">
                {activeProject?.title}
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-studio-400 font-semibold truncate max-w-[150px]">
                {chapterDetail.title}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Page {currentPageIndex + 1} of {pages.length}
            </p>
          </div>
        </div>

        {/* Center: Controls for Mode, Color, Side-by-side */}
        <div className="flex items-center space-x-2">
          {/* Mode Switcher */}
          <div className="bg-slate-800 p-0.5 rounded-xl flex items-center border border-slate-700">
            <button
              onClick={() => setReadingMode('webtoon')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                readingMode === 'webtoon'
                  ? 'bg-studio-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Webtoon Scroll
            </button>
            <button
              onClick={() => setReadingMode('paged')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                readingMode === 'paged'
                  ? 'bg-studio-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Paged Flip
            </button>
          </div>

          {/* Color Toggle */}
          <button
            onClick={() => setShowColorized(!showColorized)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-bold border transition ${
              showColorized
                ? 'bg-gradient-to-r from-studio-600 to-sakura-500 text-white border-transparent shadow'
                : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
            }`}
            title="Press 'C' to toggle colorized / original"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{showColorized ? 'AI Color' : 'Original B&W'}</span>
          </button>

          {/* Side by side compare toggle */}
          <button
            onClick={() => setCompareMode(compareMode === 'normal' ? 'side-by-side' : 'normal')}
            className={`p-2 rounded-xl border transition ${
              compareMode === 'side-by-side'
                ? 'bg-studio-500/20 border-studio-500 text-studio-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Toggle Side-by-side B&W vs Color Comparison"
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Fullscreen & Page Dropdown */}
        <div className="flex items-center space-x-2">
          {/* Chapter Quick Jump */}
          {prevChapter && (
            <Link
              to={`/reader?project_id=${activeProject?.id}&chapter_id=${prevChapter.id}`}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              title="Previous Chapter"
            >
              Prev Ch
            </Link>
          )}
          {nextChapter && (
            <Link
              to={`/reader?project_id=${activeProject?.id}&chapter_id=${nextChapter.id}`}
              className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              title="Next Chapter"
            >
              Next Ch
            </Link>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title="Fullscreen ('F')"
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Reader Canvas */}
      <div className="flex-1 flex justify-center items-start overflow-auto p-2 sm:p-4">
        {readingMode === 'webtoon' ? (
          /* Webtoon Continuous Vertical Scroll */
          <div className="w-full max-w-3xl space-y-1 mx-auto">
            {pages.map((page, index) => {
              const imageSrc = showColorized
                ? `/api/v1/pages/${page.id}/processed`
                : `/api/v1/pages/${page.id}/original`;

              return (
                <div key={page.id} className="relative group">
                  {compareMode === 'side-by-side' ? (
                    <div className="grid grid-cols-2 gap-2 bg-slate-900 p-2 rounded-xl">
                      <div className="relative">
                        <img
                          src={`/api/v1/pages/${page.id}/original`}
                          alt={`Page ${page.page_number} Original`}
                          className="w-full h-auto object-contain rounded"
                          loading="lazy"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/60 text-[10px] text-white">
                          B&W Original
                        </span>
                      </div>
                      <div className="relative">
                        <img
                          src={`/api/v1/pages/${page.id}/processed`}
                          alt={`Page ${page.page_number} Colorized`}
                          className="w-full h-auto object-contain rounded"
                          loading="lazy"
                        />
                        <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-studio-600/80 text-[10px] text-white">
                          AI Color
                        </span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={imageSrc}
                      alt={`Page ${page.page_number}`}
                      className="w-full h-auto object-contain shadow-2xl transition-all select-none"
                      loading={index < 3 ? 'eager' : 'lazy'}
                    />
                  )}
                  {/* Floating Page Number indicator */}
                  <span className="absolute top-2 right-2 px-2 py-0.5 rounded bg-black/60 text-[10px] font-mono text-slate-300 opacity-40 group-hover:opacity-100 transition">
                    p. {page.page_number}
                  </span>
                </div>
              );
            })}

            {/* End of chapter banner */}
            <div className="py-12 text-center space-y-3 bg-slate-900/50 rounded-2xl border border-slate-800 my-6">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <h3 className="text-base font-bold text-white">Chapter Complete!</h3>
              <p className="text-xs text-slate-400">
                You've read all {pages.length} pages of {chapterDetail.title}.
              </p>
              {nextChapter ? (
                <Link
                  to={`/reader?project_id=${activeProject?.id}&chapter_id=${nextChapter.id}`}
                  className="inline-flex items-center px-5 py-2.5 rounded-xl bg-studio-600 hover:bg-studio-700 text-white font-bold text-xs shadow"
                >
                  Read Next Chapter <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Link>
              ) : (
                <Link
                  to={`/library?project_id=${activeProject?.id}`}
                  className="inline-flex items-center px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Return to Library
                </Link>
              )}
            </div>
          </div>
        ) : (
          /* Paged Horizontal / Single Page Mode */
          <div className="flex-1 flex flex-col items-center justify-center max-w-4xl mx-auto w-full relative">
            <div className="relative max-h-[85vh] flex items-center justify-center">
              {compareMode === 'side-by-side' ? (
                <div className="grid grid-cols-2 gap-4 max-h-[85vh]">
                  <img
                    src={`/api/v1/pages/${currentPage.id}/original`}
                    alt={`Page ${currentPage.page_number} Original`}
                    className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl"
                  />
                  <img
                    src={`/api/v1/pages/${currentPage.id}/processed`}
                    alt={`Page ${currentPage.page_number} Colorized`}
                    className="max-h-[80vh] w-auto object-contain rounded-xl shadow-2xl"
                  />
                </div>
              ) : (
                <img
                  src={
                    showColorized
                      ? `/api/v1/pages/${currentPage.id}/processed`
                      : `/api/v1/pages/${currentPage.id}/original`
                  }
                  alt={`Page ${currentPage.page_number}`}
                  className="max-h-[82vh] w-auto object-contain rounded-xl shadow-2xl select-none"
                />
              )}

              {/* Prev / Next navigation zones */}
              <button
                onClick={readingDirection === 'rtl' ? nextPaged : prevPaged}
                className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-start pl-4 text-white/30 hover:text-white/90 hover:bg-black/20 transition rounded-l-xl"
                title="Previous / Page Turn"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <button
                onClick={readingDirection === 'rtl' ? prevPaged : nextPaged}
                className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-end pr-4 text-white/30 hover:text-white/90 hover:bg-black/20 transition rounded-r-xl"
                title="Next / Page Turn"
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            {/* Bottom Paged Navigation Bar */}
            <div className="mt-4 flex items-center space-x-4 bg-slate-900/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
              <button
                disabled={currentPageIndex === 0}
                onClick={prevPaged}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-semibold text-slate-300">
                Page {currentPageIndex + 1} / {pages.length}
              </span>
              <button
                disabled={currentPageIndex >= pages.length - 1}
                onClick={nextPaged}
                className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
