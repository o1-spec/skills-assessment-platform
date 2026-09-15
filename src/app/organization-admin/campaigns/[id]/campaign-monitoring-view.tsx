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

  // Filter participants
  const filteredParticipants: ParticipantMonitoringRecord[] = stats.participants.filter(
    (p: ParticipantMonitoringRecord) => {
      // Search query filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.email.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Status filter
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
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-red-800">{actionError}</span>
          </div>
        </div>
      )}

      {/* DRAFT Warning and Action Banner */}
      {isDraft && (
        <div className="rounded-lg bg-amber-50 p-5 border border-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-200 text-amber-900">
                DRAFT
              </span>
              <h3 className="text-sm font-bold text-amber-900">Campaign is currently in Draft state</h3>
            </div>
            <p className="mt-1 text-xs text-amber-800">
              Staff assessment records will only be generated when this campaign is launched. You can freely edit its scope, competencies, and deadlines.
            </p>
          </div>
          <div className="flex items-center space-x-3 shrink-0">
            <Link
              href={`/organization-admin/campaigns/${campaign.id}/edit`}
              className="inline-flex items-center px-3.5 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Edit Draft
            </Link>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isPending}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
            >
              {isPending ? 'Launching...' : 'Launch Campaign'}
            </button>
          </div>
        </div>
      )}

      {/* Campaign Metadata & Bound Framework Callout */}
      <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
          <div className="flex items-center space-x-3">
            <span className="text-xs font-semibold uppercase text-gray-500">Scope:</span>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                campaign.scope === CampaignScope.ORGANIZATION
                  ? 'bg-purple-100 text-purple-800'
                  : campaign.scope === CampaignScope.TEAM
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {campaign.scope === CampaignScope.ORGANIZATION
                ? '🏢 Organization-Wide'
                : campaign.scope === CampaignScope.TEAM
                ? `👥 Team Scoped (${campaign.campaignTeams.length} ${
                    campaign.campaignTeams.length === 1 ? 'team' : 'teams'
                  })`
                : '👤 Individual Staff'}
            </span>
          </div>

          {campaign.frameworkVersion && (
            <div className="flex items-center space-x-2 text-xs text-gray-600 bg-gray-50 px-3 py-1.5 rounded-md border border-gray-200">
              <span className="font-semibold text-gray-700">Bound Framework:</span>
              <span className="font-mono text-gray-800">Version {campaign.frameworkVersion.version}</span>
            </div>
          )}
        </div>

        {/* If team scoped, show team tags */}
        {campaign.scope === CampaignScope.TEAM && campaign.campaignTeams.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-xs font-medium text-gray-500">Included Teams:</span>
            <div className="flex flex-wrap gap-2">
              {campaign.campaignTeams.map((ct) => (
                <span
                  key={ct.id}
                  className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200"
                >
                  {ct.team.name}
                  {ct.team.department && (
                    <span className="text-blue-500 ml-1">({ct.team.department.name})</span>
                  )}
                  <span className="ml-1.5 px-1.5 py-0.2 bg-blue-200/60 rounded text-[10px] text-blue-900">
                    {ct.team._count.memberships} members
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Progress Bar & High-Level Monitoring Stats */}
      <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-gray-900">Campaign Progress</h2>
            <p className="text-xs text-gray-500">Overall completion rate among enrolled staff.</p>
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-3xl font-black text-gray-900">{stats.completionPercentage}%</span>
            <span className="text-xs text-gray-500">
              ({stats.completed} of {stats.totalParticipants} completed)
            </span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              stats.completionPercentage === 100
                ? 'bg-emerald-500'
                : stats.completionPercentage > 50
                ? 'bg-blue-600'
                : stats.completionPercentage > 0
                ? 'bg-indigo-500'
                : 'bg-gray-200'
            }`}
            style={{ width: `${Math.min(100, stats.completionPercentage)}%` }}
          />
        </div>

        {/* 5-Key Stat Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2">
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <span className="block text-xl font-bold text-gray-900">{stats.totalParticipants}</span>
            <span className="text-xs text-gray-500 font-medium">Total Staff</span>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <span className="block text-xl font-bold text-gray-700">{stats.notStarted}</span>
            <span className="text-xs text-gray-500 font-medium">Not Started</span>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-lg border border-blue-100 text-center">
            <span className="block text-xl font-bold text-blue-700">{stats.inProgress}</span>
            <span className="text-xs text-blue-600 font-medium">In Progress</span>
          </div>
          <div className="p-3 bg-purple-50/60 rounded-lg border border-purple-100 text-center">
            <span className="block text-xl font-bold text-purple-700">{stats.submitted}</span>
            <span className="text-xs text-purple-600 font-medium">Submitted</span>
          </div>
          <div className="p-3 bg-emerald-50/60 rounded-lg border border-emerald-100 text-center">
            <span className="block text-xl font-bold text-emerald-700">{stats.completed}</span>
            <span className="text-xs text-emerald-600 font-medium">Completed</span>
          </div>
          <div
            className={`p-3 rounded-lg border text-center ${
              stats.overdue > 0
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}
          >
            <span className="block text-xl font-bold">{stats.overdue}</span>
            <span className="text-xs font-medium">Overdue</span>
          </div>
        </div>
      </div>

      {/* Interactive Participant Roster Table with Search & Status Filters */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
          <div>
            <h2 className="text-base font-bold text-gray-900">Participant Roster & Tracking</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Monitor individual progress, identify overdue staff, and track corroboration status.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-xs placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
            />

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-md text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-gray-900"
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

        {/* Table Content */}
        {filteredParticipants.length === 0 ? (
          <p className="text-sm text-gray-400 italic py-6 text-center">
            {stats.participants.length === 0
              ? 'No participants enrolled in this campaign.'
              : 'No participants match the selected filter criteria.'}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Participant
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Email
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Teams
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Assessment Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Deadline Status
                  </th>
                  <th
                    scope="col"
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    Completed Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredParticipants.map((p) => {
                  return (
                    <tr key={p.userId} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                        {p.name}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{p.email}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                        {p.teams.length > 0 ? p.teams.map((t) => t.name).join(', ') : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {isDraft ? (
                          <span className="text-xs text-gray-400 italic">Pending Launch</span>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              p.assessmentStatus === AssessmentStatus.COMPLETED
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.assessmentStatus === AssessmentStatus.PENDING_CORROBORATION
                                ? 'bg-indigo-100 text-indigo-800'
                                : p.assessmentStatus === AssessmentStatus.SUBMITTED
                                ? 'bg-purple-100 text-purple-800'
                                : p.assessmentStatus === AssessmentStatus.DRAFT
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {formatAssessmentStatus(p.assessmentStatus)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm">
                        {p.isOverdue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">
                            ⚠️ Overdue
                          </span>
                        ) : p.assessmentStatus === AssessmentStatus.COMPLETED ? (
                          <span className="text-xs text-emerald-600 font-medium">On Track</span>
                        ) : (
                          <span className="text-xs text-gray-500">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
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
