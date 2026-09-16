import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getLearningResourceById } from '@/services/learning-resources';
import { getCompetenciesForTenant } from '@/services/competencies';
import { LearningResourceForm, AvailableCompetencyOption } from '../learning-resource-form';

export default async function EditLearningResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const { id } = await params;
  const resource = await getLearningResourceById(tenantId, id);

  if (!resource) {
    notFound();
  }

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

  const initialData = {
    id: resource.id,
    title: resource.title,
    description: resource.description,
    url: resource.url,
    provider: resource.provider,
    resourceType: resource.resourceType,
    isActive: resource.isActive,
    mappings: resource.mappings.map((m) => ({
      competencyId: m.competencyId,
      targetLevel: m.targetLevel,
    })),
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Learning Resource</h1>
        <p className="mt-1 text-sm text-gray-500">
          Update resource details, toggle availability, or adjust skill level mappings.
        </p>
      </div>

      <LearningResourceForm
        mode="edit"
        initialData={initialData}
        availableCompetencies={availableCompetencies}
      />
    </div>
  );
}
