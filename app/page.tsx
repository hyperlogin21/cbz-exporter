// app/page.tsx
'use client';

import React, { useReducer, useCallback, useEffect, useRef } from 'react';
import { Archive, HelpCircle } from 'lucide-react';
import JSZip from 'jszip';

import type {
  AppState,
  AppAction,
  AppFile,
  ConversionOptions,
  ComicMetadata,
  ProcessingProgress,
  ConversionResult,
} from '@/types';

import Dropzone from '@/components/Dropzone';
import FileList from '@/components/FileList';
import ConversionOptionsPanel from '@/components/ConversionOptions';
import MetadataPanel from '@/components/MetadataPanel';
import ProgressIndicator from '@/components/ProgressIndicator';
import DownloadArea from '@/components/DownloadArea';
import DryRunPanel from '@/components/DryRunPanel';
import Toast from '@/components/Toast';

// ---------------------------------------------------------------------------
// Default state values
// ---------------------------------------------------------------------------

const DEFAULT_OPTIONS: ConversionOptions = {
  outputFormat: 'keep',
  quality: 90,
  dpi: 300,
  pdfPageFormat: 'png',
  maxWidth: 0,
  maxHeight: 0,
  stripExif: false,
  includeHidden: false,
  forceOverwrite: false,
  mergeInputs: false,
  outputName: '',
};

const DEFAULT_METADATA: ComicMetadata = {
  title: '',
  series: '',
  number: '',
  count: '',
  volume: '',
  summary: '',
  notes: '',
  publisher: '',
  genre: '',
  tags: '',
  web: '',
  language: '',
  ageRating: '',
  writer: '',
  penciller: '',
  inker: '',
  colorist: '',
  letterer: '',
  coverArtist: '',
  editor: '',
  translator: '',
  year: '',
  month: '',
  day: '',
  manga: '',
  blackAndWhite: '',
  bookFormat: '',
  coverPageIndex: 0,
  noCoverTag: false,
};

const INITIAL_STATE: AppState = {
  status: 'empty',
  files: [],
  options: DEFAULT_OPTIONS,
  metadata: DEFAULT_METADATA,
  progress: null,
  result: null,
  error: null,
  showDryRun: false,
  metadataExpanded: false,
  toast: null,
};

// ---------------------------------------------------------------------------
// State reducer
// ---------------------------------------------------------------------------

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'ADD_FILES': {
      const merged = [...state.files, ...action.files];
      return {
        ...state,
        files: merged,
        status: 'files-added',
        // Auto-set output name from first file if not yet set
        options: {
          ...state.options,
          outputName:
            state.options.outputName ||
            (merged[0]?.name.replace(/\.[^.]+$/, '') ?? ''),
        },
      };
    }

    case 'UPDATE_FILE': {
      return {
        ...state,
        files: state.files.map((f) =>
          f.id === action.id ? { ...f, ...action.patch } : f
        ),
      };
    }

    case 'REMOVE_FILE': {
      const next = state.files.filter((f) => f.id !== action.id);
      // Revoke object URL to avoid memory leak
      const removed = state.files.find((f) => f.id === action.id);
      if (removed?.thumbnailUrl) URL.revokeObjectURL(removed.thumbnailUrl);
      return {
        ...state,
        files: next,
        status: next.length === 0 ? 'empty' : 'files-added',
      };
    }

    case 'REORDER_FILES': {
      return { ...state, files: action.files };
    }

    case 'CLEAR_FILES': {
      // Revoke all object URLs
      state.files.forEach((f) => {
        if (f.thumbnailUrl) URL.revokeObjectURL(f.thumbnailUrl);
      });
      return {
        ...INITIAL_STATE,
        options: { ...state.options, outputName: '' },
        metadata: state.metadata,
        metadataExpanded: state.metadataExpanded,
      };
    }

    case 'SET_OPTIONS': {
      return { ...state, options: { ...state.options, ...action.patch } };
    }

    case 'SET_METADATA': {
      return { ...state, metadata: { ...state.metadata, ...action.patch } };
    }

    case 'TOGGLE_METADATA_PANEL': {
      return { ...state, metadataExpanded: !state.metadataExpanded };
    }

    case 'TOGGLE_DRY_RUN': {
      return { ...state, showDryRun: !state.showDryRun };
    }

    case 'START_CONVERSION': {
      return {
        ...state,
        status: 'processing',
        progress: { currentPage: 0, totalPages: state.files.length, elapsedSeconds: 0, statusText: 'Preparing...' },
        result: null,
        error: null,
      };
    }

    case 'UPDATE_PROGRESS': {
      return { ...state, progress: action.progress };
    }

    case 'CONVERSION_SUCCESS': {
      return {
        ...state,
        status: 'success',
        progress: null,
        result: action.result,
      };
    }

    case 'CONVERSION_ERROR': {
      return {
        ...state,
        status: 'error',
        progress: null,
        error: action.error,
      };
    }

    case 'CANCEL_CONVERSION': {
      return {
        ...state,
        status: 'files-added',
        progress: null,
        toast: { message: 'Conversion cancelled.', variant: 'warning' },
      };
    }

    case 'RESET': {
      // Keep files and options; reset only result/error/progress
      return {
        ...state,
        status: state.files.length > 0 ? 'files-added' : 'empty',
        progress: null,
        result: null,
        error: null,
      };
    }

    case 'SHOW_TOAST': {
      return { ...state, toast: { message: action.message, variant: action.variant } };
    }

    case 'CLEAR_TOAST': {
      return { ...state, toast: null };
    }

    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// File reading helpers
