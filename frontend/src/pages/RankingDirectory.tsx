import { useState, type ReactNode } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PaidLabel } from '../components/common/Badges';
import { MoreFilters } from '../components/common/FilterSheet';
import { Icon } from '../components/common/Icon';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, ErrorState, SkeletonCards, Spinner } from '../components/common/States';
import { RankingShell } from '../components/ranking/RankingShell';
import { SchoolImage } from '../components/school/SchoolImage';
import { useApi } from '../hooks/useApi';
import { directoryService, type DirectoryFacet, type DirectoryFacets, type DirectoryGuide, type DirectorySchool } from '../services/publicApi';
import { formatDate } from '../utils/format';
import { NotFoundPage } from './InfoPages';

const PAGE_SIZE = 24;

const BOARD_LABEL: Record<string, string> = { CBSE: 'CBSE', CISCE: 'ICSE / ISC', IB: 'IB', CAMBRIDGE: 'Cambridge', STATE: 'State board', OTHER: 'Other curriculum' };
const RESIDENCE_LABEL: Record<string, string> = { BOARDING: 'Boarding', DAY_CUM_BOARDING: 'Day-cum-boarding', DAY: 'Day school' };
const GENDER_LABEL: Record<string, string> = { BOYS: 'Boys', GIRLS: 'Girls', CO_ED: 'Co-ed' };
const GENDER_WORD: Record<string, string> = { BOYS: 'boys’', GIRLS: 'girls’', CO_ED: 'co-educational' };
const RESIDENCE_WORD: Record<string, string> = { BOARDING: 'boarding school', DAY_CUM_BOARDING: 'day-cum-boarding school', DAY: 'day school' };
const CLASS_NAMES = ['Pre-primary', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SORTS: [string, string][] = [['', 'School name (A to Z)'], ['state', 'State'], ['city', 'City'], ['fee', 'Approx. fee, lowest first']];

/** "₹14.5 lakh" or "₹80,000". */
export function inr(n: number) {
  return n >= 100000 ? `₹${(n / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })} lakh` : `₹${n.toLocaleString('en-IN')}`;
}

/** The directory's approximate fee range, always worded as an estimate by the caller. */
export function feeEstimate(s: Pick<DirectorySchool, 'feeMinInr' | 'feeMaxInr' | 'feeText'>) {
  if (s.feeMinInr && s.feeMaxInr) {
    const lakhs = s.feeMinInr >= 100000;
    return lakhs ? `₹${(s.feeMinInr / 100000).toLocaleString('en-IN', { maximumFractionDigits: 1 })}–${inr(s.feeMaxInr).slice(1)} a year`
      : `${inr(s.feeMinInr)}–${inr(s.feeMaxInr)} a year`;
  }
  return s.feeText;
}

/** One plain sentence from the listed facts, e.g. "Boys’ boarding school in Dehradun, Uttarakhand, teaching CBSE." */
export function describe(s: DirectorySchool) {
  const kind = [s.gender ? GENDER_WORD[s.gender] : null, s.residence ? RESIDENCE_WORD[s.residence] : 'school'].filter(Boolean).join(' ');
  const boards = s.boards.filter((b) => b.code !== 'OTHER').map((b) => BOARD_LABEL[b.code]);
  const extra = s.curriculumNote ? [s.curriculumNote] : [];
  const teaching = [...boards, ...extra];
  const where = [s.city, s.stateName].filter(Boolean).join(', ');
  const sentence = `${kind.charAt(0).toUpperCase()}${kind.slice(1)} in ${where}`;
  return teaching.length ? `${sentence}, teaching ${teaching.join(', ').replace(/, ([^,]*)$/, ' and $1')}.` : `${sentence}.`;
}

export const profileLink = (s: DirectorySchool) => (s.slug ? `/schools/${s.slug}` : s.campusSearch ? `/schools?q=${encodeURIComponent(s.campusSearch)}` : null);

/** A fact chip. One the school's own sources have not confirmed yet says so on hover and to screen readers only. */
function Fact({ children, confirmed }: { children: ReactNode; confirmed: boolean }) {
  return (
    <span className="chip bg-slate-100 text-slate-700" title={confirmed ? undefined : 'Not yet confirmed with the school'}>
      {children}{!confirmed && <span className="sr-only"> (not yet confirmed)</span>}
    </span>
  );
}

/** A school card. The rank shown is a publisher’s own, with its source; the directory itself has no ranks. */
function DirectorySchoolCard({ s, priority = false }: { s: DirectorySchool; priority?: boolean }) {
  const link = profileLink(s);
  const fee = feeEstimate(s);
  const where = [s.city, s.stateName].filter(Boolean).join(', ');
  return (
    <article className="card group flex h-full flex-col overflow-hidden">
      <div className="relative">
        <SchoolImage src={s.imageUrl} name={s.name} credit={s.imageCredit} priority={priority} className="aspect-[16/9]"
          alt={s.imageUrl ? `${s.name}, ${where}` : ''} />
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          {s.sponsored && <PaidLabel />}
          {s.featured && !s.sponsored && <span className="chip bg-white/95 font-semibold text-brand-700 shadow-sm">Featured</span>}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        {s.rank && (
          <p className="flex flex-wrap items-center gap-2 text-sm">
            <span className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg bg-amber-100 px-2 font-display font-bold text-amber-900">#{s.rank.rank}</span>
            <span className="text-slate-600">
              in {s.rank.publisher} {s.rank.year} (India){s.rank.sourceUrl && <> · <a href={s.rank.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">source</a></>}
            </span>
          </p>
        )}
        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-ink">
            {link ? <Link to={link} className="hover:text-brand-700">{s.name}</Link> : s.name}
          </h3>
          <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600"><Icon name="pin" className="h-4 w-4 shrink-0 text-slate-400" />{where}</p>
        </div>
        <div className="flex flex-wrap gap-1.5 text-xs">
          {s.boards.filter((b) => b.code !== 'OTHER').map((b) => <Fact key={b.code} confirmed={b.confirmed}>{BOARD_LABEL[b.code]}</Fact>)}
          {s.curriculumNote && <Fact confirmed={false}>{s.curriculumNote}</Fact>}
          {s.residence && <Fact confirmed={s.residenceConfirmed}>{RESIDENCE_LABEL[s.residence]}</Fact>}
          {s.gender && <Fact confirmed={s.genderConfirmed}>{GENDER_LABEL[s.gender]}</Fact>}
          {s.classesLabel && <Fact confirmed={s.classesConfirmed}>{s.classesLabel}</Fact>}
        </div>
        <p className="text-sm text-slate-600">{describe(s)}</p>
        {fee && (
          <p className="text-sm">
            <span className="font-semibold text-ink">Approx. fee:</span> <span className="text-slate-700">{fee}</span>{' '}
            <span className="text-xs text-slate-500">(estimate, confirm with the school)</span>
          </p>
        )}
        <p className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-slate-100 pt-3 text-sm">
          {s.slug && <Link to={`/schools/${s.slug}`} className="link font-semibold">View School Details</Link>}
          {!s.slug && s.campusSearch && <Link to={link!} className="link font-semibold">Find its campuses</Link>}
          {s.websiteUrl && s.websiteChecked && (
            <a href={s.websiteUrl} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
              Official website <Icon name="external" className="h-3.5 w-3.5" /><span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </p>
      </div>
    </article>
  );
}

export function PartnerCard() {
  return (
    <section aria-labelledby="dir-partner" className="card flex flex-col gap-3 bg-gradient-to-br from-brand-50 to-white p-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h2 id="dir-partner" className="font-display text-lg font-bold text-ink">For schools: update your listing or partner with us</h2>
        <p className="mt-1 text-sm text-slate-600">
          Schools can correct their details or ask about featured profiles. Featured and sponsored listings are always labelled, and never change a published rank.
        </p>
      </div>
      <Link to="/contact" className="btn-primary shrink-0">Contact SchoolDhundo</Link>
    </section>
  );
}

function FilterSelect({ label, value, options, onChange, empty }: {
  label: string; value: string; options: [string, string][]; onChange: (v: string | undefined) => void; empty: string;
}) {
  return (
    <label className="block min-w-0">
      <span className="label">{label}</span>
      <select className="input" value={value} onChange={(e) => onChange(e.target.value || undefined)}>
        <option value="">{empty}</option>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

const withCount = (f: DirectoryFacet): [string, string] => [f.code, `${f.name} (${f.schools})`];
const FILTER_KEYS = ['q', 'state', 'city', 'board', 'residence', 'gender', 'section', 'class', 'sort'] as const;

/**
 * Search plus the filters that have something to choose between in this view. Each choice shows how many schools it
 * leaves; a filter with only one possible answer is not shown.
 */
function DirectoryFilters({ facets, total, sp, set, category }: {
  facets: DirectoryFacets; total: number | undefined; sp: URLSearchParams; set: (patch: Record<string, string | undefined>) => void; category: string;
}) {
  const v = (k: string) => sp.get(k) ?? '';
  const cities = facets.cities.filter((c) => !v('state') || c.stateCode === v('state'));
  const shows = (n: number, key: string) => n > 1 || !!v(key);
  const more = ['residence', 'gender', 'section', 'class', 'sort'].filter((k) => v(k)).length;
  const anySet = FILTER_KEYS.some((k) => v(k));
  const clear = () => set(Object.fromEntries(FILTER_KEYS.map((k) => [k, undefined])));
  const [q, setQ] = useState(v('q'));
  const extra = (
    <div className="grid gap-3">
      {shows(facets.residences.length, 'residence') && !category.includes('boarding') && (
        <FilterSelect label="School type" value={v('residence')} empty="Day and boarding" onChange={(x) => set({ residence: x })} options={facets.residences.map(withCount)} />
      )}
      {shows(facets.genders.length, 'gender') && (
        <FilterSelect label="Boys / girls / co-ed" value={v('gender')} empty="All" onChange={(x) => set({ gender: x })} options={facets.genders.map(withCount)} />
      )}
      {shows(facets.sections.length, 'section') && (
        <FilterSelect label="School category" value={v('section')} empty="All categories" onChange={(x) => set({ section: x })} options={facets.sections.map(withCount)} />
      )}
      {shows(facets.classes.length, 'class') && (
        <FilterSelect label="Class" value={v('class')} empty="Any class" onChange={(x) => set({ class: x })}
          options={facets.classes.map((c) => [String(c), CLASS_NAMES[c]])} />
      )}
      <FilterSelect label="Sort by" value={v('sort')} empty={SORTS[0][1]} onChange={(x) => set({ sort: x })} options={SORTS.slice(1)} />
    </div>
  );
  return (
    <section aria-label="Search and filter" className="card space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <form role="search" className="flex min-w-0 items-end gap-2" onSubmit={(e) => { e.preventDefault(); set({ q: q.trim() || undefined }); }}>
          <label className="block min-w-0 flex-1">
            <span className="label">Search</span>
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} maxLength={100} placeholder="School name, city or state" />
          </label>
          <button type="submit" className="btn-secondary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
        </form>
        {shows(facets.states.length, 'state')
          ? <FilterSelect label="State" value={v('state')} empty="All states" onChange={(x) => set({ state: x, city: undefined })} options={facets.states.map(withCount)} />
          : <span className="hidden md:block" />}
        {shows(cities.length, 'city')
          ? <FilterSelect label="City" value={v('city')} empty="All cities" onChange={(x) => set({ city: x })} options={cities.map(withCount)} />
          : <span className="hidden md:block" />}
        {shows(facets.boards.length, 'board')
          ? <FilterSelect label="School board" value={v('board')} empty="All boards" onChange={(x) => set({ board: x })} options={facets.boards.map(withCount)} />
          : <span className="hidden md:block" />}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <MoreFilters activeCount={more} resultLabel={total === undefined ? undefined : `${total} ${total === 1 ? 'school' : 'schools'}`} onClearAll={clear}>
          {extra}
        </MoreFilters>
        {anySet && <button type="button" className="text-sm font-semibold text-brand-700 hover:underline" onClick={() => { setQ(''); clear(); }}>Clear all</button>}
      </div>
    </section>
  );
}

/** Views with an explainer in the backend's DirectoryGuides (the curricula most parents do not know). */
export const GUIDED_VIEWS = new Set(['ib-schools', 'cambridge-schools']);

/**
 * A view's explainer below its list: what the curriculum is, how to check a school, the questions parents ask (the page's
 * FAQPage data describes these same questions) and the official sources, all as the server sends them.
 */
export function DirectoryGuidePanel({ guide }: { guide: DirectoryGuide }) {
  return (
    <section aria-labelledby="dir-guide" className="card space-y-4 p-5 text-sm leading-relaxed text-slate-700">
      <div>
        <h2 id="dir-guide" className="font-display text-xl font-bold text-ink">{guide.heading}</h2>
        <p className="mt-1 text-slate-600">{guide.intro}</p>
      </div>
      {guide.sections.map((s) => (
        <div key={s.heading}>
          <h3 className="font-semibold text-ink">{s.heading}</h3>
          {s.paragraphs.map((p) => <p key={p} className="mt-1">{p}</p>)}
          {s.points.length > 0 && <ul className="mt-2 list-disc space-y-1 pl-5">{s.points.map((p) => <li key={p}>{p}</li>)}</ul>}
        </div>
      ))}
      <div>
        <h3 className="font-semibold text-ink">Questions parents ask</h3>
        <dl className="mt-2 space-y-3">
          {guide.faqs.map((f) => (
            <div key={f.question}>
              <dt className="font-medium text-ink">{f.question}</dt>
              <dd className="mt-0.5">{f.answer}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="border-t border-slate-100 pt-3 text-xs text-slate-500">
        <p>Checked against these official sources on {formatDate(guide.checkedOn)}:</p>
        <ul className="mt-1 space-y-0.5">
          {guide.sources.map((s) => (
            <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="link">{s.title} <span aria-hidden>↗</span></a></li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/** A directory view such as /rankings/girls-boarding-schools: filters, cards and pages, all from the database. */
export function DirectoryCategoryPage({ slug }: { slug: string }) {
  const summary = useApi(() => directoryService.summary(), []);
  const facets = useApi(() => directoryService.facets(slug), [slug]);
  const [sp, setSp] = useSearchParams();
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, val]) => (val ? next.set(k, val) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: !('page' in patch) });
  };
  const page = Math.max(0, (Number(sp.get('page')) || 1) - 1);
  const opt = (k: string) => sp.get(k) || undefined;
  const cls = sp.get('class');
  const params = { category: slug, q: opt('q'), state: opt('state'), city: opt('city'), board: opt('board'), residence: opt('residence'),
    gender: opt('gender'), section: opt('section'), class: cls ? Number(cls) : undefined, sort: opt('sort'), page, size: PAGE_SIZE };
  const schools = useApi(() => directoryService.list(params), [JSON.stringify(params)]);
  const guide = useApi(() => directoryService.guide(slug), [slug], GUIDED_VIEWS.has(slug));
  if (summary.error || facets.error) {
    const e = summary.error ?? facets.error;
    return e && 'status' in e && e.status === 404 ? <NotFoundPage /> : <div className="container-page py-10"><ErrorState error={e!} /></div>;
  }
  if (!summary.data) return <Spinner label="Loading schools…" />;
  const category = summary.data.categories.find((c) => c.slug === slug);
  if (!category) return <NotFoundPage />;
  const total = schools.data?.totalElements;
  const others = summary.data.categories.filter((c) => c.slug !== slug);
  return (
    <RankingShell title={category.title.includes('India') ? category.title : `${category.title} in India`} heading={category.title} subtitle={category.description}
      description={`${category.description} ${category.schools} schools, with board, boarding, gender and an approximate fee.`}
      crumbs={[{ to: `/rankings/${slug}`, label: category.title }]}>
      {facets.data ? <DirectoryFilters facets={facets.data} total={total} sp={sp} set={set} category={slug} /> : <SkeletonCards count={1} />}
      <div className="space-y-3">
        <div aria-live="polite" className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="font-display text-xl font-bold text-ink">
            {total === undefined ? 'Schools' : `${total.toLocaleString('en-IN')} ${total === 1 ? 'school' : 'schools'}`}
          </h2>
          {summary.data.checkedOn && <p className="text-xs text-slate-500">Details checked {formatDate(summary.data.checkedOn)}</p>}
        </div>
      </div>
      {schools.error ? <ErrorState error={schools.error} onRetry={schools.reload} /> : !schools.data ? <SkeletonCards count={6} />
        : schools.data.content.length === 0 ? (
          <EmptyState title="No school matches these filters.">
            Try fewer filters, or <Link to="/schools" className="link">search the full school directory</Link>.
          </EmptyState>
        ) : (
          <>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {schools.data.content.map((s, i) => <li key={s.id}><DirectorySchoolCard s={s} priority={i < 3} /></li>)}
            </ul>
            <Pagination page={schools.data.page} totalPages={schools.data.totalPages} onChange={(p) => set({ page: p > 0 ? String(p + 1) : undefined })} />
          </>
        )}
      {guide.data && <DirectoryGuidePanel guide={guide.data} />}
      <section aria-labelledby="dir-about" className="card p-5 text-sm text-slate-700">
        <h2 id="dir-about" className="font-semibold text-ink">About this list</h2>
        <p className="mt-1">
          These schools come from SchoolDhundo’s premier and boarding school directory. They are listed A to Z and are not ranked by SchoolDhundo.
          Where an independent publisher has ranked a school, its rank, publisher and year are shown on the card. Board, boarding and gender
          are being checked against each school’s official website and its CBSE / CISCE record, so please confirm details with the school.
          Fees are approximate yearly ranges. <Link to="/rankings/methodology" className="link">How rankings are shown</Link>
        </p>
      </section>
      {others.length > 0 && (
        <nav aria-labelledby="dir-more" className="space-y-2">
          <h2 id="dir-more" className="section-title">More categories</h2>
          <ul className="flex flex-wrap gap-2">
            {others.map((c) => (
              <li key={c.slug}>
                <Link to={`/rankings/${c.slug}`} className="chip border border-slate-200 bg-white px-3 py-1.5 text-sm text-ink hover:border-brand-300">
                  {c.title} <span className="text-slate-500">{c.schools}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <PartnerCard />
    </RankingShell>
  );
}

/** Directory schools grouped by state or by city; each place opens the full directory filtered to it. */
export function DirectoryPlacesPage({ kind }: { kind: 'state' | 'city' }) {
  const facets = useApi(() => directoryService.facets(), []);
  const city = kind === 'city';
  const title = city ? 'City-wise Schools' : 'State-wise Schools';
  const places = (city ? facets.data?.cities : facets.data?.states) ?? [];
  const states = new Map((facets.data?.states ?? []).map((s) => [s.code, s.name]));
  const href = (p: DirectoryFacet) => `/rankings/top-premier-schools?state=${city ? p.stateCode : p.code}${city ? `&city=${encodeURIComponent(p.code)}` : ''}`;
  return (
    <RankingShell title={`Premier and boarding schools by ${kind}`} heading={title}
      subtitle={city ? 'India’s premier and boarding schools, grouped by the city or town they are in.' : 'India’s premier and boarding schools, grouped by state.'}
      description={`India's premier and boarding schools grouped by ${kind}.`} crumbs={[{ to: `/rankings/schools-by-${kind}`, label: title }]}>
      {facets.error ? <ErrorState error={facets.error} onRetry={facets.reload} /> : !facets.data ? <SkeletonCards count={8} /> : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[...places].sort((a, b) => b.schools - a.schools || a.name.localeCompare(b.name)).map((p) => (
            <li key={`${p.stateCode}-${p.code}`}>
              <Link to={href(p)} className="card card-hover flex items-center justify-between gap-3 p-4">
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{p.name}</span>
                  {city && p.stateCode && <span className="block text-xs text-slate-500">{states.get(p.stateCode)}</span>}
                </span>
                <span className="rounded-lg bg-brand-50 px-2 py-1 text-sm font-bold text-brand-700">{p.schools}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      <PartnerCard />
    </RankingShell>
  );
}
