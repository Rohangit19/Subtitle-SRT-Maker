import React from 'react';
import { Music2 } from 'lucide-react';

interface HeaderProps {
  onNavigateHome: () => void;
  serverReady: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome, serverReady }) => {
  return (
    <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xs dark:border-slate-800 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Simple Brand */}
        <button
          type="button"
          onClick={onNavigateHome}
          className="flex items-center gap-2 text-left text-sm font-bold tracking-tight text-slate-900 hover:opacity-80 dark:text-white"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white">
            <Music2 className="h-4 w-4" />
          </div>
          <span>AudioToSRT</span>
        </button>

        {/* Minimal status indicator */}
        <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
          <span
            className={`h-2 w-2 rounded-full ${
              serverReady ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'
            }`}
          />
          <span className="hidden sm:inline">
            {serverReady ? 'Ready' : 'Connecting...'}
          </span>
        </div>
      </div>
    </header>
  );
};
