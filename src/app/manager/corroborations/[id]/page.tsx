import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getManagerCorroborationById } from '@/services';
import { AssessmentStatus, CompetencyType, UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';
import { CorroborationForm } from './corroboration-form';
import { EvidenceAttachmentsSection } from '@/app/staff/assessments/[id]/evidence-attachments-section';
import { PageHeader, StatusBadge } from '@/components/app';

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
      <PageHeader
        title={`Corroboration Review: ${assessment.user.name}`}
        description={`Review self-assessment ratings and supporting evidence submitted for campaign: ${assessment.campaign.name}`}
        breadcrumbs={[
          { label: 'Corroborations', href: '/manager/corroborations' },
          { label: assessment.user.name },
        ]}
        badge={<StatusBadge status={assessment.status} />}
        actions={
          <Link
            href="/manager/corroborations"
            className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors"
          >
            &larr; Back to Queue
          </Link>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Direct Report</div>
          <div className="mt-1 text-sm font-bold text-neutral-900">{assessment.user.name}</div>
          <div className="text-xs text-neutral-500 font-mono mt-0.5">{assessment.user.email}</div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Submission Date</div>
          <div className="mt-1 text-sm font-semibold text-neutral-900">
            {formatDate(assessment.submittedAt)}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-neutral-500 font-semibold uppercase tracking-wider">Competencies</div>
          <div className="mt-1 text-sm font-bold text-neutral-900">
            {technicalItems.length} Technical &bull; {behavioralItems.length} Behavioral
          </div>
        </div>
      </div>

      {isCompleted && (
        <div className="rounded-2xl bg-emerald-50/80 p-5 border border-emerald-200/80 flex items-start gap-3 text-emerald-900">
          <div className="shrink-0 mt-0.5 text-emerald-600">
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-emerald-950">
              Corroboration Review Completed
            </h3>
            <p className="mt-0.5 text-xs text-emerald-800 leading-relaxed">
              This assessment evaluation was completed and finalized on{' '}
              {formatDate(assessment.completedAt)}. Final capability ratings are locked into the verified skills profile.
            </p>
          </div>
        </div>
      )}

      {isPending ? (
        <CorroborationForm assessment={assessment} />
      ) : (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-stone-200/80 p-6 space-y-6 shadow-xs">
            <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-bold text-neutral-900">Finalized Competency Ratings</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Comparison between staff self-ratings and corroborated manager ratings.
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
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
                    className="p-5 rounded-xl border border-stone-200/80 bg-stone-50/40 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/80 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-400 font-mono">#{idx + 1}</span>
                        <h3 className="text-sm font-bold text-neutral-900">{item.competency.name}</h3>
                        <span
                          className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full border ${
                            item.competency.type === CompetencyType.TECHNICAL
                              ? 'bg-stone-100 text-neutral-800 border-stone-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {item.competency.type}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-neutral-700 border border-stone-200">
                          Self: Level {item.selfRating ?? 'N/A'}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Final: Level {item.finalRating ?? 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-neutral-700 bg-white p-3.5 rounded-xl border border-stone-200 space-y-1.5 shadow-2xs">
                      <div className="font-semibold text-neutral-900">
                        Staff Self-Assessment (Level {item.selfRating}):
                      </div>
                      {staffLevel && (
                        <p className="text-neutral-500 italic mb-1.5">{staffLevel.description}</p>
                      )}
                      <div className="font-medium text-neutral-600">Supporting Evidence:</div>
                      <p className="text-neutral-800 whitespace-pre-wrap">
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

                    <div className="text-xs text-neutral-700 bg-white p-3.5 rounded-xl border border-stone-200 space-y-1.5 shadow-2xs">
                      <div className="font-semibold text-neutral-900 flex items-center justify-between">
                        <span>Corroborated Final Rating: Level {item.finalRating}</span>
                        {isDifferent && (
                          <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                            Adjusted by Manager
                          </span>
                        )}
                      </div>
                      {finalLevel && (
                        <p className="text-neutral-600">{finalLevel.description}</p>
                      )}

                      {item.corroboration?.justification && (
                        <div className="mt-2 pt-2 border-t border-stone-100">
                          <span className="font-semibold text-neutral-900">Manager Justification:</span>{' '}
                          <span className="text-neutral-800">{item.corroboration.justification}</span>
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
