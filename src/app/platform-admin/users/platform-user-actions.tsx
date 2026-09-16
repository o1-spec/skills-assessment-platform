'use client';

import { useState, useTransition } from 'react';
import { UserRole } from '@prisma/client';
import {
  invitePlatformUserAction,
  cancelPlatformInvitationAction,
  changePlatformUserRoleAction,
  deactivatePlatformUserAction,
  reactivatePlatformUserAction,
} from '@/actions/platform-users';

// ---------------------------------------------------------------------------
// INVITE FORM
// ---------------------------------------------------------------------------

export function InvitePlatformUserForm() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const formData = new FormData(e.currentTarget);
    const form = e.currentTarget;

    startTransition(async () => {
      const result = await invitePlatformUserAction(formData);
      if (result.success) {
        setSuccess(true);
        form.reset();
      } else {
        setError(result.error ?? 'Failed to send invitation.');
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-700">
          Invitation sent successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="platform-invite-name" className="block text-xs font-medium text-gray-600 mb-1">
            Full name
          </label>
          <input
            id="platform-invite-name"
            name="name"
            type="text"
            required
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label htmlFor="platform-invite-email" className="block text-xs font-medium text-gray-600 mb-1">
            Email address
          </label>
          <input
            id="platform-invite-email"
            name="email"
            type="email"
            required
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label htmlFor="platform-invite-role" className="block text-xs font-medium text-gray-600 mb-1">
            Role
          </label>
          <select
            id="platform-invite-role"
            name="role"
            defaultValue={UserRole.SUPPORT}
            className="block w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value={UserRole.SUPPORT}>Support</option>
            <option value={UserRole.PLATFORM_ADMIN}>Platform Administrator</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
        >
          {pending ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// USER ROW ACTIONS
// ---------------------------------------------------------------------------

export function PlatformUserActions({
  user,
  currentUserId,
}: {
  user: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    isActive: boolean;
  };
  currentUserId: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isSelf = user.id === currentUserId;

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const r = await fn();
      if (!r.success) setError(r.error ?? 'Action failed.');
    });
  }

  const otherRole =
    user.role === UserRole.PLATFORM_ADMIN ? UserRole.SUPPORT : UserRole.PLATFORM_ADMIN;
  const otherRoleLabel =
    user.role === UserRole.PLATFORM_ADMIN ? 'Demote to Support' : 'Promote to Admin';

  return (
    <div className="space-y-1">
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {!isSelf && (
          <button
            disabled={pending}
            onClick={() => run(() => changePlatformUserRoleAction(user.id, otherRole))}
            className="text-xs px-2.5 py-1 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {otherRoleLabel}
          </button>
        )}
        {!isSelf && user.isActive && (
          <button
            disabled={pending}
            onClick={() => run(() => deactivatePlatformUserAction(user.id))}
            className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            Deactivate
          </button>
        )}
        {!isSelf && !user.isActive && (
          <button
            disabled={pending}
            onClick={() => run(() => reactivatePlatformUserAction(user.id))}
            className="text-xs px-2.5 py-1 rounded-md border border-emerald-200 text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
          >
            Reactivate
          </button>
        )}
        {isSelf && (
          <span className="text-xs text-gray-400 italic">You</span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// INVITATION CANCEL BUTTON
// ---------------------------------------------------------------------------

export function CancelInvitationButton({ invitationId }: { invitationId: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      const r = await cancelPlatformInvitationAction(invitationId);
      if (!r.success) setError(r.error ?? 'Failed to cancel invitation.');
    });
  }

  return (
    <div>
      {error && <p className="text-xs text-red-600 mb-1">{error}</p>}
      <button
        disabled={pending}
        onClick={handleCancel}
        className="text-xs px-2.5 py-1 rounded-md border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-50 transition-colors"
      >
        {pending ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  );
}
