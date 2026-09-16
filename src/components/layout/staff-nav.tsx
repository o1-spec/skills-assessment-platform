'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StaffNav() {
  const pathname = usePathname();

  const isAssessmentsActive =
    pathname === '/staff' || pathname.startsWith('/staff/assessments');
  const isSkillsActive = pathname.startsWith('/staff/skills');
  const isGapActive = pathname.startsWith('/staff/gap-analysis');

  return (
    <div className="bg-white border-b border-stone-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Staff Navigation">
          <Link
            href="/staff/assessments"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isAssessmentsActive
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
            aria-current={isAssessmentsActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isAssessmentsActive ? 'text-neutral-900' : 'text-stone-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
              />
            </svg>
            My Assessments
          </Link>

          <Link
            href="/staff/skills"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isSkillsActive
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
            aria-current={isSkillsActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isSkillsActive ? 'text-neutral-900' : 'text-stone-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            My Skills
          </Link>

          <Link
            href="/staff/gap-analysis"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isGapActive
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
            aria-current={isGapActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isGapActive ? 'text-neutral-900' : 'text-stone-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
            My Gap
          </Link>

          <Link
            href="/staff/career-paths"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/staff/career-paths')
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
            aria-current={pathname.startsWith('/staff/career-paths') ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${pathname.startsWith('/staff/career-paths') ? 'text-neutral-900' : 'text-stone-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
              />
            </svg>
            Career Paths
          </Link>

          <Link
            href="/staff/learning"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              pathname.startsWith('/staff/learning')
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-500 hover:text-stone-800 hover:border-stone-300'
            }`}
            aria-current={pathname.startsWith('/staff/learning') ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${pathname.startsWith('/staff/learning') ? 'text-neutral-900' : 'text-stone-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            Learning
          </Link>
        </nav>
      </div>
    </div>
  );
}
