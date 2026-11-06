import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { authApi } from '../api/auth.api.js';
import { getStoredSession, onSessionChange, setStoredSession } from '../api/http-client.js';
import {
  hasAllowedRole,
  type AuthSession,
  type AuthUser,
  type LoginRequest,
  type RegisterRequest,
  type UserRole,
} from '../types/auth.types.js';

export interface AuthContextValue {
  session: AuthSession | null;
  user: AuthUser | null;
  isAuthenticated: boolean;
  isInitializing: boolean;
  login: (credentials: LoginRequest) => Promise<AuthSession>;
  registerAndLogin: (payload: RegisterRequest) => Promise<AuthSession>;
  logout: () => Promise<void>;
  hasRole: (allowedRoles: readonly UserRole[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(() => getStoredSession());
  const [isInitializing, setIsInitializing] = useState<boolean>(() => Boolean(getStoredSession()));

  useEffect(() => {
    const unsubscribe = onSessionChange((nextSession) => {
      setSession(nextSession);
    });
    return unsubscribe;
  }, []);

  // Verify stored session on initial mount (triggers transparent refresh if accessToken expired)
  useEffect(() => {
    const current = getStoredSession();
    if (!current) {
      setIsInitializing(false);
      return;
    }

    let isMounted = true;
    authApi
      .getMe()
      .then((verifiedUser) => {
        if (!isMounted) return;
        const latestSession = getStoredSession();
        if (latestSession) {
          const updated: AuthSession = {
            ...latestSession,
            user: verifiedUser,
          };
          setStoredSession(updated);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setStoredSession(null);
      })
      .finally(() => {
        if (isMounted) {
          setIsInitializing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const login = useCallback(async (credentials: LoginRequest): Promise<AuthSession> => {
    return authApi.login(credentials);
  }, []);

  const registerAndLogin = useCallback(async (payload: RegisterRequest): Promise<AuthSession> => {
    await authApi.register(payload);
    return authApi.login({
      email: payload.email,
      password: payload.password,
    });
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authApi.logout();
  }, []);

  const hasRole = useCallback(
    (allowedRoles: readonly UserRole[]): boolean => {
      return hasAllowedRole(session?.user.role, allowedRoles);
    },
    [session?.user.role]
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: Boolean(session?.accessToken && session?.user),
      isInitializing,
      login,
      registerAndLogin,
      logout,
      hasRole,
    }),
    [session, isInitializing, login, registerAndLogin, logout, hasRole]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un <AuthProvider>');
  }
  return context;
}
