'use server';

import { revalidatePath } from 'next/cache';
import { UserRole } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import {
  parseUserImportCsv,
  validateUserImportRows,
  bulkCreateUserInvitations,
  CsvRowResult,
} from '@/services/csv-import';
import { GeneratedInvitation } from '@/services/invitations';

export async function validateCsvUserImportAction(csvContent: string): Promise<{
  success: boolean;
  error?: string;
  results?: CsvRowResult[];
  hasErrors?: boolean;
}> {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId;
  if (!tenantId) {
    return { success: false, error: 'Unauthorized: User does not belong to an organization.' };
  }

  const { rows, parseError } = parseUserImportCsv(csvContent);
  if (parseError) {
    return { success: false, error: parseError };
  }

  const results = await validateUserImportRows(tenantId, rows);
  const hasErrors = results.some((r) => r.status === 'ERROR');

  return {
    success: true,
    results,
    hasErrors,
  };
}

export async function confirmCsvUserImportAction(csvContent: string): Promise<{
  success: boolean;
  error?: string;
  invitations?: GeneratedInvitation[];
}> {
  const user = await requireRole(UserRole.ORGANIZATION_ADMIN);
  const tenantId = user.tenantId;
  if (!tenantId) {
    return { success: false, error: 'Unauthorized: User does not belong to an organization.' };
  }

  const { rows, parseError } = parseUserImportCsv(csvContent);
  if (parseError) {
    return { success: false, error: parseError };
  }

  const results = await validateUserImportRows(tenantId, rows);
  const hasErrors = results.some((r) => r.status === 'ERROR');

  if (hasErrors) {
    return {
      success: false,
      error: 'Cannot import batch with validation errors. Please resolve all row errors and try again.',
    };
  }

  const validRows = results.filter(
    (r): r is Extract<CsvRowResult, { status: 'VALID' }> => r.status === 'VALID'
  );

  try {
    const invitations = await bulkCreateUserInvitations(tenantId, user.id, validRows);
    revalidatePath('/organization-admin/users');
    return {
      success: true,
      invitations,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to import users.',
    };
  }
}
