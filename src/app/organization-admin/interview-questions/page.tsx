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
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Interview Question Generator (OA-11)</h1>
          <p className="mt-1 text-sm text-stone-500">
            Generate and customize structured behavioral and technical interview evaluation guides directly from your published role profile competencies and target proficiency levels.
          </p>
        </div>
        <Link
          href="/organization-admin/interview-questions/new"
          className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          + Generate Interview Guide
        </Link>
      </div>

      {questionSets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="mx-auto w-12 h-12 rounded-xl bg-stone-100 flex items-center justify-center text-neutral-900 mb-4 border border-stone-200/60">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-neutral-900">No Interview Guides Generated Yet</h3>
          <p className="mt-1 text-sm text-stone-500 max-w-md mx-auto">
            Choose any published role profile to deterministically generate behavioral and technical interview questions, probes, and printable evaluation guides.
          </p>
          <div className="mt-6">
            <Link
              href="/organization-admin/interview-questions/new"
              className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
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
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs hover:border-stone-300 transition-colors"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-lg font-bold text-neutral-900">
                      <Link
                        href={`/organization-admin/interview-questions/${set.id}`}
                        className="hover:text-stone-600 transition-colors"
                      >
                        {set.title}
                      </Link>
                    </h2>
                    {set.roleProfile.isArchived && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/60">
                        Archived Role
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-stone-500 font-medium">
                    <span className="flex items-center">
                      <span className="font-bold text-neutral-800 mr-1">Role:</span>{' '}
                      {set.roleProfile.name}
                    </span>
                    <span className="flex items-center">
                      <span className="font-bold text-neutral-800 mr-1">Questions:</span>{' '}
                      {set.questions.length} items
                    </span>
                    <span className="flex items-center">
                      <span className="font-bold text-neutral-800 mr-1">Created:</span>{' '}
                      {new Date(set.createdAt).toLocaleDateString()} by {set.createdBy.name}
                    </span>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-1.5">
                    {set.questions.map((q) => (
                      <span
                        key={q.id}
                        className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/60"
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
                    className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
                  >
                    View & Edit
                  </Link>
                  <a
                    href={`/api/reports/interview-questions/${set.id}/pdf`}
                    download
                    className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-800 bg-stone-50 hover:bg-stone-100 transition-colors cursor-pointer"
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
