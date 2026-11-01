import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createCouponSchema,
  updateCouponSchema,
  validateCouponSchema,
} from './coupon.dto.js';

describe('Coupon DTOs', () => {
  describe('createCouponSchema', () => {
    it('should validate valid percentage coupon', () => {
      const input = {
        code: 'blackfriday',
        discountType: 'PERCENTAGE',
        discountValue: 20,
        minPurchaseAmount: 100,
        startDate: '2026-11-01T00:00:00Z',
        endDate: '2026-11-30T23:59:59Z',
        maxTotalUses: 500,
        maxUsesPerClient: 1,
      };
      const parsed = createCouponSchema.parse(input);
      assert.equal(parsed.code, 'BLACKFRIDAY');
      assert.equal(parsed.discountValue, 20);
    });

    it('should reject percentage coupon greater than 100%', () => {
      assert.throws(() => {
        createCouponSchema.parse({
          code: 'SUPERDISCOUNT',
          discountType: 'PERCENTAGE',
          discountValue: 120,
          startDate: '2026-11-01T00:00:00Z',
          endDate: '2026-11-30T23:59:59Z',
          maxTotalUses: 100,
        });
      });
    });

    it('should reject when endDate is before startDate', () => {
      assert.throws(() => {
        createCouponSchema.parse({
          code: 'BACKWARDS',
          discountType: 'FIXED_AMOUNT',
          discountValue: 50,
          startDate: '2026-12-01T00:00:00Z',
          endDate: '2026-11-01T00:00:00Z',
          maxTotalUses: 100,
        });
      });
    });
  });

  describe('validateCouponSchema', () => {
    it('should parse valid coupon code and eligible subtotal', () => {
      const parsed = validateCouponSchema.parse({
        code: 'WELCOME10',
        eligibleSubtotal: 250.75,
      });
      assert.equal(parsed.code, 'WELCOME10');
      assert.equal(parsed.eligibleSubtotal, 250.75);
    });
  });
});
