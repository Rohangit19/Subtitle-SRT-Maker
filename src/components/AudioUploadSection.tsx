import React, { useRef, useState } from 'react';
import {
  Upload,
  FileAudio,
  Check,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { SupportedLanguage } from '../types/subtitle';
import { generateSyntheticWavBlob, SAMPLE_PRESETS } from '../utils/audioGenerator';

interface AudioUploadSectionProps {
  onAudioReady: (
    fileBlob: Blob,
    fileName: string,
    mimeType: string,
    initialCues?: any[]
  ) => void;
  onGenerateSubtitles: () => Promise<void>;
  isTranscribing: boolean;
  transcriptionStatus: string;
  selectedLanguage: SupportedLanguage;
  onChangeLanguage: (lang: SupportedLanguage) => void;
  hasAudioLoaded: boolean;
  currentAudioName: string;
  onBackToHome: () => void;
}

export const AudioUploadSection: React.FC<AudioUploadSectionProps> = ({
  onAudioReady,
  onGenerateSubtitles,
  isTranscribing,
  transcriptionStatus,
  selectedLanguage,
  onChangeLanguage,
  hasAudioLoaded,
  currentAudioName,
  onBackToHome,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const languages: Array<{ id: SupportedLanguage; label: string; script: string }> = [
    { id: 'gujarati', label: 'Gujarati', script: 'ગુજરાતી' },
    { id: 'hindi', label: 'Hindi', script: 'हिन्दी' },
    { id: 'english', label: 'English', script: 'English' },
    { id: 'hinglish', label: 'Hinglish', script: 'Roman Hindi' },
    { id: 'gujlish', label: 'Gujlish', script: 'Roman Gujarati' },
  ];

  const handleFile = (file: File) => {
    setErrorMsg(null);
    if (!file.type.startsWith('audio/') && !file.type.startsWith('video/')) {
      setErrorMsg('Please upload a valid audio or video file (MP3, WAV, M4A, etc.)');
      return;
    }
    onAudioReady(file, file.name, file.type);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleUseSample = (lang: SupportedLanguage) => {
    const preset = SAMPLE_PRESETS.find((p) => p.language === lang) || SAMPLE_PRESETS[0];
    const syntheticBlob = generateSyntheticWavBlob(preset.durationSec);
    onChangeLanguage(preset.language);
    onAudioReady(
      syntheticBlob,
      `${preset.title.replace(/\s+/g, '_')}.wav`,
      'audio/wav',
      preset.defaultCues
    );
  };

  return (
    <div className="mx-auto flex min-h-[75vh] w-full max-w-xl flex-col justify-center px-4 py-8">
      {/* Back button */}
      <div className="mb-4">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back</span>
        </button>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 dark:border-slate-800 dark:bg-slate-900">
        <h2 className="text-xl font-bold text-slate-900 dark:text-white">
          Upload Audio & Select Language
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Upload your file and choose the language for your 4–5 words SRT file.
        </p>

        {errorMsg && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 1. Audio Upload Box */}
        <div className="mt-6">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            1. Audio File
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.mp4"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFile(e.target.files[0]);
              }
            }}
            className="hidden"
          />

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 flex flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition cursor-pointer ${
              hasAudioLoaded
                ? 'border-emerald-400 bg-emerald-50/40 dark:border-emerald-800 dark:bg-emerald-950/20'
                : isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/70 dark:border-slate-700 dark:hover:bg-slate-800/40'
            }`}
          >
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-full ${
                hasAudioLoaded
                  ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/60 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {hasAudioLoaded ? (
                <Check className="h-5 w-5" />
              ) : (
                <FileAudio className="h-5 w-5" />
              )}
            </div>

            <div className="mt-2 text-sm font-semibold text-slate-800 dark:text-slate-100">
              {hasAudioLoaded ? currentAudioName : 'Click or drop audio file here'}
            </div>
            <div className="mt-0.5 text-xs text-slate-400">
              {hasAudioLoaded ? 'Click to change file' : 'MP3, WAV, M4A, AAC, MP4'}
            </div>
          </div>

          {/* Quick sample link if user doesn't have an audio file ready */}
          {!hasAudioLoaded && (
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
              <span>Don't have an audio file?</span>
              <button
                type="button"
                onClick={() => handleUseSample('hinglish')}
                className="font-medium text-blue-600 hover:underline dark:text-blue-400"
              >
                Use sample audio
              </button>
            </div>
          )}
        </div>

        {/* 2. Language Selection */}
        <div className="mt-6">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
            2. Language
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {languages.map((lang) => {
              const isSelected = selectedLanguage === lang.id;
              return (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => onChangeLanguage(lang.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/70 font-semibold text-blue-900 shadow-xs dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-100'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800'
                  }`}
                >
                  <div className="flex w-full items-center justify-between text-xs font-bold">
                    <span>{lang.label}</span>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600" />}
                  </div>
                  <span className="mt-0.5 text-[10px] text-slate-400">{lang.script}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Generate Button */}
        <div className="mt-8">
          <button
            type="button"
            disabled={!hasAudioLoaded || isTranscribing}
            onClick={onGenerateSubtitles}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-700 active:scale-95 disabled:pointer-events-none disabled:opacity-40 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            {isTranscribing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{transcriptionStatus || 'Generating Subtitles...'}</span>
              </>
            ) : (
              <span>Generate SRT Subtitles</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
