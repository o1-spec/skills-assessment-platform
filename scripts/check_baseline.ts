import { prisma } from '../src/lib/db';

async function main() {
  const fw = await prisma.frameworkVersion.findFirst({ where: { status: 'PUBLISHED' } });
  const be = await prisma.roleProfile.findFirst({
    where: { name: 'Backend Engineer', status: 'PUBLISHED', isArchived: false },
    include: { requirements: true }
  });
  const sarah = await prisma.user.findFirst({
    where: { email: 'staff@acme.test' },
    include: { roleProfile: true }
  });
  const q3 = await prisma.assessmentCampaign.findFirst({
    where: { name: { contains: 'Q3' }, status: 'ACTIVE' }
  });
  const sarahAssessment = await prisma.assessment.findFirst({
    where: { userId: sarah?.id, campaignId: q3?.id },
    include: { items: { include: { attachments: true } } }
  });

  console.log('Framework:', fw?.version, fw?.status);
  console.log('RoleProfile:', be?.name, be?.status, 'archived:', be?.isArchived, 'reqs:', be?.requirements.length);
  console.log('Sarah email & role:', sarah?.email, sarah?.roleProfile?.name);
  console.log('Q3 Campaign:', q3?.name, q3?.status);
  console.log('Sarah Assessment:', {
    id: sarahAssessment?.id,
    status: sarahAssessment?.status,
    itemCount: sarahAssessment?.items.length,
    attachments: sarahAssessment?.items.reduce((acc, i) => acc + i.attachments.length, 0),
    nonBlank: sarahAssessment?.items.filter(i => i.selfRating !== null || i.evidenceText !== null).length,
  });
}

main().finally(() => prisma.$disconnect());
