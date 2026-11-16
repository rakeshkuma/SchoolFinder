import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { ErrorState, Spinner } from '../components/common/States';
import { BANDS, CHECKED_ON, FAQ, OLYMPIAD_SUBTITLE, OLYMPIAD_TITLE, PATTERNS, PATTERN_NOTES, SOF_DATES, SOURCES, SUBJECTS } from '../content/olympiad';
import { useMember } from '../hooks/useMember';
import { useLocalList } from '../hooks/usePersonal';
import { revisionIds, wrongQuestions } from '../hooks/usePracticeProgress';
import type { PracticeBankQuestion, PracticeCategory, PracticeSetSummary } from '../types/api';
import { formatDate } from '../utils/format';

/**
 * The Olympiad view of the practice centre (/exams/practice?category=OLYMPIAD): choose a class, a subject and a topic,
 * then practise with the shared engine. Every test opens /exams/practice/session or a set page, so attempts, scores and
 * progress are recorded exactly as for every other practice; nothing here stores anything of its own.
 */

export const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
/** "Class V" → 5; null for any other level. */
export const classOf = (level: string | null | undefined): number | null => {
  const m = /^Class ([IVX]+)$/.exec(level ?? '');
  const n = m ? ROMAN.indexOf(m[1]) : -1;
  return n > 0 ? n : null;
};
const levelOf = (n: number) => `Class ${ROMAN[n]}`;
const DIFFICULTIES = [['EASY', 'Easy'], ['MEDIUM', 'Medium'], ['HARD', 'Higher-order']] as const;
const IOQM = 'IOQM-style Mathematics';
const REASONING = 'Logical Reasoning';

/** Olympiad-style mocks built from a class's questions in the section balance of the SOF Level 1 paper. */
export const MOCKS = {
  maths: { label: 'Maths Olympiad-style mock', subject: 'Mathematics', reasoning: [10, 15], length: [35, 50], min: 20,
    about: 'Logical Reasoning first, then Mathematics, with the higher-order questions last: the order and balance of the SOF IMO Level 1 paper' },
  science: { label: 'Science Olympiad-style mock', subject: 'Science', reasoning: [5, 10], length: [35, 50], min: 20,
    about: 'Logical Reasoning first, then Science, with the higher-order questions last: the order and balance of the SOF ISO Level 1 paper' },
  english: { label: 'English Olympiad-style test', subject: 'English', reasoning: [0, 0], length: [35, 50], min: 15,
    about: 'Word and structure, reading and expression questions, as in the SOF IEO' },
} as const;
export type MockKind = keyof typeof MOCKS;

/**
 * Title and description for an Olympiad session, from its address. Only known values are used (a class from the list
 * and a mock kind from MOCKS), so an address cannot put arbitrary text into a page title.
 */
export function olympiadSessionText(params: URLSearchParams, serverTitle: string, questionCount: number): { title: string; description: string } | null {
  if (params.get('category') !== 'OLYMPIAD') return null;
  const n = classOf(params.get('level'));
  if (!n) return null;
  const mock = params.get('mock') as MockKind | null;
  if (mock && mock in MOCKS) {
    const m = MOCKS[mock];
    return { title: `${m.label}: Class ${ROMAN[n]}`,
      description: `${questionCount} SchoolDhundo questions for Class ${ROMAN[n]} — ${m.about}. Original practice, not an SOF paper; 1 mark for each correct answer here.` };
  }
  return { title: `${serverTitle} · Class ${ROMAN[n]} Olympiad`, description: '' };
}

