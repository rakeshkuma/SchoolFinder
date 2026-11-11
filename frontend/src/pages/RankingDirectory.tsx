import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PaidLabel } from '../components/common/Badges';
import { MoreFilters } from '../components/common/FilterSheet';
import { Icon, type IconName } from '../components/common/Icon';
import { Pagination } from '../components/common/Pagination';
import { EmptyState, ErrorState, SkeletonCards, Spinner } from '../components/common/States';
import { RankingShell } from '../components/ranking/RankingShell';
import { SchoolImage } from '../components/school/SchoolImage';
import { useApi } from '../hooks/useApi';
import { directoryService, type DirectoryCategory, type DirectoryFacet, type DirectoryFacets, type DirectorySchool, type DirectorySummary } from '../services/publicApi';
import { formatDate } from '../utils/format';
import { NotFoundPage } from './InfoPages';

const PAGE_SIZE = 24;

export const BOARD_LABEL: Record<string, string> = { CBSE: 'CBSE', CISCE: 'ICSE / ISC', IB: 'IB', CAMBRIDGE: 'Cambridge', STATE: 'State board', OTHER: 'Other curriculum' };
const RESIDENCE_LABEL: Record<string, string> = { BOARDING: 'Boarding', DAY_CUM_BOARDING: 'Day-cum-boarding', DAY: 'Day school' };
const GENDER_LABEL: Record<string, string> = { BOYS: 'Boys', GIRLS: 'Girls', CO_ED: 'Co-ed' };
const GENDER_WORD: Record<string, string> = { BOYS: 'boys’', GIRLS: 'girls’', CO_ED: 'co-educational' };
const RESIDENCE_WORD: Record<string, string> = { BOARDING: 'boarding school', DAY_CUM_BOARDING: 'day-cum-boarding school', DAY: 'day school' };
const CLASS_NAMES = ['Pre-primary', ...Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`)];
const SORTS: [string, string][] = [['', 'School name (A to Z)'], ['state', 'State'], ['city', 'City'], ['fee', 'Approx. fee, lowest first']];

/** How each view looks on the rankings home page. Views not listed here (Cambridge) have pages but no card. */
const CARD_LOOK: Record<string, { icon: IconName; tone: string }> = {
  'top-premier-schools': { icon: 'trophy', tone: 'from-amber-400 to-orange-500' },
  'boarding-schools': { icon: 'home', tone: 'from-brand-500 to-violet-600' },
  'boys-boarding-schools': { icon: 'users', tone: 'from-sky-500 to-brand-600' },
  'girls-boarding-schools': { icon: 'users', tone: 'from-rose-400 to-fuchsia-600' },
  'co-ed-boarding-schools': { icon: 'users', tone: 'from-teal-400 to-emerald-600' },
  'international-schools': { icon: 'globe', tone: 'from-indigo-400 to-sky-600' },
  'cbse-schools': { icon: 'graduation', tone: 'from-blue-500 to-indigo-600' },
  'icse-schools': { icon: 'book', tone: 'from-violet-500 to-purple-700' },
  'ib-schools': { icon: 'sparkle', tone: 'from-cyan-500 to-teal-600' },
  'alternative-schools': { icon: 'sun', tone: 'from-lime-500 to-emerald-600' },
};

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

/** A fact chip. One the school's own sources have not confirmed yet has a dashed outline and says so to screen readers. */
function Fact({ children, confirmed }: { children: ReactNode; confirmed: boolean }) {
  return confirmed
    ? <span className="chip bg-slate-100 text-slate-700">{children}</span>
    : (
      <span className="chip border border-dashed border-slate-300 bg-white text-slate-600" title="Not yet confirmed with the school">
        {children}<span aria-hidden className="ml-0.5 text-slate-400">?</span><span className="sr-only"> (not yet confirmed)</span>
      </span>
    );
}

export function ConfirmLegend() {
  return (
    <p className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
      <span className="chip border border-dashed border-slate-300 bg-white text-slate-600">Example<span aria-hidden className="ml-0.5 text-slate-400">?</span></span>
      Details with a dashed outline are from our directory and not yet confirmed with the school. Fees are estimates: confirm them with the school.
    </p>
  );
}

/** A school card. The rank shown is a publisher’s own, with its source; the directory itself has no ranks. */
export function DirectorySchoolCard({ s, priority = false }: { s: DirectorySchool; priority?: boolean }) {
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

/** The search and live counts in the rankings home page header. */
export function DirectoryHero({ summary }: { summary: DirectorySummary | null }) {
  const navigate = useNavigate();
  const search = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const q = String(new FormData(e.currentTarget).get('q') ?? '').trim();
    navigate(`/rankings/top-premier-schools${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  };
  const stats: [number | undefined, string][] = [
    [summary?.schools, 'schools listed'], [summary?.states, 'states covered'], [summary?.boarding, 'boarding schools'], [summary?.boards, 'education boards'],
  ];
  return (
    <div className="space-y-5">
      <form onSubmit={search} role="search" aria-label="Search schools" className="flex max-w-2xl gap-2 rounded-2xl bg-white/10 p-2 ring-1 ring-white/20 backdrop-blur">
        <label className="min-w-0 flex-1">
          <span className="sr-only">School name, city or state</span>
          <input name="q" maxLength={100} placeholder="Search by school name, city or state"
            className="w-full rounded-xl border-0 bg-white px-4 py-3 text-sm text-ink shadow-sm focus:ring-2 focus:ring-accent-300" />
        </label>
        <button type="submit" className="btn-primary shrink-0 rounded-xl bg-accent-400 px-5 text-ink hover:bg-accent-300">
          <Icon name="search" className="h-4 w-4" /><span className="hidden sm:inline">Search</span><span className="sr-only sm:hidden">Search</span>
        </button>
      </form>
      <dl className="grid max-w-2xl grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(([n, label]) => (
          <div key={label} className="rounded-xl bg-white/10 px-3 py-2 ring-1 ring-white/15">
            <dt className="sr-only">{label}</dt>
            <dd className="font-display text-2xl font-bold text-white">{n === undefined ? '–' : n.toLocaleString('en-IN')}</dd>
            <dd className="text-xs text-blue-100">{label}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The twelve doors into the directory; a view with no schools has no card. */
export function DirectoryCategoryCards({ summary }: { summary: DirectorySummary }) {
  const views = summary.categories.filter((c) => CARD_LOOK[c.slug]);
  const card = (to: string, title: string, description: string, count: string, look: { icon: IconName; tone: string }) => (
    <li key={to}>
      <Link to={to} className="card group flex h-full flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-2 focus-visible:ring-brand-500">
        <span className={`flex h-20 items-center justify-between bg-gradient-to-br ${look.tone} px-4 text-white`} aria-hidden>
          <Icon name={look.icon} className="h-8 w-8 opacity-90" />
          <span className="font-display text-2xl font-bold">{count.split(' ')[0]}</span>
        </span>
        <span className="flex flex-1 flex-col p-4">
          <span className="font-display font-bold text-ink">{title}</span>
          <span className="mt-1 text-sm text-slate-600">{description}</span>
          <span className="mt-3 flex items-center justify-between pt-1 text-sm">
            <span className="text-slate-500">{count}</span>
            <span className="inline-flex items-center gap-1 font-semibold text-brand-700">Explore <Icon name="arrowRight" className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
          </span>
        </span>
      </Link>
    </li>
  );
  const plural = (n: number, one: string, many: string) => `${n.toLocaleString('en-IN')} ${n === 1 ? one : many}`;
  const byTitle = (slug: string) => views.find((v) => v.slug === slug);
  const order = ['top-premier-schools', 'boarding-schools', 'boys-boarding-schools', 'girls-boarding-schools', 'co-ed-boarding-schools',
    'international-schools', 'cbse-schools', 'icse-schools', 'ib-schools'];
  return (
    <section aria-labelledby="dir-cats">
      <h2 id="dir-cats" className="font-display text-2xl font-bold text-ink">Explore by category</h2>
      <p className="mt-1 text-sm text-slate-600">Each category is a view of SchoolDhundo’s premier school directory, listed A to Z.</p>
      <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {order.map(byTitle).filter((c): c is DirectoryCategory => !!c)
          .map((c) => card(`/rankings/${c.slug}`, c.title, c.description, plural(c.schools, 'school', 'schools'), CARD_LOOK[c.slug]))}
        {summary.states > 0 && card('/rankings/schools-by-state', 'State-wise Schools', 'Premier and boarding schools grouped by state.',
          plural(summary.states, 'state', 'states'), { icon: 'map', tone: 'from-orange-400 to-rose-500' })}
        {summary.cities > 0 && card('/rankings/schools-by-city', 'City-wise Schools', 'From hill towns like Mussoorie and Ooty to Mumbai and Bengaluru.',
          plural(summary.cities, 'city', 'cities'), { icon: 'building', tone: 'from-slate-500 to-slate-700' })}
        {byTitle('alternative-schools') && card('/rankings/alternative-schools', byTitle('alternative-schools')!.title, byTitle('alternative-schools')!.description,
          plural(byTitle('alternative-schools')!.schools, 'school', 'schools'), CARD_LOOK['alternative-schools'])}
      </ul>
    </section>
  );
}

/** A first look at the directory on the rankings home page: featured schools first, then A to Z. */
export function DirectoryHighlights({ total }: { total: number }) {
  const schools = useApi(() => directoryService.list({ category: 'top-premier-schools', size: 6 }), []);
  return (
    <section aria-labelledby="dir-top" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="dir-top" className="font-display text-2xl font-bold text-ink">Premier School Directory</h2>
          <p className="mt-1 text-sm text-slate-600">India’s leading boarding and day schools, chosen by SchoolDhundo and listed A to Z. A rank appears only where an independent publisher has one.</p>
        </div>
        <Link to="/rankings/top-premier-schools" className="btn-secondary">Browse all {total} schools</Link>
      </div>
      <ConfirmLegend />
      {schools.error ? <ErrorState error={schools.error} onRetry={schools.reload} />
        : !schools.data ? <SkeletonCards count={6} /> : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {schools.data.content.map((s, i) => <li key={s.id}><DirectorySchoolCard s={s} priority={i < 3} /></li>)}
          </ul>
        )}
    </section>
  );
}

/** Space for school partnerships. Nothing paid is shown yet, and paid placement is always labelled and never a rank. */
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
        <ConfirmLegend />
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
      <section aria-labelledby="dir-about" className="card p-5 text-sm text-slate-700">
        <h2 id="dir-about" className="font-semibold text-ink">About this list</h2>
        <p className="mt-1">
          These schools come from SchoolDhundo’s premier and boarding school directory. They are listed A to Z and are not ranked by SchoolDhundo.
          Where an independent publisher has ranked a school, its rank, publisher and year are shown on the card. Board, boarding and gender
          were checked against each school’s official website or its CBSE / CISCE record; anything not yet confirmed has a dashed outline.
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
