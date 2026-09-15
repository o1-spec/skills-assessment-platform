import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { getCampaignById } from '@/services';
import { CampaignStatus, CompetencyType, AssessmentStatus } from '@prisma/client';

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

  const technicalComps = campaign.competencies.filter(
    (c) => c.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralComps = campaign.competencies.filter(
    (c) => c.competency.type === CompetencyType.BEHAVIORAL
  );

  // Calculate assessment counts
  const totalAssessments = campaign.assessments.length;
  const completedAssessments = campaign.assessments.filter(
    (a) => a.status === AssessmentStatus.COMPLETED
  ).length;
  const inProgressOrSubmitted = campaign.assessments.filter(
    (a) =>
      a.status === AssessmentStatus.DRAFT ||
      a.status === AssessmentStatus.SUBMITTED ||
      a.status === AssessmentStatus.PENDING_CORROBORATION
  ).length;
  const notStartedAssessments = campaign.assessments.filter(
    (a) => a.status === AssessmentStatus.NOT_STARTED
  ).length;

  const isDraft = campaign.status === CampaignStatus.DRAFT;
  const isActive = campaign.status === CampaignStatus.ACTIVE;

  // Build a map of userId -> assessment for quick lookup in the participant roster
  const assessmentByUserMap = new Map(
    campaign.assessments.map((assessment) => [assessment.userId, assessment])
  );

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
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isDraft
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-100 text-gray-700 border border-gray-200'
                }`}
            >
              {campaign.status}
            </span>
          </div>

          <div className="mt-4 sm:mt-0">
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

      {/* DRAFT Warning Banner if applicable */}
      {isDraft && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-amber-800">Draft Campaign</h3>
              <div className="mt-1 text-xs text-amber-700">
                This campaign is saved as a draft. Staff assessment records are not created until a campaign is launched as Active.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Meta Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Participants</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{campaign.participants.length}</div>
          <div className="mt-1 text-xs text-gray-500">Staff members enrolled</div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Competencies</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{campaign.competencies.length}</div>
          <div className="mt-1 text-xs text-gray-500">
            {technicalComps.length} Tech / {behavioralComps.length} Behav
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Assessment Status</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">
            {completedAssessments} / {totalAssessments}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {notStartedAssessments} Not Started, {inProgressOrSubmitted} In Progress
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Deadline</div>
          <div className="mt-1 text-lg font-bold text-gray-900">
            {new Date(campaign.deadline).toLocaleDateString(undefined, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {campaign.requiresCorroboration ? (
              <span className="inline-flex items-center text-blue-700 font-medium">
                Manager Corroboration Required
              </span>
            ) : (
              <span className="text-gray-500">Self-assessment only</span>
            )}
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

      {/* Competencies Section */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Assessed Competencies</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Competencies evaluated in this assessment campaign.
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

      {/* Participants & Assessment Roster */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900">Assigned Staff Participants</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Staff members enrolled in this campaign and their current assessment status.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
            {campaign.participants.length} enrolled
          </span>
        </div>

        {campaign.participants.length === 0 ? (
          <p className="text-sm text-gray-400 italic">No participants enrolled in this campaign.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Staff Member
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assessment Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {campaign.participants.map((p) => {
                  const assessment = assessmentByUserMap.get(p.userId);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {p.user.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {p.user.email}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {assessment ? (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${assessment.status === AssessmentStatus.COMPLETED
                                ? 'bg-emerald-100 text-emerald-800'
                                : assessment.status === AssessmentStatus.PENDING_CORROBORATION
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : assessment.status === AssessmentStatus.SUBMITTED
                                    ? 'bg-purple-100 text-purple-800'
                                    : assessment.status === AssessmentStatus.DRAFT
                                      ? 'bg-blue-100 text-blue-800'
                                      : 'bg-gray-100 text-gray-800'
                              }`}
                          >
                            {assessment.status.replace('_', ' ')}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 italic">
                            {isDraft ? 'Pending activation' : 'Not generated'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
