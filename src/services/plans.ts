import { prisma } from '@/lib/db';
import { SubscriptionPlan } from '@prisma/client';
import { CreateSubscriptionPlanInput, UpdateSubscriptionPlanInput } from '@/lib/validation/plans';

export type SubscriptionPlanWithStats = SubscriptionPlan & {
  _count: {
    tenants: number;
  };
};

/**
 * Retrieves all subscription plans ordered by defaultSeatLimit.
 */
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

/**
 * Retrieves only active subscription plans available for tenant provisioning.
 */
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

/**
 * Retrieves a single subscription plan by ID.
 */
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

/**
 * Creates a new subscription plan with uniqueness check.
 */
export async function createSubscriptionPlan(input: CreateSubscriptionPlanInput): Promise<SubscriptionPlan> {
  const existing = await prisma.subscriptionPlan.findUnique({
    where: { name: input.name.trim() },
  });

  if (existing) {
    throw new Error(`A subscription plan named "${input.name.trim()}" already exists.`);
  }

  if (input.defaultSeatLimit <= 0) {
    throw new Error('Default seat limit must be greater than zero.');
  }

  return prisma.subscriptionPlan.create({
    data: {
      name: input.name.trim(),
      description: input.description?.trim() || null,
      defaultSeatLimit: input.defaultSeatLimit,
      isActive: input.isActive ?? true,
    },
  });
}

/**
 * Updates an existing subscription plan.
 */
export async function updateSubscriptionPlan(
  id: string,
  input: UpdateSubscriptionPlanInput
): Promise<SubscriptionPlan> {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new Error('Subscription plan not found.');
  }

  // Check unique name if name changed
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

  return prisma.subscriptionPlan.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      description: input.description !== undefined ? input.description.trim() || null : undefined,
      defaultSeatLimit: input.defaultSeatLimit,
      isActive: input.isActive,
    },
  });
}

/**
 * Toggles a subscription plan active state.
 */
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

/**
 * Safely deletes a subscription plan if no tenants are assigned.
 */
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
