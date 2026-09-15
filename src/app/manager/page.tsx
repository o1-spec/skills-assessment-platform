import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getManagerOverviewStats } from '@/services';
import { UserRole } from '@prisma/client';

export default async function ManagerOverviewPage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  const stats = await getManagerOverviewStats(user.id, user.tenantId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Manager Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Review self-assessments submitted by your direct reports and corroborate capability benchmarks.
        </p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Pending Reviews Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Pending Reviews
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.pendingReviewsCount}
              </div>
            </div>
            <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
              stats.pendingReviewsCount > 0 ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100">
            {stats.pendingReviewsCount > 0 ? (
              <Link
                href="/manager/corroborations"
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center justify-between"
              >
                <span>Review pending assessments</span>
                <span>&rarr;</span>
              </Link>
            ) : (
              <span className="text-xs text-gray-500">All direct report reviews are up to date.</span>
            )}
          </div>
        </div>

        {/* Direct Reports Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Direct Reports
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.directReportsCount}
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Active staff members assigned to you
          </div>
        </div>

        {/* Completed Reviews Card */}
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Completed Reviews
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">
                {stats.completedReviewsCount}
              </div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Finalized assessment evaluations
          </div>
        </div>
      </div>

      {/* Quick Action Banner */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-gray-900">Assessment Corroboration Queue</h2>
          <p className="text-xs text-gray-500 max-w-2xl">
            Evaluate staff self-assessments, corroborate ratings against verified evidence, and confirm finalized competency levels.
          </p>
        </div>

        <Link
          href="/manager/corroborations"
          className="inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 transition-colors shrink-0"
        >
          View Corroboration Queue &rarr;
        </Link>
      </div>
    </div>
  );
}
