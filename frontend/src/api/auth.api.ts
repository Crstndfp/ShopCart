import {
  apiRequest,
  clearStoredGuestToken,
  getStoredGuestToken,
  getStoredSession,
  setStoredSession,
} from './http-client.js';
import type {
  ApiSuccessResponse,
  AuthSession,
  AuthUser,
  LoginRequest,
  RegisterRequest,
} from '../types/auth.types.js';

export const authApi = {
  async login(credentials: LoginRequest): Promise<AuthSession> {
    const response = await apiRequest<ApiSuccessResponse<AuthSession>>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
      skipAuthRefresh: true,
    });

    const session = response.data;
    setStoredSession(session);

    // RF-04: Merge anonymous guest cart automatically when a CLIENT signs in
    const guestToken = getStoredGuestToken();
    if (session.user.role === 'CLIENT' && guestToken && guestToken.length >= 10) {
      try {
        await apiRequest('/api/v1/cart/merge', {
          method: 'POST',
          body: JSON.stringify({ guestToken }),
        });
        clearStoredGuestToken();
      } catch {
        // Guest cart might not exist or be empty; do not fail login flow
      }
    }

    return session;
  },

  async register(payload: RegisterRequest): Promise<{ idUser: number; message: string }> {
    const response = await apiRequest<ApiSuccessResponse<{ idUser: number; message: string }>>(
      '/api/v1/auth/register',
      {
        method: 'POST',
        body: JSON.stringify(payload),
        skipAuthRefresh: true,
      }
    );
    return response.data;
  },

  async getMe(): Promise<AuthUser> {
    const response = await apiRequest<ApiSuccessResponse<AuthUser>>('/api/v1/auth/me', {
      method: 'GET',
    });
    return response.data;
  },

  async logout(): Promise<void> {
    const currentSession = getStoredSession();
    try {
      if (currentSession?.refreshToken) {
        await apiRequest('/api/v1/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
          skipAuthRefresh: true,
        });
      }
    } catch {
      // Always clear local session even if server token is already expired/revoked
    } finally {
      setStoredSession(null);
    }
  },
};
