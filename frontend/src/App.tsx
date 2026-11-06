import { useState } from 'react';
import { ShoppingCart, ShieldCheck, Palette, Sun, Moon, Monitor } from 'lucide-react';
import { SHOPCART_PALETTE, applyThemeMode, type ThemeMode } from './theme/palette.js';

export function App() {
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
    applyThemeMode(mode);
  };

  return (
    <div className="min-h-screen bg-canvas text-[var(--text-primary)]">
      {/* Portada Hero — Inspirada directamente en la Portada de Tech Challenge 360 */}
      <header className="pentandra-grid-bg border-b border-navy-800 px-6 py-12 text-white">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-brand-400/40 bg-brand-900 shadow-sm">
                <ShoppingCart className="h-6 w-6 text-brand-400" />
              </div>
              <div className="border-l border-navy-700 pl-4">
                <p className="font-mono text-xs tracking-[0.25em] text-slate-300 uppercase">
                  Grupo Pentandra · Don Arturo
                </p>
                <p className="text-sm font-semibold text-white">Plataforma E-Commerce Enterprise</p>
              </div>
            </div>

            {/* Selector de Tema (Light / Dark / System) */}
            <div className="inline-flex items-center rounded-lg border border-navy-700 bg-navy-900 p-1">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  themeMode === 'light'
                    ? 'bg-brand-600 text-white'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Sun className="h-3.5 w-3.5" />
                Claro
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  themeMode === 'dark'
                    ? 'bg-brand-400 text-navy-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Moon className="h-3.5 w-3.5" />
                Oscuro
              </button>
              <button
                type="button"
                onClick={() => handleThemeChange('system')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                  themeMode === 'system'
                    ? 'bg-navy-700 text-brand-400'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Monitor className="h-3.5 w-3.5" />
                Sistema
              </button>
            </div>
          </div>

          <p className="pentandra-tag mb-3 text-sm font-semibold">// TECH CHALLENGE 360</p>
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Reto ShopCart
          </h1>
          <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
            Plataforma web de ventas de nivel productivo con control transaccional de inventario,
            kardex auditable, cupones promocionales y gestión de pedidos por rol.
          </p>

          {/* Tarjetas inferiores estilo Portada */}
          <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="pentandra-cover-card p-5">
              <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
                ARQUITECTURA
              </span>
              <p className="mt-2 text-lg font-semibold text-white">SQL Server + SPs</p>
              <p className="text-sm text-slate-300">ACID &amp; UPDLOCK</p>
            </div>
            <div className="pentandra-cover-card p-5">
              <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
                BACKEND API
              </span>
              <p className="mt-2 text-lg font-semibold text-white">Node.js 24 + TS</p>
              <p className="text-sm text-slate-300">Express &amp; JWT RTR</p>
            </div>
            <div className="pentandra-cover-card p-5">
              <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
                FRONTEND UI
              </span>
              <p className="mt-2 text-lg font-semibold text-white">React + Tailwind</p>
              <p className="text-sm text-slate-300">TypeScript Strict</p>
            </div>
            <div className="pentandra-cover-card p-5">
              <span className="font-mono text-xs tracking-widest text-slate-400 uppercase">
                SEGURIDAD
              </span>
              <p className="mt-2 flex items-center gap-1.5 text-lg font-semibold text-brand-400">
                <ShieldCheck className="h-5 w-5" /> RBAC 3 Roles
              </p>
              <p className="text-sm text-slate-300">Cliente · Operador · Admin</p>
            </div>
          </div>
        </div>
      </header>

      {/* Catálogo de Tokens de la Paleta Extraída de la Portada */}
      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
              // 01 SISTEMA DE DISEÑO
            </span>
            <h2 className="text-2xl font-bold">
              Paleta de Colores Oficial (`src/styles/theme.css`)
            </h2>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SHOPCART_PALETTE.map((token) => (
            <div
              key={token.cssVar}
              className="flex flex-col overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-surface shadow-xs"
            >
              <div
                className={`flex h-20 items-end justify-between p-3 ${token.tailwindClass}`}
              >
                <span className="rounded bg-navy-950/80 px-2 py-0.5 font-mono text-xs font-medium text-white">
                  {token.hex}
                </span>
                <span className="rounded bg-white/90 px-2 py-0.5 font-mono text-xs font-medium text-navy-950">
                  {token.tailwindClass}
                </span>
              </div>
              <div className="flex flex-1 flex-col justify-between p-4">
                <div>
                  <h3 className="font-semibold text-[var(--text-primary)]">{token.name}</h3>
                  <p className="mt-0.5 font-mono text-xs text-primary">{token.cssVar}</p>
                  <p className="mt-2 text-xs text-[var(--text-secondary)]">{token.source}</p>
                </div>
                <p className="mt-3 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--text-muted)]">
                  <strong>Uso:</strong> {token.usage}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}

export default App;
