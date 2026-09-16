'use client';

import { useState, useTransition } from 'react';
import { acceptPlatformInvitationAction } from '@/actions/platform-users';
import type { PlatformInvitationWithCreator } from '@/services/platform-users';
import { UserRole } from '@prisma/client';

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  PLATFORM_ADMIN: 'Platform Administrator',
  SUPPORT: 'Support',
};

export function AcceptPlatformInvitationForm({
  token,
  invitation,
}: {
  token: string;
  invitation: PlatformInvitationWithCreator;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set('token', token);

    startTransition(async () => {
      const result = await acceptPlatformInvitationAction(formData);
      if (result && !result.success) {
        setError(result.error ?? 'Failed to activate account.');
      }
    });
  }

  const roleLabel = ROLE_LABELS[invitation.role] ?? invitation.role;

  return (
    <div className="space-y-5">
      {/* Invitation summary */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-1">
        <p className="text-sm font-semibold text-gray-900">{invitation.name}</p>
        <p className="text-sm text-gray-500">{invitation.email}</p>
        <span className="inline-block text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full">
          {roleLabel}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="platform-accept-password" className="block text-sm font-medium text-gray-700 mb-1">
            Create password
          </label>
          <input
            id="platform-accept-password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="block w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Minimum 8 characters"
          />
        </div>

        <div>
          <label htmlFor="platform-accept-confirm" className="block text-sm font-medium text-gray-700 mb-1">
            Confirm password
          </label>
          <input
            id="platform-accept-confirm"
            name="confirmPassword"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="block w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Repeat password"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg shadow-xs transition-colors"
        >
          {pending ? 'Activating account…' : 'Activate Account'}
        </button>
      </form>
    </div>
  );
}
