import { z } from 'zod';

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3, 'Code must be at least 3 characters long')
      .max(50, 'Code cannot exceed 50 characters')
      .toUpperCase()
      .trim(),
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().positive('Discount value must be greater than 0'),
    minPurchaseAmount: z.number().nonnegative('Minimum purchase amount cannot be negative').default(0),
    startDate: z.string().datetime({ message: 'StartDate must be an ISO 8601 string' }),
    endDate: z.string().datetime({ message: 'EndDate must be an ISO 8601 string' }),
    maxTotalUses: z.number().int().positive('MaxTotalUses must be at least 1'),
    maxUsesPerClient: z.number().int().positive('MaxUsesPerClient must be at least 1').default(1),
    idCategory: z.number().int().positive().nullable().optional(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'EndDate must be after StartDate',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  );

export const updateCouponSchema = z
  .object({
    discountType: z.enum(['PERCENTAGE', 'FIXED_AMOUNT']),
    discountValue: z.number().positive('Discount value must be greater than 0'),
    minPurchaseAmount: z.number().nonnegative('Minimum purchase amount cannot be negative').default(0),
    startDate: z.string().datetime({ message: 'StartDate must be an ISO 8601 string' }),
    endDate: z.string().datetime({ message: 'EndDate must be an ISO 8601 string' }),
    maxTotalUses: z.number().int().positive('MaxTotalUses must be at least 1'),
    maxUsesPerClient: z.number().int().positive('MaxUsesPerClient must be at least 1').default(1),
    idCategory: z.number().int().positive().nullable().optional(),
    isActive: z.boolean(),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'EndDate must be after StartDate',
    path: ['endDate'],
  })
  .refine(
    (data) => {
      if (data.discountType === 'PERCENTAGE' && data.discountValue > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount cannot exceed 100%',
      path: ['discountValue'],
    }
  );

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required').trim(),
  eligibleSubtotal: z.number().positive('Eligible subtotal must be greater than 0'),
});

export const couponQuerySchema = z.object({
  onlyActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1)),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20)),
});

export type CreateCouponDto = z.infer<typeof createCouponSchema>;
export type UpdateCouponDto = z.infer<typeof updateCouponSchema>;
export type ValidateCouponDto = z.infer<typeof validateCouponSchema>;
export type CouponQueryDto = z.infer<typeof couponQuerySchema>;
