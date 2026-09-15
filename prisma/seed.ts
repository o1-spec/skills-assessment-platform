import 'dotenv/config';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { PrismaClient, UserRole, CompetencyType, RoleProfileStatus, CampaignStatus, AssessmentStatus } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const connectionString = process.env.DATABASE_URL?.replace(/[?&]sslmode=[^&]+/, '');
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });




async function main() {
  console.log('🌱 Starting database seed...');

  // Hash shared demo password for development accounts
  const demoPasswordHash = await bcrypt.hash('Password123!', 10);

  // 1. Primary Demo Tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'acme-technologies' },
    update: {},
    create: {
      name: 'Acme Technologies',
      slug: 'acme-technologies',
    },
  });
  console.log(`✓ Tenant ready: ${tenant.name} (${tenant.id})`);

  // 2. Demo Users
  // Platform Admin (Global, tenantId = null)
  const platformAdmin = await prisma.user.upsert({
    where: { email: 'platform@skills.test' },
    update: {
      passwordHash: demoPasswordHash,
      isActive: true,
    },
    create: {
      name: 'Peter Platform',
      email: 'platform@skills.test',
      passwordHash: demoPasswordHash,
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      tenantId: null,
    },
  });

  // Organization Admin
  const orgAdmin = await prisma.user.upsert({
    where: { email: 'admin@acme.test' },
    update: {
      passwordHash: demoPasswordHash,
      isActive: true,
    },
    create: {
      name: 'Olivia Admin',
      email: 'admin@acme.test',
      passwordHash: demoPasswordHash,
      role: UserRole.ORGANIZATION_ADMIN,
      isActive: true,
      tenantId: tenant.id,
    },
  });

  // Manager
  const manager = await prisma.user.upsert({
    where: { email: 'manager@acme.test' },
    update: {
      passwordHash: demoPasswordHash,
      isActive: true,
    },
    create: {
      name: 'Michael Manager',
      email: 'manager@acme.test',
      passwordHash: demoPasswordHash,
      role: UserRole.MANAGER,
      isActive: true,
      tenantId: tenant.id,
    },
  });

  // Staff (Direct report to Michael Manager)
  const staff = await prisma.user.upsert({
    where: { email: 'staff@acme.test' },
    update: {
      managerId: manager.id,
      passwordHash: demoPasswordHash,
      isActive: true,
    },
    create: {
      name: 'Sarah Staff',
      email: 'staff@acme.test',
      passwordHash: demoPasswordHash,
      role: UserRole.STAFF,
      isActive: true,
      tenantId: tenant.id,
      managerId: manager.id,
    },
  });

  console.log(`✓ Users ready: Platform Admin (${platformAdmin.email}), Org Admin (${orgAdmin.email}), Manager (${manager.email}), Staff (${staff.email})`);

  // 3. Competencies & Levels Definition
  const competencyData = [
    {
      name: 'JavaScript',
      type: CompetencyType.TECHNICAL,
      description: 'Core JavaScript language fundamentals, asynchronous programming, modern ES features, and design patterns.',
      levels: [
        { level: 1, description: 'Understands basic JavaScript syntax and concepts.' },
        { level: 2, description: 'Can implement simple application logic with guidance.' },
        { level: 3, description: 'Can independently build and debug common JavaScript features.' },
        { level: 4, description: 'Can design maintainable JavaScript solutions and guide others.' },
        { level: 5, description: 'Can solve complex application and architectural problems using JavaScript.' },
      ],
    },
    {
      name: 'Node.js',
      type: CompetencyType.TECHNICAL,
      description: 'Server-side runtime, event loop, stream processing, module systems, and backend frameworks.',
      levels: [
        { level: 1, description: 'Understands basic server-side JavaScript concepts.' },
        { level: 2, description: 'Can build simple Node.js endpoints with guidance.' },
        { level: 3, description: 'Can independently build and maintain Node.js backend services.' },
        { level: 4, description: 'Can design reliable backend services and handle production concerns.' },
        { level: 5, description: 'Can lead architecture decisions for complex Node.js systems.' },
      ],
    },
    {
      name: 'SQL',
      type: CompetencyType.TECHNICAL,
      description: 'Relational database schema design, querying, indexing strategies, constraints, and query optimization.',
      levels: [
        { level: 1, description: 'Understands basic relational database concepts.' },
        { level: 2, description: 'Can write simple SELECT, INSERT, UPDATE, and DELETE queries.' },
        { level: 3, description: 'Can design and query relational data independently.' },
        { level: 4, description: 'Can optimize queries and reason about indexes and data modelling.' },
        { level: 5, description: 'Can design and tune complex database systems.' },
      ],
    },
    {
      name: 'REST APIs',
      type: CompetencyType.TECHNICAL,
      description: 'HTTP protocol semantics, RESTful resource design, authentication, validation, pagination, and error handling.',
      levels: [
        { level: 1, description: 'Understands basic HTTP and API concepts.' },
        { level: 2, description: 'Can consume and implement simple REST endpoints.' },
        { level: 3, description: 'Can independently design CRUD-oriented REST APIs.' },
        { level: 4, description: 'Can design robust APIs with validation, authorization, pagination, and error handling.' },
        { level: 5, description: 'Can define API standards and architecture across complex systems.' },
      ],
    },
    {
      name: 'Communication',
      type: CompetencyType.BEHAVIORAL,
      description: 'Conveying technical ideas, status updates, documentation, and active listening across diverse audiences.',
      levels: [
        { level: 1, description: 'Communicates basic information when prompted.' },
        { level: 2, description: 'Communicates clearly within their immediate team.' },
        { level: 3, description: 'Explains technical ideas clearly to different audiences.' },
        { level: 4, description: 'Facilitates complex technical discussions and alignment.' },
        { level: 5, description: 'Shapes communication practices across teams.' },
      ],
    },
    {
      name: 'Collaboration',
      type: CompetencyType.BEHAVIORAL,
      description: 'Cross-functional teamwork, constructive code reviews, conflict resolution, and fostering psychological safety.',
      levels: [
        { level: 1, description: 'Participates in team activities with guidance.' },
        { level: 2, description: 'Works effectively with teammates on assigned tasks.' },
        { level: 3, description: 'Collaborates independently across functions.' },
        { level: 4, description: 'Helps resolve disagreements and improves team collaboration.' },
        { level: 5, description: 'Establishes collaboration practices across multiple teams.' },
      ],
    },
    {
      name: 'Problem Solving',
      type: CompetencyType.BEHAVIORAL,
      description: 'Root cause analysis, debugging under ambiguity, pragmatic trade-off analysis, and innovative solution design.',
      levels: [
        { level: 1, description: 'Solves simple, clearly defined problems with guidance.' },
        { level: 2, description: 'Breaks down straightforward problems and proposes solutions.' },
        { level: 3, description: 'Independently investigates and solves moderately complex problems.' },
        { level: 4, description: 'Solves ambiguous problems and evaluates trade-offs.' },
        { level: 5, description: 'Leads resolution of complex problems affecting multiple systems or teams.' },
      ],
    },
  ];

  const competencyMap = new Map<string, string>();

  for (const comp of competencyData) {
    // Find or create competency
    let existingComp = await prisma.competency.findFirst({
      where: {
        tenantId: tenant.id,
        name: comp.name,
      },
    });

    if (!existingComp) {
      existingComp = await prisma.competency.create({
        data: {
          tenantId: tenant.id,
          name: comp.name,
          type: comp.type,
          description: comp.description,
        },
      });
    }

    competencyMap.set(comp.name, existingComp.id);

    // Upsert levels
    for (const lvl of comp.levels) {
      await prisma.competencyLevel.upsert({
        where: {
          competencyId_level: {
            competencyId: existingComp.id,
            level: lvl.level,
          },
        },
        update: {
          description: lvl.description,
          evidencePrompt: 'Describe a recent project example or situation demonstrating your experience at this level.',
        },
        create: {
          competencyId: existingComp.id,
          level: lvl.level,
          description: lvl.description,
          evidencePrompt: 'Describe a recent project example or situation demonstrating your experience at this level.',
        },
      });
    }
  }

  console.log(`✓ Seeded ${competencyData.length} competencies with 5 levels each (35 total levels).`);

  // 4. Role Profile: Backend Engineer
  let roleProfile = await prisma.roleProfile.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Backend Engineer',
    },
  });

  if (!roleProfile) {
    roleProfile = await prisma.roleProfile.create({
      data: {
        tenantId: tenant.id,
        name: 'Backend Engineer',
        description: 'Standard expectations and competency benchmarks for Backend Engineers at Acme Technologies.',
        status: RoleProfileStatus.PUBLISHED,
      },
    });
  }

  const roleRequirements = [
    { name: 'JavaScript', targetLevel: 4 },
    { name: 'Node.js', targetLevel: 4 },
    { name: 'SQL', targetLevel: 3 },
    { name: 'REST APIs', targetLevel: 4 },
    { name: 'Communication', targetLevel: 3 },
    { name: 'Collaboration', targetLevel: 3 },
    { name: 'Problem Solving', targetLevel: 3 },
  ];

  for (const req of roleRequirements) {
    const compId = competencyMap.get(req.name);
    if (!compId) continue;

    await prisma.roleRequirement.upsert({
      where: {
        roleProfileId_competencyId: {
          roleProfileId: roleProfile.id,
          competencyId: compId,
        },
      },
      update: {
        targetLevel: req.targetLevel,
      },
      create: {
        roleProfileId: roleProfile.id,
        competencyId: compId,
        targetLevel: req.targetLevel,
      },
    });
  }

  console.log(`✓ Role Profile ready: ${roleProfile.name} with ${roleRequirements.length} requirements.`);

  // 5. Assessment Campaign: Q3 Engineering Skills Assessment
  const deadline = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days ahead

  let campaign = await prisma.assessmentCampaign.findFirst({
    where: {
      tenantId: tenant.id,
      name: 'Q3 Engineering Skills Assessment',
    },
  });

  if (!campaign) {
    campaign = await prisma.assessmentCampaign.create({
      data: {
        tenantId: tenant.id,
        name: 'Q3 Engineering Skills Assessment',
        description: 'Organization-wide Q3 technical and behavioral competency assessment for the engineering department.',
        roleProfileId: roleProfile.id,
        status: CampaignStatus.ACTIVE,
        requiresCorroboration: true,
        deadline,
      },
    });
  }

  // Link all 7 competencies to campaign
  for (const [, compId] of competencyMap.entries()) {
    await prisma.campaignCompetency.upsert({
      where: {
        campaignId_competencyId: {
          campaignId: campaign.id,
          competencyId: compId,
        },
      },
      update: {},
      create: {
        campaignId: campaign.id,
        competencyId: compId,
      },
    });
  }

  // Link participant: Sarah Staff
  await prisma.campaignParticipant.upsert({
    where: {
      campaignId_userId: {
        campaignId: campaign.id,
        userId: staff.id,
      },
    },
    update: {},
    create: {
      campaignId: campaign.id,
      userId: staff.id,
    },
  });

  console.log(`✓ Campaign ready: ${campaign.name} (Active, deadline: ${deadline.toISOString().split('T')[0]})`);

  // 6. Sarah's Assessment Instance
  const assessment = await prisma.assessment.upsert({
    where: {
      campaignId_userId: {
        campaignId: campaign.id,
        userId: staff.id,
      },
    },
    update: {
      status: AssessmentStatus.NOT_STARTED,
    },
    create: {
      campaignId: campaign.id,
      userId: staff.id,
      status: AssessmentStatus.NOT_STARTED,
    },
  });

  // Create assessment items (unanswered) for each campaign competency
  for (const [, compId] of competencyMap.entries()) {
    await prisma.assessmentItem.upsert({
      where: {
        assessmentId_competencyId: {
          assessmentId: assessment.id,
          competencyId: compId,
        },
      },
      update: {
        selfRating: null,
        evidenceText: null,
        finalRating: null,
      },
      create: {
        assessmentId: assessment.id,
        competencyId: compId,
        selfRating: null,
        evidenceText: null,
        finalRating: null,
      },
    });
  }

  console.log(`✓ Sarah Staff Assessment initialized with status NOT_STARTED and 7 blank assessment items.`);
  console.log('✨ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
