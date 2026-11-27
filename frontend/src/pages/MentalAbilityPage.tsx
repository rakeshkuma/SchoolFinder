import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { FigureRow, FigureView } from '../components/exam/FigureView';
import type { Bi, Lang } from '../content/examPrep';
import { MA_T as T, MENTAL_ABILITY as c, type MentalAbilityExample, type MentalAbilityPart } from '../content/jnvstMentalAbility';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { practiceService } from '../services/publicApi';
import type { PracticeBankQuestion, PracticeSetSummary } from '../types/api';
import { formatDate } from '../utils/format';
import { useLanguage } from './PracticePages';

type Tr = (b: Bi) => string;
const LETTERS = ['A', 'B', 'C', 'D'];

/** A bank session of one Mental Ability type (the practice engine keeps the answers until it is submitted). */
export const typeSession = (topic: string) =>
  `/exams/practice/session?${new URLSearchParams({ exam: 'jnvst', mode: 'TOPIC', section: 'Mental Ability', topic, count: '10' })}`;

/** How many bank questions each Mental Ability type has, for the "Practise this type" links. */
export function typeCounts(bank: PracticeBankQuestion[]): Record<string, number> {
  const counts: Record<string, number> = {};
  bank.filter((q) => q.examSlug === 'jnvst' && q.section === 'Mental Ability' && q.topic)
    .forEach((q) => { counts[q.topic!] = (counts[q.topic!] ?? 0) + 1; });
  return counts;
}

/**
 * /exams/jnvst/mental-ability: the JNVST Mental Ability Test explained for parents and students, with a worked example
 * of each of its five parts, the practice papers, how to use the official NVS paper, and the questions parents ask.
 * The text is content/jnvstMentalAbility.json, which the server also renders for crawlers (MentalAbilityPage.java).
 */
