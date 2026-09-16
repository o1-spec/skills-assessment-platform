import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { getCampaignById, getCampaignMonitoringStats } from '@/services';
import { CampaignStatus, CompetencyType } from '@prisma/client';
import { formatDate, formatCampaignStatus } from '@/lib/format';
import { CampaignMonitoringView } from './campaign-monitoring-view';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CampaignDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  const campaign = await getCampaignById(id, user.tenantId);

  if (!campaign) {
    notFound();
  }

  const stats = await getCampaignMonitoringStats(user.tenantId, id);

  if (!stats) {
    notFound();
  }

  const technicalComps = campaign.competencies.filter(
    (c) => c.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralComps = campaign.competencies.filter(
    (c) => c.competency.type === CompetencyType.BEHAVIORAL
  );

  const isDraft = campaign.status === CampaignStatus.DRAFT;
  const isActive = campaign.status === CampaignStatus.ACTIVE;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <nav className="flex text-xs font-semibold text-neutral-500 mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/campaigns" className="hover:text-neutral-900 transition-colors">
                Campaigns
              </Link>
            </li>
            <li>
              <span className="text-neutral-300">/</span>
            </li>
            <li className="text-neutral-900 font-bold truncate max-w-xs" aria-current="page">
              {campaign.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{campaign.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                  : isDraft
                  ? 'bg-stone-100 text-stone-700 border-stone-200/80'
                  : 'bg-stone-50 text-stone-500 border-stone-200/60'
              }`}
            >
              {formatCampaignStatus(campaign.status)}
            </span>
          </div>

          <div className="mt-4 sm:mt-0 flex flex-wrap items-center gap-2">
            <a
              href={`/api/reports/campaigns/${campaign.id}/pdf`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Download PDF Summary
            </a>
            {isDraft && (
              <Link
                href={`/organization-admin/campaigns/${campaign.id}/edit`}
                className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
              >
                Edit Draft
              </Link>
            )}
            <Link
              href="/organization-admin/campaigns"
              className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              &larr; Back to Campaigns
            </Link>
          </div>
        </div>

        {campaign.description && (
          <p className="mt-2 text-xs text-neutral-600 max-w-3xl leading-relaxed">{campaign.description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Deadline</div>
          <div className="mt-1 text-lg font-bold text-neutral-900 tracking-tight">
            {formatDate(campaign.deadline)}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {new Date(campaign.deadline) < new Date() && campaign.status !== CampaignStatus.CLOSED ? (
              <span className="text-red-600 font-semibold">Deadline passed</span>
            ) : (
              <span>Target completion date</span>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Corroboration</div>
          <div className="mt-1 text-lg font-bold text-neutral-900 tracking-tight">
            {campaign.requiresCorroboration ? 'Required' : 'Self-Assessment Only'}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {campaign.requiresCorroboration
              ? 'Managers must corroborate'
              : 'Direct staff completion'}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Assessed Competencies</div>
          <div className="mt-1 text-lg font-bold text-neutral-900 tracking-tight">
            {campaign.competencies.length}
          </div>
          <div className="mt-1 text-xs text-neutral-500">
            {technicalComps.length} Technical, {behavioralComps.length} Behavioral
          </div>
        </div>
      </div>

      {campaign.roleProfile && (
        <div className="bg-stone-50 rounded-2xl border border-stone-200/80 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">Linked Role Profile:</span>
              <span className="text-sm font-bold text-neutral-900">{campaign.roleProfile.name}</span>
            </div>
            <Link
              href={`/organization-admin/roles/${campaign.roleProfile.id}`}
              className="text-xs font-semibold text-neutral-900 hover:underline"
            >
              View Role Profile &rarr;
            </Link>
          </div>
          {campaign.roleProfile.description && (
            <p className="mt-1 text-xs text-neutral-600">{campaign.roleProfile.description}</p>
          )}
        </div>
      )}

      <CampaignMonitoringView campaign={campaign} stats={stats} />

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-6">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Assessed Competencies</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Competencies evaluated in this assessment cycle.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200/60">
            {campaign.competencies.length} total
          </span>
        </div>

        {campaign.competencies.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">No competencies assigned to this campaign.</p>
        ) : (
          <div className="space-y-6">
            {technicalComps.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Technical Competencies ({technicalComps.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {technicalComps.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-neutral-900">
                            {c.competency.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-200/70 text-neutral-800">
                            Technical
                          </span>
                        </div>
                        {c.competency.description && (
                          <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                            {c.competency.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-stone-200/60 text-[11px] text-neutral-500">
                        {c.competency.levels.length} Mastery Levels Defined
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {behavioralComps.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">
                  Behavioral Competencies ({behavioralComps.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {behavioralComps.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl border border-stone-200/80 bg-stone-50/40 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-neutral-900">
                            {c.competency.name}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-200/70 text-neutral-800">
                            Behavioral
                          </span>
                        </div>
                        {c.competency.description && (
                          <p className="mt-1 text-xs text-neutral-600 line-clamp-2 leading-relaxed">
                            {c.competency.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-3 pt-2.5 border-t border-stone-200/60 text-[11px] text-neutral-500">
                        {c.competency.levels.length} Mastery Levels Defined
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
