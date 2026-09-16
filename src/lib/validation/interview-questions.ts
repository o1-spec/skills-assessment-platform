import { z } from 'zod';

export const interviewQuestionInputSchema = z.object({
  id: z.string().optional(),
  question: z
    .string()
    .trim()
    .min(5, 'Question text must be at least 5 characters')
    .max(1000, 'Question text cannot exceed 1000 characters'),
  followUp: z
    .string()
    .trim()
    .max(1000, 'Follow-up probe cannot exceed 1000 characters')
    .optional()
    .nullable()
    .or(z.literal('')),
  competencyId: z.string().nullable().optional(),
  targetLevel: z.number().int().min(1).max(10).nullable().optional(),
  orderIndex: z.number().int().min(0).default(0),
});

export const generateInterviewQuestionsSchema = z.object({
  roleProfileId: z.string().min(1, 'Role profile ID is required'),
});

export const saveInterviewQuestionSetSchema = z.object({
  roleProfileId: z.string().min(1, 'Role profile ID is required'),
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  questions: z
    .array(interviewQuestionInputSchema)
    .min(1, 'At least one interview question is required'),
});

export const updateInterviewQuestionSetSchema = z.object({
  title: z
    .string()
    .trim()
    .min(2, 'Title must be at least 2 characters')
    .max(150, 'Title cannot exceed 150 characters'),
  questions: z
    .array(interviewQuestionInputSchema)
    .min(1, 'At least one interview question is required'),
});

export type InterviewQuestionInput = z.infer<typeof interviewQuestionInputSchema>;
export type SaveInterviewQuestionSetInput = z.infer<typeof saveInterviewQuestionSetSchema>;
export type UpdateInterviewQuestionSetInput = z.infer<typeof updateInterviewQuestionSetSchema>;
