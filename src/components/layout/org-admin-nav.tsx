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
    name: 'Learning Resources',
    href: '/organization-admin/learning-resources',
    activePattern: (p) => p.startsWith('/organization-admin/learning-resources'),
  },
  {
    name: 'Interview Questions',
    href: '/organization-admin/interview-questions',
    activePattern: (p) => p.startsWith('/organization-admin/interview-questions'),
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
    name: 'Reports',
    href: '/organization-admin/reports',
    activePattern: (p) => p.startsWith('/organization-admin/reports'),
  },
  {
    name: 'Audit Trail',
    href: '/organization-admin/audit',
    activePattern: (p) => p.startsWith('/organization-admin/audit'),
  },
  {
    name: 'Search',
    href: '/organization-admin/search',
    activePattern: (p) => p.startsWith('/organization-admin/search'),
  },
];

export function OrgAdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex space-x-1 sm:space-x-4 border-b border-stone-200/80 px-4 sm:px-6 lg:px-8 bg-white">
      {navItems.map((item) => {
        const isActive = item.activePattern(pathname);

        if (item.disabled) {
          return (
            <span
              key={item.name}
              className="inline-flex items-center px-3 py-4 border-b-2 border-transparent text-sm font-medium text-stone-400 cursor-not-allowed select-none"
              title="Coming in a future release"
            >
              {item.name}
              <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-stone-100 text-stone-500">
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
                ? 'border-neutral-900 text-neutral-900 font-semibold'
                : 'border-transparent text-stone-600 hover:text-stone-900 hover:border-stone-300'
            }`}
          >
            {item.name}
          </Link>
        );
      })}
    </nav>
  );
}
