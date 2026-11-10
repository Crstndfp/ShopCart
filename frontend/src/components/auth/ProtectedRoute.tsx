import type { ReactNode } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import {
  getDefaultRouteForRole,
  hasAllowedRole,
  ROLE_LABELS,
  type UserRole,
} from '../../types/auth.types.js';

export interface ProtectedRouteProps {
  allowedRoles?: readonly UserRole[];
  children: ReactNode;
}

export function ProtectedRoute({ allowedRoles, children }: ProtectedRouteProps) {
  const { user, isAuthenticated, isInitializing } = useAuth();
  const location = useLocation();

  if (isInitializing) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-[60vh] items-center justify-center p-6"
      >
        <div className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-surface px-6 py-4 shadow-xs">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-[var(--text-secondary)]">
            Verificando sesión y credenciales de acceso...
          </span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }

  if (allowedRoles && !hasAllowedRole(user.role, allowedRoles)) {
    const allowedLabels = allowedRoles.map((r) => ROLE_LABELS[r]).join(' o ');
    const defaultPath = getDefaultRouteForRole(user.role);

    return (
      <div className="mx-auto my-12 max-w-lg rounded-2xl border border-crimson-600/30 bg-surface p-8 text-center shadow-xs">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-crimson-600/10 text-crimson-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <p className="font-mono text-xs font-bold tracking-widest text-crimson-600 uppercase">
          // ERROR HTTP 403 · FORBIDDEN
        </p>
        <h2 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
          Acceso Restringido por Rol
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--text-secondary)]">
          Tu cuenta actual (<strong>{user.email}</strong>) posee el rol{' '}
          <span className="font-semibold text-[var(--text-primary)]">{ROLE_LABELS[user.role]}</span>
          . Este módulo requiere permisos de <strong>{allowedLabels}</strong>.
        </p>
        <div className="mt-6 flex justify-center">
          <Link
            to={defaultPath}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-primary-hover"
          >
            <ArrowLeft className="h-4 w-4" />
            Ir al panel principal de {ROLE_LABELS[user.role]}
          </Link>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
