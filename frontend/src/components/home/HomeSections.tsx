import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { HOME_IMAGES, type HomeImageId } from '../../content/homeImages';
import type { ApiState } from '../../hooks/useApi';
import type { BlogCard, BlogCategory } from '../../services/blogApi';
import type { BestPlaceSummary, DirectorySummary, UpdateItem } from '../../services/publicApi';
import type { ExternalRankingListItem, PageResponse, SchoolSummary } from '../../types/api';
import { formatDate, formatMoneyCompact } from '../../utils/format';
import { Icon, type IconName } from '../common/Icon';
import { SchoolImage } from '../school/SchoolImage';
import { HomePhoto } from './HomePhoto';
import { updateImage, updateTarget } from './updateVisuals';

export const HOME_HEADING = 'font-display text-[26px] font-extrabold tracking-tight text-navy sm:text-[30px]';
const CARD = 'rounded-2xl bg-white shadow-[0_10px_28px_-18px_rgba(15,37,87,0.35)] ring-1 ring-slate-200/80';
/** Cards in a row that scrolls sideways on phones (the next card peeks in), and a grid from 640px wide. */
const RAIL = '-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-3 no-scrollbar sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-4 sm:overflow-visible sm:px-0 sm:pb-0';
// relative: the cards' screen-reader-only labels are positioned inside the card, so the row clips them like the rest of the card.
const RAIL_ITEM = 'relative w-[84%] max-w-[340px] shrink-0 snap-start sm:w-auto sm:max-w-none';

