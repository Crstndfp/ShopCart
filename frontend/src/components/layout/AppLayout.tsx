import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  LogIn,
  LogOut,
  Menu,
  Monitor,
  Moon,
  ShieldCheck,
  ShoppingCart,
  Sun,
  UserPlus,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';
import { applyThemeMode, type ThemeMode } from '../../theme/palette.js';
import {
  getNavItemsForRole,
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
} from '../../types/auth.types.js';

export function AppLayout() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const navItems = getNavItemsForRole(user?.role);

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemeMode(mode);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      setMobileMenuOpen(false);
      navigate('/login', { replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-[var(--text-primary)]">
      {/* Top Enterprise Header — Tech Challenge 360 Cover Identity */}
      <header className="pentandra-grid-bg sticky top-0 z-30 border-b border-navy-800 text-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 focus:outline-none">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-brand-400/40 bg-brand-900 shadow-xs">
              <ShoppingCart className="h-5 w-5 text-brand-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-bold tracking-tight text-white">ShopCart</span>
                <span className="rounded border border-brand-400/30 bg-navy-900 px-1.5 py-0.5 font-mono text-[10px] text-brand-400">
                  360
                </span>
              </div>
              <p className="font-mono text-[10px] tracking-[0.18em] text-slate-300 uppercase">
                Grupo Pentandra · Don Arturo
              </p>
            </div>
          </Link>

          {/* Right Controls: Theme Switcher + User Profile / Auth Links */}
          <div className="flex items-center gap-3">
            {/* Theme Switcher */}
            <div
              role="group"
              aria-label="Selector de tema visual"
              className="hidden items-center rounded-lg border border-navy-700 bg-navy-900 p-0.5 sm:inline-flex"
            >
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                title="Modo Claro"
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  themeMode === 'light'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Claro</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                title="Modo Oscuro"
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  themeMode === 'dark'
                    ? 'bg-brand-400 text-navy-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Oscuro</span>
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                title="Tema del Sistema"
                className={`flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium transition ${
                  themeMode === 'system'
                    ? 'bg-navy-700 text-brand-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                <span className="hidden md:inline">Auto</span>
              </button>
            </div>

            {isAuthenticated && user ? (
              <div className="hidden items-center gap-3 md:flex">
                <div className="flex items-center gap-2.5 rounded-xl border border-navy-700 bg-navy-900/90 px-3 py-1.5">
                  <ShieldCheck className="h-4 w-4 text-brand-400" />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-white leading-tight">
                      {user.fullName}
                    </p>
                    <p className="font-mono text-[11px] text-slate-300 leading-tight">
                      {user.email}
                    </p>
                  </div>
                  <span
                    className={`ml-1 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wider uppercase ${
                      ROLE_BADGE_CLASSES[user.role]
                    }`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-crimson-600/50 bg-crimson-600/15 px-3 py-2 text-xs font-semibold text-white transition hover:bg-crimson-600 disabled:opacity-50"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  {isLoggingOut ? 'Saliendo...' : 'Cerrar Sesión'}
                </button>
              </div>
            ) : (
              <div className="hidden items-center gap-2 md:flex">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-navy-700 bg-navy-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-brand-400"
                >
                  <LogIn className="h-3.5 w-3.5 text-brand-400" />
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-brand-400 hover:text-navy-950"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Crear Cuenta
                </Link>
              </div>
            )}

            {/* Mobile Menu Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-expanded={mobileMenuOpen}
              aria-label="Abrir menú de navegación"
              className="inline-flex items-center justify-center rounded-lg border border-navy-700 bg-navy-900 p-2 text-slate-300 hover:text-white md:hidden"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Role-based Dynamic Navigation Bar (Desktop) */}
        {isAuthenticated && navItems.length > 0 && (
          <nav
            aria-label="Navegación principal por rol"
            className="hidden border-t border-navy-800/90 bg-navy-900/80 md:block"
          >
            <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
              {navItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      isActive
                        ? 'bg-brand-600 text-white shadow-xs'
                        : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </nav>
        )}

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-t border-navy-800 bg-navy-900 px-4 py-4 md:hidden">
            {isAuthenticated && user ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl border border-navy-700 bg-navy-950 p-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{user.fullName}</p>
                    <p className="font-mono text-xs text-slate-300">{user.email}</p>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase ${
                      ROLE_BADGE_CLASSES[user.role]
                    }`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>

                <nav className="flex flex-col gap-1" aria-label="Navegación móvil por rol">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `rounded-lg px-3 py-2 text-sm font-medium transition ${
                          isActive
                            ? 'bg-brand-600 text-white'
                            : 'text-slate-300 hover:bg-navy-800 hover:text-white'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </nav>

                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-crimson-600 px-4 py-2.5 text-xs font-semibold text-white"
                >
                  <LogOut className="h-4 w-4" />
                  {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-lg border border-navy-700 bg-navy-950 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4 text-brand-400" />
                  Iniciar Sesión
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white"
                >
                  <UserPlus className="h-4 w-4" />
                  Crear Cuenta Cliente
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="border-t border-[var(--border-subtle)] bg-surface py-6 text-xs text-[var(--text-muted)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 sm:px-6">
          <p className="font-mono">
            ShopCart Enterprise · Tech Challenge 360 · Grupo Pentandra / Don Arturo
          </p>
          <p>Control de Acceso Basado en Roles (RBAC) &amp; Rotación JWT Activa</p>
        </div>
      </footer>
    </div>
  );
}
