import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { MoreFilters } from '../components/common/FilterSheet';
import { AsyncContent, EmptyState, SkeletonCards } from '../components/common/States';
import { BoardingCard } from '../components/school/BoardingCard';
import { AFFORDABLE_MAX_FEE, BOARDING_COLLECTIONS, SYSTEM_GROUPS } from '../content/boardingCollections';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { boardingService, examService, locationService, rankingService, referenceService, schoolService } from '../services/publicApi';
import type {
  AdmissionStatus, BoardingType, EntranceExam, GenderType, ResidentialSystem, SchoolSearchParams,
} from '../types/api';
import {
  boardingTypeLabel, entranceExamInfo, facilityCategoryLabel, formatMoneyCompact, genderLabel, residentialSystemLabel,
} from '../utils/format';

const PAGE_SIZE = 24;
const TOP_SIZES = [10, 20, 50] as const;
const BUDGETS = [100000, 150000, 300000, 600000, 1000000];
/** URL keys of the directory filters (the page and sort keys are handled separately). */
const FILTER_KEYS = ['q', 'state', 'system', 'gender', 'board', 'type', 'className', 'maxFee', 'exam', 'admission', 'facility'] as const;
/** Filters under "More filters"; State, School type and Annual fee stay in view. */
const MORE_KEYS = ['board', 'className', 'gender', 'type', 'exam', 'admission', 'facility'] as const;

/** "government" / "defence" / "private" or a single system, as the comma-separated list the API expects. */
function systemsFor(value: string | null): string | undefined {
  if (!value) return undefined;
  return SYSTEM_GROUPS[value]?.systems.join(',') ?? value;
}

/** Directory search parameters from the page URL. */
export function boardingSearchParams(sp: URLSearchParams): SchoolSearchParams {
  const num = (k: string) => (sp.get(k) && !Number.isNaN(Number(sp.get(k))) ? Number(sp.get(k)) : undefined);
  const sort = sp.get('sort');
  return {
    boarding: true,
    q: sp.get('q') || undefined,
    state: sp.get('state') || undefined,
    residentialSystem: systemsFor(sp.get('system')),
    genderType: (sp.get('gender') || undefined) as GenderType | undefined,
    board: sp.get('board') || undefined,
    boardingType: (sp.get('type') || undefined) as BoardingType | undefined,
    className: sp.get('className') || undefined,
    maxAnnualFee: num('maxFee'),
    entranceExam: (sp.get('exam') || undefined) as EntranceExam | undefined,
    admissionStatus: (sp.get('admission') || undefined) as AdmissionStatus | undefined,
    facility: sp.get('facility') || undefined,
    sortBy: sort === 'fee' ? 'fee' : sort === 'verified' ? 'verified' : 'name',
    page: Math.max(0, (num('page') ?? 1) - 1),
    size: PAGE_SIZE,
  };
}

function Select({ id, label, value, onChange, children }: {
  id?: string; label: string; value: string; onChange: (v: string) => void; children: React.ReactNode;
}) {
  return (
    <label className="block text-sm" htmlFor={id}>
      <span className="label">{label}</span>
      <select id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)}>{children}</select>
    </label>
  );
}

