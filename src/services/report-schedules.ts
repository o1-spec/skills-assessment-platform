import { prisma } from '@/lib/db';
import {
  ReportSchedule,
  ReportType,
  ScheduleFrequency,
  ScheduleScopeType,
  ScheduleRunStatus,
  AuditAction,
} from '@prisma/client';
import { generateOrganizationGapExcel, generateTeamGapExcel } from './reports';
import { sendEmail } from '@/lib/email';
import { logAuditEvent, AuditActorContext } from './audit';

export interface CreateReportScheduleInput {
  tenantId: string;
  createdById: string;
  name: string;
  reportType: ReportType;
  scopeType: ScheduleScopeType;
  scopeId?: string | null;
  frequency: ScheduleFrequency;
  nextRunAt: Date;
  recipientUserIds: string[];
  auditContext?: AuditActorContext;
}

export interface UpdateReportScheduleInput {
  scheduleId: string;
  tenantId: string;
  name?: string;
  frequency?: ScheduleFrequency;
  nextRunAt?: Date;
  recipientUserIds?: string[];
  auditContext?: AuditActorContext;
}

export function calculateNextRunAt(
  frequency: ScheduleFrequency,
  fromDate: Date = new Date()
): Date {
  const next = new Date(fromDate.getTime());

  switch (frequency) {
    case ScheduleFrequency.DAILY:
      next.setUTCDate(next.getUTCDate() + 1);
      break;
    case ScheduleFrequency.WEEKLY:
      next.setUTCDate(next.getUTCDate() + 7);
      break;
    case ScheduleFrequency.MONTHLY:
      next.setUTCMonth(next.getUTCMonth() + 1);
      break;
    default:
      next.setUTCDate(next.getUTCDate() + 1);
      break;
  }

  return next;
}

export async function createReportSchedule(
  input: CreateReportScheduleInput
): Promise<ReportSchedule> {
  const {
    tenantId,
    createdById,
    name,
    reportType,
    scopeType,
    scopeId,
    frequency,
    nextRunAt,
    recipientUserIds,
    auditContext,
  } = input;

  if (!name || name.trim().length === 0) {
    throw new Error('Report schedule name is required');
  }

  if (!Object.values(ScheduleFrequency).includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
  });
  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const creator = await prisma.user.findFirst({
    where: { id: createdById, tenantId },
  });
  if (!creator) {
    throw new Error('Creator not found or unauthorized');
  }

  if (scopeType === ScheduleScopeType.TEAM) {
    if (!scopeId) {
      throw new Error('Team ID is required for team scoped reports');
    }
    const team = await prisma.team.findFirst({
      where: { id: scopeId, tenantId },
    });
    if (!team) {
      throw new Error('Team not found or foreign to tenant');
    }
  }

  if (!recipientUserIds || recipientUserIds.length === 0) {
    throw new Error('At least one recipient is required');
  }

  const validRecipients = await prisma.user.findMany({
    where: {
      id: { in: recipientUserIds },
      tenantId,
      isActive: true,
    },
    select: { id: true },
  });

  if (validRecipients.length !== recipientUserIds.length) {
    throw new Error('One or more recipients are invalid, inactive, or belong to another tenant');
  }

  return prisma.$transaction(async (tx) => {
    const schedule = await tx.reportSchedule.create({
      data: {
        tenantId,
        createdById,
        name: name.trim(),
        reportType,
        scopeType,
        scopeId: scopeType === ScheduleScopeType.TEAM ? scopeId : null,
        frequency,
        nextRunAt,
        isActive: true,
        recipients: {
          create: recipientUserIds.map((userId) => ({
            userId,
          })),
        },
      },
      include: {
        recipients: true,
      },
    });

    await logAuditEvent({
      tx,
      tenantId,
      actorId: auditContext?.actorId ?? createdById,
      actorRole: auditContext?.actorRole,
      action: AuditAction.REPORT_SCHEDULE_CREATE,
      resourceType: 'ReportSchedule',
      resourceId: schedule.id,
      details: {
        scheduleId: schedule.id,
        name: schedule.name,
        reportType: schedule.reportType,
        scopeType: schedule.scopeType,
        frequency: schedule.frequency,
        recipientCount: recipientUserIds.length,
      },
    });

    return schedule;
  });
}

