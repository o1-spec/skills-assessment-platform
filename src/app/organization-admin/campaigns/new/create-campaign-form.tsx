'use client';

import { useActionState, useState } from 'react';
import Link from 'next/link';
import { createCampaignAction, CreateCampaignFormState } from '../actions';
import {
  PublishedRoleProfileOption,
  EligibleParticipantOption,
  EligibleCampaignTeamOption,
  CompetencyWithLevels,
} from '@/services';
import { CampaignScope, CompetencyType } from '@prisma/client';

interface CreateCampaignFormProps {
  roleProfiles: PublishedRoleProfileOption[];
  competencies: CompetencyWithLevels[];
  staffParticipants: EligibleParticipantOption[];
  teams: EligibleCampaignTeamOption[];
}

const initialState: CreateCampaignFormState = {};

export function CreateCampaignForm({
  roleProfiles,
  competencies,
  staffParticipants,
  teams,
}: CreateCampaignFormProps) {
  const [state, formAction, isPending] = useActionState(createCampaignAction, initialState);

  const [defaultDeadline] = useState(() =>
    new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );

  const [selectedRoleProfileId, setSelectedRoleProfileId] = useState<string>('');
  const [selectedCompetencies, setSelectedCompetencies] = useState<Set<string>>(new Set());
  const [scope, setScope] = useState<CampaignScope>(CampaignScope.INDIVIDUAL);
  const [selectedTeams, setSelectedTeams] = useState<Set<string>>(new Set());
  const [selectedParticipants, setSelectedParticipants] = useState<Set<string>>(new Set());
  const [requiresCorroboration, setRequiresCorroboration] = useState<boolean>(true);

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
        <div className="p-4 rounded-xl bg-red-50 border border-red-200/80">
          <div className="flex">
            <svg className="h-5 w-5 text-red-500 mr-2 shrink-0" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-xs font-semibold text-red-800">{state.error}</span>
          </div>
        </div>
      )}

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-6">
        <h2 className="text-sm font-bold text-neutral-900 tracking-tight border-b border-stone-100 pb-3">
          1. Campaign Details
        </h2>

        <div>
          <label htmlFor="name" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Campaign Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            maxLength={100}
            placeholder="e.g., Q4 Engineering Skills Assessment"
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          />
          {state?.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="description" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Description <span className="text-neutral-400 font-normal lowercase">(optional)</span>
          </label>
          <textarea
            id="description"
            name="description"
            rows={2}
            maxLength={500}
            placeholder="Provide context or instructions for participating staff and managers..."
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors resize-none"
          />
          {state?.fieldErrors?.description && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.description[0]}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div>
            <label htmlFor="startDate" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Start Date <span className="text-neutral-400 font-normal lowercase">(optional opening date)</span>
            </label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
            {state?.fieldErrors?.startDate && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.startDate[0]}</p>
            )}
          </div>

          <div>
            <label htmlFor="deadline" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
              Assessment Deadline <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              id="deadline"
              name="deadline"
              defaultValue={defaultDeadline}
              required
              className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
            />
            {state?.fieldErrors?.deadline && (
              <p className="mt-1 text-xs text-red-600">{state.fieldErrors.deadline[0]}</p>
            )}
          </div>
        </div>

        <div className="flex items-center pt-2">
          <label className="relative flex items-start cursor-pointer">
            <div className="flex items-center h-5">
              <input
                type="checkbox"
                id="requiresCorroboration"
                name="requiresCorroboration"
                checked={requiresCorroboration}
                onChange={(e) => setRequiresCorroboration(e.target.checked)}
                className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 rounded accent-neutral-900 cursor-pointer"
              />
            </div>
            <div className="ml-3 text-xs">
              <span className="font-bold text-neutral-900">Require Manager Corroboration</span>
              <p className="text-neutral-500 mt-0.5">
                Managers must review and corroborate staff self-ratings and evidence.
              </p>
            </div>
          </label>
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-4">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">2. Role Profile Template</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Optionally link a published role profile to preselect its benchmark competencies and enable gap analysis.
          </p>
        </div>

        <div>
          <label htmlFor="roleProfileId" className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-1.5">
            Select Role Profile
          </label>
          <select
            id="roleProfileId"
            name="roleProfileId"
            value={selectedRoleProfileId}
            onChange={(e) => handleRoleProfileChange(e.target.value)}
            className="w-full border border-stone-300 rounded-xl px-3.5 py-2.5 text-sm bg-white text-neutral-900 focus:outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900 transition-colors"
          >
            <option value="">-- Custom Campaign (No Template) --</option>
            {roleProfiles.map((rp) => (
              <option key={rp.id} value={rp.id}>
                {rp.name} ({rp.requirements.length} required competencies)
              </option>
            ))}
          </select>
          {selectedRoleProfileId && (
            <p className="mt-3 text-xs text-neutral-700 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
              Preselected competencies from the <strong>{roleProfiles.find((r) => r.id === selectedRoleProfileId)?.name}</strong> template. You can adjust the selection below.
            </p>
          )}
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-3 gap-2">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 tracking-tight">
              3. Select Competencies ({selectedCompetencies.size} selected)
            </h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              Choose which skills and behaviors staff will self-assess.
            </p>
          </div>
          <div className="flex space-x-2 text-xs">
            <button
              type="button"
              onClick={selectAllCompetencies}
              className="px-3 py-1.5 rounded-xl border border-stone-200/80 bg-stone-50 hover:bg-stone-100 text-neutral-800 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAllCompetencies}
              className="px-3 py-1.5 rounded-xl border border-stone-200/80 bg-stone-50 hover:bg-stone-100 text-neutral-600 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>
        </div>

        {state?.fieldErrors?.competencyIds && (
          <p className="text-xs text-red-600">{state.fieldErrors.competencyIds[0]}</p>
        )}

        <div className="space-y-3">
          <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider">
            Technical Competencies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {technicalComps.map((comp) => {
              const isChecked = selectedCompetencies.has(comp.id);
              return (
                <label
                  key={comp.id}
                  className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-neutral-900 bg-stone-50 ring-1 ring-neutral-900'
                      : 'border-stone-200/80 bg-white hover:bg-stone-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="competencyIds"
                    value={comp.id}
                    checked={isChecked}
                    onChange={() => toggleCompetency(comp.id)}
                    className="h-4 w-4 mt-0.5 text-neutral-900 focus:ring-neutral-900 border-stone-300 rounded accent-neutral-900 cursor-pointer"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-neutral-900">{comp.name}</span>
                    {comp.description && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{comp.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        <div className="space-y-3 pt-2">
          <h3 className="text-xs uppercase font-bold text-neutral-500 tracking-wider">
            Behavioral Competencies
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {behavioralComps.map((comp) => {
              const isChecked = selectedCompetencies.has(comp.id);
              return (
                <label
                  key={comp.id}
                  className={`flex items-start p-3.5 rounded-xl border cursor-pointer transition-colors ${
                    isChecked
                      ? 'border-neutral-900 bg-stone-50 ring-1 ring-neutral-900'
                      : 'border-stone-200/80 bg-white hover:bg-stone-50/60'
                  }`}
                >
                  <input
                    type="checkbox"
                    name="competencyIds"
                    value={comp.id}
                    checked={isChecked}
                    onChange={() => toggleCompetency(comp.id)}
                    className="h-4 w-4 mt-0.5 text-neutral-900 focus:ring-neutral-900 border-stone-300 rounded accent-neutral-900 cursor-pointer"
                  />
                  <div className="ml-3">
                    <span className="text-sm font-semibold text-neutral-900">{comp.name}</span>
                    {comp.description && (
                      <p className="text-xs text-neutral-500 line-clamp-1 mt-0.5">{comp.description}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 space-y-6">
        <div className="border-b border-stone-100 pb-3">
          <h2 className="text-sm font-bold text-neutral-900 tracking-tight">4. Campaign Scope & Audience</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Choose whether to roll out this assessment across the entire organization, specific teams, or selected individuals.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label
            className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
              scope === CampaignScope.INDIVIDUAL
                ? 'border-neutral-900 bg-stone-50 ring-2 ring-neutral-900'
                : 'border-stone-200/80 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.INDIVIDUAL}
                checked={scope === CampaignScope.INDIVIDUAL}
                onChange={() => setScope(CampaignScope.INDIVIDUAL)}
                className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 accent-neutral-900"
              />
              <span className="text-sm font-bold text-neutral-900">Individual Staff</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Select specific staff members manually.
            </p>
          </label>

          <label
            className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
              scope === CampaignScope.TEAM
                ? 'border-neutral-900 bg-stone-50 ring-2 ring-neutral-900'
                : 'border-stone-200/80 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.TEAM}
                checked={scope === CampaignScope.TEAM}
                onChange={() => setScope(CampaignScope.TEAM)}
                className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 accent-neutral-900"
              />
              <span className="text-sm font-bold text-neutral-900">Team Scoped</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Target all active staff belonging to selected teams.
            </p>
          </label>

          <label
            className={`flex flex-col p-4 rounded-xl border cursor-pointer transition-all ${
              scope === CampaignScope.ORGANIZATION
                ? 'border-neutral-900 bg-stone-50 ring-2 ring-neutral-900'
                : 'border-stone-200/80 hover:border-stone-300 bg-white'
            }`}
          >
            <div className="flex items-center space-x-2">
              <input
                type="radio"
                name="scope"
                value={CampaignScope.ORGANIZATION}
                checked={scope === CampaignScope.ORGANIZATION}
                onChange={() => setScope(CampaignScope.ORGANIZATION)}
                className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 accent-neutral-900"
              />
              <span className="text-sm font-bold text-neutral-900">Organization-Wide</span>
            </div>
            <p className="mt-2 text-xs text-neutral-500">
              Enrolls all active staff members across the company.
            </p>
          </label>
        </div>

        {scope === CampaignScope.ORGANIZATION && (
          <div className="p-4 bg-stone-50 border border-stone-200/80 rounded-xl text-xs text-neutral-800">
            <p className="font-bold text-neutral-900">Organization-Wide Enrollment</p>
            <p className="text-neutral-600 mt-1 leading-relaxed">
              At campaign launch, every active staff member in the organization (currently{' '}
              <strong>{staffParticipants.length}</strong> eligible staff) will automatically be enrolled.
              Managers and administrators are automatically excluded.
            </p>
          </div>
        )}

        {scope === CampaignScope.TEAM && (
          <div className="space-y-4 pt-2">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-2 gap-2">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">
                  Select Teams ({selectedTeams.size} selected)
                </h3>
                <p className="text-xs text-neutral-500">
                  Active staff members from chosen teams will be snapshotted when the campaign is launched.
                </p>
              </div>
              {teams.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllTeams}
                  className="text-xs px-3 py-1.5 rounded-xl border border-stone-200/80 bg-stone-50 hover:bg-stone-100 text-neutral-700 font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {allTeamsSelected ? 'Deselect All Teams' : 'Select All Teams'}
                </button>
              )}
            </div>

            {state?.fieldErrors?.teamIds && (
              <p className="text-xs text-red-600">{state.fieldErrors.teamIds[0]}</p>
            )}

            {teams.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">
                No active teams configured. Please configure teams under Organization Structure first.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {teams.map((team) => {
                  const isChecked = selectedTeams.has(team.id);
                  return (
                    <label
                      key={team.id}
                      className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-neutral-900 bg-stone-50 ring-1 ring-neutral-900'
                          : 'border-stone-200/80 bg-white hover:bg-stone-50/60'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          name="teamIds"
                          value={team.id}
                          checked={isChecked}
                          onChange={() => toggleTeam(team.id)}
                          className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 rounded accent-neutral-900 cursor-pointer"
                        />
                        <div>
                          <span className="text-sm font-semibold text-neutral-900">{team.name}</span>
                          {team.department && (
                            <span className="block text-xs text-neutral-500">{team.department.name}</span>
                          )}
                        </div>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60">
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
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-stone-100 pb-2 gap-2">
              <div>
                <h3 className="text-xs font-bold text-neutral-900">
                  Select Staff Members ({selectedParticipants.size} selected)
                </h3>
                <p className="text-xs text-neutral-500">
                  Select the active staff participants who will receive an assessment.
                </p>
              </div>
              {staffParticipants.length > 0 && (
                <button
                  type="button"
                  onClick={toggleAllStaff}
                  className="text-xs px-3 py-1.5 rounded-xl border border-stone-200/80 bg-stone-50 hover:bg-stone-100 text-neutral-700 font-semibold shadow-2xs transition-colors cursor-pointer"
                >
                  {allStaffSelected ? 'Deselect All Staff' : 'Select All Staff'}
                </button>
              )}
            </div>

            {state?.fieldErrors?.participantIds && (
              <p className="text-xs text-red-600">{state.fieldErrors.participantIds[0]}</p>
            )}

            {staffParticipants.length === 0 ? (
              <p className="text-xs text-neutral-500 italic">
                No active staff members found in this organization.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {staffParticipants.map((staff) => {
                  const isChecked = selectedParticipants.has(staff.id);
                  return (
                    <label
                      key={staff.id}
                      className={`flex items-center p-3.5 rounded-xl border cursor-pointer transition-colors ${
                        isChecked
                          ? 'border-neutral-900 bg-stone-50 ring-1 ring-neutral-900'
                          : 'border-stone-200/80 bg-white hover:bg-stone-50/60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        name="participantIds"
                        value={staff.id}
                        checked={isChecked}
                        onChange={() => toggleParticipant(staff.id)}
                        className="h-4 w-4 text-neutral-900 focus:ring-neutral-900 border-stone-300 rounded accent-neutral-900 cursor-pointer"
                      />
                      <div className="ml-3">
                        <span className="text-sm font-semibold text-neutral-900">{staff.name}</span>
                        <span className="block text-xs text-neutral-500">{staff.email}</span>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-stone-200/80">
        <Link
          href="/organization-admin/campaigns"
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-xl border border-stone-200/80 text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
        >
          Cancel
        </Link>

        <button
          type="submit"
          name="submitAction"
          value="draft"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-xl border border-stone-200/80 text-xs font-semibold text-neutral-700 bg-white hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Saving...' : 'Save as Draft'}
        </button>

        <button
          type="submit"
          name="submitAction"
          value="launch"
          disabled={isPending}
          className="w-full sm:w-auto inline-flex justify-center items-center px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-neutral-900 hover:bg-neutral-800 shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
        >
          {isPending ? 'Launching...' : 'Launch Campaign'}
        </button>
      </div>
    </form>
  );
}
