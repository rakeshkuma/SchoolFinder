import { useState } from 'react';

/**
 * The member's Google profile photo when there is one, else initials in a circle. Decorative, so the name must also
 * appear in text nearby. Google's image host is sent no referrer; a photo that fails to load falls back to initials.
 */
export function Avatar({ name, pictureUrl, size = 'sm' }: { name: string; pictureUrl?: string | null; size?: 'sm' | 'lg' }) {
  const [failed, setFailed] = useState(false);
  const box = size === 'lg' ? 'h-14 w-14 text-lg' : 'h-8 w-8 text-xs';
  if (pictureUrl && !failed) {
    return (
      <img src={pictureUrl} alt="" aria-hidden referrerPolicy="no-referrer" onError={() => setFailed(true)}
        width={size === 'lg' ? 56 : 32} height={size === 'lg' ? 56 : 32}
        className={`shrink-0 rounded-full object-cover ring-1 ring-slate-200 ${box}`} />
    );
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? '').join('') || '?';
  return (
    <span aria-hidden className={`flex shrink-0 items-center justify-center rounded-full bg-brand-600 font-semibold text-white ${box}`}>
      {initials}
    </span>
  );
}
