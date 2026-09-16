import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { User, UserRole, PlatformInvitation, AuditAction } from '@prisma/client';
import { hashInvitationToken, sendInvitationEmail } from './invitations';
import { logAuditEvent } from './audit';

if (typeof window !== 'undefined') {
  throw new Error('This module can only be executed on the server.');
}

// ---------------------------------------------------------------------------
// CONSTANTS & TYPES
// ---------------------------------------------------------------------------

/** The only roles valid for platform users. Enforced at service level. */
const PLATFORM_ONLY_ROLES = [UserRole.PLATFORM_ADMIN, UserRole.SUPPORT] as const;
type PlatformRole = (typeof PLATFORM_ONLY_ROLES)[number];

export type PlatformUserWithCounts = User & {
  _count: {
    createdInvitations: number;
    auditLogs: number;
  };
};

export type PlatformInvitationWithCreator = PlatformInvitation & {
  createdBy: {
    id: string;
    name: string;
    email: string;
  } | null;
};

// ---------------------------------------------------------------------------
// PRIVATE GUARDS
// ---------------------------------------------------------------------------

/**
 * Validates that a role is a platform-only role (PLATFORM_ADMIN or SUPPORT).
 * Rejects ORGANIZATION_ADMIN, MANAGER, STAFF at service level.
 */
function assertPlatformRole(role: UserRole): asserts role is PlatformRole {
  if (!PLATFORM_ONLY_ROLES.includes(role as PlatformRole)) {
    throw new Error(
      `Invalid role "${role}" for platform user management. Only PLATFORM_ADMIN and SUPPORT are permitted.`
    );
  }
}

/**
 * Asserts that the target user is a platform user (tenantId === null).
 * Prevents tenant accounts from being modified through this service.
 */
async function assertPlatformUser(userId: string): Promise<User> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new Error('User not found.');
  }
  if (user.tenantId !== null) {
    throw new Error(
      'Cannot modify a tenant account through platform user management.'
    );
  }
  return user;
}

/**
 * Asserts that removing / demoting the given platform admin would not leave
 * zero active PLATFORM_ADMINs on the platform.
 */
async function assertNotLastActivePlatformAdmin(excludeUserId: string): Promise<void> {
  const remaining = await prisma.user.count({
    where: {
      role: UserRole.PLATFORM_ADMIN,
      isActive: true,
      tenantId: null,
      id: { not: excludeUserId },
    },
  });
  if (remaining === 0) {
    throw new Error(
      'Cannot remove or demote the last active Platform Administrator. Promote another admin first.'
    );
  }
}

// ---------------------------------------------------------------------------
// READ FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Returns all platform users (PLATFORM_ADMIN + SUPPORT) with basic counts.
 */
export async function getPlatformUsers(): Promise<PlatformUserWithCounts[]> {
  return prisma.user.findMany({
    where: {
      tenantId: null,
      role: { in: [UserRole.PLATFORM_ADMIN, UserRole.SUPPORT] },
    },
    include: {
      _count: {
        select: {
          createdInvitations: true,
          auditLogs: true,
        },
      },
    },
    orderBy: [{ isActive: 'desc' }, { role: 'asc' }, { name: 'asc' }],
  });
}

/**
 * Returns pending platform invitations (unaccepted, unexpired, uncancelled).
 */
