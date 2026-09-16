import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { Tenant, TenantStatus, UserRole, SubscriptionPlan, BillingCycle } from '@prisma/client';
import { ProvisionTenantInput, UpdateTenantPlanInput } from '@/lib/validation/tenants';
import { hashInvitationToken, GeneratedInvitation, sendInvitationEmail } from './invitations';
import { logAuditEvent, AuditAction, AuditActorContext } from './audit';

export type TenantWithStats = Tenant & {
  plan: SubscriptionPlan | null;
  _count: {
    users: number;
    invitations: number;
    roleProfiles: number;
    campaigns: number;
  };
  activeUsersCount: number;
  activeFrameworkVersion?: string | null;
  latestInvitation?: {
    id: string;
    email: string;
    name: string;
    expiresAt: Date;
    acceptedAt: Date | null;
  } | null;
};

/**
 * Asserts that a tenant has at least one seat available for a new active user.
 * Throws an Error if the seat limit is reached.
 */
export async function assertTenantHasAvailableSeat(tenantId: string): Promise<void> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: {
      name: true,
      seatLimit: true,
    },
  });

  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  if (tenant.seatLimit !== null) {
    const activeUsersCount = await prisma.user.count({
      where: {
        tenantId,
        isActive: true,
      },
    });

    if (activeUsersCount >= tenant.seatLimit) {
      throw new Error(
        `Organization "${tenant.name}" has reached its maximum seat limit (${activeUsersCount}/${tenant.seatLimit} users).`
      );
    }
  }
}

/**
 * Retrieves all tenants with subscription plan, seat stats, and active framework adoption for Platform Admin.
 */
