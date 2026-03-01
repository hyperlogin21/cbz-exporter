// components/FileList.tsx
'use client';

import React, { useState, useCallback } from 'react';
import {
  GripVertical,
  X,
  FileText,
  Image as ImageIcon,
  Trash2,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import type { AppFile, FileFormat } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDimensions(w: number | null, h: number | null): string | null {
  if (w == null || h == null) return null;
  return `${w.toLocaleString()} × ${h.toLocaleString()}`;
}

// ---------------------------------------------------------------------------
// Badge component (Untitled UI Badge — manual implementation)
// ---------------------------------------------------------------------------

interface BadgeConfig {
  bg: string;
  text: string;
  border: string;
}

const FORMAT_BADGE: Record<FileFormat, BadgeConfig> = {
  PNG:  { bg: 'bg-brand-50',   text: 'text-brand-700',   border: 'border-brand-200'   },
  JPG:  { bg: 'bg-warning-50', text: 'text-warning-700', border: 'border-warning-200' },
  WEBP: { bg: 'bg-success-50', text: 'text-success-700', border: 'border-success-200' },
  GIF:  { bg: 'bg-purple-50',  text: 'text-purple-700',  border: 'border-purple-100'  },
  BMP:  { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200'    },
  TIFF: { bg: 'bg-gray-100',   text: 'text-gray-600',    border: 'border-gray-200'    },
  AVIF: { bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-100'  },
  PDF:  { bg: 'bg-error-50',   text: 'text-error-700',   border: 'border-error-100'   },
};

function FormatBadge({ format }: { format: FileFormat }) {
  const cfg = FORMAT_BADGE[format] ?? FORMAT_BADGE.BMP;
  return (
    <span
      className={[
        'inline-flex items-center px-1.5 py-0.5 rounded',
        'text-xs font-medium leading-4 border',
        cfg.bg, cfg.text, cfg.border,
      ].join(' ')}
    >
      {format}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Single file row
// ---------------------------------------------------------------------------

interface FileRowProps {
  file: AppFile;
  index: number;
  disabled: boolean;
  isCover: boolean;
  isDragging: boolean;
  onRemove: (id: string) => void;
  onDragStart: (index: number) => void;
  onDragOver: (index: number) => void;
  onDragEnd: () => void;
}

function FileRow({
  file,
  index,
  disabled,
  isCover,
  isDragging,
  onRemove,
  onDragStart,
  onDragOver,
  onDragEnd,
}: FileRowProps) {
  const dims = formatDimensions(file.width, file.height);

  const rowClasses = [
    'group flex items-center gap-3 px-4 h-14 border-b border-gray-200',
    'transition-colors duration-150',
    isDragging ? 'opacity-40' : '',
    isCover ? 'border-l-[3px] border-l-brand-600 bg-brand-25' : 'hover:bg-gray-50',
    disabled ? 'pointer-events-none' : '',
  ].join(' ');

  return (
    <li
      className={rowClasses}
      role="listitem"
      draggable={!disabled}
      onDragStart={() => onDragStart(index)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(index); }}
      onDragEnd={onDragEnd}
      aria-label={`${file.name}, ${formatSize(file.size)}`}
    >
      {/* Drag handle — visible on hover */}
      <div
        className="hidden md:flex items-center text-gray-300 group-hover:text-gray-400 cursor-grab active:cursor-grabbing flex-shrink-0"
        aria-hidden="true"
      >
        <GripVertical size={20} strokeWidth={1.5} />
      </div>

      {/* Thumbnail */}
      <div className="flex-shrink-0 w-10 h-10 rounded-md overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center">
        {file.loading ? (
          <Loader2 size={16} strokeWidth={1.5} className="text-gray-400 animate-spin" />
        ) : file.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.thumbnailUrl}
            alt=""
            aria-hidden="true"
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : file.format === 'PDF' ? (
          <FileText size={20} strokeWidth={1.5} className="text-error-400" aria-hidden="true" />
        ) : (
          <ImageIcon size={20} strokeWidth={1.5} className="text-gray-400" aria-hidden="true" />
        )}
      </div>

      {/* Filename + PDF page count */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm font-medium text-gray-700 truncate max-w-[40ch]"
          title={file.name}
        >
          {file.name}
        </p>
        {file.format === 'PDF' && (
          <p className="text-xs text-gray-400 leading-4">
            {file.loading || file.pageCount == null
              ? 'Extracting pages...'
              : `${file.pageCount} pages`}
          </p>
        )}
      </div>

      {/* Format badge */}
      <div className="hidden sm:block flex-shrink-0">
        <FormatBadge format={file.format} />
      </div>

      {/* File size */}
      <div className="hidden sm:block flex-shrink-0 text-xs text-gray-500 w-16 text-right">
        {formatSize(file.size)}
      </div>

      {/* Dimensions — hidden on mobile */}
      <div className="hidden md:block flex-shrink-0 text-xs text-gray-400 w-24 text-right">
        {file.loading ? (
          <span className="text-gray-300">—</span>
        ) : dims ? (
          dims
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={() => onRemove(file.id)}
        aria-label={`Remove ${file.name}`}
        className="flex-shrink-0 flex items-center justify-center w-7 h-7 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        disabled={disabled}
      >
        <X size={16} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Main FileList component
// ---------------------------------------------------------------------------

const MOBILE_COLLAPSED_COUNT = 5;

interface FileListProps {
  files: AppFile[];
  disabled: boolean;
  totalPages: number;
  totalSize: number;
  selectedCoverIndex: number;
  onRemove: (id: string) => void;
  onReorder: (files: AppFile[]) => void;
  onClearAll: () => void;
}

export default function FileList({
  files,
  disabled,
  totalPages,
  totalSize,
  selectedCoverIndex,
  onRemove,
  onReorder,
  onClearAll,
}: FileListProps) {
  const [dragFromIndex, setDragFromIndex] = useState<number | null>(null);
  const [dragToIndex, setDragToIndex] = useState<number | null>(null);
  const [showAllOnMobile, setShowAllOnMobile] = useState(false);

  // ---- Native drag-and-drop reordering ------------------------------------

  const handleDragStart = useCallback((index: number) => {
    setDragFromIndex(index);
  }, []);

  const handleDragOver = useCallback((index: number) => {
    setDragToIndex(index);
  }, []);

  const handleDragEnd = useCallback(() => {
    if (
      dragFromIndex !== null &&
      dragToIndex !== null &&
      dragFromIndex !== dragToIndex
    ) {
      const reordered = [...files];
      const [moved] = reordered.splice(dragFromIndex, 1);
      reordered.splice(dragToIndex, 0, moved);
      onReorder(reordered);
    }
    setDragFromIndex(null);
    setDragToIndex(null);
  }, [dragFromIndex, dragToIndex, files, onReorder]);

  // ---- Visible files on mobile -------------------------------------------

  const visibleFiles =
    !showAllOnMobile && files.length > MOBILE_COLLAPSED_COUNT
      ? files.slice(0, MOBILE_COLLAPSED_COUNT)
      : files;

  const hasHiddenFiles = !showAllOnMobile && files.length > MOBILE_COLLAPSED_COUNT;

  // ---- Stats bar ----------------------------------------------------------

  const pdfCount = files.filter((f) => f.format === 'PDF').length;
  const imageCount = files.length - pdfCount;

  let summaryParts: string[] = [];
  if (imageCount > 0) summaryParts.push(`${imageCount} image${imageCount !== 1 ? 's' : ''}`);
  if (pdfCount > 0) summaryParts.push(`${pdfCount} PDF${pdfCount !== 1 ? 's' : ''}`);
  const summary = summaryParts.join(', ');

  const totalPagesStr = totalPages > 0 ? `${totalPages} pages` : '';
  const totalSizeStr = formatSize(totalSize);

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-xs">
      {/* Header bar */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700">
          {summary}
          {totalPagesStr && (
            <span className="text-gray-400 font-normal"> — {totalPagesStr}</span>
          )}
        </p>
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500 mr-2 hidden sm:inline">{totalSizeStr}</span>
        </div>
      </div>

      {/* File rows */}
      <ul role="list" aria-label="Uploaded files">
        {visibleFiles.map((file, index) => (
          <FileRow
            key={file.id}
            file={file}
            index={index}
            disabled={disabled}
            isCover={index === selectedCoverIndex}
            isDragging={dragFromIndex === index}
            onRemove={onRemove}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          />
        ))}

        {/* "Show all" expand row — mobile only when collapsed */}
        {hasHiddenFiles && (
          <li className="flex items-center justify-center py-3 border-b border-gray-200 md:hidden">
            <button
              type="button"
              onClick={() => setShowAllOnMobile(true)}
              className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium hover:text-brand-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded"
            >
              <ChevronDown size={16} strokeWidth={1.5} aria-hidden="true" />
              Show all ({files.length} files)
            </button>
          </li>
        )}
      </ul>

      {/* Footer bar */}
      <div className="px-4 py-2.5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <p className="text-xs text-gray-500">
          {files.length} {files.length === 1 ? 'file' : 'files'} — {totalSizeStr}
        </p>
        <button
          type="button"
          onClick={onClearAll}
          disabled={disabled}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-error-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 rounded disabled:opacity-40 disabled:pointer-events-none"
          aria-label="Clear all files"
        >
          <Trash2 size={14} strokeWidth={1.5} aria-hidden="true" />
          Clear All
        </button>
      </div>
    </div>
  );
}
