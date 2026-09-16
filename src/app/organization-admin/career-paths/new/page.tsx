import Link from 'next/link';
import { UserRole, RoleProfileStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getRoleProfilesForTenant } from '@/services/role-profiles';
import { CareerPathForm } from '../career-path-form';

export default async function NewCareerPathPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const eligibleRoles = await getRoleProfilesForTenant(tenantId, {
    includeArchived: false,
    status: RoleProfileStatus.PUBLISHED,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2 text-xs text-gray-500">
        <Link href="/organization-admin/career-paths" className="hover:text-gray-700">
          Career Paths
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">New Path</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Career Path (OA-06)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Design an ordered multi-role progression track for your organization.
        </p>
      </div>

      {eligibleRoles.length < 2 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-sm text-amber-800">
          <p className="font-semibold">Insufficient Published Roles</p>
          <p className="mt-1 text-xs text-amber-700">
            A career path requires at least 2 active, published role profiles. You currently have {eligibleRoles.length} published role(s).
          </p>
          <div className="mt-4">
            <Link
              href="/organization-admin/roles/new"
              className="inline-flex items-center px-3.5 py-1.5 border border-transparent text-xs font-semibold rounded-md text-amber-900 bg-amber-200 hover:bg-amber-300 transition-colors"
            >
              Create &amp; Publish a Role Profile
            </Link>
          </div>
        </div>
      ) : (
        <CareerPathForm
          eligibleRoles={eligibleRoles.map((r) => ({
            id: r.id,
            name: r.name,
            description: r.description,
          }))}
        />
      )}
    </div>
  );
}
