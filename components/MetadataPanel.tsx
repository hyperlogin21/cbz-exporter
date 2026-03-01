// components/MetadataPanel.tsx
'use client';

import React, { useRef } from 'react';
import { FileCheck2, ChevronDown } from 'lucide-react';
import type { AppFile, ComicMetadata, AgeRatingValue, MangaValue, BWValue } from '@/types';

// ---------------------------------------------------------------------------
// Shared primitives (Untitled UI form patterns)
// ---------------------------------------------------------------------------

interface FieldProps {
  id: string;
  label: string;
  helpText?: string;
  children: React.ReactNode;
  required?: boolean;
}

function Field({ id, label, helpText, children, required }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 leading-5">
        {label}
        {required && <span className="text-error-500 ml-0.5">*</span>}
      </label>
      {children}
      {helpText && (
        <p className="text-xs text-gray-500 leading-4">{helpText}</p>
      )}
    </div>
  );
}

const inputBase = [
  'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white',
  'text-sm text-gray-700 leading-5 placeholder:text-gray-400',
  'shadow-xs',
  'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
  'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
  'transition-colors duration-150',
].join(' ');

interface TextInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
}

function TextInput({ id, ...props }: TextInputProps) {
  return <input id={id} type="text" className={inputBase} {...props} />;
}

interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
}

function NumberInput({ id, ...props }: NumberInputProps) {
  return <input id={id} type="number" className={inputBase} {...props} />;
}

interface SelectInputProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
}

function SelectInput({ id, children, ...props }: SelectInputProps) {
  return (
    <select
      id={id}
      className={[
        'w-full h-10 px-3 py-2 rounded-lg border border-gray-300 bg-white',
        'text-sm text-gray-700 leading-5',
        'shadow-xs',
        'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
        'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
        'transition-colors duration-150',
      ].join(' ')}
      {...props}
    >
      {children}
    </select>
  );
}

interface TextareaInputProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
}

function TextareaInput({ id, ...props }: TextareaInputProps) {
  return (
    <textarea
      id={id}
      rows={3}
      className={[
        'w-full px-3 py-2 rounded-lg border border-gray-300 bg-white resize-none',
        'text-sm text-gray-700 leading-5 placeholder:text-gray-400',
        'shadow-xs',
        'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
        'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
        'transition-colors duration-150',
      ].join(' ')}
      {...props}
    />
  );
}

function Divider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <hr className="flex-1 border-gray-200" />
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide whitespace-nowrap">
        {label}
      </span>
      <hr className="flex-1 border-gray-200" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Common select options
// ---------------------------------------------------------------------------

const LANGUAGE_OPTIONS = [
  { value: '', label: 'Select language' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: 'Japanese' },
  { value: 'ko', label: 'Korean' },
  { value: 'zh', label: 'Chinese' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'es', label: 'Spanish' },
  { value: 'pt', label: 'Portuguese' },
  { value: 'it', label: 'Italian' },
  { value: 'ru', label: 'Russian' },
  { value: 'ar', label: 'Arabic' },
  { value: 'pl', label: 'Polish' },
  { value: 'nl', label: 'Dutch' },
  { value: 'sv', label: 'Swedish' },
];

const AGE_RATING_OPTIONS: Array<{ value: AgeRatingValue; label: string }> = [
  { value: '', label: 'Select age rating' },
  { value: 'Everyone', label: 'Everyone' },
  { value: 'Everyone 10+', label: 'Everyone 10+' },
  { value: 'Teen', label: 'Teen' },
  { value: 'Mature 17+', label: 'Mature 17+' },
  { value: 'Adults Only 18+', label: 'Adults Only 18+' },
  { value: 'Early Childhood', label: 'Early Childhood' },
  { value: 'G', label: 'G' },
  { value: 'Kids to Adults', label: 'Kids to Adults' },
  { value: 'M', label: 'M' },
  { value: 'MA15+', label: 'MA15+' },
  { value: 'PG', label: 'PG' },
  { value: 'R18+', label: 'R18+' },
  { value: 'Rating Pending', label: 'Rating Pending' },
  { value: 'Unknown', label: 'Unknown' },
  { value: 'X18+', label: 'X18+' },
];

