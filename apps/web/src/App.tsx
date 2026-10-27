import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Library } from './pages/Library';
import { ImportWizard } from './pages/ImportWizard';
import { Palettes } from './pages/Palettes';
import { ProcessingCenter } from './pages/ProcessingCenter';
import { MangaReader } from './pages/MangaReader';
import { PageEditor } from './pages/PageEditor';
import { ExportCenter } from './pages/ExportCenter';
import { Settings } from './pages/Settings';
import { Sparkles, Heart } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';

export const App: React.FC = () => {
  const location = useLocation();
  const isReader = location.pathname.startsWith('/reader');

  return (
    <ThemeProvider>
      <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 font-sans selection:bg-studio-200 selection:text-studio-900 transition-colors duration-200">
        {/* Hide standard navbar in fullscreen reader for immersion */}
        {!isReader && <Navbar />}

        <main className="flex-1">
          <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/library" element={<Library />} />
          <Route path="/import" element={<ImportWizard />} />
          <Route path="/palettes" element={<Palettes />} />
          <Route path="/processing" element={<ProcessingCenter />} />
          <Route path="/reader" element={<MangaReader />} />
          <Route path="/editor" element={<PageEditor />} />
          <Route path="/export" element={<ExportCenter />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>

      {!isReader && (
        <footer className="bg-white dark:bg-slate-800 border-t border-slate-100 dark:border-slate-800 py-6 text-center text-xs text-slate-400 dark:text-slate-500 transition-colors">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-slate-700 dark:text-slate-300">Blue Box Color Studio</span>
              <span>•</span>
              <span>Local GPU Manga Colorization & Reading Studio</span>
            </div>
            <div className="flex items-center space-x-1 text-slate-400">
              <span>Crafted with</span>
              <Heart className="w-3.5 h-3.5 text-sakura-500 fill-sakura-500" />
              <span>for manga artists and fans</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  </ThemeProvider>
  );
};
