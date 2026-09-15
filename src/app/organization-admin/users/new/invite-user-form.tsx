'use client';

import { useState } from 'react';
import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { inviteTenantUserAction } from '@/actions/users';

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

interface InviteUserFormProps {
  managers: ManagerOption[];
  roleProfiles: RoleProfileOption[];
  seatUsage: {
    activeUsers: number;
    seatLimit: number | null;
    availableSeats: number | null;
  };
}

export function InviteUserForm({ managers, roleProfiles, seatUsage }: InviteUserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF'>(UserRole.STAFF);
  const [roleProfileId, setRoleProfileId] = useState('');
  const [managerId, setManagerId] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Result state: displayed once invitation is created
  const [invitationResult, setInvitationResult] = useState<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    rawToken: string;
    invitationUrl: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setCopied(false);

    if (!name.trim()) {
      setError('Full name is required.');
      return;
    }

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await inviteTenantUserAction({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        role,
        roleProfileId: roleProfileId || null,
        managerId: role !== UserRole.ORGANIZATION_ADMIN && managerId ? managerId : null,
      });

      if (!res.success) {
        setError(res.error || 'Failed to create invitation.');
        setIsSubmitting(false);
        return;
      }

      setInvitationResult(res.invitation);
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (!invitationResult) return;
    const fullUrl = `${window.location.origin}${invitationResult.invitationUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-12">
      {/* Back Link */}
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

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Invite Organization Member</h1>
        <p className="mt-1 text-sm text-gray-500">
          Generate an invitation token for a new staff member, manager, or administrator.
        </p>
      </div>

      {/* Seat Capacity Notice */}
      {seatUsage.seatLimit !== null && (
        <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-lg flex items-center justify-between text-xs text-blue-800">
          <span>
            Current Seat Usage: <strong>{seatUsage.activeUsers}</strong> / {seatUsage.seatLimit} seats ({seatUsage.availableSeats} available).
          </span>
          <span className="text-[11px] text-blue-600">
            Pending invites consume capacity upon account activation.
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {invitationResult ? (
        /* One-Time Invitation Result Card */
        <div className="bg-white rounded-lg border border-emerald-300 shadow-sm p-6 space-y-5">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Invitation Created Successfully</h2>
              <p className="text-xs text-gray-500">
                Invitation token generated for <strong>{invitationResult.name}</strong> ({invitationResult.email}).
              </p>
            </div>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-amber-900">
              <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Email Delivery Notice</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Invitation created. Email delivery is not configured in this MVP environment. Copy the one-time invitation link below and provide it to the invited member to complete their account setup.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
              One-Time Invitation Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                readOnly
                value={
                  typeof window !== 'undefined'
                    ? `${window.location.origin}${invitationResult.invitationUrl}`
                    : invitationResult.invitationUrl
                }
                className="w-full px-3 py-2 text-xs font-mono bg-gray-50 border border-gray-300 rounded-md select-all text-gray-800"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-md text-white bg-blue-600 hover:bg-blue-700 shrink-0"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              onClick={() => {
                setInvitationResult(null);
                setName('');
                setEmail('');
                setRole(UserRole.STAFF);
                setRoleProfileId('');
                setManagerId('');
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-800"
            >
              + Invite Another Member
            </button>
            <Link
              href="/organization-admin/users"
              className="px-4 py-2 border border-gray-300 rounded-md text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              Back to User Directory
            </Link>
          </div>
        </div>
      ) : (
        /* Invitation Form */
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 shadow-xs p-6 space-y-5">
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
                placeholder="e.g. Alex Johnson"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Application Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-hidden focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value={UserRole.STAFF}>Staff (Self-assessment participant)</option>
                <option value={UserRole.MANAGER}>Manager (Corroborator & team reviewer)</option>
                <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin (Tenant administrator)</option>
              </select>
            </div>

            {/* Current Role Profile Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                Current Role Profile <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              {roleProfiles.length === 0 ? (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
                  No published role profiles found. Role profiles can be assigned later in Role Profiles or User settings.
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
                The benchmark role profile this employee is currently expected to fulfill.
              </p>
            </div>

            {/* Manager Selector */}
            {role !== UserRole.ORGANIZATION_ADMIN && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Reporting Manager <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                {managers.length === 0 ? (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs text-gray-500">
                    No active managers found in this organization. Managers can be assigned after manager accounts are created.
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
                  Manager responsible for corroborating this employee&apos;s self-assessments.
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
              {isSubmitting ? 'Generating Invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
