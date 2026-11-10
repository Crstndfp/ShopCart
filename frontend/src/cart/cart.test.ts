import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  calculateCartItemCount,
  formatCartItemAttributes,
  type CartItem,
} from '../types/cart.types.js';
import {
  clearStoredGuestToken,
  ensureGuestToken,
  getStoredGuestToken,
  GUEST_TOKEN_STORAGE_KEY,
} from '../api/http-client.js';
import { getNavItemsForRole } from '../types/auth.types.js';

describe('Cart Domain & Guest Session Logic', () => {
  const mockStorage = new Map<string, string>();

  beforeEach(() => {
    mockStorage.clear();
    vi.stubGlobal('window', {
      localStorage: {
        getItem: (key: string) => mockStorage.get(key) ?? null,
        setItem: (key: string, value: string) => mockStorage.set(key, value),
        removeItem: (key: string) => mockStorage.delete(key),
      },
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  describe('calculateCartItemCount', () => {
    it('should return 0 when cart has no items', () => {
      expect(calculateCartItemCount([])).toBe(0);
    });

    it('should correctly sum quantities across multiple cart items', () => {
      const mockItems: CartItem[] = [
        {
          IDCartItem: 1,
          IDVariant: 10,
          SKU: 'SKU-01',
          ProductName: 'Product 1',
          MainImageUrl: null,
          AttributesJson: null,
          UnitPrice: 100,
          Quantity: 2,
          LineTotal: 200,
          AvailableStock: 10,
        },
        {
          IDCartItem: 2,
          IDVariant: 20,
          SKU: 'SKU-02',
          ProductName: 'Product 2',
          MainImageUrl: null,
          AttributesJson: null,
          UnitPrice: 50,
          Quantity: 3,
          LineTotal: 150,
          AvailableStock: 5,
        },
      ];

      expect(calculateCartItemCount(mockItems)).toBe(5);
    });
  });

  describe('formatCartItemAttributes', () => {
    it('should format attribute dictionary into clean bullet-separated string', () => {
      const result = formatCartItemAttributes({ size: 'L', color: 'Blanco' });
      expect(result).toBe('size: L · color: Blanco');
    });

    it('should return empty string when attributes are undefined or empty', () => {
      expect(formatCartItemAttributes(undefined)).toBe('');
      expect(formatCartItemAttributes({})).toBe('');
    });
  });

  describe('ensureGuestToken & Storage', () => {
    it('should generate and persist a new valid guest token if none exists', () => {
      expect(getStoredGuestToken()).toBeNull();

      const token = ensureGuestToken();
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThanOrEqual(10);
      expect(getStoredGuestToken()).toBe(token);
    });

    it('should reuse the existing guest token without generating a new one', () => {
      const existingToken = 'test-guest-existing-uuid-1234';
      mockStorage.set(GUEST_TOKEN_STORAGE_KEY, existingToken);

      const resolved = ensureGuestToken();
      expect(resolved).toBe(existingToken);
    });

    it('should clear stored guest token upon clearStoredGuestToken()', () => {
      ensureGuestToken();
      expect(getStoredGuestToken()).not.toBeNull();

      clearStoredGuestToken();
      expect(getStoredGuestToken()).toBeNull();
    });
  });

  describe('getNavItemsForRole (Guest Support)', () => {
    it('should return Catalog and Cart navigation items for unauthenticated guests', () => {
      const guestNav = getNavItemsForRole(null);
      expect(guestNav.some((item) => item.path === '/catalog')).toBe(true);
      expect(guestNav.some((item) => item.path === '/cart')).toBe(true);
    });

    it('should not include restricted admin items for guests', () => {
      const guestNav = getNavItemsForRole(undefined);
      expect(guestNav.some((item) => item.path === '/admin/catalog')).toBe(false);
      expect(guestNav.some((item) => item.path === '/inventory')).toBe(false);
    });
  });
});
