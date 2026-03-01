// components/DownloadArea.tsx
'use client';

import React from 'react';
import { CheckCircle, AlertCircle, Download, RotateCcw } from 'lucide-react';
import type { AppStatus, ConversionResult, ConversionError } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(secs: number): string {
  if (secs < 60) return `${secs.toFixed(1)}s`;
  const m = Math.floor(secs / 60);
  const s = (secs % 60).toFixed(1);
  return `${m}m ${s}s`;
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DownloadAreaProps {
  status: AppStatus;
  result: ConversionResult | null;
  error: ConversionError | null;
  onReset: () => void;
  onClearAll: () => void;
}

// ---------------------------------------------------------------------------
// Success area
// ---------------------------------------------------------------------------

function SuccessArea({
  result,
  onReset,
  onClearAll,
}: {
  result: ConversionResult;
  onReset: () => void;
  onClearAll: () => void;
}) {
  const handleDownload = () => {
    const url = URL.createObjectURL(result.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = result.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-success-25 border border-success-100 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <CheckCircle
          size={24}
          strokeWidth={1.5}
          className="text-success-600 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold text-success-700 leading-7">
            Conversion complete
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {result.pageCount} page{result.pageCount !== 1 ? 's' : ''} archived
            {result.warnings.length > 0 && (
              <span className="text-warning-600 ml-1">
                — {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* File info */}
      <div className="bg-white border border-success-100 rounded-lg px-4 py-3 mb-5">
        <p className="text-sm font-mono font-medium text-gray-900 leading-5 mb-1">
          {result.filename}
        </p>
        <p className="text-sm text-gray-500">
          {result.pageCount} pages{' '}
          <span className="text-gray-300 mx-1">—</span>
          {formatSize(result.sizeBytes)}{' '}
          <span className="text-gray-300 mx-1">—</span>
          Completed in {formatDuration(result.durationSeconds)}
        </p>
      </div>

      {/* Warnings list */}
      {result.warnings.length > 0 && (
        <ul className="mb-5 space-y-1">
          {result.warnings.map((w, i) => (
            <li key={i} className="text-sm text-warning-600 flex items-start gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5" aria-hidden="true">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              {w}
            </li>
          ))}
        </ul>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Download */}
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-xs hover:bg-brand-700 active:bg-brand-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        >
          <Download size={18} strokeWidth={1.5} aria-hidden="true" />
          Download CBZ
        </button>

        {/* Convert another — resets result but keeps files */}
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-white text-gray-700 text-sm font-semibold border border-gray-300 shadow-xs hover:bg-gray-50 active:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          <RotateCcw size={16} strokeWidth={1.5} aria-hidden="true" />
          Convert Another
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error area
// ---------------------------------------------------------------------------

function ErrorArea({
  error,
  onReset,
  onClearAll,
}: {
  error: ConversionError;
  onReset: () => void;
  onClearAll: () => void;
}) {
  return (
    <div className="bg-error-25 border border-error-100 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        <AlertCircle
          size={24}
          strokeWidth={1.5}
          className="text-error-600 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <div>
          <h2 className="text-lg font-semibold text-error-700 leading-7">
            Conversion failed
          </h2>
          <p className="text-sm text-error-600 mt-0.5">{error.message}</p>
        </div>
      </div>

      {/* Skipped files list */}
      {error.skippedFiles.length > 0 && (
        <div className="mb-5">
          <p className="text-sm font-medium text-gray-700 mb-2">Skipped files:</p>
          <ul className="space-y-1">
            {error.skippedFiles.map((f, i) => (
              <li key={i} className="text-sm text-gray-600 flex items-baseline gap-1.5">
                <span className="text-gray-400">–</span>
                <span>
                  <span className="font-mono text-[13px]">{f.name}</span>
                  <span className="text-gray-500 ml-1.5">({f.reason})</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          type="button"
          onClick={onReset}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-brand-600 text-white text-sm font-semibold shadow-xs hover:bg-brand-700 active:bg-brand-800 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100"
        >
          Try Again
        </button>

        <button
          type="button"
          onClick={onClearAll}
          className="inline-flex items-center justify-center gap-2 h-11 px-5 rounded-lg bg-white text-gray-700 text-sm font-semibold border border-gray-300 shadow-xs hover:bg-gray-50 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        >
          Clear and Start Over
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export default function DownloadArea({
  status,
  result,
  error,
  onReset,
  onClearAll,
}: DownloadAreaProps) {
  if (status === 'success' && result) {
    return <SuccessArea result={result} onReset={onReset} onClearAll={onClearAll} />;
  }
  if (status === 'error' && error) {
    return <ErrorArea error={error} onReset={onReset} onClearAll={onClearAll} />;
  }
  return null;
}
