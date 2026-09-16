import React from 'react';

interface SectionCardProps {
  title?: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function SectionCard({
  title,
  subtitle,
  action,
  children,
  className = '',
  noPadding = false,
}: SectionCardProps) {
  return (
    <div
      className={`bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden ${className}`}
    >
      {(title || action) && (
        <div className="px-5 sm:px-6 py-4 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/30">
          <div>
            {title && (
              <h2 className="text-sm sm:text-base font-bold text-neutral-900 leading-snug">
                {title}
              </h2>
            )}
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-0.5 leading-normal">
                {subtitle}
              </p>
            )}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={noPadding ? '' : 'p-5 sm:p-6'}>{children}</div>
    </div>
  );
}
