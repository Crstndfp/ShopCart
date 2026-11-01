import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { adjustStockSchema, kardexQuerySchema, stockQuerySchema } from './inventory.dto.js';

describe('Inventory DTOs', () => {
  describe('adjustStockSchema', () => {
    it('should validate positive stock adjustment with valid reason', () => {
      const parsed = adjustStockSchema.parse({
        idVariant: 1,
        quantityChange: 15,
        reason: 'Restocking arrived from supplier shipment #994',
      });
      assert.equal(parsed.idVariant, 1);
      assert.equal(parsed.quantityChange, 15);
    });

    it('should validate negative stock adjustment with valid reason', () => {
      const parsed = adjustStockSchema.parse({
        idVariant: 2,
        quantityChange: -3,
        reason: 'Damaged packaging during warehouse movement',
      });
      assert.equal(parsed.idVariant, 2);
      assert.equal(parsed.quantityChange, -3);
    });

    it('should reject quantityChange = 0', () => {
      assert.throws(() => {
        adjustStockSchema.parse({
          idVariant: 1,
          quantityChange: 0,
          reason: 'No change adjustment',
        });
      });
    });

    it('should reject short or empty reason', () => {
      assert.throws(() => {
        adjustStockSchema.parse({
          idVariant: 1,
          quantityChange: 5,
          reason: 'abc',
        });
      });
    });
  });

  describe('kardexQuerySchema', () => {
    it('should parse optional filters and pagination', () => {
      const parsed = kardexQuerySchema.parse({
        idVariant: '4',
        movementType: 'SALE_EXIT',
        page: '1',
        limit: '25',
      });
      assert.equal(parsed.idVariant, 4);
      assert.equal(parsed.movementType, 'SALE_EXIT');
      assert.equal(parsed.limit, 25);
    });
  });

  describe('stockQuerySchema', () => {
    it('should transform lowStockOnly boolean flag', () => {
      const parsed = stockQuerySchema.parse({
        lowStockOnly: 'true',
      });
      assert.equal(parsed.lowStockOnly, true);
    });
  });
});