const MONTH_OPTIONS = [
  { value: '', label: 'Month' },
  ...Array.from({ length: 12 }, (_, i) => ({
    value: String(i + 1),
    label: new Date(2000, i, 1).toLocaleString('default', { month: 'long' }),
  })),
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

interface MetadataPanelProps {
  metadata: ComicMetadata;
  expanded: boolean;
  disabled: boolean;
  files: AppFile[];
  onChange: (patch: Partial<ComicMetadata>) => void;
  onToggle: () => void;
}

export default function MetadataPanel({
  metadata,
  expanded,
  disabled,
  files,
  onChange,
  onToggle,
}: MetadataPanelProps) {
  const panelId = 'metadata-panel-body';
  const metadataFileRef = useRef<HTMLInputElement>(null);

  // Build cover page select options from files
  const coverOptions = [
    { value: '0', label: 'First page (default)' },
    ...files.map((f, i) => ({ value: String(i), label: `Page ${i + 1}: ${f.name}` })),
  ];

  return (
    <div
      className={[
        'bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Panel header / toggle */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        aria-controls={panelId}
        className={[
          'w-full flex items-center justify-between px-6 py-4',
          'hover:bg-gray-50 transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <FileCheck2 size={20} strokeWidth={1.5} className="text-gray-500" aria-hidden="true" />
          <span className="text-lg font-semibold text-gray-900 leading-7">
            Metadata
          </span>
          <span className="text-sm text-gray-400 font-normal">(ComicInfo.xml)</span>
        </div>
        <ChevronDown
          size={20}
          strokeWidth={1.5}
          className={[
            'text-gray-400 transition-transform duration-250',
            expanded ? 'rotate-180' : '',
          ].join(' ')}
          aria-hidden="true"
        />
      </button>

      {/* Collapsed hint */}
      {!expanded && (
        <p className="px-6 pb-4 text-sm text-gray-500">
          Optional. Add metadata for comic reader integration (Komga, YACReader, Kavita).
        </p>
      )}

      {/* Expanded form */}
      {expanded && (
        <div id={panelId} className="px-6 pb-6 flex flex-col gap-4">
          {/* General information group */}
          <Divider label="General" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="meta-title" label="Title">
              <TextInput
                id="meta-title"
                value={metadata.title}
                onChange={(e) => onChange({ title: e.target.value })}
                disabled={disabled}
                placeholder="Chapter 1: The Beginning"
              />
            </Field>

            <Field id="meta-series" label="Series">
              <TextInput
                id="meta-series"
                value={metadata.series}
                onChange={(e) => onChange({ series: e.target.value })}
                disabled={disabled}
                placeholder="My Webcomic"
              />
            </Field>

            <Field id="meta-number" label="Issue / Chapter number">
              <TextInput
                id="meta-number"
                value={metadata.number}
                onChange={(e) => onChange({ number: e.target.value })}
                disabled={disabled}
                placeholder="1"
              />
            </Field>

            <Field id="meta-count" label="Total issues">
              <NumberInput
                id="meta-count"
                value={metadata.count}
                onChange={(e) => onChange({ count: e.target.value })}
                disabled={disabled}
                placeholder="24"
                min={1}
              />
            </Field>

            <Field id="meta-volume" label="Volume">
              <NumberInput
                id="meta-volume"
                value={metadata.volume}
                onChange={(e) => onChange({ volume: e.target.value })}
                disabled={disabled}
                placeholder="1"
                min={1}
              />
            </Field>

            <Field id="meta-publisher" label="Publisher">
              <TextInput
                id="meta-publisher"
                value={metadata.publisher}
                onChange={(e) => onChange({ publisher: e.target.value })}
                disabled={disabled}
                placeholder="Self-Published"
              />
            </Field>
          </div>

          <Field id="meta-summary" label="Summary">
            <TextareaInput
              id="meta-summary"
              value={metadata.summary}
              onChange={(e) => onChange({ summary: e.target.value })}
              disabled={disabled}
              placeholder="Brief description of this issue..."
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="meta-genre" label="Genre">
              <TextInput
                id="meta-genre"
                value={metadata.genre}
                onChange={(e) => onChange({ genre: e.target.value })}
                disabled={disabled}
                placeholder="Fantasy, Adventure"
              />
            </Field>

            <Field
              id="meta-tags"
              label="Tags"
              helpText="v2.1 draft field — supported by Kavita."
            >
              <TextInput
                id="meta-tags"
                value={metadata.tags}
                onChange={(e) => onChange({ tags: e.target.value })}
                disabled={disabled}
                placeholder="webcomic, fantasy"
              />
            </Field>

            <Field id="meta-web" label="Web URL">
              <TextInput
                id="meta-web"
                value={metadata.web}
                onChange={(e) => onChange({ web: e.target.value })}
                disabled={disabled}
                placeholder="https://mycomic.example.com"
              />
            </Field>

            <Field id="meta-language" label="Language">
              <SelectInput
                id="meta-language"
                value={metadata.language}
                onChange={(e) => onChange({ language: e.target.value })}
                disabled={disabled}
              >
                {LANGUAGE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </Field>

            <Field id="meta-age-rating" label="Age rating">
              <SelectInput
                id="meta-age-rating"
                value={metadata.ageRating}
                onChange={(e) => onChange({ ageRating: e.target.value as AgeRatingValue })}
                disabled={disabled}
              >
                {AGE_RATING_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </SelectInput>
            </Field>
          </div>

          {/* Creator group */}
          <Divider label="Creators" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(
              [
                ['meta-writer',       'Writer',       'writer',       'Writer name'],
                ['meta-penciller',    'Penciller',    'penciller',    'Penciller name'],
                ['meta-inker',        'Inker',        'inker',        'Inker name'],
                ['meta-colorist',     'Colorist',     'colorist',     'Colorist name'],
                ['meta-letterer',     'Letterer',     'letterer',     'Letterer name'],
                ['meta-cover-artist', 'Cover Artist', 'coverArtist',  'Cover artist name'],
                ['meta-editor',       'Editor',       'editor',       'Editor name'],
                ['meta-translator',   'Translator',   'translator',   'Translator name'],
              ] as [string, string, keyof ComicMetadata, string][]
            ).map(([id, label, field, placeholder]) => (
              <Field key={id} id={id} label={label}>
                <TextInput
                  id={id}
                  value={metadata[field] as string}
                  onChange={(e) => onChange({ [field]: e.target.value })}
                  disabled={disabled}
                  placeholder={placeholder}
                />
              </Field>
            ))}
          </div>

          {/* Date and format group */}
          <Divider label="Date & Format" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field id="meta-year" label="Year">
              <NumberInput
                id="meta-year"
                value={metadata.year}
                onChange={(e) => onChange({ year: e.target.value })}
                disabled={disabled}
                placeholder="2026"
                min={1900}
                max={2100}
              />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field id="meta-month" label="Month">
                <SelectInput
                  id="meta-month"
                  value={metadata.month}
                  onChange={(e) => onChange({ month: e.target.value })}
                  disabled={disabled}
                >
                  {MONTH_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </SelectInput>
              </Field>

              <Field id="meta-day" label="Day">
                <NumberInput
                  id="meta-day"
                  value={metadata.day}
                  onChange={(e) => onChange({ day: e.target.value })}
                  disabled={disabled}
                  placeholder="1"
                  min={1}
                  max={31}
                />
              </Field>
            </div>

            <Field id="meta-manga" label="Manga / Reading direction">
              <SelectInput
                id="meta-manga"
                value={metadata.manga}
                onChange={(e) => onChange({ manga: e.target.value as MangaValue })}
                disabled={disabled}
              >
                <option value="">Not specified</option>
                <option value="Unknown">Unknown</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
                <option value="YesAndRightToLeft">Yes (right-to-left)</option>
              </SelectInput>
            </Field>

            <Field id="meta-bw" label="Black and white">
              <SelectInput
                id="meta-bw"
                value={metadata.blackAndWhite}
                onChange={(e) => onChange({ blackAndWhite: e.target.value as BWValue })}
                disabled={disabled}
              >
                <option value="">Not specified</option>
                <option value="Unknown">Unknown</option>
                <option value="No">No</option>
                <option value="Yes">Yes</option>
              </SelectInput>
            </Field>

            <Field id="meta-format" label="Book format" helpText='e.g., "Web", "Digital", "Print"'>
              <TextInput
                id="meta-format"
                value={metadata.bookFormat}
                onChange={(e) => onChange({ bookFormat: e.target.value })}
                disabled={disabled}
                placeholder="Web"
              />
            </Field>
          </div>

          {/* Metadata file upload */}
          <Divider label="Import from File" />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="meta-file-upload" className="text-sm font-medium text-gray-700 leading-5">
              Or import from file
            </label>
            <div
              className="flex items-center gap-3 p-3 border border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-brand-300 hover:bg-brand-25 transition-colors duration-150 cursor-pointer"
              onClick={() => metadataFileRef.current?.click()}
            >
              <FileCheck2 size={20} strokeWidth={1.5} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-600">
                  <span className="font-medium text-brand-600">Click to upload</span>
                  {' '}a JSON or YAML metadata file
                </p>
                <p className="text-xs text-gray-400">.json, .yml, .yaml</p>
              </div>
              <input
                ref={metadataFileRef}
                id="meta-file-upload"
                type="file"
                accept=".json,.yml,.yaml"
                className="sr-only"
                aria-label="Upload metadata file"
                disabled={disabled}
                onChange={(e) => {
                  // In the real implementation, this would parse and apply the file.
                  // For the UI shell, we just acknowledge it was selected.
                  const file = e.target.files?.[0];
                  if (file) {
                    // TODO: parse JSON/YAML and merge into metadata
                    console.info('Metadata file selected:', file.name);
                    e.target.value = '';
                  }
                }}
              />
            </div>
            <p className="text-xs text-gray-500 leading-4">
              Upload a JSON or YAML metadata file. Fields filled in the form above take precedence over file values.
            </p>
          </div>

          {/* Cover page selection */}
          <Divider label="Cover Page" />

          <Field id="meta-cover" label="Cover page">
            <SelectInput
              id="meta-cover"
              value={String(metadata.coverPageIndex)}
              onChange={(e) => onChange({ coverPageIndex: Number(e.target.value) })}
              disabled={disabled || metadata.noCoverTag}
            >
              {files.length === 0 ? (
                <option value="0">First page (default)</option>
              ) : (
                coverOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))
              )}
            </SelectInput>
          </Field>

          <label className="flex items-center gap-2.5 cursor-pointer group">
            <input
              type="checkbox"
              id="meta-no-cover-tag"
              checked={metadata.noCoverTag}
              onChange={(e) => onChange({ noCoverTag: e.target.checked })}
              disabled={disabled}
              className={[
                'w-4 h-4 rounded border border-gray-300 text-brand-600',
                'focus:ring-2 focus:ring-brand-600 focus:ring-offset-0',
                'disabled:opacity-40 disabled:cursor-not-allowed',
                'cursor-pointer',
              ].join(' ')}
            />
            <span className="text-sm text-gray-700 leading-5 group-hover:text-gray-900 transition-colors duration-150">
              Do not tag any page as cover{' '}
              <span className="text-gray-400 text-xs font-mono">--no-cover-tag</span>
            </span>
          </label>
        </div>
      )}
    </div>
  );
}
