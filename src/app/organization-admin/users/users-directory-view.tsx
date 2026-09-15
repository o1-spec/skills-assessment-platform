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

  // Seat metrics
  const seatLimit = seatUsage.seatLimit;
  const activeCount = users.filter((u) => u.isActive).length;
  const seatPercent = seatLimit ? Math.min(100, Math.round((activeCount / seatLimit) * 100)) : 0;

  // Filter users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (u.roleProfile && u.roleProfile.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (u.manager && u.manager.name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole = roleFilter === 'ALL' ? true : u.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ? true : statusFilter === 'ACTIVE' ? u.isActive : !u.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleDeactivate = async (targetUser: TenantUserWithRelations) => {
    if (targetUser.id === currentUserId) {
      setError('You cannot deactivate your own administrative account.');
      return;
    }

    if (
      !confirm(
        `Are you sure you want to deactivate ${targetUser.name}? Deactivated users retain all historical assessment records but lose workspace access.`
      )
    ) {
      return;
    }

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

  const handleCancelInvitation = async (invitation: PendingInvitationWithRelations) => {
    if (!confirm(`Cancel pending invitation for ${invitation.email}?`)) return;
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
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsProcessing(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage organization members, send invitations, assign roles, and configure employee role profiles.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href="/organization-admin/users/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            + Invite User
          </Link>
        </div>
      </div>

      {/* Seat Usage Banner */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider">
              Subscription Seat Allocation
            </div>
            <div className="mt-1 flex items-baseline space-x-2">
              <span className="text-2xl font-extrabold text-gray-900">{activeCount}</span>
              <span className="text-sm font-medium text-gray-500">
                / {seatLimit !== null ? `${seatLimit} seats` : 'Unlimited'}
              </span>
              {seatLimit !== null && (
                <span className="text-xs font-semibold text-gray-400">
                  ({Math.max(0, seatLimit - activeCount)} available)
                </span>
              )}
            </div>
          </div>

          {seatLimit !== null && (
            <div className="w-full sm:w-72">
              <div className="flex justify-between text-xs font-medium text-gray-600 mb-1">
                <span>Seat Usage</span>
                <span>{seatPercent}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className={`h-2 rounded-full transition-all ${
                    seatPercent >= 100
                      ? 'bg-red-500'
                      : seatPercent >= 80
                      ? 'bg-amber-500'
                      : 'bg-blue-600'
                  }`}
                  style={{ width: `${seatPercent}%` }}
                />
              </div>
            </div>
          )}
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

      {/* Pending Invitations Section (if any) */}
      {pendingInvitations.length > 0 && (
        <div className="bg-amber-50/60 rounded-lg border border-amber-200 shadow-xs overflow-hidden">
          <div className="px-5 py-3 border-b border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Pending Invitations ({pendingInvitations.length})
              </h2>
            </div>
            <span className="text-[11px] text-amber-700">
              Pending invites do not consume seat capacity until accepted.
            </span>
          </div>

          <div className="divide-y divide-amber-100 overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-100 text-left">
              <thead className="bg-amber-50/80">
                <tr>
                  <th className="px-5 py-2 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Invited Person
                  </th>
                  <th className="px-5 py-2 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Intended Role
                  </th>
                  <th className="px-5 py-2 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Assigned Role Profile
                  </th>
                  <th className="px-5 py-2 text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-5 py-2 text-right text-[11px] font-bold text-amber-900 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100 bg-white/60">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-amber-50/40 transition-colors">
                    <td className="px-5 py-3">
                      <div className="text-xs font-bold text-gray-900">{inv.name}</div>
                      <div className="text-[11px] text-gray-500">{inv.email}</div>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-gray-100 text-gray-800">
                        {inv.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-600">
                      {inv.roleProfile ? inv.roleProfile.name : <span className="text-gray-400 italic">Unassigned</span>}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-xs text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-3 whitespace-nowrap text-right text-xs">
                      <button
                        type="button"
                        onClick={() => handleCancelInvitation(inv)}
                        disabled={isProcessing === inv.id}
                        className="text-red-600 hover:text-red-800 font-semibold disabled:opacity-50"
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

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-xs flex flex-col sm:flex-row gap-4 justify-between items-center">
        <div className="w-full sm:w-80 relative">
          <input
            type="text"
            placeholder="Search by name, email, role profile..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
          <svg
            className="w-4 h-4 text-gray-400 absolute left-2.5 top-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          {/* Role Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-gray-500 font-medium">Role:</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'ALL' | UserRole)}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Roles</option>
              <option value={UserRole.ORGANIZATION_ADMIN}>Org Admin</option>
              <option value={UserRole.MANAGER}>Manager</option>
              <option value={UserRole.STAFF}>Staff</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center space-x-1.5">
            <span className="text-xs text-gray-500 font-medium">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE')}
              className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active Only</option>
              <option value="INACTIVE">Deactivated Only</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white shadow-xs rounded-lg border border-gray-200 overflow-hidden">
        {filteredUsers.length === 0 ? (
          <div className="py-12 text-center text-gray-500">
            <svg className="mx-auto h-10 w-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
            <p className="mt-2 text-sm font-medium text-gray-900">No users found</p>
            <p className="text-xs text-gray-500 mt-1">
              {searchTerm || roleFilter !== 'ALL' || statusFilter !== 'ALL'
                ? 'Try adjusting your search criteria or filters.'
                : 'Invite your team members to begin skills assessment.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th scope="col" className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th scope="col" className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Current Role Profile
                  </th>
                  <th scope="col" className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Manager
                  </th>
                  <th scope="col" className="px-6 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3 text-right text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((u) => {
                  const isSelf = u.id === currentUserId;

                  return (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/organization-admin/users/${u.id}`}
                            className="text-sm font-bold text-gray-900 hover:text-blue-600 transition-colors"
                          >
                            {u.name}
                          </Link>
                          {isSelf && (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                              You
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-gray-500">{u.email}</div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                            u.role === UserRole.ORGANIZATION_ADMIN
                              ? 'bg-purple-100 text-purple-800'
                              : u.role === UserRole.MANAGER
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {u.role.replace('_', ' ')}
                        </span>
                        {u.role === UserRole.MANAGER && u._count.directReports > 0 && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            {u._count.directReports} direct report(s)
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.roleProfile ? (
                          <span className="text-xs font-semibold text-gray-900 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                            {u.roleProfile.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">Unassigned</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600">
                        {u.manager ? (
                          <div>
                            <span className="font-medium text-gray-900">{u.manager.name}</span>
                            <div className="text-[10px] text-gray-400">{u.manager.email}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">None</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {u.isActive ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">
                            Deactivated
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-medium space-x-2">
                        <Link
                          href={`/organization-admin/users/${u.id}`}
                          className="text-blue-600 hover:text-blue-900 font-semibold"
                        >
                          Edit
                        </Link>

                        {!isSelf && (
                          u.isActive ? (
                            <button
                              type="button"
                              onClick={() => handleDeactivate(u)}
                              disabled={isProcessing === u.id}
                              className="text-rose-600 hover:text-rose-800 font-semibold disabled:opacity-50"
                            >
                              Deactivate
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleReactivate(u)}
                              disabled={isProcessing === u.id}
                              className="text-emerald-600 hover:text-emerald-800 font-semibold disabled:opacity-50"
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
    </div>
  );
}
