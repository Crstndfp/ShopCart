export interface RhinoLoaderOverlayProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
}

export function RhinoLoaderOverlay({
  isOpen,
  title = 'Procesando Ajuste en SQL Server...',
  subtitle = 'Asentando movimiento inmutable en el Kardez',
}: RhinoLoaderOverlayProps) {
  if (!isOpen) return null;

  return (
    <div
      role="alert"
      aria-busy="true"
      aria-live="assertive"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/75 p-4 backdrop-blur-md transition-all duration-300 animate-in fade-in"
    >
      <div className="relative flex flex-col items-center rounded-3xl border border-brand-400/40 bg-surface/95 px-8 py-10 shadow-2xl ring-1 ring-white/10 max-w-sm w-full text-center">
        {/* Animated Glowing Ring Backdrop */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="absolute h-36 w-36 rounded-full bg-brand-500/20 blur-xl animate-pulse" />

          {/* Spinner Border Orbit */}
          <div className="absolute h-32 w-32 rounded-full border-2 border-brand-500/20 border-t-brand-400 border-r-emerald-400 animate-spin" />

          {/* Stylized Rhinoceros Head Profile SVG (Facing Right) */}
          <div className="relative z-10 flex h-24 w-24 items-center justify-center rounded-full bg-navy-950/80 border border-brand-500/40 shadow-inner">
            <svg
              viewBox="0 0 100 100"
              className="h-16 w-16 text-brand-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              fill="currentColor"
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Perfil de Rinoceronte Pentandra"
            >
              {/* Armored Neck & Head Base */}
              <path
                d="M 16 80 
                   C 14 62, 20 42, 32 30 
                   L 30 18 
                   C 32 14, 38 15, 40 22 
                   L 44 26 
                   C 48 24, 54 26, 58 29 
                   /* Secondary Horn */
                   L 65 18 
                   C 66 22, 65 27, 63 32 
                   /* Bridge to Main Horn */
                   L 69 35 
                   /* Main Large Horn - Sharp curve up-forward */
                   C 76 26, 86 12, 94 8 
                   C 92 18, 86 35, 82 44 
                   /* Snout & Lip */
                   C 86 49, 88 56, 84 62 
                   C 80 66, 73 66, 68 64 
                   /* Chin & Throat */
                   L 58 68 
                   C 46 75, 34 82, 22 84 
                   Z"
                fill="currentColor"
                opacity="0.95"
              />

              {/* Rhino Eye */}
              <circle cx="50" cy="38" r="3" fill="#0f172a" />
              <circle cx="49" cy="37" r="1" fill="#38bdf8" />

              {/* Horn Highlights & Accent Lines */}
              <path
                d="M 76 28 C 83 18, 89 12, 93 9"
                stroke="#34d399"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 64 22 C 65 25, 64 28, 63 31"
                stroke="#34d399"
                strokeWidth="1"
                strokeLinecap="round"
                fill="none"
              />

              {/* Neck Armor Segment Folds */}
              <path
                d="M 28 42 C 24 54, 23 68, 25 78"
                stroke="#0f172a"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />
              <path
                d="M 37 40 C 34 52, 34 64, 38 74"
                stroke="#0f172a"
                strokeWidth="1.8"
                strokeLinecap="round"
                fill="none"
              />

              {/* Ear Detail */}
              <path
                d="M 33 22 C 34 18, 37 19, 38 24"
                stroke="#0f172a"
                strokeWidth="1.2"
                fill="none"
              />
            </svg>
          </div>
        </div>

        {/* Text Details */}
        <h3 className="text-base font-bold text-white tracking-tight">
          {title}
        </h3>
        <p className="mt-1.5 text-xs text-brand-300 font-mono">
          {subtitle}
        </p>

        {/* Brand Stamp */}
        <div className="mt-5 inline-flex items-center gap-1.5 rounded-full border border-brand-400/30 bg-navy-950/60 px-3 py-1 font-mono text-[10px] text-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
          Grupo Pentandra · Don Arturo
        </div>
      </div>
    </div>
  );
}
