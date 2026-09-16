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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {profile && (
        <OrgProfileActions
          initialProfile={profile}
          templates={templates}
        />
      )}

      <TenantNotificationSettingsCard initialSettings={notificationSettings} />

      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Organization Structure</h1>
            <p className="text-sm text-stone-500 mt-1">
              Manage departments and teams within your organization.
            </p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/organization-admin/organization/departments/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              + New Department
            </Link>
            <Link
              href="/organization-admin/organization/teams/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl border border-stone-200/80 bg-white text-neutral-700 text-xs font-semibold hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
            >
              + New Team
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Active Departments', value: activeDepts.length, color: 'text-neutral-900' },
            { label: 'Inactive Departments', value: inactiveDepts.length, color: 'text-stone-400' },
            { label: 'Active Teams', value: activeTeams.length, color: 'text-emerald-700' },
            { label: 'Inactive Teams', value: inactiveTeams.length, color: 'text-stone-400' },
          ].map((stat) => (
            <div key={stat.label} className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
              <p className={`text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-stone-500 mt-1 font-medium">{stat.label}</p>
            </div>
          ))}
        </div>

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">Departments</h2>
          {departments.length === 0 ? (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-stone-500 text-sm">No departments yet.</p>
              <Link
                href="/organization-admin/organization/departments/new"
                className="inline-flex mt-3 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 shadow-2xs transition-colors"
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
                  className="flex items-center justify-between bg-white border border-stone-200/80 rounded-2xl px-5 py-4 hover:border-stone-400 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${dept.isActive ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    />
                    <div>
                      <p className="font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                        {dept.name}
                      </p>
                      {dept.description && (
                        <p className="text-xs text-stone-500 mt-0.5">{dept.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-right">
                    <span className="text-xs text-stone-500 font-medium">
                      {dept.teams.length} team{dept.teams.length !== 1 ? 's' : ''}
                    </span>
                    {!dept.isActive && (
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200/80">
                        Inactive
                      </span>
                    )}
                    <svg
                      className="w-4 h-4 text-stone-400 group-hover:text-neutral-900 transition-colors"
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

        <section className="space-y-4">
          <h2 className="text-lg font-bold text-neutral-900">All Teams</h2>
          {teams.length === 0 ? (
            <div className="bg-white border border-stone-200/80 rounded-2xl p-8 text-center shadow-xs">
              <p className="text-stone-500 text-sm">No teams yet.</p>
              <Link
                href="/organization-admin/organization/teams/new"
                className="inline-flex mt-3 px-4 py-2.5 rounded-xl bg-neutral-900 text-white text-xs font-semibold hover:bg-neutral-800 shadow-2xs transition-colors"
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
                  className="flex items-center justify-between bg-white border border-stone-200/80 rounded-2xl px-5 py-4 hover:border-stone-400 hover:shadow-xs transition-all group"
                >
                  <div className="flex items-center gap-3.5">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 ${team.isActive ? 'bg-emerald-500' : 'bg-stone-300'}`}
                    />
                    <div>
                      <p className="font-semibold text-neutral-900 group-hover:text-neutral-700 transition-colors">
                        {team.name}
                      </p>
                      <p className="text-xs text-stone-500 mt-0.5">
                        {team.department ? team.department.name : 'No department'}
                        {team.manager ? ` · ${team.manager.name}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-stone-500 font-medium">
                      {team.memberships.length} member{team.memberships.length !== 1 ? 's' : ''}
                    </span>
                    {!team.isActive && (
                      <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full border border-stone-200/80">
                        Inactive
                      </span>
                    )}
                    <svg
                      className="w-4 h-4 text-stone-400 group-hover:text-neutral-900 transition-colors"
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
    </div>
  );
}
