import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import {
  getRoleProfilesForTenant,
  getCampaignsForTenant,
  getGapAnalysisAssessmentsForTenant,
  getActiveFrameworkAdoptionForTenant,
  getUsersForTenant,
} from '@/services';
import { PageHeader, StatCard, SectionCard, StatusBadge } from '@/components/app';
import { formatDate } from '@/lib/format';
import { OrgAdminOnboardingCard } from './onboarding-card';

export default async function OrganizationAdminOverviewPage() {
  const user = await requireTenantUser();

  const [roleProfiles, campaigns, completedGapAssessments, frameworkAdoption, tenantUsers] = await Promise.all([
    getRoleProfilesForTenant(user.tenantId).catch(() => []),
    getCampaignsForTenant(user.tenantId).catch(() => []),
    getGapAnalysisAssessmentsForTenant(user.tenantId).catch(() => []),
    getActiveFrameworkAdoptionForTenant(user.tenantId).catch(() => null),
    getUsersForTenant(user.tenantId).catch(() => []),
  ]);

  const activeCampaigns = campaigns.filter((c) => c.status === 'ACTIVE');
  const totalIdentifiedGaps = completedGapAssessments.reduce(
    (acc, a) => acc + (a?.totalGapPoints ?? 0),
    0
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Organization Overview"
        description="Manage your organization benchmarks, competencies, assessment campaigns, and skill gap analyses."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {user.tenant?.name || 'Organization'}
          </span>
        }
        actions={
          <>
            <Link
              href="/organization-admin/roles"
              className="inline-flex items-center px-3.5 py-2 text-xs font-semibold rounded-xl text-neutral-700 bg-white border border-stone-200/80 shadow-2xs hover:bg-stone-50 transition-colors"
            >
              Role Profiles
            </Link>
            <Link
              href="/organization-admin/campaigns/new"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors"
            >
              <span>+</span>
              <span>New Campaign</span>
            </Link>
          </>
        }
      />

      <OrgAdminOnboardingCard
        tenantName={user.tenant?.name || 'Organization'}
        hasRoleProfiles={roleProfiles.length > 0}
        hasCampaigns={campaigns.length > 0}
        hasUsers={tenantUsers.length > 1}
        hasFramework={Boolean(frameworkAdoption?.isActive)}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Role Profiles"
          value={roleProfiles.length}
          subtext="Configured role benchmarks"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          }
        />
        <StatCard
          label="Campaigns"
          value={campaigns.length}
          subtext={`${activeCampaigns.length} currently active`}
          badge={
            activeCampaigns.length > 0
              ? { text: `${activeCampaigns.length} Active`, trend: 'up' }
              : undefined
          }
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
        <StatCard
          label="Gap Analyses"
          value={completedGapAssessments.length}
          subtext={`${totalIdentifiedGaps} total skill gap points`}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" />
            </svg>
          }
        />
        <StatCard
          label="Organization Scope"
          value={user.tenant?.name || 'Organization'}
          subtext={user.tenant?.slug ? `slug: ${user.tenant.slug}` : 'Configured workspace'}
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <SectionCard
            title="Active & Recent Campaigns"
            subtitle="Assessment cycles tracking employee competency evaluations"
            action={
              <Link
                href="/organization-admin/campaigns"
                className="text-xs font-semibold text-neutral-600 hover:text-neutral-900 transition-colors"
              >
                View all campaigns →
              </Link>
            }
            noPadding
          >
            {campaigns.length === 0 ? (
              <div className="p-8 text-center text-xs text-neutral-500">
                No campaigns launched yet. Start by creating your first assessment campaign.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-stone-100 bg-stone-50/50 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                      <th className="py-3 px-5">Campaign Name</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Timeline</th>
                      <th className="py-3 px-5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 text-xs text-neutral-700">
                    {campaigns.slice(0, 5).map((camp) => (
                      <tr key={camp.id} className="hover:bg-stone-50/60 transition-colors">
                        <td className="py-3.5 px-5 font-semibold text-neutral-900">
                          {camp.name}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge status={camp.status} />
                        </td>
                        <td className="py-3.5 px-4 text-neutral-500 text-[11px]">
                          {camp.startDate ? formatDate(camp.startDate) : 'Not started'} – {formatDate(camp.deadline)}
                        </td>
                        <td className="py-3.5 px-5 text-right">
                          <Link
                            href={`/organization-admin/campaigns/${camp.id}`}
                            className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold text-neutral-700 hover:text-neutral-900 bg-stone-100 hover:bg-stone-200 transition-colors"
                          >
                            Details
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
            title="Quick Management"
            subtitle="Key administrative tools"
          >
            <div className="grid grid-cols-1 gap-2.5">
              <Link
                href="/organization-admin/users"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>Users & Team Roster</span>
                <span className="text-stone-400">→</span>
              </Link>
              <Link
                href="/organization-admin/skills"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>Skills Library</span>
                <span className="text-stone-400">→</span>
              </Link>
              <Link
                href="/organization-admin/roles"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>Role Profiles & Benchmarks</span>
                <span className="text-stone-400">→</span>
              </Link>
              <Link
                href="/organization-admin/career-paths"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>Career Progression Paths</span>
                <span className="text-stone-400">→</span>
              </Link>
              <Link
                href="/organization-admin/reports"
                className="p-3 rounded-xl border border-stone-200/80 hover:border-stone-300 hover:bg-stone-50 transition-all flex items-center justify-between text-xs font-semibold text-neutral-800"
              >
                <span>Excel & Analytics Reports</span>
                <span className="text-stone-400">→</span>
              </Link>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
