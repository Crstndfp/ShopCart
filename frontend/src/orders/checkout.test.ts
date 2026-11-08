import { describe, expect, it } from 'vitest';
import { formatAddressSummary } from '../types/address.types.js';
import {
  getOrderStatusMeta,
  ORDER_STATUS_META,
  parseShippingAddressSnapshot,
} from '../types/order.types.js';

describe('RF-06 Checkout, Addresses & Order Domain Logic', () => {
  describe('formatAddressSummary', () => {
    it('should format full address with line 1 and line 2 correctly', () => {
      const summary = formatAddressSummary({
        addressLine1: '12 Calle 5-43 Zona 10',
        addressLine2: 'Edificio Reforma 10, Nivel 4',
        municipality: 'Guatemala',
        department: 'Guatemala',
      });

      expect(summary).toBe(
        '12 Calle 5-43 Zona 10 · Edificio Reforma 10, Nivel 4 · Guatemala, Guatemala'
      );
    });

    it('should omit null or empty addressLine2 cleanly without double separators', () => {
      const summary = formatAddressSummary({
        addressLine1: '5ta Avenida 3-12 Zona 1',
        addressLine2: null,
        municipality: 'Mixco',
        department: 'Guatemala',
      });

      expect(summary).toBe('5ta Avenida 3-12 Zona 1 · Mixco, Guatemala');
    });
  });

  describe('getOrderStatusMeta', () => {
    it('should return configured metadata for all standard operational order statuses', () => {
      const paid = getOrderStatusMeta('PAID');
      expect(paid.label).toBe('Pagado / Confirmado');
      expect(paid.badgeClass).toContain('emerald');

      const prep = getOrderStatusMeta('IN_PREPARATION');
      expect(prep.label).toBe('En Preparación');
      expect(prep.badgeClass).toContain('amber');

      const dispatched = getOrderStatusMeta('DISPATCHED');
      expect(dispatched.label).toBe('Despachado en Ruta');
      expect(dispatched.badgeClass).toContain('sky');

      const delivered = getOrderStatusMeta('DELIVERED');
      expect(delivered.label).toBe('Entregado al Cliente');
      expect(delivered.badgeClass).toContain('teal');

      const cancelled = getOrderStatusMeta('CANCELLED');
      expect(cancelled.label).toBe('Cancelado');
      expect(cancelled.badgeClass).toContain('crimson');
    });

    it('should provide neutral fallback for unknown status', () => {
      const unknown = getOrderStatusMeta('CUSTOM_STATUS_TEST');
      expect(unknown.label).toBe('CUSTOM_STATUS_TEST');
      expect(unknown.badgeClass).toContain('slate');
    });

    it('should have all key lifecycle statuses defined in ORDER_STATUS_META', () => {
      const expected = [
        'PAID',
        'IN_PREPARATION',
        'DISPATCHED',
        'DELIVERED',
        'CANCELLED',
        'PARTIALLY_RETURNED',
        'FULLY_RETURNED',
      ];
      for (const status of expected) {
        expect(ORDER_STATUS_META[status]).toBeDefined();
      }
    });
  });

  describe('parseShippingAddressSnapshot', () => {
    it('should successfully parse valid JSON address snapshot', () => {
      const rawJson = JSON.stringify({
        RecipientName: 'Carlos Flores',
        AddressLine1: 'Km 14.5 Carretera a El Salvador',
        Municipality: 'Santa Catarina Pinula',
        Department: 'Guatemala',
      });

      const parsed = parseShippingAddressSnapshot(rawJson);
      expect(parsed).not.toBeNull();
      expect(parsed?.RecipientName).toBe('Carlos Flores');
      expect(parsed?.Municipality).toBe('Santa Catarina Pinula');
    });

    it('should return null safely without throwing on malformed JSON', () => {
      expect(parseShippingAddressSnapshot('{malformed_json')).toBeNull();
      expect(parseShippingAddressSnapshot('')).toBeNull();
    });
  });
});
