import React from 'react';

interface AuthFormCardProps {
  title: string;
  subtitle?: string;
  badge?: string;
  children: React.ReactNode;
}

export function AuthFormCard({ title, subtitle, badge, children }: AuthFormCardProps) {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-[0_12px_32px_rgba(0,0,0,0.04)] p-6 sm:p-9 transition-all">
      <div className="mb-7 text-left">
        {badge && (
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-700 border border-stone-200 mb-3">
            <span>{badge}</span>
          </div>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 leading-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-2 text-xs sm:text-sm text-neutral-600 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {children}
    </div>
  );
}
