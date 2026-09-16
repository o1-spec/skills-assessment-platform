import crypto from 'crypto';
import Papa from 'papaparse';
import { prisma } from '@/lib/db';
import { UserRole, RoleProfileStatus } from '@prisma/client';
import { GeneratedInvitation, sendInvitationEmail } from './invitations';

export const CSV_COLUMNS = ['name', 'email', 'role', 'manager_email', 'role_profile_name', 'team_name'] as const;

export type CsvRawRow = {
  name: string;
  email: string;
  role: string;
  manager_email?: string;
  role_profile_name?: string;
  team_name?: string;
  _rowNumber: number;
};

export type CsvRowResult =
  | {
      rowNumber: number;
      status: 'VALID';
      name: string;
      email: string;
      role: UserRole;
      managerId: string | null;
      roleProfileId: string | null;
      teamId: string | null;
      resolvedManagerName: string | null;
      resolvedRoleProfileName: string | null;
      resolvedTeamName: string | null;
    }
  | {
      rowNumber: number;
      status: 'ERROR';
      name: string;
      email: string;
      role: string;
      errors: string[];
    };

export function parseUserImportCsv(csvContent: string): { rows: CsvRawRow[]; parseError?: string } {
  const result = Papa.parse<Record<string, string>>(csvContent.trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim().toLowerCase(),
    transform: (v) => v.trim(),
  });

  if (result.errors.length > 0) {
    const fatalErrors = result.errors.filter((e) => e.type === 'Delimiter' || e.type === 'Quotes');
    if (fatalErrors.length > 0) {
      return { rows: [], parseError: `CSV parse error: ${fatalErrors[0].message}` };
    }
  }

  if (!result.data || result.data.length === 0) {
    return { rows: [], parseError: 'The CSV file contains no data rows.' };
  }

  const headers = Object.keys(result.data[0] || {});
  const missingRequired = (['name', 'email', 'role'] as const).filter(
    (col) => !headers.includes(col)
  );
  if (missingRequired.length > 0) {
    return {
      rows: [],
      parseError: `Missing required column(s): ${missingRequired.join(', ')}. Required: name, email, role`,
    };
  }

  const rows: CsvRawRow[] = result.data.map((row, idx) => ({
    name: (row['name'] || '').trim(),
    email: (row['email'] || '').trim().toLowerCase(),
    role: (row['role'] || '').trim().toUpperCase(),
    manager_email: (row['manager_email'] || '').trim().toLowerCase() || undefined,
    role_profile_name: (row['role_profile_name'] || '').trim() || undefined,
    team_name: (row['team_name'] || '').trim() || undefined,
    _rowNumber: idx + 2, // 1-indexed, row 1 is header
  }));

  return { rows };
}

const VALID_ROLES = new Set<string>(['STAFF', 'MANAGER', 'ORGANIZATION_ADMIN']);

