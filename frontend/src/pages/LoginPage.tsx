import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LogIn,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { HttpError } from '../api/http-client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  DEMO_ACCOUNTS,
  getDefaultRouteForRole,
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  type DemoAccountPreset,
} from '../types/auth.types.js';
import { handleFieldBlur, handleFieldInput } from '../utils/form-a11y.js';

export function LoginPage() {
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    const fromState = (location.state as { from?: string } | null)?.from;
    const destination = fromState || getDefaultRouteForRole(user.role);
    return <Navigate to={destination} replace />;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const form = event.currentTarget;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await login({
        email: email.trim(),
        password,
      });

      const fromState = (location.state as { from?: string } | null)?.from;
      const targetRoute = fromState || getDefaultRouteForRole(session.user.role);
      navigate(targetRoute, { replace: true });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.statusCode === 401) {
          setServerError('Credenciales inválidas o cuenta inactiva. Verifica tu correo y contraseña.');
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError('No fue posible conectar con el servidor de autenticación.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApplyDemoAccount = (preset: DemoAccountPreset) => {
    setServerError(null);
    setEmail(preset.email);
    setPassword(preset.password);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Primary Sign-In Form Card (Placed first so mobile keyboards do not obstruct the submit button) */}
        <section className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-6 shadow-xs sm:p-8 lg:col-span-7">
          <div className="mb-6">
            <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
              // RF-01 AUTENTICACIÓN SEGURA
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
              Iniciar Sesión en ShopCart
            </h1>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Ingresa tus credenciales para acceder con tu rol asignado.
            </p>
          </div>

          {serverError && (
            <div
              role="alert"
              aria-live="polite"
              className="mb-6 flex items-start gap-3 rounded-xl border border-crimson-600/40 bg-crimson-600/10 p-4 text-sm text-crimson-600"
            >
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p className="font-semibold">Error de autenticación</p>
                <p className="mt-0.5 text-xs leading-relaxed">{serverError}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email Input */}
            <div className="form-field">
              <label
                htmlFor="login-email"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Correo electrónico
              </label>
              <span
                id="login-email-hint"
                className="mt-0.5 mb-1.5 block text-xs text-[var(--text-muted)]"
              >
                Formato: usuario@dominio.com
              </span>
              <input
                type="email"
                id="login-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleFieldBlur}
                onInput={handleFieldInput}
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                required
                aria-describedby="login-email-hint"
                aria-errormessage="login-email-error"
                placeholder="ejemplo@shopcart.gt"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
              />
              <div id="login-email-error" className="field-error-msg">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Por favor ingresa una dirección de correo electrónico válida.</span>
              </div>
            </div>

            {/* Password Input */}
            <div className="form-field">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-sm font-semibold text-[var(--text-primary)]"
                >
                  Contraseña
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" />
                      Ocultar contraseña
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" />
                      Mostrar contraseña
                    </>
                  )}
                </button>
              </div>
              <div className="mt-1.5">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="login-password"
                  name="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={handleFieldBlur}
                  onInput={handleFieldInput}
                  autoComplete="current-password"
                  enterKeyHint="done"
                  required
                  aria-errormessage="login-password-error"
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
                />
                <div id="login-password-error" className="field-error-msg">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span>La contraseña es obligatoria para iniciar sesión.</span>
                </div>
              </div>
            </div>

            {/* Submit Button with Clear Recognizable Label */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Verificando credenciales...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-[var(--border-subtle)] pt-5 text-center text-sm text-[var(--text-secondary)]">
            ¿Aún no tienes una cuenta de cliente?{' '}
            <Link to="/register" className="font-semibold text-primary hover:underline">
              Crear cuenta nueva
            </Link>
          </div>
        </section>

        {/* Secondary Panel: Demo Accounts & RBAC Matrix (Placed underneath on mobile) */}
        <aside className="flex flex-col justify-between rounded-2xl border border-navy-800 pentandra-grid-bg p-6 text-white sm:p-8 lg:col-span-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg border border-brand-400/30 bg-navy-900 px-3 py-1 font-mono text-xs text-brand-400">
              <Sparkles className="h-3.5 w-3.5" />
              DEFENSA TÉCNICA · SEED DATA
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">
              Cuentas de Prueba por Rol (RBAC)
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
              Selecciona cualquiera de los 3 perfiles precargados en <code>05_seed_data.sql</code>{' '}
              para autocompletar las credenciales y evaluar los permisos de cada rol:
            </p>

            <div className="mt-5 space-y-3">
              {DEMO_ACCOUNTS.map((preset) => (
                <button
                  key={preset.email}
                  type="button"
                  onClick={() => handleApplyDemoAccount(preset)}
                  className="w-full rounded-xl border border-navy-700 bg-navy-900/90 p-3.5 text-left transition hover:border-brand-400 hover:bg-navy-800"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{preset.label}</span>
                    <span
                      className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                        ROLE_BADGE_CLASSES[preset.role]
                      }`}
                    >
                      {ROLE_LABELS[preset.role]}
                    </span>
                  </div>
                  <p className="mt-1 font-mono text-xs text-brand-400">{preset.email}</p>
                  <p className="mt-1 text-xs text-slate-300">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-navy-700 bg-navy-900/75 p-4 text-xs text-slate-300">
            <div className="flex items-center gap-2 font-semibold text-white">
              <ShieldCheck className="h-4 w-4 text-brand-400" />
              Seguridad JWT &amp; Refresh Token Rotativo
            </div>
            <p className="mt-1 leading-relaxed">
              El token de acceso tiene vigencia corta (15 min) y se renueva de forma transparente
              mediante <code>POST /api/v1/auth/refresh</code> con detección de reúso en SQL Server.
            </p>
            <p className="mt-2 flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
              <KeyRound className="h-3.5 w-3.5 text-brand-400" />
              Contraseña seed: <strong className="text-white">Password123!</strong>
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
