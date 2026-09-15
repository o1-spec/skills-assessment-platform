import { UserRole, FrameworkStatus } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { CreateTemplateForm } from './create-template-form';

export const dynamic = 'force-dynamic';

export default async function NewIndustryTemplatePage() {
  await requireRole(UserRole.PLATFORM_ADMIN);

  // Fetch only PUBLISHED framework versions with complete category and competency hierarchies
  const publishedFrameworks = await prisma.frameworkVersion.findMany({
    where: {
      status: FrameworkStatus.PUBLISHED,
    },
    include: {
      categories: {
        orderBy: { name: 'asc' },
        include: {
          children: {
            orderBy: { name: 'asc' },
            include: {
              competencies: {
                orderBy: { name: 'asc' },
                include: {
                  levels: {
                    orderBy: { level: 'asc' },
                  },
                },
              },
            },
          },
          competencies: {
            orderBy: { name: 'asc' },
            include: {
              levels: {
                orderBy: { level: 'asc' },
              },
            },
          },
        },
      },
    },
    orderBy: {
      publishedAt: 'desc',
    },
  });

  return <CreateTemplateForm publishedFrameworks={publishedFrameworks} />;
}
