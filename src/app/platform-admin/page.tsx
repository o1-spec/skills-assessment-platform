import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';
import { PageHeader, StatCard, SectionCard, StatusBadge } from '@/components/app';
import { getTenantsForPlatformAdmin } from '@/services/tenants';

export default async function PlatformAdminPage() {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);

  const [tenantCount, userCount, frameworkCount, competencyCount, allTenants] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.frameworkVersion.count(),
    prisma.frameworkCompetency.count(),
    getTenantsForPlatformAdmin(),
  ]);

  const recentTenants = allTenants.slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Global SaaS tenant oversight, canonical competency frameworks, and platform-wide metrics."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-neutral-900 text-white">
            Root Control Plane
          </span>
        }
        actions={
          <>
            <Link
              href="/platform-admin/tenants"
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl text-neutral-700 bg-white border border-stone-200/80 shadow-2xs hover:bg-stone-50 transition-colors"
            >
              Manage Tenants
            </Link>
            <Link
              href="/platform-admin/tenants/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors"
            >
              <span>+</span>
              <span>Provision Organization</span>
            </Link>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Active Organizations"
          value={tenantCount}
          subtext="Multi-tenant SaaS accounts"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
        <StatCard
          label="Total Users"
          value={userCount}
          subtext="Across all tenant roles"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
        />
        <StatCard
          label="Framework Versions"
          value={frameworkCount}
          subtext="Canonical master models"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
          }
        />
        <StatCard
          label="Canonical Competencies"
          value={competencyCount}
          subtext="Standardized skills catalog"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Recent Organizations"
            subtitle="Recently provisioned tenant accounts and current seat utilization"
            action={
              <Link
                href="/platform-admin/tenants"
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                View all →
              </Link>
            }
            noPadding
          >
            {recentTenants.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No organizations provisioned yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Organization</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Plan</th>
                      <th className="py-3 px-4">Seats</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs text-neutral-700">
                    {recentTenants.map((t) => (
                      <tr key={t.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-neutral-900">
                          <div>{t.name}</div>
                          <div className="text-[11px] text-neutral-400 font-mono font-normal">
                            {t.slug}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={t.status} />
                        </td>
                        <td className="py-3.5 px-4 font-medium text-neutral-600">
                          {t.plan?.name || 'Custom'}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-neutral-600">
                          {t.activeUsersCount} / {t.seatLimit ?? '∞'}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            href={`/platform-admin/tenants/${t.id}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                          >
                            Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard
            title="SaaS Architecture"
            subtitle="Tenant isolation & security principles"
          >
            <div className="space-y-3 text-xs text-neutral-600 leading-relaxed">
              <p>
                Platform Administrators control global tenancy, pricing plans, and canonical frameworks.
              </p>
              <p>
                Each tenant operates in complete data isolation. Role profiles, assessment campaigns, and corroboration data remain strictly partitioned.
              </p>
              <div className="pt-2">
                <div className="rounded-xl p-3 bg-stone-50 border border-stone-200/60">
                  <div className="text-[11px] font-semibold text-neutral-900">Active Scope</div>
                  <div className="text-[11px] text-neutral-500 font-mono mt-0.5">
                    {user.email} &bull; {user.role}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard
            title="Quick Shortcuts"
            subtitle="Platform configuration tools"
          >
            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/platform-admin/plans"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all text-xs font-semibold text-neutral-800"
              >
                Subscription Plans
              </Link>
              <Link
                href="/platform-admin/templates"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all text-xs font-semibold text-neutral-800"
              >
                Industry Templates
              </Link>
              <Link
                href="/platform-admin/frameworks"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all text-xs font-semibold text-neutral-800"
              >
                Framework Catalog
              </Link>
              <Link
                href="/platform-admin/audit"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all text-xs font-semibold text-neutral-800"
              >
                Audit Trail
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
