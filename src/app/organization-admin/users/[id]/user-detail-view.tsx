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

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <h1 className="text-2xl font-bold text-neutral-900">{targetUser.name}</h1>
              {isSelf && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200">
                  You
                </span>
              )}
              {targetUser.isActive ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Active
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                  Deactivated
                </span>
              )}
            </div>
            <p className="text-sm text-stone-500">{targetUser.email}</p>

            <div className="flex flex-wrap items-center gap-3 text-xs text-stone-400 pt-2 font-medium">
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
                  className="px-4 py-2 border border-rose-200/80 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Deactivate User
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleReactivate}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-emerald-200/80 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Reactivate User
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
        <h2 className="text-base font-bold text-neutral-900 border-b border-stone-100 pb-3">
          Edit Member Profile & Assignments
        </h2>

        <div className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={targetUser.email}
              className="w-full px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-sm text-stone-500 cursor-not-allowed"
            />
            <p className="text-xs text-stone-400 mt-1.5">
              Email addresses are primary login identifiers and cannot be altered.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Application Role <span className="text-rose-500">*</span>
            </label>
            {isSelf ? (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-neutral-800 font-semibold">
                Organization Admin (Your own administrative role cannot be modified here)
              </div>
            ) : (
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF')}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              >
                <option value={UserRole.STAFF}>Staff (Self-assessment participant)</option>
                <option value={UserRole.MANAGER}>Manager (Corroborator & team reviewer)</option>
                <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin (Tenant administrator)</option>
              </select>
            )}
            {targetUser.role === UserRole.MANAGER && targetUser._count.directReports > 0 && role !== UserRole.MANAGER && (
              <p className="text-xs text-amber-800 font-medium mt-1.5">
                Warning: This manager currently has {targetUser._count.directReports} active direct reports. Reassign them before demoting or deactivating.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
              Current Role Profile <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            {roleProfiles.length === 0 ? (
              <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500">
                No published role profiles found in this organization.
              </div>
            ) : (
              <select
                value={roleProfileId}
                onChange={(e) => setRoleProfileId(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              >
                <option value="">-- No Role Profile Assigned --</option>
                {roleProfiles.map((rp) => (
                  <option key={rp.id} value={rp.id}>
                    {rp.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-stone-500 mt-1.5">
              The benchmark job profile this employee is currently assigned to.
            </p>
          </div>

          {role !== UserRole.ORGANIZATION_ADMIN && (
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                Reporting Manager <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              {managers.length === 0 ? (
                <div className="p-3.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-500">
                  No other active managers available in this organization.
                </div>
              ) : (
                <select
                  value={managerId}
                  onChange={(e) => setManagerId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-300 rounded-xl text-sm text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                >
                  <option value="">-- No Reporting Manager Assigned --</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.email})
                    </option>
                  ))}
                </select>
              )}
              <p className="text-xs text-stone-500 mt-1.5">
                Manager responsible for corroborating this employee&apos;s competency assessments.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-5 border-t border-stone-100">
          <Link
            href="/organization-admin/users"
            className="px-4 py-2.5 border border-stone-200/80 text-stone-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-5 py-2.5 border border-transparent text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>

      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900">Team Memberships</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Assign this employee to one or more functional teams.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveTeams}
            disabled={isSavingTeams}
            className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isSavingTeams ? 'Saving…' : 'Save Teams'}
          </button>
        </div>

        <div className="p-6 space-y-4">
          {teamError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200/80 rounded-xl text-xs font-semibold text-rose-800">
              {teamError}
            </div>
          )}
          {teamSuccess && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200/80 rounded-xl text-xs font-semibold text-emerald-800">
              {teamSuccess}
            </div>
          )}

          {teams.length === 0 ? (
            <p className="text-sm text-stone-500 italic">
              No teams created in this organization yet.{' '}
              <Link
                href="/organization-admin/organization/teams/new"
                className="text-neutral-900 font-semibold hover:underline"
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
                    className={`flex items-start p-3.5 rounded-xl border text-sm cursor-pointer transition-colors ${
                      checked
                        ? 'border-neutral-900 bg-stone-50 text-neutral-900'
                        : 'border-stone-200/80 bg-white text-stone-700 hover:bg-stone-50/60'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => handleTeamToggle(t.id)}
                      className="mt-0.5 h-4 w-4 rounded border-stone-300 text-neutral-900 focus:ring-neutral-900"
                    />
                    <div className="ml-3">
                      <span className="font-semibold text-neutral-900">{t.name}</span>
                      {!t.isActive && (
                        <span className="ml-2 text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-md">
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
