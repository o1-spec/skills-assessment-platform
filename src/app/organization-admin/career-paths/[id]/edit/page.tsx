import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { UserRole, RoleProfileStatus, CareerPathStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getCareerPathById } from '@/services/career-paths';
import { getRoleProfilesForTenant } from '@/services/role-profiles';
import { CareerPathForm } from '../../career-path-form';

export default async function EditCareerPathPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;
  const { id } = await params;

  const careerPath = await getCareerPathById(id, tenantId);
  if (!careerPath) {
    notFound();
  }

  if (careerPath.status === CareerPathStatus.PUBLISHED) {
    redirect(`/organization-admin/career-paths/${id}`);
  }

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
        <Link href={`/organization-admin/career-paths/${careerPath.id}`} className="hover:text-gray-700">
          {careerPath.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900 font-medium">Edit</span>
      </div>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Career Path</h1>
        <p className="mt-1 text-sm text-gray-500">
          Modify the progression sequence and roles for this draft career path.
        </p>
      </div>

      <CareerPathForm
        initialData={{
          id: careerPath.id,
          name: careerPath.name,
          description: careerPath.description,
          steps: careerPath.steps.map((s) => ({
            roleProfileId: s.roleProfileId,
          })),
        }}
        eligibleRoles={eligibleRoles.map((r) => ({
          id: r.id,
          name: r.name,
          description: r.description,
        }))}
      />
    </div>
  );
}
