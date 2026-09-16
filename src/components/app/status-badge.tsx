import React from 'react';

export type StatusVariant =
  | 'ACTIVE'
  | 'COMPLETED'
  | 'PUBLISHED'
  | 'EXCEEDS_TARGET'
  | 'VERIFIED'
  | 'PENDING'
  | 'DRAFT'
  | 'PENDING_CORROBORATION'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'BELOW_TARGET'
  | 'MEETS_TARGET'
  | 'NOT_STARTED'
  | 'ARCHIVED'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'FAILED'
  | 'CANCELLED'
  | 'SCHEDULED'
  | 'INFO';

interface StatusBadgeProps {
  status: string | StatusVariant;
  label?: string;
  size?: 'sm' | 'md';
}

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  // Green / Positive
  ACTIVE: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  COMPLETED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  PUBLISHED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  EXCEEDS_TARGET: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  VERIFIED: { bg: 'bg-emerald-50', text: 'text-emerald-800', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  MEETS_TARGET: { bg: 'bg-teal-50', text: 'text-teal-800', border: 'border-teal-200', dot: 'bg-teal-500' },

  // Amber / Warning / In-Progress
  PENDING: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  DRAFT: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  PENDING_CORROBORATION: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  IN_PROGRESS: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  SUBMITTED: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },
  BELOW_TARGET: { bg: 'bg-amber-50', text: 'text-amber-800', border: 'border-amber-200', dot: 'bg-amber-500' },

  // Gray / Neutral
  NOT_STARTED: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-400' },
  ARCHIVED: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-400' },
  INACTIVE: { bg: 'bg-stone-100', text: 'text-stone-700', border: 'border-stone-200', dot: 'bg-stone-400' },

  // Red / Error
  SUSPENDED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
  FAILED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },
  CANCELLED: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200', dot: 'bg-red-500' },

  // Blue / Info / Scheduled
  SCHEDULED: { bg: 'bg-sky-50', text: 'text-sky-800', border: 'border-sky-200', dot: 'bg-sky-500' },
  INFO: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200', dot: 'bg-blue-500' },
};

function formatStatus(status: string): string {
  return status
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const normalizedKey = status?.toUpperCase().replace(/\s+/g, '_') || 'INFO';
  const style = STATUS_STYLES[normalizedKey] || STATUS_STYLES.INFO;
  const displayLabel = label || formatStatus(status);

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium border ${style.bg} ${style.text} ${style.border} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
      <span>{displayLabel}</span>
    </span>
  );
}
