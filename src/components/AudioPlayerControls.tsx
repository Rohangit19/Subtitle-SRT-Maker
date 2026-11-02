import React, { useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Repeat,
  Volume2,
  VolumeX,
  Gauge,
  FastForward,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { msToDisplayTime } from '../utils/srtUtils';

interface AudioPlayerControlsProps {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  playbackRate: number;
  volume: number;
  isMuted: boolean;
  isLoopingCue: boolean;
  activeCue?: SubtitleCue | null;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onChangeRate: (rate: number) => void;
  onToggleMute: () => void;
  onChangeVolume: (vol: number) => void;
  onToggleLoopCue: () => void;
  onReplayCurrentCue: () => void;
}

export const AudioPlayerControls: React.FC<AudioPlayerControlsProps> = ({
  isPlaying,
  currentTime,
  duration,
  playbackRate,
  volume,
  isMuted,
  isLoopingCue,
  activeCue,
  onTogglePlay,
  onSeek,
  onChangeRate,
  onToggleMute,
  onChangeVolume,
  onToggleLoopCue,
  onReplayCurrentCue,
}) => {
  // Keyboard listener for Spacebar play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't hijack space if user is actively typing in an input or textarea
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay();
      } else if (e.code === 'ArrowLeft') {
        e.preventDefault();
        onSeek(Math.max(0, currentTime - 3));
      } else if (e.code === 'ArrowRight') {
        e.preventDefault();
        onSeek(Math.min(duration, currentTime + 3));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onTogglePlay, onSeek, currentTime, duration]);

  const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/90">
      {/* Live Active Subtitle Billboard */}
      <div className="flex min-h-[52px] items-center justify-center rounded-xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-6 py-2.5 text-center text-white shadow-inner">
        {activeCue ? (
          <div className="animate-in fade-in duration-150">
            <span className="font-sans text-lg font-semibold tracking-wide text-amber-300 drop-shadow-sm">
              "{activeCue.text}"
            </span>
            <span className="ml-2.5 rounded bg-blue-500/30 px-1.5 py-0.5 font-mono text-[11px] text-blue-200">
              #{activeCue.id}
            </span>
          </div>
        ) : (
          <span className="text-xs font-medium tracking-wide text-slate-400 italic">
            {duration > 0
              ? 'Press Play or click a subtitle to preview synchronized caption'
              : 'Load audio to start generating accurate 4-5 word subtitles'}
          </span>
        )}
      </div>

      {/* Control Buttons Bar */}
      <div className="mt-1 flex flex-wrap items-center justify-between gap-3">
        {/* Time display */}
        <div className="flex items-center gap-1 font-mono text-xs font-semibold text-slate-700 dark:text-slate-300">
          <span className="text-blue-600 dark:text-blue-400">
            {msToDisplayTime(currentTime * 1000)}
          </span>
          <span className="text-slate-400">/</span>
          <span>{msToDisplayTime(duration * 1000)}</span>
        </div>

        {/* Center Main Transport Controls */}
        <div className="flex items-center gap-1.5">
          {/* Replay Current Cue */}
          <button
            type="button"
            disabled={!activeCue}
            onClick={onReplayCurrentCue}
            title="Replay active cue from beginning"
            className="flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-100 disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Replay Cue</span>
          </button>

          {/* Jump -3s */}
          <button
            type="button"
            onClick={() => onSeek(Math.max(0, currentTime - 3))}
            title="Jump back 3 seconds (Left Arrow)"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          {/* Main Play/Pause Button */}
          <button
            type="button"
            onClick={onTogglePlay}
            disabled={duration <= 0}
            title="Play / Pause (Spacebar)"
            className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600 text-white shadow-md transition hover:bg-blue-700 hover:scale-105 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-blue-500 dark:hover:bg-blue-600"
          >
            {isPlaying ? (
              <Pause className="h-5 w-5 fill-current" />
            ) : (
              <Play className="h-5 w-5 fill-current ml-0.5" />
            )}
          </button>

          {/* Jump +3s */}
          <button
            type="button"
            onClick={() => onSeek(Math.min(duration, currentTime + 3))}
            title="Jump forward 3 seconds (Right Arrow)"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          {/* Loop Current Cue Toggle */}
          <button
            type="button"
            disabled={!activeCue}
            onClick={onToggleLoopCue}
            title={
              isLoopingCue
                ? 'Looping current cue (click to disable)'
                : 'Loop current 4-5 word cue to verify sync'
            }
            className={`flex h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition disabled:opacity-40 ${
              isLoopingCue
                ? 'border-blue-500 bg-blue-50 text-blue-700 shadow-inner dark:bg-blue-950/60 dark:text-blue-300'
                : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            <Repeat className={`h-3.5 w-3.5 ${isLoopingCue ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">
              {isLoopingCue ? 'Looping Cue' : 'Loop Cue'}
            </span>
          </button>
        </div>

        {/* Right tools: Speed & Volume */}
        <div className="flex items-center gap-3">
          {/* Playback speed selector */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Gauge className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={playbackRate}
              onChange={(e) => onChangeRate(parseFloat(e.target.value))}
              className="bg-transparent font-medium outline-hidden cursor-pointer"
            >
              {rates.map((r) => (
                <option key={r} value={r} className="dark:bg-slate-800">
                  {r}x
                </option>
              ))}
            </select>
          </div>

          {/* Volume slider */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleMute}
              className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="h-4 w-4" />
              ) : (
                <Volume2 className="h-4 w-4" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
              className="h-1.5 w-16 cursor-pointer accent-blue-600 dark:accent-blue-400"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
