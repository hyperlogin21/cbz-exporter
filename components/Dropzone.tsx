// components/Dropzone.tsx
'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { UploadCloud, Plus, FolderOpen } from 'lucide-react';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const ACCEPTED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/tiff',
  'image/avif',
  'application/pdf',
];

const ACCEPTED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif',
  '.bmp', '.tif', '.tiff', '.avif', '.pdf',
]);

const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getFileExtension(name: string): string {
  return '.' + (name.split('.').pop()?.toLowerCase() ?? '');
}

function validateFile(file: File): string | null {
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return `"${file.name}" exceeds the 500 MB file size limit.`;
  }
  const mimeOk = ACCEPTED_MIME_TYPES.includes(file.type);
  const extOk = ACCEPTED_EXTENSIONS.has(getFileExtension(file.name));
  if (!mimeOk && !extOk) {
    return `"${file.name}" is not a supported file type. Accepted: PNG, JPG, WebP, GIF, BMP, TIFF, AVIF, PDF.`;
  }
  return null;
}

/** Recursively collect all File objects from a dropped directory entry. */
async function readFilesFromDirectory(dir: FileSystemDirectoryEntry): Promise<File[]> {
  const files: File[] = [];
  const reader = dir.createReader();

  // readEntries returns at most 100 items per call — loop until exhausted.
  const readBatch = (): Promise<FileSystemEntry[]> =>
    new Promise((resolve, reject) => {
      const all: FileSystemEntry[] = [];
      const next = () =>
        reader.readEntries((batch) => {
          if (batch.length === 0) resolve(all);
          else { all.push(...batch); next(); }
        }, reject);
      next();
    });

  const entries = await readBatch();
  // Sort alphabetically so files from the folder arrive in a predictable order.
  entries.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }));

  for (const entry of entries) {
    if (entry.isFile) {
      const file = await new Promise<File>((resolve, reject) =>
        (entry as FileSystemFileEntry).file(resolve, reject)
      );
      files.push(file);
    } else if (entry.isDirectory) {
      files.push(...await readFilesFromDirectory(entry as FileSystemDirectoryEntry));
    }
  }
  return files;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DropzoneProps {
  /** When true, collapses to compact "Add more files" bar */
  compact: boolean;
  disabled: boolean;
  onFilesAccepted: (files: File[]) => void;
  onFilesRejected: (reasons: string[]) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Dropzone({
  compact,
  disabled,
  onFilesAccepted,
  onFilesRejected,
}: DropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const [dragError, setDragError] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // webkitdirectory is not in React's InputHTMLAttributes — set it imperatively.
  useEffect(() => {
    folderInputRef.current?.setAttribute('webkitdirectory', '');
  }, []);

  // Process a FileList or File array from either click-pick or drag-drop
  const processFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList);
      const valid: File[] = [];
      const errors: string[] = [];

      for (const file of files) {
        // Skip hidden files (dotfiles) silently — they come from folder drops.
        if (file.name.startsWith('.')) continue;
        const err = validateFile(file);
        if (err) {
          errors.push(err);
        } else {
          valid.push(file);
        }
      }

      if (errors.length > 0) {
        onFilesRejected(errors);
        if (valid.length === 0) {
          setDragError(true);
          setTimeout(() => setDragError(false), 2000);
        }
      }
      if (valid.length > 0) {
        onFilesAccepted(valid);
      }
    },
    [onFilesAccepted, onFilesRejected]
  );

  // ---- Drag events --------------------------------------------------------

  const onDragEnter = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragActive(true);
      setDragError(false);
    },
    [disabled]
  );

  const onDragOver = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (disabled) return;
      setDragActive(true);
    },
    [disabled]
  );

  const onDragLeave = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      // Only deactivate if the pointer truly left the zone (not entering a child)
      if (!(e.currentTarget as HTMLDivElement).contains(e.relatedTarget as Node)) {
        setDragActive(false);
      }
    },
    []
  );

  const onDrop = useCallback(
    async (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      if (disabled) return;

      // Use the FileSystem API to support dropped folders.
      const items = Array.from(e.dataTransfer.items);
      if (items.length > 0 && typeof items[0].webkitGetAsEntry === 'function') {
        const collected: File[] = [];
        for (const item of items) {
          const entry = item.webkitGetAsEntry();
          if (!entry) continue;
          if (entry.isFile) {
            const file = await new Promise<File>((resolve, reject) =>
              (entry as FileSystemFileEntry).file(resolve, reject)
            );
            collected.push(file);
          } else if (entry.isDirectory) {
            const dirFiles = await readFilesFromDirectory(entry as FileSystemDirectoryEntry);
            collected.push(...dirFiles);
          }
        }
        if (collected.length > 0) {
          processFiles(collected);
          return;
        }
      }

      // Fallback for browsers that don't support webkitGetAsEntry
      if (e.dataTransfer.files.length > 0) {
        processFiles(e.dataTransfer.files);
      }
    },
    [disabled, processFiles]
  );

  // ---- File picker --------------------------------------------------------

  const openFilePicker = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (disabled) return;
    fileInputRef.current?.click();
  }, [disabled]);

  const openFolderPicker = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (disabled) return;
    folderInputRef.current?.click();
  }, [disabled]);

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFilePicker();
      }
    },
    [openFilePicker]
  );

  const onFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles]
  );

  const onFolderInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        processFiles(e.target.files);
        e.target.value = '';
      }
    },
    [processFiles]
  );

  // ---- Shared hidden inputs -----------------------------------------------

  const hiddenInputs = (
    <>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept={ACCEPTED_MIME_TYPES.join(',') + ',' + Array.from(ACCEPTED_EXTENSIONS).join(',')}
        className="sr-only"
        onChange={onFileInputChange}
        onClick={(e) => e.stopPropagation()}
        aria-hidden="true"
        tabIndex={-1}
      />
      {/* webkitdirectory set via useEffect — not in React's type defs */}
      <input
        ref={folderInputRef}
        type="file"
        multiple
        className="sr-only"
        onChange={onFolderInputChange}
        onClick={(e) => e.stopPropagation()}
        aria-hidden="true"
        tabIndex={-1}
      />
    </>
  );

  // ---- Styling logic ------------------------------------------------------

  const dragClasses = dragActive
    ? 'border-2 border-solid border-brand-600 bg-brand-50 scale-[1.01]'
    : dragError
    ? 'border-2 border-solid border-error-300 bg-error-25'
    : '';

  // ---- Compact bar (after files are added) --------------------------------

  if (compact) {
    return (
      <div
        aria-label="Add more files or a folder"
        className={[
          'relative w-full rounded-2xl border transition-all duration-150',
          'border-dashed border-gray-300 bg-gray-50',
          'h-14 flex items-center',
          disabled ? 'opacity-60 pointer-events-none' : '',
          dragActive
            ? 'border-2 border-solid border-brand-600 bg-brand-50 scale-[1.01]'
            : dragError
            ? 'border-2 border-solid border-error-300 bg-error-25'
            : '',
        ].join(' ')}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        {hiddenInputs}

        {/* Add files button */}
        <button
          type="button"
          onClick={() => openFilePicker()}
          disabled={disabled}
          className="flex-1 h-full flex items-center justify-center gap-2 rounded-l-2xl hover:bg-brand-25 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset"
          aria-label="Add more files"
        >
          <Plus size={16} strokeWidth={1.5} className="text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-brand-600">Add files</span>
        </button>

        {/* Divider */}
        <div className="w-px h-6 bg-gray-200 flex-shrink-0" aria-hidden="true" />

        {/* Add folder button */}
        <button
          type="button"
          onClick={openFolderPicker}
          disabled={disabled}
          className="flex-1 h-full flex items-center justify-center gap-2 rounded-r-2xl hover:bg-brand-25 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-inset"
          aria-label="Add a folder"
        >
          <FolderOpen size={16} strokeWidth={1.5} className="text-brand-600" aria-hidden="true" />
          <span className="text-sm font-medium text-brand-600">Add folder</span>
        </button>

        {dragActive && <span className="sr-only">Release to add files</span>}
      </div>
    );
  }

  // ---- Full-size dropzone (empty state) -----------------------------------

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload files or a folder. Accepted formats: PNG, JPG, WebP, GIF, BMP, TIFF, AVIF, PDF"
      className={[
        'relative w-full rounded-2xl border transition-all duration-150',
        'cursor-pointer select-none',
        'border-dashed border-gray-300 bg-gray-50',
        'min-h-[200px] md:min-h-[200px] min-h-[160px]',
        'flex flex-col items-center justify-center gap-3 px-6 py-10',
        disabled ? 'opacity-60 pointer-events-none' : '',
        dragClasses || 'hover:border-brand-300 hover:bg-brand-25',
      ].join(' ')}
      onClick={() => openFilePicker()}
      onKeyDown={onKeyDown}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {hiddenInputs}

      {/* Upload cloud icon */}
      <UploadCloud
        size={48}
        strokeWidth={1.5}
        className={dragActive ? 'text-brand-600' : dragError ? 'text-error-400' : 'text-gray-400'}
        aria-hidden="true"
      />

      {/* Primary text */}
      <div className="text-center">
        <p className="text-sm leading-5">
          <span className="font-medium text-brand-600">Click to upload</span>
          {' '}
          <span className="text-gray-500 font-normal">or drag and drop</span>
        </p>

        {/* Folder picker */}
        <p className="mt-2">
          <button
            type="button"
            onClick={openFolderPicker}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
          >
            <FolderOpen size={14} strokeWidth={1.5} aria-hidden="true" />
            Select a folder
          </button>
        </p>

        {/* Accepted formats */}
        <p className="text-xs leading-4 text-gray-400 mt-2 hidden sm:block">
          PNG, JPG, WebP, GIF, BMP, TIFF, AVIF, or PDF
        </p>
        <p className="text-xs leading-4 text-gray-400 mt-2 sm:hidden">
          Images or PDF
        </p>

        {/* File size limit */}
        <p className="text-xs leading-4 text-gray-400 mt-0.5">
          Up to 500 MB per file
        </p>
      </div>

      {dragError && (
        <p className="text-xs text-error-600 font-medium" role="alert">
          Unsupported file type. Check accepted formats above.
        </p>
      )}

      {dragActive && (
        <span className="sr-only">Release to add files</span>
      )}
    </div>
  );
}
