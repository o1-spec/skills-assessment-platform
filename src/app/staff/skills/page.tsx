import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { getStaffSkillsProfile, getStaffSkillsHistory, CompetencyProgression } from '@/services';
import { UserRole, CompetencyType } from '@prisma/client';
import { formatDate } from '@/lib/format';

interface StaffSkillsPageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function StaffSkillsPage({ searchParams }: StaffSkillsPageProps) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  const { tab = 'current' } = await searchParams;
  const activeTab = tab === 'history' ? 'history' : 'current';

  const [profile, history] = await Promise.all([
    getStaffSkillsProfile(user.id, user.tenantId),
    getStaffSkillsHistory(user.id, user.tenantId),
  ]);

  if (!profile) {
    return (
      <div className="p-8 text-center bg-white rounded-lg border border-gray-200">
        <p className="text-gray-500">Skills profile could not be loaded.</p>
      </div>
    );
  }

  const totalRequired =
    profile.technical.filter((c) => c.isRequiredByRole).length +
    profile.behavioral.filter((c) => c.isRequiredByRole).length;

  return (
    <div className="space-y-8">
      {/* Profile Header */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xl">
              {profile.userName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile.userName}</h1>
              <p className="text-sm text-gray-500">{profile.userEmail}</p>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-gray-500">Assigned Role:</span>
                {profile.roleProfile ? (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {profile.roleProfile.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                    No Role Profile Assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 text-xs text-gray-500">
            <span>Last Verified Assessment:</span>
            <span className="font-semibold text-gray-900 text-sm">
              {profile.lastAssessmentDate ? formatDate(profile.lastAssessmentDate) : 'None'}
            </span>
          </div>
        </div>

        {/* High-level stats */}
        <div className="mt-6 pt-6 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Verified Competencies</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {profile.totalVerifiedCompetencies}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Role Requirements</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">{totalRequired}</div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Completed Evaluations</div>
            <div className="mt-1 text-2xl font-bold text-gray-900">
              {history.totalCompletedAssessments}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium text-gray-500 uppercase">Profile Status</div>
            <div className="mt-1 text-sm font-medium text-emerald-600 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
              {profile.totalVerifiedCompetencies > 0 ? 'Verified Benchmarks' : 'Awaiting Assessment'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Current Skills vs Historical Progression */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8" aria-label="Profile Tabs">
          <Link
            href="/staff/skills?tab=current"
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'current'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Current Skills Profile
          </Link>
          <Link
            href="/staff/skills?tab=history"
            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600 font-semibold'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Historical Progression & Trends
          </Link>
        </nav>
      </div>

      {/* TAB 1: CURRENT SKILLS */}
      {activeTab === 'current' && (
        <div className="space-y-8">
          <CompetencySection
            title="Technical Competencies"
            type={CompetencyType.TECHNICAL}
            items={profile.technical}
          />
          <CompetencySection
            title="Behavioral Competencies"
            type={CompetencyType.BEHAVIORAL}
            items={profile.behavioral}
          />
        </div>
      )}

      {/* TAB 2: HISTORICAL PROGRESSION & TRENDS */}
      {activeTab === 'history' && (
        <div className="space-y-8">
          {!history.hasHistory ? (
            <div className="bg-white rounded-lg border border-gray-200 p-8 text-center max-w-md mx-auto">
              <div className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-semibold text-gray-900">No Assessment History Available</h3>
              <p className="mt-2 text-sm text-gray-500">
                You do not have any completed assessments yet. Once a manager corroborates and completes an assessment campaign, your verified skill progression over time will be recorded here.
              </p>
            </div>
          ) : (
            <>
              <HistoricalSection
                title="Technical Skill Progression"
                type={CompetencyType.TECHNICAL}
                items={history.technical}
              />
              <HistoricalSection
                title="Behavioral Skill Progression"
                type={CompetencyType.BEHAVIORAL}
                items={history.behavioral}
              />
            </>
          )}
        </div>
      )}
    </div>
  );
}

function CompetencySection({
  title,
  type,
  items,
}: {
  title: string;
  type: CompetencyType;
  items: import('@/services').StaffCompetencyProfileItem[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {items.length}
          </span>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
          No {type === CompetencyType.TECHNICAL ? 'technical' : 'behavioral'} competencies mapped to your profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {items.map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow transition-shadow flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{comp.competencyName}</h3>
                    {comp.isRequiredByRole && (
                      <span className="inline-flex items-center text-[11px] font-medium text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded mt-0.5">
                        Required • Target L{comp.targetLevel}
                      </span>
                    )}
                  </div>

                  <div>
                    {comp.isAssessed && comp.verifiedLevel !== null ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        Level {comp.verifiedLevel} / {comp.maxLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                        Not Yet Assessed
                      </span>
                    )}
                  </div>
                </div>

                {comp.competencyDescription && (
                  <p className="mt-2 text-xs text-gray-500 line-clamp-2">
                    {comp.competencyDescription}
                  </p>
                )}

                <div className="mt-4">
                  <div className="flex items-center justify-between text-[11px] text-gray-400 mb-1">
                    <span>Capability Ladder</span>
                    <span>Max: L{comp.maxLevel}</span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${comp.maxLevel}, minmax(0, 1fr))` }}>
                    {Array.from({ length: comp.maxLevel }, (_, i) => i + 1).map((lvl) => {
                      const isAchieved = comp.verifiedLevel !== null && lvl <= comp.verifiedLevel;
                      const isTarget = comp.targetLevel !== null && lvl === comp.targetLevel;
                      const isCurrent = comp.verifiedLevel !== null && lvl === comp.verifiedLevel;

                      return (
                        <div
                          key={lvl}
                          title={`Level ${lvl}${isCurrent ? ' (Current)' : ''}${isTarget ? ' (Target)' : ''}`}
                          className={`h-2 rounded-sm transition-colors ${
                            isCurrent
                              ? 'bg-blue-600'
                              : isAchieved
                              ? 'bg-blue-300'
                              : 'bg-gray-100'
                          } ${isTarget ? 'ring-2 ring-indigo-400 ring-offset-1' : ''}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-100">
                  {comp.isAssessed && comp.verifiedLevelDescription ? (
                    <div className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded border border-gray-100">
                      <span className="font-semibold text-gray-900 block mb-0.5">
                        Verified Level {comp.verifiedLevel} Standard:
                      </span>
                      {comp.verifiedLevelDescription}
                    </div>
                  ) : comp.isAssessed ? (
                    <div className="text-xs text-gray-500 italic">
                      Verified at Level {comp.verifiedLevel} (no descriptor defined).
                    </div>
                  ) : (
                    <div className="text-xs text-amber-700 bg-amber-50/60 p-2.5 rounded border border-amber-100">
                      No verified assessment has been corroborated for this competency yet.
                    </div>
                  )}
                </div>
              </div>

              {comp.verifiedAt && (
                <div className="mt-4 pt-2 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>Corroborated</span>
                  <span>{formatDate(comp.verifiedAt)}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function HistoricalSection({
  title,
  type,
  items,
}: {
  title: string;
  type: CompetencyType;
  items: CompetencyProgression[];
}) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
            {items.length}
          </span>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
          No historical {type === CompetencyType.TECHNICAL ? 'technical' : 'behavioral'} assessments recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{comp.competencyName}</h3>
                  {comp.competencyDescription && (
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
                      {comp.competencyDescription}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {comp.isSingleAssessment ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 italic">
                        Only one completed assessment is available.
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                        Level {comp.latestRating}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 font-medium">
                        Level {comp.previousRating} → Level {comp.latestRating}
                      </span>
                      {comp.change > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                          +{comp.change}
                        </span>
                      )}
                      {comp.change === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          No change
                        </span>
                      )}
                      {comp.change < 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                          {comp.change}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Chronological Evaluations Timeline */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-xs">
                  <thead className="bg-gray-50 text-gray-500 font-medium uppercase">
                    <tr>
                      <th scope="col" className="px-4 py-2 text-left">Date</th>
                      <th scope="col" className="px-4 py-2 text-left">Assessment Campaign</th>
                      <th scope="col" className="px-4 py-2 text-left">Framework</th>
                      <th scope="col" className="px-4 py-2 text-center">Assessed Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {comp.history.map((record, idx) => (
                      <tr key={`${record.assessmentId}-${idx}`} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-600 whitespace-nowrap">
                          {formatDate(record.completedAt)}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">
                          {record.campaignName}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500">
                          {record.frameworkVersion ? `v${record.frameworkVersion}` : 'Default'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">
                            Level {record.finalRating}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
