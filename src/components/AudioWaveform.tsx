import React, { useEffect, useRef, useState, useMemo } from 'react';
import { SubtitleCue } from '../types/subtitle';
import { msToDisplayTime } from '../utils/srtUtils';

interface AudioWaveformProps {
  audioBlob?: Blob;
  audioUrl?: string;
  currentTime: number; // in seconds
  duration: number;    // in seconds
  activeCue?: SubtitleCue | null;
  cues: SubtitleCue[];
  onSeek: (timeInSec: number) => void;
}

export const AudioWaveform: React.FC<AudioWaveformProps> = ({
  audioBlob,
  audioUrl,
  currentTime,
  duration,
  activeCue,
  cues,
  onSeek,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [waveData, setWaveData] = useState<number[]>([]);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const [isDecoding, setIsDecoding] = useState<boolean>(false);

  // Decode audio data to extract waveform peaks
  useEffect(() => {
    let isCancelled = false;

    async function extractPeaks() {
      if (!audioBlob && !audioUrl) {
        // Fallback default dynamic wave pattern
        const bars = 140;
        const fallback = Array.from({ length: bars }, (_, i) => {
          const t = i / bars;
          return Math.abs(Math.sin(t * 12)) * 0.5 + Math.sin(t * 3) * 0.3 + 0.15;
        });
        setWaveData(fallback);
        return;
      }

      setIsDecoding(true);
      try {
        let arrayBuffer: ArrayBuffer;
        if (audioBlob) {
          arrayBuffer = await audioBlob.arrayBuffer();
        } else if (audioUrl) {
          const res = await fetch(audioUrl);
          arrayBuffer = await res.arrayBuffer();
        } else {
          return;
        }

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const decodedBuffer = await ctx.decodeAudioData(arrayBuffer.slice(0));

        if (isCancelled) {
          ctx.close();
          return;
        }

        const channelData = decodedBuffer.getChannelData(0);
        const barsCount = 180;
        const step = Math.floor(channelData.length / barsCount);
        const peaks: number[] = [];

        for (let i = 0; i < barsCount; i++) {
          const start = i * step;
          let max = 0;
          for (let j = 0; j < step; j += 4) {
            const val = Math.abs(channelData[start + j] || 0);
            if (val > max) max = val;
          }
          peaks.push(Math.min(1, Math.max(0.12, max * 1.8)));
        }

        ctx.close();
        if (!isCancelled) {
          setWaveData(peaks);
        }
      } catch (err) {
        console.warn('Could not decode audio peaks directly, using procedural waveform:', err);
        const bars = 140;
        const fallback = Array.from({ length: bars }, (_, i) => {
          const t = i / bars;
          return Math.abs(Math.sin(t * 15)) * 0.4 + 0.2;
        });
        if (!isCancelled) {
          setWaveData(fallback);
        }
      } finally {
        if (!isCancelled) {
          setIsDecoding(false);
        }
      }
    }

    extractPeaks();

    return () => {
      isCancelled = true;
    };
  }, [audioBlob, audioUrl]);

  // Redraw canvas whenever playback position or active cue changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const safeDuration = duration > 0 ? duration : 1;
    const currentProgress = Math.min(1, Math.max(0, currentTime / safeDuration));
    const activeStartProgress = activeCue ? Math.min(1, Math.max(0, activeCue.startMs / 1000 / safeDuration)) : null;
    const activeEndProgress = activeCue ? Math.min(1, Math.max(0, activeCue.endMs / 1000 / safeDuration)) : null;

    // Draw active cue highlight background banner
    if (activeStartProgress !== null && activeEndProgress !== null) {
      const activeX1 = activeStartProgress * width;
      const activeX2 = activeEndProgress * width;
      const activeW = Math.max(4, activeX2 - activeX1);

      ctx.fillStyle = 'rgba(59, 130, 246, 0.18)'; // Soft blue glow
      ctx.fillRect(activeX1, 0, activeW, height);

      // Border lines for active cue
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(activeX1, 0);
      ctx.lineTo(activeX1, height);
      ctx.moveTo(activeX2, 0);
      ctx.lineTo(activeX2, height);
      ctx.stroke();
    }

    // Draw cue boundary tick markers along bottom
    if (cues && cues.length > 0) {
      ctx.fillStyle = 'rgba(148, 163, 184, 0.4)';
      cues.forEach((c) => {
        const x = (c.startMs / 1000 / safeDuration) * width;
        ctx.fillRect(x - 0.5, height - 8, 1, 8);
      });
    }

    // Draw waveform bars
    const barCount = waveData.length;
    const totalGap = (barCount - 1) * 2;
    const barWidth = Math.max(2, (width - totalGap) / barCount);

    waveData.forEach((peak, i) => {
      const barX = i * (barWidth + 2);
      const barHeight = Math.max(4, peak * (height - 18));
      const barY = (height - barHeight) / 2;
      const barProgress = i / barCount;

      // Color coding: Played vs Upcoming vs Inside Active Cue
      const isPast = barProgress <= currentProgress;
      const isInActiveCue =
        activeStartProgress !== null &&
        activeEndProgress !== null &&
        barProgress >= activeStartProgress &&
        barProgress <= activeEndProgress;

      if (isInActiveCue) {
        ctx.fillStyle = isPast ? '#2563eb' : '#60a5fa'; // vibrant blue
      } else if (isPast) {
        ctx.fillStyle = '#0284c7'; // played teal/blue
      } else {
        ctx.fillStyle = '#cbd5e1'; // slate unplayed
      }

      // Rounded bar top and bottom
      ctx.beginPath();
      const radius = 2;
      ctx.roundRect(barX, barY, barWidth, barHeight, radius);
      ctx.fill();
    });

    // Draw Playhead line
    const playheadX = currentProgress * width;
    ctx.strokeStyle = '#ef4444'; // Red playhead indicator
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead handle circle
    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(playheadX, 7, 5, 0, Math.PI * 2);
    ctx.fill();
  }, [waveData, currentTime, duration, activeCue, cues]);

  // Click & scrub handler
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const progress = Math.min(1, Math.max(0, clickX / rect.width));
    onSeek(progress * duration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || duration <= 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = Math.min(1, Math.max(0, x / rect.width));
    setHoverTime(progress * duration);
    setHoverX(x);
  };

  const handleMouseLeave = () => {
    setHoverTime(null);
    setHoverX(null);
  };

  return (
    <div className="relative w-full select-none py-2">
      <div
        ref={containerRef}
        onClick={handleSeek}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative h-24 w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50/70 p-2 shadow-inner transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:bg-slate-900"
      >
        <canvas
          ref={canvasRef}
          width={1000}
          height={80}
          className="h-full w-full rounded-lg"
        />

        {/* Hover Time Tooltip */}
        {hoverTime !== null && hoverX !== null && (
          <div
            style={{ left: `${hoverX}px` }}
            className="pointer-events-none absolute top-1 -translate-x-1/2 -translate-y-6 rounded bg-slate-900/90 px-1.5 py-0.5 text-[11px] font-mono font-medium text-white shadow"
          >
            {msToDisplayTime(hoverTime * 1000)}
          </div>
        )}

        {/* Loading overlay while analyzing */}
        {isDecoding && (
          <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-white/70 backdrop-blur-xs dark:bg-slate-900/70">
            <span className="text-xs font-medium text-slate-500 animate-pulse">
              Analyzing audio waveform...
            </span>
          </div>
        )}
      </div>

      {/* Timeline ruler indicator */}
      <div className="mt-1 flex justify-between px-1 text-[11px] font-mono text-slate-400 dark:text-slate-500">
        <span>00:00.0</span>
        {activeCue && (
          <span className="text-blue-600 font-semibold dark:text-blue-400">
            Active Cue #{activeCue.id}: {activeCue.startTime} ➔ {activeCue.endTime}
          </span>
        )}
        <span>{msToDisplayTime(duration * 1000)}</span>
      </div>
    </div>
  );
};
