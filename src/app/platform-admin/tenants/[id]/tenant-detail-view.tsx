'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TenantWithStats } from '@/services/tenants';
import { SubscriptionPlan, TenantStatus } from '@prisma/client';
import { updateTenantPlanAction, updateTenantStatusAction } from '@/actions/tenants';
import { ConfirmDialog } from '@/components/app';

interface TenantDetailViewProps {
  tenant: TenantWithStats;
  activePlans: SubscriptionPlan[];
}

export function TenantDetailView({ tenant, activePlans }: TenantDetailViewProps) {
  const router = useRouter();

  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState(tenant.planId || activePlans[0]?.id || '');
  const [seatLimit, setSeatLimit] = useState(tenant.seatLimit || 25);
  const [billingCycle, setBillingCycle] = useState<'MONTHLY' | 'ANNUAL'>(tenant.billingCycle || 'MONTHLY');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function handlePlanSelectionChange(planId: string) {
    setSelectedPlanId(planId);
    const plan = activePlans.find((p) => p.id === planId);
    if (plan) {
      setSeatLimit(plan.defaultSeatLimit);
    }
  }

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const formData = new FormData();
      formData.set('planId', selectedPlanId);
      formData.set('seatLimit', String(seatLimit));
      formData.set('billingCycle', billingCycle);

      const res = await updateTenantPlanAction(tenant.id, formData);
      if (!res.success) {
        setError(res.error || 'Failed to update plan.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Subscription plan, seat quota, and billing cycle updated successfully.');
      setIsEditingPlan(false);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const [pendingStatusChange, setPendingStatusChange] = useState<TenantStatus | null>(null);

  function handleStatusChange(newStatus: TenantStatus) {
    setError(null);
    setPendingStatusChange(newStatus);
  }

  async function confirmStatusChange() {
    if (!pendingStatusChange) return;
    const newStatus = pendingStatusChange;

    setError(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await updateTenantStatusAction(tenant.id, newStatus);
      if (!res.success) {
        setError(res.error || 'Failed to update organization status.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Organization status updated to ${newStatus}.`);
      setPendingStatusChange(null);
      router.refresh();
    } catch {
      setError('An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  }

  const seatUsagePercent =
    tenant.seatLimit && tenant.seatLimit > 0
      ? Math.min(100, Math.round((tenant.activeUsersCount / tenant.seatLimit) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/platform-admin/tenants"
          className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 inline-flex items-center mb-2 transition-colors"
        >
          ← Back to Organizations Directory
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            {tenant.logoUrl && (
              <img
                src={tenant.logoUrl}
                alt={`${tenant.name} Logo`}
                className="w-10 h-10 rounded-xl object-contain bg-white border border-stone-200/80 p-1 shadow-2xs"
              />
            )}
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{tenant.name}</h1>
              <p className="text-xs text-stone-500 mt-0.5">
                Slug: <span className="font-mono text-neutral-700">{tenant.slug}</span> • ID: <span className="font-mono text-neutral-700">{tenant.id}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {tenant.status === TenantStatus.ACTIVE && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusChange(TenantStatus.SUSPENDED)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-rose-200/80 text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Suspend Organization
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(TenantStatus.ARCHIVED)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-stone-200/80 text-neutral-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Archive Organization
                </button>
              </>
            )}

            {tenant.status === TenantStatus.SUSPENDED && (
              <>
                <button
                  type="button"
                  onClick={() => handleStatusChange(TenantStatus.ACTIVE)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-emerald-200/80 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Reactivate Organization
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange(TenantStatus.ARCHIVED)}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-stone-200/80 text-neutral-700 bg-white hover:bg-stone-50 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50 shadow-2xs cursor-pointer"
                >
                  Archive Organization
                </button>
              </>
            )}

            {tenant.status === TenantStatus.ARCHIVED && (
              <span className="px-3 py-1.5 rounded-xl bg-stone-100 text-stone-600 text-xs font-semibold border border-stone-200/80">
                Organization Archived (Terminal)
              </span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200/80 text-xs font-semibold text-emerald-800 flex items-start space-x-2.5">
          <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Lifecycle Status</div>
          <div className="mt-2">
            {tenant.status === TenantStatus.ACTIVE && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Active
              </span>
            )}
            {tenant.status === TenantStatus.PENDING_ONBOARDING && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                Pending Onboarding
              </span>
            )}
            {tenant.status === TenantStatus.SUSPENDED && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                Suspended
              </span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Subscription Tier</div>
          <div className="mt-2 text-base font-bold text-neutral-900">{tenant.plan?.name || 'No Plan'}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Seat Usage</div>
          <div className="mt-2 text-base font-bold text-neutral-900">
            {tenant.activeUsersCount} / {tenant.seatLimit ?? '∞'} seats
          </div>
          <div className="w-full bg-stone-100 rounded-full h-1.5 mt-2 overflow-hidden border border-stone-200/50">
            <div
              className={`h-1.5 rounded-full ${
                seatUsagePercent >= 100
                  ? 'bg-rose-500'
                  : seatUsagePercent >= 80
                  ? 'bg-amber-500'
                  : 'bg-neutral-900'
              }`}
              style={{ width: `${seatUsagePercent}%` }}
            />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Adopted Framework</div>
          <div className="mt-2 text-base font-bold text-neutral-900">
            {tenant.activeFrameworkVersion ? `Version ${tenant.activeFrameworkVersion}` : 'None'}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h2 className="text-base font-bold text-neutral-900">Subscription & Seat Allocation</h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Change subscription tier or override maximum seat quota.
            </p>
          </div>

          {!isEditingPlan && (
            <button
              type="button"
              onClick={() => setIsEditingPlan(true)}
              className="text-xs font-semibold text-neutral-900 hover:text-neutral-700 cursor-pointer"
            >
              Modify Plan / Seats
            </button>
          )}
        </div>

        {isEditingPlan ? (
          <form onSubmit={handleSavePlan} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Subscription Plan *
                </label>
                <select
                  value={selectedPlanId}
                  onChange={(e) => handlePlanSelectionChange(e.target.value)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl bg-white focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs font-medium"
                >
                  {activePlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name} (Default: {plan.defaultSeatLimit} seats)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Enforced Seat Limit *
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={seatLimit}
                  onChange={(e) => setSeatLimit(parseInt(e.target.value) || 1)}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-1.5">
                  Billing Cycle *
                </label>
                <select
                  value={billingCycle}
                  onChange={(e) => setBillingCycle(e.target.value as 'MONTHLY' | 'ANNUAL')}
                  className="w-full text-xs px-3.5 py-2.5 border border-stone-200/80 rounded-xl bg-white focus:ring-neutral-900 focus:border-neutral-900 shadow-2xs font-medium"
                >
                  <option value="MONTHLY">Monthly</option>
                  <option value="ANNUAL">Annual</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsEditingPlan(false)}
                className="px-4 py-2 border border-stone-200/80 rounded-xl text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-xl text-xs font-semibold shadow-2xs disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Saving...' : 'Save Plan Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Assigned Plan</span>
              <span className="font-semibold text-neutral-900 mt-1 block">{tenant.plan?.name || 'Unassigned'}</span>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">{tenant.plan?.description || 'No plan description.'}</p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Seat Limit</span>
              <span className="font-semibold text-neutral-900 mt-1 block">{tenant.seatLimit ?? 'Unlimited'} active seats</span>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Currently {tenant.activeUsersCount} active accounts ({tenant.seatLimit ? Math.max(0, tenant.seatLimit - tenant.activeUsersCount) : '∞'} seats available).
              </p>
            </div>

            <div>
              <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider block">Billing Cycle</span>
              <span className="font-semibold text-neutral-900 mt-1 block capitalize">{tenant.billingCycle.toLowerCase()}</span>
              <p className="text-xs text-stone-500 mt-1 leading-relaxed">
                Invoice schedule configured for this tenant.
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-neutral-900 pb-2 border-b border-stone-100">Contact & Identity</h2>
          <dl className="space-y-3 text-xs">
            <div>
              <dt className="text-stone-400 font-bold uppercase tracking-wider text-[11px]">Domain</dt>
              <dd className="font-semibold text-neutral-900 mt-0.5">{tenant.domain || 'Not configured'}</dd>
            </div>
            <div>
              <dt className="text-stone-400 font-bold uppercase tracking-wider text-[11px]">Primary Contact</dt>
              <dd className="font-semibold text-neutral-900 mt-0.5">
                {tenant.primaryContactName || 'Not specified'} {tenant.primaryContactEmail && `(${tenant.primaryContactEmail})`}
              </dd>
            </div>
            <div>
              <dt className="text-stone-400 font-bold uppercase tracking-wider text-[11px]">Provisioned At</dt>
              <dd className="font-semibold text-neutral-900 mt-0.5">
                {new Date(tenant.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </dd>
            </div>
          </dl>
        </div>

        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-4">
          <h2 className="text-base font-bold text-neutral-900 pb-2 border-b border-stone-100">Administrator Invitation</h2>
          {tenant.latestInvitation ? (
            <dl className="space-y-3 text-xs">
              <div>
                <dt className="text-stone-400 font-bold uppercase tracking-wider text-[11px]">Invited Administrator</dt>
                <dd className="font-semibold text-neutral-900 mt-0.5">
                  {tenant.latestInvitation.name} ({tenant.latestInvitation.email})
                </dd>
              </div>
              <div>
                <dt className="text-stone-400 font-bold uppercase tracking-wider text-[11px]">Invitation Status</dt>
                <dd className="mt-0.5">
                  {tenant.latestInvitation.acceptedAt ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                      Accepted on {new Date(tenant.latestInvitation.acceptedAt).toLocaleDateString()}
                    </span>
                  ) : new Date(tenant.latestInvitation.expiresAt) < new Date() ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                      Expired
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200/60">
                      Pending Acceptance (expires {new Date(tenant.latestInvitation.expiresAt).toLocaleDateString()})
                    </span>
                  )}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-xs text-stone-500">No invitations recorded for this organization.</p>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={Boolean(pendingStatusChange)}
        onClose={() => setPendingStatusChange(null)}
        onConfirm={confirmStatusChange}
        title={`${
          pendingStatusChange === TenantStatus.SUSPENDED
            ? 'Suspend'
            : pendingStatusChange === TenantStatus.ARCHIVED
            ? 'Archive'
            : 'Reactivate'
        } Organization`}
        description={
          pendingStatusChange
            ? `Are you sure you want to update the status of "${tenant.name}" to ${pendingStatusChange}? Users belonging to this organization will be affected immediately.`
            : ''
        }
        confirmLabel={`${
          pendingStatusChange === TenantStatus.SUSPENDED
            ? 'Suspend Organization'
            : pendingStatusChange === TenantStatus.ARCHIVED
            ? 'Archive Organization'
            : 'Reactivate Organization'
        }`}
        cancelLabel="Cancel"
        variant={pendingStatusChange === TenantStatus.ACTIVE ? 'primary' : 'danger'}
        isPending={isSubmitting}
      />
    </div>
  );
}
