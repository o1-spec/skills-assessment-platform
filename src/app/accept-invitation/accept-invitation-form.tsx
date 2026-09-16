'use client';

import React, { useState } from 'react';
import { InvitationDetail } from '@/services/invitations';
import { acceptInvitationAction } from '@/actions/invitations';

interface AcceptInvitationFormProps {
  token: string;
  invitation: InvitationDetail;
}

export function AcceptInvitationForm({ token, invitation }: AcceptInvitationFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('token', token);
      formData.set('password', password);
      formData.set('confirmPassword', confirmPassword);

      const res = await acceptInvitationAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to accept invitation.');
        setIsSubmitting(false);
        return;
      }

      window.location.href = res.redirectUrl || '/organization-admin';
    } catch {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate>
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-medium text-red-700 flex items-start gap-2.5 animate-in fade-in duration-200"
        >
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="p-4 bg-stone-50/80 rounded-2xl border border-stone-200 text-xs space-y-1.5">
        <div className="text-neutral-900 font-bold text-sm flex items-center justify-between">
          <span>{invitation.tenant.name}</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            {invitation.role}
          </span>
        </div>
        <div className="text-neutral-600">
          Role Assignment:{' '}
          <span className="font-semibold text-neutral-800">
            {invitation.role === 'ORGANIZATION_ADMIN'
              ? 'Organization Administrator'
              : invitation.role === 'MANAGER'
              ? 'Manager'
              : 'Staff Member'}
          </span>
        </div>
        {invitation.roleProfile && (
          <div className="text-neutral-600">
            Role Profile: <span className="font-semibold text-neutral-800">{invitation.roleProfile.name}</span>
          </div>
        )}
        {invitation.manager && (
          <div className="text-neutral-600">
            Manager: <span className="font-semibold text-neutral-800">{invitation.manager.name}</span>
          </div>
        )}
        <div className="pt-2 mt-2 border-t border-stone-200/60 flex items-center justify-between text-neutral-500 font-mono text-[11px]">
          <span>{invitation.name}</span>
          <span>{invitation.email}</span>
        </div>
      </div>

      <div>
        <label htmlFor="invitation-password" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
          Set Password
        </label>
        <div className="relative">
          <input
            id="invitation-password"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isSubmitting}
            className="w-full text-sm px-3.5 py-2.5 pr-11 border border-stone-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900 transition-colors placeholder:text-stone-400"
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
        <p className="text-[11px] text-stone-400 mt-1">
          Minimum 8 characters with at least one uppercase letter, one number, and one symbol.
        </p>
      </div>

      <div>
        <label htmlFor="invitation-confirm" className="block text-xs font-semibold text-neutral-800 uppercase tracking-wider mb-1.5">
          Confirm Password
        </label>
        <input
          id="invitation-confirm"
          type={showPassword ? 'text' : 'password'}
          required
          autoComplete="new-password"
          placeholder="••••••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          disabled={isSubmitting}
          className="w-full text-sm px-3.5 py-2.5 border border-stone-200 rounded-xl bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900 transition-colors placeholder:text-stone-400"
        />
      </div>

      <div className="pt-2">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 px-4 rounded-full text-sm font-semibold text-white bg-neutral-900 hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neutral-900 disabled:opacity-50 transition-all shadow-sm active:scale-[0.99]"
        >
          {isSubmitting ? 'Creating account & activating...' : 'Activate Account & Sign In'}
        </button>
      </div>
    </form>
  );
}
