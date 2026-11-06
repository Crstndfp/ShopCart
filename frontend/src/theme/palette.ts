export interface ColorToken {
  name: string;
  cssVar: string;
  tailwindClass: string;
  hex: string;
  source: string;
  usage: string;
}

export const SHOPCART_PALETTE: readonly ColorToken[] = [
  {
    name: 'Navy 950 (Cover Canvas)',
    cssVar: '--palette-navy-950',
    tailwindClass: 'bg-navy-950',
    hex: '#0B1220',
    source: 'Portada — Fondo principal oscuro y cabeceras de tablas',
    usage: 'Fondo principal oscuro, Hero, Sidebar, Navbar',
  },
  {
    name: 'Navy 900 (Cover Card)',
    cssVar: '--palette-navy-900',
    tailwindClass: 'bg-navy-900',
    hex: '#121B2E',
    source: 'Portada — Tarjetas inferiores (INICIO, FASE 1, FASE 2, NIVEL)',
    usage: 'Tarjetas y contenedores elevados en modo oscuro',
  },
  {
    name: 'Navy 800 (Blueprint Grid)',
    cssVar: '--palette-navy-800',
    tailwindClass: 'bg-navy-800',
    hex: '#1B2436',
    source: 'Portada — Cuadrícula técnica de fondo',
    usage: 'Líneas de cuadrícula y bordes sutiles oscuros',
  },
  {
    name: 'Navy 700 (Dark Border)',
    cssVar: '--palette-navy-700',
    tailwindClass: 'bg-navy-700',
    hex: '#24324D',
    source: 'Portada — Bordes de tarjetas y divisores oscuros',
    usage: 'Bordes de controles e inputs en modo oscuro',
  },
  {
    name: 'Brand 400 (Tech Cyan)',
    cssVar: '--palette-brand-400',
    tailwindClass: 'bg-brand-400',
    hex: '#38BDF8',
    source: 'Portada — // TECH CHALLENGE 360 y borde superior de tarjetas',
    usage: 'Acento principal brillante, indicadores activos y badges',
  },
  {
    name: 'Brand 600 (Pentandra Blue)',
    cssVar: '--palette-brand-600',
    tailwindClass: 'bg-brand-600',
    hex: '#0284C7',
    source: 'Documento — // 01, subrayados de sección y bordes laterales RF',
    usage: 'Botones primarios, enlaces y llamadas a la acción',
  },
  {
    name: 'Brand 900 (Don Arturo Deep Blue)',
    cssVar: '--palette-brand-900',
    tailwindClass: 'bg-brand-900',
    hex: '#0B3B5C',
    source: 'Portada — Escudo institucional Don Arturo / Grupo Pentandra',
    usage: 'Estados hover de botones primarios y cabeceras corporativas',
  },
  {
    name: 'Crimson 600 (Don Arturo Ribbon)',
    cssVar: '--palette-crimson-600',
    tailwindClass: 'bg-crimson-600',
    hex: '#DC2626',
    source: 'Portada — Franja roja del emblema Don Arturo',
    usage: 'Acciones destructivas, alertas de stock bajo y promociones',
  },
  {
    name: 'Slate 600 (Body Text)',
    cssVar: '--palette-slate-600',
    tailwindClass: 'bg-slate-600',
    hex: '#4A5568',
    source: 'Documento — Texto de cuerpo en páginas internas',
    usage: 'Texto secundario y descripciones en modo claro',
  },
  {
    name: 'Slate 400 (Muted Metadata)',
    cssVar: '--palette-slate-400',
    tailwindClass: 'bg-slate-400',
    hex: '#93A1B8',
    source: 'Portada — Etiquetas INICIO, FASE 1 y subtítulos',
    usage: 'Metadatos, etiquetas técnicas y placeholders',
  },
  {
    name: 'Slate 300 (Cover Subtitle)',
    cssVar: '--palette-slate-300',
    tailwindClass: 'bg-slate-300',
    hex: '#AEBBD0',
    source: 'Portada — Párrafo descriptivo bajo Reto ShopCart',
    usage: 'Texto secundario sobre fondos oscuros',
  },
  {
    name: 'Surface 50 (Page Canvas)',
    cssVar: '--palette-surface-50',
    tailwindClass: 'bg-surface-50',
    hex: '#F6F8FB',
    source: 'Documento — Fondo general de página',
    usage: 'Fondo base de la aplicación en modo claro',
  },
  {
    name: 'Surface 100 (Criteria Box)',
    cssVar: '--palette-surface-100',
    tailwindClass: 'bg-surface-100',
    hex: '#F0F6FC',
    source: 'Documento — Bloques CRITERIOS DE ACEPTACIÓN',
    usage: 'Callouts informativos y fondos de sección secundarios',
  },
  {
    name: 'Surface 200 (Subtle Border)',
    cssVar: '--palette-surface-200',
    tailwindClass: 'bg-surface-200',
    hex: '#E8EDF5',
    source: 'Documento — Líneas divisorias de tablas y tarjetas',
    usage: 'Bordes de tarjetas y separadores de filas',
  },
  {
    name: 'Surface 300 (Control Border)',
    cssVar: '--palette-surface-300',
    tailwindClass: 'bg-surface-300',
    hex: '#D9DFE8',
    source: 'Documento — Contornos de contenedores',
    usage: 'Bordes de inputs y selects con contraste accesible',
  },
] as const;

export type ThemeMode = 'system' | 'light' | 'dark';

export function applyThemeMode(mode: ThemeMode, rootElement: HTMLElement | null = typeof document !== 'undefined' ? document.documentElement : null): void {
  if (!rootElement) return;
  if (mode === 'system') {
    rootElement.removeAttribute('data-theme');
  } else {
    rootElement.setAttribute('data-theme', mode);
  }
}
