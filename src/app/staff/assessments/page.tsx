import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getAssessmentsForStaff } from '@/services';
import { AssessmentStatus, UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';

export default async function StaffAssessmentsPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const assessments = await getAssessmentsForStaff(user.id, user.tenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My Assessments</h1>
        <p className="mt-1 text-sm text-gray-500">
          View your assigned competency assessment cycles, complete self-assessments, and track progress.
        </p>
      </div>

      {/* Assessment List */}
      {assessments.length === 0 ? (
        <div className="text-center bg-white rounded-lg border border-dashed border-gray-300 p-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No assessments assigned</h3>
          <p className="mt-1 text-sm text-gray-500">
            You currently have no active skills assessment cycles assigned to you.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {assessments.map((assessment) => {
            const isCompleted = assessment.status === AssessmentStatus.COMPLETED;
            const isPendingReview = assessment.status === AssessmentStatus.PENDING_CORROBORATION;
            const isSubmitted = assessment.status === AssessmentStatus.SUBMITTED;

            const progressPercent =
              assessment.competencyCount > 0
                ? Math.round((assessment.answeredCount / assessment.competencyCount) * 100)
                : 0;

            const statusBadgeConfig = {
              [AssessmentStatus.NOT_STARTED]: {
                bg: 'bg-gray-100 text-gray-800 border-gray-200',
                label: 'Not Started',
                actionLabel: 'Start Assessment',
                actionStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
              },
              [AssessmentStatus.DRAFT]: {
                bg: 'bg-amber-50 text-amber-700 border-amber-200',
                label: 'In Progress (Draft)',
                actionLabel: 'Resume Assessment',
                actionStyle: 'bg-blue-600 hover:bg-blue-700 text-white',
              },
              [AssessmentStatus.PENDING_CORROBORATION]: {
                bg: 'bg-purple-50 text-purple-700 border-purple-200',
                label: 'Pending Manager Review',
                actionLabel: 'Awaiting Review',
                actionStyle: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
              },
              [AssessmentStatus.SUBMITTED]: {
                bg: 'bg-purple-50 text-purple-700 border-purple-200',
                label: 'Submitted',
                actionLabel: 'Submitted',
                actionStyle: 'bg-gray-100 hover:bg-gray-200 text-gray-800',
              },
              [AssessmentStatus.COMPLETED]: {
                bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                label: 'Completed',
                actionLabel: 'View Results',
                actionStyle: 'bg-emerald-600 hover:bg-emerald-700 text-white',
              },
            }[assessment.status];

            return (
              <div
                key={assessment.id}
                className="bg-white rounded-lg border border-gray-200 shadow-sm p-6 space-y-4 hover:border-gray-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <h2 className="text-lg font-bold text-gray-900">
                        {assessment.campaign.name}
                      </h2>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusBadgeConfig.bg}`}
                      >
                        {statusBadgeConfig.label}
                      </span>
                    </div>
                    {assessment.campaign.description && (
                      <p className="text-sm text-gray-600 max-w-2xl">
                        {assessment.campaign.description}
                      </p>
                    )}
                  </div>

                  <div className="text-right sm:text-right">
                    <div className="text-xs text-gray-500">Deadline</div>
                    <div className="text-sm font-semibold text-gray-900">
                      {formatDate(assessment.campaign.deadline)}
                    </div>
                  </div>
                </div>

                {/* Progress bar and metadata */}
                <div className="space-y-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-gray-700">
                      {assessment.answeredCount} of {assessment.competencyCount} competencies answered
                    </span>
                    <span className="font-semibold text-gray-900">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-600'
                          : isPendingReview || isSubmitted
                          ? 'bg-purple-600'
                          : 'bg-blue-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Footer Badges & Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex items-center space-x-3 text-xs text-gray-500">
                    {assessment.campaign.requiresCorroboration ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">
                        Manager Corroboration Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        Self-assessment Only
                      </span>
                    )}

                    {assessment.submittedAt && (
                      <span>
                        Submitted on {formatDate(assessment.submittedAt)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/staff/assessments/${assessment.id}`}
                    className={`inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-md shadow-sm transition-colors ${statusBadgeConfig.actionStyle}`}
                  >
                    {statusBadgeConfig.actionLabel} &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
