'use client';

import { useState } from 'react';
import Link from 'next/link';
import { SubscriptionPlan } from '@prisma/client';
import { provisionTenantAction } from '@/actions/tenants';

interface ProvisionTenantFormProps {
  activePlans: SubscriptionPlan[];
}

interface ProvisionedResult {
  tenantId: string;
  invitationUrl: string;
  invitationEmail: string;
  invitationName: string;
  rawToken: string;
}

export function ProvisionTenantForm({ activePlans }: ProvisionTenantFormProps) {
  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [domain, setDomain] = useState('');
  const [primaryContactName, setPrimaryContactName] = useState('');
  const [primaryContactEmail, setPrimaryContactEmail] = useState('');

  const [selectedPlanId, setSelectedPlanId] = useState(activePlans[0]?.id || '');
  const [seatLimit, setSeatLimit] = useState(activePlans[0]?.defaultSeatLimit || 25);

  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ProvisionedResult | null>(null);
  const [copied, setCopied] = useState(false);

  function handleNameChange(val: string) {
    setName(val);
    if (!slugTouched) {
      const generated = val
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setSlug(generated);
    }
  }

  function handlePlanChange(planId: string) {
    setSelectedPlanId(planId);
    const plan = activePlans.find((p) => p.id === planId);
    if (plan) {
      setSeatLimit(plan.defaultSeatLimit);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Organization name is required.');
      return;
    }
    if (!slug.trim()) {
      setError('Organization identifier slug is required.');
      return;
    }
    if (!selectedPlanId) {
      setError('Please select an active subscription plan.');
      return;
    }
    if (!adminName.trim() || !adminEmail.trim()) {
      setError('Initial administrator name and email are required.');
      return;
    }

    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('name', name);
      formData.set('slug', slug);
      formData.set('planId', selectedPlanId);
      formData.set('seatLimit', String(seatLimit));
      formData.set('domain', domain);
      formData.set('primaryContactName', primaryContactName);
      formData.set('primaryContactEmail', primaryContactEmail);
      formData.set('adminName', adminName);
      formData.set('adminEmail', adminEmail);

      const res = await provisionTenantAction(formData);
      if (!res.success) {
        setError(res.error || 'Failed to provision organization.');
        setIsSubmitting(false);
        return;
      }

      setResult({
        tenantId: res.tenantId!,
        invitationUrl: res.invitationUrl!,
        invitationEmail: res.invitationEmail!,
        invitationName: res.invitationName!,
        rawToken: res.rawToken!,
      });
    } catch {
      setError('An unexpected error occurred during provisioning.');
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleCopyInvitationUrl() {
    if (!result) return;
    const fullUrl = `${window.location.origin}${result.invitationUrl}`;
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  if (result) {
    const fullUrl = typeof window !== 'undefined' ? `${window.location.origin}${result.invitationUrl}` : result.invitationUrl;

    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-8 space-y-6">
        <div className="flex items-center space-x-3 text-emerald-600">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center border border-emerald-200">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Organization Successfully Provisioned!</h2>
            <p className="text-sm text-gray-500">
              {name} has been provisioned in <span className="font-semibold text-amber-600">PENDING_ONBOARDING</span> status.
            </p>
          </div>
        </div>

        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-sm text-amber-900 space-y-1">
          <div className="font-semibold flex items-center space-x-1.5">
            <svg className="w-4 h-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Initial Administrator Invitation Link</span>
          </div>
          <p className="text-xs text-amber-800">
            Invitation created for <strong>{result.invitationName}</strong> ({result.invitationEmail}). Email delivery is not configured in this MVP environment. Copy the one-time invitation link below to onboard the Organization Admin.
          </p>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">
            One-Time Invitation URL
          </label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={fullUrl}
              className="w-full text-xs font-mono bg-gray-50 px-3 py-2.5 border border-gray-300 rounded-lg text-gray-700 select-all"
            />
            <button
              type="button"
              onClick={handleCopyInvitationUrl}
              className={`px-4 py-2.5 text-xs font-semibold rounded-lg border transition-colors flex items-center space-x-1.5 whitespace-nowrap ${copied
                  ? 'bg-emerald-600 text-white border-transparent'
                  : 'bg-indigo-600 text-white border-transparent hover:bg-indigo-700'
                }`}
            >
              {copied ? (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                  </svg>
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
          <p className="text-[11px] text-gray-400">
            This link expires in 7 days and can only be used once to activate the administrator account.
          </p>
        </div>

        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <Link
            href="/platform-admin/tenants"
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            ← Return to Organizations Directory
          </Link>

          <div className="flex items-center space-x-3">
            <Link
              href={result.invitationUrl}
              target="_blank"
              className="px-4 py-2 border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg text-sm font-medium"
            >
              Open Invitation Flow ↗
            </Link>
            <Link
              href={`/platform-admin/tenants/${result.tenantId}`}
              className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-sm font-semibold shadow-xs"
            >
              View Organization Detail →
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/platform-admin/tenants"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-900 inline-flex items-center mb-2"
        >
          ← Back to Organizations Directory
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Provision Organization</h1>
        <p className="text-sm text-gray-500 mt-1">
          Create an enterprise organization tenant, configure subscription tier and seat quota, and invite the primary organization administrator.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 flex items-start space-x-2">
          <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {activePlans.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-900 space-y-3">
          <h3 className="font-bold text-base">No Active Subscription Plans Found</h3>
          <p>You must have at least one active subscription plan before provisioning organizations.</p>
          <Link
            href="/platform-admin/plans"
            className="inline-flex items-center px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold text-xs hover:bg-amber-700"
          >
            Manage Subscription Plans →
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Organization Details */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                1
              </span>
              <span>Organization Identity</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Organization Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Globex Corporation"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Identifier Slug *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. globex-corp"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase());
                  }}
                  className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Unique URL and tenant namespace identifier.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Domain (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. globex.com"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Contact Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={primaryContactName}
                  onChange={(e) => setPrimaryContactName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Primary Contact Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="e.g. contact@globex.com"
                  value={primaryContactEmail}
                  onChange={(e) => setPrimaryContactEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Subscription & Seat Allocation */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                2
              </span>
              <span>Subscription Tier & Seat Allocation</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Subscription Plan *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanChange(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (Default: {plan.defaultSeatLimit} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Enforced Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={seatLimit}
                  onChange={(e) => setSeatLimit(parseInt(e.target.value) || 1)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
                <p className="text-[11px] text-gray-400 mt-1">Maximum active accounts allowed for this organization.</p>
              </div>
            </div>
          </div>

          {/* Section 3: Initial Organization Administrator */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-xs p-6 space-y-5">
            <h2 className="text-base font-bold text-gray-900 pb-2 border-b border-gray-100 flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center">
                3
              </span>
              <span>Initial Organization Administrator</span>
            </h2>

            <p className="text-xs text-gray-500">
              An invitation will be generated for this user with the <span className="font-semibold text-gray-900">ORGANIZATION_ADMIN</span> role.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Administrator Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Jane Smith"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-1">
                  Administrator Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="e.g. jane.smith@globex.com"
                  value={adminEmail}
                  onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Submission Bar */}
          <div className="flex items-center justify-end space-x-4 pt-4 border-t border-gray-200">
            <Link
              href="/platform-admin/tenants"
              className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </Link>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 border border-transparent rounded-lg text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-sm transition-colors"
            >
              {isSubmitting ? 'Provisioning...' : 'Provision Organization'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
