import { prisma } from '@/lib/db';
import {
  TenantStatus,
  UserRole,
  CampaignStatus,
  AssessmentStatus,
} from '@prisma/client';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

export interface PlatformAnalyticsData {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    archived: number;
    pendingOnboarding: number;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    platformUsers: number;
    tenantUsers: number;
    byRole: Record<UserRole, number>;
  };
  campaigns: {
    total: number;
    active: number;
    draft: number;
    closed: number;
  };
  assessments: {
    total: number;
    notStarted: number;
    draft: number;
    submitted: number;
    pendingCorroboration: number;
    completed: number;
    completionRate: number; // percentage rounded to 1 decimal place
  };
  frameworkAdoptionDistribution: Array<{
    frameworkVersionId: string;
    version: string;
    activeTenantCount: number;
  }>;
  industryTemplateUsage: Array<{
    templateId: string;
    templateName: string;
    tenantCount: number;
  }>;
  benchmarkingNotice: {
    status: 'OPERATIONAL_ANALYTICS_ONLY';
    consentModelConfigured: boolean;
    notice: string;
  };
}

/**
 * Returns macro-level operational analytics across all tenants.
 * Uses performant database aggregate queries without loading individual employee records into memory.
 * Adheres strictly to privacy boundaries: no individual employee names, emails, evidence, or ratings.
 */