function SectionHead({ id, title, sub, action }: { id: string; title: ReactNode; sub?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
      <div className="min-w-0">
        <h2 id={id} className={HOME_HEADING}>{title}</h2>
        {sub && <p className="mt-1 text-[15px] text-slate-600">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

function MoreLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 rounded-lg text-sm font-bold text-navy hover:text-royal-700 hover:underline">
      {children} <Icon name="arrowRight" className="h-4 w-4" />
    </Link>
  );
}

/* ------------------------------------------------------------------ Explore by category */

const CATEGORIES: { to: string; title: string; text: string; image: HomeImageId; icon: IconName; badge: string; arrow: string }[] = [
  { to: '/schools', title: 'Find Schools', text: 'Search schools by city, board, class, type and more.', image: 'bal-vidya-mandir', icon: 'institution', badge: 'bg-royal-600', arrow: 'bg-royal-50 text-royal-600' },
  { to: '/boarding', title: 'Boarding Schools', text: 'Explore residential and boarding schools across India.', image: 'mayo-college', icon: 'bed', badge: 'bg-flame-500', arrow: 'bg-flame-50 text-flame-700' },
  { to: '/compare', title: 'Compare Schools', text: 'Compare facilities, fees and admissions side by side.', image: 'studying', icon: 'scale', badge: 'bg-emerald-600', arrow: 'bg-emerald-50 text-emerald-700' },
  { to: '/admissions', title: 'Admissions & Fees', text: 'Check admission processes, important dates and fee details.', image: 'calculator', icon: 'calculator', badge: 'bg-violet-600', arrow: 'bg-violet-50 text-violet-700' },
];

export function ExploreCategories() {
  return (
    <section aria-labelledby="explore-heading" className="container-wide pt-10 sm:pt-12">
      <SectionHead id="explore-heading" title="Explore by Category" action={<MoreLink to="/find">Discover schools the way you want</MoreLink>} />
      <ul className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {CATEGORIES.map((c) => (
          <li key={c.to} className="min-w-0">
            <Link to={c.to} className={`group block h-full overflow-hidden ${CARD} transition duration-200 hover:-translate-y-1 hover:shadow-[0_22px_40px_-22px_rgba(15,37,87,0.45)]`}>
              <span className="block h-20 overflow-hidden sm:h-32">
                <HomePhoto id={c.image} sizes="(min-width: 1280px) 330px, 50vw" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </span>
              <span className="flex flex-col items-start gap-1.5 px-3 pb-3 sm:flex-row sm:gap-3 sm:px-4 sm:pb-4">
                <span className={`-mt-5 grid h-11 w-11 shrink-0 place-items-center rounded-full text-white shadow-lg ring-4 ring-white sm:-mt-6 sm:h-14 sm:w-14 ${c.badge}`}>
                  <Icon name={c.icon} className="h-6 w-6 sm:h-7 sm:w-7" />
                </span>
                <span className="min-w-0 flex-1 sm:pt-2.5">
                  <span className="block font-display text-[15px] font-extrabold leading-tight text-navy sm:text-[17px]">{c.title}</span>
                  <span className="mt-1 block text-xs leading-snug text-slate-600 sm:text-[13px]">{c.text}</span>
                </span>
                <span className={`mt-3 hidden h-7 w-7 shrink-0 place-items-center rounded-full transition group-hover:translate-x-0.5 sm:grid ${c.arrow}`}>
                  <Icon name="arrowRight" className="h-4 w-4" />
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ Top rankings + Trending now */

interface RankLine { key: string; to: string; label: string; title?: string; meta?: string; rank?: number | null }

function RankingCard({ title, icon, tone, image, lines, note, to, numbered = false, loading, empty }: {
  title: string; icon: IconName; tone: string; image: HomeImageId; lines: RankLine[]; note: ReactNode; to: string; numbered?: boolean; loading: boolean;
  /** Said instead of the list when it could not be loaded; the button still opens the full page. */
  empty: string;
}) {
  return (
    <article className={`flex min-w-0 flex-col p-4 ${RAIL_ITEM} ${CARD}`}>
      <div className="flex items-center gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${tone}`}><Icon name={icon} className="h-6 w-6" /></span>
        <span className="block h-14 min-w-0 flex-1 overflow-hidden rounded-xl bg-slate-100">
          <HomePhoto id={image} sizes="200px" className="h-full w-full object-cover" />
        </span>
      </div>
      <h3 className="mt-3 font-display text-lg font-extrabold leading-snug text-navy">{title}</h3>
      {loading && lines.length === 0 ? (
        <div className="mt-2 flex-1 space-y-2" aria-hidden>{[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-slate-100" />)}</div>
      ) : lines.length === 0 ? (
        <p className="mt-2 flex-1 text-[13px] text-slate-600">{empty}</p>
      ) : (
        <ol className="mt-2 flex-1 space-y-1.5 text-[13px]">
          {lines.map((l, i) => (
            <li key={l.key}>
              <Link to={l.to} className="group flex items-center gap-2 rounded-md py-0.5 text-slate-700 hover:text-royal-700">
                {numbered
                  ? <span className="grid h-5 min-w-[20px] shrink-0 place-items-center rounded-full bg-amber-400 px-1 text-[11px] font-extrabold tabular-nums text-navy">{l.rank ?? i + 1}</span>
                  : <span aria-hidden className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-amber-100 text-amber-700"><Icon name="chevronRight" className="h-3 w-3" /></span>}
                <span className="min-w-0 flex-1 truncate font-medium" title={l.title ?? l.label}>{l.label}</span>
                {l.meta && <span className="shrink-0 text-xs font-semibold tabular-nums text-slate-500 xl:hidden">{l.meta}</span>}
              </Link>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-2 text-[11px] leading-snug text-slate-500">{note}</p>
      <Link to={to} className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-royal-50 py-2 text-sm font-bold text-royal-700 transition hover:bg-royal-100">
        View Rankings <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </article>
  );
}

export function HomeRankings({ iirf, directory, places, trending }: {
  iirf: ApiState<PageResponse<ExternalRankingListItem>>;
  directory: ApiState<DirectorySummary>;
  places: ApiState<BestPlaceSummary[]>;
  trending: ReactNode;
}) {
  const entries = iirf.data?.content ?? [];
  const edition = entries[0]?.entry;
  const cat = (slug: string) => directory.data?.categories.find((c) => c.slug === slug);
  const catLines = (slugs: [string, string][]): RankLine[] => slugs
    .map(([slug, label]) => ({ slug, label, c: cat(slug) }))
    .filter((x) => x.c && x.c.schools > 0)
    .map((x) => ({ key: x.slug, to: `/rankings/${x.slug}`, label: x.label, meta: `${x.c!.schools} schools` }));
  const states = (places.data ?? []).filter((p) => p.kind === 'STATE' && p.ranked > 0).sort((a, b) => b.ranked - a.ranked).slice(0, 3);

  return (
    <section aria-labelledby="rankings-heading" className="container-wide pt-10 sm:pt-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        <div className="min-w-0">
          <SectionHead id="rankings-heading" title="Top Rankings"
            sub="Rankings shown under their publisher’s name and year, with the source, to help you shortlist schools." />
          <div className={`mt-5 ${RAIL} xl:grid-cols-4`}>
            <RankingCard title="India’s Top Schools" icon="trophy" tone="bg-amber-50 text-amber-500" image="modern-school" to="/rankings" numbered
              loading={iirf.loading} empty="See India’s top schools in published national rankings."
              lines={entries.slice(0, 3).map((r) => ({
                key: String(r.entry.id), rank: r.entry.rankPosition,
                to: r.schoolSlug ? `/schools/${r.schoolSlug}?tab=ranking` : '/rankings',
                label: r.schoolName ?? 'School', title: [r.schoolName, r.city].filter(Boolean).join(', '),
                meta: r.entry.score != null ? String(r.entry.score) : undefined,
              }))}
              note={edition ? <>Ranks as published by {edition.publisherCode ?? edition.publisher}, {edition.rankingYear}. Not SchoolDhundo’s ranking.</>
                : 'Published national rankings, each under its publisher’s name.'} />
            <RankingCard title="Top Boarding Schools" icon="bed" tone="bg-flame-50 text-flame-600" image="sainik-ghorakhal" to="/rankings/boarding-schools"
              loading={directory.loading} empty="Boys, girls and co-ed boarding schools across India."
              lines={catLines([['boys-boarding-schools', 'Boys boarding schools'], ['girls-boarding-schools', 'Girls boarding schools'], ['co-ed-boarding-schools', 'Co-ed boarding schools']])}
              note="India’s leading boarding schools, listed A to Z with their sources." />
            <RankingCard title="State-wise Rankings" icon="map" tone="bg-emerald-50 text-emerald-600" image="kv-hebbal" to="/rankings/states"
              loading={places.loading} empty="Top schools in each state and city."
              lines={states.map((p) => ({ key: p.slug, to: `/rankings/best-schools-in-${p.slug}`, label: `${p.name} – Top Schools`, meta: `${p.ranked} ranked` }))}
              note="States with the most schools in published rankings." />
            <RankingCard title="Board-wise Rankings" icon="layers" tone="bg-royal-50 text-royal-600" image="hansraj-modern" to="/rankings/boards"
              loading={directory.loading} empty="Top CBSE, ICSE, IB and Cambridge schools."
              lines={catLines([['cbse-schools', 'CBSE – Top Schools'], ['icse-schools', 'ICSE – Top Schools'], ['ib-schools', 'IB – Top Schools']])}
              note="Leading schools for each board, listed A to Z." />
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Ranking positions are never sold. <Link to="/rankings/methodology" className="font-semibold text-royal-700 hover:underline">Sources and methodology</Link>
          </p>
        </div>
        {trending}
      </div>
    </section>
  );
}

const BLOG_IMAGES: Partial<Record<BlogCategory, HomeImageId>> = {
  ENTRANCE_EXAMS: 'cadets', GOVERNMENT_SCHOOLS: 'jnv-rangareddy', SCHOOL_REVIEWS: 'hero-students', ADMISSIONS: 'calculator',
  BOARDING_SCHOOLS: 'mayo-college', BOARD_COMPARISON: 'bal-vidya-mandir',
};

/**
 * "Trending now": what is current, not a popularity count (no views are measured): the nearest exam dates from the
 * updates feed, then the newest guides.
 */
export function TrendingNow({ updates, posts }: { updates: UpdateItem[]; posts: BlogCard[] }) {
  const exams = updates.filter((u) => u.category === 'EXAM' && u.eventDate)
    .sort((a, b) => (a.eventDate ?? '').localeCompare(b.eventDate ?? '')).slice(0, 2);
  const rows: { key: string; to: string; external?: boolean; title: string; meta: string; image: ReactNode }[] = [
    ...exams.map((u) => {
      const t = updateTarget(u);
      return {
        key: u.id, to: t && 'internal' in t ? t.internal : t?.external ?? '/updates', external: !!t && 'external' in t,
        title: u.title, meta: `${u.eventLabel ?? 'Date'}: ${formatDate(u.eventDate)}`,
        image: <HomePhoto id={updateImage(u)} sizes="80px" className="h-full w-full object-cover" />,
      };
    }),
    ...posts.slice(0, 5 - exams.length).map((p) => ({
      key: p.slug, to: `/blog/${p.slug}`, title: p.title, meta: `Guide · ${p.minutesToRead} min read`,
      image: p.coverImageUrl
        ? <img src={p.coverImageUrl} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
        : <HomePhoto id={BLOG_IMAGES[p.category] ?? 'studying'} sizes="80px" className="h-full w-full object-cover" />,
    })),
  ];
  return (
    <aside aria-labelledby="trending-heading" className={`p-4 lg:sticky lg:top-24 ${CARD}`}>
      <h2 id="trending-heading" className="flex items-center gap-1.5 font-display text-xl font-extrabold text-navy">
        Trending Now <Icon name="fire" className="h-5 w-5 text-flame-500" />
      </h2>
      <p className="text-xs text-slate-500">Upcoming exam dates and our newest guides</p>
      {rows.length > 0 ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {rows.map((r) => {
            const body = (
              <>
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg bg-slate-100">{r.image}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-[13px] font-semibold leading-snug text-navy group-hover:text-royal-700">{r.title}</span>
                  <span className="mt-0.5 block truncate text-[11px] text-slate-500">{r.meta}</span>
                </span>
                <Icon name="chevronRight" className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-royal-600" />
              </>
            );
            const cls = 'group flex items-center gap-3 py-2.5';
            return (
              <li key={r.key}>
                {r.external ? <a href={r.to} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a> : <Link to={r.to} className={cls}>{body}</Link>}
              </li>
            );
          })}
        </ul>
      ) : (
        <ul className="mt-3 space-y-2 text-sm">
          <li><Link to="/exams/calendar" className="link">Entrance exam calendar →</Link></li>
          <li><Link to="/admissions/guide" className="link">Admission guide for parents →</Link></li>
          <li><Link to="/blog" className="link">Guides and articles →</Link></li>
        </ul>
      )}
    </aside>
  );
}

/* ------------------------------------------------------------------ Popular exam preparation + claim */

export interface PracticeCounts { byExam: Record<string, { sets: number; questions: number }>; sets: number; questions: number }

const EXAMS: { slug: string; name: string; tag: string; to: string; text: string; image: HomeImageId; icon: IconName; iconTone: string; tagTone: string; button: string; action: string }[] = [
  {
    slug: 'jnvst', name: 'JNVST', tag: 'Class 6 Entrance', to: '/exams/jnvst', image: 'jnv-rangareddy', icon: 'bookOpen',
    text: 'Practice papers, topic-wise questions, mock tests and a study plan for Class 6.',
    iconTone: 'bg-royal-50 text-royal-600', tagTone: 'border-violet-200 bg-violet-50 text-violet-700', button: 'bg-royal-600 hover:bg-royal-700', action: 'Start Preparation',
  },
  {
    slug: 'aissee', name: 'AISSEE', tag: 'Sainik School', to: '/exams/aissee', image: 'sainik-tilaiya', icon: 'shield',
    text: 'Sainik School entrance preparation with section-wise marks, mock tests and notes.',
    iconTone: 'bg-flame-50 text-flame-600', tagTone: 'border-amber-200 bg-amber-50 text-amber-800', button: 'bg-flame-700 hover:bg-flame-800', action: 'Start Preparation',
  },
  {
    slug: 'netarhat', name: 'Netarhat', tag: 'Entrance Prep', to: '/exams/netarhat', image: 'netarhat', icon: 'tree',
    text: 'Syllabus, exam pattern, dates and practice sets for the Netarhat entrance exam.',
    iconTone: 'bg-emerald-50 text-emerald-600', tagTone: 'border-emerald-200 bg-emerald-50 text-emerald-800', button: 'bg-emerald-700 hover:bg-emerald-800', action: 'Start Preparation',
  },
  {
    slug: '*', name: 'Mock Tests & Daily Quiz', tag: 'All Exams', to: '/exams/practice', image: 'computer-lab', icon: 'target',
    text: 'Full-length mock tests, chapter tests and a new daily quiz to boost your preparation.',
    iconTone: 'bg-violet-50 text-violet-600', tagTone: 'border-violet-200 bg-violet-50 text-violet-700', button: 'bg-violet-600 hover:bg-violet-700', action: 'Practice Now',
  },
];

/** "New" or "Updated" on an exam card, only when the updates feed has a new or changed practice set for that exam. */
export function prepFlag(prep: UpdateItem[], slug: string): 'New' | 'Updated' | null {
  const items = prep.filter((u) => u.category === 'PREP' && (slug === '*' || u.topic === slug));
  if (items.some((u) => u.badge === 'NEW')) return 'New';
  if (items.some((u) => u.badge === 'UPDATED')) return 'Updated';
  return null;
}

export function HomeExamPrep({ counts, prep }: { counts: PracticeCounts | null; prep: UpdateItem[] }) {
  const countLine = (slug: string) => {
    if (!counts) return null;
    const c = slug === '*' ? { sets: counts.sets, questions: counts.questions } : counts.byExam[slug];
    if (!c || c.sets === 0) return null;
    return `${c.sets} practice ${c.sets === 1 ? 'set' : 'sets'} · ${c.questions.toLocaleString('en-IN')} questions`;
  };
  return (
    <section aria-labelledby="prep-heading" className="container-wide pt-10 sm:pt-12">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-end">
        <div className="min-w-0">
          <SectionHead id="prep-heading" title="Popular Exam Preparation"
            sub="Study material, practice sets and mock tests for top school entrance exams." />
          <ul className={`mt-5 ${RAIL} xl:grid-cols-4`}>
            {EXAMS.map((e) => {
              const flag = prepFlag(prep, e.slug);
              const line = countLine(e.slug);
              return (
                <li key={e.slug} className={`flex min-w-0 flex-col p-4 ${RAIL_ITEM} ${CARD}`}>
                  <div className="flex items-start gap-3">
                    <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${e.iconTone}`}><Icon name={e.icon} className="h-6 w-6" /></span>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-extrabold leading-tight text-navy">{e.name}</h3>
                      <span className={`mt-1 inline-block rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${e.tagTone}`}>{e.tag}</span>
                    </div>
                    {flag && <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-white ${flag === 'New' ? 'bg-red-600' : 'bg-violet-600'}`}>{flag}</span>}
                  </div>
                  <div className="mt-3 flex flex-1 gap-3">
                    <span className="block h-[88px] w-[76px] shrink-0 overflow-hidden rounded-xl bg-slate-100">
                      <HomePhoto id={e.image} sizes="80px" className="h-full w-full object-cover" />
                    </span>
                    <p className="min-w-0 text-[12.5px] leading-snug text-slate-600">{e.text}</p>
                  </div>
                  {line && <p className="mt-2 text-xs font-semibold text-slate-700">{line}</p>}
                  <Link to={e.to} className={`mt-3 inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-bold text-white shadow-sm transition ${e.button}`}>
                    {e.action} <Icon name="arrowRight" className="h-4 w-4" />
                    <span className="sr-only">: {e.name}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
        <ClaimPromo />
      </div>
    </section>
  );
}

function ClaimPromo() {
  return (
    <aside aria-labelledby="claim-heading" className="relative flex min-h-[260px] flex-col overflow-hidden rounded-2xl bg-gradient-to-br from-royal-700 via-royal-600 to-navy p-6 text-white shadow-[0_22px_44px_-24px_rgba(11,92,213,0.9)]">
      <span aria-hidden className="pointer-events-none absolute -bottom-6 -right-8 w-[62%] overflow-hidden rounded-2xl opacity-60 [mask-image:linear-gradient(to_left,black_45%,transparent)]">
        <HomePhoto id="cms-kanpur-road" sizes="200px" className="aspect-[4/3] w-full object-cover" />
      </span>
      <Icon name="institution" className="absolute right-5 top-5 h-11 w-11 text-amber-300" aria-hidden />
      <h2 id="claim-heading" className="relative max-w-[14rem] font-display text-2xl font-extrabold leading-tight text-white">Claim Your School Profile</h2>
      <p className="relative mt-3 max-w-[17rem] text-sm leading-relaxed text-blue-50">
        Create your official school listing on SchoolDhundo and keep fees, admission dates and photos correct for parents and students.
      </p>
      <Link to="/claim-school" className="relative mt-auto inline-flex w-fit items-center gap-1.5 rounded-xl bg-flame-700 px-4 py-2.5 text-sm font-bold text-white shadow-lg transition hover:bg-flame-800">
        List Your School Now <Icon name="arrowRight" className="h-4 w-4" />
      </Link>
    </aside>
  );
}

/* ------------------------------------------------------------------ Featured schools */

const BOARD_LABEL: Record<string, string> = { CISCE: 'ICSE', CBSE: 'CBSE', IB: 'IB', CAMBRIDGE: 'Cambridge', NIOS: 'NIOS' };
const shortClass = (c: string) => c.replace(/^Class\s+/i, '').replace(/^KG \/ Pre-Primary$/i, 'KG');

/**
 * Four of the featured schools (openly licensed photos), preferring those whose profile says the most: an official
 * fee, the classes taught, the town and boarding. At most one school from a network (Navodaya, Kendriya Vidyalaya), so
 * the four are varied.
 */
export function pickFeatured(schools: SchoolSummary[], count = 4): SchoolSummary[] {
  const score = (s: SchoolSummary) => (s.annualFeeFrom != null ? 3 : 0) + (s.classesFrom && s.classesTo ? 2 : 0) + (s.city ? 2 : 0)
    + (s.hasHostel ? 1 : 0) + (s.network ? 0 : 1);
  const ranked = [...schools].filter((s) => s.coverImageUrl).sort((a, b) => score(b) - score(a) || a.name.localeCompare(b.name));
  const out: SchoolSummary[] = [];
  const networks = new Set<string>();
  for (const s of ranked) {
    if (s.network && networks.has(s.network)) continue;
    if (s.network) networks.add(s.network);
    out.push(s);
    if (out.length === count) break;
  }
  return out;
}

export function FeaturedSchools({ state }: { state: ApiState<SchoolSummary[]> }) {
  const schools = state.data ?? [];
  if (!state.loading && schools.length === 0) return null;
  return (
    <section aria-labelledby="featured-heading" className="container-wide pt-10 sm:pt-12">
      <SectionHead id="featured-heading" title="Featured Schools"
        sub="Explore well-documented schools on SchoolDhundo, with openly licensed photos. This is not a ranking."
        action={<MoreLink to="/schools">View more schools</MoreLink>} />
      <ul className={`mt-5 ${RAIL} lg:grid-cols-4`}>
        {schools.length === 0 && [0, 1, 2, 3].map((i) => <li key={i} className={`h-80 animate-pulse ${RAIL_ITEM} ${CARD}`} aria-hidden />)}
        {schools.map((s) => {
          const place = [s.city ?? s.districtName, s.stateName].filter(Boolean).join(', ');
          const classes = s.classesFrom && s.classesTo ? `${shortClass(s.classesFrom)} – ${shortClass(s.classesTo)}` : null;
          const board = s.boardCode ? BOARD_LABEL[s.boardCode] ?? s.boardCode : null;
          return (
            <li key={s.id} className={`group flex min-w-0 flex-col p-3 ${RAIL_ITEM} ${CARD}`}>
              <SchoolImage src={s.coverImageUrl} name={s.name} caption={s.city} credit={s.coverImageCredit} illustrative={s.coverImageIllustrative}
                className="rounded-xl" />
              <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
                <h3 className="line-clamp-2 font-display text-[17px] font-extrabold leading-snug text-navy">{s.name}</h3>
                {place && <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600"><Icon name="pin" className="h-4 w-4 shrink-0 text-slate-500" /> <span className="truncate">{place}</span></p>}
                {(board || classes) && (
                  <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-700">
                    {board && <span className="rounded-md bg-royal-50 px-2 py-0.5 text-xs font-extrabold text-royal-700">{board}</span>}
                    {classes && <span>Classes: {classes}</span>}
                  </p>
                )}
                {s.annualFeeFrom != null && (
                  <p className="mt-1.5 text-sm text-slate-700">
                    Fee: from <strong className="text-navy">{s.annualFeeFrom === 0 ? 'Free' : formatMoneyCompact(s.annualFeeFrom)}</strong> / year
                    {s.annualFeeYear && <span className="text-xs text-slate-500"> ({s.annualFeeYear}, official)</span>}
                  </p>
                )}
                <Link to={`/schools/${s.slug}`} className="mt-auto flex items-center justify-center gap-1.5 rounded-xl border-2 border-royal-200 py-2 text-sm font-bold text-royal-700 transition hover:border-royal-600 hover:bg-royal-600 hover:text-white">
                  View Details <Icon name="arrowRight" className="h-4 w-4" /><span className="sr-only">: {s.name}</span>
                </Link>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ Grow with SchoolDhundo */

const contact = (subject: string) => `/contact?topic=ADVERTISING&subject=${encodeURIComponent(subject)}`;

const GROW: { title: string; text: string; icon: IconName; tone: string; to: string; action: string; button: string; sponsored?: boolean }[] = [
  {
    title: 'Promote Your School', icon: 'megaphone', tone: 'bg-emerald-50 text-emerald-600', to: '/claim-school', action: 'List Your School',
    text: 'Showcase your school’s facilities, admissions and achievements to parents and students across India.', button: 'bg-royal-600 hover:bg-royal-700',
  },
  {
    title: 'Sponsored Listings', icon: 'crown', tone: 'bg-amber-100 text-amber-600', to: contact('Featured school listing'), action: 'Get Featured', sponsored: true,
    text: 'Get premium visibility on your city and board pages, always clearly labelled. Rankings are never for sale.', button: 'bg-flame-700 hover:bg-flame-800',
  },
  {
    title: 'Lead Generation', icon: 'users', tone: 'bg-violet-50 text-violet-600', to: contact('Admission enquiries'), action: 'Generate Leads',
    text: 'Receive admission enquiries from interested parents, sent to you with their consent.', button: 'bg-royal-600 hover:bg-royal-700',
  },
  {
    title: 'Advertise With Us', icon: 'barsUp', tone: 'bg-royal-50 text-royal-600', to: '/advertise', action: 'Advertise Now',
    text: 'Reach parents, students and educators through clearly labelled banners, listings and campaigns.', button: 'bg-royal-500 hover:bg-royal-600',
  },
];

export function GrowSection() {
  return (
    <section aria-labelledby="grow-heading" className="container-wide pb-12 pt-10 sm:pt-12">
      <SectionHead id="grow-heading" title={<>Grow with <span className="text-flame-600">SchoolDhundo</span></>}
        sub="A platform for schools, educators and education partners to reach the right audience across India." />
      <ul className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {GROW.map((g) => (
          <li key={g.title} className={`relative flex min-w-0 flex-col p-5 ${g.sponsored
            ? 'rounded-2xl bg-gradient-to-br from-amber-50 to-flame-50 shadow-[0_10px_28px_-18px_rgba(194,65,12,0.5)] ring-2 ring-flame-400/60' : CARD}`}>
            {g.sponsored && <span className="absolute -top-2.5 right-4 rounded-md bg-flame-700 px-2 py-0.5 text-[11px] font-bold text-white shadow">Sponsored</span>}
            <div className="flex items-start gap-3">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${g.tone}`}><Icon name={g.icon} className="h-6 w-6" /></span>
              <div className="min-w-0">
                <h3 className="font-display text-lg font-extrabold text-navy">{g.title}</h3>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{g.text}</p>
              </div>
            </div>
            <Link to={g.to} className={`mt-4 inline-flex w-fit items-center gap-1.5 self-start rounded-xl px-5 py-2.5 text-sm font-bold text-white shadow-sm transition sm:ml-[3.75rem] ${g.button}`}>
              {g.action} <Icon name="arrowRight" className="h-4 w-4" />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ Photo credits */

/** Credit, licence and source for every photograph on the page (CC BY and BY-SA require them). */
export function PhotoCredits() {
  return (
    <details className="container-wide group pb-10 text-xs text-slate-500">
      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded font-semibold text-slate-600 hover:text-navy">
        Photo credits <Icon name="chevronDown" className="h-3.5 w-3.5 transition group-open:rotate-180" />
      </summary>
      <p className="mt-2">Photographs are resized and cropped from the originals. Pictures of a named school show that school; the others are illustrations.</p>
      <ul className="mt-2 grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {Object.entries(HOME_IMAGES).map(([id, img]) => (
          <li key={id}>
            {img.alt}: {img.credit},{' '}
            {img.licenceUrl ? <a href={img.licenceUrl} target="_blank" rel="noopener noreferrer license" className="underline hover:text-navy">{img.licence}</a> : img.licence}
            {' · '}<a href={img.sourceUrl} target="_blank" rel="noopener noreferrer" className="underline hover:text-navy">source</a>
          </li>
        ))}
      </ul>
    </details>
  );
}
