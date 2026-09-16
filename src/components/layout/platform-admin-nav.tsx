'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface PlatformAdminNavItem {
  name: string;
  href: string;
  exact: boolean;
  active: boolean;
  enabled: boolean;
  badge?: string;
}

export function PlatformAdminNav() {
  const pathname = usePathname();

  const navItems: PlatformAdminNavItem[] = [
    {
      name: 'Overview',
      href: '/platform-admin',
      exact: true,
      active: pathname === '/platform-admin',
      enabled: true,
    },
    {
      name: 'Competency Frameworks',
      href: '/platform-admin/frameworks',
      exact: false,
      active: pathname?.startsWith('/platform-admin/frameworks'),
      enabled: true,
    },
    {
      name: 'Tenants',
      href: '/platform-admin/tenants',
      exact: false,
      active: pathname?.startsWith('/platform-admin/tenants'),
      enabled: true,
    },
    {
      name: 'Subscription Plans',
      href: '/platform-admin/plans',
      exact: false,
      active: pathname?.startsWith('/platform-admin/plans'),
      enabled: true,
    },
    {
      name: 'Industry Templates',
      href: '/platform-admin/templates',
      exact: false,
      active: pathname?.startsWith('/platform-admin/templates'),
      enabled: true,
    },
    {
      name: 'Audit Logs',
      href: '/platform-admin/audit',
      exact: false,
      active: pathname?.startsWith('/platform-admin/audit'),
      enabled: true,
    },
    {
      name: 'Platform Users',
      href: '/platform-admin/users',
      exact: false,
      active: pathname?.startsWith('/platform-admin/users'),
      enabled: true,
    },
    {
      name: 'Analytics',
      href: '/platform-admin/analytics',
      exact: false,
      active: pathname?.startsWith('/platform-admin/analytics'),
      enabled: true,
    },
    {
      name: 'Notification Templates',
      href: '/platform-admin/notification-templates',
      exact: false,
      active: pathname?.startsWith('/platform-admin/notification-templates'),
      enabled: true,
    },
    {
      name: 'Integrations',
      href: '/platform-admin/integrations',
      exact: false,
      active: pathname?.startsWith('/platform-admin/integrations'),
      enabled: true,
    },
  ];

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
          {navItems.map((item) => {
            if (!item.enabled) {
              return (
                <span
                  key={item.name}
                  className="whitespace-nowrap py-3 px-1 border-b-2 border-transparent text-xs font-medium text-gray-400 cursor-not-allowed flex items-center space-x-1.5"
                  title="Scheduled for subsequent increment"
                >
                  <span>{item.name}</span>
                  {item.badge && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-400">
                      {item.badge}
                    </span>
                  )}
                </span>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                className={`whitespace-nowrap py-3 px-1 border-b-2 text-xs font-medium transition-colors flex items-center space-x-1.5 ${
                  item.active
                    ? 'border-gray-900 text-gray-900 font-bold'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