export async function getTenantsForPlatformAdmin(): Promise<TenantWithStats[]> {
  const tenants = await prisma.tenant.findMany({
    include: {
      plan: true,
      _count: {
        select: {
          users: true,
          invitations: true,
          roleProfiles: true,
          campaigns: true,
        },
      },
      frameworkAdoptions: {
        where: { isActive: true },
        include: {
          frameworkVersion: {
            select: { version: true },
          },
        },
        take: 1,
      },
      invitations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          email: true,
          name: true,
          expiresAt: true,
          acceptedAt: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate active users count per tenant
  const tenantIds = tenants.map((t) => t.id);
  const activeUserCounts = await prisma.user.groupBy({
    by: ['tenantId'],
    where: {
      tenantId: { in: tenantIds },
      isActive: true,
    },
    _count: {
      id: true,
    },
  });

  const activeUserCountMap = new Map<string, number>();
  for (const group of activeUserCounts) {
    if (group.tenantId) {
      activeUserCountMap.set(group.tenantId, group._count.id);
    }
  }

  return tenants.map((t) => ({
    ...t,
    activeUsersCount: activeUserCountMap.get(t.id) ?? 0,
    activeFrameworkVersion: t.frameworkAdoptions[0]?.frameworkVersion.version ?? null,
    latestInvitation: t.invitations[0] ?? null,
  }));
}

/**
 * Retrieves a single tenant by ID with full subscription, adoption, and user metrics for Platform Admin.
 */
export async function getTenantByIdForPlatformAdmin(id: string): Promise<TenantWithStats | null> {
  if (!id) return null;

  const tenant = await prisma.tenant.findUnique({
    where: { id },
    include: {
      plan: true,
      _count: {
        select: {
          users: true,
          invitations: true,
          roleProfiles: true,
          campaigns: true,
        },
      },
      frameworkAdoptions: {
        where: { isActive: true },
        include: {
          frameworkVersion: {
            select: { version: true },
          },
        },
        take: 1,
      },
      invitations: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          email: true,
          name: true,
          expiresAt: true,
          acceptedAt: true,
        },
      },
    },
  });

  if (!tenant) return null;

  const activeUsersCount = await prisma.user.count({
    where: {
      tenantId: tenant.id,
      isActive: true,
    },
  });

  return {
    ...tenant,
    activeUsersCount,
    activeFrameworkVersion: tenant.frameworkAdoptions[0]?.frameworkVersion.version ?? null,
    latestInvitation: tenant.invitations[0] ?? null,
  };
}

/**
 * Provisions a new tenant, assigns a subscription plan + seat limit,
 * sets status to PENDING_ONBOARDING, and creates an initial Org Admin invitation.
 */
export async function provisionTenant(
  input: Omit<ProvisionTenantInput, 'billingCycle'> & { billingCycle?: BillingCycle },
  createdById?: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<{ tenant: Tenant; invitation: GeneratedInvitation }> {
  const slug = input.slug.toLowerCase().trim();
  const adminEmail = input.adminEmail.toLowerCase().trim();

  // 1. Check unique slug
  const existingSlug = await prisma.tenant.findUnique({
    where: { slug },
  });
  if (existingSlug) {
    throw new Error(`An organization with the identifier "${slug}" already exists.`);
  }

  // 2. Validate Subscription Plan
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: input.planId },
  });
  if (!plan) {
    throw new Error('Selected subscription plan was not found.');
  }
  if (!plan.isActive) {
    throw new Error('Selected subscription plan is currently inactive and cannot be assigned to new organizations.');
  }

  // 3. Validate seat limit
  if (input.seatLimit <= 0) {
    throw new Error('Seat limit must be at least 1.');
  }

  // 4. Check active admin email collision
  const existingUser = await prisma.user.findUnique({
    where: { email: adminEmail },
  });
  if (existingUser && existingUser.isActive) {
    throw new Error(`An active user with email "${adminEmail}" already exists.`);
  }

  // 5. Generate invitation token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$transaction(
    async (tx) => {
      // Create Tenant
      const tenant = await tx.tenant.create({
        data: {
          name: input.name.trim(),
          slug,
          planId: input.planId,
          seatLimit: input.seatLimit,
          billingCycle: input.billingCycle || BillingCycle.MONTHLY,
          logoUrl: input.logoUrl ? input.logoUrl.trim() : null,
          domain: input.domain ? input.domain.trim() : null,
          primaryContactName: input.primaryContactName ? input.primaryContactName.trim() : null,
          primaryContactEmail: input.primaryContactEmail ? input.primaryContactEmail.toLowerCase().trim() : null,
          status: TenantStatus.ACTIVE,
        },
      });

      // Create initial Admin Invitation
      const invitation = await tx.tenantInvitation.create({
        data: {
          tenantId: tenant.id,
          email: adminEmail,
          name: input.adminName.trim(),
          role: UserRole.ORGANIZATION_ADMIN,
          tokenHash,
          expiresAt,
          createdById: createdById || null,
        },
      });

      // Audit Log: USER_INVITE
      await logAuditEvent({
        tx,
        tenantId: tenant.id,
        actorId: createdById || null,
        actorRole: UserRole.PLATFORM_ADMIN,
        action: AuditAction.USER_INVITE,
        resourceType: 'User',
        resourceId: invitation.id,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          email: adminEmail,
          role: UserRole.ORGANIZATION_ADMIN,
          expiresAt: expiresAt.toISOString(),
          isInitialAdmin: true,
        },
      });

      // Audit Log: TENANT_PROVISION
      await logAuditEvent({
        tx,
        tenantId: tenant.id,
        actorId: createdById || null,
        actorRole: UserRole.PLATFORM_ADMIN,
        action: AuditAction.TENANT_PROVISION,
        resourceType: 'Tenant',
        resourceId: tenant.id,
        ipAddress: actorContext?.ipAddress,
        userAgent: actorContext?.userAgent,
        details: {
          name: tenant.name,
          slug: tenant.slug,
          planId: plan.id,
          planName: plan.name,
          seatLimit: input.seatLimit,
          billingCycle: input.billingCycle,
          adminEmail,
        },
      });

      const invitationUrl = `/accept-invitation?token=${rawToken}`;

      return {
        tenant,
        invitation: {
          id: invitation.id,
          tenantId: tenant.id,
          email: invitation.email,
          name: invitation.name,
          role: invitation.role,
          expiresAt: invitation.expiresAt,
          rawToken,
          invitationUrl,
        },
      };
    },
    {
      timeout: 15000,
    }
  );

  // Dispatch initial org admin invitation email safely (DB transaction committed first)
  try {
    await sendInvitationEmail({
      to: adminEmail,
      name: input.adminName.trim(),
      organizationName: result.tenant.name,
      role: 'Organization Administrator',
      invitationUrl: result.invitation.invitationUrl,
      expiresAt: result.invitation.expiresAt,
    });
  } catch (err) {
    console.error('[NotificationEngine:Tenant] Failed to dispatch provisioned admin invitation email:', err);
  }

  return result;
}

/**
 * Updates a tenant's subscription plan, seat limit, and optional billing cycle.
 */
