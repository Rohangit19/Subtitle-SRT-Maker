import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  X,
  FileText,
  Code,
  FileCode,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import {
  cuesToSrt,
  cuesToVtt,
  cuesToPlainText,
  countWords,
} from '../utils/srtUtils';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  cues: SubtitleCue[];
  audioFileName: string;
  targetLanguage: string;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  cues,
  audioFileName,
  targetLanguage,
}) => {
  const [activeTab, setActiveTab] = useState<'srt' | 'vtt' | 'txt' | 'json'>('srt');
  const [copied, setCopied] = useState(false);

  const baseFileName = useMemo(() => {
    const raw = audioFileName.replace(/\.[^/.]+$/, '');
    return raw || 'subtitles';
  }, [audioFileName]);

  const srtContent = useMemo(() => cuesToSrt(cues), [cues]);
  const vttContent = useMemo(() => cuesToVtt(cues), [cues]);
  const txtContent = useMemo(() => cuesToPlainText(cues), [cues]);
  const jsonContent = useMemo(() => JSON.stringify(cues, null, 2), [cues]);

  // Statistics
  const stats = useMemo(() => {
    const totalWords = cues.reduce((sum, c) => sum + countWords(c.text), 0);
    const avgWords = cues.length > 0 ? (totalWords / cues.length).toFixed(1) : '0';
    const totalDurationSec =
      cues.length > 0 ? (cues[cues.length - 1].endMs / 1000).toFixed(1) : '0';
    return {
      cuesCount: cues.length,
      totalWords,
      avgWords,
      totalDurationSec,
    };
  }, [cues]);

  if (!isOpen) return null;

  const currentContent = {
    srt: srtContent,
    vtt: vttContent,
    txt: txtContent,
    json: jsonContent,
  }[activeTab];

  const currentExtension = {
    srt: 'srt',
    vtt: 'vtt',
    txt: 'txt',
    json: 'json',
  }[activeTab];

  const currentMime = {
    srt: 'application/x-subrip',
    vtt: 'text/vtt',
    txt: 'text/plain',
    json: 'application/json',
  }[activeTab];

  const handleDownload = () => {
    const blob = new Blob([currentContent], { type: `${currentMime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}_${targetLanguage}.${currentExtension}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Export Synchronized Subtitles
              </h3>
              <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Avg {stats.avgWords} words/cue
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Export standard .SRT for YouTube, Premiere, DaVinci, VLC or Reels captioning.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Subtitle Sync Stats Summary */}
        <div className="grid grid-cols-4 gap-2 border-b border-slate-100 bg-slate-50/60 px-5 py-3 text-center dark:border-slate-800 dark:bg-slate-850">
          <div>
            <div className="text-xs text-slate-400">Total Cues</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {stats.cuesCount}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Total Words</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {stats.totalWords}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Words / Cue</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
              {stats.avgWords} w
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400">Duration</div>
            <div className="text-sm font-bold text-slate-800 dark:text-slate-100">
              {stats.totalDurationSec}s
            </div>
          </div>
        </div>

        {/* Format Selector Tabs */}
        <div className="flex border-b border-slate-200 px-5 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('srt')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'srt'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            .SRT (SubRip)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('vtt')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'vtt'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileCode className="h-4 w-4" />
            .VTT (WebVTT)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('txt')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'txt'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            .TXT (Transcript)
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('json')}
            className={`flex items-center gap-1.5 border-b-2 py-3 px-3 text-xs font-bold transition ${
              activeTab === 'json'
                ? 'border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Code className="h-4 w-4" />
            .JSON (Metadata)
          </button>
        </div>

        {/* Live Code / Syntax Preview Window */}
        <div className="flex-1 overflow-hidden p-5">
          <div className="relative h-64 w-full overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 font-mono text-xs text-slate-200 shadow-inner dark:border-slate-800">
            <pre className="whitespace-pre-wrap">{currentContent}</pre>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/50 p-5 dark:border-slate-800 dark:bg-slate-850">
          <div className="text-xs text-slate-500">
            Target file: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{baseFileName}_{targetLanguage}.{currentExtension}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 active:scale-95 dark:bg-blue-500"
            >
              <Download className="h-4 w-4" />
              <span>Download .{currentExtension.toUpperCase()}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
