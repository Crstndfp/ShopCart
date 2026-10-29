import { z } from 'zod';

export const registerSchema = z.object({
    fullName: z.string().min(3, 'Full name must have at least 3 characters'),
    email: z.string().email('Invalid email address format'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters long')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number')
        .regex(/[^a-zA-Z0-9]/, 'Password must contain at least one special character'),
    phoneNumber: z.string().optional(),
});

export type RegisterDto = z.infer<typeof registerSchema>;