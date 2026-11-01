import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { salesSummaryQuerySchema, topProductsQuerySchema } from './report.dto.js';

describe('Report DTOs', () => {
  describe('salesSummaryQuerySchema', () => {
    it('should accept optional date range', () => {
      const parsed = salesSummaryQuerySchema.parse({
        startDate: '2026-10-01',
        endDate: '2026-10-31',
      });
      assert.equal(parsed.startDate, '2026-10-01');
      assert.equal(parsed.endDate, '2026-10-31');
    });
  });

  describe('topProductsQuerySchema', () => {
    it('should default limit to 10 if omitted', () => {
      const parsed = topProductsQuerySchema.parse({});
      assert.equal(parsed.limit, 10);
    });

    it('should parse custom limit string to integer', () => {
      const parsed = topProductsQuerySchema.parse({ limit: '5' });
      assert.equal(parsed.limit, 5);
    });
  });
});
