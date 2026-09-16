import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getPlatformAnalytics } from '@/services/platform-analytics';

export const metadata = {
  title: 'Platform Analytics & Benchmarking | Skills Assessment Platform',
  description: 'Macro-level operational analytics across tenants and framework adoption.',
};

export default async function PlatformAnalyticsPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);
  const data = await getPlatformAnalytics();

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Analytics &amp; Cross-Tenant Metrics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Macro-level operational aggregates across all registered organizations, framework adoption, and campaign completions.
        </p>
      </div>

      {/* Privacy Notice Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3.5">
        <div className="text-blue-600 mt-0.5 shrink-0">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold text-blue-900">Multi-Tenant Privacy Boundary</h2>
          <p className="text-xs text-blue-700 mt-1 leading-relaxed">
            {data.benchmarkingNotice.notice}
          </p>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Tenants */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Organizations</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{data.tenants.total}</span>
            <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              {data.tenants.active} Active
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-x-2">
            <span>{data.tenants.suspended} Suspended</span>
            <span>&bull;</span>
            <span>{data.tenants.pendingOnboarding} Onboarding</span>
          </div>
        </div>

        {/* Users */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Total Accounts</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{data.users.total}</span>
            <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
              {data.users.active} Active
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-x-2">
            <span>{data.users.tenantUsers} Tenant Staff</span>
            <span>&bull;</span>
            <span>{data.users.platformUsers} Platform Staff</span>
          </div>
        </div>

        {/* Campaigns */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Assessment Campaigns</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{data.campaigns.total}</span>
            <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
              {data.campaigns.active} Active
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-x-2">
            <span>{data.campaigns.closed} Closed</span>
            <span>&bull;</span>
            <span>{data.campaigns.draft} Draft</span>
          </div>
        </div>

        {/* Assessments & Completion Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Completion Rate</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold text-gray-900">{data.assessments.completionRate}%</span>
            <span className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
              {data.assessments.completed} / {data.assessments.total}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 space-x-2">
            <span>{data.assessments.submitted} Pending Review</span>
            <span>&bull;</span>
            <span>{data.assessments.draft} In Progress</span>
          </div>
        </div>
      </div>

      {/* Two Column Section: Framework Adoption & Industry Template Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Framework Version Adoption */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Framework Version Adoption</h2>
            <span className="text-xs text-gray-500 font-medium">Active Tenants</span>
          </div>
          {data.frameworkAdoptionDistribution.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">No framework versions currently adopted by active organizations.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.frameworkAdoptionDistribution.map((item) => (
                <div key={item.frameworkVersionId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Version {item.version}</p>
                    <p className="text-xs text-gray-400 font-mono">ID: {item.frameworkVersionId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{item.activeTenantCount}</span>
                    <span className="text-xs text-gray-500">tenants</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Industry Template Adoption */}
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Industry Starter Adoption</h2>
            <span className="text-xs text-gray-500 font-medium">Active Tenants</span>
          </div>
          {data.industryTemplateUsage.length === 0 ? (
            <p className="text-sm text-gray-500 italic py-4">No organizations currently provisioned with industry templates.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.industryTemplateUsage.map((item) => (
                <div key={item.templateId} className="py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.templateName}</p>
                    <p className="text-xs text-gray-400 font-mono">ID: {item.templateId}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-900">{item.tenantCount}</span>
                    <span className="text-xs text-gray-500">tenants</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Role Breakdown Table */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm space-y-4">
        <h2 className="text-base font-semibold text-gray-900">User Distribution by Role</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          {Object.entries(data.users.byRole).map(([role, count]) => (
            <div key={role} className="bg-gray-50 rounded-lg p-3 border border-gray-200/60">
              <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{role}</span>
              <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
