import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getCompetenciesForTenant } from '@/services/competencies';
import { LearningResourceForm, AvailableCompetencyOption } from '../learning-resource-form';

export default async function NewLearningResourcePage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const competencies = await getCompetenciesForTenant(tenantId);

  const availableCompetencies: AvailableCompetencyOption[] = competencies.map((c) => ({
    id: c.id,
    name: c.name,
    type: c.type,
    levels: c.levels.map((l) => ({
      level: l.level,
      description: l.description,
    })),
  }));

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Add Learning Resource</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure educational material and connect it with skills and target proficiency levels.
        </p>
      </div>

      <LearningResourceForm
        mode="create"
        availableCompetencies={availableCompetencies}
      />
    </div>
  );
}
