import React, { useState } from 'react';
import {
  Search,
  Clock,
  Download,
  Upload,
  Plus,
  SlidersHorizontal,
  ArrowRightLeft,
  Sparkles,
  RotateCcw,
  Eye,
  Check,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';

interface ToolbarProps {
  cuesCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenExport: () => void;
  onOpenShiftModal: () => void;
  onAddNewCue: () => void;
  onAutoChunkAll: () => void;
  onImportSrt: (file: File) => void;
  followAudio: boolean;
  onToggleFollowAudio: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  cuesCount,
  searchQuery,
  onSearchChange,
  onOpenExport,
  onOpenShiftModal,
  onAddNewCue,
  onAutoChunkAll,
  onImportSrt,
  followAudio,
  onToggleFollowAudio,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200/90 bg-white p-3 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      {/* Search Input */}
      <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${cuesCount} subtitles...`}
          className="w-full rounded-lg border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-hidden dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-100"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Follow Audio Toggle */}
        <button
          type="button"
          onClick={onToggleFollowAudio}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition ${
            followAudio
              ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300'
              : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800'
          }`}
          title="Auto-scroll to current speaking subtitle during playback"
        >
          <Eye className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Follow Playhead</span>
        </button>

        {/* Global Shift Offset */}
        <button
          type="button"
          disabled={cuesCount === 0}
          onClick={onOpenShiftModal}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title="Shift all subtitle timestamps forward or backward"
        >
          <Clock className="h-3.5 w-3.5 text-slate-400" />
          <span>Shift Timing</span>
        </button>

        {/* Auto-rechunk to 4-5 words */}
        <button
          type="button"
          disabled={cuesCount === 0}
          onClick={onAutoChunkAll}
          className="flex items-center gap-1.5 rounded-lg border border-amber-200/80 bg-amber-50/70 px-2.5 py-1.5 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 disabled:opacity-40 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300"
          title="Auto-split any cues longer than 5 words into 4-5 word chunks"
        >
          <Sparkles className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <span className="hidden sm:inline">Enforce 4-5w</span>
        </button>

        {/* Add Cue button */}
        <button
          type="button"
          onClick={onAddNewCue}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title="Insert a new subtitle cue at current audio position"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Cue</span>
        </button>

        {/* Import existing SRT */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".srt"
          onChange={(e) => {
            if (e.target.files && e.target.files[0]) {
              onImportSrt(e.target.files[0]);
            }
          }}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          title="Import an existing .SRT file to edit and sync with this audio"
        >
          <Upload className="h-3.5 w-3.5" />
          <span className="hidden md:inline">Import SRT</span>
        </button>

        {/* Main Export Button */}
        <button
          type="button"
          disabled={cuesCount === 0}
          onClick={onOpenExport}
          className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-blue-500"
        >
          <Download className="h-3.5 w-3.5" />
          <span>Export SRT</span>
        </button>
      </div>
    </div>
  );
};
