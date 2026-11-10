import { describe, expect, it } from 'vitest';
import {
  calculateDiscountPreview,
  formatCouponStatusMessage,
} from '../types/coupon.types.js';

describe('RF-05 Coupon Domain & Calculation Logic', () => {
  describe('calculateDiscountPreview', () => {
    it('should correctly calculate percentage discounts', () => {
      const discount10 = calculateDiscountPreview('PERCENTAGE', 10, 500);
      expect(discount10).toBe(50);

      const discount25 = calculateDiscountPreview('PERCENTAGE', 25, 400);
      expect(discount25).toBe(100);
    });

    it('should cap percentage discount at the total subtotal (100%)', () => {
      const discount100 = calculateDiscountPreview('PERCENTAGE', 100, 250);
      expect(discount100).toBe(250);
    });

    it('should correctly calculate fixed amount discounts', () => {
      const fixed50 = calculateDiscountPreview('FIXED_AMOUNT', 50, 300);
      expect(fixed50).toBe(50);
    });

    it('should cap fixed amount discount so it does not exceed subtotal', () => {
      const fixedExcess = calculateDiscountPreview('FIXED_AMOUNT', 150, 100);
      expect(fixedExcess).toBe(100);
    });

    it('should return 0 when subtotal or discount value is zero or negative', () => {
      expect(calculateDiscountPreview('PERCENTAGE', 0, 500)).toBe(0);
      expect(calculateDiscountPreview('PERCENTAGE', 10, 0)).toBe(0);
      expect(calculateDiscountPreview('FIXED_AMOUNT', -10, 500)).toBe(0);
      expect(calculateDiscountPreview('FIXED_AMOUNT', 50, -100)).toBe(0);
    });
  });

  describe('formatCouponStatusMessage', () => {
    it('should return valid message and isValid=true for VALID status', () => {
      const status = formatCouponStatusMessage('VALID');
      expect(status.isValid).toBe(true);
      expect(status.message).toContain('exitosamente');
    });

    it('should return descriptive error for COUPON_NOT_FOUND', () => {
      const status = formatCouponStatusMessage('COUPON_NOT_FOUND');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('no existe');
    });

    it('should include the minimum purchase amount for MIN_AMOUNT_NOT_MET', () => {
      const status = formatCouponStatusMessage('MIN_AMOUNT_NOT_MET', 300);
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('Q300.00');
    });

    it('should return descriptive error for EXPIRED', () => {
      const status = formatCouponStatusMessage('EXPIRED');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('expirado');
    });

    it('should return descriptive error for INACTIVE', () => {
      const status = formatCouponStatusMessage('INACTIVE');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('inactivo');
    });

    it('should return descriptive error for MAX_USES_REACHED', () => {
      const status = formatCouponStatusMessage('MAX_USES_REACHED');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('límite máximo global');
    });

    it('should return descriptive error for MAX_CLIENT_USES_REACHED', () => {
      const status = formatCouponStatusMessage('MAX_CLIENT_USES_REACHED');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('con tu cuenta');
    });

    it('should handle fallback for unknown status codes', () => {
      const status = formatCouponStatusMessage('CUSTOM_ERROR_CODE');
      expect(status.isValid).toBe(false);
      expect(status.message).toContain('CUSTOM_ERROR_CODE');
    });
  });
});