function TopBoardingSchools() {
  const [size, setSize] = useState<(typeof TOP_SIZES)[number]>(10);
  const ranked = useApi(() => rankingService.list({ boarding: true, includeProvisional: false, size }), [size]);
  return (
    <section aria-labelledby="top-boarding">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Ranked on verified evidence</p>
          <h2 id="top-boarding" className="section-title mt-2">Top boarding schools in India</h2>
        </div>
        <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1" role="group" aria-label="How many schools">
          {TOP_SIZES.map((n) => (
            <button key={n} type="button" aria-pressed={size === n} onClick={() => setSize(n)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${size === n ? 'bg-white text-ink shadow-sm' : 'text-slate-600 hover:text-ink'}`}>
              Top {n}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-5">
        <AsyncContent state={ranked} isEmpty={(d) => d.content.length === 0}
          empty={
            <div className="card p-6 text-sm leading-relaxed text-slate-600">
              <p className="font-semibold text-ink">No boarding school is ranked yet.</p>
              <p className="mt-1">
                A rank needs verified evidence (board results, inspection and safety reports) for most of the published
                criteria, and no boarding school has enough yet. We will not publish an editorial ordering as if it were
                a ranking, and expensive schools are not assumed to be better. Until then, use the collections and the
                directory below, which list schools without ordering them by quality.
              </p>
              <Link to="/rankings/methodology" className="link mt-2 inline-block">How rankings work →</Link>
            </div>
          }>
          {(page) => (
            <ol className="grid gap-3 sm:grid-cols-2">
              {page.content.map((r) => (
                <li key={r.schoolId} className="card flex items-center gap-3 p-4">
                  <span className="font-display text-xl font-extrabold text-ink">#{r.scopePosition}</span>
                  <Link to={`/schools/${r.slug}?tab=ranking`} className="font-medium hover:text-brand-700">{r.schoolName}</Link>
                  <span className="ml-auto text-sm font-semibold tabular-nums">{r.totalScore.toFixed(1)}</span>
                </li>
              ))}
            </ol>
          )}
        </AsyncContent>
      </div>
    </section>
  );
}

export function BoardingPage() {
  useDocumentTitle('Boarding & residential schools in India',
    'Explore India\'s boarding and residential schools — Navodaya, Sainik, Rashtriya Military Schools, RIMC and private boarding schools — with sourced profiles, fees, admissions and entrance-exam guides.');
  const [sp, setSp] = useSearchParams();
  const params = useMemo(() => boardingSearchParams(sp), [sp]);
  const [query, setQuery] = useState(sp.get('q') ?? '');
  useEffect(() => setQuery(sp.get('q') ?? ''), [sp]);

  const results = useApi(() => schoolService.search(params), [JSON.stringify(params)]);
  const systems = useApi(() => boardingService.systems(), []);
  const states = useApi(() => locationService.states(), []);
  const boards = useApi(() => referenceService.boards(), []);
  const exams = useApi(() => examService.all(), []);

  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v); else next.delete(k);
    }
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: false });
  };
  const applyCollection = (p: Record<string, string>) => {
    const next = new URLSearchParams(p);
    setSp(next);
    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const activeFilters = FILTER_KEYS.filter((k) => sp.get(k));
  // Clearing keeps the chosen sort order.
  const clearAll = () => setSp(new URLSearchParams(sp.get('sort') ? { sort: sp.get('sort')! } : {}));
  const chipLabel = (k: (typeof FILTER_KEYS)[number], v: string): string => {
    switch (k) {
      case 'q': return `“${v}”`;
      case 'state': return states.data?.find((x) => x.code === v)?.name ?? v;
      case 'system': return SYSTEM_GROUPS[v]?.label ?? residentialSystemLabel[v as ResidentialSystem] ?? v;
      case 'gender': return genderLabel[v as GenderType] ?? v;
      case 'board': return v === 'CISCE' ? 'ICSE / ISC' : v;
      case 'type': return boardingTypeLabel[v as BoardingType] ?? v;
      case 'className': return `Class ${v}`;
      case 'maxFee': return `Fee up to ${formatMoneyCompact(Number(v))}`;
      case 'exam': return entranceExamInfo[v as EntranceExam]?.label ?? v;
      case 'admission': return v === 'OPEN' ? 'Admissions open' : 'Admissions soon';
      case 'facility': return facilityCategoryLabel[v as keyof typeof facilityCategoryLabel] ?? v;
      default: return v;
    }
  };
  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    set({ q: query.trim() || undefined });
    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const count = (s: ResidentialSystem) => systems.data?.[s];

  return (
    <>
      <PageHeader eyebrow="Boarding & residential" title="Discover India's Best Boarding & Residential Schools"
        subtitle="Explore sourced school profiles, compare fees, understand admissions and prepare for entrance exams — government residential schools, military schools and private boarding schools across India. Listings are not a ranking.">
        <form onSubmit={onSearch} role="search" className="flex max-w-2xl gap-2">
          <label htmlFor="boarding-q" className="sr-only">Search boarding schools</label>
          <input id="boarding-q" className="input flex-1 bg-white text-ink" placeholder="School name, city or state…"
            value={query} onChange={(e) => setQuery(e.target.value)} />
          <button type="submit" className="btn-accent rounded-full px-5"><Icon name="search" className="h-4 w-4" /> Search</button>
        </form>
        <div className="mt-4 flex flex-wrap gap-2">
          <a href="#top-boarding" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Top boarding schools</a>
          <button type="button" onClick={() => applyCollection({ system: 'government' })} className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Government residential</button>
          <button type="button" onClick={() => applyCollection({ maxFee: String(AFFORDABLE_MAX_FEE) })} className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Affordable</button>
          <button type="button" onClick={() => applyCollection({ system: 'defence' })} className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Military schools</button>
          <Link to="/exams" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Admission & exam guides</Link>
          <Link to="/compare" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Compare schools</Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {(exams.data ?? []).map((e) => (
            <Link key={e.slug} to={`/exams/${e.slug}`} className="chip bg-white/5 px-3 py-1 text-xs text-slate-300 ring-1 ring-white/10 hover:bg-white/15">
              <Icon name="book" className="h-3.5 w-3.5" /> {e.shortName} guide
            </Link>
          ))}
        </div>
      </PageHeader>

      <div className="container-page space-y-14 py-10">
        <TopBoardingSchools />

        <section aria-labelledby="collections">
          <p className="eyebrow">Collections</p>
          <h2 id="collections" className="section-title mt-2">Browse by category</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-600">
            Each collection lists every directory school that meets its stated rule, in alphabetical order. Schools of
            different systems — Navodaya, Sainik, military and private — follow different admission and fee models and
            are not directly comparable.
          </p>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {BOARDING_COLLECTIONS.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => applyCollection(c.params)}
                  className="card card-hover h-full w-full p-4 text-left">
                  <span className="font-semibold text-ink">{c.title}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-600">{c.eligibility}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <section id="directory" aria-labelledby="directory-title" className="scroll-mt-24">
          <p className="eyebrow">Directory</p>
          <h2 id="directory-title" className="section-title mt-2">All boarding and residential schools</h2>
          {(() => {
            const stateSelect = (id: string) => (
              <Select id={id} label="State" value={sp.get('state') ?? ''} onChange={(v) => set({ state: v || undefined })}>
                <option value="">All of India</option>
                {(states.data ?? []).filter((x) => x.schoolCount > 0).map((x) => <option key={x.code} value={x.code}>{x.name}</option>)}
              </Select>
            );
            const systemSelect = (id: string) => (
              <Select id={id} label="School type" value={sp.get('system') ?? ''} onChange={(v) => set({ system: v || undefined })}>
                <option value="">All boarding schools</option>
                {Object.entries(SYSTEM_GROUPS).map(([k, g]) => <option key={k} value={k}>{g.label}</option>)}
                <optgroup label="One school system">
                  {(Object.keys(residentialSystemLabel) as ResidentialSystem[]).map((x) => (
                    <option key={x} value={x}>{residentialSystemLabel[x]}{count(x) != null ? ` (${count(x)})` : ''}</option>
                  ))}
                </optgroup>
              </Select>
            );
            const feeSelect = (id: string) => (
              <Select id={id} label="Annual fee" value={sp.get('maxFee') ?? ''} onChange={(v) => set({ maxFee: v || undefined })}>
                <option value="">Any fee</option>
                {BUDGETS.map((b) => <option key={b} value={b}>Up to {formatMoneyCompact(b)}</option>)}
              </Select>
            );
            const more = (
              <>
                <Select id="bm-board" label="Board" value={sp.get('board') ?? ''} onChange={(v) => set({ board: v || undefined })}>
                  <option value="">Any board</option>
                  {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC' : b.code}</option>)}
                </Select>
                <Select id="bm-class" label="Class" value={sp.get('className') ?? ''} onChange={(v) => set({ className: v || undefined })}>
                  <option value="">Any class</option>
                  {['III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((c) => <option key={c} value={c}>Class {c}</option>)}
                </Select>
                <Select id="bm-gender" label="Boys, girls or co-ed" value={sp.get('gender') ?? ''} onChange={(v) => set({ gender: v || undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(genderLabel) as GenderType[]).map((g) => <option key={g} value={g}>{genderLabel[g]}</option>)}
                </Select>
                <Select id="bm-type" label="Boarding arrangement" value={sp.get('type') ?? ''} onChange={(v) => set({ type: v || undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(boardingTypeLabel) as BoardingType[]).map((t) => <option key={t} value={t}>{boardingTypeLabel[t]}</option>)}
                </Select>
                <Select id="bm-exam" label="Entrance exam" value={sp.get('exam') ?? ''} onChange={(v) => set({ exam: v || undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(entranceExamInfo) as EntranceExam[]).map((x) => <option key={x} value={x}>{entranceExamInfo[x].label}</option>)}
                </Select>
                <Select id="bm-adm" label="Admissions" value={sp.get('admission') ?? ''} onChange={(v) => set({ admission: v || undefined })}>
                  <option value="">Any</option>
                  <option value="OPEN">Open now</option>
                  <option value="UPCOMING">Opening soon</option>
                </Select>
                <Select id="bm-facility" label="Documented facility" value={sp.get('facility') ?? ''} onChange={(v) => set({ facility: v || undefined })}>
                  <option value="">Any</option>
                  {(['SPORTS', 'LIBRARY', 'LABORATORY', 'COMPUTER', 'HEALTH', 'ARTS', 'TRANSPORT'] as const).map((x) => (
                    <option key={x} value={x}>{facilityCategoryLabel[x]}</option>
                  ))}
                </Select>
              </>
            );
            const moreCount = MORE_KEYS.filter((k) => sp.get(k)).length;
            const total = results.data?.totalElements;
            const resultLabel = total === undefined ? undefined : `${total.toLocaleString('en-IN')} school${total === 1 ? '' : 's'}`;
            return (
              <div className="card mt-5 flex flex-wrap items-end gap-3 p-4">
                <div className="hidden flex-1 gap-3 sm:grid sm:grid-cols-3">{stateSelect('bf-state')}{systemSelect('bf-system')}{feeSelect('bf-fee')}</div>
                <div className="hidden sm:block">
                  <MoreFilters activeCount={moreCount} resultLabel={resultLabel} onClearAll={clearAll}>{more}</MoreFilters>
                </div>
                <div className="sm:hidden">
                  <MoreFilters label="Filters" activeCount={activeFilters.filter((k) => k !== 'q').length} resultLabel={resultLabel} onClearAll={clearAll}>
                    {stateSelect('bs-state')}{systemSelect('bs-system')}{feeSelect('bs-fee')}{more}
                  </MoreFilters>
                </div>
                <div className="ml-auto w-full sm:w-48">
                  <Select id="bf-sort" label="Sort by" value={sp.get('sort') ?? ''} onChange={(v) => set({ sort: v || undefined })}>
                    <option value="">Name (A–Z)</option>
                    <option value="fee">Fee: low to high</option>
                    <option value="verified">Recently verified</option>
                  </Select>
                </div>
              </div>
            );
          })()}

          {activeFilters.length > 0 && (
            <ul className="mt-3 flex flex-wrap items-center gap-2" aria-label="Active filters">
              {activeFilters.map((k) => (
                <li key={k}>
                  <button type="button" onClick={() => set({ [k]: undefined })} aria-label={`Remove filter: ${chipLabel(k, sp.get(k)!)}`}
                    className="chip gap-1.5 bg-brand-50 px-3 py-1 text-sm font-medium text-brand-800 ring-1 ring-inset ring-brand-200 hover:bg-brand-100">
                    {chipLabel(k, sp.get(k)!)} <Icon name="close" className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
              {activeFilters.length > 1 && (
                <li><button type="button" className="text-sm font-semibold text-slate-600 hover:text-ink hover:underline" onClick={clearAll}>Clear all</button></li>
              )}
            </ul>
          )}

          <p className="mt-4 text-sm text-slate-600" aria-live="polite">
            {results.data ? <><strong className="text-ink">{results.data.totalElements.toLocaleString('en-IN')}</strong> school{results.data.totalElements === 1 ? '' : 's'}</> : 'Loading…'}
            {sp.get('maxFee') && <> · the fee filter uses the lowest official recurring annual fee; schools without fee records are excluded</>}
          </p>

          <div className="mt-4">
            <AsyncContent state={results} loading={<SkeletonCards count={6} />} isEmpty={(d) => d.content.length === 0}
              empty={
                <EmptyState title="No boarding school matches these filters.">
                  Try fewer filters or a wider area.{' '}
                  <button type="button" className="link" onClick={() => setSp(new URLSearchParams())}>Clear all filters</button>
                </EmptyState>
              }>
              {(page) => (
                <>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {page.content.map((s) => <BoardingCard key={s.id} school={s} />)}
                  </div>
                  <Pagination page={page.page} totalPages={page.totalPages} onChange={(p) => set({ page: String(p + 1) })} />
                </>
              )}
            </AsyncContent>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl bg-ink p-8 text-white shadow-lift sm:p-10">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-300">Exam preparation</p>
          <h2 className="mt-2 font-display text-2xl font-bold text-white sm:text-3xl">Entrance exam guides</h2>
          <p className="mt-2 max-w-2xl text-slate-300">
            Each system has its own eligibility rules, exam and timetable. Eligibility, official exam pattern and syllabus,
            a preparation plan, and links to officially published question papers and answer keys.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {(exams.data ?? []).map((e) => (
              <Link key={e.slug} to={`/exams/${e.slug}`} className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10 transition hover:bg-white/10">
                <p className="font-display text-lg font-bold text-white">{e.shortName}</p>
                <p className="mt-1 text-xs text-slate-400">{e.entryClassText}</p>
                <p className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-300">Open guide <Icon name="arrowRight" className="h-3.5 w-3.5" /></p>
              </Link>
            ))}
          </div>
        </section>

        <p className="text-xs leading-relaxed text-slate-500">
          Boarding profiles describe only what each school's official website, prospectus or board record states, with the
          source on every profile; profiles are unverified until an editor checks them. Fees, admission dates and photos
          appear only when sourced. India School Finder listings and rankings are independent and are not official
          government rankings or board endorsements.
        </p>
      </div>
    </>
  );
}
