'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useActionState } from 'react';
import { createDepartmentAction } from '@/actions/organization-structure';

const initialState = { success: false, error: '' };

export default function NewDepartmentPage() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createDepartmentAction(formData);
      if (result.success) {
        router.push('/organization-admin/organization');
      }
      return result as typeof initialState;
    },
    initialState
  );

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <Link
          href="/organization-admin/organization"
          className="text-xs font-semibold text-stone-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
        >
          &larr; Back to Organization
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-3">New Department</h1>
        <p className="text-xs text-stone-500 mt-1">Group operational teams into a functional department.</p>
      </div>

      <form action={formAction} className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        {state.error && (
          <div className="bg-rose-50 border border-rose-200/80 text-rose-800 rounded-xl px-4 py-3 text-xs font-semibold">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="dept-name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Department Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="dept-name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            placeholder="e.g. Engineering"
          />
        </div>

        <div>
          <label htmlFor="dept-description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-stone-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="dept-description"
            name="description"
            rows={3}
            maxLength={500}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors resize-none"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex gap-3 pt-3 border-t border-stone-100">
          <Link
            href="/organization-admin/organization"
            className="flex-1 text-center border border-stone-200/80 text-neutral-700 text-xs font-semibold py-2.5 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-neutral-900 text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-neutral-800 disabled:opacity-60 shadow-2xs transition-colors cursor-pointer"
          >
            {isPending ? 'Creating…' : 'Create Department'}
          </button>
        </div>
      </form>
    </div>
  );
}
