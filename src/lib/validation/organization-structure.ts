import { z } from 'zod';

export const createDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').trim(),
  description: z.string().max(500, 'Description must be at most 500 characters').trim().optional(),
});

export const updateDepartmentSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  description: z.string().max(500).trim().optional().nullable(),
});

export const createTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name must be at most 100 characters').trim(),
  description: z.string().max(500).trim().optional(),
  departmentId: z.string().cuid().optional().nullable(),
  managerId: z.string().cuid().optional().nullable(),
});

export const updateTeamSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100).trim().optional(),
  description: z.string().max(500).trim().optional().nullable(),
  departmentId: z.string().cuid().optional().nullable(),
  managerId: z.string().cuid().optional().nullable(),
});

export const updateUserTeamMembershipsSchema = z.object({
  teamIds: z.array(z.string().cuid()).max(50, 'Too many teams selected'),
});

export const csvRowInputSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  role: z.enum(['STAFF', 'MANAGER', 'ORGANIZATION_ADMIN']),
  manager_email: z.string().email().optional().nullable(),
  role_profile_name: z.string().optional().nullable(),
  team_name: z.string().optional().nullable(),
});

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof updateDepartmentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;
export type UpdateTeamInput = z.infer<typeof updateTeamSchema>;
export type UpdateUserTeamMembershipsInput = z.infer<typeof updateUserTeamMembershipsSchema>;
export type CsvRowInput = z.infer<typeof csvRowInputSchema>;
