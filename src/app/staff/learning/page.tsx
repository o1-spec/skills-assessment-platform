import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getStaffLearningRecommendations } from '@/services/learning-resources';
import { StaffLearningView } from './staff-learning-view';

export default async function StaffLearningPage() {
  const user = await requireRole(UserRole.STAFF);
  const tenantId = user.tenantId!;

  const data = await getStaffLearningRecommendations(user.id, tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Learning & Development (SM-05)</h1>
        <p className="mt-1 text-sm text-gray-500">
          Personalized educational resources mapped to your current role requirements to help bridge capability gaps and advance your career.
        </p>
      </div>

      <StaffLearningView data={data} />
    </div>
  );
}
