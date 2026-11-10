import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import {
  getNavItemsForRole,
  NAVIGATION_ITEMS,
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  type UserRole,
} from '../types/auth.types.js';

export interface ModulePlaceholderPageProps {
  title: string;
  rfCode: string;
  description: string;
  allowedRoles: readonly UserRole[];
}

export function ModuleViewPage({
  title,
  rfCode,
  description,
  allowedRoles,
}: ModulePlaceholderPageProps) {
  const { user } = useAuth();
  const permittedNavItems = getNavItemsForRole(user?.role);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
      {/* Header Banner */}
      <div className="pentandra-cover-card rounded-2xl p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="pentandra-tag text-xs font-semibold">// {rfCode}</p>
            <h1 className="mt-1 text-2xl font-bold text-white sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>
          </div>

          {user && (
            <div className="rounded-xl border border-navy-700 bg-navy-950/90 p-4">
              <div className="flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-brand-400" />
                <span className="font-mono text-xs uppercase text-slate-300">Sesión Activa</span>
              </div>
              <p className="mt-1 text-sm font-bold text-white">{user.fullName}</p>
              <p className="font-mono text-xs text-slate-400">{user.email}</p>
              <div className="mt-2 flex items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                    ROLE_BADGE_CLASSES[user.role]
                  }`}
                >
                  {ROLE_LABELS[user.role]}
                </span>
                <span className="font-mono text-[11px] text-emerald-400">JWT Activo</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* RBAC Access Matrix Overview */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Módulos Habilitados para tu Rol ({user ? ROLE_LABELS[user.role] : 'Invitado'})
            </h2>
            <p className="text-xs text-[var(--text-secondary)]">
              Roles autorizados en esta vista:{' '}
              <strong>{allowedRoles.map((r) => ROLE_LABELS[r]).join(', ')}</strong>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {permittedNavItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className="group flex flex-col justify-between rounded-xl border border-[var(--border-subtle)] bg-surface p-5 shadow-xs transition hover:border-primary"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Acceso Permitido
                  </span>
                  <span className="font-mono text-[11px] text-[var(--text-muted)]">
                    {item.path}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-bold text-[var(--text-primary)] group-hover:text-primary">
                  {item.label}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-[var(--text-secondary)]">
                  {item.description}
                </p>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary">
                Abrir módulo
                <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Restricted Routes Verification Section (Useful for testing 403 Forbidden behavior) */}
      {user && user.role !== 'ADMINISTRATOR' && (
        <section className="mt-10 rounded-xl border border-[var(--border-subtle)] bg-surface p-5">
          <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Verificación de Rutas Protegidas (Prueba de Control de Acceso 403)
          </div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Los siguientes módulos requieren un rol distinto a{' '}
            <strong>{ROLE_LABELS[user.role]}</strong>. Si intentas navegar a ellos por URL, el
            guardián <code>&lt;ProtectedRoute&gt;</code> bloqueará el acceso con estado{' '}
            <code>403 Forbidden</code>:
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {NAVIGATION_ITEMS.filter((item) => !item.roles.includes(user.role)).map((restricted) => (
              <Link
                key={restricted.path}
                to={restricted.path}
                className="inline-flex items-center gap-1.5 rounded-lg border border-crimson-600/30 bg-crimson-600/5 px-3 py-1.5 text-xs font-medium text-crimson-600 transition hover:bg-crimson-600/15"
              >
                <Lock className="h-3 w-3" />
                Probar bloqueo 403: {restricted.label} ({restricted.path})
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
