import React, { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  Upload, 
  FileArchive, 
  FileImage, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight,
  FolderPlus,
  Loader2,
  X
} from 'lucide-react';
import { api } from '../api/client';

export const ImportWizard: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('project_id') || '';
  const initialChapterId = searchParams.get('chapter_id') || '';

  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedChapterId, setSelectedChapterId] = useState<string>(initialChapterId);

  // New chapter inline fields
  const [isNewChapter, setIsNewChapter] = useState(false);
  const [newChapterNum, setNewChapterNum] = useState(1);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progressMsg, setProgressMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  // Set default project if none selected
  React.useEffect(() => {
    if (!selectedProjectId && projects.length > 0) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const activeProject = projects.find((p) => p.id === selectedProjectId);

  // Set default chapter if available
  React.useEffect(() => {
    if (activeProject?.chapters && activeProject.chapters.length > 0 && !selectedChapterId && !isNewChapter) {
      setSelectedChapterId(activeProject.chapters[0].id);
    }
  }, [activeProject, selectedChapterId, isNewChapter]);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setErrorMsg(null);

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Check if archive (zip/cbz)
    const archiveFile = files.find((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.zip') || ext.endsWith('.cbz');
    });

    if (archiveFile) {
      setSelectedFile(archiveFile);
      setSelectedImages([]);
    } else {
      // Filter images
      const images = files.filter((f) => {
        const ext = f.name.toLowerCase();
        return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp');
      });
      if (images.length > 0) {
        setSelectedImages(images);
        setSelectedFile(null);
      } else {
        setErrorMsg('Please upload a CBZ/ZIP archive or manga image files (.png, .jpg, .webp).');
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg(null);
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const archiveFile = files.find((f) => {
      const ext = f.name.toLowerCase();
      return ext.endsWith('.zip') || ext.endsWith('.cbz');
    });

    if (archiveFile) {
      setSelectedFile(archiveFile);
      setSelectedImages([]);
    } else {
      const images = files.filter((f) => {
        const ext = f.name.toLowerCase();
        return ext.endsWith('.png') || ext.endsWith('.jpg') || ext.endsWith('.jpeg') || ext.endsWith('.webp');
      });
      if (images.length > 0) {
        setSelectedImages(images);
        setSelectedFile(null);
      }
    }
  };

  const importMutation = useMutation({
    mutationFn: async () => {
      setProgressMsg('Preparing import destination...');
      let targetChapterId = selectedChapterId;

      // If user selected "Create new chapter"
      if (isNewChapter || !targetChapterId) {
        setProgressMsg('Creating new chapter...');
        const newChap = await api.createChapter(
          selectedProjectId,
          newChapterTitle.trim() || `Chapter ${newChapterNum}`,
          newChapterNum
        );
        targetChapterId = newChap.id;
      }

      if (selectedFile) {
        setProgressMsg(`Unpacking & verifying archive: ${selectedFile.name}...`);
        return await api.importArchive(targetChapterId, selectedFile);
      } else if (selectedImages.length > 0) {
        setProgressMsg(`Processing ${selectedImages.length} manga pages...`);
        return await api.importImages(targetChapterId, selectedImages);
      } else {
        throw new Error('No files selected for import.');
      }
    },
    onSuccess: (chapter) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['chapter', chapter.id] });
      setProgressMsg(null);
      navigate(`/library?project_id=${selectedProjectId}`);
    },
    onError: (err: any) => {
      setProgressMsg(null);
      setErrorMsg(err.message || 'Import failed. Please verify the archive format.');
    },
  });

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Chapter Import Wizard</h1>
        <p className="text-sm text-slate-500">
          Upload manga chapters as CBZ, ZIP, or individual page images. Archives are safely verified against path traversal and decompressed in natural page sequence.
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6">
        {/* Step 1: Target Destination */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <span className="w-5 h-5 rounded-full bg-studio-100 text-studio-600 text-xs flex items-center justify-center mr-2">
              1
            </span>
            Destination Project & Chapter
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Target Project
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedChapterId('');
                }}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500 bg-slate-50 font-medium"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-600">
                  Target Chapter
                </label>
                <button
                  type="button"
                  onClick={() => setIsNewChapter(!isNewChapter)}
                  className="text-xs font-semibold text-studio-600 hover:text-studio-700"
                >
                  {isNewChapter ? 'Select Existing' : '+ New Chapter'}
                </button>
              </div>

              {isNewChapter ? (
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="number"
                    step="0.1"
                    placeholder="Ch #"
                    value={newChapterNum}
                    onChange={(e) => setNewChapterNum(parseFloat(e.target.value) || 1)}
                    className="px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-studio-500"
                  />
                  <input
                    type="text"
                    placeholder="Chapter Title"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    className="col-span-2 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-studio-500"
                  />
                </div>
              ) : (
                <select
                  value={selectedChapterId}
                  onChange={(e) => setSelectedChapterId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500 bg-slate-50 font-medium"
                >
                  {activeProject?.chapters?.length === 0 ? (
                    <option value="">No chapters exist (create one)</option>
                  ) : (
                    activeProject?.chapters?.map((c) => (
                      <option key={c.id} value={c.id}>
                        Ch. {c.chapter_number}: {c.title} ({c.page_count} pages)
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
            <span className="w-5 h-5 rounded-full bg-studio-100 text-studio-600 text-xs flex items-center justify-center mr-2">
              2
            </span>
            Upload Manga Files
          </h2>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-studio-500 bg-studio-50/60 scale-[1.01]'
                : 'border-slate-200 hover:border-studio-300 hover:bg-slate-50/50'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept=".zip,.cbz,.png,.jpg,.jpeg,.webp"
              className="hidden"
            />

            <div className="space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-studio-50 text-studio-600 flex items-center justify-center mx-auto">
                <Upload className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Click to browse or drag and drop your manga files
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports .cbz, .zip archives, or multiple .png, .jpg, .webp pages
                </p>
              </div>
            </div>
          </div>

          {/* Selected File Feedback */}
          {selectedFile && (
            <div className="p-4 bg-studio-50 rounded-2xl flex items-center justify-between border border-studio-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-studio-500 text-white flex items-center justify-center">
                  <FileArchive className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">{selectedFile.name}</p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Archive Ready
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedFile(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {selectedImages.length > 0 && (
            <div className="p-4 bg-studio-50 rounded-2xl flex items-center justify-between border border-studio-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-studio-500 text-white flex items-center justify-center">
                  <FileImage className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-800">
                    {selectedImages.length} Image Pages Selected
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {(selectedImages.reduce((a, b) => a + b.size, 0) / (1024 * 1024)).toFixed(2)} MB total
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedImages([])}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {errorMsg && (
            <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center space-x-3 text-rose-700 text-xs">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {progressMsg && (
            <div className="p-4 bg-studio-50 border border-studio-100 rounded-2xl flex items-center space-x-3 text-studio-700 text-xs">
              <Loader2 className="w-5 h-5 animate-spin shrink-0 text-studio-600" />
              <span>{progressMsg}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-slate-100">
          <button
            type="button"
            disabled={(!selectedFile && selectedImages.length === 0) || importMutation.isPending}
            onClick={() => importMutation.mutate()}
            className="inline-flex items-center px-6 py-2.5 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-studio-200 transition active:scale-95"
          >
            {importMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                Start Import
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
