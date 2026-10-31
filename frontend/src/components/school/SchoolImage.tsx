import { useEffect, useState, type ReactNode } from 'react';

const PALETTES = [
  ['#1d31a7', '#3b66f5'],
  ['#0f766e', '#14b8a6'],
  ['#7c2d12', '#ea580c'],
  ['#4c1d95', '#8b5cf6'],
  ['#155e75', '#0ea5e9'],
  ['#831843', '#db2777'],
  ['#14532d', '#22c55e'],
  ['#1e293b', '#475569'],
];

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|pm|shri)$/i.test(w));
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '🏫';
}

/**
 * Generated cover used when no official or licensed photo exists — a deterministic colour per school
 * with its monogram. We never show stock or unrelated photos.
 */
export function SchoolCover({ name, className = '', monogram = true, small = false }: { name: string; className?: string; monogram?: boolean; small?: boolean }) {
  const [from, to] = PALETTES[hash(name) % PALETTES.length];
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.14]" aria-hidden>
        <defs>
          <pattern id={`p-${hash(name)}`} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <path d="M0 14h28" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#p-${hash(name)})`} />
      </svg>
      <div className="absolute -bottom-10 -right-6 h-36 w-36 rounded-full bg-white/10" aria-hidden />
      {monogram && (
        <span className={`absolute font-display font-extrabold tracking-tight text-white/95 drop-shadow-sm ${small ? 'bottom-1 left-1.5 text-sm' : 'bottom-3 left-4 text-4xl'}`}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}

/** Tooltip credit for a card photo ("Photo: Author / Wikimedia Commons"); an illustration's note is shown instead. */
export function photoCreditTitle(s: { coverImageCredit: string | null; coverImageIllustrative: boolean }): string | undefined {
  if (!s.coverImageCredit) return undefined;
  return s.coverImageIllustrative ? s.coverImageCredit : `Photo: ${s.coverImageCredit}`;
}

/**
 * Every school photograph: a 16:9 frame the picture fills without stretching, or the school's generated cover when
 * there is no photo or it fails to load. The photo is taken out of the page flow (see .school-image), so a tall picture
 * cannot push its frame taller. A photographer's credit is never drawn over the picture: it is the tooltip here, and
 * the school's profile shows credit, licence and source (a link to the attribution satisfies CC BY / BY-SA). An
 * illustration keeps its label, because that tells the reader it is not a photo of the school.
 */
export function SchoolImage({ src, name, alt = '', credit = null, illustrative = false, priority = false, zoom = true, small = false, className = '', children }: {
  src: string | null | undefined;
  /** the school, for the fallback cover */
  name: string;
  alt?: string;
  credit?: string | null;
  illustrative?: boolean;
  /** above the fold: load straight away */
  priority?: boolean;
  /** enlarge slightly on hovering a card marked `group` */
  zoom?: boolean;
  /** a thumbnail: the fallback cover's letters shrink to fit */
  small?: boolean;
  className?: string;
  /** badges and names drawn over the picture */
  children?: ReactNode;
}) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const showPhoto = !!src && !failed;
  return (
    <div className={`school-image ${className}`}>
      {showPhoto ? (
        <img src={src} alt={alt} loading={priority ? 'eager' : 'lazy'} decoding="async" onError={() => setFailed(true)}
          title={photoCreditTitle({ coverImageCredit: credit, coverImageIllustrative: illustrative })}
          className={zoom ? 'transition duration-500 group-hover:scale-105' : undefined} />
      ) : <div className="absolute inset-0"><SchoolCover name={name} small={small} /></div>}
      {showPhoto && illustrative && credit && (
        <span className="absolute bottom-1 right-1 max-w-[85%] truncate rounded bg-black/55 px-1.5 text-[10px] text-white">{credit}</span>
      )}
      {children}
    </div>
  );
}
