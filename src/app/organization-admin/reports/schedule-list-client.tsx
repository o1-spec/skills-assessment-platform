'use client';

import { useState, useTransition } from 'react';
import {
  createReportScheduleAction,
  toggleReportScheduleActiveAction,
  ScheduleFormState,
} from './actions';
import { ReportType, ScheduleFrequency, ScheduleScopeType, UserRole } from '@prisma/client';
import { formatDate } from '@/lib/format';

interface UserOption {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface TeamOption {
  id: string;
  name: string;
}

interface ScheduleItem {
  id: string;
  name: string;
  reportType: ReportType;
  scopeType: ScheduleScopeType;
  scopeId: string | null;
  frequency: ScheduleFrequency;
  nextRunAt: Date;
  lastRunAt: Date | null;
  lastRunStatus: string | null;
  lastRunError: string | null;
  isActive: boolean;
  createdBy: { id: string; name: string };
  recipients: Array<{ user: { id: string; name: string; email: string; isActive: boolean } }>;
}

interface ScheduleListClientProps {
  schedules: ScheduleItem[];
  users: UserOption[];
  teams: TeamOption[];
}

export function ScheduleListClient({ schedules, users, teams }: ScheduleListClientProps) {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [scopeType, setScopeType] = useState<ScheduleScopeType>(ScheduleScopeType.ORGANIZATION);
  const [reportType, setReportType] = useState<ReportType>(ReportType.ORGANIZATION_GAP);
  const [frequency, setFrequency] = useState<ScheduleFrequency>(ScheduleFrequency.WEEKLY);
  const [nextRunDate, setNextRunDate] = useState(() =>
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [formState, setFormState] = useState<ScheduleFormState>({});
  const [isPending, startTransition] = useTransition();

  const handleToggleActive = (scheduleId: string, currentActive: boolean) => {
    startTransition(async () => {
      await toggleReportScheduleActiveAction(scheduleId, !currentActive);
    });
  };

  const handleRecipientToggle = (userId: string) => {
    setSelectedRecipients((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createReportScheduleAction(undefined, formData);
      if (res.error) {
        setFormState(res);
      } else {
        setIsCreateOpen(false);
        setFormState({});
        setSelectedRecipients([]);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Scheduled Capability Reports</h2>
          <p className="text-xs text-gray-500">
            Automatically generate and deliver capability gap Excel reports to designated stakeholders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex items-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
        >
          {isCreateOpen ? 'Cancel' : '+ New Schedule'}
        </button>
      </div>

      {isCreateOpen && (
        <div className="bg-white rounded-lg border border-blue-200 shadow-sm p-6 space-y-5">
          <div className="border-b border-gray-100 pb-3">
            <h3 className="text-sm font-bold text-gray-900">Create Report Schedule</h3>
            <p className="text-xs text-gray-500">
              Set up automated capability reporting with verified role gap benchmarks.
            </p>
          </div>

          {formState.error && (
            <div className="rounded-md bg-red-50 p-3 text-xs text-red-700 border border-red-200">
              {formState.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-medium text-gray-700 mb-1">
                Schedule Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Weekly Executive Capability Report"
                className="w-full text-xs rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scopeType" className="block text-xs font-medium text-gray-700 mb-1">
                  Report Scope *
                </label>
                <select
                  id="scopeType"
                  name="scopeType"
                  value={scopeType}
                  onChange={(e) => {
                    const val = e.target.value as ScheduleScopeType;
                    setScopeType(val);
                    setReportType(
                      val === ScheduleScopeType.TEAM
                        ? ReportType.TEAM_GAP
                        : ReportType.ORGANIZATION_GAP
                    );
                  }}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                >
                  <option value={ScheduleScopeType.ORGANIZATION}>Organization-wide</option>
                  <option value={ScheduleScopeType.TEAM}>Team Capability</option>
                </select>
                <input type="hidden" name="reportType" value={reportType} />
              </div>

              {scopeType === ScheduleScopeType.TEAM && (
                <div>
                  <label htmlFor="scopeId" className="block text-xs font-medium text-gray-700 mb-1">
                    Select Team *
                  </label>
                  <select
                    id="scopeId"
                    name="scopeId"
                    required
                    className="w-full text-xs rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                  >
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="frequency" className="block text-xs font-medium text-gray-700 mb-1">
                  Recurrence Frequency *
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm p-2 border bg-white"
                >
                  <option value={ScheduleFrequency.DAILY}>Daily</option>
                  <option value={ScheduleFrequency.WEEKLY}>Weekly</option>
                  <option value={ScheduleFrequency.MONTHLY}>Monthly</option>
                </select>
              </div>

              <div>
                <label htmlFor="nextRunAt" className="block text-xs font-medium text-gray-700 mb-1">
                  First Run Date (UTC)
                </label>
                <input
                  id="nextRunAt"
                  name="nextRunAt"
                  type="date"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                  className="w-full text-xs rounded-md border-gray-300 shadow-sm p-2 border"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Recipients (Active Organization Members) *
              </label>
              <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md p-2 space-y-1 bg-gray-50">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2 p-1 hover:bg-white rounded cursor-pointer text-xs"
                  >
                    <input
                      type="checkbox"
                      name="recipientUserIds"
                      value={u.id}
                      checked={selectedRecipients.includes(u.id)}
                      onChange={() => handleRecipientToggle(u.id)}
                      className="rounded text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                    />
                    <span className="font-medium text-gray-900">{u.name}</span>
                    <span className="text-gray-400">({u.email})</span>
                    <span className="ml-auto text-[10px] text-gray-400 capitalize">{u.role.toLowerCase()}</span>
                  </label>
                ))}
              </div>
              <div className="text-[11px] text-gray-400 mt-1">
                Selected {selectedRecipients.length} recipient(s)
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3 py-1.5 border border-gray-300 text-xs font-medium rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || selectedRecipients.length === 0}
                className="px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isPending ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500 text-sm">
          No automated report schedules configured yet. Click <strong>+ New Schedule</strong> to set up scheduled capability reports.
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200 text-xs">
            <thead className="bg-gray-50 text-gray-500 font-medium uppercase">
              <tr>
                <th scope="col" className="px-6 py-3 text-left">Schedule</th>
                <th scope="col" className="px-6 py-3 text-left">Scope</th>
                <th scope="col" className="px-6 py-3 text-center">Frequency</th>
                <th scope="col" className="px-6 py-3 text-left">Next Run (UTC)</th>
                <th scope="col" className="px-6 py-3 text-left">Last Run</th>
                <th scope="col" className="px-6 py-3 text-center">Recipients</th>
                <th scope="col" className="px-6 py-3 text-center">Status</th>
                <th scope="col" className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {schedules.map((schedule) => {
                const team = teams.find((t) => t.id === schedule.scopeId);
                const scopeLabel =
                  schedule.scopeType === ScheduleScopeType.TEAM
                    ? `Team: ${team?.name || 'Assigned Team'}`
                    : 'Organization-wide';

                return (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{schedule.name}</div>
                      <div className="text-[11px] text-gray-400">Created by {schedule.createdBy.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {scopeLabel}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-gray-100 text-gray-800">
                        {schedule.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                      {formatDate(schedule.nextRunAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {schedule.lastRunAt ? (
                        <div>
                          <div className="text-gray-900">{formatDate(schedule.lastRunAt)}</div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium ${
                              schedule.lastRunStatus === 'SUCCESS'
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-red-700 bg-red-50'
                            }`}
                          >
                            {schedule.lastRunStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Never run</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700"
                        title={schedule.recipients.map((r) => r.user.name).join(', ')}
                      >
                        {schedule.recipients.length} user(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          schedule.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {schedule.isActive ? 'Active' : 'Paused'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleToggleActive(schedule.id, schedule.isActive)}
                        className={`text-xs font-semibold ${
                          schedule.isActive
                            ? 'text-amber-600 hover:text-amber-800'
                            : 'text-emerald-600 hover:text-emerald-800'
                        }`}
                      >
                        {schedule.isActive ? 'Pause' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
