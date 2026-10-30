import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { ShareLinkButtons } from '../components/common/ShareLinkButtons';
import { MAX_COMPARE, useCompare } from '../hooks/useCompare';
import { parseIds } from '../utils/geo';
import { AsyncContent, EmptyState, SkeletonCards, Spinner } from '../components/common/States';
import { SchoolDirectory } from '../components/school/SchoolDirectory';
import { SchoolsHero, type HeroSearch } from '../components/school/SchoolsHero';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { recentSchools, savedSchools, useLocalList, type SchoolRef } from '../hooks/usePersonal';
import { locationService, referenceService, schoolService } from '../services/publicApi';
import type { IndianState, SchoolNetwork, SchoolSearchParams, SchoolStage, SchoolType } from '../types/api';
import { networkLabel, placeLine, stageLabel } from '../utils/format';
import { NotFoundPage } from './InfoPages';

export function SchoolsPage() {
  useDocumentTitle('Discover the best schools across India');
  const [params, setParams] = useSearchParams();
  const stats = useApi(() => referenceService.stats(), []);
  // The hero's search sets name, state, city and board for the directory below (other filters stay as they are).
  const onSearch = (next: HeroSearch) => {
    const p = new URLSearchParams(params);
    (['q', 'state', 'city', 'board'] as const).forEach((k) => { if (next[k]) p.set(k, next[k]!); else p.delete(k); });
    p.delete('page');
    if (next.state !== params.get('state')) { p.delete('district'); p.delete('locality'); }
    setParams(p);
    document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  return (
    <>
      <SchoolsHero total={stats.data?.activeSchools} onSearch={onSearch}
        value={{ q: params.get('q') ?? undefined, state: params.get('state') ?? undefined, city: params.get('city') ?? undefined, board: params.get('board') ?? undefined }} />
      <div id="directory" className="container-page scroll-mt-20 py-8"><SchoolDirectory /></div>
    </>
  );
}

/** All 36 states and union territories. States without listed schools are shown but say so plainly. */
export function StatesPage() {
  useDocumentTitle('Schools by state and union territory');
  const states = useApi(() => locationService.states(), []);
  const groups: { title: string; kind: IndianState['kind'] }[] = [
    { title: 'States', kind: 'STATE' },
    { title: 'Union territories', kind: 'UNION_TERRITORY' },
  ];
  return (
    <>
      <PageHeader eyebrow="Directory" title="Schools by state and union territory"
        subtitle="Coverage grows as we add schools from official sources such as UDISE+, board affiliation lists and school websites. Counts show schools listed today." />
      <div className="container-page space-y-10 py-8">
        <AsyncContent state={states} loading={<SkeletonCards count={6} />}>
          {(list) => (
            <>
              {groups.map((g) => (
                <section key={g.kind}>
                  <h2 className="section-title">{g.title}</h2>
                  <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {list.filter((s) => s.kind === g.kind).map((s) => (
                      <li key={s.code} className="min-w-0">
                        <Link to={`/states/${s.slug}`} className="card card-hover group flex items-center justify-between gap-3 p-4">
                          <span className="min-w-0">
                            <span className="block truncate font-display font-bold text-ink">{s.name}</span>
                            <span className={`block text-xs ${s.schoolCount ? 'text-slate-500' : 'text-slate-500'}`}>
                              {s.schoolCount ? `${s.schoolCount.toLocaleString('en-IN')} school${s.schoolCount === 1 ? '' : 's'} listed` : 'No schools listed yet'}
                            </span>
                          </span>
                          <span className="rounded-lg bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-600 group-hover:bg-brand-600 group-hover:text-white">{s.code}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

/** Every city with listed schools across India, largest first, with a quick name filter. */
export function CitiesPage() {
  useDocumentTitle('Schools by city');
  const cities = useApi(() => locationService.citiesAcrossIndia(), []);
  const [q, setQ] = useState('');
  const needle = q.trim().toLowerCase();
  return (
    <>
      <PageHeader eyebrow="Directory" title="Schools by city"
        subtitle="Cities where we list schools, with the number listed today. Many schools are recorded by district only; browse by state to see every district.">
        <div className="flex flex-wrap gap-2">
          <Link to="/states" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Schools by state</Link>
          <Link to="/schools" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Search all schools</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <label className="block max-w-md">
          <span className="label">Find a city</span>
          <input className="input" placeholder="Type a city name…" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <AsyncContent state={cities} loading={<SkeletonCards count={6} />} isEmpty={(list) => list.length === 0}
          empty={<EmptyState title="No cities listed yet." />}>
          {(list) => {
            const shown = list.filter((c) => !needle || c.name.toLowerCase().includes(needle) || c.stateName.toLowerCase().includes(needle));
            return shown.length === 0 ? <EmptyState title={`No city matches “${q}”.`}>Try a state name, or browse <Link to="/states" className="link">schools by state</Link>.</EmptyState> : (
              <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((c) => (
                  <li key={`${c.stateCode}-${c.slug}`}>
                    <Link to={`/states/${c.stateSlug}/city/${c.slug}`} className="card card-hover flex items-center justify-between gap-3 p-4">
                      <span className="min-w-0">
                        <span className="block truncate font-display font-bold text-ink">{c.name}</span>
                        <span className="block truncate text-xs text-slate-500">{c.stateName}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold tabular-nums text-brand-700">
                        {c.schoolCount.toLocaleString('en-IN')}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            );
          }}
        </AsyncContent>
      </div>
    </>
  );
}

export function StatePage() {
  const { state: stateSlug = '', district: districtSlug, city: citySlug } = useParams();
  const state = useApi(() => locationService.state(stateSlug), [stateSlug]);
  const districts = useApi(() => locationService.districts(stateSlug), [stateSlug]);
  const cities = useApi(() => locationService.cities(stateSlug), [stateSlug]);
  const district = districtSlug ? districts.data?.find((d) => d.slug === districtSlug) : undefined;
  const city = citySlug ? cities.data?.find((c) => c.slug === citySlug) : undefined;
  const name = state.data?.name;
  const title = district ? `Schools in ${district.name} district, ${name}`
    : city ? `Schools in ${city.name}, ${name}` : name ? `Schools in ${name}` : undefined;
  useDocumentTitle(title);

  if (state.error?.status === 404 || (districtSlug && districts.data && !district) || (citySlug && cities.data && !city)) {
    return <NotFoundPage />;
  }
  if (citySlug && !city) return <AsyncContent state={cities} loading={<Spinner />}>{() => null}</AsyncContent>;
  if (!state.data) return <AsyncContent state={state} loading={<Spinner />}>{() => null}</AsyncContent>;
  const s = state.data;

  return (
    <>
      <PageHeader
        eyebrow={s.kind === 'STATE' ? 'State' : 'Union territory'}
        title={title ?? s.name}
        subtitle={
          <>
            <Breadcrumbs items={[{ to: '/states', label: 'States & UTs' }, { to: `/states/${s.slug}`, label: s.name },
              ...(district ? [{ to: `/states/${s.slug}/${district.slug}`, label: district.name }] : []),
              ...(city ? [{ to: `/states/${s.slug}/city/${city.slug}`, label: city.name }] : [])]} />
            {city && (
              <span className="mt-2 block">
                {city.schoolCount.toLocaleString('en-IN')} school{city.schoolCount === 1 ? '' : 's'} listed in {city.name}, each linked to an official source.
              </span>
            )}
            {s.schoolCount > 0 && (
              <Link className="mt-2 inline-flex items-center gap-1 text-accent-300 underline-offset-2 hover:underline"
                to={`/rankings?${new URLSearchParams({ state: s.code, ...(district ? { district: district.slug } : {}), ...(city ? { city: city.name } : {}) })}`}>
                Rankings in {city?.name ?? district?.name ?? s.name} →
              </Link>
            )}
            {s.schoolCount === 0 && (
              <span className="mt-2 block">No schools in {s.name} are listed yet. We add schools only when they can be linked to an official source.</span>
            )}
          </>
        }
      >
        {!city && (districts.data?.length ?? 0) > 0 && (
          <div className="flex flex-wrap gap-2">
            <Link to={`/states/${s.slug}`}
              className={`chip px-3 py-1 text-sm ${!district ? 'bg-accent-400 font-semibold text-ink' : 'bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20'}`}>
              All districts
            </Link>
            {(districts.data ?? []).filter((d) => d.schoolCount > 0).map((d) => (
              <Link key={d.id} to={`/states/${s.slug}/${d.slug}`}
                className={`chip px-3 py-1 text-sm ${d.slug === districtSlug ? 'bg-accent-400 font-semibold text-ink' : 'bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20'}`}>
                {d.name} <span className="opacity-70">{d.schoolCount}</span>
              </Link>
            ))}
          </div>
        )}
      </PageHeader>
      <div className="container-page py-8">
        {!district && (cities.data?.length ?? 0) > 1 && (
          <nav aria-label="Cities" className="mb-6 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-slate-500">Cities:</span>
            {(cities.data ?? []).map((c) => (
              <Link key={c.slug} to={`/states/${s.slug}/city/${c.slug}`} aria-current={c.slug === citySlug ? 'page' : undefined}
                className={`rounded-full border px-3 py-1 font-medium ${c.slug === citySlug
                  ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300 hover:text-brand-700'}`}>
                {c.name} <span className={c.slug === citySlug ? 'text-white/80' : 'text-slate-500'}>{c.schoolCount}</span>
              </Link>
            ))}
          </nav>
        )}
        <SchoolDirectory key={`${s.code}-${districtSlug ?? ''}-${citySlug ?? ''}`}
          fixed={district ? { state: s.code, district: district.slug } : city ? { state: s.code, city: city.name } : { state: s.code }} />
      </div>
    </>
  );
}

const NETWORK_PAGES: Record<string, { network: SchoolNetwork; intro: string; officialUrl: string; officialName: string }> = {
  'kendriya-vidyalaya': {
    network: 'KENDRIYA_VIDYALAYA',
    intro: 'Central government schools run by Kendriya Vidyalaya Sangathan under the Ministry of Education, affiliated to CBSE.',
    officialUrl: 'https://kvsangathan.nic.in/', officialName: 'Kendriya Vidyalaya Sangathan',
  },
  'jawahar-navodaya-vidyalaya': {
    network: 'JAWAHAR_NAVODAYA_VIDYALAYA',
    intro: 'Residential central government schools run by Navodaya Vidyalaya Samiti; admission to Class VI is through the JNV Selection Test.',
    officialUrl: 'https://navodaya.gov.in/', officialName: 'Navodaya Vidyalaya Samiti',
  },
};

export function NetworkPage() {
  const { network = '' } = useParams();
  const config = NETWORK_PAGES[network];
  const label = config ? `${networkLabel[config.network]} schools` : undefined;
  useDocumentTitle(label);
  if (!config) return <NotFoundPage />;
  return (
    <>
      <PageHeader eyebrow="Central government" title={`${networkLabel[config.network]} schools`}
        subtitle={<>{config.intro} Admission notices are published by{' '}
          <a href={config.officialUrl} target="_blank" rel="noopener noreferrer" className="text-accent-300 underline-offset-2 hover:underline">{config.officialName} ↗</a>.</>} />
      <div className="container-page py-8"><SchoolDirectory key={network} fixed={{ network: config.network }} /></div>
    </>
  );
}

/** Most schools a shared shortlist link carries (keeps the URL short enough for WhatsApp). */
const MAX_SHARED = 30;

export function SavedSchoolsPage() {
  useDocumentTitle('Saved schools');
  const saved = useLocalList(savedSchools);
  const recent = useLocalList(recentSchools);
  const navigate = useNavigate();
  const { replace: replaceCompare } = useCompare();
  const [searchParams, setSearchParams] = useSearchParams();

  // A shortlist someone shared (?shared=1,2,3) is shown separately; it never overwrites this browser's own list.
  const sharedIds = parseIds(searchParams.get('shared'), MAX_SHARED);
  const shared = useApi(
    () => Promise.all(sharedIds.map((id) => schoolService.byId(id).catch(() => null)))
      .then((list) => list.flatMap((s) => (s ? [{ id: s.id, name: s.name, slug: s.slug, place: placeLine(s.locality, s.city, s.stateName) }] : []))),
    [sharedIds.join(',')],
    sharedIds.length > 0,
  );
  const savedIds = new Set(saved.map((s) => s.id));
  const unsavedShared = (shared.data ?? []).filter((s) => !savedIds.has(s.id));
  const dismissShared = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('shared');
    setSearchParams(next, { replace: true });
  };

  const shareUrl = `${window.location.origin}/saved?shared=${saved.slice(0, MAX_SHARED).map((s) => s.id).join(',')}`;
  const shareText = `My school shortlist on India School Finder (${saved.length} school${saved.length === 1 ? '' : 's'}):`;
  const compareSaved = () => {
    replaceCompare(saved.slice(0, MAX_COMPARE).map(({ id, name, slug }) => ({ id, name, slug })));
    navigate('/compare');
  };

  return (
    <>
      <PageHeader eyebrow="Your shortlist" title="Saved schools"
        subtitle="Saved and recently viewed schools are stored only in this browser. Clearing your browser data removes them." />
      <div className="container-page grid gap-10 py-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="min-w-0 space-y-10">
        {sharedIds.length > 0 && (
          <section aria-labelledby="shared-heading" className="rounded-2xl bg-brand-50/60 p-5 ring-1 ring-brand-100">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="shared-heading" className="section-title">
                Shortlist shared with you{shared.data ? ` (${shared.data.length})` : ''}
              </h2>
              <button type="button" className="btn-ghost text-xs" onClick={dismissShared}>Dismiss</button>
            </div>
            <AsyncContent state={shared} loading={<Spinner label="Opening the shared shortlist…" />}
              isEmpty={(list) => list.length === 0}
              empty={<p className="mt-3 text-sm text-slate-600">None of the schools in this link could be found.</p>}>
              {(list) => (
                <>
                  <ul className="mt-4 space-y-3">
                    {list.map((s) => (
                      <SchoolRefRow key={s.id} school={s} action={savedIds.has(s.id)
                        ? <span className="chip bg-emerald-50 text-emerald-700"><Icon name="check" className="h-3 w-3" /> Saved</span>
                        : <button type="button" className="btn-secondary rounded-full px-3 py-1 text-xs" onClick={() => savedSchools.add(s)}>Save</button>} />
                    ))}
                  </ul>
                  {unsavedShared.length > 0 && (
                    <button type="button" className="btn-primary mt-4 rounded-full" onClick={() => [...unsavedShared].reverse().forEach((s) => savedSchools.add(s))}>
                      <Icon name="heart" className="h-4 w-4" /> Save {unsavedShared.length === list.length ? 'all' : `the other ${unsavedShared.length}`} to my list
                    </button>
                  )}
                </>
              )}
            </AsyncContent>
          </section>
        )}
        <section aria-labelledby="saved-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="saved-heading" className="section-title">Saved ({saved.length})</h2>
            {saved.length > 0 && <button type="button" className="btn-ghost text-xs" onClick={() => savedSchools.clear()}>Clear all</button>}
          </div>
          {saved.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <ShareLinkButtons url={shareUrl} text={shareText} />
              {saved.length > 1 && (
                <button type="button" className="btn-secondary rounded-full px-4 py-2 text-sm" onClick={compareSaved}>
                  <Icon name="scale" className="h-4 w-4" /> Compare {saved.length > MAX_COMPARE ? `first ${MAX_COMPARE}` : 'these'}
                </button>
              )}
            </div>
          )}
          {saved.length === 0 ? (
            <EmptyState title="No saved schools yet.">Use the heart button on any school card or profile to shortlist it.</EmptyState>
          ) : (
            <ul className="mt-4 space-y-3">
              {saved.map((s) => <SchoolRefRow key={s.id} school={s} onRemove={() => savedSchools.remove(s)} />)}
            </ul>
          )}
        </section>
        </div>
        <section aria-labelledby="recent-heading">
          <div className="flex items-center justify-between gap-3">
            <h2 id="recent-heading" className="section-title">Recently viewed</h2>
            {recent.length > 0 && <button type="button" className="btn-ghost text-xs" onClick={() => recentSchools.clear()}>Clear history</button>}
          </div>
          {recent.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">Schools you open will appear here.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {recent.map((s) => <SchoolRefRow key={s.id} school={s} onRemove={() => recentSchools.remove(s)} />)}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

function SchoolRefRow({ school, onRemove, action }: { school: SchoolRef; onRemove?: () => void; action?: React.ReactNode }) {
  return (
    <li className="card flex items-center justify-between gap-3 p-4">
      <Link to={`/schools/${school.slug}`} className="min-w-0">
        <span className="block truncate font-display font-bold text-ink hover:text-brand-700">{school.name}</span>
        {school.place && <span className="block truncate text-sm text-slate-500">{school.place}</span>}
      </Link>
      {action}
      {onRemove && (
        <button type="button" onClick={onRemove} className="btn-ghost px-2" aria-label={`Remove ${school.name}`}>
          <Icon name="close" className="h-4 w-4" />
        </button>
      )}
    </li>
  );
}

function Breadcrumbs({ items }: { items: { to: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.to} className="flex items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-slate-500">/</span>}
            {i === items.length - 1
              ? <span aria-current="page" className="text-slate-200">{item.label}</span>
              : <Link to={item.to} className="text-slate-300 hover:text-white">{item.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function BoardPage() {
  const { code = '' } = useParams();
  const boardCode = code.toUpperCase();
  const boards = useApi(() => referenceService.boards(), []);
  const board = boards.data?.find((b) => b.code === boardCode);
  const display = boardCode === 'CISCE' ? 'ICSE / ISC' : boardCode === 'STATE' ? 'State board' : boardCode;
  useDocumentTitle(`${display} schools in India`);
  if (boards.data && !board) return <NotFoundPage />;
  return (
    <>
      <PageHeader
        title={`${display} schools in India`}
        subtitle={board && (
          <>
            {board.name}.{' '}
            {board.websiteUrl && <a href={board.websiteUrl} target="_blank" rel="noopener noreferrer" className="link">Official website ↗</a>}
          </>
        )}
      >
        <BoardSwitcher current={boardCode} codes={(boards.data ?? []).map((b) => b.code)} />
      </PageHeader>
      <div className="container-page py-8"><SchoolDirectory key={boardCode} fixed={{ board: boardCode }} /></div>
    </>
  );
}

function BoardSwitcher({ current, codes }: { current: string; codes: string[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {codes.map((c) => (
        <Link key={c} to={`/boards/${c}`}
          className={`chip px-3 py-1 text-sm ${c === current ? 'bg-accent-400 font-semibold text-ink' : 'bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20'}`}>
          {c === 'CISCE' ? 'ICSE/ISC' : c}
        </Link>
      ))}
    </div>
  );
}

const TYPE_PAGES: Record<string, { title: string; subtitle: string; tabs: { label: string; fixed: SchoolSearchParams }[] }> = {
  government: {
    title: 'Government schools in India',
    subtitle: 'Schools run by central government (Kendriya Vidyalayas, Jawahar Navodaya Vidyalayas), state education departments and local bodies. Use the management filter to narrow down.',
    tabs: [{ label: 'Government', fixed: { schoolType: 'GOVERNMENT' } }],
  },
  'private-aided': {
    title: 'Private and aided schools in India',
    subtitle: 'Private unaided schools set their own fees within their state’s fee-regulation rules; aided schools receive government grants.',
    tabs: [
      { label: 'Private', fixed: { schoolType: 'PRIVATE' } },
      { label: 'Government-aided', fixed: { schoolType: 'AIDED' } },
      { label: 'International', fixed: { schoolType: 'INTERNATIONAL' } },
    ],
  },
};

export function SchoolTypePage() {
  const { type = '', kind } = useParams();
  const config = TYPE_PAGES[type];
  useDocumentTitle(config?.title);
  if (!config) return <NotFoundPage />;
  const active = config.tabs.find((t) => t.fixed.schoolType?.toLowerCase() === kind) ?? config.tabs[0];
  return (
    <>
      <PageHeader title={config.title} subtitle={config.subtitle}>
        {config.tabs.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {config.tabs.map((t) => (
              <Link key={t.label} to={`/type/${type}/${(t.fixed.schoolType as SchoolType).toLowerCase()}`}
                className={`chip px-3 py-1 text-sm ${t === active ? 'bg-accent-400 font-semibold text-ink' : 'bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20'}`}>
                {t.label}
              </Link>
            ))}
          </div>
        )}
      </PageHeader>
      <div className="container-page py-8"><SchoolDirectory key={active.label} fixed={active.fixed} /></div>
    </>
  );
}

const STAGE_SLUGS: Record<string, SchoolStage> = {
  nursery: 'PRE_PRIMARY',
  primary: 'PRIMARY',
  middle: 'MIDDLE',
  secondary: 'SECONDARY',
  'senior-secondary': 'SENIOR_SECONDARY',
};

export function StagePage() {
  const { stage = '' } = useParams();
  const value = STAGE_SLUGS[stage];
  useDocumentTitle(value ? `${stageLabel[value]} schools` : undefined);
  if (!value) return <NotFoundPage />;
  return (
    <>
      <PageHeader title={`${stageLabel[value]} schools in India`} subtitle="Schools that list at least one class at this stage.">
        <div className="flex flex-wrap gap-2">
          {Object.entries(STAGE_SLUGS).map(([slug, s]) => (
            <Link key={slug} to={`/stages/${slug}`}
              className={`chip px-3 py-1 text-sm ${slug === stage ? 'bg-accent-400 font-semibold text-ink' : 'bg-white/10 text-slate-200 ring-1 ring-white/15 hover:bg-white/20'}`}>
              {stageLabel[s]}
            </Link>
          ))}
        </div>
      </PageHeader>
      <div className="container-page py-8"><SchoolDirectory key={value} fixed={{ stage: value }} /></div>
    </>
  );
}
