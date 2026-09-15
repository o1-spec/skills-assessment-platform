import { z } from 'zod';

export const assessmentDraftItemSchema = z.object({
  assessmentItemId: z.string().min(1, 'Assessment item ID is required'),
  selfRating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1')
    .nullable()
    .optional()
    .transform((val) => (val === undefined ? null : val)),
  evidenceText: z
    .string()
    .max(5000, 'Evidence cannot exceed 5,000 characters')
    .nullable()
    .optional()
    .transform((val) => (val === undefined || val === '' ? null : val)),
});

export const saveAssessmentDraftSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  items: z
    .array(assessmentDraftItemSchema)
    .default([])
    .refine(
      (items) => {
        const ids = items.map((i) => i.assessmentItemId);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'Duplicate assessment item IDs provided.',
      }
    ),
});

export const assessmentSubmitItemSchema = z.object({
  assessmentItemId: z.string().min(1, 'Assessment item ID is required'),
  selfRating: z
    .number()
    .int('Rating must be an integer')
    .min(1, 'Rating must be at least 1'),
  evidenceText: z
    .string()
    .max(5000, 'Evidence cannot exceed 5,000 characters')
    .nullable()
    .optional()
    .transform((val) => (val === undefined || val === '' ? null : val)),
});

export const submitAssessmentSchema = z.object({
  assessmentId: z.string().min(1, 'Assessment ID is required'),
  items: z
    .array(assessmentSubmitItemSchema)
    .min(1, 'At least one competency rating is required for submission.')
    .refine(
      (items) => {
        const ids = items.map((i) => i.assessmentItemId);
        return new Set(ids).size === ids.length;
      },
      {
        message: 'Duplicate assessment item IDs provided.',
      }
    ),
});

export type AssessmentDraftItemInput = z.infer<typeof assessmentDraftItemSchema>;
export type SaveAssessmentDraftInput = z.infer<typeof saveAssessmentDraftSchema>;
export type AssessmentSubmitItemInput = z.infer<typeof assessmentSubmitItemSchema>;
export type SubmitAssessmentInput = z.infer<typeof submitAssessmentSchema>;
