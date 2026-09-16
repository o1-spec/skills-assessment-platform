import Link from 'next/link';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getInterviewQuestionSetsForTenant } from '@/services/interview-questions';

export default async function InterviewQuestionsPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const questionSets = await getInterviewQuestionSetsForTenant(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interview Question Generator (OA-11)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate and customize structured behavioral and technical interview evaluation guides directly from your published role profile competencies and target proficiency levels.
          </p>
        </div>
        <Link
          href="/organization-admin/interview-questions/new"
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          + Generate Interview Guide
        </Link>
      </div>

      {questionSets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-2xs">
          <div className="mx-auto w-12 h-12 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 mb-4">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-semibold text-gray-900">No Interview Guides Generated Yet</h3>
          <p className="mt-1 text-sm text-gray-500 max-w-md mx-auto">
            Choose any published role profile to deterministically generate behavioral and technical interview questions, probes, and printable evaluation guides.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/interview-questions/new"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-xs text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
            >
              Generate Your First Guide
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {questionSets.map((set) => (
            <div
              key={set.id}
              className="bg-white rounded-xl border border-gray-200 p-6 shadow-2xs hover:border-gray-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-gray-900">
                      <Link
                        href={`/organization-admin/interview-questions/${set.id}`}
                        className="hover:text-indigo-600 transition-colors"
                      >
                        {set.title}
                      </Link>
                    </h2>
                    {set.roleProfile.isArchived && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        Archived Role
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-gray-500">
                    <span className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-1">Role:</span>{' '}
                      {set.roleProfile.name}
                    </span>
                    <span className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-1">Questions:</span>{' '}
                      {set.questions.length} items
                    </span>
                    <span className="flex items-center">
                      <span className="font-semibold text-gray-700 mr-1">Created:</span>{' '}
                      {new Date(set.createdAt).toLocaleDateString()} by {set.createdBy.name}
                    </span>
                  </div>

                  {/* Competency tags preview */}
                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {set.questions.map((q) => (
                      <span
                        key={q.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-gray-800"
                      >
                        {q.competency?.name || 'Custom Question'}
                        {q.targetLevel ? ` (L${q.targetLevel})` : ''}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                  <Link
                    href={`/organization-admin/interview-questions/${set.id}`}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 shadow-2xs text-xs font-semibold rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    View & Edit
                  </Link>
                  <a
                    href={`/api/reports/interview-questions/${set.id}/pdf`}
                    download
                    className="inline-flex items-center px-3 py-1.5 border border-indigo-200 shadow-2xs text-xs font-semibold rounded-md text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Export PDF
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
