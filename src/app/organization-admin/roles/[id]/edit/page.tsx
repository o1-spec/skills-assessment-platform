import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireTenantUser } from '@/lib/auth';
import { getRoleProfileById, getActiveCompetenciesForTenant } from '@/services';
import { RoleProfileStatus } from '@prisma/client';
import { EditRoleForm } from './edit-role-form';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditRoleProfilePage({ params }: PageProps) {
  const { id } = await params;
  const user = await requireTenantUser();

  const roleProfile = await getRoleProfileById(id, user.tenantId);

  if (!roleProfile) {
    notFound();
  }

  // Structural immutability: published roles cannot be edited
  if (roleProfile.status === RoleProfileStatus.PUBLISHED) {
    redirect(`/organization-admin/roles/${id}`);
  }

  // Archived roles cannot be edited
  if (roleProfile.isArchived) {
    redirect(`/organization-admin/roles/${id}`);
  }

  const competencies = await getActiveCompetenciesForTenant(user.tenantId);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Breadcrumb Navigation */}
      <div>
        <nav className="flex text-sm text-gray-500 mb-2" aria-label="Breadcrumb">
          <ol className="flex items-center space-x-2">
            <li>
              <Link href="/organization-admin/roles" className="hover:text-gray-900 transition-colors">
                Role Profiles
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li>
              <Link href={`/organization-admin/roles/${roleProfile.id}`} className="hover:text-gray-900 transition-colors truncate max-w-xs">
                {roleProfile.name}
              </Link>
            </li>
            <li>
              <span className="text-gray-400">/</span>
            </li>
            <li className="text-gray-900 font-medium" aria-current="page">
              Edit Draft
            </li>
          </ol>
        </nav>
        <div className="flex items-center space-x-3">
          <h1 className="text-2xl font-bold text-gray-900">Edit Draft Role Profile</h1>
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            Draft
          </span>
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Modify benchmark skills and target capability levels before publishing.
        </p>
      </div>

      {/* Form Component */}
      <EditRoleForm roleProfile={roleProfile} competencies={competencies} />
    </div>
  );
}
