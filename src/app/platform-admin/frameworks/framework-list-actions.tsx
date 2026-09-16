'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FrameworkVersionWithStats } from '@/services/frameworks';
import { publishFrameworkAction, createDraftFromPublishedAction } from '@/actions/frameworks';

export function FrameworkListActions({
  framework,
}: {
  framework: FrameworkVersionWithStats;
}) {
  const router = useRouter();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isCloning, setIsCloning] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);
  const [newVersionInput, setNewVersionInput] = useState('');
  const [newDescInput, setNewDescInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isPublished = framework.status === 'PUBLISHED';

  async function handlePublish() {
    if (!confirm(`Are you sure you want to publish Framework Version ${framework.version}? Once published, it becomes permanently immutable.`)) {
      return;
    }

    setError(null);
    setIsPublishing(true);
    try {
      const res = await publishFrameworkAction(framework.id);
      if (!res.success) {
        setError(res.error || 'Failed to publish framework');
      } else {
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsPublishing(false);
    }
  }

  async function handleCloneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newVersionInput.trim()) return;

    setError(null);
    setIsCloning(true);
    try {
      const formData = new FormData();
      formData.set('sourceVersionId', framework.id);
      formData.set('newVersion', newVersionInput.trim());
      if (newDescInput.trim()) {
        formData.set('description', newDescInput.trim());
      }

      const res = await createDraftFromPublishedAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to create new draft version');
      } else {
        setShowCloneModal(false);
        router.push(`/platform-admin/frameworks/${res.frameworkId}`);
      }
    } catch {
      setError('An unexpected error occurred while creating draft version.');
    } finally {
      setIsCloning(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {error && (
        <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200/80 px-3 py-1.5 rounded-xl max-w-xs font-semibold">
          {error}
        </div>
      )}

      {isPublished ? (
        <>
          <Link
            href={`/platform-admin/frameworks/${framework.id}`}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors"
          >
            View Framework
          </Link>
          <button
            onClick={() => {
              const parts = framework.version.split('.');
              const major = parseInt(parts[0] || '1', 10);
              const minor = parseInt(parts[1] || '0', 10);
              const suggested = parts.length > 1 ? `${major}.${minor + 1}` : `${major + 1}.0`;
              setNewVersionInput(suggested);
              setNewDescInput(`Draft created from published Version ${framework.version}`);
              setShowCloneModal(true);
            }}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Create New Draft Version
          </button>
        </>
      ) : (
        <>
          <Link
            href={`/platform-admin/frameworks/${framework.id}`}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors"
          >
            Edit Framework
          </Link>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center justify-center px-3.5 py-1.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </>
      )}

      {showCloneModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-4 border border-stone-200/80">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="text-base font-bold text-neutral-900">
                Create New Draft Version from {framework.version}
              </h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="text-stone-400 hover:text-neutral-700 text-lg cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              This will create a new mutable <strong className="text-neutral-900">DRAFT</strong> containing an exact copy of all categories, competencies, and level descriptors from published Version {framework.version}.
            </p>

            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
                  New Version Identifier <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  placeholder="e.g. 1.1 or 2.0"
                  className="mt-1.5 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescInput}
                  onChange={(e) => setNewDescInput(e.target.value)}
                  placeholder="Summary of version updates..."
                  className="mt-1.5 block w-full rounded-xl border-stone-200/80 shadow-2xs text-xs focus:border-neutral-900 focus:ring-neutral-900 p-2.5 border"
                />
              </div>

              {error && (
                <div className="text-xs text-rose-700 bg-rose-50 border border-rose-200/80 p-3 rounded-xl font-semibold">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-neutral-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
                >
                  {isCloning ? 'Creating Draft...' : 'Create Draft Version'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
