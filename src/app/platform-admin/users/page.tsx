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
  PLATFORM_ADMIN: 'bg-neutral-900 text-white border-neutral-900',
  SUPPORT: 'bg-stone-100 text-stone-700 border-stone-200/80',
  ORGANIZATION_ADMIN: 'bg-stone-100 text-stone-800 border-stone-200/80',
  MANAGER: 'bg-purple-50 text-purple-700 border-purple-200/60',
  STAFF: 'bg-stone-100 text-stone-600 border-stone-200/80',
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
      <div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Platform Users</h1>
        <p className="mt-1 text-xs text-stone-500">
          Manage platform administrator and support accounts. These accounts have no tenant affiliation.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Active Users', value: activeUsers.length },
          { label: 'Pending Invitations', value: pendingInvitations.length },
          { label: 'Inactive Users', value: inactiveUsers.length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white border border-stone-200/80 rounded-2xl p-5 shadow-xs">
            <p className="text-2xl font-bold text-neutral-900">{value}</p>
            <p className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mt-1">{label}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <h2 className="text-sm font-bold text-neutral-900">Invite Platform User</h2>
          <p className="text-xs text-stone-500 mt-0.5">
            An invitation email will be sent. Only PLATFORM_ADMIN and SUPPORT roles can be invited here.
          </p>
        </div>
        <div className="px-6 py-5">
          <InvitePlatformUserForm />
        </div>
      </div>

      <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
          <h2 className="text-sm font-bold text-neutral-900">Active Accounts</h2>
        </div>
        {activeUsers.length === 0 ? (
          <p className="px-6 py-8 text-xs text-stone-400 text-center font-medium">No active platform accounts found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Joined</th>
                  <th className="px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activeUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-xs font-semibold text-stone-400">(you)</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-stone-600 font-mono text-[11px]">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500">
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

      {pendingInvitations.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
            <h2 className="text-sm font-bold text-neutral-900">Pending Invitations</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Invited by</th>
                  <th className="px-6 py-3.5">Expires</th>
                  <th className="px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {pendingInvitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{inv.name}</td>
                    <td className="px-6 py-4 text-stone-600 font-mono text-[11px]">{inv.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${ROLE_COLORS[inv.role]}`}>
                        {ROLE_LABELS[inv.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500">
                      {inv.createdBy?.name ?? '—'}
                    </td>
                    <td className="px-6 py-4 text-stone-500">
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

      {inactiveUsers.length > 0 && (
        <div className="bg-white border border-stone-200/80 rounded-2xl shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-stone-100 bg-stone-50/70">
            <h2 className="text-sm font-bold text-stone-500">Inactive Accounts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="border-b border-stone-100 bg-stone-50/50 text-left text-[11px] font-bold text-stone-400 uppercase tracking-wider">
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Email</th>
                  <th className="px-6 py-3.5">Role</th>
                  <th className="px-6 py-3.5">Deactivated</th>
                  <th className="px-6 py-3.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {inactiveUsers.map((user) => (
                  <tr key={user.id} className="opacity-60 hover:opacity-100 hover:bg-stone-50/60 transition-colors">
                    <td className="px-6 py-4 font-semibold text-neutral-900">{user.name}</td>
                    <td className="px-6 py-4 text-stone-600 font-mono text-[11px]">{user.email}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-block text-[11px] font-semibold border px-2.5 py-0.5 rounded-full ${ROLE_COLORS[user.role]}`}>
                        {ROLE_LABELS[user.role]}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-stone-500">
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