export async function updateReportSchedule(
  input: UpdateReportScheduleInput
): Promise<ReportSchedule> {
  const { scheduleId, tenantId, name, frequency, nextRunAt, recipientUserIds, auditContext } =
    input;

  const existing = await prisma.reportSchedule.findFirst({
    where: { id: scheduleId, tenantId },
  });

  if (!existing) {
    throw new Error('Report schedule not found or unauthorized');
  }

  if (frequency && !Object.values(ScheduleFrequency).includes(frequency)) {
    throw new Error(`Invalid frequency: ${frequency}`);
  }

  if (recipientUserIds !== undefined) {
    if (recipientUserIds.length === 0) {
      throw new Error('At least one recipient is required');
    }
    const validRecipients = await prisma.user.findMany({
      where: {
        id: { in: recipientUserIds },
        tenantId,
        isActive: true,
      },
      select: { id: true },
    });
    if (validRecipients.length !== recipientUserIds.length) {
      throw new Error('One or more recipients are invalid, inactive, or belong to another tenant');
    }
  }

  return prisma.$transaction(async (tx) => {
    if (recipientUserIds !== undefined) {
      await tx.reportScheduleRecipient.deleteMany({
        where: { scheduleId },
      });
      await tx.reportScheduleRecipient.createMany({
        data: recipientUserIds.map((userId) => ({
          scheduleId,
          userId,
        })),
      });
    }

    const updated = await tx.reportSchedule.update({
      where: { id: scheduleId },
      data: {
        name: name ? name.trim() : undefined,
        frequency: frequency ?? undefined,
        nextRunAt: nextRunAt ?? undefined,
      },
      include: {
        recipients: true,
      },
    });

    await logAuditEvent({
      tx,
      tenantId,
      actorId: auditContext?.actorId,
      actorRole: auditContext?.actorRole,
      action: AuditAction.REPORT_SCHEDULE_UPDATE,
      resourceType: 'ReportSchedule',
      resourceId: updated.id,
      details: {
        scheduleId: updated.id,
        name: updated.name,
        frequency: updated.frequency,
        recipientCount: recipientUserIds?.length,
      },
    });

    return updated;
  });
}

export async function toggleReportScheduleActive(params: {
  scheduleId: string;
  tenantId: string;
  isActive: boolean;
  auditContext?: AuditActorContext;
}): Promise<ReportSchedule> {
  const { scheduleId, tenantId, isActive, auditContext } = params;

  const existing = await prisma.reportSchedule.findFirst({
    where: { id: scheduleId, tenantId },
  });

  if (!existing) {
    throw new Error('Report schedule not found or unauthorized');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.reportSchedule.update({
      where: { id: scheduleId },
      data: { isActive },
    });

    await logAuditEvent({
      tx,
      tenantId,
      actorId: auditContext?.actorId,
      actorRole: auditContext?.actorRole,
      action: isActive
        ? AuditAction.REPORT_SCHEDULE_ACTIVATE
        : AuditAction.REPORT_SCHEDULE_DEACTIVATE,
      resourceType: 'ReportSchedule',
      resourceId: updated.id,
      details: {
        scheduleId: updated.id,
        isActive,
      },
    });

    return updated;
  });
}

export async function getReportSchedulesForTenant(tenantId: string) {
  if (!tenantId) return [];

  return prisma.reportSchedule.findMany({
    where: { tenantId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recipients: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });
}

export async function getReportScheduleById(scheduleId: string, tenantId: string) {
  if (!scheduleId || !tenantId) return null;

  return prisma.reportSchedule.findFirst({
    where: { id: scheduleId, tenantId },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      recipients: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isActive: true,
            },
          },
        },
      },
    },
  });
}