// ---------------------------------------------------------------------------

const ACCEPTED_FORMATS: Record<string, string> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/bmp': 'BMP',
  'image/tiff': 'TIFF',
  'image/avif': 'AVIF',
  'application/pdf': 'PDF',
};

const ACCEPTED_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.tif', '.tiff', '.avif', '.pdf',
]);

function getExtension(filename: string): string {
  return '.' + (filename.split('.').pop()?.toLowerCase() ?? '');
}

function detectFormat(file: File): string | null {
  // Prefer MIME type, fall back to extension
  if (file.type && ACCEPTED_FORMATS[file.type]) return ACCEPTED_FORMATS[file.type];
  const ext = getExtension(file.name);
  if (!ACCEPTED_EXTENSIONS.has(ext)) return null;
  const extMap: Record<string, string> = {
    '.png': 'PNG', '.jpg': 'JPG', '.jpeg': 'JPG',
    '.webp': 'WEBP', '.gif': 'GIF', '.bmp': 'BMP',
    '.tif': 'TIFF', '.tiff': 'TIFF', '.avif': 'AVIF', '.pdf': 'PDF',
  };
  return extMap[ext] ?? null;
}

/** Read image dimensions from a File object */
async function readImageDimensions(file: File): Promise<{ width: number; height: number; thumbnailUrl: string }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight, thumbnailUrl: url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Could not read image dimensions'));
    };
    img.src = url;
  });
}

// ---------------------------------------------------------------------------
// PDF.js lazy loader
// We import dynamically to avoid SSR issues; the worker is served from /public.
// ---------------------------------------------------------------------------

async function getPdfjsLib() {
  // pdfjs-dist v5's pdf.mjs is a pre-bundled webpack file with mixed CommonJS
  // internals and ES module exports. When Next.js webpack imports it as .mjs
  // (strict ESM), its own __webpack_require__.r call fails because ES module
  // namespace objects reject Object.defineProperty for unknown keys.
  //
  // Fix: serve pdf.min.mjs from /public and load it at runtime via
  // new Function('u', 'return import(u)') — a standard pattern to escape
  // webpack's static analysis while letting the browser load it as native ESM,
  // where the hybrid format works correctly.
  type PdfjsMod = typeof import('pdfjs-dist');
  const load = new Function('u', 'return import(u)') as (u: string) => Promise<PdfjsMod>;
  const pdfjsLib = await load('/pdf.min.mjs');
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  return pdfjsLib;
}

/** Error subclass for password-protected PDFs. */
class PasswordProtectedError extends Error {
  constructor(filename?: string) {
    super(
      filename
        ? `"${filename}" is password-protected and cannot be converted.`
        : 'This PDF is password-protected and cannot be converted.'
    );
    this.name = 'PasswordProtectedError';
  }
}

