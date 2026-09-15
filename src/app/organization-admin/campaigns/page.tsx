import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import { getCampaignsForTenant } from '@/services';
import { CampaignStatus, CampaignScope } from '@prisma/client';
import { formatDate, formatCampaignStatus } from '@/lib/format';

export default async function CampaignsListPage() {
  const user = await requireTenantUser();
  const campaigns = await getCampaignsForTenant(user.tenantId);

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Campaigns</h1>
          <p className="mt-1 text-sm text-gray-500">
            Launch and monitor periodic skills assessment cycles across your staff.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/organization-admin/campaigns/new"
            className="inline-flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <svg className="-ml-1 mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Campaign
          </Link>
        </div>
      </div>

      {/* Campaigns List */}
      {campaigns.length === 0 ? (
        <div className="text-center bg-white rounded-lg border border-dashed border-gray-300 p-12">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assessment campaigns yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            Launch your first campaign to begin collecting self-assessments and manager corroborations.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/campaigns/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
            >
              Create Campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {campaigns.map((camp) => {
              const statusBadgeStyles = {
                [CampaignStatus.ACTIVE]: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                [CampaignStatus.DRAFT]: 'bg-amber-50 text-amber-700 border-amber-200',
                [CampaignStatus.CLOSED]: 'bg-gray-50 text-gray-600 border-gray-200',
              }[camp.status];

              const teamNames = camp.campaignTeams?.map((ct) => ct.team.name).join(', ');

              return (
                <li key={camp.id} className="hover:bg-gray-50 transition-colors">
                  <Link href={`/organization-admin/campaigns/${camp.id}`} className="block p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-semibold text-blue-600 hover:underline">
                          {camp.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeStyles}`}
                        >
                          {formatCampaignStatus(camp.status)}
                        </span>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${
                            camp.scope === CampaignScope.ORGANIZATION
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : camp.scope === CampaignScope.TEAM
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          {camp.scope === CampaignScope.ORGANIZATION
                            ? '🏢 Org-wide'
                            : camp.scope === CampaignScope.TEAM
                            ? `👥 Team: ${teamNames || 'Selected Teams'}`
                            : '👤 Individual'}
                        </span>
                        {camp.requiresCorroboration && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                            Manager Review Required
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-gray-500 shrink-0">
                        Deadline:{' '}
                        <span className="font-medium text-gray-900">
                          {formatDate(camp.deadline)}
                        </span>
                      </div>
                    </div>

                    {camp.description && (
                      <p className="mt-2 text-sm text-gray-600 line-clamp-2">{camp.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
                      <div>
                        <span className="font-semibold text-gray-700">{camp._count.participants}</span>{' '}
                        {camp._count.participants === 1 ? 'participant' : 'participants'}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-700">{camp._count.competencies}</span>{' '}
                        {camp._count.competencies === 1 ? 'competency' : 'competencies'}
                      </div>
                      {camp.roleProfile && (
                        <div className="text-gray-600">
                          Template: <span className="font-medium text-gray-800">{camp.roleProfile.name}</span>
                        </div>
                      )}
                      <div className="ml-auto font-medium text-blue-600">
                        View campaign &rarr;
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
