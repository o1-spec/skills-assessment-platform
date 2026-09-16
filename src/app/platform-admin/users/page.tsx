import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getPlatformUsers, getPendingPlatformInvitations } from '@/services/platform-users';
import {
  InvitePlatformUserForm,
  PlatformUserActions,
  CancelInvitationButton,
} from './platform-user-actions';

export const metadata = {
  title: 'Platform Users | Skills Assessment Platform',
  description: 'Manage platform administrator and support accounts.',
};

const ROLE_LABELS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'Platform Admin',
  SUPPORT: 'Support',
  ORGANIZATION_ADMIN: 'Org Admin',
  MANAGER: 'Manager',
  STAFF: 'Staff',
};

const ROLE_COLORS: Record<UserRole, string> = {
  PLATFORM_ADMIN: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  SUPPORT: 'bg-amber-50 text-amber-700 border-amber-200',
  ORGANIZATION_ADMIN: 'bg-blue-50 text-blue-700 border-blue-200',
  MANAGER: 'bg-purple-50 text-purple-700 border-purple-200',
  STAFF: 'bg-gray-50 text-gray-700 border-gray-200',
};

export default async function PlatformUsersPage() {
  const currentUser = await requireRole(UserRole.PLATFORM_ADMIN);

  const [users, pendingInvitations] = await Promise.all([
    getPlatformUsers(),
    getPendingPlatformInvitations(),
  ]);

  const activeUsers = users.filter((u) => u.isActive);
  const inactiveUsers = users.filter((u) => !u.isActive);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Platform Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage platform administrator and support accounts. These accounts have no tenant affiliation.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active Users', value: activeUsers.length },
          { label: 'Pending Invitations', value: pendingInvitations.length },
          { label: 'Inactive Users', value: inactiveUsers.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            <p className="text-xs font-medium text-gray-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Invite form */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Invite Platform User</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            An invitation email will be sent. Only PLATFORM_ADMIN and SUPPORT roles can be invited here.
          </p>
        </div>
        <div className="px-6 py-5">
          <InvitePlatformUserForm />
        </div>
      </div>

      {/* Active Users table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-900">Active Accounts</h2>
        </div>
        {activeUsers.length === 0 ? (
          <p className="px-6 py-8 text-sm text-gray-400 text-center">No active platform accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {activeUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-xs text-indigo-500">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <PlatformUserActions
                        user={{ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }}
                        currentUserId={currentUser.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">Pending Invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Invited by</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Expires</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{inv.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[inv.role]}`}>
                        {ROLE_LABELS[inv.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {inv.createdBy?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(inv.expiresAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <CancelInvitationButton invitationId={inv.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inactive Users */}
      {inactiveUsers.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900 text-gray-400">Inactive Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Deactivated</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inactiveUsers.map((user) => (
                  <tr key={user.id} className="opacity-60 hover:opacity-100 hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-medium text-gray-900">{user.name}</td>
                    <td className="px-6 py-4 text-gray-600 font-mono text-xs">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-xs font-semibold border px-2 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {user.deactivatedAt ? new Date(user.deactivatedAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-6 py-4">
                      <PlatformUserActions
                        user={{ id: user.id, name: user.name, email: user.email, role: user.role, isActive: user.isActive }}
                        currentUserId={currentUser.id}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