export async function executeDueReportSchedules(
  now: Date = new Date()
): Promise<{ processed: number; succeeded: number; failed: number; errors: string[] }> {
  const dueSchedules = await prisma.reportSchedule.findMany({
    where: {
      isActive: true,
      nextRunAt: { lte: now },
    },
  });

  let processed = 0;
  let succeeded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const schedule of dueSchedules) {
    processed++;
    const nextNextRun = calculateNextRunAt(schedule.frequency, now);

    const claim = await prisma.reportSchedule.updateMany({
      where: {
        id: schedule.id,
        isActive: true,
        nextRunAt: { lte: now },
      },
      data: {
        nextRunAt: nextNextRun,
      },
    });

    if (claim.count === 0) {
      continue;
    }

    try {
      if (schedule.scopeType === ScheduleScopeType.TEAM) {
        if (!schedule.scopeId) {
          throw new Error('Schedule scope is TEAM but no scopeId is defined');
        }
        const team = await prisma.team.findFirst({
          where: { id: schedule.scopeId, tenantId: schedule.tenantId },
        });
        if (!team) {
          throw new Error(
            `Target team ${schedule.scopeId} not found or no longer belongs to tenant`
          );
        }
      }

      const recipientLinks = await prisma.reportScheduleRecipient.findMany({
        where: {
          scheduleId: schedule.id,
          user: {
            tenantId: schedule.tenantId,
            isActive: true,
          },
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
            },
          },
        },
      });

      if (recipientLinks.length === 0) {
        throw new Error('No active recipients found for scheduled report');
      }

      let excelResult: { filename: string; buffer: Buffer } | null = null;
      if (schedule.reportType === ReportType.ORGANIZATION_GAP) {
        excelResult = await generateOrganizationGapExcel(schedule.tenantId);
      } else if (schedule.reportType === ReportType.TEAM_GAP) {
        excelResult = await generateTeamGapExcel(schedule.tenantId, schedule.scopeId!);
      }

      if (!excelResult) {
        throw new Error('Failed to generate capability Excel workbook');
      }

      for (const recipient of recipientLinks) {
        await sendEmail({
          to: recipient.user.email,
          subject: `Scheduled Report: ${schedule.name}`,
          text: `Please find attached your scheduled capability report (${schedule.name}).`,
          html: `<p>Please find attached your scheduled capability report: <strong>${schedule.name}</strong>.</p>`,
          attachments: [
            {
              filename: excelResult.filename,
              content: excelResult.buffer,
              contentType:
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            },
          ],
        });
      }

      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastRunStatus: ScheduleRunStatus.SUCCESS,
          lastRunError: null,
        },
      });

      await logAuditEvent({
        tenantId: schedule.tenantId,
        action: AuditAction.REPORT_SCHEDULE_RUN,
        resourceType: 'ReportSchedule',
        resourceId: schedule.id,
        details: {
          scheduleId: schedule.id,
          reportType: schedule.reportType,
          scopeType: schedule.scopeType,
          scopeId: schedule.scopeId,
          recipientCount: recipientLinks.length,
          status: 'SUCCESS',
        },
      });

      succeeded++;
    } catch (err: unknown) {
      failed++;
      const errorMessage = err instanceof Error ? err.message : 'Unknown execution failure';
      errors.push(`Schedule ${schedule.id} (${schedule.name}): ${errorMessage}`);

      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: {
          lastRunAt: now,
          lastRunStatus: ScheduleRunStatus.FAILED,
          lastRunError: errorMessage.slice(0, 500),
        },
      });

      await logAuditEvent({
        tenantId: schedule.tenantId,
        action: AuditAction.REPORT_SCHEDULE_RUN,
        resourceType: 'ReportSchedule',
        resourceId: schedule.id,
        details: {
          scheduleId: schedule.id,
          reportType: schedule.reportType,
          scopeType: schedule.scopeType,
          scopeId: schedule.scopeId,
          status: 'FAILED',
          error: errorMessage.slice(0, 250),
        },
      });
    }
  }

  return {
    processed,
    succeeded,
    failed,
    errors,
  };
}
