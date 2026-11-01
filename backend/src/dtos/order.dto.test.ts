import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  checkoutSchema,
  advanceOrderStatusSchema,
  processReturnSchema,
  orderQuerySchema,
} from './order.dto.js';

describe('Order DTOs', () => {
  describe('checkoutSchema', () => {
    it('should validate valid checkout input', () => {
      const input = {
        idDeliveryAddress: 10,
        couponCode: 'descuento10',
      };
      const parsed = checkoutSchema.parse(input);
      assert.equal(parsed.idDeliveryAddress, 10);
      assert.equal(parsed.couponCode, 'DESCUENTO10');
    });

    it('should accept null couponCode', () => {
      const input = {
        idDeliveryAddress: 5,
        couponCode: null,
      };
      const parsed = checkoutSchema.parse(input);
      assert.equal(parsed.idDeliveryAddress, 5);
      assert.equal(parsed.couponCode, null);
    });

    it('should reject invalid address id', () => {
      assert.throws(() => {
        checkoutSchema.parse({ idDeliveryAddress: -1 });
      });
    });
  });

  describe('advanceOrderStatusSchema', () => {
    it('should accept valid order statuses', () => {
      const statuses = ['IN_PREPARATION', 'DISPATCHED', 'DELIVERED', 'CANCELLED'] as const;
      for (const status of statuses) {
        const parsed = advanceOrderStatusSchema.parse({ status, reason: 'Testing' });
        assert.equal(parsed.status, status);
      }
    });

    it('should reject unpermitted status transition', () => {
      assert.throws(() => {
        advanceOrderStatusSchema.parse({ status: 'INVALID_STATUS' });
      });
    });
  });

  describe('processReturnSchema', () => {
    it('should validate return item request', () => {
      const parsed = processReturnSchema.parse({
        idOrderItem: 25,
        quantity: 2,
        reason: 'Item arrived damaged in transport',
      });
      assert.equal(parsed.idOrderItem, 25);
      assert.equal(parsed.quantity, 2);
      assert.equal(parsed.reason, 'Item arrived damaged in transport');
    });

    it('should reject negative or zero return quantity', () => {
      assert.throws(() => {
        processReturnSchema.parse({
          idOrderItem: 1,
          quantity: 0,
          reason: 'Defective product',
        });
      });
    });
  });

  describe('orderQuerySchema', () => {
    it('should parse pagination and status query params', () => {
      const parsed = orderQuerySchema.parse({
        status: 'PAID',
        page: '2',
        limit: '10',
      });
      assert.equal(parsed.status, 'PAID');
      assert.equal(parsed.page, 2);
      assert.equal(parsed.limit, 10);
    });
  });
});