export function MentalAbilityPage() {
  const [lang, setLang] = useLanguage();
  const t: Tr = (b) => b[lang];
  const sets = useApi(() => practiceService.list('jnvst'), []);
  const bank = useApi(() => practiceService.bank(), []);
  useDocumentTitle(c.title, c.description);
  const papers = (sets.data ?? []).filter((s) => s.slug.startsWith('jnvst-mat-'));
  const mocks = (sets.data ?? []).filter((s) => s.kind === 'MOCK');
  const counts = typeCounts(bank.data?.questions ?? []);

  return (
    <div lang={lang === 'hi' ? 'hi' : 'en'}>
      <section className="bg-gradient-to-br from-brand-900 via-brand-800 to-violet-800 text-white">
        <div className="container-page py-10 lg:py-14">
          <nav aria-label="Breadcrumb" className="mb-4 text-sm text-brand-100">
            <Link to="/" className="hover:text-white">Home</Link> / <Link to="/exams" className="hover:text-white">Exams</Link>
            {' / '}<Link to="/exams/jnvst" className="hover:text-white">JNVST</Link> / <span className="text-white">Mental Ability</span>
          </nav>
          <p className="text-sm font-semibold uppercase tracking-wide text-accent-300">{t(T.eyebrow)}</p>
          <h1 className="mt-2 max-w-3xl font-display text-3xl font-extrabold leading-tight sm:text-4xl">{t(c.heading)}</h1>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-brand-100">{t(c.intro)}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/exams/practice/jnvst-mat-1" className="btn-accent">{t(T.start)}</Link>
            <Link to="/exams/jnvst" className="btn bg-white/10 text-white ring-1 ring-white/20 hover:bg-white/20">{t(T.prepShort)}</Link>
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
      </section>

      <div className="container-page space-y-10 py-10">
        <section aria-labelledby="glance">
          <h2 id="glance" className="section-title">{t(T.glance)}</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {c.facts.map((f) => (
              <div key={f.label.en} className="card p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(f.label)}</dt>
                <dd className="mt-1 text-sm font-medium text-ink">{t(f.value)}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-slate-500">
            {t(T.pattern)}: <a href={c.patternSource.url} target="_blank" rel="noopener noreferrer" className="link">{c.patternSource.label}</a>
          </p>
        </section>

        <section aria-labelledby="parts">
          <h2 id="parts" className="section-title">{t(T.parts)}</h2>
          <div className="mt-4 space-y-6">
            {c.parts.map((part) => (
              <Part key={part.part} part={part} examples={c.examples.filter((e) => e.part === part.part)} counts={counts} lang={lang} t={t} />
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-600">{t(c.numberingNote)}</p>
        </section>

        <section aria-labelledby="practice" className="grid gap-6 lg:grid-cols-2">
          <div className="card p-5">
            <h2 id="practice" className="font-display text-lg font-bold text-ink">{t(T.practice)}</h2>
            <p className="mt-2 text-sm text-slate-600">{t(c.practiceHelp)}</p>
            <SetList sets={papers} t={t} loading={sets.loading} />
          </div>
          <div className="card p-5">
            <h2 className="font-display text-lg font-bold text-ink">{t(T.mocks)}</h2>
            <p className="mt-2 text-sm text-slate-600">{t(c.mocksHelp)}</p>
            <SetList sets={mocks} t={t} loading={sets.loading} />
          </div>
        </section>

        <section aria-labelledby="official" className="card p-5 sm:p-6">
          <h2 id="official" className="font-display text-lg font-bold text-ink">{t(T.official)}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {c.officialPapers.map((p) => (
              <li key={p.url}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="link inline-flex items-center gap-1 font-semibold">
                  {t(p.title)} <Icon name="external" className="h-3.5 w-3.5" />
                </a>
                <span className="ml-1 text-slate-500">{t(p.note)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-700">{t(c.paper2026.intro)}</p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {c.parts.map((part) => (
              <li key={part.part} className="flex items-center gap-2 text-ink">
                <Icon name="check" className="h-4 w-4 shrink-0 text-emerald-600" />
                <span><span className="tabular-nums">{part.paper2026}</span>: {t(part.name)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-700">{t(c.paper2026.mirrorNote)} {t(c.paper2026.droppedIntro)}</p>
          <ul className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
            {c.paper2026.dropped.map((d) => (
              <li key={d.questions} className="flex items-center gap-2 text-slate-500">
                <Icon name="close" className="h-4 w-4 shrink-0" />
                <span><span className="tabular-nums">{d.questions}</span>: {t(d.name)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-slate-500">{t(c.paper2026.answerKey)}</p>
        </section>

        <section aria-labelledby="faq">
          <h2 id="faq" className="section-title">{t(T.faq)}</h2>
          <div className="mt-4 divide-y divide-slate-100 rounded-2xl bg-white ring-1 ring-slate-200">
            {c.faq.map((f) => (
              <details key={f.q.en} className="group p-4">
                <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                  <span className="flex items-start justify-between gap-3">{t(f.q)}
                    <Icon name="chevronDown" className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                  </span>
                </summary>
                <p className="mt-2 text-sm leading-relaxed text-slate-700">{t(f.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section aria-labelledby="sources" className="space-y-3 text-sm text-slate-600">
          <h2 id="sources" className="font-display text-lg font-bold text-ink">{t(T.sources)}</h2>
          <ul className="space-y-1">
            {c.sources.map((s) => (
              <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="link">{s.label}</a></li>
            ))}
          </ul>
          <p>{t(T.checked)} <time dateTime={c.checkedOn}>{formatDate(c.checkedOn)}</time>.</p>
          <p className="rounded-xl bg-slate-50 p-4 leading-relaxed">{t(c.originality)}</p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link to="/exams/jnvst" className="link font-semibold">{t(T.prep)}</Link>
            <Link to="/exams/jnvst/guide" className="link font-semibold">{t(T.guide)}</Link>
          </div>
        </section>
      </div>
    </div>
  );
}

function Part({ part, examples, counts, lang, t }: {
  part: MentalAbilityPart; examples: MentalAbilityExample[]; counts: Record<string, number>; lang: Lang; t: Tr;
}) {
  return (
    <article className="card overflow-hidden" aria-labelledby={`part-${part.part}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-100 bg-violet-50 px-5 py-3">
        <span className="chip bg-violet-600 text-white">{t(T.part)} {part.part}</span>
        <h3 id={`part-${part.part}`} className="font-display text-lg font-bold text-ink">{t(part.name)}</h3>
        <span className="text-sm text-slate-600 tabular-nums">{t(T.questions)} {part.questions}</span>
      </div>
      <div className="space-y-4 p-5">
        <p className="text-sm text-slate-700">{t(part.task)}</p>
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><span className="font-semibold">{t(T.tip)}:</span> {t(part.tip)}</p>
        {examples.map((e) => <Example key={e.topic} example={e} lang={lang} t={t} />)}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {part.topics.map((topic) => (
            <Link key={topic} to={typeSession(topic)} className="btn-secondary py-1.5 text-sm">
              {t(T.practiseType)}{part.topics.length > 1 ? `: ${topic}` : ''}{counts[topic] ? ` (${counts[topic]})` : ''}
            </Link>
          ))}
          <span className="text-slate-500">{t(T.inPaper)} <span className="tabular-nums">{part.paper2026}</span></span>
        </div>
      </div>
    </article>
  );
}

/** A worked example: the figures as the test shows them, and the answer with its reason only when asked for. */
function Example({ example: e, lang, t }: { example: MentalAbilityExample; lang: Lang; t: Tr }) {
  const [shown, setShown] = useState(false);
  const id = `answer-${e.topic.toLowerCase().replace(/\s+/g, '-')}`;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{t(T.example)}{e.part === 'IV' ? ` · ${e.topic}` : ''}</p>
      <p className="mt-1 font-medium leading-snug text-ink">{t(e.prompt)}</p>
      <div className="mt-1 text-xs text-slate-500">{t(T.problem)}</div>
      <FigureRow figures={e.figure} asksNext={e.figureAsksNext} />
      <p className="mt-4 text-xs text-slate-500">{t(T.answerFigures)}</p>
      <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {e.optionFigures.map((f, i) => (
          <li key={i} className={`flex flex-col items-center gap-1 rounded-xl border p-2 ${shown && i === e.answer ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500' : 'border-slate-200'}`}>
            <span className="text-sm font-semibold text-slate-700">{t(T.figure)} {LETTERS[i]}</span>
            <FigureView figure={f} />
          </li>
        ))}
      </ul>
      <button type="button" aria-expanded={shown} aria-controls={id} onClick={() => setShown(!shown)} className="btn-secondary mt-3 py-1.5 text-sm">
        {t(shown ? T.hideAnswer : T.showAnswer)}
      </button>
      {shown && (
        <p id={id} className="mt-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900" lang={lang === 'hi' ? 'hi' : 'en'}>
          <span className="font-semibold">{t(T.answer)} {LETTERS[e.answer]}.</span> {t(e.explanation)}
        </p>
      )}
    </div>
  );
}

function SetList({ sets, t, loading }: { sets: PracticeSetSummary[]; t: Tr; loading: boolean }) {
  if (loading && sets.length === 0) return <p className="mt-3 text-sm text-slate-500">…</p>;
  return (
    <ul className="mt-3 divide-y divide-slate-100 text-sm">
      {sets.map((s) => (
        <li key={s.slug} className="flex items-center justify-between gap-3 py-2">
          <Link to={`/exams/practice/${s.slug}`} className="link font-medium">{s.title}</Link>
          <span className="shrink-0 text-slate-500 tabular-nums">
            {s.questionCount} · {s.durationMinutes ?? '—'} {t(T.minutes)}
          </span>
        </li>
      ))}
    </ul>
  );
}
