import React, { useRef, useEffect } from 'react';
import {
  Play,
  Trash2,
  Split,
  Combine,
  Plus,
  Clock,
  Pin,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import {
  countWords,
  msToSrtTime,
  msToDisplayTime,
} from '../utils/srtUtils';

interface SubtitleItemProps {
  cue: SubtitleCue;
  isActive: boolean;
  audioCurrentTime: number; // in seconds
  onPlayCue: (cue: SubtitleCue) => void;
  onUpdateText: (id: number, text: string) => void;
  onUpdateTiming: (id: number, startMs: number, endMs: number) => void;
  onDeleteCue: (id: number) => void;
  onSplitCue: (id: number) => void;
  onMergeWithNext: (id: number) => void;
  onAddCueAfter: (id: number) => void;
  onAutoSplitWords: (id: number) => void;
}

export const SubtitleItem: React.FC<SubtitleItemProps> = ({
  cue,
  isActive,
  audioCurrentTime,
  onPlayCue,
  onUpdateText,
  onUpdateTiming,
  onDeleteCue,
  onSplitCue,
  onMergeWithNext,
  onAddCueAfter,
  onAutoSplitWords,
}) => {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const wordCount = countWords(cue.text);
  const durationMs = cue.endMs - cue.startMs;
  const isRecommendedWordCount = wordCount >= 3 && wordCount <= 5;
  const isOverLength = wordCount >= 6;

  // Auto-scroll when active during playback
  useEffect(() => {
    if (isActive && rowRef.current) {
      rowRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [isActive]);

  // Adjust timing by delta in ms
  const handleNudgeStart = (deltaMs: number) => {
    const newStart = Math.max(0, cue.startMs + deltaMs);
    const newEnd = Math.max(newStart + 300, cue.endMs);
    onUpdateTiming(cue.id, newStart, newEnd);
  };

  const handleNudgeEnd = (deltaMs: number) => {
    const newEnd = Math.max(cue.startMs + 300, cue.endMs + deltaMs);
    onUpdateTiming(cue.id, cue.startMs, newEnd);
  };

  // Pin timing to current playhead
  const handlePinStartToCurrent = () => {
    const currentMs = Math.round(audioCurrentTime * 1000);
    const newEnd = Math.max(currentMs + 400, cue.endMs);
    onUpdateTiming(cue.id, currentMs, newEnd);
  };

  const handlePinEndToCurrent = () => {
    const currentMs = Math.round(audioCurrentTime * 1000);
    if (currentMs > cue.startMs + 200) {
      onUpdateTiming(cue.id, cue.startMs, currentMs);
    }
  };

  return (
    <div
      ref={rowRef}
      className={`group relative flex flex-col gap-2 rounded-xl border p-3 transition-all ${
        isActive
          ? 'border-blue-500 bg-blue-50/70 shadow-md ring-1 ring-blue-500/30 dark:border-blue-500 dark:bg-blue-950/30'
          : 'border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700'
      }`}
    >
      {/* Top Header: Cue ID, Timestamps, Word count, Play button */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {/* Play this cue */}
          <button
            type="button"
            onClick={() => onPlayCue(cue)}
            title="Play from start of this cue"
            className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
              isActive
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-blue-100 hover:text-blue-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-blue-900'
            }`}
          >
            <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
          </button>

          {/* Cue index pill */}
          <span className="font-mono text-xs font-semibold text-slate-500 dark:text-slate-400">
            #{cue.id}
          </span>

          {/* Word count tag */}
          <span
            className={`flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition ${
              isRecommendedWordCount
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : isOverLength
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
            }`}
            title="Target: 4-5 words per cue for ideal readability"
          >
            {wordCount} {wordCount === 1 ? 'word' : 'words'}
            {isRecommendedWordCount && ' ✓'}
          </span>

          {/* Duration badge */}
          <span className="text-[11px] font-mono text-slate-400">
            ({(durationMs / 1000).toFixed(2)}s)
          </span>

          {/* Quick Auto-split button if too long */}
          {isOverLength && (
            <button
              type="button"
              onClick={() => onAutoSplitWords(cue.id)}
              className="flex items-center gap-1 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 hover:bg-amber-500/20 dark:text-amber-300"
              title="Split this sentence into 4-5 word cues"
            >
              <Sparkles className="h-2.5 w-2.5" />
              Auto-split (4-5w)
            </button>
          )}
        </div>

        {/* Timestamps and Nudge Controls */}
        <div className="flex items-center gap-1.5 text-xs font-mono">
          {/* Start Time block */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleNudgeStart(-100)}
              title="Start -100ms"
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="px-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
              {cue.startTime}
            </span>
            <button
              type="button"
              onClick={() => handleNudgeStart(100)}
              title="Start +100ms"
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handlePinStartToCurrent}
              title="Pin start time to current audio position"
              className="ml-1 border-l border-slate-200 pl-1 text-slate-400 hover:text-blue-600 dark:border-slate-700"
            >
              <Pin className="h-2.5 w-2.5" />
            </button>
          </div>

          <span className="text-slate-400">➔</span>

          {/* End Time block */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50/80 px-1.5 py-0.5 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => handleNudgeEnd(-100)}
              title="End -100ms"
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="px-1 text-[11px] font-medium text-slate-700 dark:text-slate-200">
              {cue.endTime}
            </span>
            <button
              type="button"
              onClick={() => handleNudgeEnd(100)}
              title="End +100ms"
              className="p-0.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
            <button
              type="button"
              onClick={handlePinEndToCurrent}
              title="Pin end time to current audio position"
              className="ml-1 border-l border-slate-200 pl-1 text-slate-400 hover:text-blue-600 dark:border-slate-700"
            >
              <Pin className="h-2.5 w-2.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Center Subtitle Text Area */}
      <div className="w-full">
        <textarea
          rows={2}
          value={cue.text}
          onChange={(e) => onUpdateText(cue.id, e.target.value)}
          placeholder="Enter subtitle text..."
          className="w-full resize-none rounded-lg border border-slate-200 bg-white p-2.5 text-sm font-medium leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      {/* Bottom Tool Actions: Split, Merge, Add After, Delete */}
      <div className="flex items-center justify-between pt-0.5 text-xs text-slate-500">
        <div className="flex items-center gap-1">
          {/* Split Cue */}
          <button
            type="button"
            onClick={() => onSplitCue(cue.id)}
            title="Split this cue into two cues"
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Split className="h-3.5 w-3.5 text-slate-400" />
            <span>Split</span>
          </button>

          {/* Merge with next */}
          <button
            type="button"
            onClick={() => onMergeWithNext(cue.id)}
            title="Merge with subsequent cue"
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Combine className="h-3.5 w-3.5 text-slate-400" />
            <span>Merge Next</span>
          </button>

          {/* Add cue after */}
          <button
            type="button"
            onClick={() => onAddCueAfter(cue.id)}
            title="Insert new cue right after this"
            className="flex items-center gap-1 rounded px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Plus className="h-3.5 w-3.5 text-slate-400" />
            <span>Add Below</span>
          </button>
        </div>

        {/* Delete cue */}
        <button
          type="button"
          onClick={() => onDeleteCue(cue.id)}
          title="Delete this cue"
          className="flex items-center gap-1 rounded px-2 py-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
