'use client';

import { useRouter } from 'next/navigation';
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
      <div className="mb-8">
        <a
          href="/organization-admin/organization"
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Back to Organization
        </a>
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New Department</h1>
      </div>

      <form action={formAction} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="dept-name" className="block text-sm font-medium text-gray-700 mb-1">
            Department Name <span className="text-red-500">*</span>
          </label>
          <input
            id="dept-name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Engineering"
          />
        </div>

        <div>
          <label htmlFor="dept-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="dept-description"
            name="description"
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional description..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Creating…' : 'Create Department'}
          </button>
          <a
            href="/organization-admin/organization"
            className="flex-1 text-center border border-gray-300 text-gray-700 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
