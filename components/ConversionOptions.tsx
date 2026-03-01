// components/ConversionOptions.tsx
'use client';

import React from 'react';
import { Settings2, Info } from 'lucide-react';
import type { ConversionOptions, OutputFormat, PdfPageFormat } from '@/types';

// ---------------------------------------------------------------------------
// Sub-components (Untitled UI form primitive patterns)
// ---------------------------------------------------------------------------

interface FieldProps {
  id: string;
  label: string;
  helpText?: string;
  error?: string;
  children: React.ReactNode;
}

function Field({ id, label, helpText, error, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-gray-700 leading-5">
        {label}
      </label>
      {children}
      {error ? (
        <p className="text-xs text-error-600 flex items-center gap-1 leading-4">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      ) : helpText ? (
        <p className="text-xs text-gray-500 leading-4">{helpText}</p>
      ) : null}
    </div>
  );
}

// Select component
interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
}

function Select({ id, className, ...props }: SelectProps) {
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
        className ?? '',
      ].join(' ')}
      {...props}
    />
  );
}

// Number input
interface NumberInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  suffix?: string;
}

function NumberInput({ id, suffix, className, ...props }: NumberInputProps) {
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        className={[
          'w-full h-10 px-3 rounded-lg border border-gray-300 bg-white',
          'text-sm text-gray-700 leading-5',
          'shadow-xs',
          'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
          'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
          'transition-colors duration-150',
          suffix ? 'pr-10' : '',
          className ?? '',
        ].join(' ')}
        {...props}
      />
      {suffix && (
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
          {suffix}
        </span>
      )}
    </div>
  );
}

// Toggle switch
interface ToggleProps {
  id: string;
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  helpText?: string;
  tooltip?: string;
}

