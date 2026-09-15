import { z } from 'zod';
import { CampaignStatus, CampaignScope } from '@prisma/client';

export const createCampaignSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Campaign name is required')
      .max(100, 'Campaign name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .or(z.literal('')),
    deadline: z.coerce.date({
      message: 'Please enter a valid date for the deadline',
    }),
    requiresCorroboration: z.boolean().default(false),
    roleProfileId: z
      .string()
      .min(1)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => (val && val.trim() !== '' ? val : null)),
    competencyIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
    scope: z.nativeEnum(CampaignScope).default(CampaignScope.INDIVIDUAL),
    teamIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
    participantIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
    status: z.nativeEnum(CampaignStatus).default(CampaignStatus.DRAFT),
  })
  .refine(
    (data) => {
      if (data.status === CampaignStatus.ACTIVE) {
        return data.competencyIds.length > 0;
      }
      return true;
    },
    {
      message: 'Launching an active campaign requires at least one competency.',
      path: ['competencyIds'],
    }
  )
  .refine(
    (data) => {
      if (data.status === CampaignStatus.ACTIVE && data.scope === CampaignScope.INDIVIDUAL) {
        return data.participantIds.length > 0;
      }
      return true;
    },
    {
      message: 'Launching an active campaign with individual scope requires at least one staff participant.',
      path: ['participantIds'],
    }
  )
  .refine(
    (data) => {
      if (data.status === CampaignStatus.ACTIVE && data.scope === CampaignScope.TEAM) {
        return data.teamIds.length > 0;
      }
      return true;
    },
    {
      message: 'Launching a team-scoped campaign requires selecting at least one team.',
      path: ['teamIds'],
    }
  )
  .refine(
    (data) => {
      if (data.status === CampaignStatus.ACTIVE) {
        return data.deadline.getTime() > Date.now();
      }
      return true;
    },
    {
      message: 'The campaign deadline must be in the future.',
      path: ['deadline'],
    }
  );

export type CreateCampaignInput = z.input<typeof createCampaignSchema>;
export type CreateCampaignOutput = z.output<typeof createCampaignSchema>;

export const updateCampaignDraftSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, 'Campaign name is required')
      .max(100, 'Campaign name cannot exceed 100 characters'),
    description: z
      .string()
      .trim()
      .max(500, 'Description cannot exceed 500 characters')
      .optional()
      .or(z.literal('')),
    deadline: z.coerce.date({
      message: 'Please enter a valid date for the deadline',
    }),
    requiresCorroboration: z.boolean().default(false),
    roleProfileId: z
      .string()
      .min(1)
      .optional()
      .nullable()
      .or(z.literal(''))
      .transform((val) => (val && val.trim() !== '' ? val : null)),
    competencyIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
    scope: z.nativeEnum(CampaignScope).default(CampaignScope.INDIVIDUAL),
    teamIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
    participantIds: z
      .array(z.string().min(1))
      .default([])
      .transform((ids) => Array.from(new Set(ids))),
  });

export type UpdateCampaignDraftInput = z.input<typeof updateCampaignDraftSchema>;
export type UpdateCampaignDraftOutput = z.output<typeof updateCampaignDraftSchema>;
