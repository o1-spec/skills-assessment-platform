import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getAssessmentGapAnalysis, CompetencyGapItem } from '@/services';
import { UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';

interface PageProps {
  params: Promise<{ assessmentId: string }>;
}

export default async function GapAnalysisDetailPage({ params }: PageProps) {
  const { assessmentId } = await params;
  const user = await requireTenantUser();

  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    redirect(getRoleDashboardPath(user.role));
  }

  const analysis = await getAssessmentGapAnalysis(assessmentId, user.tenantId);

  if (!analysis) {
    notFound();
  }

  const { metrics, technicalGaps, behavioralGaps } = analysis;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <nav className="flex text-xs font-semibold text-neutral-500 mb-3" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link
                href="/organization-admin/gap-analysis"
                className="hover:text-neutral-900 transition-colors"
              >
                Gap Analysis
              </Link>
            </li>
            <li>
              <span className="text-neutral-300">/</span>
            </li>
            <li className="text-neutral-900 font-bold truncate max-w-xs" aria-current="page">
              {analysis.user.name} &bull; {analysis.roleProfile.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
                Gap Analysis: {analysis.user.name}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                Target: {analysis.roleProfile.name}
              </span>
            </div>
            <p className="mt-1 text-xs text-neutral-500">
              Evaluated from assessment campaign:{' '}
              <span className="font-semibold text-neutral-900">{analysis.campaign.name}</span>
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <a
              href={`/api/reports/gap-analysis/individual/${analysis.assessmentId}`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </a>
            <Link
              href="/organization-admin/gap-analysis"
              className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              &larr; Back to Gap Analysis List
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
        <div>
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Employee</div>
          <div className="mt-1 text-sm font-bold text-neutral-900">{analysis.user.name}</div>
          <div className="text-xs text-neutral-500">{analysis.user.email}</div>
        </div>

        <div>
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Target Benchmark Role</div>
          <div className="mt-1 text-sm font-bold text-neutral-900">{analysis.roleProfile.name}</div>
          {analysis.roleProfile.description && (
            <div className="text-xs text-neutral-500 truncate">{analysis.roleProfile.description}</div>
          )}
        </div>

        <div>
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Evaluation Completed On</div>
          <div className="mt-1 text-sm font-bold text-neutral-900">
            {formatDate(analysis.completedAt)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs">
          <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Total Compared</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">{metrics.totalCompared}</div>
          <div className="mt-1 text-xs text-neutral-500">Benchmark competencies</div>
        </div>

        <div className="p-5 rounded-2xl border border-stone-200/80 bg-stone-50/40 shadow-xs">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Below Target</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">{metrics.belowTargetCount}</div>
          <div className="mt-1 text-xs text-neutral-500">
            {metrics.technicalGapsCount} Tech / {metrics.behavioralGapsCount} Behav
          </div>
        </div>

        <div className="p-5 rounded-2xl border border-stone-200/80 bg-stone-50/40 shadow-xs">
          <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Meets Target</div>
          <div className="mt-1 text-2xl font-bold text-neutral-900 tracking-tight">{metrics.meetsTargetCount}</div>
          <div className="mt-1 text-xs text-neutral-500">Exact benchmark match</div>
        </div>

        <div className="p-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/40 shadow-xs">
          <div className="text-xs font-bold text-emerald-800 uppercase tracking-wider">Exceeds Target</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700 tracking-tight">{metrics.exceedsTargetCount}</div>
          <div className="mt-1 text-xs text-emerald-700">Above role benchmark</div>
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-4">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center">
              Technical Competencies Gap Analysis
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Comparison between verified technical ratings and required target levels.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200/60">
            {technicalGaps.length} compared
          </span>
        </div>

        {technicalGaps.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">
            No technical competencies defined in this target role profile.
          </p>
        ) : (
          <div className="space-y-4">
            {technicalGaps.map((item, idx) => renderGapCard(item, idx + 1))}
          </div>
        )}
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-4">
        <div className="border-b border-stone-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight flex items-center">
              Behavioral Competencies Gap Analysis
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Comparison between verified behavioral ratings and required target levels.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 border border-stone-200/60">
            {behavioralGaps.length} compared
          </span>
        </div>

        {behavioralGaps.length === 0 ? (
          <p className="text-xs text-neutral-400 italic">
            No behavioral competencies defined in this target role profile.
          </p>
        ) : (
          <div className="space-y-4">
            {behavioralGaps.map((item, idx) =>
              renderGapCard(item, technicalGaps.length + idx + 1)
            )}
          </div>
        )}
      </div>
    </div>
  );

  function renderGapCard(item: CompetencyGapItem, num: number) {
    const isBelow = item.status === 'BELOW_TARGET';
    const isMeets = item.status === 'MEETS_TARGET';
    const isExceeds = item.status === 'EXCEEDS_TARGET';

    const statusBadgeStyles = isBelow
      ? 'bg-stone-100 text-stone-800 border-stone-200/80'
      : isMeets
        ? 'bg-stone-100 text-stone-700 border-stone-200/80'
        : 'bg-emerald-50 text-emerald-700 border-emerald-200/80';

    const statusLabel = isBelow
      ? `Below Target (-${item.gap})`
      : isMeets
        ? 'Meets Target'
        : 'Exceeds Target';

    return (
      <div
        key={item.competencyId}
        className="p-5 rounded-2xl border border-stone-200/80 bg-stone-50/40 space-y-3"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-200/60 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-neutral-400">#{num}</span>
            <h3 className="text-sm font-bold text-neutral-900">{item.competencyName}</h3>
            <span
              className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-stone-200/70 text-neutral-800"
            >
              {item.competencyType}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeStyles}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-neutral-900">
              <span>Assessed Final Level:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/60">
                Level {item.currentLevel}
              </span>
            </div>
            {item.currentLevelDescription ? (
              <p className="text-neutral-600 leading-relaxed pt-1">
                {item.currentLevelDescription}
              </p>
            ) : (
              <p className="text-neutral-400 italic">No level description defined.</p>
            )}
          </div>

          <div className="p-3.5 bg-white rounded-xl border border-stone-200/80 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-neutral-900">
              <span>Required Role Benchmark:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-stone-100 text-stone-800 border border-stone-200/60">
                Level {item.targetLevel}
              </span>
            </div>
            {item.targetLevelDescription ? (
              <p className="text-neutral-600 leading-relaxed pt-1">
                {item.targetLevelDescription}
              </p>
            ) : (
              <p className="text-neutral-400 italic">No level description defined.</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-stone-200/60">
          <div className="flex items-center justify-between text-xs text-neutral-500 mb-1.5">
            <span>
              Capability Progress:{' '}
              <strong className="text-neutral-900">Level {item.currentLevel}</strong> of{' '}
              <strong className="text-neutral-900">Level {item.targetLevel}</strong> required
            </span>
            <span className="font-semibold text-neutral-700">
              {item.gap > 0 ? `Deficiency: ${item.gap} ${item.gap === 1 ? 'level' : 'levels'}` : 'Target Met'}
            </span>
          </div>
          <div className="w-full bg-stone-200/70 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                isBelow
                  ? 'bg-neutral-900'
                  : isExceeds
                  ? 'bg-emerald-600'
                  : 'bg-emerald-600'
              }`}
              style={{
                width: `${Math.min(Math.round((item.currentLevel / item.targetLevel) * 100), 100)}%`,
              }}
            />
          </div>
        </div>
      </div>
    );
  }
}
