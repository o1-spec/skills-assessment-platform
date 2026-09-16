'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UserRole } from '@prisma/client';
import { TenantUserWithRelations, PendingInvitationWithRelations } from '@/services/users';
import {
  deactivateTenantUserAction,
  reactivateTenantUserAction,
  cancelTenantInvitationAction,
} from '@/actions/users';
import { ConfirmDialog } from '@/components/app';

interface UsersDirectoryViewProps {
  initialUsers: TenantUserWithRelations[];
  initialPendingInvitations: PendingInvitationWithRelations[];
  seatUsage: {
    activeUsers: number;
    seatLimit: number | null;
    availableSeats: number | null;
  };
  currentUserId: string;
}

export function UsersDirectoryView({
  initialUsers,
  initialPendingInvitations,
  seatUsage,
  currentUserId,
}: UsersDirectoryViewProps) {
  const router = useRouter();

  const [users, setUsers] = useState<TenantUserWithRelations[]>(initialUsers);
  const [pendingInvitations, setPendingInvitations] =
    useState<PendingInvitationWithRelations[]>(initialPendingInvitations);

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [userToDeactivate, setUserToDeactivate] = useState<TenantUserWithRelations | null>(null);
  const [invitationToCancel, setInvitationToCancel] = useState<PendingInvitationWithRelations | null>(null);

  const seatLimit = seatUsage.seatLimit;
  const activeCount = users.filter((u) => u.isActive).length;
  const seatPercent = seatLimit ? Math.min(100, Math.round((activeCount / seatLimit) * 100)) : 0;

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.roleProfile && u.roleProfile.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.manager && u.manager.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && u.isActive) ||
      (statusFilter === 'INACTIVE' && !u.isActive);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDeactivate = (targetUser: TenantUserWithRelations) => {
    if (targetUser.id === currentUserId) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }
    setError(null);
    setUserToDeactivate(targetUser);
  };

  const confirmDeactivate = async () => {
    if (!userToDeactivate) return;
    const targetUser = userToDeactivate;

    setError(null);
    setSuccessMsg(null);
    setIsProcessing(targetUser.id);
    try {
      const res = await deactivateTenantUserAction(targetUser.id);
      if (!res.success) {
        setError(res.error || 'Failed to deactivate user.');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: false, deactivatedAt: new Date() } : u))
      );
      setSuccessMsg(`User ${targetUser.name} has been deactivated.`);
      setUserToDeactivate(null);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleReactivate = async (targetUser: TenantUserWithRelations) => {
    setError(null);
    setSuccessMsg(null);
    setIsProcessing(targetUser.id);
    try {
      const res = await reactivateTenantUserAction(targetUser.id);
      if (!res.success) {
        setError(res.error || 'Failed to reactivate user.');
        return;
      }
      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, isActive: true, deactivatedAt: null } : u))
      );
      setSuccessMsg(`User ${targetUser.name} has been reactivated.`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleCancelInvitation = (invitation: PendingInvitationWithRelations) => {
    setError(null);
    setInvitationToCancel(invitation);
  };

  const confirmCancelInvitation = async () => {
    if (!invitationToCancel) return;
    const invitation = invitationToCancel;

    setError(null);
    setSuccessMsg(null);
    setIsProcessing(invitation.id);
    try {
      const res = await cancelTenantInvitationAction(invitation.id);
      if (!res.success) {
        setError(res.error || 'Failed to cancel invitation.');
        return;
      }
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitation.id));
      setSuccessMsg(`Invitation for ${invitation.email} was cancelled.`);
      setInvitationToCancel(null);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">User Management</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage organization members, send invitations, assign roles, and configure employee role profiles.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/organization-admin/users/import"
            className="inline-flex items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Import CSV
          </Link>
          <Link
            href="/organization-admin/users/new"
            className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            + Invite User
          </Link>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-stone-200/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
          <div>
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">
              Subscription Seat Allocation
            </div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-neutral-900">{activeCount}</span>
              <span className="text-sm font-medium text-stone-500">
                / {seatLimit !== null ? `${seatLimit} seats` : 'Unlimited'}
              </span>
              {seatLimit !== null && (
                <span className="text-xs font-semibold text-stone-400">
                  ({Math.max(0, seatLimit - activeCount)} available)
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-center gap-3 text-xs text-stone-500 font-medium">
              <span>
                Active Seats: <strong className="text-neutral-900 font-bold">{activeCount}</strong>
              </span>
              <span>•</span>
              <span>
                Pending Invitations: <strong className="text-neutral-800 font-bold">{pendingInvitations.length}</strong>
              </span>
            </div>
          </div>

          {seatLimit !== null && (
            <div className="w-full sm:w-72">
              <div className="flex justify-between text-xs font-medium text-stone-600 mb-1.5">
                <span>Seat Usage</span>
                <span className="font-semibold text-neutral-900">{seatPercent}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden border border-stone-200/50">
                <div
                  className={`h-2 rounded-full transition-all ${
                    seatPercent >= 100
                      ? 'bg-rose-500'
                      : seatPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-neutral-900'
                  }`}
                  style={{ width: `${seatPercent}%` }}
                />
              </div>
            </div>
          )}
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

      {pendingInvitations.length > 0 && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="px-6 py-4 bg-stone-50/70 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                Pending Invitations ({pendingInvitations.length})
              </h2>
            </div>
            <span className="text-[11px] text-stone-500 font-medium">
              Pending invites do not consume seat capacity until accepted.
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-left">
              <thead className="bg-stone-50/50">
                <tr>
                  <th className="px-6 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Invited Person
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Intended Role
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Assigned Role Profile
                  </th>
                  <th className="px-6 py-3 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-right text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 bg-white">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="text-xs font-bold text-neutral-900">{inv.name}</div>
                      <div className="text-[11px] text-stone-500 mt-0.5">{inv.email}</div>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                        {inv.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-stone-600">
                      {inv.roleProfile ? (
                        <span className="font-medium text-neutral-800">{inv.roleProfile.name}</span>
                      ) : (
                        <span className="text-stone-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs text-stone-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        onClick={() => handleCancelInvitation(inv)}
                        disabled={isProcessing === inv.id}
                        className="text-rose-600 hover:text-rose-800 font-semibold disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        Cancel Invitation
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search by name, email, role profile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900 placeholder-stone-400 transition-colors"
          />
          <svg
            className="w-4 h-4 text-stone-400 absolute left-3 top-2.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-stone-500 font-semibold">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
              className="px-3 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white text-neutral-800 transition-colors"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.ORGANIZATION_ADMIN}>Org Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.STAFF}>Staff</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-stone-500 font-semibold">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-3 py-1.5 text-xs border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 bg-white text-neutral-800 transition-colors"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-stone-500">
            <svg className="mx-auto h-10 w-10 text-stone-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-2 text-sm font-semibold text-neutral-900">No users found</p>
            <p className="text-xs text-stone-500 mt-1">
              {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'Invite your team members to begin skills assessment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100 text-left">
              <thead className="bg-stone-50/70">
                <tr>
                  <th scope="col" className="px-6 py-3.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Member
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Current Role Profile
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Manager
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/organization-admin/users/${u.id}`}
                            className="text-sm font-bold text-neutral-900 hover:text-neutral-600 transition-colors"
                          >
                            {u.name}
                          </Link>
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-stone-100 text-stone-700 border border-stone-200/80">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-500 mt-0.5">{u.email}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                          {u.role.replace('_', ' ')}
                        </span>
                        {u.role === UserRole.MANAGER && u._count.directReports > 0 && (
                          <div className="text-[10px] text-stone-400 mt-0.5 font-medium">
                            {u._count.directReports} direct report(s)
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.roleProfile ? (
                          <span className="text-xs font-semibold text-neutral-800 bg-stone-50 px-2.5 py-1 rounded-md border border-stone-200/80">
                            {u.roleProfile.name}
                          </span>
                        ) : (
                          <span className="text-xs text-stone-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-stone-600">
                        {u.manager ? (
                          <div>
                            <span className="font-semibold text-neutral-900">{u.manager.name}</span>
                            <div className="text-[10px] text-stone-400 mt-0.5">{u.manager.email}</div>
                          </div>
                        ) : (
                          <span className="text-stone-400 italic">None</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.isActive ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200/80">
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold space-x-3">
                        <Link
                          href={`/organization-admin/users/${u.id}`}
                          className="text-neutral-700 hover:text-neutral-900 transition-colors hover:underline"
                        >
                          Edit
                        </Link>

                        {!isSelf && (
                          u.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(u)}
                              disabled={isProcessing === u.id}
                              className="text-stone-400 hover:text-rose-600 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivate(u)}
                              disabled={isProcessing === u.id}
                              className="text-emerald-600 hover:text-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Reactivate
                            </button>
                          )
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(userToDeactivate)}
        onClose={() => setUserToDeactivate(null)}
        onConfirm={confirmDeactivate}
        title="Deactivate Workspace User"
        description={
          userToDeactivate
            ? `Are you sure you want to deactivate ${userToDeactivate.name}? Deactivated users retain all historical assessment and corroboration records but lose workspace access.`
            : ''
        }
        confirmLabel="Deactivate User"
        cancelLabel="Cancel"
        variant="danger"
        isPending={Boolean(isProcessing && userToDeactivate && isProcessing === userToDeactivate.id)}
      />

      <ConfirmDialog
        isOpen={Boolean(invitationToCancel)}
        onClose={() => setInvitationToCancel(null)}
        onConfirm={confirmCancelInvitation}
        title="Cancel Pending Invitation"
        description={
          invitationToCancel
            ? `Are you sure you want to cancel the invitation sent to ${invitationToCancel.email}? The invitation link will immediately expire.`
            : ''
        }
        confirmLabel="Cancel Invitation"
        cancelLabel="Keep Invitation"
        variant="danger"
        isPending={Boolean(isProcessing && invitationToCancel && isProcessing === invitationToCancel.id)}
      />
    </div>
  );
}
