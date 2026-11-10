import { describe, expect, it } from 'vitest';
import {
  calculateProjectedStock,
  formatStockStatus,
  getKardexMeta,
  KARDEX_MOVEMENT_META,
} from '../types/inventory.types.js';

describe('Inventory Domain & Kardex Logic', () => {
  describe('calculateProjectedStock', () => {
    it('should correctly calculate positive stock addition', () => {
      const result = calculateProjectedStock(20, 10);
      expect(result).toBe(30);
    });

    it('should correctly calculate negative stock adjustment (reduction)', () => {
      const result = calculateProjectedStock(25, -5);
      expect(result).toBe(20);
    });

    it('should reflect negative projected stock when reduction exceeds physical stock', () => {
      const result = calculateProjectedStock(5, -10);
      expect(result).toBe(-5);
      expect(result < 0).toBe(true);
    });

    it('should handle zero change without modifying original balance', () => {
      const result = calculateProjectedStock(15, 0);
      expect(result).toBe(15);
    });
  });

  describe('formatStockStatus', () => {
    it('should mark zero or negative stock as Agotado', () => {
      const statusZero = formatStockStatus(0);
      expect(statusZero.label).toBe('Agotado');
      expect(statusZero.isLow).toBe(true);
      expect(statusZero.colorClass).toContain('crimson');

      const statusNegative = formatStockStatus(-2);
      expect(statusNegative.label).toBe('Agotado');
      expect(statusNegative.isLow).toBe(true);
    });

    it('should mark stock between 1 and 5 as Stock Crítico', () => {
      const statusCritical1 = formatStockStatus(1);
      expect(statusCritical1.label).toBe('Stock Crítico');
      expect(statusCritical1.isLow).toBe(true);
      expect(statusCritical1.colorClass).toContain('crimson');

      const statusCritical5 = formatStockStatus(5);
      expect(statusCritical5.label).toBe('Stock Crítico');
      expect(statusCritical5.isLow).toBe(true);
    });

    it('should mark stock greater than 5 as Saludable', () => {
      const statusHealthy = formatStockStatus(6);
      expect(statusHealthy.label).toBe('Saludable');
      expect(statusHealthy.isLow).toBe(false);
      expect(statusHealthy.colorClass).toContain('emerald');

      const statusAbundant = formatStockStatus(100);
      expect(statusAbundant.label).toBe('Saludable');
      expect(statusAbundant.isLow).toBe(false);
    });
  });

  describe('getKardexMeta', () => {
    it('should return configured metadata for known movement types', () => {
      const purchase = getKardexMeta('PURCHASE_ENTRY');
      expect(purchase.label).toBe('Entrada por Compra');
      expect(purchase.isPositive).toBe(true);
      expect(purchase.prefix).toBe('+');
      expect(purchase.badgeClass).toContain('emerald');

      const sale = getKardexMeta('SALE_EXIT');
      expect(sale.label).toBe('Salida por Venta');
      expect(sale.isPositive).toBe(false);
      expect(sale.prefix).toBe('-');
      expect(sale.badgeClass).toContain('crimson');

      const clientReturn = getKardexMeta('CLIENT_RETURN');
      expect(clientReturn.label).toBe('Devolución de Cliente');
      expect(clientReturn.isPositive).toBe(true);
      expect(clientReturn.prefix).toBe('+');

      const negAdjustment = getKardexMeta('NEGATIVE_ADJUSTMENT');
      expect(negAdjustment.label).toBe('Merma / Ajuste (-)');
      expect(negAdjustment.isPositive).toBe(false);
      expect(negAdjustment.prefix).toBe('-');
    });

    it('should return fallback metadata for unknown movement types', () => {
      const unknown = getKardexMeta('UNKNOWN_MOVEMENT_XYZ');
      expect(unknown.label).toBe('UNKNOWN_MOVEMENT_XYZ');
      expect(unknown.isPositive).toBe(false);
      expect(unknown.badgeClass).toContain('slate');
    });

    it('should define all key transactional movement types', () => {
      const expectedKeys = [
        'INITIAL_CHARGE',
        'PURCHASE_ENTRY',
        'POSITIVE_ADJUSTMENT',
        'SALE_EXIT',
        'NEGATIVE_ADJUSTMENT',
        'CLIENT_RETURN',
      ];
      for (const key of expectedKeys) {
        expect(KARDEX_MOVEMENT_META[key]).toBeDefined();
      }
    });
  });
});
