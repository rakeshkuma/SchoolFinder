import { useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { ErrorState } from '../components/common/States';
import type { Bi, Lang, PrepConfig, PrepSection } from '../content/examPrep';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useLocalList } from '../hooks/usePersonal';
import { localAttempts } from '../hooks/usePracticeProgress';
import { examService, practiceService } from '../services/publicApi';
import type { ExamDetail, PracticeBankQuestion } from '../types/api';
import { formatDate } from '../utils/format';
import { countdown, daysBetween, formatExamDate, isoToday, lastDay } from '../utils/exams';
import { useLanguage } from './PracticePages';

const pct = (c: number, t: number) => (t ? Math.round((c / t) * 100) : 0);
type Tr = (b: Bi) => string;
/** The bank section names a preparation section covers (one, or one per language variant). */
const sectionsOf = (s: PrepSection) => s.variants?.map((v) => v.section) ?? [s.section];

/**
 * An exam's Class VI preparation dashboard (/exams/{slug}), driven by a content config (src/content/*Prep.ts).
 * Questions, answers and scoring stay in the practice engine (answers never reach the browser before submission);
 * this page only links into it with the right filters. The eligibility and dates guide lives at /exams/{slug}/guide,
 * and old ?tab= links are sent there.
 */
export function ExamPrepPage({ config: c }: { config: PrepConfig }) {
  const location = useLocation();
  const [lang, setLang] = useLanguage();
  const t: Tr = (b) => b[lang];
  const T = c.T;
  const detail = useApi(() => examService.get(c.exam), [c.exam]);
  const sets = useApi(() => practiceService.list(c.exam), [c.exam]);
  const bank = useApi(() => practiceService.bank(), []);
  const attempts = useLocalList(localAttempts);
  useDocumentTitle(c.docTitle);
  const sessionUrl = (q: Record<string, string | undefined>) => {
    const p = new URLSearchParams({ exam: c.exam });
    if (c.level) p.set('level', c.level);
    Object.entries(q).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/exams/practice/session?${p}`;
  };

  const examBank = useMemo(() => (bank.data?.questions ?? []).filter((q) => q.examSlug === c.exam && (!c.level || q.level === c.level)), [bank.data, c.exam, c.level]);
  const mine = attempts.filter((a) => a.examSlug === c.exam && (!c.setPrefix || !a.setSlug || a.setSlug.startsWith(c.setPrefix)));

  if (new URLSearchParams(location.search).has('tab')) {
    return <Navigate to={`/exams/${c.exam}/guide${location.search}`} replace />;
  }

  const exam = detail.data?.exam;
  const today = isoToday();
  const testDate = exam?.currentDates.find((d) => d.kind === 'EXAM' && lastDay(d) >= today);
  const own = (sets.data ?? []).filter((s) => !c.setPrefix || s.slug.startsWith(c.setPrefix));
  const mocks = own.filter((s) => s.kind === 'MOCK');
  const quizzes = own.filter((s) => s.kind === 'QUIZ');

  return (
    <div lang={lang === 'hi' ? 'hi' : 'en'}>
      <section className="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-violet-800 text-white">
        <div className="container-page grid gap-8 py-10 lg:grid-cols-[1.4fr_1fr] lg:py-14">
          <div className="min-w-0">
            <nav aria-label="Breadcrumb" className="mb-4 text-sm text-brand-100">
              <Link to="/" className="hover:text-white">Home</Link> / <Link to="/exams" className="hover:text-white">Exams</Link> / <span className="text-white">{c.breadcrumb}</span>
            </nav>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent-300">{t(T.eyebrow)}</p>
            <h1 className="mt-2 font-display text-3xl font-extrabold leading-tight sm:text-4xl">{t(T.title)}</h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-brand-100">{t(T.subtitle)}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to={`/exams/practice/${c.firstMock}`} className="btn-accent">{t(T.startMock)}</Link>
              <Link to={sessionUrl({ mode: 'DAILY', timer: '1' })} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">{t(T.daily)}</Link>
              <Link to={`/exams/${c.exam}/guide`} className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">{t(T.guide)}</Link>
            </div>
            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm" role="group" aria-label={t(T.language)}>
              <span className="text-brand-100">{t(T.language)}:</span>
              {(['en', 'hi'] as Lang[]).map((l) => (
                <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}
                  className={`rounded-full px-3 py-1 font-semibold ring-1 transition ${lang === l ? 'bg-white text-brand-800 ring-white' : 'text-white ring-white/30 hover:bg-white/10'}`}>
                  {l === 'en' ? 'English' : <span lang="hi">हिन्दी</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="grid content-start gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <div className="rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
              <p className="text-sm text-brand-100">{t(T.examIn)}</p>
              <p className="mt-1 font-display text-2xl font-bold">{testDate ? formatExamDate(testDate) : t(c.examDateFallback)}</p>
              {testDate && <p className="mt-1 text-sm text-accent-200">{countdown(daysBetween(today, testDate.startsOn))}</p>}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center">
              {c.heroStats.map(([v, l]) => (
                <div key={l.en} className="rounded-2xl bg-white/10 p-3 ring-1 ring-white/15">
                  <p className="font-display text-2xl font-bold tabular-nums">{v}</p>
                  <p className="text-xs text-brand-100">{t(l)}</p>
                </div>
              ))}
            </div>
            <p className="rounded-2xl bg-white/10 p-4 text-sm text-brand-100 ring-1 ring-white/15">
              <span className="font-display text-xl font-bold text-white tabular-nums">{bank.data ? examBank.length : '–'}</span> {t(T.inBank)} · English + <span lang="hi">हिन्दी</span>
            </p>
          </div>
        </div>
      </section>

      <div className="container-page space-y-10 py-8">
        <Pattern c={c} t={t} lang={lang} detail={detail.data} />
        <Sections c={c} t={t} lang={lang} bank={examBank} quizzes={quizzes} sessionUrl={sessionUrl} detail={detail.data} />
        <SmartPractice c={c} t={t} lang={lang} bank={examBank} sessionUrl={sessionUrl} />

        <section aria-labelledby="mocks">
          <h2 id="mocks" className="section-title">{t(T.mocks)}</h2>
          <p className="mt-1 text-sm text-slate-600">{t(T.mocksHelp)}</p>
          {sets.error && <ErrorState error={sets.error} onRetry={sets.reload} />}
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {mocks.map((m) => {
              const done = mine.filter((a) => a.setSlug === m.slug);
              const best = done.reduce((b, a) => Math.max(b, a.correct), 0);
              return (
                <Link key={m.slug} to={`/exams/practice/${m.slug}`} className="card group flex items-center gap-4 p-5 hover:shadow-lift">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700"><Icon name="clock" className="h-6 w-6" /></span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink group-hover:text-brand-700">{m.title}</span>
                    <span className="block text-sm text-slate-600">{c.mockLine(m, t)}</span>
                    {done.length > 0 && <span className="mt-1 block text-xs font-semibold text-emerald-700">{done.length}× · best {best}/{m.questionCount}</span>}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        <Progress c={c} t={t} lang={lang} attempts={mine} sessionUrl={sessionUrl} />
        <Roadmap c={c} lang={lang} t={t} />

        <section aria-labelledby="updates" className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 id="updates" className="font-display text-lg font-bold text-ink">{t(T.updates)}</h2>
            <ul className="mt-3 divide-y divide-slate-100 text-sm">
              {(exam?.currentDates ?? []).map((d) => (
                <li key={`${d.kind}-${d.startsOn}`} className="flex flex-wrap justify-between gap-2 py-2">
                  <span className="text-slate-700">{d.label}</span>
                  <span className={`font-medium tabular-nums ${lastDay(d) < today ? 'text-slate-400' : 'text-ink'}`}>{formatExamDate(d)}{d.confirmed ? '' : ' *'}</span>
                </li>
              ))}
            </ul>
            {exam && exam.currentDates.length === 0 && c.T.noDates && (
              <p className="mt-3 text-sm text-slate-600">{t(c.T.noDates)} <Link to={`/exams/${c.exam}/guide?tab=dates`} className="link">{t(T.guide)}</Link></p>
            )}
            {detail.error && <ErrorState error={detail.error} onRetry={detail.reload} />}
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-ink">{t(T.officialLinks)}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {c.links.map(([url, label]) => (
                <li key={url}>
                  <a href={url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1">
                    {t(label)} <Icon name="external" className="h-3.5 w-3.5" />
                  </a>
                </li>
              ))}
              <li><Link to={`/exams/${c.exam}/guide`} className="link">{t(T.guide)}</Link></li>
              <li><Link to={c.findSchools.to} className="link">{t(c.findSchools.label)}</Link></li>
            </ul>
          </div>
        </section>

        <p className="rounded-xl bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">{t(T.originality)}</p>
      </div>
    </div>
  );
}

function Pattern({ c, t, lang, detail }: { c: PrepConfig; t: Tr; lang: Lang; detail: ExamDetail | null }) {
  const T = c.T;
  const table = c.pattern.table(lang, detail);
  const qualifying = table.rows.some((r) => r.qualifying !== undefined);
  return (
    <section aria-labelledby="pattern">
      <h2 id="pattern" className="section-title">{t(T.pattern)}</h2>
      <p className="mt-1 text-sm text-slate-600">{t(c.pattern.year)}</p>
      <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="w-full min-w-[34rem] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr><th className="px-4 py-3">{t(T.part)}</th><th className="px-4 py-3 text-right">{t(T.questions)}</th><th className="px-4 py-3 text-right">{t(T.marks)}</th><th className="px-4 py-3">{t(T.minutes)}</th>{qualifying && <th className="px-4 py-3">{t(T.qualifying)}</th>}</tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {table.rows.map((r) => (
              <tr key={r.label}>
                <td className="px-4 py-3 font-medium text-ink">{r.label}</td>
                <td className="px-4 py-3 text-right tabular-nums">{r.questions}</td><td className="px-4 py-3 text-right tabular-nums">{r.marks}</td>
                <td className="px-4 py-3">{r.minutes}</td>{qualifying && <td className="px-4 py-3">{r.qualifying}</td>}
              </tr>
            ))}
            <tr className="bg-slate-50 font-semibold text-ink">
              <td className="px-4 py-3">{t(T.total)}</td><td className="px-4 py-3 text-right tabular-nums">{table.total.questions}</td><td className="px-4 py-3 text-right tabular-nums">{table.total.marks}</td><td className="px-4 py-3">{table.total.minutes}</td>{qualifying && <td className="px-4 py-3" />}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-sm leading-relaxed text-slate-700">{t(T.patternNote)}</p>
      <p className="mt-1 text-xs text-slate-500">
        {t(T.source)}: <a href={c.pattern.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">{c.pattern.sourceLabel}</a> · {t(T.checked)} {formatDate(c.pattern.checked(detail))}
      </p>
    </section>
  );
}

function Sections({ c, t, lang, bank, quizzes, sessionUrl, detail }: {
  c: PrepConfig; t: Tr; lang: Lang; bank: PracticeBankQuestion[]; quizzes: { slug: string; title: string; sections: string[] }[];
  sessionUrl: (q: Record<string, string | undefined>) => string; detail: ExamDetail | null;
}) {
  const T = c.T;
  return (
    <section aria-labelledby="sections">
      <h2 id="sections" className="section-title">{t(T.sections)}</h2>
      <div className="mt-4 grid gap-5 md:grid-cols-2">
        {c.sections.map((s) => {
          const own = sectionsOf(s);
          const inSection = bank.filter((q) => own.includes(q.section));
          const sectionQuizzes = quizzes.filter((q) => q.sections.length === 1 && own.includes(q.sections[0]));
          const syllabus = s.syllabusArea ? detail?.content.syllabus.find((x) => x.area.startsWith(s.syllabusArea!)) : undefined;
          return (
            <article key={s.key} className="card overflow-hidden">
              <div className={`flex items-center gap-3 bg-gradient-to-r ${s.tone} p-4 text-white`}>
                <Icon name={s.icon} className="h-6 w-6" />
                <div className="min-w-0">
                  <h3 className="font-display text-lg font-bold">{s.name[lang]}</h3>
                  <p className="text-xs text-white/85">{s.questions} {t(T.questions)} · {s.marks} {t(T.marks)}{s.qualifying ? <> · {t(T.qualifying)}: {s.qualifying[lang]}</> : null}</p>
                </div>
              </div>
              <div className="space-y-3 p-4 text-sm">
                <p className="text-slate-700">{s.about[lang]}</p>
                <ul className="flex flex-wrap gap-1.5">
                  {s.topics.filter((tp) => !tp.lang || tp.lang === lang).map((tp) => {
                    const n = inSection.filter((q) => q.topic === tp.topic).length;
                    const section = inSection.find((q) => q.topic === tp.topic)?.section ?? own[0];
                    return (
                      <li key={tp.topic}>
                        <Link to={sessionUrl({ mode: 'TOPIC', section, topic: tp.topic, count: String(Math.min(10, n || 10)) })}
                          className="chip bg-slate-100 text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                          {tp.label[lang]}{n > 0 && <span className="ml-1 text-slate-400 tabular-nums">{n}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                {syllabus && (
                  <details className="rounded-lg bg-slate-50 p-3">
                    <summary className="cursor-pointer font-semibold text-ink">{t(T.syllabus!)} <span className="font-normal text-slate-500">({syllabus.area})</span></summary>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">{syllabus.topics.map((x) => <li key={x}>{x}</li>)}</ul>
                  </details>
                )}
                <ul className="list-disc space-y-1 pl-5 text-slate-600">{s.tips.map((tip) => <li key={tip.en}>{tip[lang]}</li>)}</ul>
                <div className="flex flex-wrap gap-2 pt-1">
                  {(s.variants ?? [{ section: s.section }]).map((v) => (
                    <Link key={v.section} to={sessionUrl({ mode: 'TOPIC', section: v.section, count: '20', timer: '1' })} className="btn-primary py-1.5 text-sm">
                      {t(T.practiseSection)}{v.label ? ` · ${t(v.label)}` : ''}
                    </Link>
                  ))}
                  {sectionQuizzes.map((q, i) => (
                    <Link key={q.slug} to={`/exams/practice/${q.slug}`} className="btn-secondary py-1.5 text-sm" title={q.title}>
                      {t(T.quizzes)} {s.variants ? `${i + 1}${quizSuffix(s, q.sections[0], t)}` : i + 1}
                    </Link>
                  ))}
                </div>
                <p className="text-xs text-slate-500 tabular-nums">{inSection.length} {t(T.inBank)}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** " (English)" after a quiz button when a section has language variants. */
function quizSuffix(s: PrepSection, section: string, t: Tr) {
  const v = s.variants?.find((x) => x.section === section);
  return v?.label ? ` (${t(v.label)})` : '';
}

function SmartPractice({ c, t, lang, bank, sessionUrl }: { c: PrepConfig; t: Tr; lang: Lang; bank: PracticeBankQuestion[]; sessionUrl: (q: Record<string, string | undefined>) => string }) {
  const T = c.T;
  const navigate = useNavigate();
  const [section, setSection] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(true);
  const options = c.sections.flatMap((s) => (s.variants ?? [{ section: s.section }]).map((v) => ({ s, section: v.section, label: v.label ? `${s.name[lang]} · ${t(v.label)}` : s.name[lang] })));
  const chosen = options.find((o) => o.section === section);
  const topics = chosen ? chosen.s.topics.filter((tp) => bank.some((q) => q.section === section && q.topic === tp.topic)) : [];
  const available = bank.filter((q) => (!section || q.section === section) && (!topic || q.topic === topic) && (!difficulty || q.difficulty === difficulty)).length;
  const start = () => navigate(sessionUrl({
    mode: 'TOPIC', section: section || undefined, topic: topic || undefined, difficulty: difficulty || undefined,
    count: String(Math.max(1, Math.min(count, available))), timer: timed ? '1' : undefined, hindi: lang === 'hi' ? '1' : undefined,
  }));
  const field = 'mt-1 block w-full input';
  return (
    <section aria-labelledby="smart" className="card p-5">
      <h2 id="smart" className="font-display text-xl font-bold text-ink">{t(T.smart)}</h2>
      <p className="mt-1 text-sm text-slate-600">{t(T.smartHelp)}</p>
      <form className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-5" onSubmit={(e) => { e.preventDefault(); start(); }}>
        <label className="text-sm font-medium text-slate-700">{t(T.section)}
          <select className={field} value={section} onChange={(e) => { setSection(e.target.value); setTopic(''); }}>
            <option value="">{t(T.allSections)}</option>
            {options.map((o) => <option key={o.section} value={o.section}>{o.label}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t(T.topic)}
          <select className={field} value={topic} onChange={(e) => setTopic(e.target.value)} disabled={!section}>
            <option value="">{t(T.allTopics)}</option>
            {topics.map((tp) => <option key={tp.topic} value={tp.topic}>{tp.label[lang]}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t(T.level)}
          <select className={field} value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">{t(T.anyLevel)}</option>
            <option value="EASY">{t(T.easy)}</option><option value="MEDIUM">{t(T.medium)}</option><option value="HARD">{t(T.hard)}</option>
          </select>
        </label>
        <label className="text-sm font-medium text-slate-700">{t(T.count)}
          <select className={field} value={count} onChange={(e) => setCount(Number(e.target.value))}>
            {[5, 10, 20, 30, 40].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={timed} onChange={(e) => setTimed(e.target.checked)} /> {t(T.timed)}
          </label>
          <button type="submit" className="btn-primary" disabled={available === 0}>{t(T.start)}</button>
        </div>
      </form>
      <p className="mt-2 text-xs text-slate-500 tabular-nums">{available} {t(T.available)}</p>
    </section>
  );
}

function Progress({ c, t, lang, attempts, sessionUrl }: {
  c: PrepConfig; t: Tr; lang: Lang; attempts: ReturnType<typeof localAttempts.get>; sessionUrl: (q: Record<string, string | undefined>) => string;
}) {
  const T = c.T;
  const bySection = new Map<string, { total: number; correct: number }>();
  attempts.forEach((a) => a.sections.forEach((s) => {
    const v = bySection.get(s.section) ?? { total: 0, correct: 0 };
    bySection.set(s.section, { total: v.total + s.total, correct: v.correct + s.correct });
  }));
  const tally = (s: PrepSection) => sectionsOf(s).reduce<{ total: number; correct: number } | null>((acc, name) => {
    const v = bySection.get(name);
    return v ? { total: (acc?.total ?? 0) + v.total, correct: (acc?.correct ?? 0) + v.correct } : acc;
  }, null);
  const answered = attempts.reduce((n, a) => n + a.attempted, 0);
  const correct = attempts.reduce((n, a) => n + a.correct, 0);
  const untouched = c.sections.find((s) => !tally(s));
  const weakest = c.sections.filter((s) => tally(s)).sort((a, b) => pct(tally(a)!.correct, tally(a)!.total) - pct(tally(b)!.correct, tally(b)!.total))[0];
  const nextSection = untouched ?? weakest;
  const topicsTried = new Set(attempts.flatMap((a) => a.topics.map((x) => `${x.section}|${x.topic}`)));
  const shown = c.sections.flatMap((s) => s.topics.filter((tp) => !tp.lang || tp.lang === lang).map((tp) => ({ s, tp })));
  const covered = shown.filter(({ s, tp }) => sectionsOf(s).some((n) => topicsTried.has(`${n}|${tp.topic}`))).length;
  const nextBankSection = nextSection ? (sectionsOf(nextSection).find((n) => bySection.has(n)) ?? sectionsOf(nextSection)[0]) : undefined;
  return (
    <section aria-labelledby="progress" className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="progress" className="font-display text-xl font-bold text-ink">{t(T.progress)}</h2>
        <Link to="/exams/practice/progress" className="link text-sm">{t(T.allProgress)}</Link>
      </div>
      {attempts.length === 0 ? <p className="mt-2 text-sm text-slate-600">{t(T.progressEmpty)}</p> : (
        <div className="mt-4 grid gap-6 lg:grid-cols-3">
          <dl className="grid grid-cols-3 gap-3 text-center lg:col-span-1 lg:grid-cols-1 lg:text-left">
            {([[attempts.length, T.attempts], [`${pct(correct, answered)}%`, T.accuracy], [answered, T.answered]] as const).map(([v, l]) => (
              <div key={l.en} className="rounded-xl bg-slate-50 p-3">
                <dd className="font-display text-2xl font-bold text-ink tabular-nums">{v}</dd>
                <dt className="text-xs text-slate-500">{t(l)}</dt>
              </div>
            ))}
          </dl>
          <div className="space-y-3 lg:col-span-2">
            {c.sections.map((s) => {
              const v = tally(s);
              const p = v ? pct(v.correct, v.total) : null;
              return (
                <div key={s.key}>
                  <div className="flex justify-between text-sm"><span className="font-medium text-ink">{s.name[lang]}</span><span className="tabular-nums text-slate-600">{p === null ? '–' : `${p}% (${v!.correct}/${v!.total})`}</span></div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100" role="presentation">
                    <div className={`h-2 rounded-full ${p === null ? '' : p >= 70 ? 'bg-emerald-500' : p >= 40 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${p ?? 0}%` }} />
                  </div>
                </div>
              );
            })}
            {c.coverage && (
              <p className="text-sm text-slate-700"><span className="font-semibold text-ink">{t(T.coverage ?? { en: 'Syllabus covered', hi: 'पाठ्यक्रम पूरा' })}:</span> {covered} / {shown.length} ({pct(covered, shown.length)}%)</p>
            )}
            {nextSection && (
              <p className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">
                <span className="font-semibold">{t(T.next)}:</span> {untouched ? t(T.nextNew) : t(T.nextWeak)} <span className="font-semibold">{nextSection.name[lang]}</span>.{' '}
                <Link to={sessionUrl({ mode: 'TOPIC', section: nextBankSection, count: '10', difficulty: untouched ? 'EASY' : undefined })} className="link font-semibold">{t(T.start)} →</Link>
              </p>
            )}
            <div>
              <h3 className="text-sm font-semibold text-ink">{t(T.recent)}</h3>
              <ul className="mt-1 divide-y divide-slate-100 text-sm">
                {attempts.slice(0, 5).map((a) => (
                  <li key={a.clientId} className="flex flex-wrap justify-between gap-2 py-1.5">
                    <span className="min-w-0 truncate text-slate-700">{a.title}</span>
                    <span className="tabular-nums text-slate-600">{a.correct}/{a.total} · {formatDate(a.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function Roadmap({ c, lang, t }: { c: PrepConfig; lang: Lang; t: Tr }) {
  return (
    <section aria-labelledby="roadmap">
      <h2 id="roadmap" className="section-title">{t(c.T.roadmap)}</h2>
      <p className="mt-1 text-sm text-slate-600">{t(c.T.roadmapHelp)}</p>
      <ol className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {c.roadmap.map((stage, i) => (
          <li key={stage.title.en} className="card flex flex-col p-5">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display font-bold text-white">{i + 1}</span>
              <div>
                <h3 className="font-semibold text-ink">{stage.title[lang]}</h3>
                <p className="text-xs text-slate-500">{stage.weeks[lang]}</p>
              </div>
            </div>
            <ul className="mt-3 flex-1 list-disc space-y-1 pl-5 text-sm text-slate-700">{stage.steps.map((s) => <li key={s.en}>{s[lang]}</li>)}</ul>
            <Link to={stage.to} className="link mt-3 text-sm font-semibold">{stage.action[lang]} →</Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
