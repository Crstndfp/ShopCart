import { describe, expect, it } from 'vitest';
import {
  getAvailableReturnQuantity,
  getOrderProgressStep,
  getOrderStatusMeta,
  parseShippingAddressSnapshot,
} from '../types/order.types.js';

describe('RF-07 Orders Tracking, Operational Transitions & Returns Domain Logic', () => {
  describe('getOrderProgressStep', () => {
    it('should map standard sequential statuses to correct 1-based tracking steps', () => {
      expect(getOrderProgressStep('PAID')).toBe(1);
      expect(getOrderProgressStep('IN_PREPARATION')).toBe(2);
      expect(getOrderProgressStep('DISPATCHED')).toBe(3);
      expect(getOrderProgressStep('DELIVERED')).toBe(4);
    });

    it('should treat return statuses as completed lifecycle step 4', () => {
      expect(getOrderProgressStep('PARTIALLY_RETURNED')).toBe(4);
      expect(getOrderProgressStep('FULLY_RETURNED')).toBe(4);
    });

    it('should map CANCELLED or invalid status to step 0', () => {
      expect(getOrderProgressStep('CANCELLED')).toBe(0);
      expect(getOrderProgressStep('UNKNOWN_STATE')).toBe(0);
      expect(getOrderProgressStep('')).toBe(0);
    });
  });

  describe('getAvailableReturnQuantity', () => {
    it('should calculate full quantity when no units have been returned', () => {
      const item = { QuantitySold: 5, QuantityReturned: 0 };
      expect(getAvailableReturnQuantity(item)).toBe(5);
    });

    it('should calculate remaining units after partial returns', () => {
      const item = { QuantitySold: 10, QuantityReturned: 3 };
      expect(getAvailableReturnQuantity(item)).toBe(7);
    });

    it('should return 0 when item has been fully returned', () => {
      const item = { QuantitySold: 4, QuantityReturned: 4 };
      expect(getAvailableReturnQuantity(item)).toBe(0);
    });

    it('should protect against negative values if returned exceeds sold due to legacy anomaly', () => {
      const item = { QuantitySold: 2, QuantityReturned: 5 };
      expect(getAvailableReturnQuantity(item)).toBe(0);
    });
  });

  describe('parseShippingAddressSnapshot', () => {
    it('should correctly parse valid serialized JSON snapshot of delivery address', () => {
      const snapshot = JSON.stringify({
        addressLine1: '4ta Avenida 12-23 Zona 14',
        addressLine2: 'Apto 502',
        municipality: 'Guatemala',
        department: 'Guatemala',
        recipientPhone: '55551234',
      });

      const parsed = parseShippingAddressSnapshot(snapshot);
      expect(parsed).not.toBeNull();
      expect(parsed?.addressLine1).toBe('4ta Avenida 12-23 Zona 14');
      expect(parsed?.municipality).toBe('Guatemala');
      expect(parsed?.recipientPhone).toBe('55551234');
    });

    it('should handle corrupt or invalid JSON gracefully by returning null', () => {
      expect(parseShippingAddressSnapshot('NOT_JSON_DATA{')).toBeNull();
      expect(parseShippingAddressSnapshot('')).toBeNull();
    });
  });

  describe('getOrderStatusMeta for returns', () => {
    it('should return orange warning styling for PARTIALLY_RETURNED', () => {
      const meta = getOrderStatusMeta('PARTIALLY_RETURNED');
      expect(meta.label).toBe('Devolución Parcial');
      expect(meta.badgeClass).toContain('orange');
    });

    it('should return red styling for FULLY_RETURNED', () => {
      const meta = getOrderStatusMeta('FULLY_RETURNED');
      expect(meta.label).toBe('Devolución Total');
      expect(meta.badgeClass).toContain('red');
    });
  });
});
