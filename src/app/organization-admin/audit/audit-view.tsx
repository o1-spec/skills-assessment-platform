'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuditLogWithRelations } from '@/services/audit';
import { AuditAction } from '@prisma/client';

interface OrgAdminAuditViewProps {
  initialData: {
    logs: AuditLogWithRelations[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  availableActions: AuditAction[];
  currentFilters: {
    action: string;
    entityType: string;
    from: string;
    to: string;
    page: number;
    pageSize: number;
  };
}

export function OrgAdminAuditView({
  initialData,
  availableActions,
  currentFilters,
}: OrgAdminAuditViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedLog, setSelectedLog] = useState<AuditLogWithRelations | null>(null);

  const [action, setAction] = useState(currentFilters.action);
  const [entityType, setEntityType] = useState(currentFilters.entityType);
  const [from, setFrom] = useState(currentFilters.from);
  const [to, setTo] = useState(currentFilters.to);

  function applyFilters(newOverrides: Record<string, string | number> = {}) {
    const params = new URLSearchParams();

    const filters = {
      action,
      entityType,
      from,
      to,
      page: 1,
      pageSize: currentFilters.pageSize,
      ...newOverrides,
    };

    if (filters.action) params.set('action', String(filters.action));
    if (filters.entityType) params.set('entityType', String(filters.entityType));
    if (filters.from) params.set('from', String(filters.from));
    if (filters.to) params.set('to', String(filters.to));
    if (Number(filters.page) > 1) params.set('page', String(filters.page));
    if (Number(filters.pageSize) !== 25) params.set('pageSize', String(filters.pageSize));

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleReset() {
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
    router.push(pathname);
  }

  function getActionBadgeStyle(actionName: string) {
    if (actionName.includes('SUSPEND') || actionName.includes('DEACTIVATE') || actionName.includes('ARCHIVE')) {
      return 'bg-amber-100 text-amber-800 border-amber-300';
    }
    if (actionName.includes('CREATE') || actionName.includes('PROVISION') || actionName.includes('PUBLISH') || actionName.includes('REACTIVATE')) {
      return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    }
    if (actionName.includes('LOGIN')) {
      return 'bg-blue-100 text-blue-800 border-blue-300';
    }
    if (actionName.includes('SUBMIT') || actionName.includes('LAUNCH')) {
      return 'bg-purple-100 text-purple-800 border-purple-300';
    }
    return 'bg-gray-100 text-gray-800 border-gray-300';
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Organization Audit Trail</h1>
          <p className="mt-1 text-sm text-gray-500">
            Immutable, cryptographically anchored historical record of sensitive security and business mutations.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-gray-100 border border-gray-300 rounded-md text-gray-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Tenant-Isolated & Append-Only
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              {availableActions.map((act) => (
                <option key={act} value={act}>
                  {act}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Entity Type</label>
            <input
              type="text"
              placeholder="e.g. User, RoleProfile, Campaign"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full text-sm rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => applyFilters()}
            className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none shadow-sm"
          >
            Filter Records
          </button>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Found {initialData.totalCount} event{initialData.totalCount === 1 ? '' : 's'}
          </span>
          <span className="text-xs text-gray-400">
            Page {initialData.page} of {Math.max(1, initialData.totalPages)}
          </span>
        </div>

        {initialData.logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 text-gray-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-gray-900">No audit events match your filter</h3>
            <p className="text-xs text-gray-500 mt-1">Try resetting the filters or broadening your date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Target Entity</th>
                  <th scope="col" className="px-4 py-3">Actor</th>
                  <th scope="col" className="px-4 py-3">IP Address</th>
                  <th scope="col" className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {initialData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/75 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${getActionBadgeStyle(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{log.resourceType}</div>
                      {log.resourceId && (
                        <div className="text-[11px] text-gray-400 font-mono truncate max-w-30">
                          {log.resourceId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-gray-900">{log.actor.name}</div>
                          <div className="text-[11px] text-gray-400">{log.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-500 font-mono text-[11px]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="text-blue-600 hover:text-blue-900 font-medium text-xs px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Controls */}
        {initialData.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
            <button
              type="button"
              disabled={initialData.page <= 1}
              onClick={() => applyFilters({ page: initialData.page - 1 })}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-500">
              Page {initialData.page} of {initialData.totalPages}
            </span>
            <button
              type="button"
              disabled={initialData.page >= initialData.totalPages}
              onClick={() => applyFilters({ page: initialData.page + 1 })}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl border border-gray-200 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeStyle(
                    selectedLog.action
                  )}`}
                >
                  {selectedLog.action}
                </span>
                <span className="ml-2 text-xs text-gray-500">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block">Log ID</span>
                <span className="font-mono text-gray-800 break-all">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-gray-400 block">Target Entity</span>
                <span className="font-semibold text-gray-800">
                  {selectedLog.resourceType}{' '}
                  <span className="font-mono font-normal text-gray-500">
                    ({selectedLog.resourceId || 'N/A'})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">Actor</span>
                <span className="font-medium text-gray-800">
                  {selectedLog.actor ? `${selectedLog.actor.name} (${selectedLog.actor.email})` : 'System'}
                </span>
              </div>
              <div>
                <span className="text-gray-400 block">IP Address</span>
                <span className="font-mono text-gray-800">{selectedLog.ipAddress || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-400 block">User Agent</span>
                <span className="text-gray-800 truncate block" title={selectedLog.userAgent || ''}>
                  {selectedLog.userAgent || '—'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs font-semibold text-gray-700 block mb-2">Event Metadata / Details</span>
              <div className="bg-gray-900 rounded-lg p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-60">
                {selectedLog.details && Object.keys(selectedLog.details as object).length > 0 ? (
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                ) : (
                  <span className="text-gray-500 italic">No additional metadata logged</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