export async function getPlatformAnalytics(): Promise<PlatformAnalyticsData> {
  // 1. Tenant Status Aggregation
  const tenantGroup = await prisma.tenant.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const tenantStatusMap: Record<TenantStatus, number> = {
    [TenantStatus.PENDING_ONBOARDING]: 0,
    [TenantStatus.ACTIVE]: 0,
    [TenantStatus.SUSPENDED]: 0,
    [TenantStatus.ARCHIVED]: 0,
  };

  let totalTenants = 0;
  for (const item of tenantGroup) {
    tenantStatusMap[item.status] = item._count._all;
    totalTenants += item._count._all;
  }

  // 2. User Aggregates & Role Distribution
  const [activeUsersCount, inactiveUsersCount, platformUsersCount, tenantUsersCount] =
    await Promise.all([
      prisma.user.count({ where: { isActive: true } }),
      prisma.user.count({ where: { isActive: false } }),
      prisma.user.count({ where: { tenantId: null } }),
      prisma.user.count({ where: { tenantId: { not: null } } }),
    ]);

  const roleGroup = await prisma.user.groupBy({
    by: ['role'],
    _count: { _all: true },
  });

  const roleMap: Record<UserRole, number> = {
    [UserRole.PLATFORM_ADMIN]: 0,
    [UserRole.ORGANIZATION_ADMIN]: 0,
    [UserRole.MANAGER]: 0,
    [UserRole.STAFF]: 0,
    [UserRole.SUPPORT]: 0,
  };

  for (const item of roleGroup) {
    roleMap[item.role] = item._count._all;
  }

  // 3. Campaign Aggregates
  const campaignGroup = await prisma.assessmentCampaign.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const campaignMap: Record<CampaignStatus, number> = {
    [CampaignStatus.DRAFT]: 0,
    [CampaignStatus.ACTIVE]: 0,
    [CampaignStatus.CLOSED]: 0,
  };

  let totalCampaigns = 0;
  for (const item of campaignGroup) {
    campaignMap[item.status] = item._count._all;
    totalCampaigns += item._count._all;
  }

  // 4. Assessment Aggregates & Completion Rate
  const assessmentGroup = await prisma.assessment.groupBy({
    by: ['status'],
    _count: { _all: true },
  });

  const assessmentMap: Record<AssessmentStatus, number> = {
    [AssessmentStatus.NOT_STARTED]: 0,
    [AssessmentStatus.DRAFT]: 0,
    [AssessmentStatus.SUBMITTED]: 0,
    [AssessmentStatus.PENDING_CORROBORATION]: 0,
    [AssessmentStatus.COMPLETED]: 0,
  };

  let totalAssessments = 0;
  for (const item of assessmentGroup) {
    assessmentMap[item.status] = item._count._all;
    totalAssessments += item._count._all;
  }

  const completionRate =
    totalAssessments > 0
      ? Math.round((assessmentMap[AssessmentStatus.COMPLETED] / totalAssessments) * 1000) / 10
      : 0;

  // 5. Framework Adoption Distribution across active tenants
  const adoptions = await prisma.tenantFrameworkAdoption.findMany({
    where: {
      isActive: true,
      tenant: { status: TenantStatus.ACTIVE },
    },
    include: {
      frameworkVersion: {
        select: {
          id: true,
          version: true,
          status: true,
        },
      },
    },
  });

  const frameworkCountMap = new Map<string, { version: string; count: number }>();
  for (const adoption of adoptions) {
    const fId = adoption.frameworkVersionId;
    const existing = frameworkCountMap.get(fId) || {
      version: adoption.frameworkVersion.version,
      count: 0,
    };
    existing.count += 1;
    frameworkCountMap.set(fId, existing);
  }

  const frameworkAdoptionDistribution = Array.from(frameworkCountMap.entries()).map(
    ([frameworkVersionId, data]) => ({
      frameworkVersionId,
      version: data.version,
      activeTenantCount: data.count,
    })
  );

  // 6. Industry Template Usage across tenants
  const templateUsageGroup = await prisma.tenant.groupBy({
    by: ['industryTemplateId'],
    where: {
      industryTemplateId: { not: null },
      status: { in: [TenantStatus.ACTIVE, TenantStatus.PENDING_ONBOARDING] },
    },
    _count: { _all: true },
  });

  const templateIds = templateUsageGroup
    .map((g) => g.industryTemplateId)
    .filter((id): id is string => id !== null);

  const templateRecords = await prisma.industryTemplate.findMany({
    where: { id: { in: templateIds } },
    select: { id: true, name: true },
  });

  const templateNameMap = new Map<string, string>(templateRecords.map((t) => [t.id, t.name]));

  const industryTemplateUsage = templateUsageGroup.map((item) => ({
    templateId: item.industryTemplateId!,
    templateName: templateNameMap.get(item.industryTemplateId!) || 'Unknown Template',
    tenantCount: item._count._all,
  }));

  return {
    tenants: {
      total: totalTenants,
      active: tenantStatusMap[TenantStatus.ACTIVE],
      suspended: tenantStatusMap[TenantStatus.SUSPENDED],
      archived: tenantStatusMap[TenantStatus.ARCHIVED],
      pendingOnboarding: tenantStatusMap[TenantStatus.PENDING_ONBOARDING],
    },
    users: {
      total: activeUsersCount + inactiveUsersCount,
      active: activeUsersCount,
      inactive: inactiveUsersCount,
      platformUsers: platformUsersCount,
      tenantUsers: tenantUsersCount,
      byRole: roleMap,
    },
    campaigns: {
      total: totalCampaigns,
      active: campaignMap[CampaignStatus.ACTIVE],
      draft: campaignMap[CampaignStatus.DRAFT],
      closed: campaignMap[CampaignStatus.CLOSED],
    },
    assessments: {
      total: totalAssessments,
      notStarted: assessmentMap[AssessmentStatus.NOT_STARTED],
      draft: assessmentMap[AssessmentStatus.DRAFT],
      submitted: assessmentMap[AssessmentStatus.SUBMITTED],
      pendingCorroboration: assessmentMap[AssessmentStatus.PENDING_CORROBORATION],
      completed: assessmentMap[AssessmentStatus.COMPLETED],
      completionRate,
    },
    frameworkAdoptionDistribution,
    industryTemplateUsage,
    benchmarkingNotice: {
      status: 'OPERATIONAL_ANALYTICS_ONLY',
      consentModelConfigured: false,
      notice:
        'Detailed cross-tenant skill benchmarking is disabled. Multi-tenant operational analytics are aggregated at the macro level. Cross-organization skill comparisons require explicit anonymization consent models.',
    },
  };
}
