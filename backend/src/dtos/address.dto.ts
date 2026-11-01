import { z } from 'zod';

export const createAddressSchema = z.object({
  alias: z.string().min(2, 'Alias must be at least 2 characters').max(50, 'Alias cannot exceed 50 characters').trim(),
  recipientName: z.string().min(3, 'Recipient name must be at least 3 characters').max(150, 'Recipient name cannot exceed 150 characters').trim(),
  addressLine1: z.string().min(5, 'Address line 1 must be at least 5 characters').max(200, 'Address line 1 cannot exceed 200 characters').trim(),
  addressLine2: z.string().max(200, 'Address line 2 cannot exceed 200 characters').optional().nullable(),
  municipality: z.string().min(2, 'Municipality must be at least 2 characters').max(100, 'Municipality cannot exceed 100 characters').trim(),
  department: z.string().min(2, 'Department must be at least 2 characters').max(100, 'Department cannot exceed 100 characters').trim(),
  postalCode: z.string().max(20, 'Postal code cannot exceed 20 characters').optional().nullable(),
  contactPhone: z.string().min(8, 'Contact phone must have at least 8 digits').max(30, 'Contact phone cannot exceed 30 characters').trim(),
});

export type CreateAddressDto = z.infer<typeof createAddressSchema>;
