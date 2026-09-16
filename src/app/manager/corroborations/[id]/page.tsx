import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getManagerCorroborationById } from '@/services';
import { AssessmentStatus, CompetencyType, UserRole } from '@prisma/client';
import { formatDate, formatAssessmentStatus } from '@/lib/format';
import { CorroborationForm } from './corroboration-form';
import { EvidenceAttachmentsSection } from '@/app/staff/assessments/[id]/evidence-attachments-section';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ManagerCorroborationDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  const assessment = await getManagerCorroborationById(id, user.id, user.tenantId);

  if (!assessment) {
    notFound();
  }

  const isCompleted = assessment.status === AssessmentStatus.COMPLETED;
  const isPending = assessment.status === AssessmentStatus.PENDING_CORROBORATION;

  const technicalItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.BEHAVIORAL
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/manager/corroborations" className="hover:text-gray-900 transition-colors">
                Corroborations
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
              {assessment.user.name} - {assessment.campaign.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Corroboration Review: {assessment.user.name}
              </h1>
              <span
                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                  isCompleted
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-purple-50 text-purple-700 border-purple-200'
                }`}
              >
                {formatAssessmentStatus(assessment.status)}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Campaign: <span className="font-medium text-gray-800">{assessment.campaign.name}</span>
            </p>
          </div>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/manager/corroborations"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Queue
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs text-gray-500 font-medium">Direct Report</div>
          <div className="mt-1 text-sm font-bold text-gray-900">{assessment.user.name}</div>
          <div className="text-xs text-gray-500">{assessment.user.email}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Submission Date</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {formatDate(assessment.submittedAt)}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Competencies</div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {technicalItems.length} Tech / {behavioralItems.length} Behav
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="rounded-md bg-emerald-50 p-4 border border-emerald-200">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-emerald-800">
                Corroboration Review Completed
              </h3>
              <p className="mt-1 text-xs text-emerald-700">
                This assessment evaluation was completed and finalized on{' '}
                {formatDate(assessment.completedAt)}. Final capability ratings are locked.
              </p>
            </div>
          </div>
        </div>
      )}

      {isPending ? (
        <CorroborationForm assessment={assessment} />
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 shadow-sm">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Finalized Competency Ratings</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Comparison between staff self-ratings and corroborated manager ratings.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                {assessment.items.length} competencies
              </span>
            </div>

            <div className="space-y-6">
              {assessment.items.map((item, idx) => {
                const staffLevel = item.competency.levels.find(
                  (l) => l.level === item.selfRating
                );
                const finalLevel = item.competency.levels.find(
                  (l) => l.level === item.finalRating
                );

                const isDifferent = item.selfRating !== item.finalRating;

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-lg border border-gray-200 bg-gray-50/40 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <h3 className="text-sm font-bold text-gray-900">{item.competency.name}</h3>
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${
                            item.competency.type === CompetencyType.TECHNICAL
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {item.competency.type}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Self: Level {item.selfRating ?? 'N/A'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                          Final: Level {item.finalRating ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-gray-700 bg-white p-3 rounded border border-gray-200 space-y-1">
                      <div className="font-semibold text-gray-900">
                        Staff Self-Assessment (Level {item.selfRating}):
                      </div>
                      {staffLevel && (
                        <p className="text-gray-600 italic mb-1.5">{staffLevel.description}</p>
                      )}
                      <div className="font-medium text-gray-700">Supporting Evidence:</div>
                      <p className="text-gray-800 whitespace-pre-wrap">
                        {item.evidenceText || 'No evidence provided.'}
                      </p>

                      <EvidenceAttachmentsSection
                        assessmentItemId={item.id}
                        assessmentId={assessment.id}
                        initialAttachments={item.attachments || []}
                        isReadOnly={true}
                        isManager={true}
                      />
                    </div>

                    <div className="text-xs text-gray-700 bg-white p-3 rounded border border-gray-200 space-y-1">
                      <div className="font-semibold text-indigo-900 flex items-center justify-between">
                        <span>Corroborated Final Rating: Level {item.finalRating}</span>
                        {isDifferent && (
                          <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            Adjusted by Manager
                          </span>
                        )}
                      </div>
                      {finalLevel && (
                        <p className="text-gray-600">{finalLevel.description}</p>
                      )}

                      {item.corroboration?.justification && (
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <span className="font-semibold text-gray-900">Manager Justification:</span>{' '}
                          <span className="text-gray-800">{item.corroboration.justification}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