function Toggle({ id, label, checked, onChange, disabled = false, helpText, tooltip }: ToggleProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <label
            htmlFor={id}
            className="text-sm font-medium text-gray-700 leading-5 cursor-pointer"
          >
            {label}
          </label>
          {tooltip && (
            <span
              title={tooltip}
              className="text-gray-400 hover:text-gray-500 cursor-help"
              aria-label={tooltip}
            >
              <Info size={14} strokeWidth={1.5} />
            </span>
          )}
        </div>
        {helpText && (
          <p className="text-xs text-gray-500 leading-4">{helpText}</p>
        )}
      </div>
      <button
        type="button"
        id={id}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={[
          'relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full',
          'border-2 border-transparent transition-colors duration-150',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          checked ? 'bg-brand-600' : 'bg-gray-200',
        ].join(' ')}
      >
        <span className="sr-only">{label}</span>
        <span
          aria-hidden="true"
          className={[
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-xs',
            'transform transition-transform duration-150',
            checked ? 'translate-x-4' : 'translate-x-0',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

// Button group (PDF format selector)
interface ButtonGroupProps {
  id: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function ButtonGroup({ id, value, options, onChange, disabled }: ButtonGroupProps) {
  return (
    <div className="flex rounded-lg border border-gray-300 overflow-hidden shadow-xs" id={id} role="group">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          disabled={disabled}
          aria-pressed={value === opt.value}
          className={[
            'flex-1 h-10 px-4 text-sm font-medium leading-5 transition-colors duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            i > 0 ? 'border-l border-gray-300' : '',
            value === opt.value
              ? 'bg-brand-50 text-brand-700'
              : 'bg-white text-gray-700 hover:bg-gray-50',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Props validation helpers
// ---------------------------------------------------------------------------

interface ConversionOptionsProps {
  options: ConversionOptions;
  hasPdf: boolean;
  disabled: boolean;
  onChange: (patch: Partial<ConversionOptions>) => void;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function ConversionOptionsPanel({
  options,
  hasPdf,
  disabled,
  onChange,
}: ConversionOptionsProps) {
  const showQuality =
    options.outputFormat === 'jpg' ||
    (hasPdf && options.pdfPageFormat === 'jpg');

  const dpiError =
    options.dpi < 72 || options.dpi > 600
      ? 'DPI must be between 72 and 600.'
      : undefined;

  const maxWidthError =
    options.maxWidth < 0 ? 'Width must be a positive number.' : undefined;
  const maxHeightError =
    options.maxHeight < 0 ? 'Height must be a positive number.' : undefined;

  return (
    <div
      className={[
        'bg-white border border-gray-200 rounded-xl p-6 shadow-xs',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      {/* Panel header */}
      <div className="flex items-center gap-2 mb-5">
        <Settings2 size={20} strokeWidth={1.5} className="text-gray-500" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-gray-900 leading-7">Conversion Options</h2>
      </div>

      <div className="flex flex-col gap-4">
        {/* Output Format */}
        <Field
          id="output-format"
          label="Output image format"
          helpText="Re-encodes all images to the selected format. 'Keep original' preserves source files as-is."
        >
          <Select
            id="output-format"
            value={options.outputFormat}
            onChange={(e) => onChange({ outputFormat: e.target.value as OutputFormat })}
            disabled={disabled}
          >
            <option value="keep">Keep original</option>
            <option value="png">PNG</option>
            <option value="jpg">JPEG</option>
            <option value="webp">WebP</option>
          </Select>
        </Field>

        {/* JPEG Quality — conditional */}
        {showQuality && (
          <Field
            id="jpeg-quality"
            label="JPEG quality"
            helpText="Higher values produce larger, better-quality files."
          >
            <div className="flex items-center gap-3">
              <input
                id="jpeg-quality"
                type="range"
                min={1}
                max={100}
                step={1}
                value={options.quality}
                onChange={(e) => onChange({ quality: Number(e.target.value) })}
                disabled={disabled}
                className={[
                  'flex-1 h-2 rounded-full appearance-none cursor-pointer',
                  'bg-gray-200',
                  '[&::-webkit-slider-thumb]:appearance-none',
                  '[&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4',
                  '[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-600',
                  '[&::-webkit-slider-thumb]:shadow-xs [&::-webkit-slider-thumb]:cursor-pointer',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                ].join(' ')}
                aria-valuetext={`${options.quality}%`}
              />
              <span className="text-sm font-medium text-gray-700 w-10 text-right tabular-nums">
                {options.quality}%
              </span>
            </div>
          </Field>
        )}

        {/* PDF DPI — conditional */}
        {hasPdf && (
          <Field
            id="pdf-dpi"
            label="PDF extraction DPI"
            helpText="Resolution for rasterizing PDF pages. 300 DPI is recommended for print-quality output."
            error={dpiError}
          >
            <NumberInput
              id="pdf-dpi"
              min={72}
              max={600}
              step={1}
              value={options.dpi}
              onChange={(e) => onChange({ dpi: Number(e.target.value) })}
              disabled={disabled}
              aria-describedby="pdf-dpi-help"
              suffix="DPI"
              className={dpiError ? 'border-error-300 focus:ring-error-300' : ''}
            />
          </Field>
        )}

        {/* PDF Page Format — conditional */}
        {hasPdf && (
          <Field
            id="pdf-format"
            label="PDF page format"
            helpText="Format used when extracting pages from PDF files."
          >
            <ButtonGroup
              id="pdf-format"
              value={options.pdfPageFormat}
              options={[
                { value: 'png', label: 'PNG' },
                { value: 'jpg', label: 'JPEG' },
              ]}
              onChange={(v) => onChange({ pdfPageFormat: v as PdfPageFormat })}
              disabled={disabled}
            />
          </Field>
        )}

        {/* Maximum Dimensions */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-gray-700 leading-5">
            Maximum dimensions <span className="text-gray-400 font-normal">(optional)</span>
          </span>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-width" className="text-xs text-gray-500 leading-4">
                Max width
              </label>
              <NumberInput
                id="max-width"
                min={0}
                step={1}
                value={options.maxWidth || ''}
                placeholder="No limit"
                onChange={(e) => onChange({ maxWidth: Number(e.target.value) || 0 })}
                disabled={disabled}
                suffix="px"
                className={maxWidthError ? 'border-error-300' : ''}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="max-height" className="text-xs text-gray-500 leading-4">
                Max height
              </label>
              <NumberInput
                id="max-height"
                min={0}
                step={1}
                value={options.maxHeight || ''}
                placeholder="No limit"
                onChange={(e) => onChange({ maxHeight: Number(e.target.value) || 0 })}
                disabled={disabled}
                suffix="px"
                className={maxHeightError ? 'border-error-300' : ''}
              />
            </div>
          </div>
          <p className="text-xs text-gray-500 leading-4">
            Images exceeding these bounds are downscaled proportionally. Images within bounds are not upscaled.
          </p>
        </div>

        {/* Output filename */}
        <Field
          id="output-name"
          label="Output filename"
          helpText="The .cbz extension is added automatically."
        >
          <div className="relative">
            <input
              id="output-name"
              type="text"
              value={options.outputName}
              onChange={(e) => onChange({ outputName: e.target.value })}
              disabled={disabled}
              placeholder="my-comic"
              className={[
                'w-full h-10 px-3 pr-12 rounded-lg border border-gray-300 bg-white',
                'text-sm text-gray-700 leading-5',
                'shadow-xs',
                'focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-brand-600',
                'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed',
                'transition-colors duration-150',
              ].join(' ')}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              .cbz
            </span>
          </div>
        </Field>

        {/* Divider */}
        <hr className="border-gray-200" />

        {/* Additional toggles */}
        <div className="flex flex-col divide-y divide-gray-100">
          <Toggle
            id="strip-exif"
            label="Strip EXIF data"
            checked={options.stripExif}
            onChange={(v) => onChange({ stripExif: v })}
            disabled={disabled}
            helpText="Remove EXIF metadata from images. Only effective when re-encoding is active."
            tooltip="Removes camera/device metadata. Requires format conversion."
          />
          <Toggle
            id="include-hidden"
            label="Include hidden files"
            checked={options.includeHidden}
            onChange={(v) => onChange({ includeHidden: v })}
            disabled={disabled}
            helpText="Include files starting with '.' and files with the Hidden attribute."
          />
          <Toggle
            id="force-overwrite"
            label="Force overwrite"
            checked={options.forceOverwrite}
            onChange={(v) => onChange({ forceOverwrite: v })}
            disabled={disabled}
            helpText="Overwrite the output file if it already exists."
          />
          <Toggle
            id="merge-inputs"
            label="Merge all inputs"
            checked={options.mergeInputs}
            onChange={(v) => onChange({ mergeInputs: v })}
            disabled={disabled}
            helpText="Combine all inputs into a single CBZ file instead of one per input."
            tooltip="Combines all inputs into one CBZ with sequential page numbers."
          />
        </div>
      </div>
    </div>
  );
}
