import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { useApi, type ApiState } from '../../hooks/useApi';
import { updateService, type UpdateCategory, type UpdateItem } from '../../services/publicApi';
import type { PageResponse } from '../../types/api';
import { Icon } from '../common/Icon';
import { AsyncContent } from '../common/States';
import { UpdateCard } from './UpdateCard';
import { assignUpdateImages, tickerIcon, UPDATE_TABS, updateTarget } from './updateVisuals';

const HEADING = 'font-display text-[26px] font-extrabold tracking-tight text-navy sm:text-[30px]';

function useReducedMotion() {
  const query = '(prefers-reduced-motion: reduce)';
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(query);
    if (!mq) return undefined;
    const onChange = () => setReduce(mq.matches);
    mq.addEventListener?.('change', onChange);
    return () => mq.removeEventListener?.('change', onChange);
  }, []);
  return reduce;
}

/**
 * The newest updates, scrolling. It stops while the pointer is over it or a link in it has focus, and the button
 * stops it for good; with reduced motion it does not move at all and scrolls by hand instead. If the feed cannot be
 * loaded it says so and offers the pages that hold the same information.
 */
export function LiveTicker({ state }: { state: ApiState<PageResponse<UpdateItem>> }) {
  const reduce = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const list = (state.data?.content ?? []).slice(0, 10);
  const moving = !reduce && !paused && list.length > 0;
  const rows = moving ? [...list, ...list] : list;
  return (
    <section aria-labelledby="live-heading" className="container-wide relative z-10 pt-1 lg:pt-5">
      <div className="flex items-center gap-2 rounded-2xl bg-white p-1.5 shadow-[0_14px_32px_-20px_rgba(15,37,87,0.45)] ring-1 ring-slate-200/80 sm:gap-3">
        <h2 id="live-heading" className="flex shrink-0 items-center gap-1.5 rounded-xl bg-red-600 px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide text-white shadow-[0_8px_16px_-8px_rgba(220,38,38,0.8)] sm:px-3.5 sm:text-xs">
          <Icon name="broadcast" className="h-4 w-4 motion-safe:animate-live-dot" /> Live updates
        </h2>
        {list.length > 0 ? (
          <>
            <div className={`ticker-mask relative min-w-0 flex-1 ${moving ? 'overflow-hidden' : 'no-scrollbar overflow-x-auto'}`}>
              <ul className={`flex w-max items-center ${moving ? 'animate-marquee hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]' : ''}`}
                style={{ '--marquee-duration': `${Math.max(36, list.length * 9)}s` } as CSSProperties}>
                {rows.map((u, i) => {
                  const copy = i >= list.length;
                  const { icon, color } = tickerIcon(u);
                  const target = updateTarget(u);
                  const body = <><Icon name={icon} className={`h-[18px] w-[18px] shrink-0 ${color}`} /> {u.title}</>;
                  const cls = 'flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-semibold text-navy transition hover:text-royal-700 sm:text-sm';
                  return (
                    <li key={`${u.id}-${i}`} aria-hidden={copy || undefined} className="flex shrink-0 items-center">
                      {target && 'internal' in target ? <Link to={target.internal} tabIndex={copy ? -1 : undefined} className={cls}>{body}</Link>
                        : target ? <a href={target.external} target="_blank" rel="noopener noreferrer" tabIndex={copy ? -1 : undefined} className={cls}>{body}</a>
                          : <span className={cls}>{body}</span>}
                      <span aria-hidden className="h-4 w-px bg-slate-300" />
                    </li>
                  );
                })}
              </ul>
            </div>
            {!reduce && (
              <button type="button" onClick={() => setPaused((p) => !p)} aria-pressed={paused}
                aria-label={paused ? 'Play the live updates' : 'Pause the live updates'}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-navy">
                <Icon name={paused ? 'play' : 'pause'} className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <p className="min-w-0 flex-1 px-2 text-sm text-slate-600">
            {state.error ? (
              <>Updates could not be loaded just now. See the <Link to="/exams/calendar" className="link">exam calendar</Link> or{' '}
                <Link to="/admissions" className="link">open admissions</Link>.</>
            ) : state.data ? (
              <>No new updates right now. <Link to="/updates" className="link">See all updates</Link></>
            ) : <span className="block h-4 w-2/3 animate-pulse rounded bg-slate-100" />}
          </p>
        )}
      </div>
    </section>
  );
}

/** "Latest School & Exam Updates": the newest six of a kind, as cards. The All tab shares the ticker's answer. */
export function HomeUpdates({ all }: { all: ApiState<PageResponse<UpdateItem>> }) {
  const [tab, setTab] = useState<UpdateCategory | 'ALL'>('ALL');
  const category = tab === 'ALL' ? undefined : tab;
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKey = (e: KeyboardEvent, i: number) => {
    const last = UPDATE_TABS.length - 1;
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0 : e.key === 'End' ? last : -1;
    if (next < 0) return;
    e.preventDefault();
    setTab(UPDATE_TABS[next].id);
    tabRefs.current[next]?.focus();
  };

  return (
    <section aria-labelledby="updates-heading" className="container-wide pt-8 sm:pt-10">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4">
        <h2 id="updates-heading" className={HEADING}>Latest School &amp; Exam Updates</h2>
        <div role="tablist" aria-label="Kind of update" className="no-scrollbar -mx-4 flex max-w-[calc(100%+2rem)] gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:max-w-full sm:px-0">
          {UPDATE_TABS.map((t, i) => {
            const selected = t.id === tab;
            return (
              <button key={t.id} ref={(el) => { tabRefs.current[i] = el; }} type="button" role="tab" id={`updates-tab-${t.id}`}
                aria-selected={selected} aria-controls="updates-panel" tabIndex={selected ? 0 : -1}
                onClick={() => setTab(t.id)} onKeyDown={(e) => onKey(e, i)}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${selected
                  ? 'bg-royal-600 text-white shadow-[0_8px_18px_-10px_rgba(11,92,213,0.9)]'
                  : 'bg-white text-navy ring-1 ring-slate-200 hover:text-royal-700 hover:ring-royal-200'}`}>
                {t.label}
              </button>
            );
          })}
        </div>
      </div>
      <div id="updates-panel" role="tabpanel" aria-labelledby={`updates-tab-${tab}`} className="mt-5">
        {/* Keyed by tab: a new tab starts empty (or from its own remembered answer), never showing the last tab's cards. */}
        {category ? <CategoryPanel key={category} category={category} /> : <UpdatesGrid state={all} tab="ALL" />}
      </div>
      <p className="mt-5 text-center sm:text-right">
        <Link to={category ? `/updates?category=${category}` : '/updates'} className="inline-flex items-center gap-1.5 rounded-lg font-bold text-royal-700 hover:underline">
          View All Updates <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </p>
    </section>
  );
}

function CategoryPanel({ category }: { category: UpdateCategory }) {
  const state = useApi(() => updateService.list({ category, size: 6 }), [category], true, `home.updates.${category}`);
  return <UpdatesGrid state={state} tab={category} />;
}

function UpdatesGrid({ state, tab }: { state: ApiState<PageResponse<UpdateItem>>; tab: UpdateCategory | 'ALL' }) {
  const label = UPDATE_TABS.find((t) => t.id === tab)?.label ?? 'All';
  return (
    <AsyncContent state={state} loading={<UpdateSkeletons />} isEmpty={(d) => d.content.length === 0}
      empty={<UpdatesMessage text={tab === 'JOB'
        ? 'No job alerts right now. Teaching and school job notices appear here only with their official source.'
        : `No ${tab === 'ALL' ? '' : `${label.toLowerCase()} `}updates right now.`} />}
      fallback={<UpdatesMessage text="Updates could not be loaded just now." />}>
      {(page) => <UpdateGrid items={page.content.slice(0, 6)} phoneLimit={4} />}
    </AsyncContent>
  );
}

/**
 * Cards of one height in equal rows, each with a picture not used by another card in the grid. `phoneLimit` shows only
 * the first few on phones (the home page; the rest are one tap away on /updates).
 */
export function UpdateGrid({ items, phoneLimit }: { items: UpdateItem[]; phoneLimit?: number }) {
  const images = assignUpdateImages(items);
  return (
    <div className="grid auto-rows-fr grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {items.map((u, i) => (
        <div key={u.id} className={phoneLimit !== undefined && i >= phoneLimit ? 'hidden md:block' : undefined}>
          <UpdateCard item={u} image={images.get(u.id)} />
        </div>
      ))}
    </div>
  );
}

function UpdatesMessage({ text }: { text: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600 ring-1 ring-slate-200">
      <p>{text}</p>
      <p className="mt-2">
        <Link to="/exams/calendar" className="link">Exam calendar</Link>{' · '}
        <Link to="/admissions" className="link">Open admissions</Link>{' · '}
        <Link to="/admissions/notifications" className="link">Admission notifications</Link>
      </p>
    </div>
  );
}

function UpdateSkeletons() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden>
      {[0, 1, 2].map((i) => (
        <div key={i} className="flex gap-3 rounded-2xl bg-white p-3 ring-1 ring-slate-200">
          <div className="h-24 w-24 shrink-0 animate-pulse rounded-xl bg-slate-100 sm:h-36 sm:w-[38%]" />
          <div className="flex-1 space-y-2 pt-1">
            <div className="h-3 w-16 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  );
}
