'use server';

import { revalidatePath } from 'next/cache';
import { requireRole } from '@/lib/auth/guards';
import {
  createDepartment,
  updateDepartment,
  toggleDepartmentActive,
  createTeam,
  updateTeam,
  toggleTeamActive,
  addTeamMember,
  removeTeamMember,
  setUserTeamMemberships,
} from '@/services/organization-structure';
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  createTeamSchema,
  updateTeamSchema,
  updateUserTeamMembershipsSchema,
} from '@/lib/validation/organization-structure';

// -------------------------------------------------------
// DEPARTMENTS
// -------------------------------------------------------

export async function createDepartmentAction(formData: FormData) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
  };
  const parsed = createDepartmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation error.' };
  }

  try {
    const dept = await createDepartment(tenantId, parsed.data);
    revalidatePath('/organization-admin/organization');
    return { success: true, id: dept.id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateDepartmentAction(departmentId: string, formData: FormData) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const raw = {
    name: (formData.get('name') as string) || undefined,
    description: (formData.get('description') as string) || undefined,
  };
  const parsed = updateDepartmentSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation error.' };
  }

  try {
    await updateDepartment(tenantId, departmentId, parsed.data);
    revalidatePath('/organization-admin/organization');
    revalidatePath(`/organization-admin/organization/departments/${departmentId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleDepartmentActiveAction(departmentId: string) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  try {
    await toggleDepartmentActive(tenantId, departmentId);
    revalidatePath('/organization-admin/organization');
    revalidatePath(`/organization-admin/organization/departments/${departmentId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// -------------------------------------------------------
// TEAMS
// -------------------------------------------------------

export async function createTeamAction(formData: FormData) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const raw = {
    name: formData.get('name') as string,
    description: (formData.get('description') as string) || undefined,
    departmentId: (formData.get('departmentId') as string) || undefined,
    managerId: (formData.get('managerId') as string) || undefined,
  };
  const parsed = createTeamSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation error.' };
  }

  try {
    const team = await createTeam(tenantId, parsed.data);
    revalidatePath('/organization-admin/organization');
    return { success: true, id: team.id };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function updateTeamAction(teamId: string, formData: FormData) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const raw = {
    name: (formData.get('name') as string) || undefined,
    description: (formData.get('description') as string) || undefined,
    departmentId: (formData.get('departmentId') as string) || undefined,
    managerId: (formData.get('managerId') as string) || undefined,
  };
  const parsed = updateTeamSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation error.' };
  }

  try {
    await updateTeam(tenantId, teamId, parsed.data);
    revalidatePath('/organization-admin/organization');
    revalidatePath(`/organization-admin/organization/teams/${teamId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function toggleTeamActiveAction(teamId: string) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  try {
    await toggleTeamActive(tenantId, teamId);
    revalidatePath('/organization-admin/organization');
    revalidatePath(`/organization-admin/organization/teams/${teamId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

// -------------------------------------------------------
// MEMBERSHIPS
// -------------------------------------------------------

export async function addTeamMemberAction(teamId: string, userId: string) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  try {
    await addTeamMember(tenantId, teamId, userId);
    revalidatePath(`/organization-admin/organization/teams/${teamId}`);
    revalidatePath(`/organization-admin/users/${userId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function removeTeamMemberAction(teamId: string, userId: string) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  try {
    await removeTeamMember(tenantId, teamId, userId);
    revalidatePath(`/organization-admin/organization/teams/${teamId}`);
    revalidatePath(`/organization-admin/users/${userId}`);
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function setUserTeamMembershipsAction(userId: string, teamIds: string[]) {
  const user = await requireRole(['ORGANIZATION_ADMIN']);
  const tenantId = user.tenantId!;

  const parsed = updateUserTeamMembershipsSchema.safeParse({ teamIds });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message || 'Validation error.' };
  }

  try {
    await setUserTeamMemberships(tenantId, userId, parsed.data.teamIds);
    revalidatePath(`/organization-admin/users/${userId}`);
    revalidatePath('/organization-admin/organization');
    return { success: true };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}
