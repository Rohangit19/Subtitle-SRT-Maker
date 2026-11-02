import React, { useState, useMemo } from 'react';
import {
  Download,
  Copy,
  Check,
  ArrowLeft,
  RotateCcw,
  FileText,
  MousePointerClick,
} from 'lucide-react';
import { SubtitleCue } from '../types/subtitle';
import { cuesToSrt } from '../utils/srtUtils';

interface OutputPageProps {
  cues: SubtitleCue[];
  srtText: string;
  onChangeSrtText: (text: string) => void;
  audioName: string;
  targetLanguage: string;
  onBackToUpload: () => void;
  onStartNewProject: () => void;
}

export const OutputPage: React.FC<OutputPageProps> = ({
  cues,
  onChangeSrtText,
  audioName,
  targetLanguage,
  onBackToUpload,
  onStartNewProject,
}) => {
  const [copied, setCopied] = useState(false);
  const [colorCode, setColorCode] = useState<string>('#FFD700'); // Clean color code
  const [isColoringActive, setIsColoringActive] = useState<boolean>(true); // Integrated coloring toggle
  const [coloredWords, setColoredWords] = useState<Record<string, string>>({}); // { "cueId-wordIdx": "#FFD700" }

  const baseFileName = audioName.replace(/\.[^/.]+$/, '') || 'subtitles';
  const downloadFileName = `${baseFileName}_${targetLanguage}.srt`;

  // Clean cues text (strips any stray <font> tags)
  const cleanCues = useMemo(() => {
    return cues.map((cue, idx) => ({
      ...cue,
      id: idx + 1,
      text: cue.text.replace(/<\/?font[^>]*>/gi, '').trim(),
    }));
  }, [cues]);

  // Click on a word right in the text preview to color it, or click again to UNDO
  const handleWordClick = (cueId: number, wordIdx: number) => {
    if (!isColoringActive) return;

    const key = `${cueId}-${wordIdx}`;
    setColoredWords((prev) => {
      const next = { ...prev };
      if (next[key]) {
        // Already colored: UNDO on the spot!
        delete next[key];
      } else {
        // Not colored: apply color on the spot!
        const cleanColor = colorCode.trim().startsWith('#')
          ? colorCode.trim()
          : `#${colorCode.trim()}`;
        next[key] = cleanColor;
      }
      return next;
    });
  };

  // Generate SRT content: Automatically includes color tags for any marked words
  const currentSrtContent = useMemo(() => {
    return cleanCues
      .map((cue, index) => {
        const id = index + 1;
        const words = cue.text.split(/\s+/).filter(Boolean);

        const line = words
          .map((w, wIdx) => {
            const color = coloredWords[`${cue.id}-${wIdx}`];
            return color ? `<font color="${color}">${w}</font>` : w;
          })
          .join(' ');

        return `${id}\n${cue.startTime} --> ${cue.endTime}\n${line}\n`;
      })
      .join('\n');
  }, [cleanCues, coloredWords]);

  // Download .SRT file
  const handleDownload = () => {
    const blob = new Blob([currentSrtContent], { type: 'application/x-subrip;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = downloadFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy SRT content
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentSrtContent);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  return (
    <div className="mx-auto flex min-h-[85vh] w-full max-w-3xl flex-col px-4 py-8">
      {/* Top Navigation */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onBackToUpload}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <button
            type="button"
            onClick={onStartNewProject}
            className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <RotateCcw className="h-3 w-3" />
            <span>New File</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span>Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download .SRT</span>
          </button>
        </div>
      </div>

      {/* The Unified Text Preview Thing (Coloring is integrated directly inside it) */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-md dark:border-slate-700 dark:bg-slate-900">
        {/* Integrated Top Bar of the Text Preview Pad */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-100/90 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-800/90">
          <div className="flex items-center gap-2 font-mono text-xs text-slate-700 dark:text-slate-200 truncate">
            <FileText className="h-4 w-4 text-slate-500" />
            <span className="font-semibold truncate">{downloadFileName}</span>
            <span className="text-[11px] text-slate-400">({cleanCues.length} cues)</span>
          </div>

          {/* Integrated Coloring Controls: Single Toggle + Color Code Box */}
          <div className="flex items-center gap-3">
            {/* Coloring tool toggle */}
            <button
              type="button"
              onClick={() => setIsColoringActive(!isColoringActive)}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition shadow-2xs ${
                isColoringActive
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600'
              }`}
            >
              <MousePointerClick className="h-3.5 w-3.5" />
              <span>{isColoringActive ? 'Coloring: ON' : 'Coloring: OFF'}</span>
            </button>

            {/* Clean Color Code Box */}
            <div className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2 py-1 dark:border-slate-600 dark:bg-slate-800">
              <span
                className="h-3.5 w-3.5 rounded-full border border-slate-300 shrink-0"
                style={{ backgroundColor: colorCode }}
              />
              <span className="text-[11px] font-semibold text-slate-400">Color:</span>
              <input
                type="text"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                placeholder="#FFD700"
                className="w-18 font-mono text-xs font-bold uppercase text-slate-800 outline-hidden dark:text-slate-100"
              />
            </div>
          </div>
        </div>

        {/* Text Preview Window (Renders subtitle blocks with NO color codes in the text!) */}
        <div className="h-[62vh] flex-1 overflow-y-auto p-5 font-mono text-xs leading-relaxed bg-white dark:bg-slate-900">
          {cleanCues.map((cue) => {
            const words = cue.text.split(/\s+/).filter(Boolean);

            return (
              <div key={cue.id} className="mb-6 last:mb-2">
                {/* Cue Number Line */}
                <div className="text-slate-400 font-bold select-none">{cue.id}</div>

                {/* Timestamp Line */}
                <div className="text-slate-500 font-medium select-none">
                  {cue.startTime} --&gt; {cue.endTime}
                </div>

                {/* Clean Subtitle Dialogue Line (Click to Color / Click again to Undo) */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900 dark:text-white">
                  {words.map((word, wIdx) => {
                    const wordColor = coloredWords[`${cue.id}-${wIdx}`];
                    const isColored = Boolean(wordColor);

                    return (
                      <span
                        key={wIdx}
                        onClick={() => handleWordClick(cue.id, wIdx)}
                        title={
                          isColoringActive
                            ? isColored
                              ? '👉 Click to Undo color'
                              : `👉 Click to color with ${colorCode}`
                            : undefined
                        }
                        style={{
                          color: isColored ? wordColor : undefined,
                        }}
                        className={`inline-block rounded px-1 py-0.5 transition-all ${
                          isColored
                            ? 'font-bold underline decoration-2 underline-offset-4 bg-slate-100 dark:bg-slate-800'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                        } ${
                          isColoringActive
                            ? 'cursor-pointer hover:scale-105 select-none'
                            : 'cursor-default'
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Download CTA */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <span>
          👉 Click any word to color it • Click again to Undo • Color tags are automatically included in the downloaded SRT.
        </span>
        <button
          type="button"
          onClick={handleDownload}
          className="font-bold text-blue-600 hover:underline dark:text-blue-400"
        >
          Download {downloadFileName}
        </button>
      </div>
    </div>
  );
};
