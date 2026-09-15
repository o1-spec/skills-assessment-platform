import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import Link from 'next/link';
import { CreateFrameworkForm } from './create-framework-form';

export default async function NewFrameworkPage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
          <Link href="/platform-admin/frameworks" className="hover:text-gray-900 transition-colors">
            &larr; Back to Frameworks
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Create Framework Draft</h1>
        <p className="mt-1 text-sm text-gray-500">
          Initialize a new canonical competency framework. Drafts can be iteratively populated with categories, skills, and levels before publishing.
        </p>
      </div>

      <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-6">
        <CreateFrameworkForm />
      </div>
    </div>
  );
}
