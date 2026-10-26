import type { PracticeFigure, PracticeShape } from '../../types/api';

/**
 * Draws a practice figure (simple shapes on a 100 × 100 grid) as SVG. Figures are data, not markup, so imported
 * questions can never inject anything into the page. Rotation is clockwise about the shape's centre.
 */
function ShapeEl({ s }: { s: PracticeShape }) {
  const fill = s.filled || s.kind === 'dot' ? 'currentColor' : 'none';
  const half = s.size / 2;
  const t = `rotate(${s.rotate} ${s.x} ${s.y})`;
  switch (s.kind) {
    case 'circle':
    case 'dot':
      return <circle cx={s.x} cy={s.y} r={half} fill={fill} stroke="currentColor" strokeWidth={3} />;
    case 'square':
      return <rect x={s.x - half} y={s.y - half} width={s.size} height={s.size} fill={fill} stroke="currentColor" strokeWidth={3} transform={t} />;
    case 'triangle': {
      // Equilateral-looking triangle pointing up, centred on (x, y).
      const h = s.size * 0.866;
      const pts = `${s.x},${s.y - (2 * h) / 3} ${s.x - half},${s.y + h / 3} ${s.x + half},${s.y + h / 3}`;
      return <polygon points={pts} fill={fill} stroke="currentColor" strokeWidth={3} strokeLinejoin="round" transform={t} />;
    }
    case 'arrow':
      // Points up before rotation.
      return (
        <g transform={t} stroke="currentColor" strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none">
          <line x1={s.x} y1={s.y + half} x2={s.x} y2={s.y - half} />
          <polyline points={`${s.x - half * 0.45},${s.y - half * 0.5} ${s.x},${s.y - half} ${s.x + half * 0.45},${s.y - half * 0.5}`} />
        </g>
      );
    case 'line':
      return <line x1={s.x - half} y1={s.y} x2={s.x + half} y2={s.y} stroke="currentColor" strokeWidth={4} strokeLinecap="round" transform={t} />;
    default:
      return null;
  }
}

export function FigureView({ figure, size = 88, className = '' }: { figure: PracticeFigure; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img" aria-label={figure.alt}
      className={`shrink-0 rounded-lg border border-slate-300 bg-white text-ink ${className}`}>
      {figure.shapes.map((s, i) => <ShapeEl key={i} s={s} />)}
    </svg>
  );
}

/** A row of problem figures, ending in a "?" box when the question asks for the next figure. */
export function FigureRow({ figures, asksNext }: { figures: PracticeFigure[]; asksNext: boolean }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3" aria-label="Problem figures">
      {figures.map((f, i) => (
        <div key={i} className="flex flex-col items-center gap-1">
          <FigureView figure={f} />
          <span className="text-xs text-slate-500">{i + 1}</span>
        </div>
      ))}
      {asksNext && (
        <div className="flex flex-col items-center gap-1">
          <span className="flex h-[88px] w-[88px] items-center justify-center rounded-lg border-2 border-dashed border-slate-400 font-display text-3xl font-bold text-slate-500" aria-label="Missing figure">?</span>
          <span className="text-xs text-slate-500">&nbsp;</span>
        </div>
      )}
    </div>
  );
}
