'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import { createTeamAction } from '@/actions/organization-structure';

type Department = { id: string; name: string };
type Manager = { id: string; name: string; email: string };

const initialState = { success: false, error: '' };

export default function NewTeamForm({
  departments,
  managers,
  defaultDepartmentId,
}: {
  departments: Department[];
  managers: Manager[];
  defaultDepartmentId?: string;
}) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = await createTeamAction(formData);
      if (result.success) router.push('/organization-admin/organization');
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
        <h1 className="text-2xl font-bold text-gray-900 mt-4">New Team</h1>
      </div>

      <form action={formAction} className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5 shadow-sm">
        {state.error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="team-name" className="block text-sm font-medium text-gray-700 mb-1">
            Team Name <span className="text-red-500">*</span>
          </label>
          <input
            id="team-name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. Backend Engineering"
          />
        </div>

        <div>
          <label htmlFor="team-description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="team-description"
            name="description"
            rows={3}
            maxLength={500}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional description…"
          />
        </div>

        <div>
          <label htmlFor="team-department" className="block text-sm font-medium text-gray-700 mb-1">
            Department
          </label>
          <select
            id="team-department"
            name="departmentId"
            defaultValue={defaultDepartmentId || ''}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— No department —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="team-manager" className="block text-sm font-medium text-gray-700 mb-1">
            Team Manager
          </label>
          <select
            id="team-manager"
            name="managerId"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">— No manager assigned —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={isPending}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {isPending ? 'Creating…' : 'Create Team'}
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
