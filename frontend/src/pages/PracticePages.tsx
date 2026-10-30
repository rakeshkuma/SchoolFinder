import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/Icon';
import { FigureRow, FigureView } from '../components/exam/FigureView';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState, ErrorState, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useMember } from '../hooks/useMember';
import { useLocalList } from '../hooks/usePersonal';
import {
  bookmarks, existingIds, localAttempts, newClientId, revisionIds, scoreAttempt, toggleBookmark, wrongQuestions, type LocalAttempt,
} from '../hooks/usePracticeProgress';
import { memberPracticeService } from '../services/accountApi';
import { ApiError } from '../services/http';
import { examService, practiceService, type PracticeSessionParams } from '../services/publicApi';
import type {
  PracticeBankQuestion, PracticeCategory, PracticeLanguage, PracticeMode, PracticePassage, PracticeQuestion, PracticeReportReason, PracticeScore,
  PracticeSetSummary,
} from '../types/api';
import { formatDate } from '../utils/format';
import { clearProgress, loadProgress, saveProgress, type TestProgress } from '../utils/testProgress';
import { NotFoundPage } from './InfoPages';

/** Shown wherever practice questions appear: they are this site's own, never the exam body's. */
export const PRACTICE_LABEL = 'India School Finder Practice Questions';

const DIFFICULTY_LABEL: Record<string, string> = { EASY: 'Easy', MEDIUM: 'Medium', HARD: 'Hard' };

export const CATEGORY_LABEL: Record<PracticeCategory, string> = {
  ENTRANCE: 'School entrance exams', SCHOOL: 'School subjects', OLYMPIAD: 'Olympiads', COMPETITIVE: 'Competitive exams',
};
const CATEGORY_ORDER: PracticeCategory[] = ['ENTRANCE', 'SCHOOL', 'OLYMPIAD', 'COMPETITIVE'];
const isCategory = (v: string | null): v is PracticeCategory => CATEGORY_ORDER.includes(v as PracticeCategory);

const LANG_KEY = 'isf.practice.lang';

/** English or Hindi, remembered in this browser; questions without a Hindi version are always shown in English. */
function useLanguage(): [PracticeLanguage, (lang: PracticeLanguage) => void] {
  const [lang, setLang] = useState<PracticeLanguage>(() => {
    try {
      return localStorage.getItem(LANG_KEY) === 'hi' ? 'hi' : 'en';
    } catch {
      return 'en';
    }
  });
  const choose = (next: PracticeLanguage) => {
    setLang(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* storage unavailable: the choice lasts for this page only */
    }
  };
  return [lang, choose];
}

export function questionText(q: PracticeQuestion, lang: PracticeLanguage): { prompt: string; options: string[]; hindi: boolean } {
  return lang === 'hi' && q.hi ? { ...q.hi, hindi: true } : { prompt: q.prompt, options: q.options, hindi: false };
}

function passageText(p: PracticePassage, lang: PracticeLanguage) {
  return lang === 'hi' && p.hi ? p.hi : { title: p.title, text: p.text };
}

/** 1 → "1 mark", 0.25 → "0.25 marks" */
const marksWord = (n: number) => `${n} mark${n === 1 ? '' : 's'}`;

const REPORT_REASONS: [PracticeReportReason, string][] = [
  ['WRONG_ANSWER', 'The answer key looks wrong'], ['UNCLEAR', 'The question is unclear'], ['TYPO', 'Typo or formatting'],
  ['TRANSLATION', 'Problem in the Hindi version'], ['OTHER', 'Something else'],
];

/** Lets a student flag a mistake in a question; an editor reviews every report. */
function ReportProblem({ id, hindi }: { id: string; hindi: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<PracticeReportReason>('WRONG_ANSWER');
  const [text, setText] = useState('');
  const [website, setWebsite] = useState(''); // honeypot: hidden from people
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  if (state === 'sent') return <p role="status" className="mt-2 text-xs text-emerald-700">Thank you — an editor will check this question.</p>;
  if (!open) {
    return <button type="button" className="mt-2 text-xs text-slate-500 underline hover:text-ink" onClick={() => setOpen(true)}>Report a problem with this question</button>;
  }
  const needsText = reason === 'OTHER';
  const send = async () => {
    setState('sending');
    setError(null);
    try {
      await practiceService.report(id, reason, text.trim(), website);
      setState('sent');
    } catch (e) {
      setState('idle');
      setError(e instanceof ApiError ? e.message : 'Could not send the report. Please try again.');
    }
  };
  return (
    <form className="mt-2 space-y-2 rounded-lg border border-slate-200 p-3" lang="en" onSubmit={(e) => { e.preventDefault(); void send(); }}>
      <label className="block text-xs"><span className="label">What is wrong?</span>
        <select className="input" value={reason} onChange={(e) => setReason(e.target.value as PracticeReportReason)}>
          {REPORT_REASONS.filter(([r]) => r !== 'TRANSLATION' || hindi).map(([r, label]) => <option key={r} value={r}>{label}</option>)}
        </select>
      </label>
      <label className="block text-xs"><span className="label">Details {needsText ? '' : '(optional)'}</span>
        <textarea className="input min-h-[64px]" maxLength={1000} required={needsText} value={text} onChange={(e) => setText(e.target.value)}
          placeholder="For example: the correct answer is C because…" />
      </label>
      <label className="sr-only" aria-hidden>Website<input tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} /></label>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <p className="text-xs text-slate-500">Please don&apos;t include personal details. Reports are read by India School Finder editors.</p>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary py-1.5 text-xs" disabled={state === 'sending' || (needsText && !text.trim())}>
          {state === 'sending' ? 'Sending…' : 'Send report'}
        </button>
        <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </form>
  );
}

/** Saves a question to come back to: in this browser, and in the account for members. */
function BookmarkButton({ id }: { id: string }) {
  const { status } = useMember();
  const on = useLocalList(bookmarks).includes(id);
  return (
    <button type="button" aria-pressed={on} onClick={() => void toggleBookmark(id, status === 'signedIn')}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${on ? 'bg-brand-50 text-brand-800 ring-brand-300' : 'bg-white text-slate-700 ring-slate-200'}`}>
      <Icon name="bookmark" className="h-3.5 w-3.5" /> {on ? 'Bookmarked' : 'Bookmark'}
    </button>
  );
}

function LanguageSwitch({ lang, onChange }: { lang: PracticeLanguage; onChange: (lang: PracticeLanguage) => void }) {
  return (
    <div className="flex rounded-full bg-white p-0.5 text-xs font-semibold ring-1 ring-slate-200" role="group" aria-label="Question language">
      {([['en', 'English'], ['hi', 'हिन्दी']] as const).map(([v, label]) => (
        <button key={v} type="button" aria-pressed={lang === v} lang={v} onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 transition ${lang === v ? 'bg-ink text-white' : 'text-slate-600 hover:text-ink'}`}>
          {label}
        </button>
      ))}
    </div>
  );
}

function PracticeNote() {
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <strong>{PRACTICE_LABEL}</strong> — original questions written and reviewed by us, in the style of each exam or
      class syllabus. They are not official or previous-year questions, and practice scores do not predict exam results
      or admission. For real papers, see each exam guide&apos;s officially published papers.
    </p>
  );
}

// --- Practice centre ------------------------------------------------------------------------------------------------

interface ModeInfo {
  mode: Exclude<PracticeMode, 'SET' | 'RETRY'>;
  title: string;
  blurb: string;
  icon: IconName;
}

const MODES: ModeInfo[] = [
  { mode: 'QUICK', title: 'Quick practice', blurb: '5 random questions. A two-minute warm-up.', icon: 'bolt' },
  { mode: 'TOPIC', title: 'Topic practice', blurb: 'Pick a subject or topic and work on it.', icon: 'target' },
  { mode: 'MINI_MOCK', title: 'Mini mock test', blurb: '10 mixed questions, with a timer.', icon: 'clock' },
  { mode: 'FULL', title: 'Full practice test', blurb: 'Up to 40 questions; choose how many.', icon: 'layers' },
  { mode: 'REVISION', title: 'Revision', blurb: 'Only the questions you got wrong before.', icon: 'repeat' },
  { mode: 'DAILY', title: 'Daily challenge', blurb: 'The same 10 questions for everyone today.', icon: 'sun' },
];

const COUNT_CHOICES = [5, 10, 15, 20, 25, 30, 40, 50];
const LENGTH_PRESETS = [['Quick', 10], ['Standard', 25], ['Advanced', 50]] as const;

