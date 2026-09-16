'use client';

import { useState } from 'react';
import Link from 'next/link';
import { TenantWithStats } from '@/services/tenants';
import { TenantStatus } from '@prisma/client';

interface TenantsDirectoryViewProps {
  initialTenants: TenantWithStats[];
}

export function TenantsDirectoryView({ initialTenants }: TenantsDirectoryViewProps) {
  const [tenants] = useState<TenantWithStats[]>(initialTenants);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      tenant.name.toLowerCase().includes(search.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(search.toLowerCase()) ||
      (tenant.domain && tenant.domain.toLowerCase().includes(search.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || tenant.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organization Directory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Overview of provisioned organizations, active subscription plans, seat allocations, and onboarding statuses.
          </p>
        </div>

        <Link
          href="/platform-admin/tenants/new"
          className="inline-flex items-center justify-center px-4 py-2.5 border border-transparent text-sm font-semibold rounded-lg shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Provision Organization
        </Link>
      </div>

      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 absolute left-3 top-3 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search organizations by name, slug, or domain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider whitespace-nowrap">
            Status:
          </label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full sm:w-auto"
          >
            <option value="ALL">All Statuses</option>
            <option value={TenantStatus.ACTIVE}>Active</option>
            <option value={TenantStatus.PENDING_ONBOARDING}>Pending Onboarding</option>
            <option value={TenantStatus.SUSPENDED}>Suspended</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/75 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <tr>
                <th scope="col" className="px-6 py-3.5">
                  Organization
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Status
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Plan & Seats
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Framework
                </th>
                <th scope="col" className="px-6 py-3.5">
                  Onboarding
                </th>
                <th scope="col" className="px-6 py-3.5 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    No organizations match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((tenant) => {
                  const seatUsagePercent =
                    tenant.seatLimit && tenant.seatLimit > 0
                      ? Math.min(100, Math.round((tenant.activeUsersCount / tenant.seatLimit) * 100))
                      : 0;

                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-bold text-gray-900">{tenant.name}</div>
                        <div className="text-xs text-gray-500 flex items-center space-x-2 mt-0.5">
                          <span>slug: {tenant.slug}</span>
                          {tenant.domain && (
                            <>
                              <span>•</span>
                              <span>{tenant.domain}</span>
                            </>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenant.status === TenantStatus.ACTIVE && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Active
                          </span>
                        )}
                        {tenant.status === TenantStatus.PENDING_ONBOARDING && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            Pending Onboarding
                          </span>
                        )}
                        {tenant.status === TenantStatus.SUSPENDED && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                            Suspended
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{tenant.plan?.name || 'No Plan'}</div>
                        <div className="text-xs text-gray-500 mt-1 flex items-center space-x-2">
                          <span>
                            {tenant.activeUsersCount} / {tenant.seatLimit ?? '∞'} seats ({seatUsagePercent}%)
                          </span>
                        </div>
                        <div className="w-24 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden">
                          <div
                            className={`h-1.5 rounded-full ${
                              seatUsagePercent >= 100
                                ? 'bg-red-500'
                                : seatUsagePercent >= 80
                                ? 'bg-amber-500'
                                : 'bg-indigo-600'
                            }`}
                            style={{ width: `${seatUsagePercent}%` }}
                          />
                        </div>
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenant.activeFrameworkVersion ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                            v{tenant.activeFrameworkVersion}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">None</span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenant.isOnboarded ? (
                          <span className="inline-flex items-center text-xs font-semibold text-emerald-600">
                            <svg className="w-4 h-4 mr-1 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Complete
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-xs font-medium text-gray-500">
                            Pending Wizard
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <Link
                          href={`/platform-admin/tenants/${tenant.id}`}
                          className="text-xs font-semibold text-indigo-600 hover:text-indigo-900"
                        >
                          View Details →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
