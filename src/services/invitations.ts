import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { TenantInvitation, Tenant, UserRole, TenantStatus, RoleProfileStatus, AuditAction } from '@prisma/client';
import { AcceptInvitationInput } from '@/lib/validation/invitations';
import { sendEmail } from '@/lib/email';
import { logAuditEvent } from './audit';

export interface GeneratedInvitation {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  roleProfileId?: string | null;
  managerId?: string | null;
  teamIds?: string[];
  expiresAt: Date;
  rawToken: string;
  invitationUrl: string;
}

export type InvitationDetail = TenantInvitation & {
  tenant: {
    id: string;
    name: string;
    slug: string;
    status: TenantStatus;
  };
  manager?: {
    id: string;
    name: string;
    email: string;
  } | null;
  roleProfile?: {
    id: string;
    name: string;
  } | null;
};

export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

export async function sendInvitationEmail(params: {
  to: string;
  name: string;
  organizationName: string;
  role: string;
  invitationUrl: string;
  expiresAt: Date;
}): Promise<void> {
  const formattedExpiry = params.expiresAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const subject = `You're invited to join ${params.organizationName} on Skills Assessment Platform`;
  const text = `Hello ${params.name},\n\nYou have been invited to join ${params.organizationName} as a ${params.role} on the Skills Assessment Platform.\n\nPlease accept your invitation using the following link:\n${params.invitationUrl}\n\nThis invitation expires on ${formattedExpiry}.\n\nIf you did not expect this invitation, you can safely ignore this email.`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="color: #111827; margin-bottom: 16px;">Welcome to ${escapeHtml(params.organizationName)}</h2>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 16px;">
        Hello <strong>${escapeHtml(params.name)}</strong>,
      </p>
      <p style="font-size: 15px; line-height: 1.6; margin-bottom: 24px;">
        You have been invited to join <strong>${escapeHtml(params.organizationName)}</strong> as <strong>${escapeHtml(params.role)}</strong> on the Skills Assessment Platform.
      </p>
      <p style="margin-bottom: 24px;">
        <a href="${params.invitationUrl}" style="display: inline-block; background-color: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600;">Accept Invitation</a>
      </p>
      <p style="font-size: 13px; color: #6b7280; margin-bottom: 8px;">
        Or copy and paste this link into your browser:<br/>
        <span style="color: #2563eb; word-break: break-all;">${params.invitationUrl}</span>
      </p>
      <p style="font-size: 13px; color: #9ca3af; margin-top: 16px;">
        This invitation link will expire on ${formattedExpiry}.
      </p>
    </div>
  `;

  await sendEmail({
    to: params.to,
    subject,
    text,
    html,
  });
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

async function assertNoEmailConflict(
  tenantId: string,
  email: string,
  excludeInvitationId?: string
): Promise<void> {
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error(`An account with this email already exists.`);
  }

  const now = new Date();
  const livePending = await prisma.tenantInvitation.findFirst({
    where: {
      tenantId,
      email,
      acceptedAt: null,
      cancelledAt: null,
      expiresAt: { gt: now },
      ...(excludeInvitationId ? { NOT: { id: excludeInvitationId } } : {}),
    },
  });
  if (livePending) {
    throw new Error(
      `A pending invitation for this email address already exists. Cancel the existing invitation before sending a new one.`
    );
  }
}

export async function createTenantAdminInvitation(
  tenantId: string,
  input: {
    name: string;
    email: string;
  },
  createdById?: string,
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<GeneratedInvitation> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Tenant not found.');

  await assertNoEmailConflict(tenantId, email);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId,
      email,
      name,
      role: UserRole.ORGANIZATION_ADMIN,
      tokenHash,
      expiresAt,
      createdById: createdById || null,
    },
  });

  await logAuditEvent({
    action: AuditAction.USER_INVITE,
    entityType: 'TenantInvitation',
    entityId: invitation.id,
    tenantId,
    actorId: actorContext?.actorId || createdById,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      email,
      name,
      role: UserRole.ORGANIZATION_ADMIN,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  const invitationUrl = `/accept-invitation?token=${rawToken}`;

  try {
    await sendInvitationEmail({
      to: email,
      name,
      organizationName: tenant.name,
      role: 'Organization Administrator',
      invitationUrl,
      expiresAt: invitation.expiresAt,
    });
  } catch (emailErr) {
    console.error('[NotificationEngine:Invitation] Failed to dispatch admin invitation email:', emailErr);
  }

  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    expiresAt: invitation.expiresAt,
    rawToken,
    invitationUrl,
  };
}

export async function createTenantUserInvitation(
  tenantId: string,
  createdById: string,
  input: {
    name: string;
    email: string;
    role: UserRole;
    roleProfileId?: string | null;
    managerId?: string | null;
    teamIds?: string[] | null;
  },
  actorContext?: { actorId?: string | null; ipAddress?: string | null; userAgent?: string | null }
): Promise<GeneratedInvitation> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  if (
    input.role !== UserRole.ORGANIZATION_ADMIN &&
    input.role !== UserRole.MANAGER &&
    input.role !== UserRole.STAFF
  ) {
    throw new Error('Invalid role. Allowed roles are Organization Admin, Manager, or Staff.');
  }

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) throw new Error('Organization not found.');
  if (tenant.status !== TenantStatus.ACTIVE) {
    throw new Error('Cannot invite users to a suspended or inactive organization.');
  }

  await assertNoEmailConflict(tenantId, email);

  if (input.managerId) {
    const manager = await prisma.user.findUnique({ where: { id: input.managerId } });
    if (!manager || manager.tenantId !== tenantId) {
      throw new Error('Selected manager does not belong to this organization.');
    }
    if (!manager.isActive) throw new Error('Selected manager is inactive.');
    if (manager.role !== UserRole.MANAGER) {
      throw new Error('Assigned manager must have the Manager application role.');
    }
  }

  if (input.roleProfileId) {
    const roleProfile = await prisma.roleProfile.findFirst({
      where: {
        id: input.roleProfileId,
        tenantId,
        status: RoleProfileStatus.PUBLISHED,
        isArchived: false,
      },
    });
    if (!roleProfile) {
      throw new Error('Selected role profile does not belong to this organization or is not an active published role profile.');
    }
  }

  const resolvedTeamIds: string[] = [];
  if (input.teamIds && input.teamIds.length > 0) {
    for (const teamId of input.teamIds) {
      const team = await prisma.team.findUnique({ where: { id: teamId } });
      if (!team || team.tenantId !== tenantId) {
        throw new Error(`Team does not belong to this organization.`);
      }
      if (!team.isActive) {
        throw new Error(`Team "${team.name}" is inactive and cannot receive new members.`);
      }
      resolvedTeamIds.push(teamId);
    }
  }

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId,
      email,
      name,
      role: input.role,
      roleProfileId: input.roleProfileId || null,
      managerId: input.managerId || null,
      tokenHash,
      expiresAt,
      createdById,
    },
  });

  if (resolvedTeamIds.length > 0) {
    await prisma.tenantInvitationTeam.createMany({
      data: resolvedTeamIds.map((teamId) => ({ invitationId: invitation.id, teamId })),
      skipDuplicates: true,
    });
  }

  await logAuditEvent({
    action: AuditAction.USER_INVITE,
    entityType: 'TenantInvitation',
    entityId: invitation.id,
    tenantId,
    actorId: actorContext?.actorId || createdById,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      email,
      name,
      role: input.role,
      roleProfileId: input.roleProfileId,
      managerId: input.managerId,
      teamIds: resolvedTeamIds,
      expiresAt: invitation.expiresAt.toISOString(),
    },
  });

  const invitationUrl = `/accept-invitation?token=${rawToken}`;

  try {
    const roleLabel =
      input.role === UserRole.ORGANIZATION_ADMIN
        ? 'Organization Administrator'
        : input.role === UserRole.MANAGER
        ? 'Manager'
        : 'Staff Member';

    await sendInvitationEmail({
      to: email,
      name,
      organizationName: tenant.name,
      role: roleLabel,
      invitationUrl,
      expiresAt: invitation.expiresAt,
    });
  } catch (emailErr) {
    console.error('[NotificationEngine:Invitation] Failed to dispatch employee invitation email:', emailErr);
  }

  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    roleProfileId: invitation.roleProfileId,
    managerId: invitation.managerId,
    teamIds: resolvedTeamIds,
    expiresAt: invitation.expiresAt,
    rawToken,
    invitationUrl,
  };
}

export async function getInvitationByRawToken(rawToken: string): Promise<InvitationDetail | null> {
  if (!rawToken || !rawToken.trim()) return null;

  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await prisma.tenantInvitation.findUnique({
    where: { tokenHash },
    include: {
      tenant: {
        select: { id: true, name: true, slug: true, status: true },
      },
      manager: {
        select: { id: true, name: true, email: true },
      },
      roleProfile: {
        select: { id: true, name: true },
      },
    },
  });

  if (!invitation) return null;
  return invitation;
}

export async function acceptTenantInvitation(
  input: AcceptInvitationInput
): Promise<{ user: { id: string; email: string; name: string; role: UserRole }; tenant: Tenant }> {
  const tokenHash = hashInvitationToken(input.token);

  return prisma.$transaction(
    async (tx) => {
      const invitation = await tx.tenantInvitation.findUnique({
        where: { tokenHash },
        include: {
          tenant: true,
          teams: { select: { teamId: true } },
        },
      });

      if (!invitation) throw new Error('Invalid invitation link or token.');
      if (invitation.cancelledAt) {
        throw new Error('This invitation has been cancelled. Please contact your organization administrator.');
      }
      if (invitation.acceptedAt) throw new Error('This invitation has already been accepted.');
      if (invitation.expiresAt < new Date()) {
        throw new Error('This invitation link has expired. Please contact your administrator.');
      }

      const tenant = invitation.tenant;
      if (!tenant) throw new Error('Associated organization was not found.');
      if (tenant.status === TenantStatus.SUSPENDED) {
        throw new Error('This organization is currently suspended.');
      }

      if (tenant.seatLimit !== null) {
        const activeUsersCount = await tx.user.count({
          where: { tenantId: tenant.id, isActive: true },
        });
        if (activeUsersCount >= tenant.seatLimit) {
          throw new Error(
            `Organization seat limit reached (${activeUsersCount}/${tenant.seatLimit}). Please contact your administrator to increase seats.`
          );
        }
      }

      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email.toLowerCase().trim() },
      });
      if (existingUser) {
        throw new Error(`An account with email "${invitation.email}" already exists.`);
      }

      const passwordHash = await bcrypt.hash(input.password, 10);

      const user = await tx.user.create({
        data: {
          name: invitation.name,
          email: invitation.email.toLowerCase().trim(),
          passwordHash,
          role: invitation.role,
          managerId: invitation.managerId || null,
          roleProfileId: invitation.roleProfileId || null,
          isActive: true,
          tenantId: tenant.id,
        },
      });

      const invitationTeamIds = invitation.teams.map((t) => t.teamId);
      if (invitationTeamIds.length > 0) {
        await tx.teamMembership.createMany({
          data: invitationTeamIds.map((teamId) => ({ teamId, userId: user.id })),
          skipDuplicates: true,
        });
      }

      await tx.tenantInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      let updatedTenant = tenant;
      if (tenant.status === TenantStatus.PENDING_ONBOARDING) {
        updatedTenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: { status: TenantStatus.ACTIVE },
        });
      }

      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
        tenant: updatedTenant,
      };
    },
    { timeout: 15000 }
  );
}

export const acceptTenantAdminInvitation = acceptTenantInvitation;

