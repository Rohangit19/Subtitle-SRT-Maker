import React, { useState } from 'react';
import { Clock, Plus, Minus, X, Check } from 'lucide-react';

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyShift: (offsetMs: number) => void;
  cuesCount: number;
}

export const ShiftModal: React.FC<ShiftModalProps> = ({
  isOpen,
  onClose,
  onApplyShift,
  cuesCount,
}) => {
  const [offsetSec, setOffsetSec] = useState<number>(0.2);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  if (!isOpen) return null;

  const quickPresets = [0.1, 0.25, 0.5, 1.0, 2.0];

  const handleApply = () => {
    const multiplier = direction === 'forward' ? 1 : -1;
    const ms = Math.round(offsetSec * 1000 * multiplier);
    onApplyShift(ms);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-blue-600" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Shift All Subtitles
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          Adjust the start and end timestamps of all {cuesCount} subtitles simultaneously to synchronize with audio lead-in.
        </p>

        {/* Direction Switcher */}
        <div className="mt-4 flex rounded-xl border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
          <button
            type="button"
            onClick={() => setDirection('forward')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              direction === 'forward'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Shift Later (+ Delay)
          </button>
          <button
            type="button"
            onClick={() => setDirection('backward')}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition ${
              direction === 'backward'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-300'
            }`}
          >
            <Minus className="h-3.5 w-3.5" />
            Shift Earlier (- Advance)
          </button>
        </div>

        {/* Custom Input */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
            Shift Amount (Seconds):
          </label>
          <div className="mt-1 flex items-center gap-2">
            <input
              type="number"
              step="0.05"
              min="0.01"
              max="60"
              value={offsetSec}
              onChange={(e) => setOffsetSec(Math.max(0.01, parseFloat(e.target.value) || 0))}
              className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-center font-mono text-base font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            />
            <span className="font-mono text-xs font-medium text-slate-500">
              sec ({Math.round(offsetSec * 1000)} ms)
            </span>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {quickPresets.map((sec) => (
            <button
              key={sec}
              type="button"
              onClick={() => setOffsetSec(sec)}
              className={`rounded-lg border px-2.5 py-1 text-xs font-mono font-medium transition ${
                offsetSec === sec
                  ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300'
              }`}
            >
              {sec}s
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-md hover:bg-blue-700 dark:bg-blue-500"
          >
            <Check className="h-4 w-4" />
            Apply Shift to All Cues
          </button>
        </div>
      </div>
    </div>
  );
};
