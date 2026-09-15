'use client';

import { useState } from 'react';
import { InvitationDetail } from '@/services/invitations';
import { acceptInvitationAction } from '@/actions/invitations';

interface AcceptInvitationFormProps {
  token: string;
  invitation: InvitationDetail;
}

export function AcceptInvitationForm({ token, invitation }: AcceptInvitationFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
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

      // Hard redirect to dashboard
      window.location.href = res.redirectUrl || '/organization-admin';
    } catch {
      setError('An unexpected error occurred.');
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="p-3.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start space-x-2">
          <svg className="w-4 h-4 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Organization Info Box */}
      <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1.5">
        <div className="text-indigo-900 font-bold text-sm">{invitation.tenant.name}</div>
        <div className="text-indigo-700">
          Role: <span className="font-semibold">Organization Administrator</span>
        </div>
        <div className="text-gray-500">
          Invited Name: <span className="text-gray-900 font-medium">{invitation.name}</span>
        </div>
        <div className="text-gray-500">
          Account Email: <span className="text-gray-900 font-mono font-medium">{invitation.email}</span>
        </div>
      </div>

      {/* Password Fields */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
          Set Password *
        </label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        <p className="text-[11px] text-gray-400 mt-1">
          Minimum 8 characters with at least one uppercase letter, one number, and one symbol.
        </p>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
          Confirm Password *
        </label>
        <input
          type="password"
          required
          placeholder="••••••••"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full text-sm px-3.5 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 transition-colors"
      >
        {isSubmitting ? 'Activating Account...' : 'Activate Account & Sign In'}
      </button>
    </form>
  );
}
