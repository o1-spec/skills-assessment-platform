import { prisma } from '@/lib/db';
import { SubscriptionPlan } from '@prisma/client';
import { CreateSubscriptionPlanInput, UpdateSubscriptionPlanInput } from '@/lib/validation/plans';

export type SubscriptionPlanWithStats = SubscriptionPlan & {
  _count: {
    tenants: number;
  };
};

export async function getSubscriptionPlans(): Promise<SubscriptionPlanWithStats[]> {
  return prisma.subscriptionPlan.findMany({
    include: {
      _count: {
        select: { tenants: true },
      },
    },
    orderBy: {
      defaultSeatLimit: 'asc',
    },
  });
}

export async function getActiveSubscriptionPlans(): Promise<SubscriptionPlan[]> {
  return prisma.subscriptionPlan.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      defaultSeatLimit: 'asc',
    },
  });
}

export async function getSubscriptionPlanById(id: string): Promise<SubscriptionPlanWithStats | null> {
  if (!id) return null;
  return prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tenants: true },
      },
    },
  });
}

import { logAuditEvent, AuditAction, AuditActorContext } from './audit';
import { UserRole } from '@prisma/client';

export async function createSubscriptionPlan(
  input: CreateSubscriptionPlanInput,
  actor?: AuditActorContext
): Promise<SubscriptionPlan> {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { name: input.name.trim() },
  });

  if (existing) {
    throw new Error(`A subscription plan named "${input.name.trim()}" already exists.`);
  }

  if (input.defaultSeatLimit <= 0) {
    throw new Error('Default seat limit must be greater than zero.');
  }

  return prisma.$transaction(async (tx) => {
    const plan = await tx.subscriptionPlan.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() || null,
        defaultSeatLimit: input.defaultSeatLimit,
        isActive: input.isActive ?? true,
      },
    });

    await logAuditEvent({
      tx,
      tenantId: null,
      actorId: actor?.actorId || null,
      actorRole: actor?.actorRole || UserRole.PLATFORM_ADMIN,
      action: AuditAction.PLAN_CREATE,
      resourceType: 'SubscriptionPlan',
      resourceId: plan.id,
      details: {
        name: plan.name,
        defaultSeatLimit: plan.defaultSeatLimit,
        isActive: plan.isActive,
      },
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });

    return plan;
  });
}

export async function updateSubscriptionPlan(
  id: string,
  input: UpdateSubscriptionPlanInput,
  actor?: AuditActorContext
): Promise<SubscriptionPlan> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  if (input.name && input.name.trim() !== plan.name) {
    const existing = await prisma.subscriptionPlan.findUnique({
      where: { name: input.name.trim() },
    });
    if (existing) {
      throw new Error(`A subscription plan named "${input.name.trim()}" already exists.`);
    }
  }

  if (input.defaultSeatLimit !== undefined && input.defaultSeatLimit <= 0) {
    throw new Error('Default seat limit must be greater than zero.');
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscriptionPlan.update({
      where: { id },
      data: {
        name: input.name?.trim(),
        description: input.description !== undefined ? input.description.trim() || null : undefined,
        defaultSeatLimit: input.defaultSeatLimit,
        isActive: input.isActive,
      },
    });

    await logAuditEvent({
      tx,
      tenantId: null,
      actorId: actor?.actorId || null,
      actorRole: actor?.actorRole || UserRole.PLATFORM_ADMIN,
      action: AuditAction.PLAN_UPDATE,
      resourceType: 'SubscriptionPlan',
      resourceId: updated.id,
      details: {
        name: updated.name,
        defaultSeatLimit: updated.defaultSeatLimit,
        isActive: updated.isActive,
        previousName: plan.name,
      },
      ipAddress: actor?.ipAddress,
      userAgent: actor?.userAgent,
    });

    return updated;
  });
}

export async function toggleSubscriptionPlanActive(id: string, isActive: boolean): Promise<SubscriptionPlan> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  return prisma.subscriptionPlan.update({
    where: { id },
    data: { isActive },
  });
}

export async function deleteSubscriptionPlan(id: string): Promise<SubscriptionPlan> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
    include: {
      _count: {
        select: { tenants: true },
      },
    },
  });

  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  if (plan._count.tenants > 0) {
    throw new Error(
      `Cannot delete subscription plan "${plan.name}" because it is currently assigned to ${plan._count.tenants} organization(s). Deactivate it instead.`
    );
  }

  return prisma.subscriptionPlan.delete({
    where: { id },
  });
}
