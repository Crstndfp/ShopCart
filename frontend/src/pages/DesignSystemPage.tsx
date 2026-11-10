import { LayoutGrid, MonitorSmartphone, Palette, Table2 } from 'lucide-react';
import { SHOPCART_PALETTE } from '../theme/palette.js';

export function DesignSystemPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      {/* Section 1: Mandatory 100% Responsive Design Rules */}
      <section className="mb-10 rounded-2xl border border-[var(--border-subtle)] bg-surface p-6 shadow-xs">
        <div className="flex items-center gap-3">
          <MonitorSmartphone className="h-6 w-6 text-primary" />
          <div>
            <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
              // REGLA ARQUITECTÓNICA DE UI
            </span>
            <h1 className="text-xl font-bold text-[var(--text-primary)] sm:text-2xl">
              Estándar de Diseño 100% Responsive &amp; Accesible
            </h1>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <LayoutGrid className="h-4 w-4 text-primary" />
              Container Queries &amp; CLS Zero
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Todas las tarjetas y contenedores utilizan <code>container-type: inline-size</code>,
              unidades dinámicas <code>dvh</code>, tipografía fluida <code>clamp()</code> y reserva
              de espacio con <code>aspect-ratio</code>.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Table2 className="h-4 w-4 text-primary" />
              Tablas Apiladas Adaptativas
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Las tablas de datos usan encabezados <code>sticky</code> en escritorio y se
              transforman automáticamente en tarjetas apiladas en contenedores{' '}
              <code>&lt; 640px</code> inyectando etiquetas <code>data-label</code> con{' '}
              <code>::before</code>.
            </p>
          </div>

          <div className="rounded-xl border border-[var(--border-subtle)] bg-canvas p-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
              <Palette className="h-4 w-4 text-primary" />
              Modales Nativos Top-Layer
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-[var(--text-secondary)]">
              Uso de <code>&lt;dialog closedby=&quot;any&quot;&gt;</code> con{' '}
              <code>showModal()</code>, <code>overscroll-behavior: contain</code> y fallback de
              cierre ligero para todo tamaño de pantalla.
            </p>
          </div>
        </div>
      </section>

      {/* Section 2: Official Cover Color Palette */}
      <div className="mb-6 flex items-center gap-3">
        <Palette className="h-6 w-6 text-primary" />
        <div>
          <span className="font-mono text-xs font-bold tracking-widest text-primary uppercase">
            // 01 SISTEMA DE DISEÑO
          </span>
          <h2 className="text-xl font-bold sm:text-2xl">
            Paleta de Colores Oficial (<code>src/styles/theme.css</code>)
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
    </div>
  );
}
