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

    const targetFw = availableFrameworks.find((f) => f.id === selectedFrameworkId);
    if (!confirm(`Are you sure you want to adopt Framework Version ${targetFw?.version || ''}? Adopting a new framework version creates an updated operational skill snapshot. Existing historical role profiles and assessments will remain completely unchanged.`)) {
      return;
    }

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
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Organization Skill Library (OA-02)</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your organization&apos;s operational competencies, adopt published platform frameworks, and define custom skills.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              setAdoptError(null);
              setShowAdoptModal(true);
            }}
            className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors"
          >
            Adopt Framework Version
          </button>
          <Link
            href="/organization-admin/skills/new"
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            + Create Custom Competency
          </Link>
        </div>
      </div>

      {/* Active Framework Adoption Banner */}
      <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start space-x-3.5">
          <div className="h-10 w-10 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Active Adopted Framework
              </span>
              {activeAdoption && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                  ACTIVE
                </span>
              )}
            </div>
            {activeAdoption ? (
              <div className="mt-0.5">
                <span className="text-base font-bold text-gray-900">
                  Canonical Framework Version {activeAdoption.frameworkVersion.version}
                </span>
                <span className="text-xs text-gray-500 ml-2">
                  (Adopted on {new Date(activeAdoption.adoptedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })})
                </span>
                {activeAdoption.frameworkVersion.description && (
                  <p className="text-xs text-gray-600 mt-1 max-w-2xl">
                    {activeAdoption.frameworkVersion.description}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-gray-600 mt-0.5">
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
          className="text-xs font-semibold text-blue-600 hover:text-blue-800 shrink-0"
        >
          Change Framework Version &rarr;
        </button>
      </div>

      {toggleError && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-md">
          {toggleError}
        </div>
      )}

      {/* Section 1: Technical Competencies */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-base font-bold text-gray-900">
            Technical Competencies ({technicalSkills.length})
          </h2>
          <span className="text-xs text-gray-500">
            {technicalSkills.filter((s) => s.isActive).length} active for new role profiles
          </span>
        </div>

        {technicalSkills.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-400">
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

      {/* Section 2: Behavioral Competencies */}
      <div className="space-y-3 pt-4">
        <div className="flex items-center justify-between border-b pb-2">
          <h2 className="text-base font-bold text-gray-900">
            Behavioral &amp; Professional Competencies ({behavioralSkills.length})
          </h2>
          <span className="text-xs text-gray-500">
            {behavioralSkills.filter((s) => s.isActive).length} active for new role profiles
          </span>
        </div>

        {behavioralSkills.length === 0 ? (
          <div className="bg-white rounded-lg border border-dashed border-gray-300 p-8 text-center text-xs text-gray-400">
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

      {/* Adopt Framework Version Modal */}
      {showAdoptModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="text-base font-bold text-gray-900">
                Adopt Canonical Framework Version
              </h3>
              <button
                onClick={() => setShowAdoptModal(false)}
                className="text-gray-400 hover:text-gray-600 text-lg"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Adopting a new published framework creates updated operational competency snapshots for your organization.
              <br />
              <strong className="text-gray-900">Historical Integrity Guarantee:</strong> Existing role profiles, historical campaigns, and past assessments will continue referencing their exact historical snapshots without distortion.
            </p>

            <form onSubmit={handleAdoptSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Select Published Framework Version <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border rounded-md p-2">
                  {availableFrameworks.map((fw) => (
                    <label
                      key={fw.id}
                      className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedFrameworkId === fw.id
                          ? 'border-blue-500 bg-blue-50/50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="frameworkVersion"
                        value={fw.id}
                        checked={selectedFrameworkId === fw.id}
                        onChange={() => setSelectedFrameworkId(fw.id)}
                        className="mt-1 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1 text-xs">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-gray-900">Version {fw.version}</span>
                          {fw.isActiveForTenant && (
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              Currently Active
                            </span>
                          )}
                        </div>
                        {fw.description && (
                          <p className="text-gray-600 mt-0.5 line-clamp-2">{fw.description}</p>
                        )}
                        <div className="text-gray-400 mt-1">
                          {fw.competencyCount} Canonical Competencies &bull; Published {fw.publishedAt ? new Date(fw.publishedAt).toLocaleDateString() : ''}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {adoptError && (
                <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-md">
                  {adoptError}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-3 border-t">
                <button
                  type="button"
                  onClick={() => setShowAdoptModal(false)}
                  className="px-3.5 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAdopting || !selectedFrameworkId}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
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
      className={`bg-white rounded-lg border p-4 shadow-2xs space-y-3 transition-colors ${
        competency.isActive ? 'border-gray-200' : 'border-gray-200 bg-gray-50/60 opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1 flex-1">
          <div className="flex items-center space-x-2">
            <h4 className="text-sm font-bold text-gray-900">{competency.name}</h4>
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                competency.isActive
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {competency.isActive ? 'ACTIVE' : 'INACTIVE'}
            </span>
          </div>
          <div className="text-[11px] font-medium text-gray-500 flex items-center space-x-2">
            <span className={isCanonical ? 'text-indigo-600' : 'text-amber-700'}>
              {sourceLabel}
            </span>
            <span>&bull;</span>
            <span>{competency.levels.length} Levels</span>
          </div>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <Link
            href={`/organization-admin/skills/${competency.id}`}
            className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 font-medium"
          >
            {isCanonical ? 'View Levels' : 'View / Edit'}
          </Link>
          <button
            onClick={onToggleActive}
            disabled={isToggling}
            className={`text-xs px-2.5 py-1 rounded font-medium transition-colors ${
              competency.isActive
                ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
            }`}
          >
            {isToggling ? 'Updating...' : competency.isActive ? 'Deactivate' : 'Activate'}
          </button>
        </div>
      </div>

      {competency.description && (
        <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
          {competency.description}
        </p>
      )}
    </div>
  );
}