export async function getPendingPlatformInvitations(): Promise<PlatformInvitationWithCreator[]> {
  return prisma.platformInvitation.findMany({
    where: {
      acceptedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Retrieves a pending, valid PlatformInvitation by its raw token.
 */
export async function getPlatformInvitationByRawToken(
  rawToken: string
): Promise<PlatformInvitationWithCreator | null> {
  if (!rawToken?.trim()) return null;
  const tokenHash = hashInvitationToken(rawToken);
  return prisma.platformInvitation.findUnique({
    where: { tokenHash },
    include: {
      createdBy: {
        select: { id: true, name: true, email: true },
      },
    },
  });
}

// ---------------------------------------------------------------------------
// WRITE FUNCTIONS
// ---------------------------------------------------------------------------

/**
 * Creates a platform invitation for a new PLATFORM_ADMIN or SUPPORT account.
 * Sends an invitation email via the existing email abstraction.
 * Email failure is logged but does NOT roll back the invitation.
 */
export async function invitePlatformUser(
  actorId: string,
  input: {
    email: string;
    name: string;
    role: UserRole;
  },
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<{ invitation: PlatformInvitation; invitationUrl: string }> {
  // 1. Validate role (Correction 5 — service-level enforcement)
  assertPlatformRole(input.role);

  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  if (!email) throw new Error('Email is required.');
  if (!name) throw new Error('Name is required.');

  // 2. No existing active user with this email
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new Error(`An account with email "${email}" already exists.`);
  }

  // 3. No live pending platform invitation for this email
  const livePending = await prisma.platformInvitation.findFirst({
    where: {
      email,
      acceptedAt: null,
      cancelledAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  if (livePending) {
    throw new Error(
      'A pending platform invitation for this email already exists. Cancel it before sending a new one.'
    );
  }

  // 4. Generate token — raw never persisted or audited (Correction 3)
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  // 5. Create invitation record
  const invitation = await prisma.platformInvitation.create({
    data: {
      email,
      name,
      role: input.role,
      tokenHash,
      expiresAt,
      createdById: actorId || null,
    },
  });

  // 6. Audit — raw token is never logged
  await logAuditEvent({
    tenantId: null,
    actorId,
    actorRole: UserRole.PLATFORM_ADMIN,
    action: AuditAction.PLATFORM_USER_INVITE,
    resourceType: 'PlatformInvitation',
    resourceId: invitation.id,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      email,
      name,
      role: input.role,
      expiresAt: expiresAt.toISOString(),
    },
  });

  const invitationUrl = `/accept-invitation?token=${rawToken}&type=platform`;

  // 7. Send email via existing abstraction — failure logged but non-fatal (Correction 3)
  const roleLabel =
    input.role === UserRole.PLATFORM_ADMIN ? 'Platform Administrator' : 'Support';
  try {
    await sendInvitationEmail({
      to: email,
      name,
      organizationName: 'Skills Assessment Platform',
      role: roleLabel,
      invitationUrl,
      expiresAt,
    });
  } catch (emailErr: unknown) {
    console.error(
      '[NotificationEngine:PlatformInvitation] Failed to dispatch platform invitation email:',
      emailErr
    );
  }

  return { invitation, invitationUrl };
}

/**
 * Accepts a platform invitation, creating a tenantId=null User.
 * Re-validates stored role before creating the account.
 */
export async function acceptPlatformInvitation(
  rawToken: string,
  password: string
): Promise<{ user: Pick<User, 'id' | 'email' | 'name' | 'role'> }> {
  const tokenHash = hashInvitationToken(rawToken);

  return prisma.$transaction(
    async (tx) => {
      const invitation = await tx.platformInvitation.findUnique({
        where: { tokenHash },
      });

      if (!invitation) throw new Error('Invalid invitation link or token.');
      if (invitation.cancelledAt) {
        throw new Error('This invitation has been cancelled.');
      }
      if (invitation.acceptedAt) {
        throw new Error('This invitation has already been accepted.');
      }
      if (invitation.expiresAt < new Date()) {
        throw new Error('This invitation link has expired.');
      }

      // Re-validate stored role (Correction 5)
      assertPlatformRole(invitation.role);

      // Check for existing account
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email.toLowerCase().trim() },
      });
      if (existingUser) {
        throw new Error(
          `An account with email "${invitation.email}" already exists.`
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);

      // Create platform user — tenantId MUST be null (Correction 6)
      const user = await tx.user.create({
        data: {
          name: invitation.name,
          email: invitation.email.toLowerCase().trim(),
          passwordHash,
          role: invitation.role,
          tenantId: null, // explicit invariant
          managerId: null,
          roleProfileId: null,
          isActive: true,
        },
      });

      // Mark invitation accepted
      await tx.platformInvitation.update({
        where: { id: invitation.id },
        data: { acceptedAt: new Date() },
      });

      return {
        user: { id: user.id, email: user.email, name: user.name, role: user.role },
      };
    },
    { timeout: 15000 }
  );
}

/**
 * Changes the application role of a platform user (PLATFORM_ADMIN ↔ SUPPORT).
 * Enforces final-admin lockout and tenantId=null invariant.
 */
export async function changePlatformUserRole(
  actorId: string,
  targetUserId: string,
  newRole: UserRole,
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<User> {
  // Validate target role
  assertPlatformRole(newRole);

  // Validate target is a platform user (Correction 6)
  const targetUser = await assertPlatformUser(targetUserId);

  // Actor cannot change their own role
  if (actorId === targetUserId) {
    throw new Error('Platform Administrators cannot change their own role.');
  }

  // Final-admin lockout if demoting a PLATFORM_ADMIN
  if (
    targetUser.role === UserRole.PLATFORM_ADMIN &&
    newRole !== UserRole.PLATFORM_ADMIN
  ) {
    await assertNotLastActivePlatformAdmin(targetUserId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { role: newRole },
    });

    await logAuditEvent({
      tx,
      tenantId: null,
      actorId,
      actorRole: UserRole.PLATFORM_ADMIN,
      action: AuditAction.PLATFORM_USER_ROLE_CHANGE,
      resourceType: 'User',
      resourceId: targetUserId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        targetUserId,
        targetEmail: targetUser.email,
        previousRole: targetUser.role,
        newRole,
      },
    });

    return updated;
  });
}

/**
 * Deactivates a platform user safely.
 * Enforces: cannot deactivate self, cannot remove last active PLATFORM_ADMIN.
 */
export async function deactivatePlatformUser(
  actorId: string,
  targetUserId: string,
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<User> {
  // Validate target is a platform user (Correction 6)
  const targetUser = await assertPlatformUser(targetUserId);

  if (actorId === targetUserId) {
    throw new Error('Platform Administrators cannot deactivate their own account.');
  }

  if (!targetUser.isActive) {
    return targetUser; // Already inactive — idempotent
  }

  // Final-admin lockout
  if (targetUser.role === UserRole.PLATFORM_ADMIN) {
    await assertNotLastActivePlatformAdmin(targetUserId);
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive: false, deactivatedAt: new Date() },
    });

    await logAuditEvent({
      tx,
      tenantId: null,
      actorId,
      actorRole: UserRole.PLATFORM_ADMIN,
      action: AuditAction.PLATFORM_USER_DEACTIVATE,
      resourceType: 'User',
      resourceId: targetUserId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        targetUserId,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        targetRole: targetUser.role,
      },
    });

    return updated;
  });
}

