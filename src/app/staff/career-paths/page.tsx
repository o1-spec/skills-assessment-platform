import { requireTenantUser } from '@/lib/auth';
import { getStaffCareerPathView } from '@/services/career-paths';
import { StaffCareerPathView } from './staff-career-path-view';

export default async function StaffCareerPathsPage({
  searchParams,
}: {
  searchParams: Promise<{ pathId?: string }>;
}) {
  const user = await requireTenantUser();
  const { pathId } = await searchParams;

  const data = await getStaffCareerPathView(user.id, user.tenantId, pathId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Career Progression &amp; Pathways (SM-04)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explore structured progression pathways and see your verified competency readiness against future roles.
        </p>
      </div>

      <StaffCareerPathView
        userHasRoleProfile={data.userHasRoleProfile}
        userRoleProfile={data.userRoleProfile}
        availablePaths={data.availablePaths}
        selectedPathData={data.selectedPathData}
      />
    </div>
  );
}
