import { useState } from 'react';
import type { SchoolImage } from '../../types/api';
import { EmptyState } from '../common/States';

/** Gallery of official or licensed photos, each with its attribution, licence and source. */
export function ImageGallery({ images }: { images: SchoolImage[] }) {
  const gallery = images.filter((i) => i.imageType !== 'LOGO');
  const [active, setActive] = useState(0);
  const [broken, setBroken] = useState<Set<number>>(new Set());
  const shown = gallery.filter((i) => !broken.has(i.id));
  if (shown.length === 0) {
    return (
      <EmptyState title="No verified photographs yet.">
        We only publish photos from the school’s official sources or with a clear licence. Schools can contact us to provide them.
      </EmptyState>
    );
  }
  const current = shown[Math.min(active, shown.length - 1)];
  const hide = (id: number) => setBroken((b) => new Set(b).add(id));
  return (
    <div>
      <figure className="card relative overflow-hidden">
        <img src={current.url} alt={current.altText} onError={() => hide(current.id)}
          className="max-h-[480px] w-full bg-slate-100 object-contain" />
        {current.illustrative && (
          <span className="absolute left-3 top-3 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
            Illustration, not a photo of this school
          </span>
        )}
        <figcaption className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs text-slate-600">
          <span>{current.caption ?? current.altText}</span>
          <span>
            {current.attributionText ?? <>{current.credit && <>© {current.credit} · </>}{current.license}</>} ·{' '}
            <a href={current.sourceUrl} target="_blank" rel="noopener noreferrer nofollow" className="underline">source</a>
          </span>
        </figcaption>
      </figure>
      {shown.length > 1 && (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {shown.map((img, i) => (
            <button key={img.id} type="button" onClick={() => setActive(i)} aria-label={`Show photo ${i + 1}`}
              className={`h-16 w-24 flex-none overflow-hidden rounded-lg border-2 ${img.id === current.id ? 'border-brand-600' : 'border-transparent'}`}>
              <img src={img.thumbnailUrl ?? img.url} alt="" loading="lazy" onError={() => hide(img.id)}
                className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