export async function updateTenantPlanAndSeatLimit(
  tenantId: string,
  input: UpdateTenantPlanInput
): Promise<Tenant> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: input.planId },
  });
  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  if (input.seatLimit <= 0) {
    throw new Error('Seat limit must be at least 1.');
  }

  const activeUserCount = await prisma.user.count({
    where: {
      tenantId,
      isActive: true,
    },
  });

  if (input.seatLimit < activeUserCount) {
    throw new Error(
      `Cannot set seat limit to ${input.seatLimit} because the organization currently has ${activeUserCount} active users.`
    );
  }

  return prisma.tenant.update({
    where: { id: tenantId },
    data: {
      planId: plan.id,
      seatLimit: input.seatLimit,
      ...(input.billingCycle ? { billingCycle: input.billingCycle } : {}),
    },
  });
}

/**
 * Updates a tenant's status (ACTIVE, SUSPENDED, PENDING_ONBOARDING, ARCHIVED).
 */
export async function updateTenantStatus(
  tenantId: string,
  status: TenantStatus,
  actor?: AuditActorContext
): Promise<Tenant> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const res = await tx.tenant.update({
      where: { id: tenantId },
      data: { status },
    });

    const action =
      status === TenantStatus.SUSPENDED
        ? AuditAction.TENANT_SUSPEND
        : status === TenantStatus.ACTIVE
        ? AuditAction.TENANT_REACTIVATE
        : status === TenantStatus.ARCHIVED
        ? AuditAction.TENANT_ARCHIVE
        : null;

    if (action) {
      await logAuditEvent({
        tx,
        tenantId,
        actorId: actor?.actorId || null,
        actorRole: actor?.actorRole || UserRole.PLATFORM_ADMIN,
        action,
        resourceType: 'Tenant',
        resourceId: tenantId,
        details: {
          previousStatus: tenant.status,
          newStatus: status,
          tenantName: tenant.name,
        },
        ipAddress: actor?.ipAddress,
        userAgent: actor?.userAgent,
      });
    }

    return res;
  });

  return updated;
}

/**
 * Terminal archival of a tenant.
 * Sets status to ARCHIVED, audits the action, and preserves all historical data.
 */
export async function archiveTenant(
  tenantId: string,
  actor?: AuditActorContext
): Promise<Tenant> {
  return updateTenantStatus(tenantId, TenantStatus.ARCHIVED, actor);
}

// ---------------------------------------------------------------------------
// ORGANIZATION PROFILE SETTINGS
// ---------------------------------------------------------------------------

export type OrganizationProfileWithTemplate = Tenant & {
  industryTemplate: {
    id: string;
    name: string;
    description: string | null;
    frameworkVersionId: string;
  } | null;
};

/**
 * Returns the organization profile with industry template details.
 */
export async function getOrganizationProfile(
  tenantId: string
): Promise<OrganizationProfileWithTemplate | null> {
  if (!tenantId) return null;

  return prisma.tenant.findUnique({
    where: { id: tenantId },
    include: {
      industryTemplate: {
        select: {
          id: true,
          name: true,
          description: true,
          frameworkVersionId: true,
        },
      },
    },
  });
}

/**
 * Returns all active IndustryTemplates for org admin template selection.
 */
export async function getIndustryTemplatesForOrgAdmin() {
  return prisma.industryTemplate.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      description: true,
      frameworkVersionId: true,
    },
    orderBy: { name: 'asc' },
  });
}

/**
 * Validates a logo URL: must be https:// or empty/null.
 * Rejects http://, data:, javascript:, file://, protocol-relative (//).
 */
function validateLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl || !logoUrl.trim()) return null;
  const trimmed = logoUrl.trim();

  if (!trimmed.startsWith('https://')) {
    throw new Error(
      'Logo URL must use HTTPS (https://...). HTTP, data URIs, and other schemes are not permitted.'
    );
  }
  return trimmed;
}

/**
 * Updates the organization's profile fields: name, logoUrl, industryTemplateId.
 * Does NOT modify competencies, role profiles, campaigns, or assessments.
 * Template change = context preference only (Correction 7).
 */
