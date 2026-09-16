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
      <div className="p-8 text-center bg-white rounded-2xl border border-stone-200/80 shadow-xs">
        <p className="text-stone-500">Skills profile could not be loaded.</p>
      </div>
    );
  }

  const totalRequired =
    profile.technical.filter((c) => c.isRequiredByRole).length +
    profile.behavioral.filter((c) => c.isRequiredByRole).length;

  return (
    <div className="space-y-8">
      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="h-14 w-14 rounded-2xl bg-neutral-900 text-white flex items-center justify-center font-bold text-xl shadow-2xs">
              {profile.userName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">{profile.userName}</h1>
              <p className="text-sm text-stone-500">{profile.userEmail}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <span className="text-xs text-stone-500 font-medium">Assigned Role:</span>
                {profile.roleProfile ? (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-stone-100 text-stone-800 border border-stone-200/80">
                    {profile.roleProfile.name}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-stone-100 text-stone-500 border border-stone-200/60">
                    No Role Profile Assigned
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-stone-100 text-xs text-stone-500">
            <span>Last Verified Assessment:</span>
            <span className="font-semibold text-neutral-900 text-sm mt-0.5">
              {profile.lastAssessmentDate ? formatDate(profile.lastAssessmentDate) : 'None'}
            </span>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-stone-100 grid grid-cols-2 sm:grid-cols-4 gap-6">
          <div>
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Verified Competencies</div>
            <div className="mt-1 text-2xl font-extrabold text-neutral-900">
              {profile.totalVerifiedCompetencies}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Role Requirements</div>
            <div className="mt-1 text-2xl font-extrabold text-neutral-900">{totalRequired}</div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Completed Evaluations</div>
            <div className="mt-1 text-2xl font-extrabold text-neutral-900">
              {history.totalCompletedAssessments}
            </div>
          </div>
          <div>
            <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Profile Status</div>
            <div className="mt-2">
              {profile.totalVerifiedCompetencies > 0 ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                  Verified Benchmarks
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-stone-100 text-stone-700 border border-stone-200/80">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-400"></span>
                  Awaiting Assessment
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-stone-200/80">
        <nav className="-mb-px flex space-x-8" aria-label="Profile Tabs">
          <Link
            href="/staff/skills?tab=current"
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'current'
                ? 'border-neutral-900 text-neutral-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Current Skills Profile
          </Link>
          <Link
            href="/staff/skills?tab=history"
            className={`whitespace-nowrap py-3.5 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'history'
                ? 'border-neutral-900 text-neutral-900 font-bold'
                : 'border-transparent text-stone-500 hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            Historical Progression & Trends
          </Link>
        </nav>
      </div>

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

      {activeTab === 'history' && (
        <div className="space-y-8">
          {!history.hasHistory ? (
            <div className="bg-white rounded-2xl border border-stone-200/80 p-8 text-center max-w-md mx-auto shadow-xs">
              <div className="h-12 w-12 rounded-xl bg-stone-100 text-stone-600 flex items-center justify-center mx-auto mb-3">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.5"
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-base font-bold text-neutral-900">No Assessment History Available</h3>
              <p className="mt-2 text-xs text-stone-500 leading-relaxed">
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
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/80">
            {items.length}
          </span>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 text-center text-sm text-stone-500 shadow-xs">
          No {type === CompetencyType.TECHNICAL ? 'technical' : 'behavioral'} competencies mapped to your profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs hover:border-stone-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900">{comp.competencyName}</h3>
                    {comp.isRequiredByRole && (
                      <span className="inline-flex items-center text-[11px] font-semibold text-stone-700 bg-stone-100 border border-stone-200/80 px-2 py-0.5 rounded-md mt-1">
                        Required • Target L{comp.targetLevel}
                      </span>
                    )}
                  </div>

                  <div>
                    {comp.isAssessed && comp.verifiedLevel !== null ? (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                        Level {comp.verifiedLevel} / {comp.maxLevel}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200/80">
                        Not Yet Assessed
                      </span>
                    )}
                  </div>
                </div>

                {comp.competencyDescription && (
                  <p className="mt-2.5 text-xs text-stone-500 line-clamp-2 leading-relaxed">
                    {comp.competencyDescription}
                  </p>
                )}

                <div className="mt-5">
                  <div className="flex items-center justify-between text-[11px] font-medium text-stone-500 mb-2">
                    <span>Capability Ladder</span>
                    <span>Max: L{comp.maxLevel}</span>
                  </div>
                  <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${comp.maxLevel}, minmax(0, 1fr))` }}>
                    {Array.from({ length: comp.maxLevel }, (_, i) => i + 1).map((lvl) => {
                      const isAchieved = comp.verifiedLevel !== null && lvl <= comp.verifiedLevel;
                      const isTarget = comp.targetLevel !== null && lvl === comp.targetLevel;
                      const isCurrent = comp.verifiedLevel !== null && lvl === comp.verifiedLevel;

                      let stepClass = 'bg-stone-100 text-stone-400 border border-stone-200/60';
                      if (isCurrent) {
                        stepClass = 'bg-neutral-900 text-white font-bold shadow-2xs';
                      } else if (isAchieved) {
                        stepClass = 'bg-stone-300 text-neutral-800 font-semibold';
                      } else if (isTarget) {
                        stepClass = 'bg-white text-neutral-900 border-2 border-neutral-900 font-bold shadow-2xs';
                      }

                      return (
                        <div
                          key={lvl}
                          title={`Level ${lvl}${isCurrent ? ' (Verified)' : ''}${isTarget ? ' (Target)' : ''}`}
                          className={`h-6 rounded-lg flex items-center justify-center text-[10px] transition-colors ${stepClass}`}
                        >
                          L{lvl}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="mt-5 pt-3.5 border-t border-stone-100">
                  {comp.isAssessed && comp.verifiedLevelDescription ? (
                    <div className="text-xs text-stone-700 bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                      <span className="font-semibold text-neutral-900 block mb-0.5">
                        Verified Level {comp.verifiedLevel} Standard:
                      </span>
                      {comp.verifiedLevelDescription}
                    </div>
                  ) : comp.isAssessed ? (
                    <div className="text-xs text-stone-500 italic bg-stone-50 p-3 rounded-xl border border-stone-200/80">
                      Verified at Level {comp.verifiedLevel} (no descriptor defined).
                    </div>
                  ) : (
                    <div className="text-xs text-stone-600 bg-stone-50 p-3 rounded-xl border border-stone-200/80 flex items-center gap-2">
                      <svg className="w-4 h-4 text-stone-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>No verified assessment has been corroborated for this competency yet.</span>
                    </div>
                  )}
                </div>
              </div>

              {comp.verifiedAt && (
                <div className="mt-4 pt-2.5 text-[11px] text-stone-400 flex items-center justify-between border-t border-stone-100">
                  <span>Corroborated</span>
                  <span className="font-medium text-stone-600">{formatDate(comp.verifiedAt)}</span>
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
        <h2 className="text-lg font-bold text-neutral-900 flex items-center gap-2">
          <span>{title}</span>
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/80">
            {items.length}
          </span>
        </h2>
      </div>

      {items.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl border border-stone-200/80 text-center text-sm text-stone-500 shadow-xs">
          No historical {type === CompetencyType.TECHNICAL ? 'technical' : 'behavioral'} assessments recorded yet.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((comp) => (
            <div
              key={comp.competencyId}
              className="bg-white rounded-2xl border border-stone-200/80 p-6 shadow-xs space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-bold text-neutral-900">{comp.competencyName}</h3>
                  {comp.competencyDescription && (
                    <p className="text-xs text-stone-500 mt-0.5 line-clamp-1">
                      {comp.competencyDescription}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {comp.isSingleAssessment ? (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500 italic">
                        Only one completed assessment is available.
                      </span>
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold bg-neutral-900 text-white">
                        Level {comp.latestRating}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-600 font-medium">
                        Level {comp.previousRating} → Level {comp.latestRating}
                      </span>
                      {comp.change > 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                          +{comp.change}
                        </span>
                      )}
                      {comp.change === 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-600 border border-stone-200/80">
                          No change
                        </span>
                      )}
                      {comp.change < 0 && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200/80">
                          {comp.change}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-stone-200/80 text-xs">
                  <thead className="bg-stone-50 text-stone-500 font-semibold uppercase tracking-wider text-[11px]">
                    <tr>
                      <th scope="col" className="px-4 py-2.5 text-left">Date</th>
                      <th scope="col" className="px-4 py-2.5 text-left">Assessment Campaign</th>
                      <th scope="col" className="px-4 py-2.5 text-left">Framework</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Assessed Level</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100 bg-white">
                    {comp.history.map((record, idx) => (
                      <tr key={`${record.assessmentId}-${idx}`} className="hover:bg-stone-50/50 transition-colors">
                        <td className="px-4 py-2.5 text-stone-600 whitespace-nowrap">
                          {formatDate(record.completedAt)}
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-neutral-900">
                          {record.campaignName}
                        </td>
                        <td className="px-4 py-2.5 text-stone-500">
                          {record.frameworkVersion ? `v${record.frameworkVersion}` : 'Default'}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-stone-100 text-stone-800 border border-stone-200/80">
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