export async function validateUserImportRows(
  tenantId: string,
  rows: CsvRawRow[]
): Promise<CsvRowResult[]> {
  const [managers, roleProfiles, teams, liveInvitations] = await Promise.all([
    prisma.user.findMany({
      where: { tenantId, role: UserRole.MANAGER, isActive: true },
      select: { id: true, email: true, name: true },
    }),
    prisma.roleProfile.findMany({
      where: { tenantId, status: RoleProfileStatus.PUBLISHED, isArchived: false },
      select: { id: true, name: true },
    }),
    prisma.team.findMany({
      where: { tenantId, isActive: true },
      select: { id: true, name: true },
    }),
    prisma.tenantInvitation.findMany({
      where: {
        tenantId,
        acceptedAt: null,
        cancelledAt: null,
        expiresAt: { gt: new Date() },
      },
      select: { email: true },
    }),
  ]);

  const allGlobalUsers = await prisma.user.findMany({
    select: { email: true },
  });

  const globalEmailSet = new Set(allGlobalUsers.map((u) => u.email));
  const livePendingEmails = new Set(liveInvitations.map((i) => i.email));
  const managerByEmail = new Map(managers.map((m) => [m.email, m]));
  const roleProfileByName = new Map(roleProfiles.map((rp) => [rp.name.toLowerCase(), rp]));
  const teamByName = new Map(teams.map((t) => [t.name.toLowerCase(), t]));

  const batchEmails = new Map<string, number>();

  const results: CsvRowResult[] = [];

  for (const row of rows) {
    const errors: string[] = [];

    if (!row.name) errors.push('Name is required.');
    if (!row.email) {
      errors.push('Email is required.');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)) {
      errors.push('Email is not a valid email address.');
    }

    if (!row.role) {
      errors.push('Role is required.');
    } else if (!VALID_ROLES.has(row.role)) {
      errors.push(`Invalid role "${row.role}". Must be one of: STAFF, MANAGER, ORGANIZATION_ADMIN.`);
    }

    if (row.email) {
      const firstSeen = batchEmails.get(row.email);
      if (firstSeen !== undefined) {
        errors.push(`Duplicate email in this batch (first seen at row ${firstSeen}).`);
      } else {
        batchEmails.set(row.email, row._rowNumber);
      }
    }

    if (row.email && globalEmailSet.has(row.email)) {
      errors.push('An account with this email already exists.');
    }

    if (row.email && livePendingEmails.has(row.email)) {
      errors.push('A pending invitation for this email already exists in this organization.');
    }

    let resolvedManagerId: string | null = null;
    let resolvedManagerName: string | null = null;
    if (row.manager_email) {
      const manager = managerByEmail.get(row.manager_email);
      if (!manager) {
        errors.push(
          `Manager email "${row.manager_email}" was not found or does not have the Manager role in this organization.`
        );
      } else {
        resolvedManagerId = manager.id;
        resolvedManagerName = manager.name;
      }
    }

    let resolvedRoleProfileId: string | null = null;
    let resolvedRoleProfileName: string | null = null;
    if (row.role_profile_name) {
      const rp = roleProfileByName.get(row.role_profile_name.toLowerCase());
      if (!rp) {
        errors.push(`Role profile "${row.role_profile_name}" was not found in this organization.`);
      } else {
        resolvedRoleProfileId = rp.id;
        resolvedRoleProfileName = rp.name;
      }
    }

    let resolvedTeamId: string | null = null;
    let resolvedTeamName: string | null = null;
    if (row.team_name) {
      const team = teamByName.get(row.team_name.toLowerCase());
      if (!team) {
        errors.push(
          `Team "${row.team_name}" was not found or is inactive in this organization.`
        );
      } else {
        resolvedTeamId = team.id;
        resolvedTeamName = team.name;
      }
    }

    if (errors.length > 0) {
      results.push({
        rowNumber: row._rowNumber,
        status: 'ERROR',
        name: row.name,
        email: row.email,
        role: row.role,
        errors,
      });
    } else {
      results.push({
        rowNumber: row._rowNumber,
        status: 'VALID',
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        managerId: resolvedManagerId,
        roleProfileId: resolvedRoleProfileId,
        teamId: resolvedTeamId,
        resolvedManagerName,
        resolvedRoleProfileName,
        resolvedTeamName,
      });
    }
  }

  return results;
}

export async function bulkCreateUserInvitations(
  tenantId: string,
  createdById: string,
  validRows: Extract<CsvRowResult, { status: 'VALID' }>[]
): Promise<GeneratedInvitation[]> {
  if (validRows.length === 0) return [];

  const invitations: GeneratedInvitation[] = [];

  await prisma.$transaction(
    async (tx) => {
      for (const row of validRows) {
      const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

        const inv = await tx.tenantInvitation.create({
          data: {
            tenantId,
            email: row.email,
            name: row.name,
            role: row.role,
            managerId: row.managerId || null,
            roleProfileId: row.roleProfileId || null,
            tokenHash,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            createdById,
          },
        });

        if (row.teamId) {
          await tx.tenantInvitationTeam.create({
            data: { invitationId: inv.id, teamId: row.teamId },
          });
        }

        invitations.push({
          id: inv.id,
          tenantId: inv.tenantId,
          email: inv.email,
          name: inv.name,
          role: inv.role,
          roleProfileId: inv.roleProfileId,
          managerId: inv.managerId,
          teamIds: row.teamId ? [row.teamId] : [],
          expiresAt: inv.expiresAt,
          rawToken,
          invitationUrl: `/accept-invitation?token=${rawToken}`,
        });
      }
    },
    { timeout: 30000 }
  );

  try {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { name: true },
    });
    const orgName = tenant?.name || 'Your Organization';

    for (const inv of invitations) {
      try {
        const roleLabel =
          inv.role === UserRole.ORGANIZATION_ADMIN
            ? 'Organization Administrator'
            : inv.role === UserRole.MANAGER
            ? 'Manager'
            : 'Staff Member';

        await sendInvitationEmail({
          to: inv.email,
          name: inv.name,
          organizationName: orgName,
          role: roleLabel,
          invitationUrl: inv.invitationUrl,
          expiresAt: inv.expiresAt,
        });
      } catch (emailErr) {
        console.error(
          `[NotificationEngine:CSV] Failed to dispatch invitation email to ${inv.email}:`,
          emailErr
        );
      }
    }
  } catch (err) {
    console.error('[NotificationEngine:CSV] Error in bulk invitation email dispatch:', err);
  }

  return invitations;
}
