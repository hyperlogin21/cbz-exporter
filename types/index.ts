// ---------------------------------------------------------------------------
// Shared type definitions for the CBZ Converter web UI
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// File representation
// ---------------------------------------------------------------------------

export type FileFormat =
  | 'PNG' | 'JPG' | 'WEBP' | 'GIF' | 'BMP' | 'TIFF' | 'AVIF' | 'PDF';

export interface AppFile {
  /** Unique identifier (crypto.randomUUID) */
  id: string;
  /** Original filename */
  name: string;
  /** Detected format */
  format: FileFormat;
  /** File size in bytes */
  size: number;
  /** Image dimensions — null for PDFs until analysed, null for unread images */
  width: number | null;
  height: number | null;
  /** For PDFs: total page count (resolved async) */
  pageCount: number | null;
  /** Object URL for thumbnail preview (images only) */
  thumbnailUrl: string | null;
  /** Raw File object for later processing */
  file: File;
  /** Loading state while file is being read */
  loading: boolean;
}

// ---------------------------------------------------------------------------
// Conversion options (mirrors CLI flags)
// ---------------------------------------------------------------------------

export type OutputFormat = 'keep' | 'png' | 'jpg' | 'webp';
export type PdfPageFormat = 'png' | 'jpg';

export interface ConversionOptions {
  /** --convert-to / output image format */
  outputFormat: OutputFormat;
  /** --quality (1–100, applies to JPEG output) */
  quality: number;
  /** --dpi (72–600, PDF extraction) */
  dpi: number;
  /** --format for PDF pages */
  pdfPageFormat: PdfPageFormat;
  /** --max-width in pixels, 0 = no limit */
  maxWidth: number;
  /** --max-height in pixels, 0 = no limit */
  maxHeight: number;
  /** --strip-exif */
  stripExif: boolean;
  /** --include-hidden */
  includeHidden: boolean;
  /** --force */
  forceOverwrite: boolean;
  /** --merge (only relevant when 2+ files present) */
  mergeInputs: boolean;
  /** Output filename (without extension) */
  outputName: string;
}

// ---------------------------------------------------------------------------
// ComicInfo.xml metadata
// ---------------------------------------------------------------------------

export type MangaValue = '' | 'Unknown' | 'Yes' | 'No' | 'YesAndRightToLeft';
export type BWValue = '' | 'Unknown' | 'Yes' | 'No';
export type AgeRatingValue =
  | ''
  | 'Unknown'
  | 'Adults Only 18+'
  | 'Early Childhood'
  | 'Everyone'
  | 'Everyone 10+'
  | 'G'
  | 'Kids to Adults'
  | 'M'
  | 'MA15+'
  | 'Mature 17+'
  | 'PG'
  | 'R18+'
  | 'Rating Pending'
  | 'Teen'
  | 'X18+';

export interface ComicMetadata {
  // General information
  title: string;
  series: string;
  number: string;
  count: string;
  volume: string;
  summary: string;
  notes: string;
  publisher: string;
  genre: string;
  tags: string;
  web: string;
  language: string;
  ageRating: AgeRatingValue;
  // Creator information
  writer: string;
  penciller: string;
  inker: string;
  colorist: string;
  letterer: string;
  coverArtist: string;
  editor: string;
  translator: string;
  // Date
  year: string;
  month: string;
  day: string;
  // Format
  manga: MangaValue;
  blackAndWhite: BWValue;
  bookFormat: string;
  // Cover page
  coverPageIndex: number; // 0-based, 0 = first page
  noCoverTag: boolean;
}

// ---------------------------------------------------------------------------
// Application state machine
// ---------------------------------------------------------------------------

export type AppStatus =
  | 'empty'        // No files added yet
  | 'files-added'  // Files present, ready to convert
  | 'processing'   // Conversion in progress (simulated)
  | 'success'      // Conversion completed successfully
  | 'error';       // Conversion failed entirely

export interface ProcessingProgress {
  currentPage: number;
  totalPages: number;
  elapsedSeconds: number;
  statusText: string;
}

export interface ConversionResult {
  /** Output filename */
  filename: string;
  /** Output size in bytes */
  sizeBytes: number;
  /** Total pages archived */
  pageCount: number;
  /** Duration in seconds */
  durationSeconds: number;
  /** Any warnings emitted */
  warnings: string[];
  /** The real ZIP blob for download */
  blob: Blob;
}

export interface ConversionError {
  message: string;
  skippedFiles: Array<{ name: string; reason: string }>;
}

export interface AppState {
  status: AppStatus;
  files: AppFile[];
  options: ConversionOptions;
  metadata: ComicMetadata;
  progress: ProcessingProgress | null;
  result: ConversionResult | null;
  error: ConversionError | null;
  /** Whether the dry-run preview panel is open */
  showDryRun: boolean;
  /** Whether the metadata panel is expanded */
  metadataExpanded: boolean;
  /** Toast message (auto-dismissed) */
  toast: { message: string; variant: 'success' | 'error' | 'warning' } | null;
}

// ---------------------------------------------------------------------------
// State machine actions
// ---------------------------------------------------------------------------

export type AppAction =
  | { type: 'ADD_FILES'; files: AppFile[] }
  | { type: 'UPDATE_FILE'; id: string; patch: Partial<AppFile> }
  | { type: 'REMOVE_FILE'; id: string }
  | { type: 'REORDER_FILES'; files: AppFile[] }
  | { type: 'CLEAR_FILES' }
  | { type: 'SET_OPTIONS'; patch: Partial<ConversionOptions> }
  | { type: 'SET_METADATA'; patch: Partial<ComicMetadata> }
  | { type: 'TOGGLE_METADATA_PANEL' }
  | { type: 'TOGGLE_DRY_RUN' }
  | { type: 'START_CONVERSION' }
  | { type: 'UPDATE_PROGRESS'; progress: ProcessingProgress }
  | { type: 'CONVERSION_SUCCESS'; result: ConversionResult }
  | { type: 'CONVERSION_ERROR'; error: ConversionError }
  | { type: 'CANCEL_CONVERSION' }
  | { type: 'RESET' }
  | { type: 'SHOW_TOAST'; message: string; variant: 'success' | 'error' | 'warning' }
  | { type: 'CLEAR_TOAST' };
