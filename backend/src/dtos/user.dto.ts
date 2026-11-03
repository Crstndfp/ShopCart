import { z } from 'zod';

export const createUserAdminSchema = z.object({
  fullName: z.string().min(3, 'Full name must have at least 3 characters'),
  email: z.string().email('Invalid email address format'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters long')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
  roleCode: z.enum(['ADMINISTRATOR', 'OPERATOR', 'CLIENT'], {
    message: "Role must be one of: 'ADMINISTRATOR', 'OPERATOR', 'CLIENT'",
  }),
  phoneNumber: z.string().optional(),
});

export type CreateUserAdminDto = z.infer<typeof createUserAdminSchema>;

export const updateUserRoleSchema = z.object({
  roleCode: z.enum(['ADMINISTRATOR', 'OPERATOR', 'CLIENT'], {
    message: "Role must be one of: 'ADMINISTRATOR', 'OPERATOR', 'CLIENT'",
  }),
});

export type UpdateUserRoleDto = z.infer<typeof updateUserRoleSchema>;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ message: 'isActive boolean flag is required' }),
  reason: z.string().min(3, 'Reason must be at least 3 characters long').optional(),
});

export type UpdateUserStatusDto = z.infer<typeof updateUserStatusSchema>;

export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(['ADMINISTRATOR', 'OPERATOR', 'CLIENT']).optional(),
  q: z.string().optional(),
  isActive: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === '') return undefined;
      return val === 'true' || val === '1';
    }),
});

export type UserQueryDto = z.infer<typeof userQuerySchema>;
