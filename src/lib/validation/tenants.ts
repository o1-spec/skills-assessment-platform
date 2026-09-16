import { z } from 'zod';
import { BillingCycle } from '@prisma/client';

export const provisionTenantSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters').max(100),
  slug: z
    .string()
    .min(2, 'Slug must be at least 2 characters')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug may only contain lowercase alphanumeric characters and hyphens'),
  planId: z.string().min(1, 'Subscription plan is required'),
  seatLimit: z.coerce.number().int().min(1, 'Seat limit must be at least 1'),
  billingCycle: z.nativeEnum(BillingCycle).default(BillingCycle.MONTHLY),
  domain: z.string().max(100).optional(),
  logoUrl: z.string().url('Invalid logo URL format').optional().or(z.literal('')),
  primaryContactName: z.string().max(100).optional(),
  primaryContactEmail: z.string().email('Invalid primary contact email format').optional().or(z.literal('')),
  adminName: z.string().min(2, 'Initial administrator name must be at least 2 characters').max(100),
  adminEmail: z.string().email('Invalid administrator email address'),
});

export const updateTenantPlanSchema = z.object({
  planId: z.string().min(1, 'Subscription plan is required'),
  seatLimit: z.coerce.number().int().min(1, 'Seat limit must be at least 1'),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
});

export type ProvisionTenantInput = z.infer<typeof provisionTenantSchema>;
export type UpdateTenantPlanInput = z.infer<typeof updateTenantPlanSchema>;
