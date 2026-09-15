'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function ManagerNav() {
  const pathname = usePathname();

  const isOverviewActive = pathname === '/manager';
  const isCorroborationsActive = pathname.startsWith('/manager/corroborations');

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex space-x-8" aria-label="Manager Navigation">
          <Link
            href="/manager"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isOverviewActive
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={isOverviewActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isOverviewActive ? 'text-blue-600' : 'text-gray-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
              />
            </svg>
            Overview
          </Link>

          <Link
            href="/manager/corroborations"
            className={`inline-flex items-center px-1 pt-3 pb-3 border-b-2 text-sm font-medium transition-colors ${
              isCorroborationsActive
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
            aria-current={isCorroborationsActive ? 'page' : undefined}
          >
            <svg
              className={`mr-2 h-4 w-4 ${isCorroborationsActive ? 'text-blue-600' : 'text-gray-400'}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
              />
            </svg>
            Corroborations
          </Link>
        </nav>
      </div>
    </div>
  );
}

