import { z } from 'zod';

export const salesSummaryQuerySchema = z.object({
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const topProductsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 10)),
});

export type SalesSummaryQueryDto = z.infer<typeof salesSummaryQuerySchema>;
export type TopProductsQueryDto = z.infer<typeof topProductsQuerySchema>;
