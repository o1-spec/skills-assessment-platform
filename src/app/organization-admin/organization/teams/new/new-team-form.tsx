'use client';

import { useActionState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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
      <div className="mb-6">
        <Link
          href="/organization-admin/organization"
          className="text-xs font-semibold text-stone-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
        >
          &larr; Back to Organization
        </Link>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight mt-3">New Team</h1>
        <p className="text-xs text-stone-500 mt-1">Create a functional team, link a department, and assign a team manager.</p>
      </div>

      <form action={formAction} className="bg-white border border-stone-200/80 rounded-2xl p-6 sm:p-8 space-y-5 shadow-xs">
        {state.error && (
          <div className="bg-rose-50 border border-rose-200/80 text-rose-800 rounded-xl px-4 py-3 text-xs font-semibold">
            {state.error}
          </div>
        )}

        <div>
          <label htmlFor="team-name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Team Name <span className="text-rose-500">*</span>
          </label>
          <input
            id="team-name"
            name="name"
            type="text"
            required
            maxLength={100}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            placeholder="e.g. Backend Engineering"
          />
        </div>

        <div>
          <label htmlFor="team-description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-stone-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="team-description"
            name="description"
            rows={3}
            maxLength={500}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors resize-none"
            placeholder="Optional description…"
          />
        </div>

        <div>
          <label htmlFor="team-department" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Department
          </label>
          <select
            id="team-department"
            name="departmentId"
            defaultValue={defaultDepartmentId || ''}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
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
          <label htmlFor="team-manager" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Team Manager
          </label>
          <select
            id="team-manager"
            name="managerId"
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          >
            <option value="">— No manager assigned —</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.email})
              </option>
            ))}
          </select>
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
            {isPending ? 'Creating…' : 'Create Team'}
          </button>
        </div>
      </form>
    </div>
  );
}