export function PracticeListPage() {
  useDocumentTitle('Practice centre: free practice tests for school, entrance, Olympiad and competitive exams');
  const [params, setParams] = useSearchParams();
  const category = isCategory(params.get('category')) ? params.get('category') as PracticeCategory : null;
  const sets = useApi(() => practiceService.list(), []);
  const bank = useApi(() => practiceService.bank(), []);
  const exams = useApi(() => examService.all(), []);
  const examName = useCallback((slug: string | null) => exams.data?.find((e) => e.slug === slug)?.shortName ?? slug ?? 'General',
    [exams.data]);
  const subjects = new Set((bank.data?.questions ?? []).map((q) => q.section)).size;
  const hindiCount = (bank.data?.questions ?? []).filter((q) => q.hindi).length;
  const chooseCategory = (c: PracticeCategory | null) => {
    const next = new URLSearchParams(params);
    if (c) next.set('category', c); else next.delete('category');
    setParams(next, { replace: true });
  };

  return (
    <>
      <PageHeader eyebrow="Practice centre" title="Practise for school, entrance, Olympiad and competitive exams"
        subtitle="Quick quizzes, chapter and topic practice, timed mock tests and a daily challenge — every answer explained, many in English and Hindi. Free, and no sign-in needed to start.">
        <dl className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-slate-300">
          <div><dt className="sr-only">Questions</dt><dd><span className="font-display text-2xl font-bold text-white tabular-nums">{bank.data?.questionCount ?? '–'}</span> original questions</dd></div>
          <div><dt className="sr-only">Sets</dt><dd><span className="font-display text-2xl font-bold text-white tabular-nums">{sets.data?.length ?? '–'}</span> ready-made sets</dd></div>
          <div><dt className="sr-only">Subjects</dt><dd><span className="font-display text-2xl font-bold text-white tabular-nums">{bank.data ? subjects : '–'}</span> subjects</dd></div>
          <div><dt className="sr-only">In Hindi</dt><dd><span className="font-display text-2xl font-bold text-white tabular-nums">{bank.data ? hindiCount : '–'}</span> also in हिन्दी</dd></div>
        </dl>
      </PageHeader>
      <div className="container-page space-y-10 py-8">
        <PracticeNote />
        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <SessionBuilder key={category ?? 'all'} bank={bank.data?.questions ?? null} bankError={bank.error} onRetry={bank.reload}
            examName={examName} examSlugs={(exams.data ?? []).map((e) => e.slug)} initialCategory={category} />
          <ProgressPanel examName={examName} />
        </div>

        <section aria-labelledby="sets-heading">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="sets-heading" className="font-display text-xl font-bold text-ink">Ready-made sets</h2>
              <p className="mt-1 text-sm text-slate-600">From short chapter quizzes to timed mock tests, grouped by what they prepare for.</p>
            </div>
            <nav aria-label="Practice categories" className="flex flex-wrap gap-2">
              {([null, ...CATEGORY_ORDER] as const).map((c) => (
                <button key={c ?? 'all'} type="button" aria-pressed={category === c} onClick={() => chooseCategory(c)}
                  className={`chip px-3 py-1 text-sm ${category === c ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                  {c ? CATEGORY_LABEL[c] : 'All'}
                </button>
              ))}
            </nav>
          </div>
          <AsyncContent state={sets} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No practice sets yet." />}>
            {(all) => {
              const list = all.filter((s) => !category || s.category === category);
              if (list.length === 0) return <div className="mt-4"><EmptyState title={`No ${CATEGORY_LABEL[category!].toLowerCase()} sets yet.`}>More sets are added as they are written and reviewed.</EmptyState></div>;
              return (
                <div className="mt-4 space-y-10">
                  {CATEGORY_ORDER.filter((c) => list.some((s) => s.category === c)).map((c) => {
                    const inCategory = list.filter((s) => s.category === c);
                    const groups = [...new Set(inCategory.map((s) => s.examSlug))];
                    return (
                      <section key={c} aria-labelledby={`cat-${c}`}>
                        <h3 id={`cat-${c}`} className="font-display text-lg font-bold text-ink">{CATEGORY_LABEL[c]}</h3>
                        <div className="mt-3 space-y-6">
                          {groups.map((g) => (
                            <div key={g ?? 'general'}>
                              {g && (
                                <div className="flex flex-wrap items-baseline justify-between gap-2">
                                  <h4 className="font-semibold text-slate-700">{examName(g)}</h4>
                                  <Link to={`/exams/${g}`} className="link text-sm">Exam guide →</Link>
                                </div>
                              )}
                              <ul className="mt-2 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {inCategory.filter((s) => s.examSlug === g).map((s) => <li key={s.slug}><PracticeCard set={s} /></li>)}
                              </ul>
                            </div>
                          ))}
                        </div>
                      </section>
                    );
                  })}
                </div>
              );
            }}
          </AsyncContent>
        </section>
      </div>
    </>
  );
}

/** Mode, filters (which only offer combinations that have questions) and a live count of matching questions. */
function SessionBuilder({ bank, bankError, onRetry, examName, examSlugs, initialCategory }: {
  bank: PracticeBankQuestion[] | null;
  bankError: Error | null;
  onRetry: () => void;
  examName: (slug: string | null) => string;
  examSlugs: string[];
  initialCategory: PracticeCategory | null;
}) {
  const navigate = useNavigate();
  const { status } = useMember();
  const localWrong = useLocalList(wrongQuestions).length;
  const [serverWrong, setServerWrong] = useState<number | null>(null);
  const [mode, setMode] = useState<ModeInfo['mode']>('QUICK');
  const [f, setF] = useState({ category: initialCategory ?? '', exam: '', level: '', section: '', chapter: '', topic: '', difficulty: '' });
  const [hindi, setHindi] = useState(false);
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(true);

  useEffect(() => {
    if (status !== 'signedIn') { setServerWrong(null); return; }
    revisionIds(true).then((ids) => setServerWrong(ids.length)).catch(() => setServerWrong(null));
  }, [status]);
  const wrongCount = serverWrong ?? localWrong;

  const usesFilters = mode !== 'REVISION';
  const examOnly = mode === 'DAILY';
  // Each filter's options come from the questions that match the other filters, so no combination is empty.
  const matching = (skip: keyof typeof f | null) => (bank ?? []).filter((q) =>
    (skip === 'category' || !f.category || q.category === f.category)
    && (skip === 'exam' || !f.exam || q.examSlug === f.exam)
    && (!hindi || q.hindi)
    && (examOnly || ((skip === 'level' || !f.level || q.level === f.level)
      && (skip === 'section' || !f.section || q.section === f.section)
      && (skip === 'chapter' || !f.chapter || q.chapter === f.chapter)
      && (skip === 'topic' || !f.topic || q.topic === f.topic)
      && (skip === 'difficulty' || !f.difficulty || q.difficulty === f.difficulty))));
  const pool = matching(null);
  const options = (key: keyof typeof f, value: (q: PracticeBankQuestion) => string | null) =>
    [...new Set(matching(key).map(value).filter((v): v is string => !!v))].sort((a, b) =>
      key === 'exam' ? examSlugs.indexOf(a) - examSlugs.indexOf(b)
        : key === 'category' ? CATEGORY_ORDER.indexOf(a as PracticeCategory) - CATEGORY_ORDER.indexOf(b as PracticeCategory)
          : a.localeCompare(b));
  // Narrower filters are cleared when a wider one changes, so a stale choice never empties the pool.
  const set = (key: keyof typeof f, value: string) => setF((prev) => ({
    ...prev, [key]: value,
    ...(key === 'category' ? { exam: '', level: '', section: '', chapter: '', topic: '' } : {}),
    ...(key === 'section' ? { chapter: '', topic: '' } : {}),
    ...(key === 'chapter' ? { topic: '' } : {}),
  }));
  const chapters = options('chapter', (q) => q.chapter);
  /** How many of the options under "More options" are set (they open the panel when any is). */
  const advancedSet = [f.category, f.level, f.topic, examOnly ? '' : f.exam].filter(Boolean).length + (hindi ? 1 : 0);

  const size = mode === 'QUICK' ? 5 : mode === 'MINI_MOCK' || mode === 'DAILY' ? 10 : Math.min(count, pool.length);
  const ready = mode === 'REVISION' ? wrongCount > 0 : pool.length > 0;
  const timerChoice = mode === 'TOPIC' || mode === 'FULL';

  const start = () => {
    const p = new URLSearchParams({ mode });
    if (usesFilters) {
      if (f.category) p.set('category', f.category);
      if (f.exam) p.set('exam', f.exam);
      if (hindi) p.set('hindi', '1');
      if (!examOnly) {
        for (const k of ['level', 'section', 'chapter', 'topic', 'difficulty'] as const) if (f[k]) p.set(k, f[k]);
        if (mode === 'TOPIC' || mode === 'FULL') p.set('count', String(size));
      }
    }
    if (mode === 'MINI_MOCK' || mode === 'DAILY' || (timerChoice && timed)) p.set('timer', '1');
    navigate(`/exams/practice/session?${p}`);
  };

  return (
    <section aria-labelledby="builder-heading" className="card p-5 sm:p-6">
      <h2 id="builder-heading" className="font-display text-xl font-bold text-ink">Start practising</h2>
      <div role="radiogroup" aria-label="Practice mode" className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {MODES.map((m) => {
          const active = mode === m.mode;
          return (
            <button key={m.mode} type="button" role="radio" aria-checked={active} onClick={() => setMode(m.mode)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition ${active ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:border-brand-200 hover:bg-slate-50'}`}>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
                <Icon name={m.icon} className="h-5 w-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{m.title}{m.mode === 'REVISION' && ` (${wrongCount})`}</span>
                <span className="block text-xs text-slate-600">{m.blurb}</span>
              </span>
            </button>
          );
        })}
      </div>

      {bankError ? <div className="mt-4"><ErrorState error={bankError} onRetry={onRetry} /></div> : !bank ? <Spinner /> : (
        <>
          {mode === 'REVISION' ? (
            <p className="mt-5 rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
              {wrongCount > 0
                ? `${wrongCount} question${wrongCount === 1 ? '' : 's'} you answered wrongly before. Answer one correctly and it leaves this list.`
                : 'Nothing to revise yet. Questions you answer wrongly in any practice appear here.'}
              {status !== 'signedIn' && ' Kept in this browser only — sign in to keep your list on every device.'}
            </p>
          ) : (
            <fieldset className="mt-5">
              <legend className="text-sm font-semibold text-ink">{examOnly ? 'Exam (optional)' : 'Choose what to practise'}</legend>
              <div className="mt-2 grid gap-3 sm:grid-cols-3">
                {examOnly ? (
                  <FilterSelect label="Exam" value={f.exam} onChange={(v) => set('exam', v)} any="All exams"
                    options={options('exam', (q) => q.examSlug).map((v) => [v, examName(v)])} />
                ) : (
                  <>
                    <FilterSelect label="Subject" value={f.section} onChange={(v) => set('section', v)} any="All subjects"
                      options={options('section', (q) => q.section).map((v) => [v, v])} />
                    <FilterSelect label="Chapter" value={f.chapter} onChange={(v) => set('chapter', v)}
                      any={chapters.length > 0 ? 'All chapters' : 'No chapters for this choice'}
                      options={chapters.map((v) => [v, v])} disabled={chapters.length === 0 && !f.chapter} />
                    <FilterSelect label="Difficulty" value={f.difficulty} onChange={(v) => set('difficulty', v)} any="Any difficulty"
                      options={options('difficulty', (q) => q.difficulty).map((v) => [v, DIFFICULTY_LABEL[v] ?? v])} />
                  </>
                )}
              </div>
              {(mode === 'TOPIC' || mode === 'FULL') && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label="Test length">
                  <span className="text-slate-600">Length:</span>
                  {LENGTH_PRESETS.map(([label, n]) => (
                    <button key={n} type="button" aria-pressed={count === n} disabled={n > pool.length && n !== LENGTH_PRESETS[0][1]}
                      onClick={() => setCount(n)}
                      className={`chip px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50 ${count === n ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>
                      {label} · {n}
                    </button>
                  ))}
                  {count > pool.length && pool.length > 0 && <span className="text-xs text-slate-500">Only {pool.length} match these filters.</span>}
                </div>
              )}
              {timerChoice && (
                <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={timed} onChange={(e) => setTimed(e.target.checked)} />
                  Use a timer (about 1.2 minutes a question)
                </label>
              )}
              <details className="mt-3 rounded-xl border border-slate-200 px-3 py-2" open={advancedSet > 0 || undefined}>
                <summary className="cursor-pointer text-sm font-semibold text-ink">
                  More options{advancedSet ? ` (${advancedSet} set)` : ''}
                </summary>
                <div className="mt-3 grid gap-3 pb-2 sm:grid-cols-2 lg:grid-cols-3">
                  <FilterSelect label="Category" value={f.category} onChange={(v) => set('category', v)} any="All categories"
                    options={options('category', (q) => q.category).map((v) => [v, CATEGORY_LABEL[v as PracticeCategory]])} />
                  {!examOnly && (
                    <>
                      <FilterSelect label="Exam" value={f.exam} onChange={(v) => set('exam', v)} any="All exams"
                        options={options('exam', (q) => q.examSlug).map((v) => [v, examName(v)])} />
                      <FilterSelect label="Class level" value={f.level} onChange={(v) => set('level', v)} any="Any class"
                        options={options('level', (q) => q.level).map((v) => [v, v])} />
                      <FilterSelect label="Topic" value={f.topic} onChange={(v) => set('topic', v)} any="All topics"
                        options={options('topic', (q) => q.topic).map((v) => [v, v])} />
                      {(mode === 'TOPIC' || mode === 'FULL') && (
                        <label className="block text-sm"><span className="label">Exact number of questions</span>
                          <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
                            {COUNT_CHOICES.map((c) => <option key={c} value={c} disabled={c > pool.length && c !== COUNT_CHOICES[0]}>{c}</option>)}
                          </select>
                        </label>
                      )}
                    </>
                  )}
                </div>
                <label className="mb-2 flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={hindi} onChange={(e) => setHindi(e.target.checked)} />
                  Only questions available in Hindi (हिन्दी में उपलब्ध प्रश्न)
                </label>
              </details>
              {(advancedSet > 0 || f.section || f.chapter || f.difficulty) && (
                <button type="button" className="mt-2 text-sm font-semibold text-slate-600 hover:text-ink hover:underline"
                  onClick={() => { setF({ category: '', exam: '', level: '', section: '', chapter: '', topic: '', difficulty: '' }); setHindi(false); }}>
                  Clear all
                </button>
              )}
            </fieldset>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <p className="text-sm text-slate-600" aria-live="polite">
              {mode === 'REVISION' ? null : pool.length === 0
                ? 'No questions match. Remove a filter.'
                : <><strong className="text-ink">{pool.length}</strong> matching question{pool.length === 1 ? '' : 's'} · this test: <strong className="text-ink">{Math.min(size, pool.length)}</strong>{mode === 'DAILY' && ` · ${formatDate(new Date().toISOString().slice(0, 10))}`}</>}
            </p>
            <button type="button" className="btn-primary" disabled={!ready} onClick={start}>
              Start {MODES.find((m) => m.mode === mode)!.title.toLowerCase()} <Icon name="arrowRight" className="h-4 w-4" />
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function FilterSelect({ label, value, onChange, any, options, disabled = false }: {
  label: string; value: string; onChange: (v: string) => void; any: string; options: [string, string][]; disabled?: boolean;
}) {
  return (
    <label className="block text-sm"><span className="label">{label}</span>
      <select className="input disabled:bg-slate-50 disabled:text-slate-500" value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)}>
        <option value="">{any}</option>
        {options.map(([v, text]) => <option key={v} value={v}>{text}</option>)}
      </select>
    </label>
  );
}

/** Recent results, improvement and weakest subjects: from the account for members, from this browser for guests. */
function ProgressPanel({ examName }: { examName: (slug: string | null) => string }) {
  const { status } = useMember();
  const local = useLocalList(localAttempts);
  const server = useApi(() => memberPracticeService.list(0, 10), [status], status === 'signedIn');
  const attempts: { key: string; title: string; total: number; correct: number; attempted: number; at: string; examSlug: string | null;
    sections: LocalAttempt['sections'] }[] = status === 'signedIn' && server.data
    ? server.data.content.map((a) => ({ key: String(a.id), title: a.title, total: a.total, correct: a.correct, attempted: a.attempted,
      at: a.createdAt, examSlug: a.examSlug, sections: a.sections }))
    : local.map((a) => ({ key: a.clientId, title: a.title, total: a.total, correct: a.correct, attempted: a.attempted, at: a.createdAt,
      examSlug: a.examSlug, sections: a.sections }));

  const bySubject = new Map<string, { total: number; correct: number }>();
  attempts.forEach((a) => a.sections.forEach((s) => {
    const x = bySubject.get(s.section) ?? { total: 0, correct: 0 };
    bySubject.set(s.section, { total: x.total + s.total, correct: x.correct + s.correct });
  }));
  const subjects = [...bySubject.entries()].filter(([, v]) => v.total >= 3)
    .map(([name, v]) => ({ name, pct: Math.round((v.correct / v.total) * 100), total: v.total }))
    .sort((a, b) => a.pct - b.pct);
  const trend = attempts.slice(0, 10).reverse();

  return (
    <aside aria-labelledby="progress-heading" className="card h-fit p-5">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="progress-heading" className="font-display text-lg font-bold text-ink">Your progress</h2>
        <Link to="/exams/practice/progress" className="link text-sm">Full dashboard →</Link>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        {status === 'signedIn' ? 'Saved to your account.' : <>Kept in this browser only. <Link to="/signin?next=%2Fexams%2Fpractice" className="link">Sign in</Link> to keep results on every device — results from this browser are added when you sign in.</>}
      </p>
      {status === 'signedIn' && server.loading && !server.data ? <Spinner /> : attempts.length === 0 ? (
        <p className="mt-4 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Your results will appear here after your first practice.</p>
      ) : (
        <>
          <div className="mt-4" aria-label="Score in your last attempts, oldest first" role="img">
            <div className="flex h-16 items-end gap-1">
              {trend.map((a) => {
                const pct = Math.round((a.correct / a.total) * 100);
                return <span key={a.key} title={`${a.title}: ${pct}%`} className="flex-1 rounded-t bg-brand-500/80" style={{ height: `${Math.max(6, pct)}%` }} />;
              })}
            </div>
            <p className="mt-1 text-xs text-slate-500">Score in your last {trend.length} attempt{trend.length === 1 ? '' : 's'} (oldest first)</p>
          </div>
          {subjects.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-ink">By subject</p>
              <ul className="mt-2 space-y-2 text-sm">
                {subjects.slice(0, 5).map((s) => (
                  <li key={s.name}>
                    <span className="flex justify-between gap-2"><span className="truncate text-slate-700">{s.name}</span><span className="tabular-nums text-slate-600">{s.pct}%</span></span>
                    <span className="mt-1 block h-1.5 rounded-full bg-slate-100"><span className={`block h-1.5 rounded-full ${s.pct < 50 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${s.pct}%` }} /></span>
                  </li>
                ))}
              </ul>
              {subjects[0].pct < 60 && <p className="mt-2 text-xs text-slate-600">Weakest so far: <strong>{subjects[0].name}</strong>. Try topic practice on it.</p>}
            </div>
          )}
          <ol className="mt-4 divide-y divide-slate-100 text-sm">
            {attempts.slice(0, 5).map((a) => (
              <li key={a.key}>
                <Link to={`/exams/practice/attempts/${status === 'signedIn' && server.data ? a.key : `local-${a.key}`}`}
                  className="-mx-2 flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50">
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-ink">{a.title}</span>
                    <span className="text-xs text-slate-500">{formatDate(a.at.slice(0, 10))}{a.examSlug ? ` · ${examName(a.examSlug)}` : ''}</span>
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">{a.correct}/{a.total}</span>
                </Link>
              </li>
            ))}
          </ol>
        </>
      )}
    </aside>
  );
}

export function PracticeCard({ set }: { set: PracticeSetSummary }) {
  return (
    <Link to={`/exams/practice/${set.slug}`} className="card card-hover flex h-full flex-col p-5">
      <span className="flex flex-wrap items-center gap-2">
        <span className={`chip ${set.kind === 'MOCK' ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-800'}`}>{set.kind === 'MOCK' ? 'Timed mock test' : 'Topic quiz'}</span>
        <span className="chip bg-slate-100 text-slate-700">{set.level}</span>
        {set.hindi && <span className="chip bg-emerald-50 text-emerald-800">English · <span lang="hi">हिन्दी</span></span>}
        {set.negativeMarks > 0 && <span className="chip bg-amber-50 text-amber-900">Negative marking</span>}
      </span>
      <span className="mt-3 font-display text-lg font-bold text-ink">{set.title}</span>
      <span className="mt-1 flex-1 text-sm text-slate-600">{set.description}</span>
      <span className="mt-3 text-xs text-slate-500">
        {set.questionCount} questions · {set.durationMinutes ? `${set.durationMinutes} minutes` : 'untimed'} · {set.sections.join(', ')}
        {set.chapters.length > 0 && ` · ${set.chapters.length} chapter${set.chapters.length === 1 ? '' : 's'}`}
      </span>
    </Link>
  );
}

// --- Sittings: a ready-made set, or questions drawn from the bank ---------------------------------------------------

/** Everything the player needs, whichever way the questions were chosen. */
interface Sitting {
  key: string;
  /** Where a test in progress is saved in this tab so it survives a reload; null: not resumable. */
  progressKey: string | null;
  mode: PracticeMode;
  eyebrow: string;
  title: string;
  description: string;
  examSlug: string | null;
  setSlug: string | null;
  passages: PracticePassage[];
  questions: PracticeQuestion[];
  /** One set's marking; null when the questions come from several sets (each keeps its own set's marking). */
  marking: { marks: number; negative: number } | null;
  /** null: untimed */
  minutes: number | null;
  reviewedOn: string | null;
  /** The question's id in the bank ("set/question"), used to save attempts and replay questions. */
  bankId: (questionId: string) => string;
  /** Scores a guest's attempt (the server's scoring; nothing stored). Result ids are the questions' own ids. */
  guestScore: (answers: Record<string, number>) => Promise<PracticeScore>;
}

export function PracticeTestPage() {
  const { slug = '' } = useParams();
  const state = useApi(() => practiceService.get(slug), [slug]);
  useDocumentTitle(state.data ? `${state.data.set.title} — practice` : 'Practice test');
  const sitting = useMemo<Sitting | null>(() => {
    if (!state.data) return null;
    const { set, questions, passages } = state.data;
    return {
      key: set.slug, progressKey: `set:${set.slug}`, mode: 'SET', eyebrow: set.kind === 'MOCK' ? 'Timed mock test' : 'Topic quiz', title: set.title,
      description: set.description, examSlug: set.examSlug, setSlug: set.slug, passages, questions,
      marking: { marks: set.marksPerQuestion, negative: set.negativeMarks },
      minutes: set.durationMinutes, reviewedOn: set.reviewedOn,
      bankId: (id) => `${set.slug}/${id}`,
      guestScore: (answers) => practiceService.score(set.slug, answers),
    };
  }, [state.data]);
  if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!sitting) return <Spinner />;
  return <Player key={sitting.key} sitting={sitting} />;
}

const BANK_MODES: PracticeMode[] = ['QUICK', 'TOPIC', 'MINI_MOCK', 'FULL', 'DAILY', 'REVISION', 'RETRY'];
/** Modes that draw questions at random (the daily challenge is already the same for everyone on a day). */
const RANDOM_DRAWS: PracticeMode[] = ['QUICK', 'TOPIC', 'MINI_MOCK', 'FULL'];

/** A sitting drawn from the bank, described by the address (mode, filters, ids, timer) so it can be shared or retaken. */
export function PracticeSessionPage() {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const { status } = useMember();
  const mode = (BANK_MODES.includes(params.get('mode') as PracticeMode) ? params.get('mode') : 'QUICK') as PracticeMode;
  const timer = params.get('timer') === '1';
  // A random draw is made reproducible by putting its seed in the address: a reload brings back the same questions,
  // so a test in progress can be resumed.
  const seed = Number(params.get('seed')) || undefined;
  const needsSeed = !seed && !params.get('ids') && RANDOM_DRAWS.includes(mode);
  useEffect(() => {
    if (!needsSeed) return;
    const next = new URLSearchParams(params);
    next.set('seed', String(1 + Math.floor(Math.random() * (2 ** 31 - 2))));
    setParams(next, { replace: true });
  }, [needsSeed, params, setParams]);
  // Revision needs the member's list from the server before it can ask for questions.
  const waitForMember = mode === 'REVISION' && status === 'loading';
  const state = useApi(async () => {
    let ids = params.get('ids')?.split(',').filter(Boolean);
    if (mode === 'REVISION') ids = await existingIds(await revisionIds(status === 'signedIn'));
    const p: PracticeSessionParams = {
      mode, exam: params.get('exam') ?? undefined, level: params.get('level') ?? undefined,
      section: params.get('section') ?? undefined, topic: params.get('topic') ?? undefined,
      category: params.get('category') ?? undefined, chapter: params.get('chapter') ?? undefined,
      hindi: params.get('hindi') === '1' || undefined,
      difficulty: params.get('difficulty') ?? undefined, count: Number(params.get('count')) || undefined, ids, seed,
    };
    if ((mode === 'REVISION' || mode === 'RETRY') && (!ids || ids.length === 0)) {
      return { mode, title: mode === 'REVISION' ? 'Revision' : 'Retry', description: '', suggestedMinutes: null, passages: [], questions: [] };
    }
    return practiceService.session(p);
    // Only revision depends on who is signed in; other draws stay put when the session check finishes.
  }, [params.toString(), location.key, mode === 'REVISION' ? status : null], !waitForMember && !needsSeed);
  useDocumentTitle(state.data ? `${state.data.title} — practice` : 'Practice');

  const sitting = useMemo<Sitting | null>(() => {
    const s = state.data;
    if (!s) return null;
    const ids = s.questions.map((q) => q.id);
    return {
      key: location.key, progressKey: `session:${params.toString()}`, mode: s.mode, eyebrow: 'Practice centre', title: s.title,
      description: s.description, examSlug: params.get('exam'), setSlug: null, passages: s.passages, questions: s.questions,
      marking: null,
      minutes: timer ? (s.suggestedMinutes ?? Math.ceil(s.questions.length * 1.2)) : null, reviewedOn: null,
      bankId: (id) => id,
      guestScore: (answers) => practiceService.scoreSession(ids, answers),
    };
  }, [state.data, params, location.key, timer]);

  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!sitting) return <Spinner />;
  if (sitting.questions.length === 0) {
    return (
      <div className="container-page max-w-2xl py-10">
        <EmptyState title={mode === 'REVISION' ? 'Nothing to revise yet' : 'No questions match'}>
          {mode === 'REVISION' ? 'Questions you answer wrongly in any practice appear here.' : 'Try fewer filters.'}{' '}
          <Link to="/exams/practice" className="link">Back to the practice centre</Link>
        </EmptyState>
      </div>
    );
  }
  return <Player key={sitting.key} sitting={sitting} />;
}

/**
 * A past result, reviewed question by question. Members' attempts come from their account (only their own can be
 * read); results kept in this browser ("local-…") are scored again by the server from the stored answers.
 */
export function PracticeAttemptPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const local = id.startsWith('local-') ? localAttempts.get().find((a) => a.clientId === id.slice(6)) : undefined;
  const state = useApi(async () => {
    if (id.startsWith('local-')) {
      if (!local) throw new ApiError('This result is no longer kept in this browser.', 404);
      const ids = await existingIds(local.questionIds);
      const answers = Object.fromEntries(Object.entries(local.answers).filter(([q]) => ids.includes(q)));
      const [session, score] = await Promise.all([
        practiceService.session({ mode: 'RETRY', ids }), practiceService.scoreSession(ids, answers)]);
      return { title: local.title, examSlug: local.examSlug, seconds: local.durationSeconds, answers, session, score, saved: false };
    }
    const detail = await memberPracticeService.get(Number(id));
    const ids = await existingIds(detail.questionIds);
    const session = await practiceService.session({ mode: 'RETRY', ids });
    const kept = new Set(ids);
    const score = { ...detail.score, questions: detail.score.questions.filter((q) => kept.has(q.id)) };
    return { title: detail.attempt.title, examSlug: detail.attempt.examSlug, seconds: detail.attempt.durationSeconds,
      answers: detail.answers, session, score, saved: true };
  }, [id]);
  useDocumentTitle(state.data ? `${state.data.title} — your result` : 'Your result');
  const headingRef = useRef<HTMLHeadingElement>(null);

  if (state.error) {
    return (
      <div className="container-page max-w-2xl py-10">
        <EmptyState title="This result could not be opened">
          {state.error.status === 401 ? 'Sign in to see results saved to your account.' : state.error.message}{' '}
          <Link to="/exams/practice" className="link">Back to the practice centre</Link>
        </EmptyState>
      </div>
    );
  }
  if (!state.data) return <Spinner />;
  const d = state.data;
  const sitting: Sitting = {
    key: id, progressKey: null, mode: 'RETRY', eyebrow: 'Your result', title: d.title, description: '', examSlug: d.examSlug, setSlug: null,
    passages: d.session.passages, questions: d.session.questions, marking: null, minutes: null, reviewedOn: null,
    bankId: (q) => q, guestScore: (answers) => practiceService.scoreSession(d.session.questions.map((q) => q.id), answers),
  };
  return (
    <Results sitting={sitting} result={{ score: d.score, seconds: d.seconds ?? 0, saved: d.saved }} answers={d.answers} marked={new Set()}
      onRestart={() => navigate(`/exams/practice/session?${new URLSearchParams({ mode: 'RETRY', ids: d.session.questions.map((q) => q.id).join(',') })}`)}
      headingRef={headingRef} />
  );
}

// --- Player ---------------------------------------------------------------------------------------------------------

type Phase = 'intro' | 'test' | 'result';

function useNow(active: boolean) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return undefined;
    setNow(Date.now()); // the value from mount is stale by the time a test starts
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [active]);
  return now;
}

/** Nearest first. */
const TIME_WARNINGS = [[60_000, 'One minute left.'], [300_000, 'Five minutes left.']] as const;

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const duration = (seconds: number) => {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m === 0 ? `${s} s` : `${m} min ${String(s).padStart(2, '0')} s`;
};

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['TEXTAREA', 'SELECT'].includes(t.tagName)
    || (t.tagName === 'INPUT' && !['radio', 'checkbox'].includes((t as HTMLInputElement).type)));

function Player({ sitting }: { sitting: Sitting }) {
  const { questions, passages } = sitting;
  const { status } = useMember();
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [startedAt, setStartedAt] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<'submit' | 'exit' | null>(null);
  const [result, setResult] = useState<{ score: PracticeScore; seconds: number; saved: boolean } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const clientId = useRef(newClientId());
  const inFlight = useRef(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [lang, setLang] = useLanguage();
  const hindiCount = questions.filter((x) => x.hi).length;
  const [visited, setVisited] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState<string | null>(null);
  const warned = useRef<Set<number>>(new Set());
  const paletteRef = useRef<HTMLElement>(null);
  const questionIds = useMemo(() => questions.map((x) => x.id), [questions]);
  // A test left mid-way in this tab (reload, accidental navigation) can be picked up again.
  const [saved, setSaved] = useState(() => (sitting.progressKey ? loadProgress(sitting.progressKey, questionIds) : null));
  const now = useNow(phase === 'test' && endsAt !== null);
  const remaining = endsAt === null ? null : endsAt - now;

  const begin = (from: TestProgress | null) => {
    clientId.current = newClientId();
    inFlight.current = false;
    warned.current = new Set();
    setAnswers(from?.answers ?? {});
    setMarked(new Set(from?.marked ?? []));
    setVisited(new Set(from?.visited ?? []));
    setIndex(from?.index ?? 0);
    setResult(null);
    setConfirming(null);
    setSubmitError(null);
    setNotice(null);
    setStartedAt(from?.startedAt ?? Date.now());
    setEndsAt(from ? from.endsAt : sitting.minutes ? Date.now() + sitting.minutes * 60_000 : null);
    setSaved(null);
    setPhase('test');
  };
  const start = () => {
    if (sitting.progressKey) clearProgress(sitting.progressKey);
    begin(null);
  };

  // Every change during the test is saved in this tab, so a reload can resume it.
  useEffect(() => {
    if (phase !== 'test' || !sitting.progressKey) return;
    saveProgress(sitting.progressKey, {
      questionIds, answers, marked: [...marked], visited: [...visited], index, startedAt, endsAt,
    });
  }, [phase, sitting.progressKey, questionIds, answers, marked, visited, index, startedAt, endsAt]);

  // The current question counts as seen.
  const currentId = questions[index]?.id;
  useEffect(() => {
    if (phase === 'test' && currentId) setVisited((v) => (v.has(currentId) ? v : new Set(v).add(currentId)));
  }, [phase, currentId]);

  // Announce five minutes and one minute left, once each (only the nearer one when both have passed, e.g. on resume).
  useEffect(() => {
    if (phase !== 'test' || remaining === null || remaining <= 0) return;
    const limit = TIME_WARNINGS.find(([ms]) => remaining <= ms && !warned.current.has(ms) && (sitting.minutes ?? 0) * 60_000 > ms);
    if (!limit) return;
    TIME_WARNINGS.filter(([ms]) => ms >= limit[0]).forEach(([ms]) => warned.current.add(ms));
    setNotice(limit[1]);
  }, [phase, remaining, sitting.minutes]);

  const submit = useCallback(async () => {
    // One attempt is scored once: a second click, or the timer firing during a submission, does nothing. The same
    // clientId on a retry after an error lets the server return the attempt it may already have saved.
    if (inFlight.current) return;
    inFlight.current = true;
    setSubmitting(true);
    setSubmitError(null);
    const seconds = Math.round((Date.now() - startedAt) / 1000);
    try {
      const bankAnswers = Object.fromEntries(Object.entries(answers).map(([id, v]) => [sitting.bankId(id), v]));
      const { score, saved } = await scoreAttempt(status === 'signedIn', {
        clientId: clientId.current, title: sitting.title, mode: sitting.mode, examSlug: sitting.examSlug, setSlug: sitting.setSlug,
        questionIds: questions.map((q) => sitting.bankId(q.id)), answers: bankAnswers, durationSeconds: seconds,
      }, () => sitting.guestScore(answers), (id) => sitting.bankId(id));
      if (sitting.progressKey) clearProgress(sitting.progressKey);
      // Members' results come back with bank ids; show them against this sitting's own question ids.
      const own = new Map(questions.map((q) => [sitting.bankId(q.id), q.id]));
      setResult({ score: { ...score, questions: score.questions.map((r) => ({ ...r, id: own.get(r.id) ?? r.id })) }, seconds, saved });
      setPhase('result');
      window.scrollTo({ top: 0 });
    } catch (e) {
      inFlight.current = false;
      setSubmitError(e instanceof ApiError ? e.message : 'Could not check your answers. Please try again.');
    } finally {
      setSubmitting(false);
      setConfirming(null);
    }
  }, [answers, questions, sitting, startedAt, status]);

  // Time up: submit what has been answered.
  useEffect(() => {
    if (phase === 'test' && remaining !== null && remaining <= 0) void submit();
  }, [phase, remaining, submit]);

  useEffect(() => { headingRef.current?.focus(); }, [index, phase]);

  // Leaving the page mid-test (closing the tab, reloading) asks first, so answers are not lost by accident.
  const answeredCount = Object.keys(answers).length;
  useEffect(() => {
    if (phase !== 'test' || answeredCount === 0) return undefined;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [phase, answeredCount]);

  const q = questions[index];
  const choose = useCallback((i: number) => setAnswers((a) => ({ ...a, [q.id]: i })), [q]);
  const toggleMark = useCallback(() => setMarked((m) => {
    const n = new Set(m);
    if (n.has(q.id)) n.delete(q.id); else n.add(q.id);
    return n;
  }), [q]);

  // Keyboard: 1–4 or A–D choose an option, ← / → move between questions, M marks for review.
  useEffect(() => {
    if (phase !== 'test' || confirming) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      const key = e.key.toLowerCase();
      const n = '1234'.indexOf(key) >= 0 ? '1234'.indexOf(key) : 'abcd'.indexOf(key);
      if (n >= 0 && n < q.options.length) { e.preventDefault(); choose(n); return; }
      const onRadio = e.target instanceof HTMLInputElement && e.target.type === 'radio';
      if (!onRadio && e.key === 'ArrowRight' && index < questions.length - 1) { e.preventDefault(); setIndex(index + 1); }
      else if (!onRadio && e.key === 'ArrowLeft' && index > 0) { e.preventDefault(); setIndex(index - 1); }
      else if (key === 'm') { e.preventDefault(); toggleMark(); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [phase, confirming, q, index, questions.length, choose, toggleMark]);

  const passage = q?.passageId ? passages.find((p) => p.id === q.passageId) : undefined;
  const sections = [...new Set(questions.map((x) => x.section))];
  const shownQ = q ? questionText(q, lang) : null;
  const shownPassage = passage ? passageText(passage, lang) : null;
  const scoringLine = sitting.marking
    ? sitting.marking.negative > 0
      ? `Scoring: ${marksWord(sitting.marking.marks)} for each correct answer, ${marksWord(sitting.marking.negative)} taken off for each wrong one, nothing for a skipped one. This is our practice marking, not the exam's official scheme — leave a question if you are only guessing.`
      : `Scoring: ${marksWord(sitting.marking.marks)} for each correct answer, nothing taken off for a wrong or skipped one. This is our practice scoring, not the exam's official marking scheme.`
    : 'Scoring: each question keeps the marking of the set it comes from — most give 1 mark and take nothing off. This is our practice scoring, not an exam\'s official marking scheme.';

  if (phase === 'intro') {
    return (
      <>
        <PageHeader eyebrow={sitting.eyebrow} title={sitting.title} subtitle={sitting.description}>
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">← Practice centre</Link>
        </PageHeader>
        <div className="container-page max-w-3xl space-y-5 py-8">
          <PracticeNote />
          <section className="card space-y-3 p-6 text-sm text-slate-700">
            <h2 className="font-display text-lg font-bold text-ink">Before you start</h2>
            <ul className="list-disc space-y-1.5 pl-5">
              <li>{questions.length} multiple-choice questions ({sections.join(', ')}); one correct option each.</li>
              <li>{sitting.minutes ? `${sitting.minutes} minutes. The timer starts when you begin, and your answers are submitted automatically when time is up.` : 'No time limit — take as long as you need.'}</li>
              <li>{scoringLine}</li>
              <li>Move with Previous / Next or the question numbers; “Mark for review” flags a question to come back to. Keyboard: 1–4 choose, ← → move, M marks.</li>
              {hindiCount > 0 && (
                <li>
                  {hindiCount === questions.length ? 'Every question' : `${hindiCount} of the ${questions.length} questions`} can be read in Hindi; switch language at any time during the test.
                </li>
              )}
              <li>{status === 'signedIn' ? 'Your result is saved to your account.' : 'Your result is kept in this browser. Sign in to keep it on every device.'}</li>
            </ul>
            {sitting.reviewedOn && <p className="text-xs text-slate-500">Questions reviewed by India School Finder on {formatDate(sitting.reviewedOn)}.</p>}
            {saved && (
              <div role="status" className="rounded-xl bg-brand-50 p-4 text-brand-900 ring-1 ring-brand-100">
                <p className="font-semibold">You have this test in progress.</p>
                <p className="mt-1">
                  {Object.keys(saved.answers).length} of {questions.length} answered
                  {saved.endsAt !== null && (saved.endsAt > Date.now()
                    ? ` · ${clock(saved.endsAt - Date.now())} left on the timer (it kept running)`
                    : ' · the time ran out while you were away; resuming submits what you answered')}.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={() => begin(saved)}>Resume the test</button>
                  <button type="button" className="btn-secondary" onClick={start}>Start again</button>
                </div>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {!saved && <button type="button" onClick={start} className="btn-primary">Start now <Icon name="arrowRight" className="h-4 w-4" /></button>}
              {hindiCount > 0 && <LanguageSwitch lang={lang} onChange={setLang} />}
            </div>
          </section>
        </div>
      </>
    );
  }

  if (phase === 'result' && result) {
    return <Results sitting={sitting} result={result} answers={answers} marked={marked} onRestart={start} headingRef={headingRef} />;
  }
  if (!q || !shownQ) return null;

  return (
    <div className="container-page py-6">
      <div className="sticky top-[68px] z-20 -mx-4 mb-4 border-b border-slate-200 bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{sitting.title}</p>
            <p className="text-xs text-slate-500">{PRACTICE_LABEL}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {hindiCount > 0 && <LanguageSwitch lang={lang} onChange={setLang} />}
            <span className="text-sm text-slate-600 tabular-nums">{answeredCount}/{questions.length}<span className="hidden sm:inline"> answered</span></span>
            {remaining !== null && (
              <span role="timer" aria-label={`Time left ${clock(remaining)}`}
                className={`rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${remaining < 60_000 ? 'bg-red-100 text-red-800'
                  : remaining < 300_000 ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-ink'}`}>
                <Icon name="clock" className="mr-1 inline h-4 w-4 align-[-3px]" />{clock(remaining)}
              </span>
            )}
            <button type="button" className="btn-ghost py-1.5 text-sm lg:hidden"
              onClick={() => paletteRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              <Icon name="list" className="h-4 w-4" /> All questions
            </button>
            <button type="button" className="btn-ghost py-1.5 text-sm" onClick={() => setConfirming('exit')}>Exit</button>
            <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => setConfirming('submit')}>Submit</button>
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200" role="progressbar" aria-label="Questions answered"
          aria-valuemin={0} aria-valuemax={questions.length} aria-valuenow={answeredCount}>
          <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${(answeredCount / questions.length) * 100}%` }} />
        </div>
        <p aria-live="assertive" className={notice ? 'mt-2 text-sm font-semibold text-amber-900' : 'sr-only'}>{notice}</p>
      </div>

      {confirming && (
        <div role="alertdialog" aria-modal="false" aria-labelledby="confirm-title" aria-describedby="confirm-text" className="card mb-4 border-brand-200 p-4 text-sm">
          <p id="confirm-title" className="font-semibold text-ink">{confirming === 'submit' ? 'Submit your answers?' : 'Leave this test?'}</p>
          <p id="confirm-text" className="mt-1 text-slate-600">
            {confirming === 'submit' ? (
              <>You have answered {answeredCount} of {questions.length}.
                {questions.length - answeredCount > 0 && ` ${questions.length - answeredCount} unanswered will count as not attempted.`}
                {marked.size > 0 && ` ${marked.size} marked for review`}
                {marked.size > 0 && (() => {
                  const open = [...marked].filter((id) => answers[id] === undefined).length;
                  return open > 0 ? `, ${open} of them still unanswered.` : '.';
                })()}</>
            ) : 'Your answers will not be saved or scored.'}
          </p>
          <div className="mt-3 flex gap-2">
            {confirming === 'submit'
              ? <button type="button" className="btn-primary py-1.5 text-sm" disabled={submitting} autoFocus onClick={() => void submit()}>{submitting ? 'Checking…' : 'Yes, submit'}</button>
              : <button type="button" className="btn-danger py-1.5 text-sm" autoFocus onClick={() => {
                if (sitting.progressKey) clearProgress(sitting.progressKey);
                navigate('/exams/practice');
              }}>Leave without saving</button>}
            <button type="button" className="btn-secondary py-1.5 text-sm" onClick={() => setConfirming(null)}>Keep going</button>
          </div>
        </div>
      )}
      {submitError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{submitError} <button type="button" className="font-semibold underline" onClick={() => void submit()}>Try again</button></p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-w-0 space-y-4">
          {passage && shownPassage && (
            <div tabIndex={0} role="region" aria-label={`Passage: ${shownPassage.title}`} lang={lang === 'hi' && passage.hi ? 'hi' : undefined}
              className="card max-h-80 overflow-y-auto p-5 text-sm leading-relaxed text-slate-800">
              <p className="mb-2 font-semibold text-ink">{lang === 'hi' && passage.hi ? 'गद्यांश पढ़िए' : 'Read the passage'}: {shownPassage.title}</p>
              <p className="whitespace-pre-line">{shownPassage.text}</p>
            </div>
          )}
          <fieldset className="card p-5 sm:p-6" lang={shownQ.hindi ? 'hi' : undefined}>
            <legend className="sr-only">Question {index + 1}</legend>
            <p lang="en" className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {index + 1} of {questions.length} · {q.section}{q.chapter ? ` · ${q.chapter}` : ''}{q.topic ? ` · ${q.topic}` : ''}
              {q.difficulty && <span className="chip normal-case tracking-normal bg-slate-100 text-slate-600">{DIFFICULTY_LABEL[q.difficulty]}</span>}
              {lang === 'hi' && !q.hi && <span className="chip normal-case tracking-normal bg-amber-50 text-amber-900">Hindi not available for this question</span>}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-lg font-semibold leading-snug text-ink outline-none">{shownQ.prompt}</h2>
            {q.figure && q.figure.length > 0 && <FigureRow figures={q.figure} asksNext={q.figureAsksNext} />}
            <div className={`mt-4 ${q.optionFigures ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'space-y-2'}`}>
              {shownQ.options.map((opt, i) => {
                const chosen = answers[q.id] === i;
                const fig = q.optionFigures?.[i];
                return (
                  <label key={i} className={`flex min-h-[48px] cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${fig ? 'flex-col items-center' : 'items-center'} ${chosen ? 'border-brand-600 bg-brand-50 ring-1 ring-brand-600' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-3">
                      <input type="radio" name={`q-${q.id}`} className="h-4 w-4" checked={chosen} onChange={() => choose(i)} />
                      {fig ? <span className="font-semibold text-slate-700">{opt}</span>
                        : <span><span className="mr-1 font-semibold text-slate-500">{String.fromCharCode(65 + i)}.</span> {opt}</span>}
                    </span>
                    {fig && <FigureView figure={fig} />}
                  </label>
                );
              })}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <button type="button" className="btn-secondary py-1.5 text-sm" disabled={index === 0} onClick={() => setIndex(index - 1)}>← Previous</button>
              {index < questions.length - 1
                ? <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => setIndex(index + 1)}>Next →</button>
                : <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => setConfirming('submit')}>Finish and submit</button>}
              <button type="button" aria-pressed={marked.has(q.id)} onClick={toggleMark}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${marked.has(q.id) ? 'bg-amber-100 text-amber-900 ring-amber-300' : 'bg-white text-slate-700 ring-slate-200'}`}>
                <Icon name="flag" className="h-3.5 w-3.5" /> {marked.has(q.id) ? 'Marked for review' : 'Mark for review'}
              </button>
              <BookmarkButton id={sitting.bankId(q.id)} />
              {answers[q.id] !== undefined && (
                <button type="button" className="text-xs text-slate-500 underline" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear answer</button>
              )}
            </div>
          </fieldset>
        </section>
        <nav ref={paletteRef} aria-label="Questions" className="card h-fit scroll-mt-40 p-4 lg:sticky lg:top-[160px]">
          <p className="text-sm font-semibold text-ink">Questions</p>
          {sections.map((section) => (
            <div key={section} className="mt-3">
              {sections.length > 1 && <p className="mb-1.5 text-xs font-semibold text-slate-500">{section}</p>}
              <ol className="grid grid-cols-6 gap-2 sm:grid-cols-10 lg:grid-cols-6">
                {questions.map((qq, i) => {
                  if (qq.section !== section) return null;
                  const answered = answers[qq.id] !== undefined;
                  const seen = visited.has(qq.id);
                  const isMarked = marked.has(qq.id);
                  const state = answered ? 'answered' : seen ? 'not answered' : 'not visited';
                  return (
                    <li key={qq.id}>
                      <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? 'step' : undefined}
                        aria-label={`Question ${i + 1}, ${state}${isMarked ? ', marked for review' : ''}`}
                        className={`relative h-9 w-full rounded-lg text-sm font-semibold ring-1 ${i === index ? 'ring-2 ring-brand-600' : answered ? 'ring-brand-600' : seen ? 'ring-red-300' : 'ring-slate-200'} ${
                          answered ? 'bg-brand-600 text-white' : seen ? 'bg-red-50 text-red-800' : 'bg-white text-slate-700'}`}>
                        {i + 1}
                        {isMarked && <span aria-hidden className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-amber-400 ring-2 ring-white" />}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
          <ul className="mt-4 grid grid-cols-2 gap-1 text-xs text-slate-600 lg:grid-cols-1">
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-brand-600 align-middle" />Answered ({answeredCount})</li>
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-red-50 ring-1 ring-red-300 align-middle" />Seen, not answered ({questions.filter((x) => visited.has(x.id) && answers[x.id] === undefined).length})</li>
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-white ring-1 ring-slate-300 align-middle" />Not visited ({questions.filter((x) => !visited.has(x.id)).length})</li>
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded-full bg-amber-400 align-middle" />Marked for review ({marked.size})</li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

function Results({ sitting, result, answers, marked, onRestart, headingRef }: {
  sitting: Sitting;
  result: { score: PracticeScore; seconds: number; saved: boolean };
  answers: Record<string, number>;
  marked: Set<string>;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement>;
}) {
  const { questions, passages } = sitting;
  const { score } = result;
  const { status } = useMember();
  const [filter, setFilter] = useState<'all' | 'wrong' | 'skipped' | 'marked'>('all');
  const [lang, setLang] = useLanguage();
  const anyHindi = questions.some((x) => x.hi);
  const byId = useMemo(() => new Map(score.questions.map((r) => [r.id, r])), [score]);
  const negativeMarking = score.questions.some((r) => r.marksAwarded !== null && r.marksAwarded < 0)
    || (sitting.marking?.negative ?? 0) > 0;
  const wrong = score.attempted - score.correct;
  const skipped = score.total - score.attempted;
  const percent = Math.round((score.correct / score.total) * 100);
  const accuracy = score.attempted ? Math.round((score.correct / score.attempted) * 100) : 0;
  const missedIds = questions.filter((q) => !byId.get(q.id)?.correct).map((q) => sitting.bankId(q.id));
  const topics = score.topics.map((t) => ({ ...t, pct: Math.round((t.correct / t.total) * 100) }));
  const strong = topics.filter((t) => t.pct >= 75).sort((a, b) => b.pct - a.pct || b.total - a.total);
  const weak = topics.filter((t) => t.pct < 50).sort((a, b) => a.pct - b.pct || b.total - a.total);
  const shown = questions.filter((q) => {
    const r = byId.get(q.id)!;
    return filter === 'all' || (filter === 'wrong' ? r.chosen !== null && !r.correct : filter === 'skipped' ? r.chosen === null : marked.has(q.id));
  });

  return (
    <div className="container-page max-w-5xl space-y-6 py-8">
      <section className="card overflow-hidden" aria-labelledby="result-heading">
        <div className="bg-ink px-6 py-6 text-white">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-accent-300">{PRACTICE_LABEL}</p>
          <h1 id="result-heading" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-2xl font-bold text-white outline-none sm:text-3xl">
            You scored {score.correct} out of {score.total} ({percent}%)
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            {sitting.title}
            {score.marks !== null && score.maxMarks !== null && <> · <strong className="text-white">{score.marks} of {score.maxMarks} marks</strong>{negativeMarking && ' after negative marking'}</>}
          </p>
        </div>
        <dl className="grid grid-cols-2 divide-x divide-y divide-slate-100 sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {([['Correct', score.correct, 'text-emerald-700'], ['Incorrect', wrong, 'text-red-700'], ['Unanswered', skipped, 'text-slate-700'],
            ['Accuracy', `${accuracy}%`, 'text-brand-700'], ['Time taken', duration(result.seconds), 'text-ink'],
            score.marks !== null && score.maxMarks !== null ? ['Marks', `${score.marks}/${score.maxMarks}`, 'text-ink'] : ['Score', `${percent}%`, 'text-ink']] as const)
            .map(([label, value, tone]) => (
              <div key={label} className="p-4">
                <dt className="text-xs text-slate-500">{label}</dt>
                <dd className={`mt-0.5 font-display text-xl font-bold tabular-nums ${tone}`}>{value}</dd>
              </div>
            ))}
        </dl>
        <div className="border-t border-slate-100 p-5 text-xs text-slate-600">
          {sitting.marking
            ? `Scoring: ${marksWord(sitting.marking.marks)} per correct answer${sitting.marking.negative > 0 ? `, ${marksWord(sitting.marking.negative)} deducted per wrong answer` : ', nothing deducted for wrong ones'}, nothing for skipped ones`
            : 'Scoring: each question uses the marking of the set it comes from'}; accuracy is correct ÷ attempted. This is
          our practice scoring, not the official marking scheme{sitting.examSlug ? <> (see the <Link to={`/exams/${sitting.examSlug}?tab=pattern`} className="link">exam pattern</Link>)</> : ''}.
          A practice score does not predict an exam result or guarantee admission.
          {' '}{result.saved ? 'Saved to your account.' : status === 'signedIn' ? '' : <>Saved in this browser only — <Link to="/signin?next=%2Fexams%2Fpractice" className="link">sign in</Link> to keep it on every device.</>}
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 p-5">
          {missedIds.length > 0 && (
            <Link to={`/exams/practice/session?${new URLSearchParams({ mode: 'RETRY', ids: missedIds.join(',') })}`} className="btn-primary">
              <Icon name="repeat" className="h-4 w-4" /> Retry the {missedIds.length} you missed
            </Link>
          )}
          <button type="button" onClick={onRestart} className="btn-secondary">Retake this test</button>
          <Link to="/exams/practice" className="btn-secondary">Start another practice</Link>
          {sitting.examSlug && <Link to={`/exams/${sitting.examSlug}`} className="btn-ghost">Exam guide</Link>}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5" aria-labelledby="subjects-heading">
          <h2 id="subjects-heading" className="font-display text-lg font-bold text-ink">By subject</h2>
          <ul className="mt-3 space-y-3 text-sm">
            {score.sections.map((s) => {
              const pct = Math.round((s.correct / s.total) * 100);
              return (
                <li key={s.section}>
                  <span className="flex justify-between gap-3"><span className="font-medium text-ink">{s.section}</span>
                    <span className="tabular-nums text-slate-600">
                      {s.correct}/{s.total} correct · {s.attempted} tried{s.marks !== null && s.maxMarks !== null && ` · ${s.marks}/${s.maxMarks} marks`}
                    </span></span>
                  <span className="mt-1 block h-2 rounded-full bg-slate-100"><span className={`block h-2 rounded-full ${pct >= 75 ? 'bg-emerald-500' : pct >= 50 ? 'bg-brand-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} /></span>
                </li>
              );
            })}
          </ul>
        </section>
        <section className="card p-5" aria-labelledby="topics-heading">
          <h2 id="topics-heading" className="font-display text-lg font-bold text-ink">Strengths and areas to work on</h2>
          <div className="mt-3 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <p className="font-semibold text-emerald-800">Strong (75% or more)</p>
              {strong.length === 0 ? <p className="mt-1 text-slate-500">None yet.</p> : (
                <ul className="mt-1 space-y-1 text-slate-700">{strong.slice(0, 6).map((t) => <li key={t.section + t.topic}>{t.topic} <span className="text-slate-500">({t.correct}/{t.total})</span></li>)}</ul>
              )}
            </div>
            <div>
              <p className="font-semibold text-amber-800">Work on (below 50%)</p>
              {weak.length === 0 ? <p className="mt-1 text-slate-500">Nothing below 50% — well done.</p> : (
                <ul className="mt-1 space-y-1 text-slate-700">
                  {weak.slice(0, 6).map((t) => (
                    <li key={t.section + t.topic}>
                      <Link to={`/exams/practice/session?${new URLSearchParams({ mode: 'TOPIC', section: t.section, topic: t.topic, count: '10' })}`} className="hover:text-brand-700">
                        {t.topic}
                      </Link> <span className="text-slate-500">({t.correct}/{t.total})</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <p className="mt-3 text-xs text-slate-500">Topics with only one or two questions say little on their own — practise more to see a pattern.</p>
        </section>
      </div>

      <section aria-labelledby="review-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="font-display text-xl font-bold text-ink">Review every question</h2>
          {anyHindi && <LanguageSwitch lang={lang} onChange={setLang} />}
          <div className="flex flex-wrap gap-2" role="group" aria-label="Show">
            {([['all', `All (${score.total})`], ['wrong', `Wrong (${wrong})`], ['skipped', `Not attempted (${skipped})`], ['marked', `Marked (${marked.size})`]] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
                className={`chip px-3 py-1 text-sm ${filter === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}>{label}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 && <p className="card mt-3 p-5 text-sm text-slate-600">Nothing to show here.</p>}
        <ol className="mt-3 space-y-3">
          {shown.map((q) => {
            const r = byId.get(q.id)!;
            const passage = q.passageId ? passages.find((p) => p.id === q.passageId) : undefined;
            const shownPassage = passage ? passageText(passage, lang) : null;
            const shown = questionText(q, lang);
            const n = questions.indexOf(q) + 1;
            return (
              <li key={q.id} className="card p-5 text-sm" lang={shown.hindi ? 'hi' : undefined}>
                <p lang="en" className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Question {n} · {q.section}{q.chapter ? ` · ${q.chapter}` : ''}{q.topic ? ` · ${q.topic}` : ''}
                  <span className={`chip normal-case tracking-normal ${r.chosen === null ? 'bg-slate-100 text-slate-700' : r.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {r.chosen === null ? 'Not attempted' : r.correct ? 'Correct' : 'Wrong'}
                    {r.marksAwarded !== null && negativeMarking && ` · ${r.marksAwarded > 0 ? '+' : ''}${r.marksAwarded}`}
                  </span>
                  <span className="ml-auto normal-case tracking-normal"><BookmarkButton id={sitting.bankId(q.id)} /></span>
                </p>
                {passage && shownPassage && (
                  <details className="mt-1 text-xs text-slate-500">
                    <summary className="cursor-pointer">From the passage “{shownPassage.title}”</summary>
                    <p className="mt-1 whitespace-pre-line text-slate-700">{shownPassage.text}</p>
                  </details>
                )}
                <p className="mt-2 font-semibold text-ink">{shown.prompt}</p>
                {q.figure && q.figure.length > 0 && <FigureRow figures={q.figure} asksNext={q.figureAsksNext} />}
                <ul className={`mt-2 ${q.optionFigures ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'space-y-1'}`}>
                  {shown.options.map((opt, i) => (
                    <li key={i} className={`rounded-lg px-3 py-1.5 ${i === r.answer ? 'bg-emerald-50 text-emerald-900' : i === answers[q.id] ? 'bg-red-50 text-red-900' : 'text-slate-700'}`}>
                      {q.optionFigures?.[i] && <FigureView figure={q.optionFigures[i]} size={72} className="mb-1" />}
                      {q.optionFigures ? opt : `${String.fromCharCode(65 + i)}. ${opt}`}
                      {i === r.answer && <span className="ml-2 text-xs font-semibold">✓ correct answer</span>}
                      {i === answers[q.id] && i !== r.answer && <span className="ml-2 text-xs font-semibold">your answer</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-700">
                  <strong className="text-ink">{shown.hindi ? 'कारण: ' : 'Why: '}</strong>{shown.hindi && r.explanationHi ? r.explanationHi : r.explanation}
                </p>
                <ReportProblem id={sitting.bankId(q.id)} hindi={!!q.hi} />
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
