'use client';

import React, { useState, useTransition } from 'react';
import { acceptPlatformInvitationAction } from '@/actions/platform-users';
import type { PlatformInvitationWithCreator } from '@/services/platform-users';
import { UserRole } from '@prisma/client';

const ROLE_LABELS: Partial<Record<UserRole, string>> = {
  PLATFORM_ADMIN: 'Platform Administrator',
  SUPPORT: 'Platform Support',
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
  const [showPassword, setShowPassword] = useState(false);

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
      <div className="bg-stone-50/80 border border-stone-200 rounded-2xl p-4 space-y-1 text-xs">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-neutral-900 text-sm">{invitation.name}</p>
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
            {roleLabel}
          </span>
        </div>
        <p className="text-neutral-500 font-mono">{invitation.email}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {error && (
          <div
            role="alert"
            className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2 animate-in fade-in duration-200"
          >
            <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <div>
          <label htmlFor="platform-accept-password" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
            Create Password
          </label>
          <div className="relative">
            <input
              id="platform-accept-password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={8}
              autoComplete="new-password"
              disabled={pending}
              className="block w-full px-3.5 py-2.5 pr-11 text-sm border border-stone-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900 transition-colors placeholder:text-stone-400"
              placeholder="Minimum 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-stone-400 hover:text-neutral-700 transition-colors"
            >
              {showPassword ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="platform-accept-confirm" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
            Confirm Password
          </label>
          <input
            id="platform-accept-confirm"
            name="confirmPassword"
            type={showPassword ? 'text' : 'password'}
            required
            minLength={8}
            autoComplete="new-password"
            disabled={pending}
            className="block w-full px-3.5 py-2.5 text-sm border border-stone-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900 transition-colors placeholder:text-stone-400"
            placeholder="Repeat password"
          />
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={pending}
            className="w-full inline-flex justify-center items-center py-3 px-4 rounded-full bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 text-white text-sm font-semibold transition-all shadow-sm active:scale-[0.99]"
          >
            {pending ? 'Activating platform account…' : 'Activate Account & Sign In'}
          </button>
        </div>
      </form>
    </div>
  );
}
