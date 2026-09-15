import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { LogoutButton } from '@/components/ui';

export default async function OrganizationAdminPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900">Organization Admin</h1>
          <LogoutButton />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">User Details</h2>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-4 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Role</dt>
              <dd className="mt-1 text-sm font-mono text-purple-600 font-semibold">{user.role}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Tenant</dt>
              <dd className="mt-1 text-sm text-gray-900">{user.tenant?.name ?? 'None'}</dd>
            </div>
          </dl>
        </div>
      </main>
    </div>
  );
}
