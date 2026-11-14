import { Link } from 'react-router-dom';
import type { UpdateItem } from '../../services/publicApi';
import { formatDate } from '../../utils/format';
import { Icon } from '../common/Icon';
import { HomePhoto } from './HomePhoto';
import { badgeFor, CATEGORY_LABEL, sourceLabel, updateImage, updateTarget } from './updateVisuals';

/**
 * One school or exam update. The whole card opens the item (its title is the link, stretched over the card); the
 * official source stays a separate link. Every date and badge shown comes from the item itself.
 */
export function UpdateCard({ item }: { item: UpdateItem }) {
  const badge = badgeFor(item);
  const target = updateTarget(item);
  const source = sourceLabel(item);
  const stretched = 'before:absolute before:inset-0 before:rounded-2xl focus-visible:outline-none focus-visible:ring-0 focus-visible:before:ring-2 focus-visible:before:ring-royal-500';
  return (
    <article className="group relative flex min-w-0 gap-3 rounded-2xl bg-white p-3 shadow-[0_10px_28px_-18px_rgba(15,37,87,0.35)] ring-1 ring-slate-200/80 transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_-18px_rgba(15,37,87,0.4)] hover:ring-royal-200 sm:gap-4">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100 sm:h-auto sm:min-h-[140px] sm:w-[36%]">
        {item.imageUrl
          ? <img src={item.imageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
          : <HomePhoto id={updateImage(item)} sizes="(min-width: 640px) 180px, 96px" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
          {badge && <span className={`rounded-md px-2 py-0.5 text-[10.5px] font-extrabold uppercase tracking-wide ${badge.className}`}>{badge.label}</span>}
          <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{CATEGORY_LABEL[item.category]}</span>
        </p>
        <h3 className="mt-1.5 font-display text-[15px] font-extrabold leading-snug text-navy sm:text-[17px]">
          {target && 'internal' in target
            ? <Link to={target.internal} className={stretched}>{item.title}</Link>
            : target ? <a href={target.external} target="_blank" rel="noopener noreferrer" className={stretched}>{item.title}<span className="sr-only"> (official notice, opens in a new tab)</span></a>
              : item.title}
        </h3>
        <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-slate-600" title={item.summary}>{item.summary}</p>
        {item.eventDate && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <Icon name="clock" className="h-3.5 w-3.5 shrink-0 text-flame-600" />
            {item.eventLabel ?? 'Date'}: <time dateTime={item.eventDate}>{formatDate(item.eventDate)}</time>
          </p>
        )}
        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-3">
          <span className="flex items-center gap-1.5 text-xs text-slate-500">
            <Icon name="calendar" className="h-3.5 w-3.5 shrink-0" />
            <span className="sr-only">Published</span>
            <time dateTime={item.publishedOn}>{formatDate(item.publishedOn)}</time>
          </span>
          {item.actionLabel && target && (
            <span aria-hidden className="inline-flex items-center gap-1 rounded-lg bg-royal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm transition group-hover:bg-royal-700">
              {item.actionLabel} <Icon name="arrowRight" className="h-3.5 w-3.5" />
            </span>
          )}
        </div>
        {source && (
          <p className="relative z-10 mt-2 truncate text-[11px] text-slate-500">
            Source:{' '}
            {item.sourceUrl && item.linkPath
              ? <a href={item.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline-offset-2 hover:text-royal-700 hover:underline">{source}<span className="sr-only"> (opens in a new tab)</span></a>
              : source}
          </p>
        )}
      </div>
    </article>
  );
}
