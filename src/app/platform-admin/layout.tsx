import { ReactNode } from 'react';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { LogoutButton } from '@/components/ui';
import { PlatformAdminNav } from '@/components/layout';

export default async function PlatformAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireRole(UserRole.PLATFORM_ADMIN);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-8 w-8 rounded-lg bg-gray-900 flex items-center justify-center text-white font-bold text-sm shadow-sm">
              PA
            </div>
            <div>
              <div className="text-sm font-bold text-gray-900 leading-tight">
                Platform Administration
              </div>
              <div className="text-xs text-gray-500">Skills Assessment Platform &bull; SaaS Control Plane</div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{user.name}</div>
              <div className="text-xs text-blue-600 font-medium font-mono">Platform Admin</div>
            </div>
            <LogoutButton />
          </div>
        </div>

        {/* Sub-Navigation Bar */}
        <PlatformAdminNav />
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
