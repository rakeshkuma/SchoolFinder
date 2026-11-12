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

function initials(name: string): string {
  const words = name.split(/\s+/).filter((w) => /^[A-Za-z]/.test(w) && !/^(the|of|and|pm|shri)$/i.test(w));
  return words.slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '🏫';
}

/**
 * Generated cover used when no official or licensed photo exists: a deterministic colour per school, its monogram on a
 * crest, a drawn school building and, when given, the town. It is plainly an illustration, never a stock or unrelated
 * photo passed off as the school.
 */
export function SchoolCover({ name, caption, className = '', monogram = true, small = false }: {
  name: string; caption?: string | null; className?: string; monogram?: boolean; small?: boolean;
}) {
  const [from, to] = PALETTES[hash(name) % PALETTES.length];
  const id = `p-${hash(name)}`;
  return (
    <div className={`relative h-full w-full overflow-hidden ${className}`} style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}>
      <svg className="absolute inset-0 h-full w-full opacity-[0.12]" aria-hidden>
        <defs>
          <pattern id={id} width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(30)">
            <path d="M0 14h28" stroke="#fff" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#${id})`} />
      </svg>
      <div className="absolute -right-8 -top-12 h-40 w-40 rounded-full bg-white/10" aria-hidden />
      {!small && (
        // A school building: pediment, columns, steps and a flag.
        <svg viewBox="0 0 160 100" className="absolute bottom-0 right-2 h-[62%] w-auto text-white opacity-20" fill="currentColor" aria-hidden>
          <path d="M80 6v14" stroke="currentColor" strokeWidth="2" />
          <path d="M81 6h14l-4 4 4 4H81z" />
          <path d="M80 20 18 46h124z" />
          <rect x="24" y="48" width="112" height="6" rx="1" />
          {[30, 50, 70, 86, 102, 122].map((x) => <rect key={x} x={x} y="56" width="8" height="32" rx="1" />)}
          <rect x="72" y="66" width="16" height="22" rx="8" />
          <rect x="16" y="88" width="128" height="5" rx="1" />
          <rect x="8" y="94" width="144" height="6" rx="1" />
        </svg>
      )}
      {monogram && (small ? (
        <span className="absolute bottom-1 left-1.5 font-display text-sm font-extrabold tracking-tight text-white/95 drop-shadow-sm">{initials(name)}</span>
      ) : (
        <div className="absolute bottom-3 left-4 flex items-end gap-3">
          {/* A crest: a shield with the school's initials. */}
          <span className="relative grid h-14 w-12 place-items-center" aria-hidden>
            <svg viewBox="0 0 48 56" className="absolute inset-0 h-full w-full">
              <path d="M24 2 44 9v17c0 13-8.6 22.6-20 28C12.6 48.6 4 39 4 26V9z" fill="rgba(255,255,255,0.16)" stroke="rgba(255,255,255,0.75)" strokeWidth="2" />
            </svg>
            <span className="relative font-display text-lg font-extrabold tracking-tight text-white">{initials(name)}</span>
          </span>
          {caption && <span className="mb-1 max-w-[11rem] truncate text-xs font-semibold uppercase tracking-wider text-white/85">{caption}</span>}
        </div>
      ))}
    </div>
  );
}

/** Tooltip credit for a card photo ("Photo: Author / Wikimedia Commons"); an illustration's note is shown instead. */
function photoCreditTitle(s: { coverImageCredit: string | null; coverImageIllustrative: boolean }): string | undefined {
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
export function SchoolImage({ src, name, caption, alt = '', credit = null, illustrative = false, priority = false, zoom = true, small = false, className = '', children }: {
  src: string | null | undefined;
  /** the school, for the fallback cover */
  name: string;
  /** a short line for the fallback cover, such as the town */
  caption?: string | null;
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
      ) : <div className="absolute inset-0"><SchoolCover name={name} caption={caption} small={small} /></div>}
      {showPhoto && illustrative && credit && (
        <span className="absolute bottom-1 right-1 max-w-[85%] truncate rounded bg-black/55 px-1.5 text-[10px] text-white">{credit}</span>
      )}
      {children}
    </div>
  );
}
