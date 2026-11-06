import type { ApiErrorPayload, AuthSession, ValidationIssue } from '../types/auth.types.js';

export const AUTH_STORAGE_KEY = 'shopcart_auth_session';
export const GUEST_TOKEN_STORAGE_KEY = 'shopcart_guest_token';

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly details: ValidationIssue[] | Record<string, unknown> | null;

  constructor(
    statusCode: number,
    message: string,
    errorCode = 'HttpError',
    details: ValidationIssue[] | Record<string, unknown> | null = null
  ) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.details = details;
  }
}

type SessionListener = (session: AuthSession | null) => void;
const sessionListeners = new Set<SessionListener>();
let activeRefreshPromise: Promise<AuthSession | null> | null = null;

export function getStoredSession(): AuthSession | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.accessToken || !parsed?.refreshToken || !parsed?.user?.role) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function setStoredSession(session: AuthSession | null): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    if (session) {
      window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }
  sessionListeners.forEach((listener) => listener(session));
}

export function onSessionChange(listener: SessionListener): () => void {
  sessionListeners.add(listener);
  return () => {
    sessionListeners.delete(listener);
  };
}

export function getStoredGuestToken(): string | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  return window.localStorage.getItem(GUEST_TOKEN_STORAGE_KEY);
}

export function clearStoredGuestToken(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.removeItem(GUEST_TOKEN_STORAGE_KEY);
  }
}

async function rotateRefreshToken(currentSession: AuthSession): Promise<AuthSession | null> {
  try {
    const response = await fetch('/api/v1/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: currentSession.refreshToken }),
    });

    if (!response.ok) {
      setStoredSession(null);
      return null;
    }

    const body = (await response.json()) as {
      data?: { accessToken?: string; refreshToken?: string };
    };

    if (!body?.data?.accessToken || !body?.data?.refreshToken) {
      setStoredSession(null);
      return null;
    }

    const updatedSession: AuthSession = {
      ...currentSession,
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    };

    setStoredSession(updatedSession);
    return updatedSession;
  } catch {
    setStoredSession(null);
    return null;
  }
}

export interface ApiRequestOptions extends RequestInit {
  skipAuthRefresh?: boolean;
}

export async function apiRequest<T>(
  endpoint: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuthRefresh = false, headers: customHeaders, ...fetchOptions } = options;
  const session = getStoredSession();

  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type') && fetchOptions.body && typeof fetchOptions.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }
  if (session?.accessToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }
  const guestToken = getStoredGuestToken();
  if (guestToken && !headers.has('X-Guest-Token')) {
    headers.set('X-Guest-Token', guestToken);
  }

  let response = await fetch(endpoint, {
    ...fetchOptions,
    headers,
  });

  // RF-01: Transparent JWT renewal using Rotating Refresh Token on 401 Unauthorized
  if (response.status === 401 && !skipAuthRefresh && session?.refreshToken) {
    if (!activeRefreshPromise) {
      activeRefreshPromise = rotateRefreshToken(session).finally(() => {
        activeRefreshPromise = null;
      });
    }

    const refreshedSession = await activeRefreshPromise;
    if (refreshedSession?.accessToken) {
      headers.set('Authorization', `Bearer ${refreshedSession.accessToken}`);
      response = await fetch(endpoint, {
        ...fetchOptions,
        headers,
      });
    }
  }

  const payload = (await response.json().catch(() => ({}))) as Partial<ApiErrorPayload> & T;

  if (!response.ok) {
    throw new HttpError(
      response.status,
      typeof payload.message === 'string' && payload.message.length > 0
        ? payload.message
        : `Error HTTP ${response.status} al procesar la solicitud`,
      typeof payload.error === 'string' ? payload.error : 'ApiError',
      payload.details ?? null
    );
  }

  return payload as T;
}
