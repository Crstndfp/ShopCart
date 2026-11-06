import { Palette } from 'lucide-react';
import { SHOPCART_PALETTE } from '../theme/palette.js';

export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <div>
          <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
            // 01 SISTEMA DE DISEÑO
          </span>
          <h1 className="text-2xl font-bold">
            Paleta de Colores Oficial (<code>src/styles/theme.css</code>)
          </h1>
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
                <h2 className="font-semibold text-[var(--text-primary)]">{token.name}</h2>
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
    </div>
  );
}
