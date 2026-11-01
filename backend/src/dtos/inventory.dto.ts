import { z } from 'zod';

export const adjustStockSchema = z.object({
  idVariant: z.number().int().positive('Product variant ID is required'),
  quantityChange: z.number().int().refine((val) => val !== 0, {
    message: 'Adjustment quantity cannot be zero',
  }),
  reason: z.string().min(5, 'Reason must be at least 5 characters long').max(255, 'Reason cannot exceed 255 characters').trim(),
});

export const kardexQuerySchema = z.object({
  idVariant: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  movementType: z
    .enum(['INITIAL_CHARGE', 'SALE_EXIT', 'CLIENT_RETURN', 'POSITIVE_ADJUSTMENT', 'NEGATIVE_ADJUSTMENT'])
    .optional(),
  startDate: z.string().datetime({ message: 'StartDate must be an ISO 8601 string' }).optional(),
  endDate: z.string().datetime({ message: 'EndDate must be an ISO 8601 string' }).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
});

export const stockQuerySchema = z.object({
  idCategory: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : undefined)),
  search: z.string().optional(),
  lowStockOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 20)),
});

export type AdjustStockDto = z.infer<typeof adjustStockSchema>;
export type KardexQueryDto = z.infer<typeof kardexQuerySchema>;
export type StockQueryDto = z.infer<typeof stockQuerySchema>;
