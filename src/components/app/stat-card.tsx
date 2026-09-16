import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  badge?: {
    text: string;
    trend?: 'up' | 'down' | 'neutral';
  };
  icon?: React.ReactNode;
}

export function StatCard({ label, value, subtext, badge, icon }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-xs font-semibold text-neutral-500 uppercase tracking-wider truncate">
          {label}
        </span>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-stone-100/80 border border-stone-200/60 flex items-center justify-center text-neutral-600 shrink-0">
            {icon}
          </div>
        )}
      </div>

      <div className="flex items-baseline gap-2.5">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900">
          {value}
        </span>
        {badge && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              badge.trend === 'up'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : badge.trend === 'down'
                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                : 'bg-stone-100 text-stone-600 border border-stone-200'
            }`}
          >
            {badge.trend === 'up' && '↑'}
            {badge.trend === 'down' && '↓'}
            {badge.text}
          </span>
        )}
      </div>

      {subtext && (
        <p className="mt-2 text-xs text-neutral-500 truncate">
          {subtext}
        </p>
      )}
    </div>
  );
}
