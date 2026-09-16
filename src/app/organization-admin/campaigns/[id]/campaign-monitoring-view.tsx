'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { launchCampaignAction } from '../actions';
import { CampaignDetail, CampaignMonitoringStats, ParticipantMonitoringRecord } from '@/services';
import { CampaignStatus, CampaignScope, AssessmentStatus } from '@prisma/client';
import { formatDate, formatAssessmentStatus } from '@/lib/format';

interface CampaignMonitoringViewProps {
  campaign: CampaignDetail;
  stats: CampaignMonitoringStats;
}

export function CampaignMonitoringView({ campaign, stats }: CampaignMonitoringViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [actionError, setActionError] = useState<string | null>(null);

  const isDraft = campaign.status === CampaignStatus.DRAFT;

  const handleLaunch = () => {
    if (
      !confirm(
        'Are you sure you want to launch this campaign? Once launched, participants and competencies are locked and staff assessments will be created.'
      )
    ) {
      return;
    }

    setActionError(null);
    startTransition(async () => {
      const result = await launchCampaignAction(campaign.id);
      if (result?.error) {
        setActionError(result.error);
      } else {
        router.refresh();
      }
    });
  };

  const filteredParticipants: ParticipantMonitoringRecord[] = stats.participants.filter(
    (p: ParticipantMonitoringRecord) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'ALL') return true;
      if (statusFilter === 'OVERDUE') return p.isOverdue;
      if (statusFilter === 'NOT_STARTED') return p.assessmentStatus === AssessmentStatus.NOT_STARTED;
      if (statusFilter === 'IN_PROGRESS') return p.assessmentStatus === AssessmentStatus.DRAFT;
      if (statusFilter === 'SUBMITTED')
        return (
          p.assessmentStatus === AssessmentStatus.SUBMITTED ||
          p.assessmentStatus === AssessmentStatus.PENDING_CORROBORATION
        );
      if (statusFilter === 'COMPLETED') return p.assessmentStatus === AssessmentStatus.COMPLETED;

      return true;
    }
  );

  return (
    <div className="space-y-6">
      {actionError && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200/80">
          <div className="flex">
            <svg className="h-5 w-5 text-red-500 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-semibold text-red-800">{actionError}</span>
          </div>
        </div>
      )}

      {isDraft && (
        <div className="rounded-2xl bg-stone-50 p-5 border border-stone-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-stone-200/70 text-neutral-800">
                DRAFT
              </span>
              <h3 className="text-sm font-bold text-neutral-900">Campaign is currently in Draft state</h3>
            </div>
            <p className="mt-1 text-xs text-neutral-600 leading-relaxed">
              Staff assessment records will only be generated when this campaign is launched. You can freely edit its scope, competencies, and deadlines.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href={`/organization-admin/campaigns/${campaign.id}/edit`}
              className="inline-flex items-center px-3.5 py-2 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
            >
              Edit Draft
            </Link>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isPending ? 'Launching...' : 'Launch Campaign'}
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-stone-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-stone-100 pb-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Scope:</span>
            <span
              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border bg-stone-100 text-stone-700 border-stone-200/80"
            >
              {campaign.scope === CampaignScope.ORGANIZATION
                ? 'Organization-Wide'
                : campaign.scope === CampaignScope.TEAM
                ? `Team Scoped (${campaign.campaignTeams.length} ${
                    campaign.campaignTeams.length === 1 ? 'team' : 'teams'
                  })`
                : 'Individual Staff'}
            </span>
          </div>

          {campaign.frameworkVersion && (
            <div className="flex items-center space-x-2 text-xs text-neutral-600 bg-stone-50 px-3 py-1.5 rounded-xl border border-stone-200/80">
              <span className="font-semibold text-neutral-700">Bound Framework:</span>
              <span className="font-mono text-neutral-900">Version {campaign.frameworkVersion.version}</span>
            </div>
          )}
        </div>

        {campaign.scope === CampaignScope.TEAM && campaign.campaignTeams.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Included Teams:</span>
            <div className="flex flex-wrap gap-2 pt-1">
              {campaign.campaignTeams.map((ct) => (
                <span
                  key={ct.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-medium bg-stone-50 text-neutral-800 border border-stone-200/80"
                >
                  {ct.team.name}
                  {ct.team.department && (
                    <span className="text-neutral-500 ml-1">({ct.team.department.name})</span>
                  )}
                  <span className="ml-1.5 px-1.5 py-0.5 bg-stone-200/60 rounded-full text-[10px] text-neutral-700">
                    {ct.team._count.memberships} members
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Campaign Progress</h2>
            <p className="text-xs text-neutral-500 mt-0.5">Overall completion rate among enrolled staff.</p>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-neutral-900 tracking-tight">{stats.completionPercentage}%</span>
            <span className="text-xs text-neutral-500">
              ({stats.completed} of {stats.totalParticipants} completed)
            </span>
          </div>
        </div>

        <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
          <div
            className={`h-2.5 rounded-full transition-all duration-500 ${
              stats.completionPercentage === 100
                ? 'bg-emerald-600'
                : stats.completionPercentage > 0
                ? 'bg-neutral-900'
                : 'bg-stone-200'
            }`}
            style={{ width: `${Math.min(100, stats.completionPercentage)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="block text-xl font-bold text-neutral-900">{stats.totalParticipants}</span>
            <span className="text-[11px] text-neutral-500 font-semibold">Total Staff</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="block text-xl font-bold text-neutral-700">{stats.notStarted}</span>
            <span className="text-[11px] text-neutral-500 font-semibold">Not Started</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="block text-xl font-bold text-neutral-800">{stats.inProgress}</span>
            <span className="text-[11px] text-neutral-500 font-semibold">In Progress</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/80 text-center">
            <span className="block text-xl font-bold text-neutral-800">{stats.submitted}</span>
            <span className="text-[11px] text-neutral-500 font-semibold">Submitted</span>
          </div>
          <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200/80 text-center">
            <span className="block text-xl font-bold text-emerald-800">{stats.completed}</span>
            <span className="text-[11px] text-emerald-700 font-semibold">Completed</span>
          </div>
          <div
            className={`p-3 rounded-xl border text-center ${
              stats.overdue > 0
                ? 'bg-red-50 border-red-200/80 text-red-700'
                : 'bg-stone-50 border-stone-200/80 text-neutral-500'
            }`}
          >
            <span className="block text-xl font-bold">{stats.overdue}</span>
            <span className="text-[11px] font-semibold">Overdue</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-stone-100 pb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">Participant Roster & Tracking</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Monitor individual progress, identify overdue staff, and track corroboration status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs placeholder-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900 bg-white"
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 border border-stone-300 rounded-xl text-xs font-medium bg-white focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 text-neutral-900"
            >
              <option value="ALL">All Statuses ({stats.totalParticipants})</option>
              <option value="NOT_STARTED">Not Started ({stats.notStarted})</option>
              <option value="IN_PROGRESS">In Progress ({stats.inProgress})</option>
              <option value="SUBMITTED">Submitted ({stats.submitted})</option>
              <option value="COMPLETED">Completed ({stats.completed})</option>
              <option value="OVERDUE">Overdue ({stats.overdue})</option>
            </select>
          </div>
        </div>

        {filteredParticipants.length === 0 ? (
          <p className="text-xs text-neutral-400 italic py-6 text-center">
            {stats.participants.length === 0
              ? 'No participants enrolled in this campaign.'
              : 'No participants match the selected filter criteria.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-stone-100">
              <thead className="bg-stone-50/70">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Participant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Teams
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Assessment Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Deadline Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-[11px] font-bold text-neutral-500 uppercase tracking-wider"
                  >
                    Completed Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-stone-100">
                {filteredParticipants.map((p) => {
                  return (
                    <tr key={p.userId} className="hover:bg-stone-50/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-semibold text-neutral-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">{p.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                        {p.teams.length > 0 ? p.teams.map((t) => t.name).join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {isDraft ? (
                          <span className="text-xs text-neutral-400 italic">Pending Launch</span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              p.assessmentStatus === AssessmentStatus.COMPLETED
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200/80'
                                : p.assessmentStatus === AssessmentStatus.PENDING_CORROBORATION
                                ? 'bg-stone-100 text-stone-700 border-stone-200/80'
                                : p.assessmentStatus === AssessmentStatus.SUBMITTED
                                ? 'bg-stone-100 text-stone-700 border-stone-200/80'
                                : p.assessmentStatus === AssessmentStatus.DRAFT
                                ? 'bg-stone-100 text-stone-700 border-stone-200/80'
                                : 'bg-stone-50 text-stone-500 border-stone-200/60'
                            }`}
                          >
                            {formatAssessmentStatus(p.assessmentStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs">
                        {p.isOverdue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/80">
                            Overdue
                          </span>
                        ) : p.assessmentStatus === AssessmentStatus.COMPLETED ? (
                          <span className="text-xs text-emerald-700 font-semibold">On Track</span>
                        ) : (
                          <span className="text-xs text-neutral-500">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-neutral-500">
                        {p.completedAt ? formatDate(p.completedAt) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
