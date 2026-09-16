'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AuditLogWithRelations } from '@/services/audit';
import { AuditAction } from '@prisma/client';

interface PlatformAdminAuditViewProps {
  initialData: {
    logs: AuditLogWithRelations[];
    totalCount: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
  tenants: Array<{ id: string; name: string; slug: string }>;
  availableActions: AuditAction[];
  currentFilters: {
    tenantId: string;
    action: string;
    entityType: string;
    from: string;
    to: string;
    page: number;
    pageSize: number;
  };
}

export function PlatformAdminAuditView({
  initialData,
  tenants,
  availableActions,
  currentFilters,
}: PlatformAdminAuditViewProps) {
  const router = useRouter();
  const pathname = usePathname();

  const [selectedLog, setSelectedLog] = useState<AuditLogWithRelations | null>(null);

  const [tenantId, setTenantId] = useState(currentFilters.tenantId);
  const [action, setAction] = useState(currentFilters.action);
  const [entityType, setEntityType] = useState(currentFilters.entityType);
  const [from, setFrom] = useState(currentFilters.from);
  const [to, setTo] = useState(currentFilters.to);

  function applyFilters(newOverrides: Record<string, string | number> = {}) {
    const params = new URLSearchParams();

    const filters = {
      tenantId,
      action,
      entityType,
      from,
      to,
      page: 1,
      pageSize: currentFilters.pageSize,
      ...newOverrides,
    };

    if (filters.tenantId) params.set('tenantId', String(filters.tenantId));
    if (filters.action) params.set('action', String(filters.action));
    if (filters.entityType) params.set('entityType', String(filters.entityType));
    if (filters.from) params.set('from', String(filters.from));
    if (filters.to) params.set('to', String(filters.to));
    if (Number(filters.page) > 1) params.set('page', String(filters.page));
    if (Number(filters.pageSize) !== 25) params.set('pageSize', String(filters.pageSize));

    router.push(`${pathname}?${params.toString()}`);
  }

  function handleReset() {
    setTenantId('');
    setAction('');
    setEntityType('');
    setFrom('');
    setTo('');
    router.push(pathname);
  }

  function getActionBadgeStyle(actionName: string) {
    if (actionName.includes('SUSPEND') || actionName.includes('DEACTIVATE') || actionName.includes('ARCHIVE')) {
      return 'bg-amber-50 text-amber-800 border-amber-200/80';
    }
    if (actionName.includes('CREATE') || actionName.includes('PROVISION') || actionName.includes('PUBLISH') || actionName.includes('REACTIVATE')) {
      return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
    }
    if (actionName.includes('LOGIN')) {
      return 'bg-stone-100 text-stone-800 border-stone-200/80';
    }
    if (actionName.includes('SUBMIT') || actionName.includes('LAUNCH')) {
      return 'bg-stone-100 text-stone-800 border-stone-200/80';
    }
    return 'bg-stone-100 text-stone-700 border-stone-200/80';
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">Platform Audit Logs</h1>
          <p className="mt-1 text-sm text-stone-500">
            Immutable, cross-tenant security and administrative activity trail.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-stone-100 border border-stone-200/80 rounded-xl text-stone-700">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Strictly Append-Only
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Organization</label>
            <select
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200/80 bg-stone-50/40 text-stone-900 shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 p-2"
            >
              <option value="">All Organizations</option>
              {tenants.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">Action</label>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200/80 bg-stone-50/40 text-stone-900 shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 p-2"
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
            <label className="block text-xs font-medium text-stone-600 mb-1">Entity Type</label>
            <input
              type="text"
              placeholder="e.g. Tenant, User, Plan"
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200/80 bg-stone-50/40 text-stone-900 shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 p-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">From Date</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200/80 bg-stone-50/40 text-stone-900 shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 p-2"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-stone-600 mb-1">To Date</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full text-sm rounded-xl border border-stone-200/80 bg-stone-50/40 text-stone-900 shadow-xs focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 p-2"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-stone-100">
          <button
            type="button"
            onClick={handleReset}
            className="px-3.5 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 transition-colors shadow-xs"
          >
            Reset
          </button>
          <button
            type="button"
            onClick={() => applyFilters()}
            className="px-4 py-1.5 text-xs font-medium text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 transition-colors shadow-xs"
          >
            Filter Records
          </button>
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
            Found {initialData.totalCount} event{initialData.totalCount === 1 ? '' : 's'}
          </span>
          <span className="text-xs text-stone-400">
            Page {initialData.page} of {Math.max(1, initialData.totalPages)}
          </span>
        </div>

        {initialData.logs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-stone-100 text-stone-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-sm font-semibold text-stone-900">No audit events match your filter</h3>
            <p className="text-xs text-stone-500 mt-1">Try resetting the filters or broadening your date range.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-200 text-left text-xs">
              <thead className="bg-stone-50 text-stone-600 font-medium">
                <tr>
                  <th scope="col" className="px-4 py-3">Timestamp</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Target Entity</th>
                  <th scope="col" className="px-4 py-3">Organization</th>
                  <th scope="col" className="px-4 py-3">Actor</th>
                  <th scope="col" className="px-4 py-3">IP Address</th>
                  <th scope="col" className="px-4 py-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {initialData.logs.map((log) => (
                  <tr key={log.id} className="hover:bg-stone-50/75 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-stone-500">
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
                      <div className="font-medium text-stone-900">{log.resourceType}</div>
                      {log.resourceId && (
                        <div className="text-[11px] text-stone-400 font-mono truncate max-w-30">
                          {log.resourceId}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.tenant ? (
                        <span className="font-medium text-stone-800">{log.tenant.name}</span>
                      ) : (
                        <span className="text-stone-400 italic">Global / Platform</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {log.actor ? (
                        <div>
                          <div className="font-medium text-stone-900">{log.actor.name}</div>
                          <div className="text-[11px] text-stone-400">{log.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-stone-400 italic">System</span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-stone-500 font-mono text-[11px]">
                      {log.ipAddress || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedLog(log)}
                        className="text-stone-800 hover:text-stone-900 font-medium text-xs px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-stone-200/70 border border-stone-200/60 transition-colors"
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

        {initialData.totalPages > 1 && (
          <div className="px-6 py-4 border-t border-stone-100 flex items-center justify-between">
            <button
              type="button"
              disabled={initialData.page <= 1}
              onClick={() => applyFilters({ page: initialData.page - 1 })}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-stone-500">
              Page {initialData.page} of {initialData.totalPages}
            </span>
            <button
              type="button"
              disabled={initialData.page >= initialData.totalPages}
              onClick={() => applyFilters({ page: initialData.page + 1 })}
              className="px-3 py-1.5 text-xs font-medium text-stone-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 bg-neutral-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-xl border border-stone-200/80 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-stone-200/80">
              <div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${getActionBadgeStyle(
                    selectedLog.action
                  )}`}
                >
                  {selectedLog.action}
                </span>
                <span className="ml-2 text-xs text-stone-500">
                  {new Date(selectedLog.createdAt).toLocaleString()}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="text-stone-400 hover:text-stone-600 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-stone-400 block">Log ID</span>
                <span className="font-mono text-stone-800 break-all">{selectedLog.id}</span>
              </div>
              <div>
                <span className="text-stone-400 block">Target Entity</span>
                <span className="font-semibold text-stone-800">
                  {selectedLog.resourceType}{' '}
                  <span className="font-mono font-normal text-stone-500">
                    ({selectedLog.resourceId || 'N/A'})
                  </span>
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Organization</span>
                <span className="font-medium text-stone-800">
                  {selectedLog.tenant ? `${selectedLog.tenant.name} (${selectedLog.tenant.slug})` : 'Global / Platform'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">Actor</span>
                <span className="font-medium text-stone-800">
                  {selectedLog.actor ? `${selectedLog.actor.name} (${selectedLog.actor.email})` : 'System'}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block">IP Address</span>
                <span className="font-mono text-stone-800">{selectedLog.ipAddress || '—'}</span>
              </div>
              <div>
                <span className="text-stone-400 block">User Agent</span>
                <span className="text-stone-800 truncate block" title={selectedLog.userAgent || ''}>
                  {selectedLog.userAgent || '—'}
                </span>
              </div>
            </div>

            <div className="pt-2">
              <span className="text-xs font-semibold text-stone-700 block mb-2">Event Metadata / Details</span>
              <div className="bg-neutral-950 rounded-xl p-4 font-mono text-xs text-emerald-400 overflow-x-auto max-h-60 border border-stone-800">
                {selectedLog.details && Object.keys(selectedLog.details as object).length > 0 ? (
                  <pre>{JSON.stringify(selectedLog.details, null, 2)}</pre>
                ) : (
                  <span className="text-stone-500 italic">No additional metadata logged</span>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 text-xs font-medium text-stone-700 bg-stone-100 hover:bg-stone-200/80 rounded-xl transition-colors"
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
