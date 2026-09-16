'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { TenantUserWithRelations } from '@/services/users';
import {
  updateTenantUserAction,
  deactivateTenantUserAction,
  reactivateTenantUserAction,
} from '@/actions/users';
import { setUserTeamMembershipsAction } from '@/actions/organization-structure';
import { ConfirmDialog } from '@/components/app';

interface ManagerOption {
  id: string;
  name: string;
  email: string;
}

interface RoleProfileOption {
  id: string;
  name: string;
  description: string | null;
}

interface TeamOption {
  id: string;
  name: string;
  isActive: boolean;
}

interface UserDetailViewProps {
  targetUser: TenantUserWithRelations;
  managers: ManagerOption[];
  roleProfiles: RoleProfileOption[];
  teams: TeamOption[];
  initialTeamIds: string[];
  currentUserId: string;
}

export function UserDetailView({
  targetUser,
  managers,
  roleProfiles,
  teams,
  initialTeamIds,
  currentUserId,
}: UserDetailViewProps) {
  const router = useRouter();

  const isSelf = targetUser.id === currentUserId;

  const [name, setName] = useState(targetUser.name);
  const [role, setRole] = useState<'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF'>(
    targetUser.role as 'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF'
  );
  const [roleProfileId, setRoleProfileId] = useState(targetUser.roleProfileId || '');
  const [managerId, setManagerId] = useState(targetUser.managerId || '');

  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>(initialTeamIds);
  const [isSavingTeams, setIsSavingTeams] = useState(false);
  const [teamError, setTeamError] = useState<string | null>(null);
  const [teamSuccess, setTeamSuccess] = useState<string | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleTeamToggle = (teamId: string) => {
    setSelectedTeamIds((prev) =>
      prev.includes(teamId) ? prev.filter((id) => id !== teamId) : [...prev, teamId]
    );
  };

  const handleSaveTeams = async () => {
    setTeamError(null);
    setTeamSuccess(null);
    setIsSavingTeams(true);
    try {
      const res = await setUserTeamMembershipsAction(targetUser.id, selectedTeamIds);
      if (!res.success) {
        setTeamError(res.error || 'Failed to update team memberships.');
      } else {
        setTeamSuccess('Team memberships updated successfully.');
        router.refresh();
      }
    } catch {
      setTeamError('An unexpected error occurred while updating team memberships.');
    } finally {
      setIsSavingTeams(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!name.trim()) {
      setError('Name is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await updateTenantUserAction(targetUser.id, {
        name: name.trim(),
        role: isSelf ? undefined : role,
        roleProfileId: roleProfileId || null,
        managerId: role !== UserRole.ORGANIZATION_ADMIN && managerId ? managerId : null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to update user.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('User details updated successfully.');
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);

  const handleDeactivate = () => {
    if (isSelf) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }
    setError(null);
    setIsDeactivateOpen(true);
  };

  const confirmDeactivate = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await deactivateTenantUserAction(targetUser.id);
      if (!res.success) {
        setError(res.error || 'Failed to deactivate user.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`User ${targetUser.name} has been deactivated.`);
      setIsDeactivateOpen(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReactivate = async () => {
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);
    try {
      const res = await reactivateTenantUserAction(targetUser.id);
      if (!res.success) {
        setError(res.error || 'Failed to reactivate user.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`User ${targetUser.name} has been reactivated.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      <div className="flex items-center space-x-4">
        <Link
          href="/organization-admin/users"
          className="text-gray-500 hover:text-gray-700 text-sm font-medium flex items-center space-x-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to User Directory</span>
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-gray-900">{targetUser.name}</h1>
              {isSelf && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-800">
                  You
                </span>
              )}
              {targetUser.isActive ? (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">{targetUser.email}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 pt-2">
              <span>Member since {new Date(targetUser.createdAt).toLocaleDateString()}</span>
              {targetUser.deactivatedAt && (
                <span>&bull; Deactivated on {new Date(targetUser.deactivatedAt).toLocaleDateString()}</span>
              )}
              {targetUser.role === UserRole.MANAGER && (
                <span>&bull; {targetUser._count.directReports} active direct report(s)</span>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {!isSelf && (
              targetUser.isActive ? (
                <button
                  type="button"
                  onClick={handleDeactivate}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-xs font-semibold transition-colors disabled:opacity-50"
                >
                  Reactivate User
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-xs p-6 space-y-5">
        <h2 className="text-base font-bold text-gray-900 border-b border-gray-100 pb-3">
          Edit Member Profile & Assignments
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={targetUser.email}
              className="w-full px-3 py-2 text-sm border border-gray-200 bg-gray-50 text-gray-500 rounded-md cursor-not-allowed"
            />
            <p className="text-[11px] text-gray-400 mt-1">
              Email addresses are primary login identifiers and cannot be altered.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Application Role <span className="text-red-500">*</span>
            </label>
            {isSelf ? (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-md text-xs text-purple-900 font-semibold">
                Organization Admin (Your own administrative role cannot be modified here)
              </div>
            ) : (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={UserRole.STAFF}>Staff (Self-assessment participant)</option>
                <option value={UserRole.MANAGER}>Manager (Corroborator & team reviewer)</option>
                <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin (Tenant administrator)</option>
              </select>
            )}
            {targetUser.role === UserRole.MANAGER && targetUser._count.directReports > 0 && role !== UserRole.MANAGER && (
              <p className="text-xs text-amber-700 font-medium mt-1">
                ⚠️ Warning: This manager currently has {targetUser._count.directReports} active direct reports. Reassign them before demoting or deactivating.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
              Current Role Profile <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            {roleProfiles.length === 0 ? (
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
                No published role profiles found in this organization.
              </div>
            ) : (
              <select
                value={roleProfileId}
                onChange={(e) => setRoleProfileId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">-- No Role Profile Assigned --</option>
                {roleProfiles.map((rp) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-gray-500 mt-1">
              The benchmark job profile this employee is currently assigned to.
            </p>
          </div>

          {role !== UserRole.ORGANIZATION_ADMIN && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Reporting Manager <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              {managers.length === 0 ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
                  No other active managers available in this organization.
                </div>
              ) : (
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="">-- No Reporting Manager Assigned --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-gray-500 mt-1">
                Manager responsible for corroborating this employee&apos;s competency assessments.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
          <Link
            href="/organization-admin/users"
            className="px-4 py-2 border border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg text-xs font-semibold transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2 border border-transparent text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-xl shadow-xs border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Team Memberships</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Assign this employee to one or more functional teams.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveTeams}
            disabled={isSavingTeams}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs disabled:opacity-50 transition-colors"
          >
            {isSavingTeams ? 'Saving…' : 'Save Teams'}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {teamError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {teamError}
            </div>
          )}
          {teamSuccess && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-xs text-green-700">
              {teamSuccess}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-gray-500 italic">
              No teams created in this organization yet.{' '}
              <Link
                href="/organization-admin/organization/teams/new"
                className="text-blue-600 hover:underline"
              >
                Create a team
              </Link>
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teams.map((t) => {
                const checked = selectedTeamIds.includes(t.id);
                return (
                  <label
                    key={t.id}
                    className={`flex items-start p-3 rounded-lg border text-sm cursor-pointer transition-colors ${
                      checked
                        ? 'border-blue-500 bg-blue-50/40 text-gray-900'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTeamToggle(t.id)}
                      className="mt-0.5 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="ml-3">
                      <span className="font-medium text-gray-900">{t.name}</span>
                      {!t.isActive && (
                        <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                          Inactive
                        </span>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={confirmDeactivate}
        title="Deactivate Workspace User"
        description={`Are you sure you want to deactivate ${targetUser.name}? Deactivated users retain all historical assessment and corroboration records but lose workspace access.`}
        confirmLabel="Deactivate User"
        cancelLabel="Cancel"
        variant="danger"
        isPending={isSubmitting}
      />
    </div>
  );
}
