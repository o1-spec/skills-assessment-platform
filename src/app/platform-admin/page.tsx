import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { LogoutButton } from '@/components/ui';
import { prisma } from '@/lib/db';

export default async function PlatformAdminPage() {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);

  const [tenantCount, userCount, competencyCount] = await Promise.all([
    prisma.tenant.count(),
    prisma.user.count(),
    prisma.competency.count(),
  ]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PA
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">
                Platform Administration
              </div>
              <div className="text-xs text-gray-500">Skills Assessment Platform &bull; SaaS Control Plane</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-blue-600 font-medium font-mono">Platform Admin</div>
            </div>
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Platform Overview</h1>
          <p className="mt-1 text-sm text-gray-500">
            Global SaaS tenant oversight and platform-wide infrastructure metrics.
          </p>
        </div>

        {/* Global Stats Cards */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
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
                  Defined Competencies
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
              Standardized skills and behavioral models
            </div>
          </div>
        </div>

        {/* Informational Panel */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-3">
          <h2 className="text-base font-bold text-gray-900">Platform Admin Capabilities</h2>
          <p className="text-xs text-gray-600 leading-relaxed max-w-3xl">
            As a Platform Administrator, you maintain platform-wide infrastructure and SaaS tenant separation. 
            Individual tenant operations, role profiles, assessment campaigns, and manager corroborations are isolated within their respective organizations.
          </p>
          <div className="pt-2">
            <span className="inline-flex items-center px-2.5 py-1 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              Authenticated Role: {user.role} &bull; Scope: Global
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
