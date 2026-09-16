'use server';

import { revalidatePath } from 'next/cache';
import { requireTenantUser } from '@/lib/auth';
import {
  createReportSchedule,
  toggleReportScheduleActive,
  calculateNextRunAt,
} from '@/services';
import { ReportType, ScheduleFrequency, ScheduleScopeType, UserRole } from '@prisma/client';

export interface ScheduleFormState {
  error?: string;
  success?: boolean;
}

export async function createReportScheduleAction(
  _prevState: ScheduleFormState | undefined,
  formData: FormData
): Promise<ScheduleFormState> {
  const user = await requireTenantUser();
  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return { error: 'Unauthorized: Only Organization Admins can manage report schedules.' };
  }

  const name = formData.get('name')?.toString().trim();
  const reportType = (formData.get('reportType')?.toString() as ReportType) || ReportType.ORGANIZATION_GAP;
  const scopeType = (formData.get('scopeType')?.toString() as ScheduleScopeType) || ScheduleScopeType.ORGANIZATION;
  const scopeId = formData.get('scopeId')?.toString() || null;
  const frequency = (formData.get('frequency')?.toString() as ScheduleFrequency) || ScheduleFrequency.WEEKLY;
  const nextRunAtRaw = formData.get('nextRunAt')?.toString();
  const recipientUserIds = formData.getAll('recipientUserIds').map((v) => v.toString());

  if (!name) {
    return { error: 'Schedule name is required.' };
  }

  if (recipientUserIds.length === 0) {
    return { error: 'At least one recipient is required.' };
  }

  let nextRunAt = nextRunAtRaw ? new Date(nextRunAtRaw) : calculateNextRunAt(frequency);
  if (isNaN(nextRunAt.getTime())) {
    nextRunAt = calculateNextRunAt(frequency);
  }

  try {
    await createReportSchedule({
      tenantId: user.tenantId,
      createdById: user.id,
      name,
      reportType,
      scopeType,
      scopeId: scopeType === ScheduleScopeType.TEAM ? scopeId : null,
      frequency,
      nextRunAt,
      recipientUserIds,
      auditContext: {
        actorId: user.id,
        actorRole: user.role,
      },
    });

    revalidatePath('/organization-admin/reports');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to create report schedule';
    return { error: msg };
  }
}

export async function toggleReportScheduleActiveAction(
  scheduleId: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  const user = await requireTenantUser();
  if (user.role !== UserRole.ORGANIZATION_ADMIN) {
    return { success: false, error: 'Unauthorized' };
  }

  try {
    await toggleReportScheduleActive({
      scheduleId,
      tenantId: user.tenantId,
      isActive,
      auditContext: {
        actorId: user.id,
        actorRole: user.role,
      },
    });

    revalidatePath('/organization-admin/reports');
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to update schedule status';
    return { success: false, error: msg };
  }
}
