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
      <div className="sm:flex sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Assessment Campaigns</h1>
          <p className="mt-1 text-xs text-neutral-500">
            Launch and monitor periodic skills assessment cycles across your staff.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Link
            href="/organization-admin/campaigns/new"
            className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer gap-2"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
            Create Campaign
          </Link>
        </div>
      </div>

      {campaigns.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-dashed border-stone-300 p-12 shadow-xs">
          <svg className="mx-auto h-12 w-12 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-3 text-sm font-bold text-neutral-900">No assessment campaigns yet</h3>
          <p className="mt-1 text-xs text-neutral-500 max-w-sm mx-auto">
            Launch your first campaign to begin collecting self-assessments and manager corroborations.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/campaigns/new"
              className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer"
            >
              Create Campaign
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
          <ul className="divide-y divide-stone-100">
            {campaigns.map((camp) => {
              const statusBadgeStyles = {
                [CampaignStatus.ACTIVE]: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
                [CampaignStatus.DRAFT]: 'bg-stone-100 text-stone-700 border-stone-200/80',
                [CampaignStatus.CLOSED]: 'bg-stone-50 text-stone-500 border-stone-200/60',
              }[camp.status];

              const teamNames = camp.campaignTeams?.map((ct) => ct.team.name).join(', ');

              return (
                <li key={camp.id} className="hover:bg-stone-50/60 transition-colors group">
                  <Link href={`/organization-admin/campaigns/${camp.id}`} className="block p-5 sm:p-6">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-neutral-900 group-hover:underline">
                          {camp.name}
                        </span>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeStyles}`}
                        >
                          {formatCampaignStatus(camp.status)}
                        </span>
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-stone-100 text-stone-700 border-stone-200/80"
                        >
                          {camp.scope === CampaignScope.ORGANIZATION
                            ? 'Org-wide'
                            : camp.scope === CampaignScope.TEAM
                            ? `Team: ${teamNames || 'Selected Teams'}`
                            : 'Individual'}
                        </span>
                        {camp.requiresCorroboration && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                            Manager Review Required
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-neutral-500 shrink-0">
                        Deadline:{' '}
                        <span className="font-semibold text-neutral-900">
                          {formatDate(camp.deadline)}
                        </span>
                      </div>
                    </div>

                    {camp.description && (
                      <p className="mt-2 text-xs text-neutral-600 line-clamp-2 leading-relaxed">{camp.description}</p>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-neutral-500 border-t border-stone-100 pt-3">
                      <div>
                        <span className="font-semibold text-neutral-900">{camp._count.participants}</span>{' '}
                        {camp._count.participants === 1 ? 'participant' : 'participants'}
                      </div>
                      <div>
                        <span className="font-semibold text-neutral-900">{camp._count.competencies}</span>{' '}
                        {camp._count.competencies === 1 ? 'competency' : 'competencies'}
                      </div>
                      {camp.roleProfile && (
                        <div className="text-neutral-600">
                          Template: <span className="font-semibold text-neutral-900">{camp.roleProfile.name}</span>
                        </div>
                      )}
                      <div className="ml-auto font-semibold text-xs text-neutral-900 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
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
