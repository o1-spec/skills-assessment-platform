'use client';

import Link from 'next/link';
import { FullIndustryTemplate } from '@/services/industry-templates';

interface TemplateDetailHeaderProps {
  template: FullIndustryTemplate;
  isSubmitting: boolean;
  onEditDetails: () => void;
  onToggleActive: () => void;
  onDeleteTemplate: () => void;
}

export function TemplateDetailHeader({
  template,
  isSubmitting,
  onEditDetails,
  onToggleActive,
  onDeleteTemplate,
}: TemplateDetailHeaderProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-4">
        <Link
          href="/platform-admin/templates"
          className="text-neutral-700 hover:text-neutral-900 text-xs font-semibold flex items-center space-x-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to Industry Templates</span>
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{template.name}</h1>
              {template.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-600 border border-stone-200/80">
                  Inactive
                </span>
              )}
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                Bound to Framework Version {template.frameworkVersion.version}
              </span>
            </div>

            {template.description && (
              <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">{template.description}</p>
            )}

            <div className="flex items-center space-x-4 text-xs text-stone-500 pt-1">
              <span>
                <strong className="text-neutral-900">{template.competencies.length}</strong> canonical competencies
              </span>
              <span>&bull;</span>
              <span>
                <strong className="text-neutral-900">{template.roleProfiles.length}</strong> predefined role profiles
              </span>
              <span>&bull;</span>
              <span>Created {new Date(template.createdAt).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onEditDetails}
              className="px-3.5 py-2 border border-stone-200/80 text-neutral-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Edit Details
            </button>
            <button
              type="button"
              onClick={onToggleActive}
              disabled={isSubmitting}
              className={`px-3.5 py-2 border rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer ${
                template.isActive
                  ? 'border-amber-200/80 text-amber-800 bg-amber-50 hover:bg-amber-100'
                  : 'border-emerald-200/80 text-emerald-800 bg-emerald-50 hover:bg-emerald-100'
              }`}
            >
              {template.isActive ? 'Deactivate Template' : 'Activate Template'}
            </button>
            <button
              type="button"
              onClick={onDeleteTemplate}
              disabled={isSubmitting}
              className="px-3.5 py-2 border border-rose-200/80 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
