import { notFound } from 'next/navigation';
import { requireRole } from '@/lib/auth';
import { UserRole } from '@prisma/client';
import { getInterviewQuestionSetById } from '@/services/interview-questions';
import { InterviewQuestionSetDetail } from '../interview-question-set-detail';

export default async function InterviewQuestionSetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId!;

  const { id } = await params;
  const questionSet = await getInterviewQuestionSetById(tenantId, id);

  if (!questionSet) {
    notFound();
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <InterviewQuestionSetDetail questionSet={questionSet} />
    </div>
  );
}
