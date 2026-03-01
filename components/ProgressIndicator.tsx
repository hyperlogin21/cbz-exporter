// components/ProgressIndicator.tsx
'use client';

import React from 'react';
import { Loader2, X } from 'lucide-react';
import type { ProcessingProgress } from '@/types';

interface ProgressIndicatorProps {
  progress: ProcessingProgress;
  onCancel: () => void;
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function ProgressIndicator({
  progress,
  onCancel,
}: ProgressIndicatorProps) {
  const { currentPage, totalPages, elapsedSeconds, statusText } = progress;

  const percent = totalPages > 0
    ? Math.min(100, Math.round((currentPage / totalPages) * 100))
    : 0;

  return (
    <div
      role="region"
      aria-label="Conversion progress"
      className="bg-gray-50 border border-gray-200 rounded-xl p-6"
    >
      {/* Top row: label + counter */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Loader2
            size={18}
            strokeWidth={1.5}
            className="text-brand-600 animate-spin"
            aria-hidden="true"
          />
          <span className="text-sm font-semibold text-gray-700">Converting...</span>
        </div>

        <div className="flex items-center gap-4">
          {/* Page counter */}
          <span
            className="text-sm font-medium text-gray-700 tabular-nums"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentPage} / {totalPages}
          </span>
          {/* Percentage */}
          <span className="text-sm font-semibold text-gray-700 tabular-nums w-12 text-right">
            {percent}%
          </span>
        </div>
      </div>

      {/* Progress bar */}
      <div
        role="progressbar"
        aria-valuenow={percent}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Conversion progress"
        className="w-full h-2 bg-gray-200 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-brand-600 rounded-full transition-all duration-300 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>

      {/* Bottom row: status + elapsed + cancel */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <p
            className="text-sm text-gray-500"
            aria-live="polite"
            aria-atomic="true"
          >
            {statusText}
          </p>
          {elapsedSeconds > 0 && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              Elapsed: {formatElapsed(elapsedSeconds)}
            </span>
          )}
        </div>

        {/* Cancel button */}
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-error-600 font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
          aria-keyshortcuts="Escape"
        >
          <X size={14} strokeWidth={1.5} aria-hidden="true" />
          Cancel
        </button>
      </div>
    </div>
  );
}
