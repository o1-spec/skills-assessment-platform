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
        <div className="text-xs text-red-600 bg-red-50 border border-red-200 px-2.5 py-1 rounded max-w-xs">
          {error}
        </div>
      )}

      {isPublished ? (
        <>
          <Link
            href={`/platform-admin/frameworks/${framework.id}`}
            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
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
            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            Create New Draft Version
          </button>
        </>
      ) : (
        <>
          <Link
            href={`/platform-admin/frameworks/${framework.id}`}
            className="inline-flex items-center justify-center px-3 py-1.5 border border-gray-300 shadow-sm text-xs font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Edit Framework
          </Link>
          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center justify-center px-3 py-1.5 border border-transparent shadow-sm text-xs font-medium rounded-md text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </>
      )}

      {showCloneModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Create New Draft Version from {framework.version}
              </h3>
              <button
                onClick={() => setShowCloneModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600">
              This will create a new mutable <strong className="text-gray-900">DRAFT</strong> containing an exact copy of all categories, competencies, and level descriptors from published Version {framework.version}.
            </p>

            <form onSubmit={handleCloneSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700">
                  New Version Identifier <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newVersionInput}
                  onChange={(e) => setNewVersionInput(e.target.value)}
                  placeholder="e.g. 1.1 or 2.0"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={newDescInput}
                  onChange={(e) => setNewDescInput(e.target.value)}
                  placeholder="Summary of version updates..."
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm text-xs focus:border-gray-900 focus:ring-gray-900 p-2 border"
                />
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 p-2 rounded">
                  {error}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCloneModal(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCloning}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50"
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
