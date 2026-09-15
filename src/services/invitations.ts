import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { TenantInvitation, Tenant, UserRole, TenantStatus } from '@prisma/client';
import { AcceptInvitationInput } from '@/lib/validation/invitations';

export interface GeneratedInvitation {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: UserRole;
  roleProfileId?: string | null;
  managerId?: string | null;
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

/**
 * Generates a SHA-256 hash of a raw invitation token.
 */
export function hashInvitationToken(rawToken: string): string {
  return crypto.createHash('sha256').update(rawToken.trim()).digest('hex');
}

/**
 * Creates an initial Organization Admin invitation for a tenant during provisioning.
 */
export async function createTenantAdminInvitation(
  tenantId: string,
  input: {
    name: string;
    email: string;
  },
  createdById?: string
): Promise<GeneratedInvitation> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  // Verify tenant exists
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Tenant not found.');
  }

  // Check if an active user with this email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.isActive) {
    throw new Error(`An active user with email "${email}" already exists.`);
  }

  // Generate cryptographically secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

  const invitationUrl = `/accept-invitation?token=${rawToken}`;

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

/**
 * Creates a standard tenant user invitation created by an Organization Admin.
 */
export async function createTenantUserInvitation(
  tenantId: string,
  createdById: string,
  input: {
    name: string;
    email: string;
    role: UserRole;
    roleProfileId?: string | null;
    managerId?: string | null;
  }
): Promise<GeneratedInvitation> {
  const email = input.email.toLowerCase().trim();
  const name = input.name.trim();

  // 1. Role validation: Must be an allowed tenant role (never PLATFORM_ADMIN)
  if (
    input.role !== UserRole.ORGANIZATION_ADMIN &&
    input.role !== UserRole.MANAGER &&
    input.role !== UserRole.STAFF
  ) {
    throw new Error('Invalid role. Allowed roles are Organization Admin, Manager, or Staff.');
  }

  // 2. Verify tenant exists and is ACTIVE
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });

  if (!tenant) {
    throw new Error('Organization not found.');
  }

  if (tenant.status !== TenantStatus.ACTIVE) {
    throw new Error('Cannot invite users to a suspended or inactive organization.');
  }

  // 3. Check for existing active account
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser && existingUser.isActive) {
    throw new Error(`An active user with email "${email}" already exists.`);
  }

  // 4. Validate Manager if provided
  if (input.managerId) {
    const manager = await prisma.user.findUnique({
      where: { id: input.managerId },
    });

    if (!manager || manager.tenantId !== tenantId) {
      throw new Error('Selected manager does not belong to this organization.');
    }

    if (!manager.isActive) {
      throw new Error('Selected manager is inactive.');
    }

    if (manager.role !== UserRole.MANAGER) {
      throw new Error('Assigned manager must have the Manager application role.');
    }
  }

  // 5. Validate Role Profile if provided
  if (input.roleProfileId) {
    const roleProfile = await prisma.roleProfile.findUnique({
      where: { id: input.roleProfileId },
    });

    if (!roleProfile || roleProfile.tenantId !== tenantId) {
      throw new Error('Selected role profile does not belong to this organization.');
    }
  }

  // 6. Generate secure token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashInvitationToken(rawToken);
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

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

  const invitationUrl = `/accept-invitation?token=${rawToken}`;

  return {
    id: invitation.id,
    tenantId: invitation.tenantId,
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    roleProfileId: invitation.roleProfileId,
    managerId: invitation.managerId,
    expiresAt: invitation.expiresAt,
    rawToken,
    invitationUrl,
  };
}

/**
 * Retrieves a valid, unaccepted, unexpired, uncancelled invitation by raw token.
 */
export async function getInvitationByRawToken(rawToken: string): Promise<InvitationDetail | null> {
  if (!rawToken || !rawToken.trim()) return null;

  const tokenHash = hashInvitationToken(rawToken);

  const invitation = await prisma.tenantInvitation.findUnique({
    where: { tokenHash },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
      manager: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      roleProfile: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!invitation) return null;

  return invitation;
}

/**
 * Accepts an invitation: creates user with role, manager, roleProfile from invitation,
 * enforces seat limit at acceptance time, marks invitation accepted, and updates tenant if pending.
 */
export async function acceptTenantInvitation(
  input: AcceptInvitationInput
): Promise<{ user: { id: string; email: string; name: string; role: UserRole }; tenant: Tenant }> {
  const tokenHash = hashInvitationToken(input.token);

  return prisma.$transaction(
    async (tx) => {
      // 1. Fetch invitation
      const invitation = await tx.tenantInvitation.findUnique({
        where: { tokenHash },
        include: {
          tenant: true,
        },
      });

      if (!invitation) {
        throw new Error('Invalid invitation link or token.');
      }

      if (invitation.cancelledAt) {
        throw new Error('This invitation has been cancelled. Please contact your organization administrator.');
      }

      if (invitation.acceptedAt) {
        throw new Error('This invitation has already been accepted.');
      }

      if (invitation.expiresAt < new Date()) {
        throw new Error('This invitation link has expired. Please contact your administrator.');
      }

      const tenant = invitation.tenant;
      if (!tenant) {
        throw new Error('Associated organization was not found.');
      }

      if (tenant.status === TenantStatus.SUSPENDED) {
        throw new Error('This organization is currently suspended.');
      }

      // 2. Check seat limits at acceptance time
      if (tenant.seatLimit !== null) {
        const activeUsersCount = await tx.user.count({
          where: {
            tenantId: tenant.id,
            isActive: true,
          },
        });

        if (activeUsersCount >= tenant.seatLimit) {
          throw new Error(
            `Organization seat limit reached (${activeUsersCount}/${tenant.seatLimit}). Please contact your administrator to increase seats.`
          );
        }
      }

      // 3. Check for existing active email
      const existingUser = await tx.user.findUnique({
        where: { email: invitation.email.toLowerCase().trim() },
      });

      if (existingUser && existingUser.isActive) {
        throw new Error(`An active user with email "${invitation.email}" already exists.`);
      }

      // 4. Hash password securely
      const passwordHash = await bcrypt.hash(input.password, 10);

      // 5. Create User using server-derived invitation values
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

      // 6. Mark invitation as accepted
      await tx.tenantInvitation.update({
        where: { id: invitation.id },
        data: {
          acceptedAt: new Date(),
        },
      });

      // 7. Update tenant status if pending onboarding
      let updatedTenant = tenant;
      if (tenant.status === TenantStatus.PENDING_ONBOARDING) {
        updatedTenant = await tx.tenant.update({
          where: { id: tenant.id },
          data: {
            status: TenantStatus.ACTIVE,
          },
        });
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        tenant: updatedTenant,
      };
    },
    {
      timeout: 15000,
    }
  );
}

// Backward-compatible alias
export const acceptTenantAdminInvitation = acceptTenantInvitation;