/** A small seeded generator, so a mock is a fair random draw each time it is opened. */
function shuffled<T>(list: T[], seed: number): T[] {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** "olympiad-class5-english-1/q12" → ["olympiad-class5-english-1", 12], for ordering questions as their set does. */
const place = (q: PracticeBankQuestion): [string, number] => [q.setSlug, Number(q.id.split('/q').pop()) || 0];
const bySetOrder = (a: PracticeBankQuestion, b: PracticeBankQuestion) => {
  const [sa, na] = place(a), [sb, nb] = place(b);
  return sa.localeCompare(sb) || na - nb;
};

/**
 * The questions of a mock: reasoning first, then the subject, higher-order questions last (a stable sort keeps the
 * random order within each part). In English the reading questions come first, in their set's order, so questions on
 * one passage stay together.
 */
export function drawMock(kind: MockKind, n: number, pool: PracticeBankQuestion[], seed: number): { reasoning: PracticeBankQuestion[]; subject: PracticeBankQuestion[] } {
  const m = MOCKS[kind];
  const big = n >= 5 ? 1 : 0;
  const hardLast = (qs: PracticeBankQuestion[]) => [...qs].sort((a, b) => Number(a.difficulty === 'HARD') - Number(b.difficulty === 'HARD'));
  const reasoning = hardLast(shuffled(pool.filter((q) => q.section === REASONING), seed).slice(0, m.reasoning[big]));
  const wanted = m.length[big] - reasoning.length;
  let subject = shuffled(pool.filter((q) => q.section === m.subject), seed + 1).slice(0, wanted);
  if (kind === 'english') {
    const reading = subject.filter((q) => q.chapter === 'Reading').sort(bySetOrder);
    subject = [...reading, ...hardLast(subject.filter((q) => q.chapter !== 'Reading'))];
  } else {
    subject = hardLast(subject);
  }
  return { reasoning, subject };
}

const sessionUrl = (p: Record<string, string>) => `/exams/practice/session?${new URLSearchParams(p)}`;
const minutes = (n: number) => Math.ceil(n * 1.2);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function OlympiadPractice({ sets, setsError, bank, bankError, onRetry, pointsNote, advancedBuilder, categoryLabels }: {
  sets: PracticeSetSummary[] | null;
  setsError: Error | null;
  bank: PracticeBankQuestion[] | null;
  bankError: Error | null;
  onRetry: () => void;
  pointsNote: ReactNode;
  advancedBuilder: ReactNode;
  categoryLabels: Record<PracticeCategory, string>;
}) {
  const [params, setParams] = useSearchParams();
  const olympiad = useMemo(() => (bank ?? []).filter((q) => q.category === 'OLYMPIAD'), [bank]);
  const olympiadSets = useMemo(() => (sets ?? []).filter((s) => s.category === 'OLYMPIAD'), [sets]);
  const byClass = useMemo(() => {
    const m = new Map<number, PracticeBankQuestion[]>();
    for (const q of olympiad) { const n = classOf(q.level); if (n) m.set(n, [...(m.get(n) ?? []), q]); }
    return m;
  }, [olympiad]);
  const requested = Number(params.get('class'));
  const cls = byClass.has(requested) ? requested : null;
  const subjectParam = params.get('subject');
  const classPool = cls ? byClass.get(cls)! : [];
  const subject = subjectParam && classPool.some((q) => q.section === subjectParam) ? subjectParam : null;
  const subjectRef = useRef<HTMLElement>(null);
  const practiseRef = useRef<HTMLElement>(null);
  const [builderOpen, setBuilderOpen] = useState(false);

  const choose = (next: { class?: number | null; subject?: string | null }) => {
    const p = new URLSearchParams(params);
    p.set('category', 'OLYMPIAD');
    if ('class' in next) { if (next.class) p.set('class', String(next.class)); else p.delete('class'); p.delete('subject'); }
    if ('subject' in next) { if (next.subject) p.set('subject', next.subject); else p.delete('subject'); }
    setParams(p, { replace: true });
  };
  // After a choice, bring the next step into view (not on first load, so a shared link opens at the top).
  const [scrollTo, setScrollTo] = useState<'subject' | 'practise' | null>(null);
  useEffect(() => {
    if (!scrollTo) return;
    (scrollTo === 'subject' ? subjectRef : practiseRef).current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
    setScrollTo(null);
  }, [scrollTo, cls, subject]);

  const stats = {
    questions: olympiad.length,
    classes: byClass.size,
    subjects: new Set(olympiad.map((q) => q.section)).size,
    hindi: olympiad.filter((q) => q.hindi).length,
  };

  return (
    <>
      <OlympiadHero stats={bank ? stats : null} />
      <div className="container-page py-6 sm:py-8">
        <nav aria-label="Practice categories" className="-mx-1 flex flex-wrap items-center gap-2 text-sm">
          <span className="px-1 text-slate-500">Practice centre:</span>
          <Link to="/exams/practice" className="chip bg-slate-100 px-3 py-1 text-sm text-slate-700 hover:bg-slate-200">All</Link>
          {(['ENTRANCE', 'SCHOOL', 'OLYMPIAD', 'COMPETITIVE'] as const).map((c) => (
            <Link key={c} to={`/exams/practice?category=${c}`} aria-current={c === 'OLYMPIAD' ? 'page' : undefined}
              className={`chip px-3 py-1 text-sm ${c === 'OLYMPIAD' ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {categoryLabels[c]}
            </Link>
          ))}
        </nav>

        {bankError ? <div className="mt-6"><ErrorState error={bankError} onRetry={onRetry} /></div> : !bank ? <Spinner /> : (
          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="min-w-0 space-y-6">
              <ClassPicker byClass={byClass} selected={cls} onChoose={(n) => { choose({ class: n }); setScrollTo('subject'); }} />
              {cls && (
                <section ref={subjectRef} aria-labelledby="step-subject" className="card scroll-mt-24 p-5 sm:p-6">
                  <StepHeading n={2} id="step-subject" title={`Choose a subject for Class ${ROMAN[cls]}`}
                    action={<button type="button" className="text-sm font-semibold text-slate-600 hover:text-ink hover:underline" onClick={() => choose({ class: null })}>Change class</button>} />
                  <SubjectPicker pool={classPool} selected={subject} cls={cls} onChoose={(s) => { choose({ subject: s }); setScrollTo('practise'); }} />
                </section>
              )}
              {cls && subject && (
                <section ref={practiseRef} aria-labelledby="step-practise" className="card scroll-mt-24 p-5 sm:p-6">
                  <PractiseStep key={`${cls}-${subject}`} cls={cls} subject={subject} pool={classPool.filter((q) => q.section === subject)} />
                </section>
              )}
              {cls && <ClassTests cls={cls} pool={classPool} />}
              <SetsSection sets={olympiadSets} setsError={setsError} bank={olympiad} cls={cls} />
            </div>
            <aside className="space-y-4 lg:sticky lg:top-24 lg:h-fit">
              <YourOlympiadPractice bank={olympiad} cls={cls} />
              {pointsNote}
            </aside>
          </div>
        )}

        <AboutOlympiads />
        {/* Mounted only when opened, so it does not load anything the page has not asked for. */}
        <details className="card mt-6 p-5" onToggle={(e) => setBuilderOpen((e.currentTarget as HTMLDetailsElement).open)}>
          <summary className="cursor-pointer font-display text-lg font-bold text-ink">All practice filters</summary>
          <p className="mt-2 text-sm text-slate-600">The full practice builder, with every mode and filter, already set to Olympiads.</p>
          {builderOpen && <div className="mt-4">{advancedBuilder}</div>}
        </details>
      </div>
    </>
  );
}

function OlympiadHero({ stats }: { stats: { questions: number; classes: number; subjects: number; hindi: number } | null }) {
  return (
    <div className="relative overflow-hidden bg-navy text-white">
      <div className="absolute inset-0 bg-gradient-to-br from-navy-950 via-navy to-royal-700/90" aria-hidden />
      <div className="absolute -right-20 -top-24 h-64 w-64 rounded-full bg-flame-500/20 blur-3xl" aria-hidden />
      <div className="container-page relative py-6 sm:py-9">
        <nav aria-label="Breadcrumb" className="text-xs text-blue-100">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link to="/exams" className="hover:text-white hover:underline">Exams</Link></li>
            <li aria-hidden>›</li>
            <li><Link to="/exams/practice" className="hover:text-white hover:underline">Practice centre</Link></li>
            <li aria-hidden>›</li>
            <li aria-current="page" className="text-white">Olympiads</li>
          </ol>
        </nav>
        <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{OLYMPIAD_TITLE}</h1>
            <p className="mt-2 text-base text-blue-100">{OLYMPIAD_SUBTITLE}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a href="#step-class" className="btn bg-flame-500 text-navy-950 shadow-sm hover:bg-flame-400">Choose your class <Icon name="arrowRight" className="h-4 w-4" /></a>
              <Link to="/exams/practice/progress" className="btn border border-white/30 bg-white/10 text-white hover:bg-white/20">
                <Icon name="chart" className="h-4 w-4" /> View My Practice Progress
              </Link>
            </div>
          </div>
          <dl className="grid grid-cols-4 gap-x-4 gap-y-2 text-blue-100 sm:gap-x-6 lg:grid-cols-2">
            {([['Questions', stats?.questions], ['Classes', stats?.classes], ['Subjects', stats?.subjects], ['In हिन्दी', stats?.hindi]] as const).map(([label, value]) => (
              <div key={label}>
                <dt className="text-[11px] sm:text-xs">{label}</dt>
                <dd className="font-display text-xl font-bold tabular-nums text-white sm:text-2xl">{value ?? '–'}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-5 text-xs text-blue-100/90">
          SchoolDhundo practice questions — original, written in the style of school Olympiads. Not official, sample or previous-year papers, and not
          connected with SOF, HBCSE or MTA(I).
        </p>
      </div>
    </div>
  );
}

function StepHeading({ n, id, title, action }: { n: number; id: string; title: string; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 id={id} className="flex scroll-mt-24 items-center gap-3 font-display text-xl font-bold text-ink">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-navy text-sm font-bold text-white" aria-hidden>{n}</span>
        {title}
      </h2>
      {action}
    </div>
  );
}

function ClassPicker({ byClass, selected, onChoose }: { byClass: Map<number, PracticeBankQuestion[]>; selected: number | null; onChoose: (n: number) => void }) {
  const bandCount = BANDS.map((b) => ({ ...b, count: [...byClass.entries()].filter(([n]) => n >= b.from && n <= b.to).reduce((s, [, qs]) => s + qs.length, 0) }));
  // The two bands with the most practice (Classes III–V and VI–VIII today) come first, with larger tiles; every other
  // class stays one tap away in the row below.
  const top = [...bandCount].sort((a, b) => b.count - a.count).slice(0, 2).filter((b) => b.count > 0).map((b) => b.from);
  const band = (b: (typeof bandCount)[number], featured: boolean) => (
    <div key={b.from} className={`rounded-xl border p-3 ${featured ? 'border-flame-100 bg-flame-50/60' : 'border-slate-200 bg-slate-50/60'}`}>
      <p className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs font-semibold text-slate-600">
        <span>{b.label} · Classes {ROMAN[b.from]}–{ROMAN[b.to]}</span>
        {featured && <span className="chip bg-flame-100 text-flame-800">Most practice</span>}
      </p>
      <div className="mt-2 flex gap-2">
        {Array.from({ length: b.to - b.from + 1 }, (_, i) => b.from + i).map((n) => {
          const count = byClass.get(n)?.length ?? 0;
          const size = featured ? 'min-h-[76px]' : 'min-h-[60px]';
          if (count === 0) {
            return (
              <div key={n} className={`flex ${size} flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white px-2 text-center`}>
                <span className="font-display text-lg font-bold text-slate-500">{ROMAN[n]}</span>
                <span className="text-[11px] text-slate-500">Coming later</span>
              </div>
            );
          }
          const active = selected === n;
          return (
            <button key={n} type="button" aria-pressed={active} onClick={() => onChoose(n)} aria-label={`Class ${ROMAN[n]}, ${count} questions`}
              className={`flex ${size} flex-1 flex-col items-center justify-center rounded-lg border px-2 text-center transition focus:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/30 ${active
                ? 'border-royal-600 bg-royal-600 text-white shadow-sm' : 'border-slate-200 bg-white text-ink hover:border-royal-500 hover:bg-royal-50'}`}>
              <span className={`font-display font-bold ${featured ? 'text-2xl' : 'text-lg'}`}>{ROMAN[n]}</span>
              <span className={`text-[11px] ${active ? 'text-blue-100' : 'text-slate-500'}`}>{count} questions</span>
            </button>
          );
        })}
      </div>
    </div>
  );
  return (
    <section aria-labelledby="step-class" className="card scroll-mt-24 p-5 sm:p-6" id="step-class-card">
      <StepHeading n={1} id="step-class" title="Choose your class" />
      <div className="mt-4 grid gap-3 sm:grid-cols-2">{bandCount.filter((b) => top.includes(b.from)).map((b) => band(b, true))}</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">{bandCount.filter((b) => !top.includes(b.from)).map((b) => band(b, false))}</div>
    </section>
  );
}

function SubjectPicker({ pool, selected, cls, onChoose }: { pool: PracticeBankQuestion[]; selected: string | null; cls: number; onChoose: (s: string) => void }) {
  const present = [...new Set(pool.map((q) => q.section))];
  const ordered = [...SUBJECTS.filter((s) => present.includes(s.section)),
    ...present.filter((s) => !SUBJECTS.some((x) => x.section === s)).sort().map((s) => ({ section: s, label: s, icon: 'book' as const, blurb: '', advanced: false }))];
  return (
    <div role="radiogroup" aria-label="Subject" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {ordered.map((s) => {
        const qs = pool.filter((q) => q.section === s.section);
        const chapters = [...new Set(qs.map((q) => q.chapter).filter(Boolean))] as string[];
        const active = selected === s.section;
        return (
          <button key={s.section} type="button" role="radio" aria-checked={active} onClick={() => onChoose(s.section)}
            className={`flex items-start gap-3 rounded-xl border p-4 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/30 ${active
              ? 'border-royal-600 bg-royal-50 ring-1 ring-royal-600' : 'border-slate-200 hover:border-royal-200 hover:bg-slate-50'}`}>
            <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-royal-600 text-white' : s.advanced ? 'bg-flame-100 text-flame-800' : 'bg-navy/5 text-navy'}`}>
              <Icon name={s.icon} className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
                {s.label}
                {s.advanced && <span className="chip bg-flame-100 text-flame-800">{cls === 8 ? 'Introduction · optional' : 'Advanced · optional'}</span>}
              </span>
              <span className="mt-0.5 block text-xs text-slate-600">{plural(qs.length, 'question')} · {plural(chapters.length, 'topic')}{s.blurb ? ` · ${s.blurb}` : ''}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

type Mode = 'QUICK' | 'TOPIC' | 'MINI_MOCK' | 'FULL';
const MODES: { mode: Mode; title: string; blurb: (n: number) => string; icon: 'bolt' | 'target' | 'clock' | 'layers' }[] = [
  { mode: 'QUICK', title: 'Quick practice', blurb: () => '5 questions, untimed', icon: 'bolt' },
  { mode: 'TOPIC', title: 'Topic practice', blurb: () => 'Choose how many', icon: 'target' },
  { mode: 'MINI_MOCK', title: 'Mini mock test', blurb: (n) => `${Math.min(10, n)} questions, about ${minutes(Math.min(10, n))} min, timed`, icon: 'clock' },
  { mode: 'FULL', title: 'Full practice test', blurb: (n) => `All ${n} matching questions`, icon: 'layers' },
];

function PractiseStep({ cls, subject, pool }: { cls: number; subject: string; pool: PracticeBankQuestion[] }) {
  const navigate = useNavigate();
  const [chapter, setChapter] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [hindi, setHindi] = useState(false);
  const [mode, setMode] = useState<Mode>('QUICK');
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(false);
  const chapters = useMemo(() => {
    const m = new Map<string, number>();
    pool.forEach((q) => { if (q.chapter) m.set(q.chapter, (m.get(q.chapter) ?? 0) + 1); });
    return [...m.entries()];
  }, [pool]);
  const inChapter = pool.filter((q) => !chapter || q.chapter === chapter);
  const filtered = inChapter.filter((q) => (!difficulty || q.difficulty === difficulty) && (!hindi || q.hindi));
  const anyHindi = pool.some((q) => q.hindi);
  const lengths = [5, 10, 15, 20].filter((n) => n < filtered.length).concat(filtered.length);
  const size = mode === 'QUICK' ? Math.min(5, filtered.length) : mode === 'MINI_MOCK' ? Math.min(10, filtered.length)
    : mode === 'TOPIC' ? Math.min(count, filtered.length) : filtered.length;
  const subjectLabel = SUBJECTS.find((s) => s.section === subject)?.label ?? subject;

  const start = () => {
    const p: Record<string, string> = { mode, category: 'OLYMPIAD', level: levelOf(cls), section: subject };
    if (chapter) p.chapter = chapter;
    if (difficulty) p.difficulty = difficulty;
    if (hindi) p.hindi = '1';
    if (mode === 'TOPIC' || mode === 'FULL') p.count = String(size);
    if (mode === 'MINI_MOCK' || ((mode === 'TOPIC' || mode === 'FULL') && timed)) p.timer = '1';
    navigate(sessionUrl(p));
  };

  return (
    <>
      <StepHeading n={3} id="step-practise" title={`${subjectLabel}: choose a topic and start`} />
      <fieldset className="mt-4">
        <legend className="text-sm font-semibold text-ink">Topic</legend>
        <div role="radiogroup" aria-label="Topic" className="mt-2 flex flex-wrap gap-2">
          {[['', 'All topics', pool.length] as const, ...chapters.map(([c, n]) => [c, c, n] as const)].map(([value, label, n]) => (
            <button key={value || 'all'} type="button" role="radio" aria-checked={chapter === value} onClick={() => { setChapter(value); setDifficulty(''); }}
              className={`min-h-[40px] rounded-full px-3.5 py-1.5 text-sm transition focus:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/30 ${chapter === value
                ? 'bg-navy text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {label} <span className={chapter === value ? 'text-blue-100' : 'text-slate-600'}>· {n}</span>
            </button>
          ))}
        </div>
      </fieldset>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-3">
        <div role="group" aria-label="Difficulty" className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-ink">Difficulty</span>
          {[['', 'Any'] as const, ...DIFFICULTIES].map(([value, label]) => {
            const n = value ? inChapter.filter((q) => q.difficulty === value && (!hindi || q.hindi)).length : inChapter.filter((q) => !hindi || q.hindi).length;
            return (
              <button key={value || 'any'} type="button" aria-pressed={difficulty === value} disabled={n === 0} onClick={() => setDifficulty(value)}
                className={`chip min-h-[36px] px-3 py-1 text-sm disabled:cursor-not-allowed disabled:opacity-40 ${difficulty === value ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                {label} ({n})
              </button>
            );
          })}
        </div>
        {anyHindi && (
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={hindi} onChange={(e) => setHindi(e.target.checked)} />
            Only questions with a Hindi version (<span lang="hi">हिन्दी</span>)
          </label>
        )}
      </div>

      <div role="radiogroup" aria-label="Practice mode" className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {MODES.map((m) => {
          const active = mode === m.mode;
          return (
            <button key={m.mode} type="button" role="radio" aria-checked={active} onClick={() => setMode(m.mode)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-4 focus-visible:ring-royal-500/30 ${active
                ? 'border-royal-600 bg-royal-50 ring-1 ring-royal-600' : 'border-slate-200 hover:border-royal-200 hover:bg-slate-50'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Icon name={m.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{m.title}</span>
                <span className="block text-xs text-slate-600">{m.blurb(filtered.length)}</span>
              </span>
            </button>
          );
        })}
      </div>
      {mode === 'TOPIC' && filtered.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Number of questions">
          <span className="text-slate-600">Questions:</span>
          {[...new Set(lengths)].map((n) => (
            <button key={n} type="button" aria-pressed={Math.min(count, filtered.length) === n} onClick={() => setCount(n)}
              className={`chip min-h-[36px] px-3 py-1 ${Math.min(count, filtered.length) === n ? 'bg-royal-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
              {n === filtered.length ? `All ${n}` : n}
            </button>
          ))}
        </div>
      )}
      {(mode === 'TOPIC' || mode === 'FULL') && (
        <label className="mt-3 flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
          Use a timer (about 1.2 minutes a question)
        </label>
      )}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
        <p className="text-sm text-slate-600" aria-live="polite">
          {filtered.length === 0 ? 'No questions match. Choose another topic or difficulty.'
            : <><strong className="text-ink">{filtered.length}</strong> matching · this test: <strong className="text-ink">{size}</strong> question{size === 1 ? '' : 's'}</>}
        </p>
        <button type="button" className="btn-primary" disabled={filtered.length === 0} onClick={start}>
          Start Practice <Icon name="arrowRight" className="h-4 w-4" />
        </button>
      </div>
    </>
  );
}

/** Mixed tests for the chosen class: Olympiad-style mocks, a mini mock and the class's daily challenge. */
function ClassTests({ cls, pool }: { cls: number; pool: PracticeBankQuestion[] }) {
  const navigate = useNavigate();
  const mixed = pool.filter((q) => q.section !== IOQM);
  const level = levelOf(cls);
  const openMock = (kind: MockKind) => {
    const { reasoning, subject } = drawMock(kind, cls, mixed, Date.now() % 2147483647);
    navigate(sessionUrl({ mode: 'FULL', category: 'OLYMPIAD', level, mock: kind, ids: [...reasoning, ...subject].map((q) => q.id).join(','), timer: '1' }));
  };
  const openMini = () => {
    const ids = shuffled(mixed, Date.now() % 2147483647).slice(0, 10).map((q) => q.id);
    navigate(sessionUrl({ mode: 'MINI_MOCK', category: 'OLYMPIAD', level, ids: ids.join(','), timer: '1' }));
  };
  const mocks = (Object.keys(MOCKS) as MockKind[]).map((kind) => {
    const { reasoning, subject } = drawMock(kind, cls, mixed, 1);
    return { kind, reasoning: reasoning.length, subject: subject.length, total: reasoning.length + subject.length };
  }).filter((m) => m.total >= MOCKS[m.kind].min);
  return (
    <section aria-labelledby="class-tests" className="card p-5 sm:p-6">
      <h2 id="class-tests" className="font-display text-xl font-bold text-ink">Mock tests and daily challenge: Class {ROMAN[cls]}</h2>
      <p className="mt-1 text-sm text-slate-600">Timed tests drawn fresh from this class&apos;s questions each time. They follow the order and balance of the Olympiad papers where we have enough questions; the counts shown are the real ones.</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2">
        {mocks.map((m) => (
          <li key={m.kind} className="flex flex-col rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-ink">{MOCKS[m.kind].label}</p>
            <p className="mt-1 text-xs text-slate-600">
              {m.reasoning > 0 ? `${m.reasoning} Logical Reasoning + ${m.subject} ${MOCKS[m.kind].subject}` : `${m.subject} ${MOCKS[m.kind].subject}`} · {m.total} questions · {minutes(m.total)} min, timed
            </p>
            <button type="button" className="btn-secondary mt-3 self-start" onClick={() => openMock(m.kind)}>Start mock test</button>
          </li>
        ))}
        {mixed.length >= 10 && (
          <li className="flex flex-col rounded-xl border border-slate-200 p-4">
            <p className="font-semibold text-ink">Mixed mini mock</p>
            <p className="mt-1 text-xs text-slate-600">10 questions from every subject · {minutes(10)} min, timed</p>
            <button type="button" className="btn-secondary mt-3 self-start" onClick={openMini}>Start mini mock</button>
          </li>
        )}
        <li className="flex flex-col rounded-xl border border-flame-100 bg-flame-50/50 p-4">
          <p className="flex items-center gap-2 font-semibold text-ink"><Icon name="sun" className="h-4 w-4 text-flame-600" /> Class {ROMAN[cls]} daily challenge</p>
          <p className="mt-1 text-xs text-slate-600">The same {Math.min(10, pool.length)} questions for every Class {ROMAN[cls]} student today · {formatDate(new Date().toISOString().slice(0, 10))}</p>
          <Link to={sessionUrl({ mode: 'DAILY', category: 'OLYMPIAD', level, timer: '1' })} className="btn-secondary mt-3 self-start">Take today&apos;s challenge</Link>
        </li>
      </ul>
    </section>
  );
}

function SetsSection({ sets, setsError, bank, cls }: { sets: PracticeSetSummary[]; setsError: Error | null; bank: PracticeBankQuestion[]; cls: number | null }) {
  const shown = cls ? sets.filter((s) => classOf(s.level) === cls) : sets;
  const classes = [...new Set(shown.map((s) => classOf(s.level)).filter((n): n is number => !!n))].sort((a, b) => a - b);
  const other = shown.filter((s) => !classOf(s.level));
  return (
    <section aria-labelledby="sets-heading" className="space-y-4">
      <div>
        <h2 id="sets-heading" className="font-display text-xl font-bold text-ink">{cls ? `Ready-made practice sets: Class ${ROMAN[cls]}` : 'Ready-made practice sets'}</h2>
        <p className="mt-1 text-sm text-slate-600">Each set is a fixed list of questions on one subject; open it to read the rules, then start. {cls ? '' : 'Choose a class above to see only its sets.'}</p>
      </div>
      {setsError && <ErrorState error={setsError} />}
      {classes.map((n) => (
        <div key={n}>
          {!cls && <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Class {ROMAN[n]}</h3>}
          <ul className="grid gap-4 md:grid-cols-2">
            {shown.filter((s) => classOf(s.level) === n).map((s) => <li key={s.slug}><OlympiadSetCard set={s} bank={bank} /></li>)}
          </ul>
        </div>
      ))}
      {other.length > 0 && <ul className="grid gap-4 md:grid-cols-2">{other.map((s) => <li key={s.slug}><OlympiadSetCard set={s} bank={bank} /></li>)}</ul>}
    </section>
  );
}

export function OlympiadSetCard({ set, bank }: { set: PracticeSetSummary; bank: PracticeBankQuestion[] }) {
  const qs = bank.filter((q) => q.setSlug === set.slug);
  const mix = DIFFICULTIES.map(([d, label]) => [label, qs.filter((q) => q.difficulty === d).length] as const).filter(([, n]) => n > 0);
  const subjects = set.sections.map((s) => SUBJECTS.find((x) => x.section === s)?.label ?? s);
  const advanced = set.sections.includes(IOQM);
  return (
    <article className="card flex h-full flex-col p-5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="chip bg-navy/5 text-navy">{set.level}</span>
        <span className={`chip ${set.kind === 'MOCK' ? 'bg-royal-600 text-white' : 'bg-royal-50 text-royal-800'}`}>{set.kind === 'MOCK' ? 'Mock test' : 'Practice set'}</span>
        {advanced && <span className="chip bg-flame-100 text-flame-800">Advanced · optional</span>}
        <span className="chip bg-emerald-50 text-emerald-800">{set.hindi ? <>English · <span lang="hi">हिन्दी</span></> : 'English'}</span>
      </div>
      <h3 className="mt-3 font-display text-lg font-bold leading-snug text-ink">{set.title}</h3>
      <p className="mt-1 text-sm text-slate-600">{subjects.join(', ')}{set.chapters.length > 0 && <> · {set.chapters.slice(0, 4).join(', ')}{set.chapters.length > 4 && ` and ${set.chapters.length - 4} more`}</>}</p>
      <dl className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-xs">
        <div><dt className="text-slate-500">Questions</dt><dd className="mt-0.5 font-semibold text-ink tabular-nums">{set.questionCount}</dd></div>
        <div><dt className="text-slate-500">Time</dt><dd className="mt-0.5 font-semibold text-ink">{set.durationMinutes ? `${set.durationMinutes} min, timed` : `About ${minutes(set.questionCount)} min`}</dd></div>
        <div><dt className="text-slate-500">Difficulty</dt><dd className="mt-0.5 font-semibold text-ink">{mix.length ? mix.map(([l, n]) => `${n} ${l.toLowerCase()}`).join(' · ') : '–'}</dd></div>
      </dl>
      <div className="mt-4 flex flex-1 items-end">
        <Link to={`/exams/practice/${set.slug}`} className="btn-primary w-full sm:w-auto" aria-label={`Start practice: ${set.title}`}>
          Start Practice <Icon name="arrowRight" className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

/** Mistakes to revise and topics to work on, from the same wrong-answer list the progress page uses. */
function YourOlympiadPractice({ bank, cls }: { bank: PracticeBankQuestion[]; cls: number | null }) {
  const { status } = useMember();
  const local = useLocalList(wrongQuestions);
  const [server, setServer] = useState<string[] | null>(null);
  useEffect(() => {
    if (status !== 'signedIn') { setServer(null); return; }
    let live = true;
    revisionIds(true).then((ids) => { if (live) setServer(ids); }).catch(() => { if (live) setServer(null); });
    return () => { live = false; };
  }, [status]);
  const byId = useMemo(() => new Map(bank.map((q) => [q.id, q])), [bank]);
  const wrong = (server ?? local).map((id) => byId.get(id)).filter((q): q is PracticeBankQuestion => !!q && (!cls || classOf(q.level) === cls));
  const topics = [...wrong.reduce((m, q) => {
    const key = `${q.level}|${q.section}|${q.chapter ?? ''}`;
    return m.set(key, (m.get(key) ?? 0) + 1);
  }, new Map<string, number>()).entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return (
    <section aria-labelledby="your-olympiad" className="card p-5">
      <h2 id="your-olympiad" className="font-display text-lg font-bold text-ink">Your Olympiad practice{cls ? `: Class ${ROMAN[cls]}` : ''}</h2>
      {wrong.length === 0 ? (
        <p className="mt-2 text-sm text-slate-600">Questions you answer wrongly appear here, so you can revise them and see which topics need work.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-slate-700"><strong>{plural(wrong.length, 'question')}</strong> to revise.</p>
          <Link className="btn-secondary mt-3 w-full" to={sessionUrl({ mode: 'RETRY', category: 'OLYMPIAD', ...(cls ? { level: levelOf(cls) } : {}), ids: wrong.map((q) => q.id).join(',') })}>
            <Icon name="repeat" className="h-4 w-4" /> Revise these questions
          </Link>
          {topics.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">Topics to work on</p>
              <ul className="mt-2 space-y-1.5 text-sm">
                {topics.map(([key, n]) => {
                  const [level, section, chapter] = key.split('|');
                  const p: Record<string, string> = { mode: 'TOPIC', category: 'OLYMPIAD', level, section, count: '10' };
                  if (chapter) p.chapter = chapter;
                  return (
                    <li key={key}>
                      <Link to={sessionUrl(p)} className="link">{chapter || section}</Link>
                      <span className="text-slate-500"> · {level}, {section} · {plural(n, 'mistake')}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </>
      )}
      <Link to="/exams/practice/progress" className="btn-primary mt-4 w-full"><Icon name="chart" className="h-4 w-4" /> View My Practice Progress</Link>
      <p className="mt-2 text-xs text-slate-500">
        {status === 'signedIn' ? 'Your results are saved to your account.' : 'Results are kept in this browser. Sign in to keep them on every device.'} All practice, Olympiad and every other exam, is on the same progress page.
      </p>
    </section>
  );
}

function AboutOlympiads() {
  return (
    <section aria-labelledby="about-olympiads" className="mt-10 space-y-5">
      <div>
        <h2 id="about-olympiads" className="section-title">School Olympiads at a glance</h2>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">
          The paper patterns below are from the organisers&apos; own pages, checked on {formatDate(CHECKED_ON)}. Patterns and dates can change, so confirm
          them with your school or on the organiser&apos;s site before the exam.
        </p>
      </div>
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Level 1 paper patterns of SOF Olympiads and IOQM</caption>
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr><th scope="col" className="px-4 py-3">Exam</th><th scope="col" className="px-4 py-3">Classes</th><th scope="col" className="px-4 py-3">Paper</th><th scope="col" className="px-4 py-3">Sections</th><th scope="col" className="px-4 py-3">Time</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PATTERNS.map((p) => (
                <tr key={p.exam + p.classes}>
                  <th scope="row" className="px-4 py-3 font-medium text-ink">{p.exam}</th>
                  <td className="px-4 py-3 whitespace-nowrap">{p.classes}</td>
                  <td className="px-4 py-3">{p.questions}</td>
                  <td className="px-4 py-3 text-slate-600">{p.sections}</td>
                  <td className="px-4 py-3 whitespace-nowrap">{p.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm text-slate-700">
          <h3 className="font-semibold text-ink">Good to know</h3>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">{PATTERN_NOTES.map((n) => <li key={n}>{n}</li>)}</ul>
          <p className="mt-3 font-semibold text-ink">SOF Level 1 dates for 2026–27</p>
          <ul className="mt-1 space-y-1">{SOF_DATES.map((d) => <li key={d.exam}><strong>{d.exam}:</strong> {d.dates}</li>)}</ul>
          <p className="mt-1 text-xs text-slate-500">Each school takes the exam on one of these dates.</p>
        </div>
        <div className="card p-5 text-sm text-slate-700">
          <h3 className="font-semibold text-ink">Official sources</h3>
          <ul className="mt-2 space-y-1.5">
            {SOURCES.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">{s.label} <Icon name="external" className="h-3.5 w-3.5" /></a></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            SchoolDhundo is not affiliated with the Science Olympiad Foundation, HBCSE or MTA(I). Our questions are written in the style of these exams
            and are not taken from their papers.
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl font-bold text-ink">Questions parents ask</h2>
        {FAQ.map((f) => (
          <details key={f.q} className="card group p-4">
            <summary className="flex cursor-pointer items-center justify-between gap-3 font-semibold text-ink">
              {f.q}<Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-500 transition group-open:rotate-180" />
            </summary>
            <p className="mt-2 text-sm text-slate-700">{f.a}</p>
          </details>
        ))}
        <p className="pt-2 text-sm text-slate-600">
          Also on SchoolDhundo: <Link to="/exams" className="link">school entrance exams</Link> · <Link to="/exams/jnvst" className="link">JNVST preparation</Link> ·{' '}
          <Link to="/exams/aissee" className="link">AISSEE preparation</Link> · <Link to="/exams/practice?category=SCHOOL" className="link">school subject practice</Link>
        </p>
      </div>
    </section>
  );
}