/**
 * Reactivates a deactivated platform user.
 */
export async function reactivatePlatformUser(
  actorId: string,
  targetUserId: string,
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<User> {
  // Validate target is a platform user (Correction 6)
  const targetUser = await assertPlatformUser(targetUserId);

  if (targetUser.isActive) {
    return targetUser; // Already active — idempotent
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.user.update({
      where: { id: targetUserId },
      data: { isActive: true, deactivatedAt: null },
    });

    await logAuditEvent({
      tx,
      tenantId: null,
      actorId,
      actorRole: UserRole.PLATFORM_ADMIN,
      action: AuditAction.PLATFORM_USER_REACTIVATE,
      resourceType: 'User',
      resourceId: targetUserId,
      ipAddress: actorContext?.ipAddress,
      userAgent: actorContext?.userAgent,
      details: {
        targetUserId,
        targetEmail: targetUser.email,
        targetName: targetUser.name,
        targetRole: targetUser.role,
      },
    });

    return updated;
  });
}

/**
 * Cancels a pending platform invitation.
 */
export async function cancelPlatformInvitation(
  actorId: string,
  invitationId: string,
  actorContext?: { ipAddress?: string | null; userAgent?: string | null }
): Promise<PlatformInvitation> {
  const invitation = await prisma.platformInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new Error('Platform invitation not found.');
  }
  if (invitation.acceptedAt) {
    throw new Error('Cannot cancel an invitation that has already been accepted.');
  }
  if (invitation.cancelledAt) {
    throw new Error('This invitation is already cancelled.');
  }

  const cancelled = await prisma.platformInvitation.update({
    where: { id: invitationId },
    data: { cancelledAt: new Date() },
  });

  await logAuditEvent({
    tenantId: null,
    actorId,
    actorRole: UserRole.PLATFORM_ADMIN,
    action: AuditAction.PLATFORM_USER_INVITE,
    resourceType: 'PlatformInvitation',
    resourceId: invitationId,
    ipAddress: actorContext?.ipAddress,
    userAgent: actorContext?.userAgent,
    details: {
      cancelled: true,
      email: invitation.email,
      role: invitation.role,
    },
  });

  return cancelled;
}
