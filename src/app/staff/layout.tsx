import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { redirect } from 'next/navigation';
import { requireTenantUser, getRoleDashboardPath } from '@/lib/auth';
import { LogoutButton } from '@/components/ui';
import { StaffNav } from '@/components/layout';
import { NotificationBell } from '@/components/notifications';

export default async function StaffLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireTenantUser();

  if (user.role !== UserRole.STAFF) {
    redirect(getRoleDashboardPath(user.role));
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              {user.tenant?.name?.charAt(0) ?? 'S'}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900 leading-tight">
                {user.tenant?.name ?? 'Organization Portal'}
              </div>
              <div className="text-xs text-gray-500">Skills Assessment Platform</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <NotificationBell />
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-emerald-600 font-medium">Staff Member</div>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <StaffNav />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
