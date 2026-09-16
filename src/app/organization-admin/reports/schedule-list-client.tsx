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
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Scheduled Capability Reports</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Automatically generate and deliver capability gap Excel reports to designated stakeholders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsCreateOpen(!isCreateOpen)}
          className="inline-flex items-center px-4 py-2.5 rounded-xl text-xs font-semibold shadow-2xs text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          {isCreateOpen ? 'Cancel' : '+ New Schedule'}
        </button>
      </div>

      {isCreateOpen && (
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs p-6 space-y-5">
          <div className="border-b border-stone-100 pb-3">
            <h3 className="text-sm font-bold text-neutral-900">Create Report Schedule</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Set up automated capability reporting with verified role gap benchmarks.
            </p>
          </div>

          {formState.error && (
            <div className="rounded-xl bg-red-50 p-3.5 text-xs text-red-700 border border-red-200/80">
              {formState.error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Schedule Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                placeholder="e.g. Weekly Executive Capability Report"
                className="w-full text-sm rounded-xl border border-stone-300 shadow-2xs px-3.5 py-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="scopeType" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
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
                  className="w-full text-sm rounded-xl border border-stone-300 shadow-2xs px-3.5 py-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                >
                  <option value={ScheduleScopeType.ORGANIZATION}>Organization-wide</option>
                  <option value={ScheduleScopeType.TEAM}>Team Capability</option>
                </select>
                <input type="hidden" name="reportType" value={reportType} />
              </div>

              {scopeType === ScheduleScopeType.TEAM && (
                <div>
                  <label htmlFor="scopeId" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                    Select Team *
                  </label>
                  <select
                    id="scopeId"
                    name="scopeId"
                    required
                    className="w-full text-sm rounded-xl border border-stone-300 shadow-2xs px-3.5 py-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
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
                <label htmlFor="frequency" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  Recurrence Frequency *
                </label>
                <select
                  id="frequency"
                  name="frequency"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as ScheduleFrequency)}
                  className="w-full text-sm rounded-xl border border-stone-300 shadow-2xs px-3.5 py-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                >
                  <option value={ScheduleFrequency.DAILY}>Daily</option>
                  <option value={ScheduleFrequency.WEEKLY}>Weekly</option>
                  <option value={ScheduleFrequency.MONTHLY}>Monthly</option>
                </select>
              </div>

              <div>
                <label htmlFor="nextRunAt" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                  First Run Date (UTC)
                </label>
                <input
                  id="nextRunAt"
                  name="nextRunAt"
                  type="date"
                  value={nextRunDate}
                  onChange={(e) => setNextRunDate(e.target.value)}
                  className="w-full text-sm rounded-xl border border-stone-300 shadow-2xs px-3.5 py-2.5 bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
                Recipients (Active Organization Members) *
              </label>
              <div className="max-h-40 overflow-y-auto border border-stone-200/80 rounded-xl p-2.5 space-y-1 bg-stone-50/50">
                {users.map((u) => (
                  <label
                    key={u.id}
                    className="flex items-center gap-2.5 p-1.5 hover:bg-white rounded-lg cursor-pointer text-xs transition-colors"
                  >
                    <input
                      type="checkbox"
                      name="recipientUserIds"
                      value={u.id}
                      checked={selectedRecipients.includes(u.id)}
                      onChange={() => handleRecipientToggle(u.id)}
                      className="rounded text-neutral-900 focus:ring-neutral-900 border-stone-300 accent-neutral-900 h-3.5 w-3.5"
                    />
                    <span className="font-semibold text-neutral-900">{u.name}</span>
                    <span className="text-neutral-400">({u.email})</span>
                    <span className="ml-auto text-[10px] text-neutral-500 uppercase font-bold">{u.role}</span>
                  </label>
                ))}
              </div>
              <div className="text-[11px] text-neutral-400 mt-1.5">
                Selected {selectedRecipients.length} recipient(s)
              </div>
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-3.5 py-2 border border-stone-200/80 text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors shadow-2xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending || selectedRecipients.length === 0}
                className="px-4 py-2 bg-neutral-900 text-white text-xs font-semibold rounded-xl hover:bg-neutral-800 disabled:opacity-50 transition-colors shadow-2xs cursor-pointer"
              >
                {isPending ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {schedules.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center text-xs text-neutral-400 italic shadow-xs">
          No automated report schedules configured yet. Click <strong>+ New Schedule</strong> to set up scheduled capability reports.
        </div>
      ) : (
        <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 overflow-hidden">
          <table className="min-w-full divide-y divide-stone-100 text-xs">
            <thead className="bg-stone-50/70 text-[11px] font-bold text-neutral-500 uppercase tracking-wider">
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
            <tbody className="divide-y divide-stone-100 bg-white">
              {schedules.map((schedule) => {
                const team = teams.find((t) => t.id === schedule.scopeId);
                const scopeLabel =
                  schedule.scopeType === ScheduleScopeType.TEAM
                    ? `Team: ${team?.name || 'Assigned Team'}`
                    : 'Organization-wide';

                return (
                  <tr key={schedule.id} className="hover:bg-stone-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-neutral-900">{schedule.name}</div>
                      <div className="text-[11px] text-neutral-400">Created by {schedule.createdBy.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-neutral-600">
                      {scopeLabel}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                        {schedule.frequency}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-neutral-700">
                      {formatDate(schedule.nextRunAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {schedule.lastRunAt ? (
                        <div>
                          <div className="text-neutral-900 font-medium">{formatDate(schedule.lastRunAt)}</div>
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              schedule.lastRunStatus === 'SUCCESS'
                                ? 'text-emerald-700 bg-emerald-50'
                                : 'text-red-700 bg-red-50'
                            }`}
                          >
                            {schedule.lastRunStatus}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-400 italic">Never run</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700 border border-stone-200/80"
                        title={schedule.recipients.map((r) => r.user.name).join(', ')}
                      >
                        {schedule.recipients.length} user(s)
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                          schedule.isActive
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                            : 'bg-stone-100 text-stone-600 border border-stone-200/80'
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
                        className="text-xs font-semibold text-neutral-900 hover:underline cursor-pointer"
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
