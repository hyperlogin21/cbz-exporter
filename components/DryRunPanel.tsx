// components/DryRunPanel.tsx
'use client';

import React from 'react';
import { Eye, X } from 'lucide-react';
import type { AppFile, ConversionOptions, ComicMetadata } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function zeroPad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

function getPaddingWidth(total: number): number {
  if (total < 100) return 2;
  if (total < 1000) return 3;
  if (total < 10000) return 4;
  return 5;
}

function getExtension(file: AppFile, options: ConversionOptions): string {
  switch (options.outputFormat) {
    case 'png': return 'png';
    case 'jpg': return 'jpg';
    case 'webp': return 'webp';
    default: {
      if (file.format === 'PDF') {
        return options.pdfPageFormat === 'jpg' ? 'jpg' : 'png';
      }
      return file.name.split('.').pop()?.toLowerCase() ?? 'png';
    }
  }
}

function formatOutputFormat(options: ConversionOptions): string {
  switch (options.outputFormat) {
    case 'keep': return 'Keep original';
    case 'png': return 'PNG (re-encoded)';
    case 'jpg': return `JPEG (re-encoded, quality ${options.quality}%)`;
    case 'webp': return 'WebP (re-encoded)';
  }
}

function formatCompression(options: ConversionOptions): string {
  if (options.outputFormat === 'jpg' || options.outputFormat === 'webp') {
    return 'STORE (no compression)';
  }
  if (options.outputFormat === 'png') {
    return 'DEFLATE level 6';
  }
  // Mixed — describe both possibilities
  return 'DEFLATE level 6 (PNG/BMP/TIFF) / STORE (JPEG/WebP/GIF/AVIF)';
}

function hasMetadata(meta: ComicMetadata): boolean {
  const fields: Array<keyof ComicMetadata> = [
    'title', 'series', 'number', 'volume', 'summary', 'publisher',
    'genre', 'writer', 'year', 'manga',
  ];
  return fields.some((f) => Boolean(meta[f]));
}

// ---------------------------------------------------------------------------
// Build dry-run entries
// ---------------------------------------------------------------------------

interface DryRunEntry {
  archiveName: string;
  originalName: string;
  dimensions: string | null;
}

function buildEntries(files: AppFile[], options: ConversionOptions): DryRunEntry[] {
  // Skip files with errors (e.g. password-protected PDFs) to match conversion behavior
  const processable = files.filter((f) => !f.error);
  // Expand PDF page counts
  const expanded: Array<{ source: AppFile; pageIndex: number | null }> = [];
  for (const file of processable) {
    if (file.format === 'PDF') {
      const pages = file.pageCount ?? 1;
      for (let i = 0; i < pages; i++) {
        expanded.push({ source: file, pageIndex: i });
      }
    } else {
      expanded.push({ source: file, pageIndex: null });
    }
  }

  const total = expanded.length;
  const width = getPaddingWidth(total);

  return expanded.map((item, idx) => {
    const pageNum = zeroPad(idx + 1, width);
    const ext = getExtension(item.source, options);
    const archiveName = `${pageNum}.${ext}`;
    const originalName =
      item.pageIndex !== null
        ? `${item.source.name} (page ${item.pageIndex + 1})`
        : item.source.name;
    const dims =
      item.source.width != null && item.source.height != null
        ? `${item.source.width} × ${item.source.height}`
        : null;
    return { archiveName, originalName, dimensions: dims };
  });
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface DryRunPanelProps {
  files: AppFile[];
  options: ConversionOptions;
  metadata: ComicMetadata;
  onClose: () => void;
}

export default function DryRunPanel({
  files,
  options,
  metadata,
  onClose,
}: DryRunPanelProps) {
  const entries = buildEntries(files, options);
  const outputName =
    (options.outputName || files[0]?.name.replace(/\.[^.]+$/, '') || 'output') + '.cbz';
  const showMetadata = hasMetadata(metadata);
  const maxDims =
    options.maxWidth || options.maxHeight
      ? [
          options.maxWidth ? `max-width: ${options.maxWidth}px` : null,
          options.maxHeight ? `max-height: ${options.maxHeight}px` : null,
        ]
          .filter(Boolean)
          .join(', ')
      : null;

  return (
    <div
      id="dry-run-panel"
      className="bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-xs"
      aria-label="Archive preview"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Eye size={20} strokeWidth={1.5} className="text-gray-500" aria-hidden="true" />
          <h2 className="text-base font-semibold text-gray-900 leading-6">
            Preview: Archive Contents
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-200 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
          aria-label="Close preview"
        >
          <X size={16} strokeWidth={1.5} aria-hidden="true" />
        </button>
      </div>

      {/* Archive summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 mb-5">
        <SummaryRow label="Output" value={outputName} mono />
        <SummaryRow label="Pages" value={String(entries.length)} />
        <SummaryRow label="Format" value={formatOutputFormat(options)} />
        <SummaryRow label="Compression" value={formatCompression(options)} />
        {options.dpi !== 300 && (
          <SummaryRow label="PDF DPI" value={`${options.dpi}`} />
        )}
        {maxDims && (
          <SummaryRow label="Max dimensions" value={maxDims} />
        )}
        <SummaryRow
          label="Metadata"
          value={showMetadata ? 'ComicInfo.xml will be included' : 'No ComicInfo.xml'}
          valueClass={showMetadata ? 'text-success-600' : 'text-gray-400'}
        />
        {options.mergeInputs && (
          <SummaryRow label="Mode" value="Merged (single archive)" />
        )}
      </div>

      {/* File list */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
          File List
        </p>
        <div
          className="max-h-[400px] overflow-y-auto border border-gray-200 rounded-lg bg-white divide-y divide-gray-100"
          tabIndex={0}
          aria-label="Archive file list, scrollable"
        >
          {entries.map((entry, i) => (
            <div
              key={i}
              className="flex items-center gap-4 px-4 py-2 hover:bg-gray-50 transition-colors duration-100"
            >
              {/* Archive name */}
              <span className="font-mono text-[13px] text-brand-700 leading-5 w-24 flex-shrink-0">
                {entry.archiveName}
              </span>
              {/* Arrow separator */}
              <span className="text-gray-300 flex-shrink-0" aria-hidden="true">←</span>
              {/* Original name */}
              <span
                className="text-sm text-gray-600 truncate flex-1"
                title={entry.originalName}
              >
                {entry.originalName}
              </span>
              {/* Dimensions */}
              {entry.dimensions && (
                <span className="text-xs text-gray-400 flex-shrink-0 hidden sm:block">
                  ({entry.dimensions})
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-xs text-gray-400">
        This preview reflects the current settings. Actual output is generated when you click "Convert to CBZ".
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Summary row sub-component
// ---------------------------------------------------------------------------

interface SummaryRowProps {
  label: string;
  value: string;
  mono?: boolean;
  valueClass?: string;
}

function SummaryRow({ label, value, mono, valueClass }: SummaryRowProps) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-gray-500 leading-4 w-28 flex-shrink-0">{label}</span>
      <span
        className={[
          'text-sm leading-5 text-gray-800',
          mono ? 'font-mono text-[13px]' : '',
          valueClass ?? '',
        ].join(' ')}
      >
        {value}
      </span>
    </div>
  );
}
