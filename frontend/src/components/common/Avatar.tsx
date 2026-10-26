/** Initials in a circle; decorative, so the name must also appear in text nearby. */
export function Avatar({ name, size = 'sm' }: { name: string; size?: 'sm' | 'lg' }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white ${size === 'lg' ? 'h-14 w-14 text-lg' : 'h-8 w-8 text-xs'}`}>
      {initials}
    </span>
  );
}
