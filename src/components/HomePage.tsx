import React from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';

interface HomePageProps {
  onStart: () => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onStart }) => {
  return (
    <div className="flex min-h-[75vh] flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mx-auto max-w-2xl">
        {/* Simple Minimalist Title */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-6xl dark:text-white">
          AudioToSRT
        </h1>

        {/* Simple Description Text */}
        <p className="mt-5 text-base sm:text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
          Generate accurate SRT subtitle files from your audio with 4–5 words per timestamp.
          Supports <span className="font-semibold text-slate-800 dark:text-slate-100">Gujarati, Hindi, English, Hinglish, and Gujlish</span>, with English words kept in standard English spellings.
        </p>

        {/* Big Start Button */}
        <div className="mt-10">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex items-center gap-3 rounded-2xl bg-blue-600 px-10 py-5 text-lg font-bold text-white shadow-lg transition-all hover:scale-105 hover:bg-blue-700 active:scale-95 dark:bg-blue-600 dark:hover:bg-blue-500"
          >
            <span>Start SRT Making</span>
            <ArrowRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
