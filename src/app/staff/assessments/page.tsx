import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getAssessmentsForStaff } from '@/services';
import { AssessmentStatus, UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/app';
import { StaffOnboardingTour } from './onboarding-tour';

export default async function StaffAssessmentsPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const assessments = await getAssessmentsForStaff(user.id, user.tenantId);

  const completedCount = assessments.filter((a) => a.status === AssessmentStatus.COMPLETED).length;
  const inProgressCount = assessments.filter(
    (a) => a.status === AssessmentStatus.DRAFT || a.status === AssessmentStatus.NOT_STARTED
  ).length;
  const pendingCount = assessments.filter(
    (a) => a.status === AssessmentStatus.PENDING_CORROBORATION || a.status === AssessmentStatus.SUBMITTED
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Assessments"
        description="View your assigned competency assessment cycles, complete self-assessments, and track corroboration progress."
        badge={
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            {assessments.length} Active Cycles
          </span>
        }
      />

      <StaffOnboardingTour />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="In Progress / To Do"
          value={inProgressCount}
          subtext="Self-evaluations needing completion"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Awaiting Corroboration"
          value={pendingCount}
          subtext="Submitted to your manager for review"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Completed Cycles"
          value={completedCount}
          subtext="Corroborated & finalized ratings"
          icon={
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          }
        />
      </div>

      {assessments.length === 0 ? (
        <EmptyState
          title="No assessments assigned"
          description="You currently have no active skills assessment cycles assigned to your profile."
        />
      ) : (
        <div className="space-y-4">
          {assessments.map((assessment) => {
            const isCompleted = assessment.status === AssessmentStatus.COMPLETED;
            const isPendingReview =
              assessment.status === AssessmentStatus.PENDING_CORROBORATION ||
              assessment.status === AssessmentStatus.SUBMITTED;

            const progressPercent =
              assessment.competencyCount > 0
                ? Math.round((assessment.answeredCount / assessment.competencyCount) * 100)
                : 0;

            const actionConfig = {
              [AssessmentStatus.NOT_STARTED]: {
                label: 'Start Assessment',
                style: 'bg-neutral-900 text-white hover:bg-neutral-800',
              },
              [AssessmentStatus.DRAFT]: {
                label: 'Resume Assessment',
                style: 'bg-neutral-900 text-white hover:bg-neutral-800',
              },
              [AssessmentStatus.PENDING_CORROBORATION]: {
                label: 'View Submission',
                style: 'bg-stone-100 text-neutral-800 hover:bg-stone-200',
              },
              [AssessmentStatus.SUBMITTED]: {
                label: 'View Submission',
                style: 'bg-stone-100 text-neutral-800 hover:bg-stone-200',
              },
              [AssessmentStatus.COMPLETED]: {
                label: 'View Results',
                style: 'bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100',
              },
            }[assessment.status];

            return (
              <div
                key={assessment.id}
                className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-5 sm:p-6 space-y-4 hover:border-stone-300 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <h2 className="text-base font-bold text-neutral-900">
                        {assessment.campaign.name}
                      </h2>
                      <StatusBadge status={assessment.status} />
                    </div>
                    {assessment.campaign.description && (
                      <p className="text-xs sm:text-sm text-neutral-500 max-w-2xl leading-relaxed">
                        {assessment.campaign.description}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <div className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                      Deadline
                    </div>
                    <div className="text-xs font-semibold text-neutral-800 mt-0.5">
                      {formatDate(assessment.campaign.deadline)}
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5 border-t border-stone-100 pt-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-neutral-600">
                      {assessment.answeredCount} of {assessment.competencyCount} competencies answered
                    </span>
                    <span className="font-bold text-neutral-900">{progressPercent}%</span>
                  </div>
                  <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted
                          ? 'bg-emerald-500'
                          : isPendingReview
                          ? 'bg-amber-500'
                          : 'bg-neutral-900'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-neutral-500 flex-wrap">
                    {assessment.campaign.requiresCorroboration ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-stone-100 text-neutral-700 text-[11px] font-medium">
                        Manager Corroboration Required
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-stone-100 text-neutral-600 text-[11px]">
                        Self-assessment Only
                      </span>
                    )}

                    {assessment.submittedAt && (
                      <span className="text-neutral-400 text-[11px]">
                        &bull; Submitted {formatDate(assessment.submittedAt)}
                      </span>
                    )}
                  </div>

                  <Link
                    href={`/staff/assessments/${assessment.id}`}
                    className={`inline-flex items-center justify-center px-4 py-2 text-xs font-semibold rounded-xl shadow-2xs transition-colors ${actionConfig.style}`}
                  >
                    <span>{actionConfig.label}</span>
                    <span className="ml-1.5">→</span>
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
