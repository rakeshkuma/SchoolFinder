import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../common/Icon';
import { Pagination } from '../common/Pagination';
import { AsyncContent, EmptyState } from '../common/States';
import { useApi } from '../../hooks/useApi';
import { schoolListService, type SchoolListItem } from '../../services/publicApi';
import { CompareButton } from './CompareBar';
import { SchoolImage } from './SchoolImage';

const PAGE_SIZE = 24;

export const SCHOOL_LIST_NOTE = 'Listed A to Z. This is a guide to schools, not a ranking, so please confirm details with the school.';

function SchoolListCard({ item }: { item: SchoolListItem }) {
  const profile = item.slug ? `/schools/${item.slug}` : null;
  const image = <SchoolImage src={item.imageUrl} name={item.name} credit={item.imageCredit} zoom={false} small className="rounded-lg" />;
  return (
    <li className="card flex gap-3 p-3">
      <span className="w-20 shrink-0 sm:w-24">{profile ? <Link to={profile} tabIndex={-1} aria-hidden>{image}</Link> : image}</span>
      <div className="flex min-w-0 flex-1 flex-col text-sm">
        <h3 className="font-semibold leading-snug text-ink">
          {profile ? <Link to={profile} className="hover:text-brand-700">{item.name}</Link> : item.name}
        </h3>
        <p className="mt-0.5 text-xs text-slate-500">{item.place}</p>
        <p className="mt-1.5 flex flex-wrap gap-1">
          {item.board && <span className="chip bg-brand-50 text-xs font-semibold text-brand-800">{item.board}</span>}
          <span className="chip bg-slate-100 text-xs text-slate-700">{item.type}</span>
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          {profile && <Link to={profile} className="link text-xs font-semibold">View School Details</Link>}
          {item.websiteUrl && (
            <a href={item.websiteUrl} target="_blank" rel="noopener noreferrer" className="link text-xs font-semibold">
              Official website<span className="sr-only"> of {item.name} (opens in a new tab)</span>
            </a>
          )}
          {item.schoolId !== null && item.slug && <CompareButton id={item.schoolId} name={item.name} slug={item.slug} />}
        </p>
      </div>
    </li>
  );
}

/** A compiled list of schools, kept visibly apart from published rankings: no numbers, A to Z, and labelled as a guide. */
/** `place`: start narrowed to one town (a city page showing its state's list); the visitor's own search replaces it. */
export function SchoolListSection({ listKey, title, place }: { listKey: string; title: string; place?: string }) {
  const [sp, setSp] = useSearchParams();
  const q = sp.get('lq') ?? place;
  const page = Math.max(0, Number(sp.get('lpage')) || 0);
  const items = useApi(() => schoolListService.items(listKey, { q, page, size: PAGE_SIZE }), [listKey, q, page]);
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('lpage' in patch)) next.delete('lpage');
    setSp(next, { replace: true });
  };
  return (
    <section aria-label={title} className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          <p className="mt-1 text-sm text-slate-600">{SCHOOL_LIST_NOTE}</p>
        </div>
        <form role="search" className="flex w-full min-w-0 gap-2 sm:w-72" onSubmit={(e) => { e.preventDefault(); set({ lq: String(new FormData(e.currentTarget).get('lq') ?? '').trim() || undefined }); }}>
          <label className="sr-only" htmlFor={`list-search-${listKey}`}>Search this list by school or place</label>
          <input id={`list-search-${listKey}`} name="lq" className="input min-w-0 flex-1" maxLength={100} placeholder="Search this list" defaultValue={q} key={q} />
          <button type="submit" className="btn-secondary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
        </form>
      </div>
      <AsyncContent state={items} isEmpty={(d) => d.content.length === 0}
        empty={<EmptyState title={`No school called “${q ?? ''}” in this list.`}><button type="button" className="link" onClick={() => set({ lq: undefined })}>Show the whole list</button></EmptyState>}>
        {(data) => (
          <>
            <p className="text-sm text-slate-600" aria-live="polite">{data.totalElements.toLocaleString('en-IN')} {data.totalElements === 1 ? 'school' : 'schools'}</p>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">{data.content.map((item) => <SchoolListCard key={item.id} item={item} />)}</ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ lpage: p > 0 ? String(p) : undefined })} />
          </>
        )}
      </AsyncContent>
    </section>
  );
}
