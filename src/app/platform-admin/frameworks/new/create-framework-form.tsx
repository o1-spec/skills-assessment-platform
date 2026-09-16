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
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs text-rose-800">
          {error}
        </div>
      )}

      <div>
        <label htmlFor="version" className="block text-xs font-semibold text-stone-900 uppercase tracking-wider">
          Version Identifier <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-stone-500 mb-1.5 mt-0.5">
          A unique semantic version string (e.g., <code className="text-stone-800 font-mono bg-stone-100 px-1.5 py-0.5 rounded">1.0</code>, <code className="text-stone-800 font-mono bg-stone-100 px-1.5 py-0.5 rounded">2.0-beta</code>, <code className="text-stone-800 font-mono bg-stone-100 px-1.5 py-0.5 rounded">2026.1</code>).
        </p>
        <input
          id="version"
          name="version"
          type="text"
          required
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="e.g. 1.0"
          className="w-full rounded-xl border border-stone-200/80 bg-stone-50/40 px-3.5 py-2.5 text-sm shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-xs font-semibold text-stone-900 uppercase tracking-wider">
          Description (Optional)
        </label>
        <p className="text-xs text-stone-500 mb-1.5 mt-0.5">
          Brief context regarding the industry domain, scope, or revisions in this framework.
        </p>
        <textarea
          id="description"
          name="description"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Canonical IT, Software Delivery, and Cross-functional Behavioral Competencies..."
          className="w-full rounded-xl border border-stone-200/80 bg-stone-50/40 px-3.5 py-2.5 text-sm shadow-xs focus:border-neutral-900 focus:outline-none focus:ring-1 focus:ring-neutral-900 transition-colors"
        />
      </div>

      <div className="pt-4 border-t border-stone-200/80 flex items-center justify-end space-x-3">
        <Link
          href="/platform-admin/frameworks"
          className="px-4 py-2 border border-stone-200/80 rounded-xl shadow-xs text-xs font-medium text-stone-700 bg-white hover:bg-stone-50 transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 border border-transparent rounded-xl shadow-xs text-xs font-medium text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
        >
          {isSubmitting ? 'Creating Draft...' : 'Create Draft & Open Editor'}
        </button>
      </div>
    </form>
  );
}
