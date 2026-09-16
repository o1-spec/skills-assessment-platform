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
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link
                href="/organization-admin/gap-analysis"
                className="hover:text-gray-900 transition-colors"
              >
                Gap Analysis
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium truncate max-w-xs" aria-current="page">
              {analysis.user.name} &bull; {analysis.roleProfile.name}
            </li>
          </ol>
        </nav>

        <div className="sm:flex sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                Gap Analysis: {analysis.user.name}
              </h1>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                Target: {analysis.roleProfile.name}
              </span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              Evaluated from assessment campaign:{' '}
              <span className="font-semibold text-gray-800">{analysis.campaign.name}</span>
            </p>
          </div>

          <div className="mt-4 sm:mt-0 flex items-center space-x-3">
            <a
              href={`/api/reports/gap-analysis/individual/${analysis.assessmentId}`}
              download
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-blue-600 shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </a>
            <Link
              href="/organization-admin/gap-analysis"
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
            >
              &larr; Back to Gap Analysis List
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div>
          <div className="text-xs text-gray-500 font-medium">Employee</div>
          <div className="mt-1 text-sm font-bold text-gray-900">{analysis.user.name}</div>
          <div className="text-xs text-gray-500">{analysis.user.email}</div>
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Target Benchmark Role</div>
          <div className="mt-1 text-sm font-bold text-indigo-700">{analysis.roleProfile.name}</div>
          {analysis.roleProfile.description && (
            <div className="text-xs text-gray-500 truncate">{analysis.roleProfile.description}</div>
          )}
        </div>

        <div>
          <div className="text-xs text-gray-500 font-medium">Evaluation Completed On</div>
          <div className="mt-1 text-sm font-bold text-gray-900">
            {formatDate(analysis.completedAt)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
          <div className="text-xs text-gray-500 font-medium">Total Compared</div>
          <div className="mt-1 text-2xl font-bold text-gray-900">{metrics.totalCompared}</div>
          <div className="mt-1 text-xs text-gray-500">Benchmark competencies</div>
        </div>

        <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs text-amber-800 font-medium">Below Target</div>
          <div className="mt-1 text-2xl font-bold text-amber-700">{metrics.belowTargetCount}</div>
          <div className="mt-1 text-xs text-amber-700">
            {metrics.technicalGapsCount} Tech / {metrics.behavioralGapsCount} Behav
          </div>
        </div>

        <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/20 shadow-sm">
          <div className="text-xs text-blue-800 font-medium">Meets Target</div>
          <div className="mt-1 text-2xl font-bold text-blue-700">{metrics.meetsTargetCount}</div>
          <div className="mt-1 text-xs text-blue-700">Exact benchmark match</div>
        </div>

        <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs text-emerald-800 font-medium">Exceeds Target</div>
          <div className="mt-1 text-2xl font-bold text-emerald-700">{metrics.exceedsTargetCount}</div>
          <div className="mt-1 text-xs text-emerald-700">Above role benchmark</div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <span className="h-2 w-2 rounded-full bg-blue-600 mr-2" />
              Technical Competencies Gap Analysis
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparison between verified technical ratings and required target levels.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-200">
            {technicalGaps.length} compared
          </span>
        </div>

        {technicalGaps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
            No technical competencies defined in this target role profile.
          </p>
        ) : (
          <div className="space-y-4">
            {technicalGaps.map((item, idx) => renderGapCard(item, idx + 1))}
          </div>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-gray-900 flex items-center">
              <span className="h-2 w-2 rounded-full bg-emerald-600 mr-2" />
              Behavioral Competencies Gap Analysis
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Comparison between verified behavioral ratings and required target levels.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            {behavioralGaps.length} compared
          </span>
        </div>

        {behavioralGaps.length === 0 ? (
          <p className="text-sm text-gray-400 italic">
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
      ? 'bg-amber-100 text-amber-800 border-amber-200'
      : isMeets
        ? 'bg-blue-100 text-blue-800 border-blue-200'
        : 'bg-emerald-100 text-emerald-800 border-emerald-200';

    const statusLabel = isBelow
      ? `Below Target (-${item.gap})`
      : isMeets
        ? 'Meets Target'
        : 'Exceeds Target';

    return (
      <div
        key={item.competencyId}
        className={`p-5 rounded-lg border transition-all ${isBelow
            ? 'border-amber-200 bg-amber-50/15'
            : isExceeds
              ? 'border-emerald-200 bg-emerald-50/15'
              : 'border-gray-200 bg-gray-50/30'
          } space-y-3`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-200 pb-2.5">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold text-gray-400">#{num}</span>
            <h3 className="text-sm font-bold text-gray-900">{item.competencyName}</h3>
            <span
              className={`text-[10px] uppercase font-semibold px-2 py-0.5 rounded ${item.competencyType === 'TECHNICAL'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-emerald-100 text-emerald-800'
                }`}
            >
              {item.competencyType}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadgeStyles}`}
            >
              {statusLabel}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-3 bg-white rounded border border-gray-200 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-gray-900">
              <span>Assessed Final Level:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-800">
                Level {item.currentLevel}
              </span>
            </div>
            {item.currentLevelDescription ? (
              <p className="text-gray-600 leading-relaxed pt-1">
                {item.currentLevelDescription}
              </p>
            ) : (
              <p className="text-gray-400 italic">No level description defined.</p>
            )}
          </div>

          <div className="p-3 bg-white rounded border border-indigo-100 text-xs space-y-1">
            <div className="flex items-center justify-between font-bold text-indigo-900">
              <span>Required Role Benchmark:</span>
              <span className="inline-flex items-center px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                Level {item.targetLevel}
              </span>
            </div>
            {item.targetLevelDescription ? (
              <p className="text-gray-600 leading-relaxed pt-1">
                {item.targetLevelDescription}
              </p>
            ) : (
              <p className="text-gray-400 italic">No level description defined.</p>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
            <span>
              Capability Progress:{' '}
              <strong className="text-gray-800">Level {item.currentLevel}</strong> of{' '}
              <strong className="text-indigo-700">Level {item.targetLevel}</strong> required
            </span>
            <span className="font-semibold text-gray-700">
              {item.gap > 0 ? `Deficiency: ${item.gap} ${item.gap === 1 ? 'level' : 'levels'}` : 'Target Met'}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${isBelow
                  ? 'bg-amber-500'
                  : isExceeds
                    ? 'bg-emerald-600'
                    : 'bg-blue-600'
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
