'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  name: string;
  href: string;
  activePattern: (pathname: string) => boolean;
  disabled?: boolean;
}

const navItems: NavItem[] = [
  {
    name: 'Overview',
    href: '/organization-admin',
    activePattern: (p) => p === '/organization-admin',
  },
  {
    name: 'Organization',
    href: '/organization-admin/organization',
    activePattern: (p) => p.startsWith('/organization-admin/organization'),
  },
  {
    name: 'Users',
    href: '/organization-admin/users',
    activePattern: (p) => p.startsWith('/organization-admin/users'),
  },
  {
    name: 'Skills Library',
    href: '/organization-admin/skills',
    activePattern: (p) => p.startsWith('/organization-admin/skills'),
  },
  {
    name: 'Role Profiles',
    href: '/organization-admin/roles',
    activePattern: (p) => p.startsWith('/organization-admin/roles'),
  },
  {
    name: 'Career Paths',
    href: '/organization-admin/career-paths',
    activePattern: (p) => p.startsWith('/organization-admin/career-paths'),
  },
  {
    name: 'Campaigns',
    href: '/organization-admin/campaigns',
    activePattern: (p) => p.startsWith('/organization-admin/campaigns'),
  },
  {
    name: 'Gap Analysis',
    href: '/organization-admin/gap-analysis',
    activePattern: (p) => p.startsWith('/organization-admin/gap-analysis'),
  },
  {
    name: 'Audit Trail',
    href: '/organization-admin/audit',
    activePattern: (p) => p.startsWith('/organization-admin/audit'),
  },
];

export function OrgAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 sm:space-x-4 border-b border-gray-200 px-4 sm:px-6 lg:px-8 bg-white">
      {navItems.map((item) => {
        const isActive = item.activePattern(pathname);

        if (item.disabled) {
          return (
            <span
              key={item.name}
              className="inline-flex items-center px-3 py-4 border-b-2 border-transparent text-sm font-medium text-gray-400 cursor-not-allowed select-none"
              title="Coming in a future release"
            >
              {item.name}
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500">
                Soon
              </span>
            </span>
          );
        }

        return (
          <Link
            key={item.name}
            href={item.href}
            className={`inline-flex items-center px-3 py-4 border-b-2 text-sm font-medium transition-colors ${
              isActive
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
