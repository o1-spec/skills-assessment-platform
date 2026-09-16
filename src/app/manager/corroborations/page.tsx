import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getPendingCorroborationsForManager } from '@/services';
import { UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';

export default async function ManagerCorroborationsQueuePage() {
  const user = await requireTenantUser();

  if (user.role !== UserRole.MANAGER) {
    redirect(getRoleDashboardPath(user.role));
  }

  const pendingAssessments = await getPendingCorroborationsForManager(
    user.id,
    user.tenantId
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Corroboration Queue</h1>
        <p className="mt-1 text-xs text-neutral-500">
          Review submitted self-assessments for your direct reports, verify evidence, and confirm final competency ratings.
        </p>
      </div>

      {pendingAssessments.length === 0 ? (
        <div className="text-center bg-white rounded-2xl border border-dashed border-stone-300 p-12 shadow-xs">
          <svg
            className="mx-auto h-12 w-12 text-stone-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-3 text-sm font-bold text-neutral-900">No pending corroborations</h3>
          <p className="mt-1 text-xs text-neutral-500">
            All submitted self-assessments from your direct reports have been reviewed.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50/70">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Employee
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Campaign
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Submitted On
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Competencies
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3.5 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Deadline
                  </th>
                  <th scope="col" className="relative px-6 py-3.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {pendingAssessments.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs font-semibold text-neutral-900">{item.user.name}</div>
                      <div className="text-[11px] text-neutral-500">{item.user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-800 font-semibold">
                      {item.campaign.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500">
                      {formatDate(item.submittedAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-600">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                        {item._count.items} competencies
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-neutral-500">
                      {formatDate(item.campaign.deadline)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-semibold">
                      <Link
                        href={`/manager/corroborations/${item.id}`}
                        className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer"
                      >
                        Review Assessment &rarr;
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
