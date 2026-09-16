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
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Organization
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${department.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
            />
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-gray-900 border-b border-blue-500 focus:outline-none bg-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{department.name}</h1>
            )}
            {!department.isActive && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Inactive
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => { setEditMode(false); setError(''); }}
                  className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={handleToggleActive}
              disabled={isPending}
              className={`text-sm px-3 py-1.5 rounded-lg border ${
                department.isActive
                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                  : 'border-green-300 text-green-700 hover:bg-green-50'
              }`}
            >
              {department.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}
          {editMode ? (
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Optional description…"
            />
          ) : (
            <p className="text-sm text-gray-600">
              {department.description || <span className="italic text-gray-400">No description.</span>}
            </p>
          )}
        </div>

        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Teams</h2>
            <Link
              href={`/organization-admin/organization/teams/new?departmentId=${department.id}`}
              className="text-xs text-blue-600 hover:underline"
            >
              + New team in this department
            </Link>
          </div>
          {department.teams.length === 0 ? (
            <p className="text-sm text-gray-500 italic">No teams in this department.</p>
          ) : (
            <div className="space-y-2">
              {department.teams.map((team) => (
                <Link
                  key={team.id}
                  href={`/organization-admin/organization/teams/${team.id}`}
                  className="flex items-center justify-between border border-gray-100 rounded-xl px-4 py-3 hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                >
                  <span className="text-sm font-medium text-gray-800 group-hover:text-blue-700">
                    {team.name}
                  </span>
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500"
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
