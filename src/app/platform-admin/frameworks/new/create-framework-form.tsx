'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createFrameworkDraftAction } from '@/actions/frameworks';

export function CreateFrameworkForm() {
  const router = useRouter();
  const [version, setVersion] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!version.trim()) {
      setError('Version identifier is required');
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('version', version.trim());
      if (description.trim()) {
        formData.set('description', description.trim());
      }

      const res = await createFrameworkDraftAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to create framework draft');
      } else {
        router.push(`/platform-admin/frameworks/${res.frameworkId}`);
      }
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="version" className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
          Version Identifier <span className="text-red-500">*</span>
        </label>
        <p className="text-xs text-gray-500 mb-1">
          A unique semantic version string (e.g., <code className="text-gray-800 font-mono">1.0</code>, <code className="text-gray-800 font-mono">2.0-beta</code>, <code className="text-gray-800 font-mono">2026.1</code>).
        </p>
        <input
          id="version"
          name="version"
          type="text"
          required
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. 1.0"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-gray-900 uppercase tracking-wider">
          Description (Optional)
        </label>
        <p className="text-xs text-gray-500 mb-1">
          Brief context regarding the industry domain, scope, or revisions in this framework.
        </p>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Canonical IT, Software Delivery, and Cross-functional Behavioral Competencies..."
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-gray-900 focus:outline-none focus:ring-1 focus:ring-gray-900"
        />
      </div>

      <div className="pt-4 border-t border-gray-200 flex items-center justify-end space-x-3">
        <Link
          href="/platform-admin/frameworks"
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-md shadow-sm text-xs font-medium text-white bg-gray-900 hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Creating Draft...' : 'Create Draft & Open Editor'}
        </button>
      </div>
    </form>
  );
}
