import { z } from 'zod';

export const createSubscriptionPlanSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  defaultSeatLimit: z.coerce.number().int().min(1, 'Default seat limit must be at least 1'),
  isActive: z.boolean().default(true),
});

export const updateSubscriptionPlanSchema = z.object({
  name: z.string().min(2, 'Plan name must be at least 2 characters').max(100),
  description: z.string().max(500).optional(),
  defaultSeatLimit: z.coerce.number().int().min(1, 'Default seat limit must be at least 1'),
  isActive: z.boolean().optional(),
});

export type CreateSubscriptionPlanInput = z.infer<typeof createSubscriptionPlanSchema>;
export type UpdateSubscriptionPlanInput = z.infer<typeof updateSubscriptionPlanSchema>;
