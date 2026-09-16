import { requireRole } from '@/lib/auth';
import { UserRole, TenantStatus } from '@prisma/client';
import { prisma } from '@/lib/db';
import { startImpersonationAction, endImpersonationAction } from '@/actions/impersonation';

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
      <div>
        <h1 className="text-2xl font-bold text-slate-100">Support Operations</h1>
        <p className="mt-1 text-sm text-slate-400">
          Customer support portal and tenant troubleshooting access.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
            <span className="text-xl font-bold text-amber-400">
              {user.name.charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-semibold text-slate-100">{user.name}</p>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>
          <span className="ml-auto text-xs font-semibold text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-1 rounded-full">
            Support Agent
          </span>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Customer Tenant Troubleshooting Mode
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Access an organization portal in restricted troubleshooting mode to diagnose customer issues. Every session requires a logged reason and is strictly audited under your account.
          </p>
        </div>

        {isImpersonating ? (
          <div className="bg-amber-950/40 border border-amber-800/40 rounded-lg p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Active Troubleshooting Session</span>
                <p className="text-base font-bold text-slate-100 mt-0.5">
                  {user.impersonation?.impersonatedTenantName}
                </p>
                <p className="text-xs text-amber-300 mt-1">
                  Reason: &ldquo;{user.impersonation?.reason}&rdquo;
                </p>
              </div>
              <form action={endImpersonationAction}>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-lg transition-colors shadow-sm"
                >
                  Exit Session
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form action={startImpersonationAction} className="space-y-4 max-w-2xl">
            <div>
              <label htmlFor="tenantId" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Target Organization
              </label>
              <select
                id="tenantId"
                name="tenantId"
                required
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
              <label htmlFor="reason" className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                Troubleshooting Reason (Required for Audit Log)
              </label>
              <input
                id="reason"
                name="reason"
                type="text"
                required
                minLength={5}
                placeholder="e.g., Ticket #4910: Investigating campaign corroboration delay"
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                Minimum 5 characters. Retained permanently in the compliance audit trail.
              </p>
            </div>

            <button
              type="submit"
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm rounded-lg transition-colors shadow-sm"
            >
              Enter Troubleshooting Session
            </button>
          </form>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl divide-y divide-slate-800">
        <div className="p-5">
          <h3 className="text-sm font-semibold text-slate-200">Security & Operational Guardrails</h3>
          <p className="text-xs text-slate-400 mt-1">
            Support sessions enforce strict separation of duties and destructive action restrictions.
          </p>
        </div>
        {[
          { label: 'Enter tenant in scoped troubleshooting mode', allowed: true },
          { label: 'Audit logging of session initiation and exit', allowed: true },
          { label: 'Tenant deletion / archiving', allowed: false },
          { label: 'Modifying subscription plans', allowed: false },
          { label: 'Platform user administration', allowed: false },
        ].map(({ label, allowed }) => (
          <div key={label} className="flex items-center justify-between px-5 py-3">
            <span className="text-sm text-slate-300">{label}</span>
            {allowed ? (
              <span className="text-xs font-medium text-emerald-400 bg-emerald-950/50 border border-emerald-800/40 px-2.5 py-0.5 rounded">
                Authorized
              </span>
            ) : (
              <span className="text-xs font-medium text-red-400 bg-red-950/50 border border-red-800/40 px-2.5 py-0.5 rounded">
                Restricted Guardrail
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
