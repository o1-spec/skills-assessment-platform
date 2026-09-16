import { requireRole } from '@/lib/auth';
import { UserRole, RoleProfileStatus } from '@prisma/client';
import { getRoleProfilesForTenant } from '@/services/role-profiles';
import { InterviewQuestionGenerator, SelectableRoleProfile } from '../interview-question-generator';

export default async function NewInterviewQuestionsPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const roleProfiles = await getRoleProfilesForTenant(tenantId, {
    status: RoleProfileStatus.PUBLISHED,
    includeArchived: false,
  });

  const selectableRoles: SelectableRoleProfile[] = roleProfiles.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description,
    requirementsCount: r._count?.requirements || 0,
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Generate Interview Guide</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create a standardized, skill-aligned interview question guide derived from role profile requirements.
        </p>
      </div>

      <InterviewQuestionGenerator roleProfiles={selectableRoles} />
    </div>
  );
}
