'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  updateTeamAction,
  toggleTeamActiveAction,
  addTeamMemberAction,
  removeTeamMemberAction,
} from '@/actions/organization-structure';

type DepartmentOption = { id: string; name: string; isActive: boolean };
type ManagerOption = { id: string; name: string; email: string };
type UserOption = { id: string; name: string; email: string; role: string };

type Member = {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
};

type Team = {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  department: { id: string; name: string } | null;
  manager: { id: string; name: string; email: string } | null;
  memberships: Member[];
};

export default function TeamDetailView({
  team,
  departments,
  managers,
  allUsers,
}: {
  team: Team;
  departments: DepartmentOption[];
  managers: ManagerOption[];
  allUsers: UserOption[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editMode, setEditMode] = useState(false);
  const [name, setName] = useState(team.name);
  const [description, setDescription] = useState(team.description || '');
  const [departmentId, setDepartmentId] = useState(team.department?.id || '');
  const [managerId, setManagerId] = useState(team.manager?.id || '');
  const [selectedNewUserId, setSelectedNewUserId] = useState('');
  const [error, setError] = useState('');
  const [memberError, setMemberError] = useState('');

  const handleSave = () => {
    startTransition(async () => {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('description', description);
      formData.set('departmentId', departmentId);
      formData.set('managerId', managerId);
      const result = await updateTeamAction(team.id, formData);
      if (result.success) {
        setEditMode(false);
        setError('');
        router.refresh();
      } else {
        setError(result.error || 'Failed to update team.');
      }
    });
  };

  const handleToggleActive = () => {
    if (!confirm(`${team.isActive ? 'Deactivate' : 'Reactivate'} this team?`)) return;
    startTransition(async () => {
      const result = await toggleTeamActiveAction(team.id);
      if (result.success) router.refresh();
      else setError(result.error || 'Failed to toggle status.');
    });
  };

  const handleAddMember = () => {
    if (!selectedNewUserId) return;
    setMemberError('');
    startTransition(async () => {
      const result = await addTeamMemberAction(team.id, selectedNewUserId);
      if (result.success) {
        setSelectedNewUserId('');
        router.refresh();
      } else {
        setMemberError(result.error || 'Failed to add member.');
      }
    });
  };

  const handleRemoveMember = (userId: string, memberName: string) => {
    if (!confirm(`Remove ${memberName} from this team?`)) return;
    setMemberError('');
    startTransition(async () => {
      const result = await removeTeamMemberAction(team.id, userId);
      if (result.success) {
        router.refresh();
      } else {
        setMemberError(result.error || 'Failed to remove member.');
      }
    });
  };

  const existingMemberIds = new Set(team.memberships.map((m) => m.user.id));
  const availableUsers = allUsers.filter((u) => !existingMemberIds.has(u.id));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10">
      <div className="mb-6">
        <Link
          href="/organization-admin/organization"
          className="text-xs font-semibold text-neutral-500 hover:text-neutral-900 transition-colors inline-flex items-center gap-1.5"
        >
          ← Back to Organization
        </Link>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-stone-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-2.5 h-2.5 rounded-full ${team.isActive ? 'bg-emerald-500' : 'bg-stone-300'}`} />
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-neutral-900 border-b border-neutral-900 focus:outline-none bg-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-neutral-900 tracking-tight">{team.name}</h1>
            )}
            {!team.isActive && (
              <span className="text-[11px] font-semibold bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full border border-stone-200/60">Inactive</span>
            )}
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-xs font-semibold border border-stone-200/80 text-neutral-700 px-3.5 py-2 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
              >
                Edit Team
              </button>
            )}
            {editMode && (
              <>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="text-xs font-semibold bg-neutral-900 text-white px-3.5 py-2 rounded-xl hover:bg-neutral-800 disabled:opacity-50 shadow-2xs transition-colors cursor-pointer"
                >
                  {isPending ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => {
                    setEditMode(false);
                    setError('');
                    setName(team.name);
                    setDescription(team.description || '');
                    setDepartmentId(team.department?.id || '');
                    setManagerId(team.manager?.id || '');
                  }}
                  className="text-xs font-semibold border border-stone-200/80 text-neutral-700 px-3.5 py-2 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </>
            )}
            <button
              onClick={handleToggleActive}
              disabled={isPending}
              className={`text-xs font-semibold px-3.5 py-2 rounded-xl border shadow-2xs transition-colors cursor-pointer ${
                team.isActive
                  ? 'border-red-200/80 text-red-700 bg-white hover:bg-red-50'
                  : 'border-emerald-200/80 text-emerald-700 bg-white hover:bg-emerald-50'
              }`}
            >
              {team.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200/80 text-red-700 rounded-xl px-4 py-3 text-xs font-medium">
              {error}
            </div>
          )}

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors resize-none"
                  placeholder="Optional description…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                  >
                    <option value="">No Department</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>
                        {dept.name} {!dept.isActive ? '(Inactive)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Team Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                  >
                    <option value="">No Assigned Manager</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.name} ({mgr.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-neutral-600 leading-relaxed">
                {team.description || <span className="italic text-neutral-400">No description.</span>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-stone-100">
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Department:</span>
                  <div className="text-sm font-semibold text-neutral-900 mt-1">
                    {team.department ? (
                      <Link
                        href={`/organization-admin/organization/departments/${team.department.id}`}
                        className="hover:underline"
                      >
                        {team.department.name}
                      </Link>
                    ) : (
                      <span className="text-neutral-400 font-normal italic">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Team Manager:</span>
                  <div className="text-sm font-semibold text-neutral-900 mt-1">
                    {team.manager ? (
                      <Link
                        href={`/organization-admin/users/${team.manager.id}`}
                        className="hover:underline"
                      >
                        {team.manager.name} <span className="text-neutral-500 font-normal">({team.manager.email})</span>
                      </Link>
                    ) : (
                      <span className="text-neutral-400 font-normal italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-5 border-b border-stone-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-neutral-900 tracking-tight">
              Team Members ({team.memberships.length})
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Employees assigned to this team
            </p>
          </div>

          {team.isActive && availableUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedNewUserId}
                onChange={(e) => setSelectedNewUserId(e.target.value)}
                className="border border-stone-300 rounded-xl px-3 py-2 text-xs bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              >
                <option value="">Select an employee…</option>
                {availableUsers.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
              <button
                onClick={handleAddMember}
                disabled={!selectedNewUserId || isPending}
                className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold px-3.5 py-2 rounded-xl shadow-2xs transition-colors disabled:opacity-50 whitespace-nowrap cursor-pointer"
              >
                Add Member
              </button>
            </div>
          )}
        </div>

        {memberError && (
          <div className="m-6 mb-0 bg-red-50 border border-red-200/80 text-red-700 rounded-xl px-4 py-3 text-xs font-medium">
            {memberError}
          </div>
        )}

        <div className="p-6">
          {team.memberships.length === 0 ? (
            <p className="text-xs text-neutral-500 italic py-4 text-center">
              No members currently assigned to this team.
            </p>
          ) : (
            <div className="divide-y divide-stone-100">
              {team.memberships.map(({ user }) => (
                <div key={user.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-neutral-900 text-white font-bold flex items-center justify-center text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/organization-admin/users/${user.id}`}
                        className="text-sm font-semibold text-neutral-900 hover:underline"
                      >
                        {user.name}
                      </Link>
                      <div className="text-xs text-neutral-500">
                        {user.email} · <span className="font-semibold text-neutral-700">{user.role}</span>
                        {!user.isActive && (
                          <span className="ml-1.5 text-red-600 font-semibold">(Inactive)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemoveMember(user.id, user.name)}
                      disabled={isPending}
                      className="text-xs font-semibold text-red-600 hover:text-red-700 border border-red-200/80 hover:bg-red-50 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