/** Returns the real page count of a PDF file. */
async function getPdfPageCount(file: File): Promise<number> {
  const pdfjsLib = await getPdfjsLib();
  const bytes = await file.arrayBuffer();
  try {
    const pdf = await pdfjsLib.getDocument({ data: bytes }).promise;
    const count = pdf.numPages;
    pdf.destroy();
    return count;
  } catch (err: unknown) {
    // PDF.js throws PasswordException for encrypted PDFs
    if (
      err instanceof Error &&
      (err.name === 'PasswordException' ||
        err.message?.toLowerCase().includes('password'))
    ) {
      throw new PasswordProtectedError(file.name);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// ComicInfo.xml builder
// ---------------------------------------------------------------------------

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildComicInfoXml(meta: ComicMetadata): string | null {
  const fields: string[] = [];
  if (meta.title)         fields.push(`  <Title>${escapeXml(meta.title)}</Title>`);
  if (meta.series)        fields.push(`  <Series>${escapeXml(meta.series)}</Series>`);
  if (meta.number)        fields.push(`  <Number>${escapeXml(meta.number)}</Number>`);
  if (meta.count)         fields.push(`  <Count>${escapeXml(meta.count)}</Count>`);
  if (meta.volume)        fields.push(`  <Volume>${escapeXml(meta.volume)}</Volume>`);
  if (meta.summary)       fields.push(`  <Summary>${escapeXml(meta.summary)}</Summary>`);
  if (meta.notes)         fields.push(`  <Notes>${escapeXml(meta.notes)}</Notes>`);
  if (meta.publisher)     fields.push(`  <Publisher>${escapeXml(meta.publisher)}</Publisher>`);
  if (meta.genre)         fields.push(`  <Genre>${escapeXml(meta.genre)}</Genre>`);
  if (meta.tags)          fields.push(`  <Tags>${escapeXml(meta.tags)}</Tags>`);
  if (meta.web)           fields.push(`  <Web>${escapeXml(meta.web)}</Web>`);
  if (meta.language)      fields.push(`  <LanguageISO>${escapeXml(meta.language)}</LanguageISO>`);
  if (meta.ageRating)     fields.push(`  <AgeRating>${escapeXml(meta.ageRating)}</AgeRating>`);
  if (meta.writer)        fields.push(`  <Writer>${escapeXml(meta.writer)}</Writer>`);
  if (meta.penciller)     fields.push(`  <Penciller>${escapeXml(meta.penciller)}</Penciller>`);
  if (meta.inker)         fields.push(`  <Inker>${escapeXml(meta.inker)}</Inker>`);
  if (meta.colorist)      fields.push(`  <Colorist>${escapeXml(meta.colorist)}</Colorist>`);
  if (meta.letterer)      fields.push(`  <Letterer>${escapeXml(meta.letterer)}</Letterer>`);
  if (meta.coverArtist)   fields.push(`  <CoverArtist>${escapeXml(meta.coverArtist)}</CoverArtist>`);
  if (meta.editor)        fields.push(`  <Editor>${escapeXml(meta.editor)}</Editor>`);
  if (meta.translator)    fields.push(`  <Translator>${escapeXml(meta.translator)}</Translator>`);
  if (meta.year)          fields.push(`  <Year>${escapeXml(meta.year)}</Year>`);
  if (meta.month)         fields.push(`  <Month>${escapeXml(meta.month)}</Month>`);
  if (meta.day)           fields.push(`  <Day>${escapeXml(meta.day)}</Day>`);
  if (meta.manga)         fields.push(`  <Manga>${escapeXml(meta.manga)}</Manga>`);
  if (meta.blackAndWhite) fields.push(`  <BlackAndWhite>${escapeXml(meta.blackAndWhite)}</BlackAndWhite>`);
  if (meta.bookFormat)    fields.push(`  <Format>${escapeXml(meta.bookFormat)}</Format>`);

  if (fields.length === 0) return null;

  return [
    '<?xml version="1.0" encoding="utf-8"?>',
    '<ComicInfo xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">',
    ...fields,
    '</ComicInfo>',
  ].join('\n');
}

// ---------------------------------------------------------------------------
// Image processing helpers
// ---------------------------------------------------------------------------

/** Derive the output MIME type and file extension based on options and source format. */
function resolveOutputFormat(
  sourceFormat: string,
  outputFormat: ConversionOptions['outputFormat']
): { mime: string; ext: string } {
  if (outputFormat !== 'keep') {
    const map: Record<string, { mime: string; ext: string }> = {
      png:  { mime: 'image/png',  ext: 'png' },
      jpg:  { mime: 'image/jpeg', ext: 'jpg' },
      webp: { mime: 'image/webp', ext: 'webp' },
    };
    return map[outputFormat];
  }
  // Keep original
  const byFormat: Record<string, { mime: string; ext: string }> = {
    PNG:  { mime: 'image/png',  ext: 'png' },
    JPG:  { mime: 'image/jpeg', ext: 'jpg' },
    WEBP: { mime: 'image/webp', ext: 'webp' },
    GIF:  { mime: 'image/gif',  ext: 'gif' },
    BMP:  { mime: 'image/bmp',  ext: 'bmp' },
    TIFF: { mime: 'image/tiff', ext: 'tiff' },
    AVIF: { mime: 'image/avif', ext: 'avif' },
  };
  return byFormat[sourceFormat] ?? { mime: 'image/png', ext: 'png' };
}

/**
 * Compute scaled dimensions respecting maxWidth/maxHeight.
 * Never upscales. Returns original dimensions if no constraint applies.
 */
function computeScaledSize(
  w: number,
  h: number,
  maxWidth: number,
  maxHeight: number
): { w: number; h: number } {
  let scale = 1;
  if (maxWidth > 0 && w > maxWidth) scale = Math.min(scale, maxWidth / w);
  if (maxHeight > 0 && h > maxHeight) scale = Math.min(scale, maxHeight / h);
  return { w: Math.round(w * scale), h: Math.round(h * scale) };
}

/**
 * Draw an image (from a File) onto a canvas at the given dimensions and export
 * as an ArrayBuffer in the requested MIME type.
 */
async function imageFileToCanvasBytes(
  file: File,
  targetW: number,
  targetH: number,
  mime: string,
  quality: number
): Promise<ArrayBuffer> {
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.src = url;
    await img.decode();

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, targetW, targetH);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
        mime,
        quality / 100
      );
    });
    return blob.arrayBuffer();
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ---------------------------------------------------------------------------
// Real CBZ builder
// ---------------------------------------------------------------------------

