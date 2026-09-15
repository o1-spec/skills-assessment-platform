import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getStaffAssessmentById } from '@/services';
import { AssessmentStatus, CompetencyType, UserRole } from '@prisma/client';
import { formatDate, formatAssessmentStatus } from '@/lib/format';
import { AssessmentForm } from './assessment-form';
import { EvidenceAttachmentsSection } from './evidence-attachments-section';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function StaffAssessmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const assessment = await getStaffAssessmentById(id, user.id, user.tenantId);

  if (!assessment) {
    notFound();
  }

  const isCompleted = assessment.status === AssessmentStatus.COMPLETED;
  const isPendingReview = assessment.status === AssessmentStatus.PENDING_CORROBORATION;
  const isSubmitted = assessment.status === AssessmentStatus.SUBMITTED;
  const isPastDeadline = assessment.isPastDeadline;

  const isReadOnly = isCompleted || isPendingReview || isSubmitted || isPastDeadline;

  const technicalItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.TECHNICAL
  );
  const behavioralItems = assessment.items.filter(
    (i) => i.competency.type === CompetencyType.BEHAVIORAL
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/staff/assessments" className="hover:text-gray-900 transition-colors">
                My Assessments
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
              {assessment.campaign.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <h1 className="text-2xl font-bold text-gray-900">{assessment.campaign.name}</h1>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${isCompleted
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : isPendingReview || isSubmitted
                    ? 'bg-purple-50 text-purple-700 border-purple-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}
            >
              {formatAssessmentStatus(assessment.status)}
            </span>
          </div>

          <div className="mt-4 sm:mt-0">
            <Link
              href="/staff/assessments"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Assessments
            </Link>
          </div>
        </div>

        {assessment.campaign.description && (
          <p className="mt-2 text-sm text-gray-600 max-w-3xl">{assessment.campaign.description}</p>
        )}
      </div>

      {/* Meta Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs text-gray-500 font-medium">Competencies</div>
          <div className="mt-1 text-base font-bold text-gray-900">
            {technicalItems.length} Tech / {behavioralItems.length} Behav
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Review Requirement</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {assessment.campaign.requiresCorroboration
              ? 'Manager Corroboration Required'
              : 'Self-assessment Only'}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Deadline</div>
          <div className="mt-1 text-sm font-semibold text-gray-900">
            {formatDate(assessment.campaign.deadline)}
          </div>
        </div>
      </div>

      {/* Read-Only Informational Banners */}
      {isPendingReview && (
        <div className="rounded-md bg-purple-50 p-4 border border-purple-200">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-purple-600" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-purple-800">
                Assessment Submitted — Awaiting Manager Corroboration
              </h3>
              <p className="mt-1 text-xs text-purple-700">
                You have submitted your self-assessment. Your manager will review your ratings and supporting evidence.
              </p>
            </div>
          </div>
        </div>
      )}

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
              <h3 className="text-sm font-semibold text-emerald-800">Assessment Completed</h3>
              <p className="mt-1 text-xs text-emerald-700">
                This assessment cycle is finished and finalized. Your results are displayed below.
              </p>
            </div>
          </div>
        </div>
      )}

      {!isCompleted && !isPendingReview && isPastDeadline && (
        <div className="rounded-md bg-amber-50 p-4 border border-amber-200">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-semibold text-amber-800">
                Assessment Deadline Has Passed
              </h3>
              <p className="mt-1 text-xs text-amber-700">
                The deadline for this assessment was {formatDate(assessment.campaign.deadline)}. New submissions or draft changes are closed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content: Interactive Form vs. Read-Only Summary */}
      {!isReadOnly ? (
        <AssessmentForm assessment={assessment} />
      ) : (
        <div className="space-y-6">
          {/* Read-Only Competencies View */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6 shadow-sm">
            <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-gray-900">Your Assessed Competencies</h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Summary of your self-assessment ratings and supporting evidence.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded bg-gray-100 text-gray-700">
                {assessment.items.length} items
              </span>
            </div>

            <div className="space-y-6">
              {assessment.items.map((item, idx) => {
                const selectedLevelRecord = item.competency.levels.find(
                  (l) => l.level === item.selfRating
                );

                return (
                  <div
                    key={item.id}
                    className="p-5 rounded-lg border border-gray-200 bg-gray-50/40 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-gray-400">#{idx + 1}</span>
                        <h3 className="text-sm font-bold text-gray-900">{item.competency.name}</h3>
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${item.competency.type === CompetencyType.TECHNICAL
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                            }`}
                        >
                          {item.competency.type}
                        </span>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          Self-Rating: {item.selfRating ? `Level ${item.selfRating}` : 'None'}
                        </span>
                        {item.finalRating !== null && (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Final Rating: Level {item.finalRating}
                          </span>
                        )}
                      </div>
                    </div>

                    {selectedLevelRecord && (
                      <div className="text-xs text-gray-700 bg-white p-3 rounded border border-gray-200">
                        <span className="font-semibold text-gray-900">
                          Level {selectedLevelRecord.level} Benchmark:
                        </span>{' '}
                        {selectedLevelRecord.description}
                      </div>
                    )}

                    <div className="text-xs text-gray-700">
                      <div className="font-semibold text-gray-700 mb-1">Supporting Evidence:</div>
                      {item.evidenceText ? (
                        <p className="bg-white p-3 rounded border border-gray-200 whitespace-pre-wrap">
                          {item.evidenceText}
                        </p>
                      ) : (
                        <p className="text-gray-400 italic">No evidence provided.</p>
                      )}
                    </div>

                    <EvidenceAttachmentsSection
                      assessmentItemId={item.id}
                      assessmentId={assessment.id}
                      initialAttachments={item.attachments || []}
                      isReadOnly={true}
                    />
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
