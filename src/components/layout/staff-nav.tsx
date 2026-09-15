'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function StaffNav() {
  const pathname = usePathname();

  const isAssessmentsActive =
    pathname === '/staff' || pathname.startsWith('/staff/assessments');

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Staff Navigation">
          <Link
            href="/staff/assessments"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isAssessmentsActive
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={isAssessmentsActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isAssessmentsActive ? 'text-blue-600' : 'text-gray-400'}`}
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

          {/* Placeholder Nav Items (Disabled for future sprints) */}
          <span
            className="inline-flex items-center px-1 pt-3 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-400 cursor-not-allowed select-none"
            title="Profile management coming in a future sprint"
          >
            Profile
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              Soon
            </span>
          </span>

          <span
            className="inline-flex items-center px-1 pt-3 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-400 cursor-not-allowed select-none"
            title="Career pathing coming in a future sprint"
          >
            Career
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              Soon
            </span>
          </span>

          <span
            className="inline-flex items-center px-1 pt-3 pb-3 border-b-2 border-transparent text-sm font-medium text-gray-400 cursor-not-allowed select-none"
            title="Learning recommendations coming in a future sprint"
          >
            Learning
            <span className="ml-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-500">
              Soon
            </span>
          </span>
        </nav>
      </div>
    </div>
  );
}
