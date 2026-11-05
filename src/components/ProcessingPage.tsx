import React, { useState, useEffect } from 'react';
import {
  FileAudio,
  Sparkles,
  Zap,
  Flame,
  CheckCircle2,
  Clock,
  ArrowLeft,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { SupportedLanguage } from '../types/subtitle';

interface ProcessingPageProps {
  fileName: string;
  selectedLanguage: SupportedLanguage;
  statusMessage: string;
  isTranscribing: boolean;
  errorMsg: string | null;
  onCancel: () => void;
  onRetry: () => void;
}

const FUN_TIPS = [
  '⚡ Strict English Rule Active: Spoken English vocabulary, technical terms, and acronyms are preserved in authentic English spelling!',
  '🎯 4 to 5 Words Rule: Ensuring perfect rhythmic pacing so your audience never gets reading fatigue.',
  '🎧 Analyzing vocal frequencies, background noise, and speech cadence with Gemini 3.8 Flash...',
  '🔍 AI is contextually verifying all technical terms, brand names, and acronyms across your audio...',
  '💡 Did you know? Keeping native English terms in subtitles boosts viewer engagement and clarity!',
  '🎨 Next up: You can color any word on-the-spot in the interactive Notepad Preview!',
];

export const ProcessingPage: React.FC<ProcessingPageProps> = ({
  fileName,
  selectedLanguage,
  statusMessage,
  isTranscribing,
  errorMsg,
  onCancel,
  onRetry,
}) => {
  const [progress, setProgress] = useState<number>(12);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [hypeCount, setHypeCount] = useState<number>(0);
  const [showHypeEffect, setShowHypeEffect] = useState<boolean>(false);

  // Smoothly increment progress while waiting for server response
  useEffect(() => {
    if (errorMsg) return;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (!isTranscribing) return 100;
        // Asymptotically approach 96% while waiting for API
        if (prev < 30) return prev + Math.random() * 4 + 2;
        if (prev < 65) return prev + Math.random() * 2.5 + 1;
        if (prev < 88) return prev + Math.random() * 1.2 + 0.6;
        if (prev < 96) return prev + 0.3;
        return 96;
      });
    }, 400);

    return () => clearInterval(timer);
  }, [isTranscribing, errorMsg]);

  // Elapsed seconds timer
  useEffect(() => {
    if (errorMsg) return;
    const interval = setInterval(() => {
      setElapsedSec((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [errorMsg]);

  // Rotate entertaining tips every 3.5 seconds
  useEffect(() => {
    const tipInterval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % FUN_TIPS.length);
    }, 3500);
    return () => clearInterval(tipInterval);
  }, []);

  const handleHype = () => {
    setHypeCount((c) => c + 1);
    setShowHypeEffect(true);
    setTimeout(() => setShowHypeEffect(false), 800);
  };

  const roundedProgress = Math.min(100, Math.round(progress));

  // Determine current active stage
  const getStageStatus = (stageMin: number, stageMax: number) => {
    if (roundedProgress >= stageMax) return 'completed';
    if (roundedProgress >= stageMin) return 'active';
    return 'pending';
  };

  const stages = [
    {
      id: 1,
      min: 0,
      max: 25,
      title: 'Vocal Isolation & Acoustics',
      desc: 'Decoding audio stream waveforms & speech cadence',
    },
    {
      id: 2,
      min: 25,
      max: 55,
      title: 'Neural Speech Transcription',
      desc: `Recognizing words for ${selectedLanguage.toUpperCase()} context`,
    },
    {
      id: 3,
      min: 55,
      max: 80,
      title: 'Strict English Word Preservation',
      desc: 'Converting all spoken English words into standard English Latin alphabet',
    },
    {
      id: 4,
      min: 80,
      max: 95,
      title: 'Precision Timestamp Synchronization',
      desc: 'Formatting strict 4 to 5 words per subtitle cue',
    },
    {
      id: 5,
      min: 95,
      max: 100,
      title: 'Finalizing SRT & Notepad Preview',
      desc: 'Injecting color metadata and building downloadable .srt',
    },
  ];

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-2xl flex-col items-center justify-center px-4 py-8">
      {/* File & Mode Pill */}
      <div className="mb-6 flex flex-wrap items-center justify-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 shadow-2xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <FileAudio className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          <span className="max-w-[180px] truncate">{fileName || 'Audio file'}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 font-semibold uppercase text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300">
          <Volume2 className="h-3 w-3" />
          {selectedLanguage}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 font-mono text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-400">
          <Clock className="h-3 w-3" />
          {elapsedSec}s elapsed
        </span>
      </div>

      {/* Main Interactive Processing Card */}
      <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 sm:p-8">
        {/* Header Title with Animated Waves */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-white shadow-lg shadow-blue-500/25">
            <Sparkles className="h-7 w-7 animate-pulse" />
          </div>

          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-2xl">
            {errorMsg ? 'Transcription Paused' : 'Crafting Studio SRT Subtitles...'}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {statusMessage || 'AI neural engine is actively listening and calibrating timestamps'}
          </p>
        </div>

        {/* Entertaining Animated Sound Wave Equalizer Bars */}
        {!errorMsg && (
          <div className="my-6 flex h-12 items-center justify-center gap-1.5 px-4">
            {[24, 40, 16, 48, 32, 20, 52, 28, 44, 18, 42, 36, 50, 22, 38].map((h, i) => (
              <span
                key={i}
                className="w-1.5 rounded-full bg-gradient-to-t from-blue-600 to-indigo-400 dark:from-blue-500 dark:to-cyan-400"
                style={{
                  height: `${h}px`,
                  animation: `bounceHeight 0.9s ease-in-out infinite alternate`,
                  animationDelay: `${(i * 0.08).toFixed(2)}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Interactive Progress Bar */}
        <div className="mt-2">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {errorMsg ? 'Process Interrupted' : 'Generation Progress'}
            </span>
            <span className="font-mono text-sm font-extrabold text-blue-600 dark:text-blue-400">
              {errorMsg ? 'Error' : `${roundedProgress}%`}
            </span>
          </div>

          {/* Progress track */}
          <div className="relative h-3.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 dark:bg-slate-800">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                errorMsg
                  ? 'bg-rose-500'
                  : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-400 shadow-sm'
              }`}
              style={{ width: `${errorMsg ? 100 : roundedProgress}%` }}
            />
          </div>
        </div>

        {/* Error Notification if any */}
        {errorMsg ? (
          <div className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <div>
                <p className="font-bold">Generation failed</p>
                <p className="mt-0.5 text-slate-600 dark:text-slate-300">{errorMsg}</p>
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-rose-700"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={onCancel}
                className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                Back to Upload
              </button>
            </div>
          </div>
        ) : (
          /* Live Stages Checklist */
          <div className="mt-6 space-y-2.5">
            {stages.map((st) => {
              const status = getStageStatus(st.min, st.max);
              return (
                <div
                  key={st.id}
                  className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 text-xs transition-all ${
                    status === 'completed'
                      ? 'border-emerald-200 bg-emerald-50/50 text-slate-700 dark:border-emerald-950/50 dark:bg-emerald-950/20 dark:text-slate-300'
                      : status === 'active'
                      ? 'border-blue-300 bg-blue-50/60 text-blue-900 shadow-2xs dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400 opacity-60 dark:border-slate-800 dark:bg-slate-900/30 dark:text-slate-500'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {status === 'completed' ? (
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    ) : status === 'active' ? (
                      <div className="relative flex h-4 w-4 shrink-0 items-center justify-center">
                        <span className="absolute h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                        <span className="relative h-2 w-2 rounded-full bg-blue-600" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 shrink-0 rounded-full border border-slate-300 dark:border-slate-700" />
                    )}
                    <div>
                      <p className="font-semibold">{st.title}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400">{st.desc}</p>
                    </div>
                  </div>

                  <span className="font-mono text-[10px] uppercase font-bold tracking-wider">
                    {status === 'completed' ? 'Done' : status === 'active' ? 'Active' : 'Queued'}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* Entertaining Rotating Tip Banner & Interactive Hype Button */}
        {!errorMsg && (
          <div className="mt-6 flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 dark:border-slate-800/80 dark:bg-slate-800/50">
            <div className="flex items-start gap-2">
              <Zap className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              <p className="min-h-[32px] text-[11px] leading-relaxed text-slate-600 transition-all duration-300 dark:text-slate-300">
                {FUN_TIPS[tipIndex]}
              </p>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 dark:border-slate-700/60">
              <button
                type="button"
                onClick={handleHype}
                className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
              >
                <Flame className={`h-3.5 w-3.5 text-orange-500 ${showHypeEffect ? 'scale-125' : ''}`} />
                <span>{hypeCount > 0 ? `Hype Boost x${hypeCount} ⚡` : 'Tap to hype AI speed ⚡'}</span>
              </button>

              <button
                type="button"
                onClick={onCancel}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              >
                <ArrowLeft className="h-3 w-3" />
                <span>Cancel</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes bounceHeight {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1.3); }
        }
      `}</style>
    </div>
  );
};
