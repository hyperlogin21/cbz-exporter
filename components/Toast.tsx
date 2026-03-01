// components/Toast.tsx
'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, AlertTriangle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  variant: 'success' | 'error' | 'warning';
  onDismiss: () => void;
}

const VARIANT_CONFIG = {
  success: {
    icon: CheckCircle,
    bg: 'bg-success-50',
    border: 'border-success-200',
    iconClass: 'text-success-600',
    textClass: 'text-success-700',
  },
  error: {
    icon: AlertCircle,
    bg: 'bg-error-50',
    border: 'border-error-200',
    iconClass: 'text-error-600',
    textClass: 'text-error-700',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-warning-50',
    border: 'border-warning-200',
    iconClass: 'text-warning-600',
    textClass: 'text-warning-700',
  },
} as const;

export default function Toast({ message, variant, onDismiss }: ToastProps) {
  const [visible, setVisible] = useState(true);
  const cfg = VARIANT_CONFIG[variant];
  const Icon = cfg.icon;

  useEffect(() => {
    // Trigger fade-out 400ms before the parent auto-dismisses
    const timer = setTimeout(() => setVisible(false), 4600);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        'fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-md',
        'flex items-start gap-3 px-4 py-3 rounded-xl border shadow-lg',
        cfg.bg, cfg.border,
        'transition-opacity duration-150',
        visible ? 'opacity-100' : 'opacity-0',
        'animate-fade-in-down',
      ].join(' ')}
    >
      <Icon size={18} strokeWidth={1.5} className={`${cfg.iconClass} flex-shrink-0 mt-0.5`} aria-hidden="true" />
      <p className={`flex-1 text-sm font-medium leading-5 ${cfg.textClass}`}>
        {message}
      </p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="flex-shrink-0 flex items-center justify-center w-5 h-5 rounded text-gray-400 hover:text-gray-600 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
      >
        <X size={14} strokeWidth={1.5} aria-hidden="true" />
      </button>
    </div>
  );
}
