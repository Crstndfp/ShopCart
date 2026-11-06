import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiRequest,
  getStoredSession,
  HttpError,
  setStoredSession,
} from '../api/http-client.js';
import {
  evaluatePasswordStrength,
  getDefaultRouteForRole,
  getNavItemsForRole,
  hasAllowedRole,
  type AuthSession,
} from '../types/auth.types.js';

describe('RF-01 Authentication, RBAC & Transparent Token Refresh', () => {
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

  describe('Role-Based Access Control (RBAC) & Navigation Matrix', () => {
    it('correctly validates allowed roles with hasAllowedRole', () => {
      expect(hasAllowedRole('CLIENT', ['CLIENT'])).toBe(true);
      expect(hasAllowedRole('CLIENT', ['OPERATOR', 'ADMINISTRATOR'])).toBe(false);
      expect(hasAllowedRole('OPERATOR', ['OPERATOR', 'ADMINISTRATOR'])).toBe(true);
      expect(hasAllowedRole('ADMINISTRATOR', ['ADMINISTRATOR'])).toBe(true);
      expect(hasAllowedRole(null, ['CLIENT'])).toBe(false);
      expect(hasAllowedRole(undefined, ['CLIENT'])).toBe(false);
    });

    it('returns strictly authorized menu items for CLIENT, OPERATOR, and ADMINISTRATOR', () => {
      const clientPaths = getNavItemsForRole('CLIENT').map((i) => i.path);
      expect(clientPaths).toContain('/catalog');
      expect(clientPaths).toContain('/cart');
      expect(clientPaths).toContain('/my-orders');
      expect(clientPaths).toContain('/addresses');
      expect(clientPaths).not.toContain('/inventory');
      expect(clientPaths).not.toContain('/orders-management');
      expect(clientPaths).not.toContain('/admin/users');

      const operatorPaths = getNavItemsForRole('OPERATOR').map((i) => i.path);
      expect(operatorPaths).toContain('/orders-management');
      expect(operatorPaths).toContain('/inventory');
      expect(operatorPaths).not.toContain('/cart');
      expect(operatorPaths).not.toContain('/admin/coupons');
      expect(operatorPaths).not.toContain('/admin/reports');

      const adminPaths = getNavItemsForRole('ADMINISTRATOR').map((i) => i.path);
      expect(adminPaths).toContain('/orders-management');
      expect(adminPaths).toContain('/inventory');
      expect(adminPaths).toContain('/admin/catalog');
      expect(adminPaths).toContain('/admin/coupons');
      expect(adminPaths).toContain('/admin/users');
      expect(adminPaths).toContain('/admin/reports');
      expect(adminPaths).toContain('/admin/audit');
    });

    it('resolves the default landing route according to user role', () => {
      expect(getDefaultRouteForRole('CLIENT')).toBe('/catalog');
      expect(getDefaultRouteForRole('OPERATOR')).toBe('/orders-management');
      expect(getDefaultRouteForRole('ADMINISTRATOR')).toBe('/admin/reports');
    });
  });

  describe('Password Complexity Validation (RF-01)', () => {
    it('verifies all four password strength rules', () => {
      expect(evaluatePasswordStrength('short').isValid).toBe(false);
      expect(evaluatePasswordStrength('alllowercase1!').hasUppercase).toBe(false);
      expect(evaluatePasswordStrength('NoNumbersHere!').hasNumber).toBe(false);
      expect(evaluatePasswordStrength('NoSpecialChar123').hasSpecialChar).toBe(false);

      const valid = evaluatePasswordStrength('Password123!');
      expect(valid).toEqual({
        minLength: true,
        hasUppercase: true,
        hasNumber: true,
        hasSpecialChar: true,
        isValid: true,
      });
    });
  });

  describe('HTTP Client & Single-Flight Transparent Refresh Token Rotation', () => {
    const initialSession: AuthSession = {
      accessToken: 'expired-access-token',
      refreshToken: 'initial-refresh-token',
      user: {
        idUser: 1,
        fullName: 'Admin Pentandra',
        email: 'admin@shopcart.gt',
        role: 'ADMINISTRATOR',
      },
    };

    it('rotates tokens transparently on 401 and retries concurrent requests with a single refresh call', async () => {
      setStoredSession(initialSession);

      const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const headers = new Headers(init?.headers);
        const authHeader = headers.get('Authorization');

        if (url === '/api/v1/auth/refresh') {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              data: {
                accessToken: 'rotated-access-token',
                refreshToken: 'rotated-refresh-token',
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        // Protected endpoint fails with 401 when using expired token, succeeds with rotated token
        if (authHeader === 'Bearer expired-access-token') {
          return new Response(
            JSON.stringify({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Access token expired',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }

        if (authHeader === 'Bearer rotated-access-token') {
          return new Response(
            JSON.stringify({
              statusCode: 200,
              data: { ok: true, endpoint: url },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }

        return new Response(JSON.stringify({ message: 'Unexpected' }), { status: 500 });
      });

      vi.stubGlobal('fetch', fetchMock);

      // Fire two concurrent requests that both encounter 401 with the expired token
      const [res1, res2] = await Promise.all([
        apiRequest<{ data: { ok: boolean; endpoint: string } }>('/api/v1/orders'),
        apiRequest<{ data: { ok: boolean; endpoint: string } }>('/api/v1/inventory'),
      ]);

      expect(res1.data.ok).toBe(true);
      expect(res2.data.ok).toBe(true);

      // Verify /api/v1/auth/refresh was called ONLY ONCE (single-flight queue)
      const refreshCalls = fetchMock.mock.calls.filter(
        (call) => String(call[0]) === '/api/v1/auth/refresh'
      );
      expect(refreshCalls).toHaveLength(1);

      // Verify stored session was updated with rotated tokens
      const updated = getStoredSession();
      expect(updated?.accessToken).toBe('rotated-access-token');
      expect(updated?.refreshToken).toBe('rotated-refresh-token');
    });

    it('clears the session and throws HttpError if token refresh fails', async () => {
      setStoredSession(initialSession);

      const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        if (url === '/api/v1/auth/refresh') {
          return new Response(
            JSON.stringify({
              statusCode: 401,
              error: 'Unauthorized',
              message: 'Refresh token expired or revoked',
            }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(
          JSON.stringify({
            statusCode: 401,
            error: 'Unauthorized',
            message: 'Access token expired',
          }),
          { status: 401, headers: { 'Content-Type': 'application/json' } }
        );
      });

      vi.stubGlobal('fetch', fetchMock);

      await expect(apiRequest('/api/v1/auth/me')).rejects.toThrow(HttpError);
      expect(getStoredSession()).toBeNull();
    });
  });
});
