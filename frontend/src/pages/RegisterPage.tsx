import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { HttpError } from '../api/http-client.js';
import { useAuth } from '../context/AuthContext.js';
import {
  evaluatePasswordStrength,
  getDefaultRouteForRole,
} from '../types/auth.types.js';
import { handleFieldBlur, handleFieldInput } from '../utils/form-a11y.js';

export function RegisterPage() {
  const { registerAndLogin, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRouteForRole(user.role)} replace />;
  }

  const passwordChecks = evaluatePasswordStrength(password);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setServerError(null);

    const form = event.currentTarget;
    if (!form.checkValidity() || !passwordChecks.isValid) {
      form.reportValidity();
      return;
    }

    setIsSubmitting(true);
    try {
      const session = await registerAndLogin({
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        ...(phoneNumber.trim() ? { phoneNumber: phoneNumber.trim() } : {}),
      });

      navigate(getDefaultRouteForRole(session.user.role), { replace: true });
    } catch (error) {
      if (error instanceof HttpError) {
        if (error.statusCode === 409) {
          setServerError('Ya existe una cuenta registrada con este correo electrónico.');
        } else {
          setServerError(error.message);
        }
      } else {
        setServerError('No fue posible completar el registro en este momento.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:py-14">
      <div className="rounded-2xl border border-[var(--border-subtle)] bg-surface p-6 shadow-xs sm:p-8">
        <div className="mb-6">
          <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
            // RF-01 REGISTRO DE CLIENTES
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-[var(--text-primary)] sm:text-3xl">
            Crear Cuenta de Cliente
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Regístrate para comprar en el catálogo, guardar tus direcciones de entrega y dar
            seguimiento a tus pedidos.
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
              <p className="font-semibold">No se pudo completar el registro</p>
              <p className="mt-0.5 text-xs leading-relaxed">{serverError}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Single Full Name Input (Unicode-friendly) */}
          <div className="form-field">
            <label
              htmlFor="register-fullname"
              className="block text-sm font-semibold text-[var(--text-primary)]"
            >
              Nombre completo
            </label>
            <span
              id="register-fullname-hint"
              className="mt-0.5 mb-1.5 block text-xs text-[var(--text-muted)]"
            >
              Ingresa tu nombre y apellido (mínimo 3 caracteres)
            </span>
            <input
              type="text"
              id="register-fullname"
              name="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              onBlur={handleFieldBlur}
              onInput={handleFieldInput}
              autoComplete="name"
              enterKeyHint="next"
              required
              minLength={3}
              aria-describedby="register-fullname-hint"
              aria-errormessage="register-fullname-error"
              placeholder="Ej. María Fernanda López"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
            />
            <div id="register-fullname-error" className="field-error-msg">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>El nombre completo debe tener al menos 3 caracteres.</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {/* Email Input */}
            <div className="form-field">
              <label
                htmlFor="register-email"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Correo electrónico
              </label>
              <span
                id="register-email-hint"
                className="mt-0.5 mb-1.5 block text-xs text-[var(--text-muted)]"
              >
                Formato: correo@dominio.com
              </span>
              <input
                type="email"
                id="register-email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={handleFieldBlur}
                onInput={handleFieldInput}
                autoComplete="username"
                spellCheck={false}
                enterKeyHint="next"
                required
                aria-describedby="register-email-hint"
                aria-errormessage="register-email-error"
                placeholder="cliente@ejemplo.com"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
              />
              <div id="register-email-error" className="field-error-msg">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Ingresa un correo electrónico válido.</span>
              </div>
            </div>

            {/* Telephone Input */}
            <div className="form-field">
              <label
                htmlFor="register-phone"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Teléfono de contacto <span className="font-normal text-[var(--text-muted)]">(Opcional)</span>
              </label>
              <span
                id="register-phone-hint"
                className="mt-0.5 mb-1.5 block text-xs text-[var(--text-muted)]"
              >
                Ej. +502 5555-1234
              </span>
              <input
                type="tel"
                id="register-phone"
                name="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                autoComplete="tel"
                enterKeyHint="next"
                aria-describedby="register-phone-hint"
                placeholder="+502 5555-1234"
                className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* New Password Input with Rules placed ABOVE input so mobile keyboards don't obscure them */}
          <div className="form-field">
            <div className="flex items-center justify-between">
              <label
                htmlFor="new-password"
                className="block text-sm font-semibold text-[var(--text-primary)]"
              >
                Nueva contraseña
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

            <ul
              id="password-rules"
              className="password-rules-list mt-1.5 mb-2 grid grid-cols-1 gap-1 text-xs text-[var(--text-secondary)] sm:grid-cols-2"
            >
              <li className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    passwordChecks.minLength ? 'text-emerald-600' : 'text-[var(--text-muted)]'
                  }`}
                />
                Al menos 8 caracteres
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    passwordChecks.hasUppercase ? 'text-emerald-600' : 'text-[var(--text-muted)]'
                  }`}
                />
                Una letra mayúscula (A-Z)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    passwordChecks.hasNumber ? 'text-emerald-600' : 'text-[var(--text-muted)]'
                  }`}
                />
                Al menos un número (0-9)
              </li>
              <li className="flex items-center gap-1.5">
                <CheckCircle2
                  className={`h-3.5 w-3.5 ${
                    passwordChecks.hasSpecialChar ? 'text-emerald-600' : 'text-[var(--text-muted)]'
                  }`}
                />
                Un carácter especial (!@#$%^&amp;*)
              </li>
            </ul>

            <input
              type={showPassword ? 'text' : 'password'}
              id="new-password"
              name="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={handleFieldBlur}
              onInput={handleFieldInput}
              autoComplete="new-password"
              enterKeyHint="done"
              required
              minLength={8}
              pattern="(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[\W_]).{8,}"
              aria-describedby="password-rules"
              aria-errormessage="register-password-error"
              placeholder="Crea una contraseña segura"
              className="w-full rounded-xl border border-[var(--border-strong)] bg-canvas px-3.5 py-2.5 text-sm text-[var(--text-primary)] transition focus:border-primary focus:outline-none"
            />
            <div id="register-password-error" className="field-error-msg">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>
                La contraseña debe tener mínimo 8 caracteres e incluir mayúscula, número y carácter
                especial.
              </span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando cuenta e iniciando sesión...
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4" />
                Crear Cuenta
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-5 text-sm text-[var(--text-secondary)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Cifrado de contraseñas en servidor con Argon2id (64 MB)
          </div>
          <div>
            ¿Ya tienes una cuenta?{' '}
            <Link to="/login" className="font-semibold text-primary hover:underline">
              Iniciar sesión
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
