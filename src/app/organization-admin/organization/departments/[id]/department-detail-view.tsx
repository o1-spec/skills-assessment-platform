'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateDepartmentAction, toggleDepartmentActiveAction } from '@/actions/organization-structure';

type DeptTeam = {
  id: string;
  name: string;
  managerId: string | null;
  isActive?: boolean;
  manager?: { id: string; name: string; email: string } | null;
  memberships?: { user: { id: string; name: string; email: string; role: string; isActive: boolean } }[];
};

type Department = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  teams: DeptTeam[];
};

export default function DepartmentDetailView({ department }: { department: Department }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(department.name);
  const [description, setDescription] = useState(department.description || '');
  const [error, setError] = useState('');

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('description', description);
      const result = await updateDepartmentAction(department.id, formData);
      if (result.success) {
        setEditMode(false);
        router.refresh();
      } else {
        setError(result.error || 'Failed to update.');
      }
    });
  };

  const handleToggleActive = () => {
    if (!confirm(`${department.isActive ? 'Deactivate' : 'Reactivate'} this department?`)) return;
    startTransition(async () => {
      const result = await toggleDepartmentActiveAction(department.id);
      if (result.success) router.refresh();
      else setError(result.error || 'Failed to toggle status.');
    });
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <Link
          href="/organization-admin/organization"
          className="text-xs font-semibold text-stone-500 hover:text-neutral-900 transition-colors flex items-center gap-1.5"
        >
          &larr; Back to Organization
        </Link>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-2.5 h-2.5 rounded-full ${department.isActive ? 'bg-emerald-500' : 'bg-stone-300'}`}
            />
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-neutral-900 border-b border-neutral-900 focus:outline-none bg-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{department.name}</h1>
            )}
            {!department.isActive && (
              <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200/80">
                Inactive
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold border border-stone-200/80 text-neutral-700 px-3.5 py-1.5 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
              >
                Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="text-xs font-semibold bg-neutral-900 text-white px-3.5 py-1.5 rounded-xl hover:bg-neutral-800 disabled:opacity-60 shadow-2xs transition-colors cursor-pointer"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setError(''); }}
                  className="text-xs font-semibold border border-stone-200/80 text-neutral-700 px-3.5 py-1.5 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={handleToggleActive}
              disabled={isPending}
              className="text-xs font-semibold px-3.5 py-1.5 rounded-xl border border-stone-200/80 text-stone-500 hover:text-rose-600 transition-colors cursor-pointer shadow-2xs"
            >
              {department.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 bg-rose-50 border border-rose-200/80 text-rose-800 rounded-xl px-4 py-3 text-xs font-semibold">
              {error}
            </div>
          )}
          {editMode ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 resize-none transition-colors"
              placeholder="Optional description…"
            />
          ) : (
            <p className="text-xs text-stone-600 leading-relaxed">
              {department.description || <span className="italic text-stone-400">No description provided.</span>}
            </p>
          )}
        </div>

        <div className="px-6 pb-6 pt-2 border-t border-stone-100">
          <div className="flex items-center justify-between mb-3.5">
            <h2 className="text-xs font-bold text-neutral-700 uppercase tracking-wider">Teams</h2>
            <Link
              href={`/organization-admin/organization/teams/new?departmentId=${department.id}`}
              className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 hover:underline transition-colors"
            >
              + New team in this department
            </Link>
          </div>
          {department.teams.length === 0 ? (
            <p className="text-xs text-stone-400 italic">No teams in this department.</p>
          ) : (
            <div className="space-y-2">
              {department.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/organization-admin/organization/teams/${team.id}`}
                  className="flex items-center justify-between border border-stone-200/80 rounded-xl px-4 py-3 hover:border-stone-400 hover:bg-stone-50/50 transition-all group"
                >
                  <span className="text-xs font-semibold text-neutral-800 group-hover:text-neutral-900">
                    {team.name}
                  </span>
                  <svg
                    className="w-4 h-4 text-stone-400 group-hover:text-neutral-900 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
