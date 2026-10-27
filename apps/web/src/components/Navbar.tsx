import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Palette, 
  BookOpen, 
  Cpu, 
  Settings as SettingsIcon, 
  FolderHeart, 
  Download, 
  Layers,
  Sparkles,
  Upload,
  Sun,
  Moon
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, actualTheme, toggleTheme } = useTheme();

  const { data: hardware } = useQuery({
    queryKey: ['hardware'],
    queryFn: api.getHardware,
    refetchInterval: 15000,
  });

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: FolderHeart },
    { to: '/library', label: 'Library', icon: BookOpen },
    { to: '/import', label: 'Import', icon: Upload },
    { to: '/palettes', label: 'Character Palettes', icon: Palette },
    { to: '/processing', label: 'Processing', icon: Layers },
    { to: '/reader', label: 'Manga Reader', icon: BookOpen },
    { to: '/export', label: 'Export', icon: Download },
    { to: '/settings', label: 'Hardware & Models', icon: SettingsIcon },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-studio-100 dark:border-slate-800 shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Branding */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-studio-500 to-sakura-400 flex items-center justify-center text-white shadow-md shadow-studio-200 dark:shadow-none group-hover:scale-105 transition-transform duration-200">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-studio-700 to-studio-500 dark:from-studio-400 dark:to-studio-300 bg-clip-text text-transparent">
                Blue Box Color Studio
              </span>
              <span className="block text-xs font-medium text-slate-400 dark:text-slate-500">
                AI Manga Colorization Studio
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex space-x-1 lg:space-x-2">
            {navLinks.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? 'bg-studio-50 dark:bg-slate-800 text-studio-700 dark:text-studio-400 shadow-sm'
                      : 'text-slate-600 dark:text-slate-300 hover:text-studio-600 dark:hover:text-studio-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-studio-600 dark:text-studio-400' : 'text-slate-400 dark:text-slate-500'}`} />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Icons & Hardware Pill */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Quick Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title={`Theme: ${theme} (click to toggle)`}
            >
              {actualTheme === 'dark' ? (
                <Moon className="w-4 h-4 text-studio-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-500" />
              )}
            </button>

            {/* Hardware & GPU status pill */}
            <Link
              to="/settings"
              className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-full text-xs font-medium text-slate-700 dark:text-slate-300 transition"
              title="View GPU and hardware status"
            >
              <Cpu className={`w-3.5 h-3.5 ${hardware?.gpu_available ? 'text-emerald-500' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">
                {hardware?.gpu_name || (hardware?.gpu_available ? 'RTX 3050 GPU' : 'CPU Mode')}
              </span>
              {hardware?.gpu_memory_used_mb && hardware?.gpu_memory_total_mb && (
                <span className="text-slate-400 dark:text-slate-500 text-[10px]">
                  ({Math.round(hardware.gpu_memory_used_mb)} / {Math.round(hardware.gpu_memory_total_mb)} MB)
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
};
