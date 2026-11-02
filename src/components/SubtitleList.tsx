import React from 'react';
import { SubtitleCue } from '../types/subtitle';
import { SubtitleItem } from './SubtitleItem';
import { Sparkles, FileAudio, Plus } from 'lucide-react';

interface SubtitleListProps {
  cues: SubtitleCue[];
  activeCueId: number | null;
  audioCurrentTime: number;
  searchQuery: string;
  onPlayCue: (cue: SubtitleCue) => void;
  onUpdateText: (id: number, text: string) => void;
  onUpdateTiming: (id: number, startMs: number, endMs: number) => void;
  onDeleteCue: (id: number) => void;
  onSplitCue: (id: number) => void;
  onMergeWithNext: (id: number) => void;
  onAddCueAfter: (id: number) => void;
  onAutoSplitWords: (id: number) => void;
  onAddNewCueAtCurrentTime: () => void;
}

export const SubtitleList: React.FC<SubtitleListProps> = ({
  cues,
  activeCueId,
  audioCurrentTime,
  searchQuery,
  onPlayCue,
  onUpdateText,
  onUpdateTiming,
  onDeleteCue,
  onSplitCue,
  onMergeWithNext,
  onAddCueAfter,
  onAutoSplitWords,
  onAddNewCueAtCurrentTime,
}) => {
  const filteredCues = cues.filter((cue) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      cue.text.toLowerCase().includes(query) ||
      cue.id.toString() === query ||
      cue.startTime.includes(query)
    );
  });

  if (cues.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 p-12 text-center dark:border-slate-800 dark:bg-slate-900/50">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
          <Sparkles className="h-7 w-7" />
        </div>
        <h3 className="mt-4 text-base font-bold text-slate-800 dark:text-slate-100">
          No Subtitles Generated Yet
        </h3>
        <p className="mt-1.5 max-w-sm text-xs text-slate-500 dark:text-slate-400">
          Select or record an audio file above and click <strong>Generate AI Subtitles</strong> to create time-synchronized 4-5 word captions.
        </p>
        <button
          type="button"
          onClick={onAddNewCueAtCurrentTime}
          className="mt-5 flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          <span>Or Create Blank Subtitle Cue</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {filteredCues.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          No subtitles match the search query "{searchQuery}".
        </div>
      ) : (
        filteredCues.map((cue) => (
          <SubtitleItem
            key={cue.id}
            cue={cue}
            isActive={cue.id === activeCueId}
            audioCurrentTime={audioCurrentTime}
            onPlayCue={onPlayCue}
            onUpdateText={onUpdateText}
            onUpdateTiming={onUpdateTiming}
            onDeleteCue={onDeleteCue}
            onSplitCue={onSplitCue}
            onMergeWithNext={onMergeWithNext}
            onAddCueAfter={onAddCueAfter}
            onAutoSplitWords={onAutoSplitWords}
          />
        ))
      )}
    </div>
  );
};