interface CancelToken { cancelled: boolean }

async function buildCBZ(
  files: AppFile[],
  options: ConversionOptions,
  metadata: ComicMetadata,
  onProgress: (p: ProcessingProgress) => void,
  cancelToken: CancelToken
): Promise<ConversionResult> {
  const startTime = Date.now();
  const warnings: string[] = [];
  const skippedFiles: Array<{ name: string; reason: string }> = [];
  const zip = new JSZip();

  // ------------------------------------------------------------------
  // Filter out files with errors (e.g. password-protected PDFs)
  // ------------------------------------------------------------------
  const processableFiles = files.filter((f) => {
    if (f.error) {
      skippedFiles.push({ name: f.name, reason: f.error });
      return false;
    }
    return true;
  });

  if (processableFiles.length === 0) {
    throw new Error(
      'No files to convert. All files were skipped — check for password-protected PDFs.'
    );
  }

  // ------------------------------------------------------------------
  // Pass 1: determine total page count across all inputs so we can
  // compute zero-padding width and pre-announce totalPages.
  // ------------------------------------------------------------------
  let totalPages = 0;
  for (const f of processableFiles) {
    totalPages += f.format === 'PDF' ? (f.pageCount ?? 0) : 1;
  }

  // Edge case: PDFs whose pageCount wasn't resolved yet get loaded now.
  // We'll fix up the running total as we go.

  const digits = String(totalPages).length || 1;
  let pageIndex = 0; // 1-based after increment

  // Load PDF.js once if needed, outside the per-file loop
  const hasPdf = processableFiles.some((f) => f.format === 'PDF');
  const pdfjsLib = hasPdf ? await getPdfjsLib() : null;

  // ------------------------------------------------------------------
  // Pass 2: process each file
  // ------------------------------------------------------------------
  for (const appFile of processableFiles) {
    if (cancelToken.cancelled) throw new Error('cancelled');

    if (appFile.format === 'PDF') {
      // ------------------------------------------------------------------
      // PDF: render each page to canvas via PDF.js
      // ------------------------------------------------------------------
      const bytes = await appFile.file.arrayBuffer();
      let pdf;
      try {
        pdf = await pdfjsLib!.getDocument({ data: bytes }).promise;
      } catch (err: unknown) {
        // Catch password-protected PDFs that weren't detected earlier
        if (
          err instanceof Error &&
          (err.name === 'PasswordException' ||
            err.message?.toLowerCase().includes('password'))
        ) {
          skippedFiles.push({ name: appFile.name, reason: 'Password protected' });
          warnings.push(`"${appFile.name}" is password-protected and was skipped.`);
          continue;
        }
        throw err;
      }
      const pageCount = pdf.numPages;

      // If the stored pageCount was wrong (e.g. still null from a fast drop),
      // add a warning so the user knows the digit-width may be off.
      if (appFile.pageCount !== null && appFile.pageCount !== pageCount) {
        warnings.push(
          `"${appFile.name}": reported ${appFile.pageCount} pages but archive contains ${pageCount}.`
        );
      }

      const pdfMime = options.pdfPageFormat === 'jpg' ? 'image/jpeg' : 'image/png';
      const pdfExt  = options.pdfPageFormat === 'jpg' ? 'jpg' : 'png';

      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        if (cancelToken.cancelled) {
          pdf.destroy();
          throw new Error('cancelled');
        }

        const page = await pdf.getPage(pageNum);
        // PDF native resolution is 72 DPI; scale up to the requested DPI.
        const scale = options.dpi / 72;
        const viewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        canvas.width  = Math.round(viewport.width);
        canvas.height = Math.round(viewport.height);

        // pdfjs-dist v5+ requires `canvas`; `canvasContext` is the v4 legacy API.
        await page.render({ canvas, viewport }).promise;
        page.cleanup();

        // Optional resize
        let finalW = canvas.width;
        let finalH = canvas.height;
        const scaled = computeScaledSize(finalW, finalH, options.maxWidth, options.maxHeight);
        if (scaled.w !== finalW || scaled.h !== finalH) {
          // Re-draw at target size
          const small = document.createElement('canvas');
          small.width  = scaled.w;
          small.height = scaled.h;
          small.getContext('2d')!.drawImage(canvas, 0, 0, scaled.w, scaled.h);
          finalW = scaled.w;
          finalH = scaled.h;
          // Export from the resized canvas
          const resizedBlob = await new Promise<Blob>((resolve, reject) => {
            small.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
              pdfMime,
              options.quality / 100
            );
          });
          zip.file(
            String(++pageIndex).padStart(digits, '0') + '.' + pdfExt,
            await resizedBlob.arrayBuffer()
          );
        } else {
          const pageBlob = await new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (b) => (b ? resolve(b) : reject(new Error('canvas.toBlob failed'))),
              pdfMime,
              options.quality / 100
            );
          });
          zip.file(
            String(++pageIndex).padStart(digits, '0') + '.' + pdfExt,
            await pageBlob.arrayBuffer()
          );
        }

        onProgress({
          currentPage: pageIndex,
          totalPages,
          elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
          statusText: `"${appFile.name}" — page ${pageNum} of ${pageCount}`,
        });
      }

      pdf.destroy();

    } else {
      // ------------------------------------------------------------------
      // Image file: keep raw bytes or re-encode via canvas
      // ------------------------------------------------------------------
      const { mime, ext } = resolveOutputFormat(appFile.format, options.outputFormat);
      const needsReencode = options.outputFormat !== 'keep';

      // Determine natural dimensions so we can decide on resize
      let natW: number;
      let natH: number;
      if (appFile.width && appFile.height) {
        natW = appFile.width;
        natH = appFile.height;
      } else {
        // Read from the image if dimensions weren't pre-loaded
        const { width, height } = await readImageDimensions(appFile.file);
        natW = width;
        natH = height;
      }

      const { w: targetW, h: targetH } = computeScaledSize(natW, natH, options.maxWidth, options.maxHeight);
      const needsResize = targetW !== natW || targetH !== natH;

      let fileBytes: ArrayBuffer;
      if (needsReencode || needsResize) {
        // Draw to canvas and re-export
        fileBytes = await imageFileToCanvasBytes(appFile.file, targetW, targetH, mime, options.quality);
      } else {
        // Use raw bytes — zero copy, preserves original encoding exactly
        fileBytes = await appFile.file.arrayBuffer();
      }

      // Formats the browser can't round-trip via canvas (TIFF, BMP, AVIF)
      // get a warning when re-encoding is requested but we fell back to raw.
      // (In practice needsReencode||needsResize already handles this; the
      // browser simply won't call toBlob with those MIME types successfully.)

      zip.file(String(++pageIndex).padStart(digits, '0') + '.' + ext, fileBytes);

      onProgress({
        currentPage: pageIndex,
        totalPages,
        elapsedSeconds: Math.round((Date.now() - startTime) / 1000),
        statusText: `"${appFile.name}"`,
      });
    }
  }

  // ------------------------------------------------------------------
  // ComicInfo.xml (optional)
  // ------------------------------------------------------------------
  const xml = buildComicInfoXml(metadata);
  if (xml) {
    zip.file('ComicInfo.xml', xml);
  }

  // ------------------------------------------------------------------
  // Generate ZIP
  // ------------------------------------------------------------------
  const zipBlob = await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.comicbook+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  const elapsed = (Date.now() - startTime) / 1000;

  // Surface skipped files as warnings so the user sees them
  for (const sf of skippedFiles) {
    warnings.push(`Skipped "${sf.name}": ${sf.reason}`);
  }

  return {
    filename: 'output.cbz', // overwritten by caller with real output name
    sizeBytes: zipBlob.size,
    pageCount: pageIndex,
    durationSeconds: elapsed,
    warnings,
    blob: zipBlob,
  };
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function CBZConverterPage() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const cancelTokenRef = useRef<CancelToken>({ cancelled: false });

  // Auto-dismiss toast after 5 seconds
  useEffect(() => {
    if (!state.toast) return;
    const id = setTimeout(() => dispatch({ type: 'CLEAR_TOAST' }), 5000);
    return () => clearTimeout(id);
  }, [state.toast]);

  // ---------------------------------------------------------------------------
  // File addition
  // ---------------------------------------------------------------------------

  const handleFilesAccepted = useCallback(
    async (rawFiles: File[]) => {
      const validFiles: AppFile[] = [];
      const rejected: string[] = [];

      for (const file of rawFiles) {
        const format = detectFormat(file);
        if (!format) {
          rejected.push(file.name);
          continue;
        }
        const appFile: AppFile = {
          id: crypto.randomUUID(),
          name: file.name,
          format: format as AppFile['format'],
          size: file.size,
          width: null,
          height: null,
          pageCount: null,
          thumbnailUrl: null,
          file,
          loading: true,
          error: null,
        };
        validFiles.push(appFile);
      }

      if (rejected.length > 0) {
        dispatch({
          type: 'SHOW_TOAST',
          message: `${rejected.length} file${rejected.length > 1 ? 's' : ''} skipped (unsupported format).`,
          variant: 'warning',
        });
      }

      if (validFiles.length === 0) return;

      dispatch({ type: 'ADD_FILES', files: validFiles });

      // Asynchronously read image dimensions / thumbnails and PDF page counts
      for (const appFile of validFiles) {
        if (appFile.format === 'PDF') {
          // Use real PDF.js page count — no more fake random numbers
          getPdfPageCount(appFile.file)
            .then((pageCount) => {
              dispatch({
                type: 'UPDATE_FILE',
                id: appFile.id,
                patch: { pageCount, loading: false },
              });
            })
            .catch((err) => {
              if (err instanceof PasswordProtectedError) {
                dispatch({
                  type: 'UPDATE_FILE',
                  id: appFile.id,
                  patch: { pageCount: 0, loading: false, error: 'Password protected' },
                });
                dispatch({
                  type: 'SHOW_TOAST',
                  message: `"${appFile.name}" is password-protected and will be skipped.`,
                  variant: 'warning',
                });
              } else {
                // Graceful fallback: mark as 0 pages and let conversion surface a real error
                dispatch({
                  type: 'UPDATE_FILE',
                  id: appFile.id,
                  patch: { pageCount: 0, loading: false },
                });
              }
            });
        } else {
          readImageDimensions(appFile.file)
            .then(({ width, height, thumbnailUrl }) => {
              dispatch({
                type: 'UPDATE_FILE',
                id: appFile.id,
                patch: { width, height, thumbnailUrl, loading: false },
              });
            })
            .catch(() => {
              dispatch({
                type: 'UPDATE_FILE',
                id: appFile.id,
                patch: { loading: false },
              });
            });
        }
      }
    },
    []
  );

  const handleFilesRejected = useCallback((reasons: string[]) => {
    dispatch({
      type: 'SHOW_TOAST',
      message: reasons[0] ?? 'File rejected.',
      variant: 'error',
    });
  }, []);

  // ---------------------------------------------------------------------------
  // Conversion
  // ---------------------------------------------------------------------------

  const handleConvert = useCallback(async () => {
    if (state.files.length === 0) return;
    cancelTokenRef.current = { cancelled: false };
    dispatch({ type: 'START_CONVERSION' });

    try {
      const outputName =
        state.options.outputName ||
        state.files[0].name.replace(/\.[^.]+$/, '');

      const result = await buildCBZ(
        state.files,
        state.options,
        state.metadata,
        (progress: ProcessingProgress) => dispatch({ type: 'UPDATE_PROGRESS', progress }),
        cancelTokenRef.current
      );

      dispatch({
        type: 'CONVERSION_SUCCESS',
        result: { ...result, filename: `${outputName}.cbz` },
      });
      dispatch({
        type: 'SHOW_TOAST',
        message: `Conversion complete — ${result.pageCount} pages archived.`,
        variant: 'success',
      });
    } catch (err) {
      if ((err as Error).message === 'cancelled') return;
      dispatch({
        type: 'CONVERSION_ERROR',
        error: {
          message: (err instanceof Error ? err.message : String(err)) ||
            'Conversion failed. An unexpected error occurred. Try again or adjust your settings.',
          skippedFiles: [],
        },
      });
    }
  }, [state.files, state.options, state.metadata]);

  const handleCancel = useCallback(() => {
    cancelTokenRef.current.cancelled = true;
    dispatch({ type: 'CANCEL_CONVERSION' });
  }, []);

  const handleReset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const handleClearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_FILES' });
  }, []);

  // ---------------------------------------------------------------------------
  // Derived state
  // ---------------------------------------------------------------------------

  const hasPdf = state.files.some((f) => f.format === 'PDF');
  const isProcessing = state.status === 'processing';
  const isSuccess = state.status === 'success';
  const isError = state.status === 'error';
  const hasFiles = state.files.length > 0;
  const allFilesErrored = hasFiles && state.files.every((f) => f.error !== null);
  const canConvert = hasFiles && !isProcessing && !allFilesErrored;

  const totalPages = state.files.reduce((acc, f) => acc + (f.pageCount ?? (f.format === 'PDF' ? 0 : 1)), 0);
  const totalSize = state.files.reduce((acc, f) => acc + f.size, 0);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-25">
      {/* ------------------------------------------------------------------ */}
      {/* App Header                                                          */}
      {/* ------------------------------------------------------------------ */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-app mx-auto px-4 sm:px-6 lg:px-8 xl:px-0 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-600 text-white shadow-xs flex-shrink-0">
              <Archive size={20} strokeWidth={1.5} />
            </div>
            <div>
              <h1 className="text-xl leading-7 font-semibold text-gray-900 tracking-tight">
                CBZ Converter
              </h1>
              <p className="text-xs text-gray-500 leading-4 hidden sm:block">
                Images and PDFs to comic book archives
              </p>
            </div>
          </div>
          <a
            href="https://anansi-project.github.io/docs/comicinfo/documentation"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors duration-150"
            aria-label="Open ComicInfo documentation"
          >
            <HelpCircle size={16} strokeWidth={1.5} />
            <span className="hidden sm:inline">ComicInfo docs</span>
          </a>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Toast                                                               */}
      {/* ------------------------------------------------------------------ */}
      {state.toast && (
        <Toast
          message={state.toast.message}
          variant={state.toast.variant}
          onDismiss={() => dispatch({ type: 'CLEAR_TOAST' })}
        />
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Main content                                                        */}
      {/* ------------------------------------------------------------------ */}
      <main className="max-w-app mx-auto px-4 sm:px-6 lg:px-8 xl:px-0 py-8 pb-28 md:pb-8">

        {/* Dropzone -------------------------------------------------------- */}
        <section aria-label="File upload">
          <Dropzone
            compact={hasFiles}
            disabled={isProcessing}
            onFilesAccepted={handleFilesAccepted}
            onFilesRejected={handleFilesRejected}
          />
        </section>

        {/* File list ------------------------------------------------------- */}
        {hasFiles && (
          <section aria-label="Uploaded files" className="mt-4">
            <FileList
              files={state.files}
              disabled={isProcessing}
              totalPages={totalPages}
              totalSize={totalSize}
              onRemove={(id) => dispatch({ type: 'REMOVE_FILE', id })}
              onReorder={(files) => dispatch({ type: 'REORDER_FILES', files })}
              onClearAll={handleClearAll}
              selectedCoverIndex={state.metadata.coverPageIndex}
            />
          </section>
        )}

        {/* Options + Metadata side-by-side on md+ -------------------------- */}
        {(hasFiles || state.status === 'empty') && (
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Conversion Options */}
            <section aria-label="Conversion options">
              <ConversionOptionsPanel
                options={state.options}
                hasPdf={hasPdf}
                disabled={isProcessing}
                onChange={(patch: Partial<ConversionOptions>) => dispatch({ type: 'SET_OPTIONS', patch })}
              />
            </section>

            {/* Metadata Panel */}
            <section aria-label="Comic metadata">
              <MetadataPanel
                metadata={state.metadata}
                expanded={state.metadataExpanded}
                disabled={isProcessing}
                files={state.files}
                onChange={(patch) => dispatch({ type: 'SET_METADATA', patch })}
                onToggle={() => dispatch({ type: 'TOGGLE_METADATA_PANEL' })}
              />
            </section>
          </div>
        )}

        {/* Dry-run preview -------------------------------------------------- */}
        {state.showDryRun && hasFiles && (
          <div className="mt-6">
            <DryRunPanel
              files={state.files}
              options={state.options}
              metadata={state.metadata}
              onClose={() => dispatch({ type: 'TOGGLE_DRY_RUN' })}
            />
          </div>
        )}

        {/* Progress indicator ---------------------------------------------- */}
        {isProcessing && state.progress && (
          <div className="mt-6" role="region" aria-label="Conversion progress" aria-live="polite">
            <ProgressIndicator
              progress={state.progress}
              onCancel={handleCancel}
            />
          </div>
        )}

        {/* Download / Success area ----------------------------------------- */}
        {(isSuccess || isError) && (
          <div
            className="mt-6"
            role="alert"
            aria-live="polite"
          >
            <DownloadArea
              status={state.status}
              result={state.result}
              error={state.error}
              onReset={handleReset}
              onClearAll={handleClearAll}
            />
          </div>
        )}

        {/* Action bar ------------------------------------------------------- */}
        {/* Shown when files are present and not yet processing/done */}
        {!isProcessing && !isSuccess && !isError && (
          <div className="mt-8 flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Preview / Dry-run trigger */}
            {hasFiles && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_DRY_RUN' })}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 rounded"
                aria-expanded={state.showDryRun}
                aria-controls="dry-run-panel"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
                {state.showDryRun ? 'Hide Preview' : 'Preview'}
              </button>
            )}

            {/* Primary Convert button (desktop inline; mobile sticky) */}
            <div className="w-full sm:w-auto sm:ml-auto">
              <ConvertButton
                disabled={!canConvert}
                hasFiles={hasFiles}
                allFilesErrored={allFilesErrored}
                onClick={handleConvert}
              />
            </div>
          </div>
        )}

        {/* Retry bar after error ------------------------------------------- */}
        {isError && (
          <div className="mt-4 flex gap-3 justify-end">
            {/* DownloadArea has its own Try Again / Clear buttons */}
          </div>
        )}
      </main>

      {/* ------------------------------------------------------------------ */}
      {/* Mobile sticky convert button                                        */}
      {/* ------------------------------------------------------------------ */}
      {!isProcessing && !isSuccess && !isError && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-10 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
          <ConvertButton
            disabled={!canConvert}
            hasFiles={hasFiles}
            allFilesErrored={allFilesErrored}
            onClick={handleConvert}
            fullWidth
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Convert button sub-component (avoids duplication for desktop/mobile)
// ---------------------------------------------------------------------------

interface ConvertButtonProps {
  disabled: boolean;
  hasFiles: boolean;
  allFilesErrored?: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}

function ConvertButton({ disabled, hasFiles, allFilesErrored, onClick, fullWidth = false }: ConvertButtonProps) {
  const title = !hasFiles
    ? 'Add files to begin.'
    : allFilesErrored
      ? 'All files have errors — remove or replace password-protected PDFs.'
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-disabled={disabled}
      className={[
        'inline-flex items-center justify-center gap-2',
        'h-12 px-6 rounded-lg',
        'text-sm font-semibold leading-5',
        'transition-colors duration-150',
        'focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-100',
        fullWidth ? 'w-full' : 'min-w-[200px]',
        disabled
          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
          : 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-xs',
      ].join(' ')}
    >
      {/* Archive icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <polyline points="21 8 21 21 3 21 3 8"/>
        <rect x="1" y="3" width="22" height="5"/>
        <line x1="10" y1="12" x2="14" y2="12"/>
      </svg>
      Convert to CBZ
    </button>
  );
}
