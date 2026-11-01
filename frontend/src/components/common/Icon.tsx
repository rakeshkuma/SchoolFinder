import type { SVGProps } from 'react';

/** Small inline stroke icon set (24×24, currentColor) so the UI needs no icon library. */
const PATHS = {
  search: 'M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z',
  pin: 'M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11zm0-8.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  rupee: 'M7 4h10M7 8.5h10M7 4c4.5 0 7 1.6 7 4.5S11.5 13 7 13l8 7',
  calendar: 'M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  chart: 'M4 20V10m6 10V4m6 16v-7m4 7H2',
  scale: 'M12 3v18M5 7l-3 7a3.5 3.5 0 0 0 6 0L5 7zm14 0-3 7a3.5 3.5 0 0 0 6 0l-3-7zM5 7h14M8 21h8',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6l8-3zm-3.5 9 2.5 2.5 4.5-5',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  map: 'M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2zm0 0v14m6-12v14',
  list: 'M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  arrowRight: 'M5 12h14m-6-6 6 6-6 6',
  check: 'M5 12.5 10 17l9-10',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9L12 3.5z',
  building: 'M4 21V8l8-5 8 5v13M9 21v-6h6v6M3 21h18M9 10h.01M15 10h.01',
  book: 'M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15zm0 15A2.5 2.5 0 0 0 6.5 23H20v-5',
  bus: 'M6 17v2m12-2v2M5 4h14a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm-1 7h16M8 14h.01M16 14h.01',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z',
  external: 'M14 4h6v6m0-6L10 14M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5',
  phone: 'M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1z',
  mail: 'M4 6h16v12H4zM4 6l8 7 8-7',
  globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm-9-9h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-5v-5m0-3h.01',
  filter: 'M4 5h16l-6 7.5V19l-4 2v-8.5L4 5z',
  heart: 'M12 20s-7.5-4.6-9.3-9.2A4.9 4.9 0 0 1 12 6.5a4.9 4.9 0 0 1 9.3 4.3C19.5 15.4 12 20 12 20z',
  clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-13v4.5l3 2',
  share: 'M12 15V3m0 0L8 7m4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  columns: 'M4 5h16v14H4zM11 5v14',
  graduation: 'M12 4 2 9l10 5 8-4v6h2V9L12 4zm-6 7.5V16c0 1.7 2.7 3 6 3s6-1.3 6-3v-4.5l-6 3-6-3z',
  users: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zm10 9v-1.5a3.5 3.5 0 0 0-2.6-3.4M15.5 4.1a3.5 3.5 0 0 1 0 6.8',
  bolt: 'M13 3 5 13.5h6L10 21l8-10.5h-6L13 3z',
  target: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zm0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10zm0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  repeat: 'M17 3l3 3-3 3M20 6H8a4 4 0 0 0-4 4v1m3 10-3-3 3-3m-3 3h12a4 4 0 0 0 4-4v-1',
  flag: 'M5 21V4m0 0h11l-2 4 2 4H5',
  bookmark: 'M6 3.5h12v17l-6-4.2-6 4.2z',
  chevronDown: 'm6 9 6 6 6-6',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0V4zm0 2H5v1a3 3 0 0 0 3 3m8-4h3v1a3 3 0 0 1-3 3m-4 3v4m-4 4h8m-6-4h4v4h-4z',
  file: 'M7 3h7l5 5v13H7zM14 3v5h5M10 13h6m-6 4h6',
  home: 'M4 11 12 4l8 7v9h-5v-6H9v6H4z',
  layers: 'M12 3 3 8l9 5 9-5-9-5zm-9 9 9 5 9-5M3 16l9 5 9-5',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-13v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4',
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = 'h-5 w-5', ...rest }: { name: IconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round"
      strokeLinejoin="round" aria-hidden="true" className={className} {...rest}>
      <path d={PATHS[name]} />
    </svg>
  );
}
