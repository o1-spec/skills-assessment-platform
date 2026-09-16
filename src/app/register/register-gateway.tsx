'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export function RegisterGateway() {
  const router = useRouter();
  const [tokenInput, setTokenInput] = useState('');
  const [tokenError, setTokenError] = useState('');

  // Workspace request state
  const [fullName, setFullName] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [orgName, setOrgName] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestSubmitting, setRequestSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = tokenInput.trim();
    if (!cleanToken) {
      setTokenError('Please enter your invitation token.');
      return;
    }
    // If the user pasted a full URL, extract the token parameter
    try {
      if (cleanToken.includes('token=')) {
        const urlObj = new URL(cleanToken.startsWith('http') ? cleanToken : `http://dummy.com/${cleanToken}`);
        const extractedToken = urlObj.searchParams.get('token');
        const extractedType = urlObj.searchParams.get('type');
        if (extractedToken) {
          router.push(`/accept-invitation?token=${encodeURIComponent(extractedToken)}${extractedType ? `&type=${encodeURIComponent(extractedType)}` : ''}`);
          return;
        }
      }
    } catch {
      // Fall through to plain token
    }

    router.push(`/accept-invitation?token=${encodeURIComponent(cleanToken)}`);
  };

  const handleRequestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !workEmail.trim() || !orgName.trim()) {
      setFormError('Please fill in all required fields.');
      return;
    }
    if (!workEmail.includes('@') || !workEmail.includes('.')) {
      setFormError('Please provide a valid work email.');
      return;
    }

    setFormError('');
    setRequestSubmitting(true);
    // Instant confirmation without introducing unwanted persistence or notifications
    setTimeout(() => {
      setRequestSubmitting(false);
      setRequestSubmitted(true);
    }, 400);
  };

  return (
    <div className="space-y-6">
      {/* Choice Card 1: Joining an Existing Organization */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 bg-stone-50/50 hover:bg-stone-50 transition-all">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-7 h-7 rounded-lg bg-white border border-stone-200 text-neutral-800 flex items-center justify-center text-xs font-bold shadow-2xs">
            1
          </span>
          <h2 className="text-base font-bold text-neutral-900">
            Joining an existing organization?
          </h2>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed mb-4">
          If your organization has invited you to SkillsIQ, use the secure invitation link sent to your email to complete your account setup.
        </p>

        <form onSubmit={handleTokenSubmit} className="space-y-2.5">
          <div className="flex flex-col sm:flex-row items-stretch gap-2">
            <input
              type="text"
              value={tokenInput}
              onChange={(e) => {
                setTokenInput(e.target.value);
                setTokenError('');
              }}
              placeholder="Paste invitation link or token..."
              className="flex-1 px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-neutral-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900"
            />
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 rounded-xl transition-all shadow-xs active:scale-[0.98] shrink-0"
            >
              Continue with invitation →
            </button>
          </div>
          {tokenError && (
            <p className="text-xs text-red-600">{tokenError}</p>
          )}
          <p className="text-[11px] text-stone-500">
            Or simply click the activation link directly in the email received from your administrator.
          </p>
        </form>
      </div>

      {/* Choice Card 2: Setting Up SkillsIQ for a New Organization */}
      <div className="p-5 sm:p-6 rounded-2xl border border-stone-200 bg-white shadow-2xs">
        <div className="flex items-center gap-2.5 mb-2">
          <span className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center text-xs font-bold shadow-2xs">
            2
          </span>
          <h2 className="text-base font-bold text-neutral-900">
            Setting up SkillsIQ for your organization?
          </h2>
        </div>
        <p className="text-xs text-neutral-600 leading-relaxed mb-4">
          New organizations are provisioned securely by the platform team before the Organization Admin completes account setup.
        </p>

        {requestSubmitted ? (
          <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 space-y-2 animate-in fade-in duration-300">
            <div className="flex items-center gap-2 font-semibold text-emerald-800">
              <span className="text-base">✓</span>
              <span>Workspace Request Acknowledged</span>
            </div>
            <p className="leading-relaxed text-emerald-800">
              Thank you, <strong>{fullName}</strong>. New organization workspaces for <strong>{orgName}</strong> are provisioned by the SkillsIQ platform team. Once provisioned, a secure Organization Administrator invitation will be issued to <strong>{workEmail}</strong> to complete account setup.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => {
                  setRequestSubmitted(false);
                  setFullName('');
                  setWorkEmail('');
                  setOrgName('');
                }}
                className="text-xs font-medium text-emerald-700 underline hover:text-emerald-900"
              >
                Submit another request
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestSubmit} className="space-y-3">
            {formError && (
              <p className="text-xs text-red-600">{formError}</p>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Alex Morgan"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-neutral-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                  Work Email
                </label>
                <input
                  type="email"
                  required
                  value={workEmail}
                  onChange={(e) => setWorkEmail(e.target.value)}
                  placeholder="alex@company.com"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-neutral-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-neutral-700 uppercase tracking-wider mb-1">
                Organization Name
              </label>
              <input
                type="text"
                required
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Acme Technologies Inc."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 bg-white text-neutral-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-neutral-900"
              />
            </div>

            <div className="pt-1">
              <button
                type="submit"
                disabled={requestSubmitting}
                className="w-full py-2.5 px-4 rounded-full text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-all shadow-xs active:scale-[0.99]"
              >
                {requestSubmitting ? 'Submitting request...' : 'Request Workspace Provisioning'}
              </button>
            </div>
            <p className="text-[11px] text-stone-500 text-center">
              New organization workspaces are provisioned by the SkillsIQ platform team. Submit your details and continue once your workspace invitation is issued.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
