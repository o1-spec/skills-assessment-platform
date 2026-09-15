import Link from 'next/link';
import { requireTenantUser } from '@/lib/auth';
import { getActiveCompetenciesForTenant, getAvailableTemplateRolesForTenant } from '@/services';
import { CreateRoleForm } from './create-role-form';

export default async function NewRoleProfilePage() {
  const user = await requireTenantUser();
  const [competencies, availableTemplates] = await Promise.all([
    getActiveCompetenciesForTenant(user.tenantId),
    getAvailableTemplateRolesForTenant(user.tenantId),
  ]);

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
            <li className="text-gray-900 font-medium" aria-current="page">
              New Role Profile
            </li>
          </ol>
        </nav>
        <h1 className="text-2xl font-bold text-gray-900">Create Role Profile</h1>
        <p className="mt-1 text-sm text-gray-500">
          Establish benchmark skills and target capability levels for this role.
        </p>
      </div>

      {/* Form Component */}
      <CreateRoleForm competencies={competencies} availableTemplates={availableTemplates} />
    </div>
  );
}
