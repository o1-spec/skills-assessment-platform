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

interface TeamOption {
  id: string;
  name: string;
}

interface InviteUserFormProps {
  managers: ManagerOption[];
  roleProfiles: RoleProfileOption[];
  seatUsage: {
    activeUsers: number;
    seatLimit: number | null;
    availableSeats: number | null;
  };
  teams?: TeamOption[];
}

export function InviteUserForm({ managers, roleProfiles, seatUsage, teams = [] }: InviteUserFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF'>(UserRole.STAFF);
  const [roleProfileId, setRoleProfileId] = useState('');
  const [managerId, setManagerId] = useState('');
  const [selectedTeamIds, setSelectedTeamIds] = useState<string[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        teamIds: selectedTeamIds.length > 0 ? selectedTeamIds : undefined,
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
      <div className="flex items-center space-x-4">
        <Link
          href="/organization-admin/users"
          className="text-stone-500 hover:text-stone-800 text-sm font-medium flex items-center space-x-1.5 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          <span>Back to User Directory</span>
        </Link>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Invite Organization Member</h1>
        <p className="mt-1 text-sm text-stone-500">
          Generate an invitation token for a new staff member, manager, or administrator.
        </p>
      </div>

      {seatUsage.seatLimit !== null && (
        <div className="p-4 bg-stone-100/80 border border-stone-200/80 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between text-xs text-stone-700 gap-2">
          <span>
            Current Seat Usage: <strong className="text-neutral-900 font-bold">{seatUsage.activeUsers}</strong> / {seatUsage.seatLimit} seats ({seatUsage.availableSeats} available).
          </span>
          <span className="text-[11px] text-stone-500">
            Pending invites consume capacity upon account activation.
          </span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {invitationResult ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/80 flex items-center justify-center">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-bold text-neutral-900">Invitation Created Successfully</h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Invitation token generated for <strong className="text-neutral-900 font-semibold">{invitationResult.name}</strong> ({invitationResult.email}).
              </p>
            </div>
          </div>

          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-xl space-y-1.5">
            <div className="flex items-center space-x-2 text-xs font-bold text-neutral-900">
              <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Email Delivery Notice</span>
            </div>
            <p className="text-xs text-stone-600 leading-relaxed">
              Invitation created. Email delivery is not configured in this MVP environment. Copy the one-time invitation link below and provide it to the invited member to complete their account setup.
            </p>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider">
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
                className="w-full px-3.5 py-2.5 text-xs font-mono bg-stone-50 border border-stone-200/90 rounded-xl select-all text-neutral-900 focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors shrink-0 cursor-pointer"
              >
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-stone-100 flex items-center justify-between">
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
              className="px-4 py-2.5 rounded-xl border border-stone-200/80 bg-white hover:bg-stone-50 text-neutral-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              + Invite Another Member
            </button>
            <Link
              href="/organization-admin/users"
              className="px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Back to User Directory
            </Link>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="space-y-5">
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Alex Johnson"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@company.com"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Application Role <span className="text-rose-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as 'ORGANIZATION_ADMIN' | 'MANAGER' | 'STAFF')}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              >
                <option value={UserRole.STAFF}>Staff (Self-assessment participant)</option>
                <option value={UserRole.MANAGER}>Manager (Corroborator & team reviewer)</option>
                <option value={UserRole.ORGANIZATION_ADMIN}>Organization Admin (Tenant administrator)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Current Role Profile <span className="text-stone-400 font-normal">(Optional)</span>
              </label>
              {roleProfiles.length === 0 ? (
                <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-500">
                  No published role profiles found. Role profiles can be assigned later in Role Profiles or User settings.
                </div>
              ) : (
                <select
                  value={roleProfileId}
                  onChange={(e) => setRoleProfileId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                >
                  <option value="">-- No Role Profile Assigned --</option>
                  {roleProfiles.map((rp) => (
                    <option key={rp.id} value={rp.id}>
                      {rp.name}
                    </option>
                  ))}
                </select>
              )}
              <p className="text-[11px] text-stone-500 mt-1.5">
                The benchmark role profile this employee is currently expected to fulfill.
              </p>
            </div>

            {role !== UserRole.ORGANIZATION_ADMIN && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Reporting Manager <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                {managers.length === 0 ? (
                  <div className="p-3.5 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-stone-500">
                    No active managers found in this organization. Managers can be assigned after manager accounts are created.
                  </div>
                ) : (
                  <select
                    value={managerId}
                    onChange={(e) => setManagerId(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-stone-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                  >
                    <option value="">-- No Reporting Manager Assigned --</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.email})
                      </option>
                    ))}
                  </select>
                )}
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Manager responsible for corroborating this employee&apos;s self-assessments.
                </p>
              </div>
            )}

            {teams && teams.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Team Assignments <span className="text-stone-400 font-normal">(Optional)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1.5">
                  {teams.map((t) => {
                    const checked = selectedTeamIds.includes(t.id);
                    return (
                      <label
                        key={t.id}
                        className={`flex items-center p-3 rounded-xl border text-xs cursor-pointer transition-colors ${
                          checked
                            ? 'border-neutral-900 bg-stone-50 text-neutral-900 font-semibold'
                            : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            setSelectedTeamIds((prev) =>
                              prev.includes(t.id) ? prev.filter((id) => id !== t.id) : [...prev, t.id]
                            );
                          }}
                          className="h-4 w-4 rounded border-stone-300 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
                        />
                        <span className="ml-2.5">{t.name}</span>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-500 mt-1.5">
                  Employee will be automatically added to selected teams upon accepting this invitation.
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-stone-200/80">
            <Link
              href="/organization-admin/users"
              className="px-4 py-2.5 border border-stone-200/80 text-stone-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold transition-colors shadow-2xs"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 border border-transparent text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isSubmitting ? 'Generating Invitation...' : 'Send Invitation'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
