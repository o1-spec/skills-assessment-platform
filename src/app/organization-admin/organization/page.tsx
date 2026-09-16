import Link from 'next/link';
import { requireRole } from '@/lib/auth/guards';
import { getDepartmentsForTenant, getTeamsForTenant } from '@/services/organization-structure';
import { getOrganizationProfile, getIndustryTemplatesForOrgAdmin } from '@/services/tenants';
import { getTenantNotificationSettings } from '@/services/tenant-notification-settings';
import { OrgProfileActions } from './org-profile-actions';
import { TenantNotificationSettingsCard } from './tenant-notification-settings-card';

export const metadata = { title: 'Organization Management | Skills Assessment Platform' };

export default async function OrganizationPage() {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const [departments, teams, profile, templates, notificationSettings] = await Promise.all([
    getDepartmentsForTenant(tenantId),
    getTeamsForTenant(tenantId),
    getOrganizationProfile(tenantId),
    getIndustryTemplatesForOrgAdmin(),
    getTenantNotificationSettings(tenantId),
  ]);

  const activeDepts = departments.filter((d) => d.isActive);
  const inactiveDepts = departments.filter((d) => !d.isActive);
  const activeTeams = teams.filter((t) => t.isActive);
  const inactiveTeams = teams.filter((t) => !t.isActive);

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {profile && (
        <OrgProfileActions
          initialProfile={profile}
          templates={templates}
        />
      )}

      <TenantNotificationSettingsCard initialSettings={notificationSettings} />
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Structure</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage departments and teams within your organization.
          </p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/organization-admin/organization/departments/new"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + New Department
          </Link>
          <Link
            href="/organization-admin/organization/teams/new"
            className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            + New Team
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Active Departments', value: activeDepts.length, color: 'text-blue-600' },
          { label: 'Inactive Departments', value: inactiveDepts.length, color: 'text-gray-400' },
          { label: 'Active Teams', value: activeTeams.length, color: 'text-green-600' },
          { label: 'Inactive Teams', value: inactiveTeams.length, color: 'text-gray-400' },
        ].map((stat) => (
          <div key={stat.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      <section className="mb-10">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Departments</h2>
        {departments.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No departments yet.</p>
            <Link
              href="/organization-admin/organization/departments/new"
              className="inline-flex mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Create your first department
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {departments.map((dept) => (
              <Link
                key={dept.id}
                href={`/organization-admin/organization/departments/${dept.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${dept.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">
                      {dept.name}
                    </p>
                    {dept.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{dept.description}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <span className="text-sm text-gray-500">
                    {dept.teams.length} team{dept.teams.length !== 1 ? 's' : ''}
                  </span>
                  {!dept.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">All Teams</h2>
        {teams.length === 0 ? (
          <div className="bg-gray-50 border border-dashed border-gray-300 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No teams yet.</p>
            <Link
              href="/organization-admin/organization/teams/new"
              className="inline-flex mt-3 px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Create your first team
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={`/organization-admin/organization/teams/${team.id}`}
                className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-blue-300 hover:shadow-sm transition-all group"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${team.isActive ? 'bg-green-500' : 'bg-gray-300'}`}
                  />
                  <div>
                    <p className="font-medium text-gray-900 group-hover:text-blue-700">
                      {team.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {team.department ? team.department.name : 'No department'}
                      {team.manager ? ` · ${team.manager.name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    {team.memberships.length} member{team.memberships.length !== 1 ? 's' : ''}
                  </span>
                  {!team.isActive && (
                    <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                      Inactive
                    </span>
                  )}
                  <svg
                    className="w-4 h-4 text-gray-400 group-hover:text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
