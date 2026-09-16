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
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800">
          Invitation sent successfully.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor="platform-invite-name" className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Full name
          </label>
          <input
            id="platform-invite-name"
            name="name"
            type="text"
            required
            className="block w-full px-3.5 py-2 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label htmlFor="platform-invite-email" className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Email address
          </label>
          <input
            id="platform-invite-email"
            name="email"
            type="email"
            required
            className="block w-full px-3.5 py-2 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
            placeholder="jane@example.com"
          />
        </div>
        <div>
          <label htmlFor="platform-invite-role" className="block text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-1.5">
            Role
          </label>
          <select
            id="platform-invite-role"
            name="role"
            defaultValue={UserRole.SUPPORT}
            className="block w-full px-3.5 py-2 text-xs border border-stone-200/80 rounded-xl focus:outline-none focus:ring-neutral-900 focus:border-neutral-900 bg-white shadow-2xs font-medium"
          >
            <option value={UserRole.SUPPORT}>Support</option>
            <option value={UserRole.PLATFORM_ADMIN}>Platform Administrator</option>
          </select>
        </div>
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-xs font-semibold rounded-xl shadow-2xs transition-colors cursor-pointer"
        >
          {pending ? 'Sending…' : 'Send Invitation'}
        </button>
      </div>
    </form>
  );
}

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
      {error && <p className="text-xs text-rose-600 font-semibold">{error}</p>}
      <div className="flex items-center gap-2 flex-wrap">
        {!isSelf && (
          <button
            disabled={pending}
            onClick={() => run(() => changePlatformUserRoleAction(user.id, otherRole))}
            className="text-xs px-2.5 py-1 rounded-lg border border-stone-200/80 font-semibold text-neutral-700 bg-white hover:bg-stone-50 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            {otherRoleLabel}
          </button>
        )}
        {!isSelf && user.isActive && (
          <button
            disabled={pending}
            onClick={() => run(() => deactivatePlatformUserAction(user.id))}
            className="text-xs px-2.5 py-1 rounded-lg border border-rose-200/80 font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            Deactivate
          </button>
        )}
        {!isSelf && !user.isActive && (
          <button
            disabled={pending}
            onClick={() => run(() => reactivatePlatformUserAction(user.id))}
            className="text-xs px-2.5 py-1 rounded-lg border border-emerald-200/80 font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
          >
            Reactivate
          </button>
        )}
        {isSelf && (
          <span className="text-xs text-stone-400 italic">You</span>
        )}
      </div>
    </div>
  );
}

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
      {error && <p className="text-xs text-rose-600 font-semibold mb-1">{error}</p>}
      <button
        disabled={pending}
        onClick={handleCancel}
        className="text-xs px-2.5 py-1 rounded-lg border border-rose-200/80 font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
      >
        {pending ? 'Cancelling…' : 'Cancel'}
      </button>
    </div>
  );
}
