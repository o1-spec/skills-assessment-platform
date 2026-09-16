'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { updateCampaignDraftAction, CreateCampaignFormState } from '../../actions';
import {
  CampaignDetail,
  PublishedRoleProfileOption,
  EligibleParticipantOption,
  EligibleCampaignTeamOption,
  CompetencyWithLevels,
} from '@/services';
import { CampaignScope, CompetencyType } from '@prisma/client';

interface EditCampaignFormProps {
  campaign: CampaignDetail;
  roleProfiles: PublishedRoleProfileOption[];
  competencies: CompetencyWithLevels[];
  staffParticipants: EligibleParticipantOption[];
  teams: EligibleCampaignTeamOption[];
}

const initialState: CreateCampaignFormState = {};

export function EditCampaignForm({
  campaign,
  roleProfiles,
  competencies,
  staffParticipants,
  teams,
}: EditCampaignFormProps) {
  const updateWithId = updateCampaignDraftAction.bind(null, campaign.id);
  const [state, formAction, isPending] = useActionState(updateWithId, initialState);

  const [name, setName] = useState(campaign.name);
  const [description, setDescription] = useState(campaign.description || '');
  const [startDate, setStartDate] = useState(() =>
    campaign.startDate ? new Date(campaign.startDate).toISOString().split('T')[0] : ''
  );
  const [deadline, setDeadline] = useState(() =>
    new Date(campaign.deadline).toISOString().split('T')[0]
  );
  const [requiresCorroboration, setRequiresCorroboration] = useState(campaign.requiresCorroboration);

  const [selectedRoleProfileId, setSelectedRoleProfileId] = useState<string>(
    campaign.roleProfileId || ''
  );
  const [selectedCompetencies, setSelectedCompetencies] = useState<Set<string>>(
    new Set(campaign.competencies.map((c) => c.competencyId))
  );
  const [scope, setScope] = useState<CampaignScope>(campaign.scope);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(
    new Set(campaign.campaignTeams.map((ct) => ct.teamId))
  );
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(
    new Set(campaign.participants.map((p) => p.userId))
  );

  const technicalComps = competencies.filter((c) => c.type === CompetencyType.TECHNICAL);
  const behavioralComps = competencies.filter((c) => c.type === CompetencyType.BEHAVIORAL);

  const handleRoleProfileChange = (roleId: string) => {
    setSelectedRoleProfileId(roleId);

    if (roleId === '') {
      return;
    }

    const matchedRole = roleProfiles.find((r) => r.id === roleId);
    if (matchedRole) {
      const requiredCompIds = new Set(matchedRole.requirements.map((req) => req.competencyId));
      setSelectedCompetencies(requiredCompIds);
    }
  };

  const toggleCompetency = (id: string) => {
    setSelectedCompetencies((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const selectAllCompetencies = () => {
    setSelectedCompetencies(new Set(competencies.map((c) => c.id)));
  };

  const clearAllCompetencies = () => {
    setSelectedCompetencies(new Set());
  };

  const toggleTeam = (id: string) => {
    setSelectedTeams((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllTeams = () => {
    if (selectedTeams.size === teams.length) {
      setSelectedTeams(new Set());
    } else {
      setSelectedTeams(new Set(teams.map((t) => t.id)));
    }
  };

  const toggleParticipant = (id: string) => {
    setSelectedParticipants((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleAllStaff = () => {
    if (selectedParticipants.size === staffParticipants.length) {
      setSelectedParticipants(new Set());
    } else {
      setSelectedParticipants(new Set(staffParticipants.map((s) => s.id)));
    }
  };

  const allStaffSelected =
    staffParticipants.length > 0 && selectedParticipants.size === staffParticipants.length;
  const allTeamsSelected = teams.length > 0 && selectedTeams.size === teams.length;

  return (
    <form action={formAction} className="space-y-8">
      {state?.error && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200">
          <div className="flex">
            <svg className="h-5 w-5 text-red-400 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-5">
        <h2 className="text-base font-semibold text-gray-900 border-b border-gray-100 pb-3">
          1. Campaign Details
        </h2>

        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
            Description <span className="text-gray-400 font-normal">(Optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            maxLength={500}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
          />
          {state?.fieldErrors?.description && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
              Start Date <span className="text-gray-400 font-normal">(Optional Opening Date)</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
            />
            {state?.fieldErrors?.startDate && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startDate[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
              Assessment Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm text-gray-900 bg-white"
            />
            {state?.fieldErrors?.deadline && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.deadline[0]}</p>
            )}
          </div>
        </div>

          <div className="flex items-center pt-6">
            <label className="relative flex items-start cursor-pointer">
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  id="requiresCorroboration"
                  name="requiresCorroboration"
                  checked={requiresCorroboration}
                  onChange={(e) => setRequiresCorroboration(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
              </div>
              <div className="ml-3 text-sm">
                <span className="font-medium text-gray-900">Require Manager Corroboration</span>
                <p className="text-xs text-gray-500">
                  Managers must review and corroborate staff self-ratings and evidence.
                </p>
              </div>
            </label>
          </div>
        </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-4">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-semibold text-gray-900">2. Role Profile Template</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Optionally link a published role profile to preselect its benchmark competencies and enable gap analysis.
          </p>
        </div>

        <div>
          <label htmlFor="roleProfileId" className="block text-sm font-medium text-gray-700">
            Select Role Profile
          </label>
          <select
            id="roleProfileId"
            name="roleProfileId"
            value={selectedRoleProfileId}
            onChange={(e) => handleRoleProfileChange(e.target.value)}
            className="mt-1 block w-full text-sm font-medium border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-900"
          >
            <option value="">-- Custom Campaign (No Template) --</option>
            {roleProfiles.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.name} ({rp.requirements.length} required competencies)
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-3 gap-2">
          <div>
            <h2 className="text-base font-semibold text-gray-900">
              3. Select Competencies ({selectedCompetencies.size} selected)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Choose which skills and behaviors staff will self-assess.
            </p>
          </div>
          <div className="flex space-x-2 text-xs">
            <button
              type="button"
              onClick={selectAllCompetencies}
              className="px-2.5 py-1 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded font-medium transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAllCompetencies}
              className="px-2.5 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors"
            >
              Clear
            </button>
          </div>
        </div>

        {state?.fieldErrors?.competencyIds && (
          <p className="text-xs text-red-600">{state.fieldErrors.competencyIds[0]}</p>
        )}

        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider">
            Technical Competencies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {technicalComps.map((comp) => {
              const isChecked = selectedCompetencies.has(comp.id);
              return (
                <label
                  key={comp.id}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="competencyIds"
                    value={comp.id}
                    checked={isChecked}
                    onChange={() => toggleCompetency(comp.id)}
                    className="h-4 w-4 mt-0.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-gray-900">{comp.name}</span>
                    {comp.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{comp.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs uppercase font-bold text-gray-500 tracking-wider">
            Behavioral Competencies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {behavioralComps.map((comp) => {
              const isChecked = selectedCompetencies.has(comp.id);
              return (
                <label
                  key={comp.id}
                  className={`flex items-start p-3 rounded-lg border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="competencyIds"
                    value={comp.id}
                    checked={isChecked}
                    onChange={() => toggleCompetency(comp.id)}
                    className="h-4 w-4 mt-0.5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-gray-900">{comp.name}</span>
                    {comp.description && (
                      <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">{comp.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6 space-y-6">
        <div className="border-b border-gray-100 pb-3">
          <h2 className="text-base font-semibold text-gray-900">4. Campaign Scope & Audience</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Choose whether to roll out this assessment across the entire organization, specific teams, or selected individuals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${
              scope === CampaignScope.INDIVIDUAL
                ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.INDIVIDUAL}
                checked={scope === CampaignScope.INDIVIDUAL}
                onChange={() => setScope(CampaignScope.INDIVIDUAL)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-900">Individual Staff</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Select specific staff members manually.
            </p>
          </label>

          <label
            className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${
              scope === CampaignScope.TEAM
                ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.TEAM}
                checked={scope === CampaignScope.TEAM}
                onChange={() => setScope(CampaignScope.TEAM)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-900">Team Scoped</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Target all active staff belonging to selected teams.
            </p>
          </label>

          <label
            className={`flex flex-col p-4 rounded-lg border cursor-pointer transition-all ${
              scope === CampaignScope.ORGANIZATION
                ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600'
                : 'border-gray-200 hover:border-gray-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.ORGANIZATION}
                checked={scope === CampaignScope.ORGANIZATION}
                onChange={() => setScope(CampaignScope.ORGANIZATION)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
              />
              <span className="text-sm font-semibold text-gray-900">Organization-Wide</span>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Enrolls all active staff members across the company.
            </p>
          </label>
        </div>

        {scope === CampaignScope.ORGANIZATION && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-900">
            <div className="flex items-start">
              <span className="text-xl mr-2">🏢</span>
              <div>
                <p className="font-medium">Organization-Wide Enrollment</p>
                <p className="text-xs text-blue-700 mt-1">
                  At campaign launch, every active staff member in the organization (currently{' '}
                  <strong>{staffParticipants.length}</strong> eligible staff) will automatically be enrolled.
                  Managers and administrators are excluded.
                </p>
              </div>
            </div>
          </div>
        )}

        {scope === CampaignScope.TEAM && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Select Teams ({selectedTeams.size} selected)
                </h3>
                <p className="text-xs text-gray-500">
                  Active staff members from chosen teams will be snapshotted when the campaign is launched.
                </p>
              </div>
              {teams.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllTeams}
                  className="text-xs px-2.5 py-1 rounded font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {allTeamsSelected ? 'Deselect All Teams' : 'Select All Teams'}
                </button>
              )}
            </div>

            {state?.fieldErrors?.teamIds && (
              <p className="text-xs text-red-600">{state.fieldErrors.teamIds[0]}</p>
            )}

            {teams.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No active teams configured. Please configure teams under Organization Structure first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team) => {
                  const isChecked = selectedTeams.has(team.id);
                  return (
                    <label
                      key={team.id}
                      className={`flex items-center justify-between p-3.5 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-blue-500 bg-blue-50/40 ring-1 ring-blue-500'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="teamIds"
                          value={team.id}
                          checked={isChecked}
                          onChange={() => toggleTeam(team.id)}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <div>
                          <span className="text-sm font-semibold text-gray-900">{team.name}</span>
                          {team.department && (
                            <span className="block text-xs text-gray-500">{team.department.name}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                        {team._count.memberships} {team._count.memberships === 1 ? 'member' : 'members'}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {scope === CampaignScope.INDIVIDUAL && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-100 pb-2 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-gray-900">
                  Select Staff Members ({selectedParticipants.size} selected)
                </h3>
                <p className="text-xs text-gray-500">
                  Select the active staff participants who will receive an assessment.
                </p>
              </div>
              {staffParticipants.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllStaff}
                  className="text-xs px-2.5 py-1 rounded font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                >
                  {allStaffSelected ? 'Deselect All Staff' : 'Select All Staff'}
                </button>
              )}
            </div>

            {state?.fieldErrors?.participantIds && (
              <p className="text-xs text-red-600">{state.fieldErrors.participantIds[0]}</p>
            )}

            {staffParticipants.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                No active staff members found in this organization.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staffParticipants.map((staff) => {
                  const isChecked = selectedParticipants.has(staff.id);
                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-indigo-500 bg-indigo-50/40 ring-1 ring-indigo-500'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="participantIds"
                        value={staff.id}
                        checked={isChecked}
                        onChange={() => toggleParticipant(staff.id)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-gray-900">{staff.name}</span>
                        <span className="block text-xs text-gray-500">{staff.email}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-gray-200">
        <Link
          href={`/organization-admin/campaigns/${campaign.id}`}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
        >
          Cancel
        </Link>

        <button
          type="submit"
          name="submitAction"
          value="draft"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Saving...' : 'Save Draft Changes'}
        </button>

        <button
          type="submit"
          name="submitAction"
          value="launch"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 transition-colors"
        >
          {isPending ? 'Launching...' : 'Save & Launch Campaign'}
        </button>
      </div>
    </form>
  );
}