export async function updateOrganizationProfile(
  tenantId: string,
  actorId: string,
  data: {
    name?: string;
    logoUrl?: string | null;
    industryTemplateId?: string | null;
  },
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<Tenant> {
  if (!tenantId) throw new Error('Tenant ID is required.');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Organization not found.');

  const updateData: {
    name?: string;
    logoUrl?: string | null;
    industryTemplateId?: string | null;
  } = {};

  // Validate name
  if (data.name !== undefined) {
    const trimmedName = data.name.trim();
    if (trimmedName.length === 0) throw new Error('Organization name cannot be empty.');
    if (trimmedName.length > 100) throw new Error('Organization name cannot exceed 100 characters.');
    updateData.name = trimmedName;
  }

  // Validate logo URL
  if (data.logoUrl !== undefined) {
    updateData.logoUrl = validateLogoUrl(data.logoUrl);
  }

  // Validate industry template
  if (data.industryTemplateId !== undefined) {
    if (data.industryTemplateId !== null) {
      const template = await prisma.industryTemplate.findFirst({
        where: { id: data.industryTemplateId, isActive: true },
      });
      if (!template) {
        throw new Error('Selected industry template was not found or is inactive.');
      }
    }
    updateData.industryTemplateId = data.industryTemplateId;
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.tenant.update({
      where: { id: tenantId },
      data: updateData,
    });

    await logAuditEvent({
      tx,
      tenantId,
      actorId,
      actorRole: UserRole.ORGANIZATION_ADMIN,
      action: AuditAction.ORGANIZATION_PROFILE_UPDATE,
      resourceType: 'Tenant',
      resourceId: tenantId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        changedFields: Object.keys(updateData),
        previousName: tenant.name,
        newName: updateData.name,
        previousLogoUrl: tenant.logoUrl,
        previousIndustryTemplateId: tenant.industryTemplateId,
        newIndustryTemplateId: updateData.industryTemplateId,
      },
    });

    return updated;
  });
}

/**
 * Applies missing competencies from the selected industry template to the tenant.
 * This is an EXPLICIT, separate action — changing industryTemplateId alone does nothing.
 *
 * Safety guarantees (Correction 7):
 * - Only adds competencies that do NOT already exist (matched by frameworkCompetencyId)
 * - Preserves existing tenant competency weights and customizations
 * - Does NOT delete, deactivate, or overwrite existing competencies
 * - Does NOT modify RoleProfiles, campaigns, or assessments
 * - Deduplicates by frameworkCompetencyId, NOT display name
 */
export async function applyIndustryTemplateCompetencies(
  tenantId: string,
  industryTemplateId: string,
  actorId: string,
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ added: number; skipped: number }> {
  if (!tenantId) throw new Error('Tenant ID is required.');

  const template = await prisma.industryTemplate.findFirst({
    where: { id: industryTemplateId, isActive: true },
    include: {
      competencies: {
        include: {
          frameworkCompetency: {
            include: {
              category: true,
              levels: { orderBy: { level: 'asc' } },
            },
          },
        },
      },
    },
  });

  if (!template) {
    throw new Error('Industry template not found or inactive.');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Organization not found.');

  // Fetch existing tenant competencies keyed by frameworkCompetencyId
  const existingCompetencies = await prisma.competency.findMany({
    where: {
      tenantId,
      frameworkCompetencyId: { not: null },
    },
    select: { frameworkCompetencyId: true },
  });
  const existingFrameworkIds = new Set(
    existingCompetencies.map((c) => c.frameworkCompetencyId!).filter(Boolean)
  );

  let added = 0;
  let skipped = 0;

  for (const templateComp of template.competencies) {
    const fwComp = templateComp.frameworkCompetency;

    // Skip if tenant already has this competency (deduplicate by frameworkCompetencyId)
    if (existingFrameworkIds.has(fwComp.id)) {
      skipped++;
      continue;
    }

    // Create the competency with the template's weight
    const newComp = await prisma.competency.create({
      data: {
        tenantId,
        name: fwComp.name,
        description: fwComp.description,
        type: fwComp.category.type,
        frameworkCompetencyId: fwComp.id,
        isCustom: false,
        isActive: true,
        weight: templateComp.weight,
      },
    });

    // Copy competency levels
    for (const lvl of fwComp.levels) {
      await prisma.competencyLevel.create({
        data: {
          competencyId: newComp.id,
          level: lvl.level,
          description: lvl.description,
          evidencePrompt: lvl.evidencePrompt,
        },
      });
    }

    // Track the new frameworkCompetencyId to avoid duplicates within this batch
    existingFrameworkIds.add(fwComp.id);
    added++;
  }

  // Audit the template application
  await logAuditEvent({
    tenantId,
    actorId,
    actorRole: UserRole.ORGANIZATION_ADMIN,
    action: AuditAction.ORGANIZATION_TEMPLATE_CHANGE,
    resourceType: 'Tenant',
    resourceId: tenantId,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      industryTemplateId,
      industryTemplateName: template.name,
      competenciesAdded: added,
      competenciesSkipped: skipped,
    },
  });

  return { added, skipped };
}
