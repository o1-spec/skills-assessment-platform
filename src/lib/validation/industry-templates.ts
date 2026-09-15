import { z } from 'zod';

export const createIndustryTemplateSchema = z.object({
  name: z
    .string()
    .min(2, 'Template name must be at least 2 characters')
    .max(100, 'Template name cannot exceed 100 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  frameworkVersionId: z.string().min(1, 'Framework version is required'),
  competencyIds: z.array(z.string()).default([]),
});

export const updateIndustryTemplateSchema = z.object({
  name: z
    .string()
    .min(2, 'Template name must be at least 2 characters')
    .max(100, 'Template name cannot exceed 100 characters')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
});

export const addTemplateCompetencySchema = z.object({
  industryTemplateId: z.string().min(1, 'Industry template ID is required'),
  frameworkCompetencyId: z.string().min(1, 'Framework competency ID is required'),
});

export const templateRequirementInputSchema = z.object({
  frameworkCompetencyId: z.string().min(1, 'Framework competency ID is required'),
  targetLevel: z.number().int().positive('Target level must be a positive integer'),
});

export const createTemplateRoleProfileSchema = z.object({
  industryTemplateId: z.string().min(1, 'Industry template ID is required'),
  name: z
    .string()
    .min(2, 'Role profile name must be at least 2 characters')
    .max(100, 'Role profile name cannot exceed 100 characters')
    .transform((val) => val.trim()),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  requirements: z.array(templateRequirementInputSchema).default([]),
});

export const updateTemplateRoleProfileSchema = z.object({
  name: z
    .string()
    .min(2, 'Role profile name must be at least 2 characters')
    .max(100, 'Role profile name cannot exceed 100 characters')
    .optional()
    .transform((val) => (val ? val.trim() : undefined)),
  description: z
    .string()
    .max(500, 'Description cannot exceed 500 characters')
    .optional()
    .transform((val) => (val?.trim() ? val.trim() : undefined)),
  requirements: z.array(templateRequirementInputSchema).optional(),
});

export type CreateIndustryTemplateInput = z.infer<typeof createIndustryTemplateSchema>;
export type UpdateIndustryTemplateInput = z.infer<typeof updateIndustryTemplateSchema>;
export type CreateTemplateRoleProfileInput = z.infer<typeof createTemplateRoleProfileSchema>;
export type UpdateTemplateRoleProfileInput = z.infer<typeof updateTemplateRoleProfileSchema>;
