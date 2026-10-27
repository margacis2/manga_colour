import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { 
  Palette as PaletteIcon, 
  UserPlus, 
  Plus, 
  Trash2, 
  Sparkles, 
  Check, 
  CheckCircle2, 
  Image as ImageIcon,
  FolderHeart
} from 'lucide-react';
import { api } from '../api/client';
import { CharacterProfile, Palette } from '../types';

export const Palettes: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project_id');

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: api.getProjects,
  });

  const activeProject = projects.find((p) => p.id === selectedProjectId) || projects[0];

  const { data: characters = [], isLoading: loadingChars } = useQuery({
    queryKey: ['characters', activeProject?.id],
    queryFn: () => (activeProject ? api.getCharacters(activeProject.id) : []),
    enabled: !!activeProject,
  });

  const { data: palettes = [], isLoading: loadingPalettes } = useQuery({
    queryKey: ['palettes', activeProject?.id],
    queryFn: () => (activeProject ? api.getPalettes(activeProject.id) : []),
    enabled: !!activeProject,
  });

  // Modal states
  const [isCharModalOpen, setIsCharModalOpen] = useState(false);
  const [charName, setCharName] = useState('');
  const [charNotes, setCharNotes] = useState('');

  const [isPaletteModalOpen, setIsPaletteModalOpen] = useState(false);
  const [paletteName, setPaletteName] = useState('');
  const [paletteCharId, setPaletteCharId] = useState<string>('');
  const [isDefault, setIsDefault] = useState(false);
  const [skinTone, setSkinTone] = useState('#ffe4d6');
  const [hairColor, setHairColor] = useState('#2d2424');
  const [eyeColor, setEyeColor] = useState('#4a3b32');
  const [clothingColor, setClothingColor] = useState('#1e40af');
  const [accentColor, setAccentColor] = useState('#f59e0b');

  const createCharMutation = useMutation({
    mutationFn: (data: { name: string; notes?: string }) =>
      api.createCharacter(activeProject.id, data.name, data.notes),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', activeProject?.id] });
      setIsCharModalOpen(false);
      setCharName('');
      setCharNotes('');
    },
  });

  const deleteCharMutation = useMutation({
    mutationFn: (id: string) => api.deleteCharacter(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['characters', activeProject?.id] });
    },
  });

  const createPaletteMutation = useMutation({
    mutationFn: (paletteData: Partial<Palette>) =>
      api.createPalette(activeProject.id, paletteData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['palettes', activeProject?.id] });
      setIsPaletteModalOpen(false);
      setPaletteName('');
      setPaletteCharId('');
    },
  });

  const deletePaletteMutation = useMutation({
    mutationFn: (id: string) => api.deletePalette(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['palettes', activeProject?.id] });
    },
  });

  // Blue Box Presets Quick Adder
  const applyPreset = (preset: { name: string; skin: string; hair: string; eye: string; cloth: string; accent: string }) => {
    setPaletteName(preset.name);
    setSkinTone(preset.skin);
    setHairColor(preset.hair);
    setEyeColor(preset.eye);
    setClothingColor(preset.cloth);
    setAccentColor(preset.accent);
  };

  const blueBoxPresets = [
    {
      name: 'Chinatsu Kano (Standard Uniform)',
      skin: '#fff0e5',
      hair: '#d4a373', // Light brownish-blonde
      eye: '#5c4d3c',
      cloth: '#1e3a8a', // Eimei High School Blue Uniform
      accent: '#facc15',
    },
    {
      name: 'Taiki Inomata (Badminton Kit)',
      skin: '#ffe3d1',
      hair: '#1f2937', // Dark navy/black
      eye: '#374151',
      cloth: '#dc2626', // Red Badminton Jersey
      accent: '#ffffff',
    },
    {
      name: 'Hina Chono (Rhythmic Gymnastics)',
      skin: '#fff3ea',
      hair: '#4b382a', // Auburn/brown
      eye: '#402e21',
      cloth: '#ec4899', // Pink Gymnastics Leotard
      accent: '#a855f7',
    },
  ];

  if (projects.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-16 px-4 text-center space-y-4">
        <PaletteIcon className="w-16 h-16 text-studio-300 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800">No Projects Found</h2>
        <p className="text-slate-500 text-sm">Create a project in the dashboard before configuring character palettes.</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800 flex items-center">
            <PaletteIcon className="w-6 h-6 mr-2 text-studio-600" />
            Character Color Palettes & Consistency
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ensure persistent hair, eye, skin tone, and uniform colors across all chapters of your manga project.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={activeProject?.id || ''}
            onChange={(e) => setSearchParams({ project_id: e.target.value })}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-studio-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => setIsCharModalOpen(true)}
            className="inline-flex items-center px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            New Character
          </button>

          <button
            onClick={() => setIsPaletteModalOpen(true)}
            className="inline-flex items-center px-4 py-2 rounded-xl bg-studio-600 hover:bg-studio-700 text-white text-xs font-semibold shadow transition"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Palette
          </button>
        </div>
      </div>

      {/* Main Grid: Characters List & Project Palettes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Characters Sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
              Characters ({characters.length})
            </h2>
          </div>

          {characters.length === 0 ? (
            <div className="p-6 text-center bg-white rounded-2xl border border-dashed border-slate-200 space-y-2">
              <p className="text-xs font-semibold text-slate-700">No characters registered</p>
              <p className="text-[11px] text-slate-400">Add characters to assign dedicated palettes and reference sheets.</p>
              <button
                onClick={() => setIsCharModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-studio-50 text-studio-600 font-semibold text-xs hover:bg-studio-100"
              >
                Add First Character
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {characters.map((char) => (
                <div
                  key={char.id}
                  className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-2 hover:border-studio-200 transition"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-800">{char.name}</h3>
                    <button
                      onClick={() => {
                        if (confirm(`Delete character ${char.name}?`)) {
                          deleteCharMutation.mutate(char.id);
                        }
                      }}
                      className="text-slate-400 hover:text-rose-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {char.notes && (
                    <p className="text-xs text-slate-500 line-clamp-2">{char.notes}</p>
                  )}
                  <div className="flex items-center text-[10px] text-slate-400 pt-1">
                    <span>{palettes.filter((p) => p.character_id === char.id).length} palettes linked</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Palettes Cards Grid */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
            Color Palettes ({palettes.length})
          </h2>

          {palettes.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-3xl border border-dashed border-slate-200 space-y-3">
              <Sparkles className="w-8 h-8 text-sakura-400 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No color palettes configured</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create palettes with specific skin tones, hair colors, and uniforms to preserve character consistency during AI colorization.
              </p>
              <button
                onClick={() => setIsPaletteModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-studio-600 text-white font-semibold text-xs shadow hover:bg-studio-700 transition"
              >
                Create Color Palette
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {palettes.map((pal) => (
                <div
                  key={pal.id}
                  className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4 hover:shadow-md transition relative group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="text-sm font-bold text-slate-800">{pal.name}</h3>
                        {pal.is_default && (
                          <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-studio-100 text-studio-700">
                            Default
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {characters.find((c) => c.id === pal.character_id)?.name || 'Project-Wide Palette'}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete palette "${pal.name}"?`)) {
                          deletePaletteMutation.mutate(pal.id);
                        }
                      }}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Swatches display */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Color Swatches
                    </span>
                    <div className="flex items-center space-x-2">
                      {pal.skin_tones?.map((c, i) => (
                        <div
                          key={`skin-${i}`}
                          className="w-8 h-8 rounded-xl shadow-inner border border-black/10 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`Skin Tone: ${c}`}
                        />
                      ))}
                      {pal.hair_colors?.map((c, i) => (
                        <div
                          key={`hair-${i}`}
                          className="w-8 h-8 rounded-xl shadow-inner border border-black/10 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`Hair: ${c}`}
                        />
                      ))}
                      {pal.eye_colors?.map((c, i) => (
                        <div
                          key={`eye-${i}`}
                          className="w-8 h-8 rounded-xl shadow-inner border border-black/10 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`Eyes: ${c}`}
                        />
                      ))}
                      {pal.clothing_colors?.map((c, i) => (
                        <div
                          key={`cloth-${i}`}
                          className="w-8 h-8 rounded-xl shadow-inner border border-black/10 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`Clothing: ${c}`}
                        />
                      ))}
                      {pal.accessories_colors?.map((c, i) => (
                        <div
                          key={`acc-${i}`}
                          className="w-8 h-8 rounded-xl shadow-inner border border-black/10 transition-transform hover:scale-110"
                          style={{ backgroundColor: c }}
                          title={`Accent: ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* New Character Modal */}
      {isCharModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800">Register Character</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Character Name *
                </label>
                <input
                  type="text"
                  value={charName}
                  onChange={(e) => setCharName(e.target.value)}
                  placeholder="e.g. Chinatsu Kano"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Notes & Details
                </label>
                <textarea
                  value={charNotes}
                  onChange={(e) => setCharNotes(e.target.value)}
                  placeholder="Basketball jersey #4, brown bob hair, warm indoor scenes..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={() => setIsCharModalOpen(false)}
                className="px-3 py-1.5 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!charName.trim() || createCharMutation.isPending}
                onClick={() => createCharMutation.mutate({ name: charName.trim(), notes: charNotes.trim() })}
                className="px-4 py-1.5 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                {createCharMutation.isPending ? 'Saving...' : 'Register'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Palette Modal */}
      {isPaletteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-800">Create Character Color Palette</h3>

            {/* Quick Presets */}
            <div className="p-3 bg-studio-50 rounded-2xl border border-studio-100 space-y-2">
              <span className="text-[11px] font-bold text-studio-700 block">
                Quick Blue Box Character Presets:
              </span>
              <div className="flex flex-wrap gap-2">
                {blueBoxPresets.map((preset) => (
                  <button
                    key={preset.name}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-2.5 py-1 bg-white hover:bg-studio-100 rounded-lg text-[11px] font-semibold text-studio-800 shadow-sm border border-studio-200 transition"
                  >
                    {preset.name.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Palette Name *
                </label>
                <input
                  type="text"
                  value={paletteName}
                  onChange={(e) => setPaletteName(e.target.value)}
                  placeholder="e.g. Standard Uniform Palette"
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-studio-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Link to Character
                </label>
                <select
                  value={paletteCharId}
                  onChange={(e) => setPaletteCharId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-studio-500"
                >
                  <option value="">General Project Palette</option>
                  {characters.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Color Pickers */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Skin Tone
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={skinTone}
                      onChange={(e) => setSkinTone(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={skinTone}
                      onChange={(e) => setSkinTone(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hair Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={hairColor}
                      onChange={(e) => setHairColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={hairColor}
                      onChange={(e) => setHairColor(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Eye Color
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={eyeColor}
                      onChange={(e) => setEyeColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={eyeColor}
                      onChange={(e) => setEyeColor(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Outfit / Uniform
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={clothingColor}
                      onChange={(e) => setClothingColor(e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-0 p-0"
                    />
                    <input
                      type="text"
                      value={clothingColor}
                      onChange={(e) => setClothingColor(e.target.value)}
                      className="w-24 px-2 py-1 rounded-lg border border-slate-200 text-xs font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="defaultCheck"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded text-studio-600 focus:ring-studio-500"
                />
                <label htmlFor="defaultCheck" className="text-xs font-medium text-slate-700">
                  Set as default palette for automated chapter colorization
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
              <button
                onClick={() => setIsPaletteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-slate-500 hover:bg-slate-100 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                disabled={!paletteName.trim() || createPaletteMutation.isPending}
                onClick={() =>
                  createPaletteMutation.mutate({
                    name: paletteName.trim(),
                    character_id: paletteCharId || undefined,
                    skin_tones: [skinTone],
                    hair_colors: [hairColor],
                    eye_colors: [eyeColor],
                    clothing_colors: [clothingColor],
                    accessories_colors: [accentColor],
                    is_default: isDefault,
                  })
                }
                className="px-5 py-2 rounded-xl bg-studio-600 hover:bg-studio-700 disabled:opacity-50 text-white text-xs font-semibold shadow"
              >
                {createPaletteMutation.isPending ? 'Saving...' : 'Save Palette'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
