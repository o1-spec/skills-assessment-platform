import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { getCompetenciesForTenant } from '@/services/competencies';
import {
  getActiveFrameworkAdoptionForTenant,
  getAvailablePublishedFrameworksForTenant,
} from '@/services/framework-adoption';
import { SkillsLibraryView } from './skills-library-view';

export default async function SkillsLibraryPage() {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const [competencies, activeAdoption, availableFrameworks] = await Promise.all([
    getCompetenciesForTenant(tenantId),
    getActiveFrameworkAdoptionForTenant(tenantId),
    getAvailablePublishedFrameworksForTenant(tenantId),
  ]);

  return (
    <SkillsLibraryView
      competencies={competencies}
      activeAdoption={activeAdoption}
      availableFrameworks={availableFrameworks}
    />
  );
}
