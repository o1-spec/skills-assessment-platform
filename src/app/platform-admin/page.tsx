import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import Link from 'next/link';

export default async function PlatformAdminPage() {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);

  const [tenantCount, userCount, frameworkCount, competencyCount, templateCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.frameworkVersion.count(),
    prisma.frameworkCompetency.count(),
    prisma.industryTemplate.count(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Global SaaS tenant oversight, canonical competency frameworks, and platform metrics.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/platform-admin/plans"
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Subscription Plans
          </Link>
          <Link
            href="/platform-admin/frameworks"
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Frameworks
          </Link>
          <Link
            href="/platform-admin/templates"
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Industry Templates ({templateCount})
          </Link>
          <Link
            href="/platform-admin/tenants"
            className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-xs text-xs font-semibold rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Organizations
          </Link>
          <Link
            href="/platform-admin/tenants/new"
            className="inline-flex items-center px-3.5 py-2 border border-transparent shadow-xs text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
          >
            + Provision Organization
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Active Organizations
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">{tenantCount}</div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Multi-tenant isolated SaaS organizations
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Total Platform Users
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">{userCount}</div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Users across all RBAC roles
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Framework Versions
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">{frameworkCount}</div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Canonical platform versions
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow-sm rounded-lg border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                Canonical Competencies
              </div>
              <div className="mt-1 text-3xl font-extrabold text-gray-900">{competencyCount}</div>
            </div>
            <div className="h-12 w-12 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Standardized technical & behavioral skills
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-3">
        <h2 className="text-base font-bold text-gray-900">Platform Admin Control Plane</h2>
        <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
          As a Platform Administrator, you maintain platform-wide infrastructure, canonical competency frameworks, and SaaS tenant separation.
          Individual tenant operations, role profiles, assessment campaigns, and manager corroborations remain strictly isolated within their respective organizations.
        </p>
        <div className="pt-2">
          <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Authenticated Role: {user.role} &bull; Scope: Global Control Plane
          </span>
        </div>
      </div>
    </div>
  );
}
