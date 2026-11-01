import { z } from 'zod';

export const checkoutSchema = z.object({
  idDeliveryAddress: z.number().int().positive('Delivery address is required'),
  couponCode: z
    .string()
    .trim()
    .toUpperCase()
    .optional()
    .nullable()
    .transform((val) => (val && val.length > 0 ? val : null)),
});

export const advanceOrderStatusSchema = z.object({
  status: z.enum(['IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'CANCELLED'], {
    message: 'Allowed statuses: IN_PREPARATION, DISPATCHED, DELIVERED, CANCELLED',
  }),
  reason: z.string().max(255, 'Reason cannot exceed 255 characters').optional(),
});

export const processReturnSchema = z.object({
  idOrderItem: z.number().int().positive('Order item ID is required'),
  quantity: z.number().int().positive('Quantity to return must be at least 1'),
  reason: z.string().min(3, 'Reason must be at least 3 characters').max(255, 'Reason cannot exceed 255 characters').trim(),
});

export const orderQuerySchema = z.object({
  status: z
    .enum(['PAID', 'IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'CANCELLED', 'PARTIALLY_RETURNED', 'FULLY_RETURNED'])
    .optional(),
  startDate: z.string().datetime({ message: 'StartDate must be an ISO 8601 string' }).optional(),
  endDate: z.string().datetime({ message: 'EndDate must be an ISO 8601 string' }).optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CheckoutDto = z.infer<typeof checkoutSchema>;
export type AdvanceOrderStatusDto = z.infer<typeof advanceOrderStatusSchema>;
export type ProcessReturnDto = z.infer<typeof processReturnSchema>;
export type OrderQueryDto = z.infer<typeof orderQuerySchema>;
