import { z } from 'zod';

export const auditQuerySchema = z.object({
  module: z.string().optional(),
  entityName: z.string().optional(),
  startDate: z.string().datetime({ message: 'StartDate must be an ISO 8601 string' }).optional(),
  endDate: z.string().datetime({ message: 'EndDate must be an ISO 8601 string' }).optional(),
  page: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((v) => (v ? parseInt(v, 10) : 50)),
});

export type AuditQueryDto = z.infer<typeof auditQuerySchema>;
