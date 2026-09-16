'use client';

import Link from 'next/link';
import { FullFrameworkVersion } from '@/services/frameworks';

interface FrameworkEditorHeaderProps {
  framework: FullFrameworkVersion;
  isDraft: boolean;
  isPublishing: boolean;
  globalError: string | null;
  onAddRootCategory: () => void;
  onPublish: () => void;
  onCreateDraftVersion: () => void;
}

export function FrameworkEditorHeader({
  framework,
  isDraft,
  isPublishing,
  globalError,
  onAddRootCategory,
  onPublish,
  onCreateDraftVersion,
}: FrameworkEditorHeaderProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-2">
          <Link href="/platform-admin/frameworks" className="hover:text-stone-900 transition-colors">
            &larr; Back to Frameworks
          </Link>
        </div>

        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
                  Competency Framework v{framework.version}
                </h1>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide ${
                    isDraft
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200/80'
                  }`}
                >
                  {framework.status}
                </span>
              </div>
              {framework.description && (
                <p className="text-xs text-stone-600 max-w-3xl leading-relaxed">
                  {framework.description}
                </p>
              )}
              <div className="flex items-center space-x-4 text-[11px] text-stone-400 pt-1">
                <span>Created {new Date(framework.createdAt).toLocaleDateString()}</span>
                {framework.publishedAt && (
                  <span>Published {new Date(framework.publishedAt).toLocaleDateString()}</span>
                )}
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {isDraft ? (
                <>
                  <button
                    type="button"
                    onClick={onAddRootCategory}
                    className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-xs text-xs font-medium rounded-xl text-stone-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    + Add Root Category
                  </button>
                  <button
                    type="button"
                    onClick={onPublish}
                    disabled={isPublishing}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-xs font-medium rounded-xl text-white bg-emerald-800 hover:bg-emerald-900 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish Framework'}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={onCreateDraftVersion}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
                >
                  Create New Draft Version
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {!isDraft && (
        <div className="bg-stone-100 border border-stone-200/80 rounded-2xl p-4 flex items-start space-x-3">
          <div className="text-stone-700 mt-0.5">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider">
              Published Framework &bull; Read-Only
            </h4>
            <p className="mt-0.5 text-xs text-stone-600 leading-relaxed">
              This framework is published and permanently immutable. Completed historical assessments and role profiles rely on these exact descriptors. To modify categories, skills, or levels, create a new draft version.
            </p>
          </div>
        </div>
      )}

      {globalError && (
        <div className="bg-rose-50 border border-rose-200/80 rounded-2xl p-4 text-xs text-rose-800">
          <strong>Error:</strong> {globalError}
        </div>
      )}
    </div>
  );
}
