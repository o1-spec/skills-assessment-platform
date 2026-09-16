import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import Link from 'next/link';
import { CreateCustomSkillForm } from './create-custom-skill-form';

export default async function NewCustomSkillPage() {
  await requireRole(UserRole.ORGANIZATION_ADMIN);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <div className="flex items-center space-x-2 text-xs text-stone-500 mb-2">
          <Link href="/organization-admin/skills" className="hover:text-neutral-900 transition-colors">
            &larr; Back to Skills Library
          </Link>
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">Create Custom Competency</h1>
        <p className="mt-1 text-sm text-stone-500">
          Define an organization-specific technical or behavioral skill with custom responsibility and capability level descriptors.
        </p>
      </div>

      <div className="bg-white shadow-xs rounded-2xl border border-stone-200/80 p-6 sm:p-8">
        <CreateCustomSkillForm />
      </div>
    </div>
  );
}
