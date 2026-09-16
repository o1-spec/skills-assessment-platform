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
          className="text-sm text-blue-600 hover:underline flex items-center gap-1"
        >
          ← Organization
        </Link>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`w-3 h-3 rounded-full ${team.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
            {editMode ? (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold text-gray-900 border-b border-blue-500 focus:outline-none bg-transparent"
              />
            ) : (
              <h1 className="text-xl font-bold text-gray-900">{team.name}</h1>
            )}
            {!team.isActive && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Inactive</span>
            )}
          </div>
          <div className="flex gap-2">
            {!editMode && (
              <button
                onClick={() => setEditMode(true)}
                className="text-sm border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-50"
              >
                Edit Team
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
                  onClick={() => {
                    setEditMode(false);
                    setError('');
                    setName(team.name);
                    setDescription(team.description || '');
                    setDepartmentId(team.department?.id || '');
                    setManagerId(team.manager?.id || '');
                  }}
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
                team.isActive
                  ? 'border-red-300 text-red-600 hover:bg-red-50'
                  : 'border-green-300 text-green-700 hover:bg-green-50'
              }`}
            >
              {team.isActive ? 'Deactivate' : 'Reactivate'}
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          {editMode ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder="Optional description…"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Department
                  </label>
                  <select
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1">
                    Team Manager
                  </label>
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                {team.description || <span className="italic text-gray-400">No description.</span>}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Department:</span>
                  <div className="text-sm font-medium text-gray-800 mt-0.5">
                    {team.department ? (
                      <Link
                        href={`/organization-admin/organization/departments/${team.department.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {team.department.name}
                      </Link>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Team Manager:</span>
                  <div className="text-sm font-medium text-gray-800 mt-0.5">
                    {team.manager ? (
                      <Link
                        href={`/organization-admin/users/${team.manager.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {team.manager.name} ({team.manager.email})
                      </Link>
                    ) : (
                      <span className="text-gray-400 italic">None</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              Team Members ({team.memberships.length})
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Employees assigned to this team
            </p>
          </div>

          {team.isActive && availableUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <select
                value={selectedNewUserId}
                onChange={(e) => setSelectedNewUserId(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="bg-blue-600 text-white text-sm px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-60 whitespace-nowrap"
              >
                Add Member
              </button>
            </div>
          )}
        </div>

        {memberError && (
          <div className="m-6 mb-0 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {memberError}
          </div>
        )}

        <div className="p-6">
          {team.memberships.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4 text-center">
              No members currently assigned to this team.
            </p>
          ) : (
            <div className="divide-y divide-gray-100">
              {team.memberships.map(({ user }) => (
                <div key={user.id} className="py-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-semibold flex items-center justify-center text-xs">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <Link
                        href={`/organization-admin/users/${user.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-blue-600"
                      >
                        {user.name}
                      </Link>
                      <div className="text-xs text-gray-500">
                        {user.email} · <span className="font-medium">{user.role}</span>
                        {!user.isActive && (
                          <span className="ml-1.5 text-red-600 font-medium">(Inactive)</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div>
                    <button
                      onClick={() => handleRemoveMember(user.id, user.name)}
                      disabled={isPending}
                      className="text-xs text-red-600 hover:text-red-800 border border-red-200 hover:bg-red-50 px-2.5 py-1 rounded-md"
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
