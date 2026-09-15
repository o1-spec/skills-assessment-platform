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
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/campaigns" className="hover:text-gray-900 transition-colors">
                Campaigns
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
              {campaign.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{campaign.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isDraft
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-gray-100 text-gray-700 border border-gray-200'
              }`}
            >
              {formatCampaignStatus(campaign.status)}
            </span>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            {isDraft && (
              <Link
                href={`/organization-admin/campaigns/${campaign.id}/edit`}
                className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
              >
                Edit Draft
              </Link>
            )}
            <Link
              href="/organization-admin/campaigns"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Campaigns
            </Link>
          </div>
        </div>

        {campaign.description && (
          <p className="mt-2 text-sm text-gray-600 max-w-3xl">{campaign.description}</p>
        )}
      </div>

      {/* Campaign Details Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Deadline</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {formatDate(campaign.deadline)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {new Date(campaign.deadline) < new Date() && campaign.status !== CampaignStatus.CLOSED ? (
              <span className="text-red-600 font-semibold">Deadline passed</span>
            ) : (
              <span>Target completion date</span>
            )}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Corroboration</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {campaign.requiresCorroboration ? 'Required' : 'Self-Assessment Only'}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {campaign.requiresCorroboration
              ? 'Managers must corroborate'
              : 'Direct staff completion'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Assessed Competencies</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {campaign.competencies.length}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {technicalComps.length} Technical, {behavioralComps.length} Behavioral
          </div>
        </div>
      </div>

      {/* Linked Role Profile Details if any */}
      {campaign.roleProfile && (
        <div className="bg-indigo-50/50 rounded-lg border border-indigo-100 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-semibold uppercase text-indigo-700">Linked Role Profile:</span>
              <span className="text-sm font-bold text-gray-900">{campaign.roleProfile.name}</span>
            </div>
            <Link
              href={`/organization-admin/roles/${campaign.roleProfile.id}`}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
            >
              View Role Profile &rarr;
            </Link>
          </div>
          {campaign.roleProfile.description && (
            <p className="mt-1 text-xs text-gray-600">{campaign.roleProfile.description}</p>
          )}
        </div>
      )}

      {/* Interactive Monitoring Dashboard */}
      <CampaignMonitoringView campaign={campaign} stats={stats} />

      {/* Competencies Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Assessed Competencies</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Competencies evaluated in this assessment cycle.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
            {campaign.competencies.length} total
          </span>
        </div>

        {campaign.competencies.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No competencies assigned to this campaign.</p>
        ) : (
          <div className="space-y-6">
            {/* Technical */}
            {technicalComps.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-3">
                  Technical Competencies ({technicalComps.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {technicalComps.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-gray-900">
                            {c.competency.name}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                            Technical
                          </span>
                        </div>
                        {c.competency.description && (
                          <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                            {c.competency.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200/60 text-[11px] text-gray-500">
                        {c.competency.levels.length} Mastery Levels Defined
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavioral */}
            {behavioralComps.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-3">
                  Behavioral Competencies ({behavioralComps.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {behavioralComps.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-lg border border-gray-200 bg-gray-50/50 flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-sm text-gray-900">
                            {c.competency.name}
                          </span>
                          <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                            Behavioral
                          </span>
                        </div>
                        {c.competency.description && (
                          <p className="mt-1 text-xs text-gray-600 line-clamp-2">
                            {c.competency.description}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200/60 text-[11px] text-gray-500">
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
