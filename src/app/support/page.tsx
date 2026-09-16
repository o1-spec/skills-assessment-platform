import { requireRole } from '@/lib/auth';
import { UserRole, TenantStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { startImpersonationAction, endImpersonationAction } from '@/actions/impersonation';
import { PageHeader, SectionCard } from '@/components/app';

export const metadata = {
  title: 'Support Dashboard | Skills Assessment Platform',
  description: 'Support account landing page and customer troubleshooting access.',
};

export default async function SupportPage() {
  const user = await requireRole(UserRole.SUPPORT);

  const tenants = await prisma.tenant.findMany({
    where: {
      status: { in: [TenantStatus.ACTIVE, TenantStatus.PENDING_ONBOARDING] },
    },
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      _count: {
        select: { users: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  const isImpersonating = Boolean(user.impersonation?.isImpersonating);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Support Operations"
        description="Customer support portal and scoped tenant troubleshooting access."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            Support Agent
          </span>
        }
      />

      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center shrink-0">
            <span className="text-base font-bold text-amber-800">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-900">{user.name}</p>
            <p className="text-xs text-neutral-500 font-mono mt-0.5">{user.email}</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-neutral-700 bg-stone-100 border border-stone-200 px-3 py-1 rounded-full">
            Active Identity
          </span>
        </div>
      </div>

      <SectionCard
        title="Customer Tenant Troubleshooting Mode"
        subtitle="Access an organization portal in restricted troubleshooting mode to diagnose customer issues. Every session requires a logged reason and is strictly audited."
      >
        {isImpersonating ? (
          <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900">
                  Active Troubleshooting Session
                </span>
                <p className="text-base font-bold text-neutral-900 mt-0.5">
                  {user.impersonation?.impersonatedTenantName}
                </p>
                <p className="text-xs text-amber-800 mt-1">
                  Reason: &ldquo;{user.impersonation?.reason}&rdquo;
                </p>
              </div>
              <form action={endImpersonationAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
                >
                  Exit Session
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form action={startImpersonationAction} className="space-y-4 max-w-2xl">
            <div>
              <label htmlFor="tenantId" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Target Organization
              </label>
              <select
                id="tenantId"
                name="tenantId"
                required
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs"
              >
                <option value="">Select organization to diagnose...</option>
                {tenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.slug}) &bull; {t._count.users} users &bull; {t.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="reason" className="block text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
                Troubleshooting Reason (Required for Audit Log)
              </label>
              <input
                id="reason"
                name="reason"
                type="text"
                required
                minLength={5}
                placeholder="e.g., Ticket #4910: Investigating campaign corroboration delay"
                className="w-full bg-white border border-stone-200 rounded-xl px-3.5 py-2.5 text-xs text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900 shadow-2xs"
              />
              <p className="text-[11px] text-neutral-400 mt-1">
                Minimum 5 characters. Retained permanently in the compliance audit trail.
              </p>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white font-semibold text-xs rounded-xl transition-colors shadow-2xs"
            >
              Enter Troubleshooting Session
            </button>
          </form>
        )}
      </SectionCard>

      <SectionCard
        title="Security & Operational Guardrails"
        subtitle="Support sessions enforce strict separation of duties and destructive action restrictions."
        noPadding
      >
        <div className="divide-y divide-stone-100">
          {[
            { label: 'Enter tenant in scoped troubleshooting mode', allowed: true },
            { label: 'Audit logging of session initiation and exit', allowed: true },
            { label: 'Tenant deletion / archiving', allowed: false },
            { label: 'Modifying subscription plans', allowed: false },
            { label: 'Platform user administration', allowed: false },
          ].map(({ label, allowed }) => (
            <div key={label} className="flex items-center justify-between px-5 py-3.5">
              <span className="text-xs text-neutral-700">{label}</span>
              {allowed ? (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  Authorized
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Restricted Guardrail
                </span>
              )}
            </div>
          ))}
        </div>
      </SectionCard>
    </div>
  );
}
