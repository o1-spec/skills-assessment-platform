'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CompetencyType } from '@prisma/client';
import { CompetencyWithLevels } from '@/services/competencies';
import {
  ActiveTenantAdoptionWithVersion,
  AvailablePublishedFramework,
} from '@/services/framework-adoption';
import { adoptFrameworkAction, toggleCompetencyActiveAction } from '@/actions/skills';

export function SkillsLibraryView({
  competencies,
  activeAdoption,
  availableFrameworks,
}: {
  competencies: CompetencyWithLevels[];
  activeAdoption: ActiveTenantAdoptionWithVersion | null;
  availableFrameworks: AvailablePublishedFramework[];
}) {
  const router = useRouter();
  const [showAdoptModal, setShowAdoptModal] = useState(false);
  const [selectedFrameworkId, setSelectedFrameworkId] = useState(
    availableFrameworks.find((f) => !f.isActiveForTenant)?.id || availableFrameworks[0]?.id || ''
  );
  const [isAdopting, setIsAdopting] = useState(false);
  const [adoptError, setAdoptError] = useState<string | null>(null);

  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);

  async function handleAdoptSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFrameworkId) return;

    setAdoptError(null);
    setIsAdopting(true);

    try {
      const res = await adoptFrameworkAction(selectedFrameworkId);
      if (!res.success) {
        setAdoptError(res.error || 'Failed to adopt framework');
      } else {
        setShowAdoptModal(false);
        router.refresh();
      }
    } catch {
      setAdoptError('An unexpected error occurred during adoption.');
    } finally {
      setIsAdopting(false);
    }
  }

  async function handleToggleActive(compId: string, currentStatus: boolean) {
    setTogglingId(compId);
    setToggleError(null);

    try {
      const res = await toggleCompetencyActiveAction(compId, !currentStatus);
      if (!res.success) {
        setToggleError(res.error || 'Failed to update competency status');
      } else {
        router.refresh();
      }
    } catch {
      setToggleError('An unexpected error occurred.');
    } finally {
      setTogglingId(null);
    }
  }

  const technicalSkills = competencies.filter((c) => c.type === CompetencyType.TECHNICAL);
  const behavioralSkills = competencies.filter((c) => c.type === CompetencyType.BEHAVIORAL);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Organization Skill Library (OA-02)</h1>
          <p className="mt-1 text-sm text-stone-500">
            Manage your organization&apos;s operational competencies, adopt published platform frameworks, and define custom skills.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setAdoptError(null);
              setShowAdoptModal(true);
            }}
            className="inline-flex items-center px-4 py-2.5 border border-stone-200/80 shadow-2xs text-xs font-semibold rounded-xl text-neutral-700 bg-white hover:bg-stone-50 transition-colors cursor-pointer"
          >
            Adopt Framework Version
          </button>
          <Link
            href="/organization-admin/skills/new"
            className="inline-flex items-center px-4 py-2.5 border border-transparent shadow-2xs text-xs font-semibold rounded-xl text-white bg-neutral-900 hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            + Create Custom Competency
          </Link>
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-4">
          <div className="h-10 w-10 rounded-xl bg-neutral-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-400">
                Active Adopted Framework
              </span>
              {activeAdoption && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  ACTIVE
                </span>
              )}
            </div>
            {activeAdoption ? (
              <div className="mt-1">
                <span className="text-base font-bold text-neutral-900">
                  Canonical Framework Version {activeAdoption.frameworkVersion.version}
                </span>
                <span className="text-xs text-stone-500 ml-2">
                  (Adopted on {new Date(activeAdoption.adoptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                </span>
                {activeAdoption.frameworkVersion.description && (
                  <p className="text-xs text-stone-500 mt-1 max-w-2xl leading-relaxed">
                    {activeAdoption.frameworkVersion.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-stone-500 mt-1">
                No canonical platform framework has been adopted yet. Adopt a published framework or define custom competencies.
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => {
            setAdoptError(null);
            setShowAdoptModal(true);
          }}
          className="text-xs font-semibold text-neutral-700 hover:text-neutral-900 shrink-0 hover:underline transition-colors cursor-pointer"
        >
          Change Framework Version &rarr;
        </button>
      </div>

      {toggleError && (
        <div className="p-4 bg-rose-50 border border-rose-200/80 text-xs font-semibold text-rose-800 rounded-xl">
          {toggleError}
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <h2 className="text-base font-bold text-neutral-900">
            Technical Competencies ({technicalSkills.length})
          </h2>
          <span className="text-xs font-medium text-stone-500">
            {technicalSkills.filter((s) => s.isActive).length} active for new role profiles
          </span>
        </div>

        {technicalSkills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-400">
            No technical competencies in library. Adopt a framework or add a custom skill.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {technicalSkills.map((comp) => (
              <CompetencyLibraryCard
                key={comp.id}
                competency={comp}
                isToggling={togglingId === comp.id}
                onToggleActive={() => handleToggleActive(comp.id, comp.isActive)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
          <h2 className="text-base font-bold text-neutral-900">
            Behavioral &amp; Professional Competencies ({behavioralSkills.length})
          </h2>
          <span className="text-xs font-medium text-stone-500">
            {behavioralSkills.filter((s) => s.isActive).length} active for new role profiles
          </span>
        </div>

        {behavioralSkills.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-stone-300 p-8 text-center text-xs text-stone-400">
            No behavioral competencies in library. Adopt a framework or add a custom skill.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {behavioralSkills.map((comp) => (
              <CompetencyLibraryCard
                key={comp.id}
                competency={comp}
                isToggling={togglingId === comp.id}
                onToggleActive={() => handleToggleActive(comp.id, comp.isActive)}
              />
            ))}
          </div>
        )}
      </div>

      {showAdoptModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 sm:p-8 space-y-5 border border-stone-200/80">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3.5">
              <h3 className="text-base font-bold text-neutral-900">
                Adopt Canonical Framework Version
              </h3>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="text-stone-400 hover:text-neutral-700 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Adopting a new published framework creates updated operational competency snapshots for your organization.
              <br />
              <strong className="text-neutral-900">Historical Integrity Guarantee:</strong> Existing role profiles, historical campaigns, and past assessments will continue referencing their exact historical snapshots without distortion.
            </p>

            <form onSubmit={handleAdoptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2">
                  Select Published Framework Version <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-stone-200 rounded-xl p-2.5">
                  {availableFrameworks.map((fw) => (
                    <label
                      key={fw.id}
                      className={`flex items-start space-x-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                        selectedFrameworkId === fw.id
                          ? 'border-neutral-900 bg-stone-50'
                          : 'border-stone-200/70 hover:bg-stone-50/60'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frameworkVersion"
                        value={fw.id}
                        checked={selectedFrameworkId === fw.id}
                        onChange={() => setSelectedFrameworkId(fw.id)}
                        className="mt-1 text-neutral-900 accent-neutral-900 focus:ring-neutral-900"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-neutral-900">Version {fw.version}</span>
                          {fw.isActiveForTenant && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                              Currently Active
                            </span>
                          )}
                        </div>
                        {fw.description && (
                          <p className="text-stone-500 mt-0.5 line-clamp-2">{fw.description}</p>
                        )}
                        <div className="text-stone-400 mt-1 text-[11px]">
                          {fw.competencyCount} Canonical Competencies &bull; Published {fw.publishedAt ? new Date(fw.publishedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {adoptError && (
                <div className="text-xs text-rose-800 bg-rose-50 border border-rose-200/80 p-3 rounded-xl font-semibold">
                  {adoptError}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAdoptModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200/80 rounded-xl hover:bg-stone-50 shadow-2xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdopting || !selectedFrameworkId}
                  className="px-4 py-2 text-xs font-semibold text-white bg-neutral-900 rounded-xl hover:bg-neutral-800 shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isAdopting ? 'Adopting Framework...' : 'Confirm & Adopt Framework'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CompetencyLibraryCard({
  competency,
  isToggling,
  onToggleActive,
}: {
  competency: CompetencyWithLevels;
  isToggling: boolean;
  onToggleActive: () => void;
}) {
  const isCanonical = !competency.isCustom && competency.frameworkCompetencyId;
  const sourceLabel = isCanonical
    ? `Canonical (v${competency.frameworkCompetency?.category?.frameworkVersion?.version || '1.0'})`
    : 'Custom Organization Skill';

  return (
    <div
      className={`bg-white rounded-2xl border p-5 shadow-xs space-y-3.5 transition-all ${
        competency.isActive ? 'border-stone-200/80' : 'border-stone-200 bg-stone-50/60 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-neutral-900">{competency.name}</h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                competency.isActive
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                  : 'bg-stone-100 text-stone-600 border border-stone-200/80'
              }`}
            >
              {competency.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-stone-500 flex items-center space-x-2">
            <span className={isCanonical ? 'text-stone-600 font-semibold' : 'text-stone-700 font-semibold'}>
              {sourceLabel}
            </span>
            <span>&bull;</span>
            <span>{competency.levels.length} Levels</span>
            <span>&bull;</span>
            <span className="font-semibold text-neutral-800">Weight: {competency.weight ?? 100}%</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href={`/organization-admin/skills/${competency.id}`}
            className="text-xs px-3 py-1.5 bg-white border border-stone-200/80 rounded-xl text-neutral-700 hover:bg-stone-50 font-semibold shadow-2xs transition-colors"
          >
            {isCanonical ? 'View Levels' : 'View / Edit'}
          </Link>
          <button
            onClick={onToggleActive}
            disabled={isToggling}
            className={`text-xs px-3 py-1.5 rounded-xl font-semibold transition-colors cursor-pointer ${
              competency.isActive
                ? 'text-stone-400 hover:text-rose-600'
                : 'text-emerald-600 hover:text-emerald-700'
            }`}
          >
            {isToggling ? 'Updating...' : competency.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {competency.description && (
        <p className="text-xs text-stone-500 line-clamp-2 leading-relaxed">
          {competency.description}
        </p>
      )}
    </div>
  );
}
