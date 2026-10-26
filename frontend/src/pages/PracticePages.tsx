import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Icon } from '../components/common/Icon';
import { FigureRow, FigureView } from '../components/exam/FigureView';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState, ErrorState, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../services/http';
import { examService, practiceService } from '../services/publicApi';
import type { PracticeScore, PracticeSet, PracticeSetSummary } from '../types/api';
import { NotFoundPage } from './InfoPages';

/** Shown wherever practice questions appear: they are this site's own, never the exam body's. */
export const PRACTICE_LABEL = 'India School Finder Practice Questions';

function PracticeNote() {
  return (
    <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
      <strong>{PRACTICE_LABEL}</strong> — written by us in the style of each exam&apos;s official pattern. They are not official
      questions, and scores here do not predict results. For real papers, see each exam guide&apos;s official papers.
    </p>
  );
}

export function PracticeListPage() {
  useDocumentTitle('Free practice tests for school entrance exams');
  const sets = useApi(() => practiceService.list(), []);
  const exams = useApi(() => examService.all(), []);
  const examName = (slug: string | null) => exams.data?.find((e) => e.slug === slug)?.shortName ?? slug ?? 'General';

  return (
    <>
      <PageHeader eyebrow="Practice" title="Practice quizzes and mock tests"
        subtitle="Topic quizzes and timed mock tests with every answer explained. Free, no sign-in, and nothing about your attempt is stored." >
        <div className="flex flex-wrap gap-2">
          <Link to="/exams" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">All entrance exams</Link>
          <Link to="/exams/finder" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Exam finder</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-6 py-8">
        <PracticeNote />
        <AsyncContent state={sets} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No practice sets yet." />}>
          {(list) => {
            const groups = [...new Set(list.map((s) => s.examSlug))];
            return (
              <div className="space-y-8">
                {groups.map((g) => (
                  <section key={g ?? 'general'} aria-labelledby={`g-${g}`}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h2 id={`g-${g}`} className="font-display text-xl font-bold text-ink">{examName(g)}</h2>
                      {g && <Link to={`/exams/${g}`} className="link text-sm">Exam guide →</Link>}
                    </div>
                    <ul className="mt-3 grid gap-4 md:grid-cols-2">
                      {list.filter((s) => s.examSlug === g).map((s) => <li key={s.slug}><PracticeCard set={s} /></li>)}
                    </ul>
                  </section>
                ))}
              </div>
            );
          }}
        </AsyncContent>
      </div>
    </>
  );
}

export function PracticeCard({ set }: { set: PracticeSetSummary }) {
  return (
    <Link to={`/exams/practice/${set.slug}`} className="card card-hover flex h-full flex-col p-5">
      <span className="flex flex-wrap items-center gap-2">
        <span className={`chip ${set.kind === 'MOCK' ? 'bg-brand-600 text-white' : 'bg-brand-50 text-brand-800'}`}>{set.kind === 'MOCK' ? 'Timed mock test' : 'Topic quiz'}</span>
        <span className="chip bg-slate-100 text-slate-700">{set.level}</span>
      </span>
      <span className="mt-3 font-display text-lg font-bold text-ink">{set.title}</span>
      <span className="mt-1 flex-1 text-sm text-slate-600">{set.description}</span>
      <span className="mt-3 text-xs text-slate-500">
        {set.questionCount} questions · {set.durationMinutes ? `${set.durationMinutes} minutes` : 'untimed'} · {set.sections.join(', ')}
      </span>
    </Link>
  );
}

// --- Test player ----------------------------------------------------------------------------------------------------

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

const clock = (ms: number) => {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

export function PracticeTestPage() {
  const { slug = '' } = useParams();
  const state = useApi(() => practiceService.get(slug), [slug]);
  useDocumentTitle(state.data ? `${state.data.set.title} — practice` : 'Practice test');
  if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!state.data) return <Spinner />;
  return <Player key={slug} data={state.data} />;
}

function Player({ data }: { data: PracticeSet }) {
  const { set, questions, passages } = data;
  const [phase, setPhase] = useState<Phase>('intro');
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<PracticeScore | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const now = useNow(phase === 'test' && endsAt !== null);
  const remaining = endsAt === null ? null : endsAt - now;

  const start = () => {
    setAnswers({});
    setMarked(new Set());
    setIndex(0);
    setResult(null);
    setConfirming(false);
    setSubmitError(null);
    setEndsAt(set.durationMinutes ? Date.now() + set.durationMinutes * 60_000 : null);
    setPhase('test');
  };

  const submit = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      setResult(await practiceService.score(set.slug, answers));
      setPhase('result');
      window.scrollTo({ top: 0 });
    } catch (e) {
      setSubmitError(e instanceof ApiError ? e.message : 'Could not check your answers. Please try again.');
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  }, [answers, set.slug]);

  // Time up: submit what has been answered.
  const autoSubmitted = useRef(false);
  useEffect(() => {
    if (phase === 'test' && remaining !== null && remaining <= 0 && !autoSubmitted.current) {
      autoSubmitted.current = true;
      void submit();
    }
    if (phase !== 'test') autoSubmitted.current = false;
  }, [phase, remaining, submit]);

  useEffect(() => { headingRef.current?.focus(); }, [index, phase]);

  const q = questions[index];
  const passage = q?.passageId ? passages.find((p) => p.id === q.passageId) : undefined;
  const answeredCount = Object.keys(answers).length;

  if (phase === 'intro') {
    return (
      <>
        <PageHeader eyebrow={set.kind === 'MOCK' ? 'Timed mock test' : 'Topic quiz'} title={set.title} subtitle={set.description}>
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">All practice sets</Link>
        </PageHeader>
        <div className="container-page max-w-3xl space-y-5 py-8">
          <PracticeNote />
          <section className="card space-y-3 p-6 text-sm text-slate-700">
            <h2 className="font-display text-lg font-bold text-ink">Before you start</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>{questions.length} multiple-choice questions ({set.sections.join(', ')}); one correct option each.</li>
              <li>{set.durationMinutes ? `${set.durationMinutes} minutes. The timer starts when you begin, and your answers are submitted automatically when time is up.` : 'No time limit — take as long as you need.'}</li>
              <li>Move between questions with Previous / Next or the question numbers. Use “Mark for review” to come back to a question.</li>
              <li>After you submit you will see your score, every correct answer and an explanation. Nothing is saved.</li>
            </ul>
            <button type="button" onClick={start} className="btn-primary mt-2">Start {set.kind === 'MOCK' ? 'the test' : 'the quiz'}</button>
          </section>
        </div>
      </>
    );
  }

  if (phase === 'result' && result) {
    return <Results data={data} result={result} answers={answers} onRestart={start} headingRef={headingRef} />;
  }

  return (
    <div className="container-page py-6">
      <div className="sticky top-[68px] z-20 -mx-4 mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-canvas/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border sm:px-4">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{set.title}</p>
          <p className="text-xs text-slate-500">{PRACTICE_LABEL}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-slate-600">{answeredCount}/{questions.length} answered</span>
          {remaining !== null && (
            <span role="timer" aria-live={remaining < 60_000 ? 'assertive' : 'off'} aria-label={`Time left ${clock(remaining)}`}
              className={`rounded-full px-3 py-1 font-mono text-sm font-semibold tabular-nums ${remaining < 60_000 ? 'bg-red-100 text-red-800' : 'bg-slate-100 text-ink'}`}>
              <Icon name="clock" className="mr-1 inline h-4 w-4 align-[-3px]" />{clock(remaining)}
            </span>
          )}
          <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => setConfirming(true)}>Submit</button>
        </div>
      </div>

      {confirming && (
        <div role="alertdialog" aria-labelledby="confirm-title" className="card mb-4 border-brand-200 p-4 text-sm">
          <p id="confirm-title" className="font-semibold text-ink">Submit your answers?</p>
          <p className="mt-1 text-slate-600">
            You have answered {answeredCount} of {questions.length}.
            {questions.length - answeredCount > 0 && ` ${questions.length - answeredCount} unanswered will count as not attempted.`}
            {marked.size > 0 && ` ${marked.size} marked for review.`}
          </p>
          <div className="mt-3 flex gap-2">
            <button type="button" className="btn-primary py-1.5 text-sm" disabled={submitting} onClick={() => void submit()}>{submitting ? 'Checking…' : 'Yes, submit'}</button>
            <button type="button" className="btn-secondary py-1.5 text-sm" onClick={() => setConfirming(false)}>Keep going</button>
          </div>
        </div>
      )}
      {submitError && <p role="alert" className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-800">{submitError}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <section className="min-w-0 space-y-4">
          {passage && (
            <div tabIndex={0} role="region" aria-label={`Passage: ${passage.title}`}
              className="card max-h-80 overflow-y-auto p-5 text-sm leading-relaxed text-slate-800">
              <p className="mb-2 font-semibold text-ink">Read the passage: {passage.title}</p>
              <p className="whitespace-pre-line">{passage.text}</p>
            </div>
          )}
          <fieldset className="card p-5">
            <legend className="sr-only">Question {index + 1}</legend>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Question {index + 1} of {questions.length} · {q.section}{q.topic ? ` · ${q.topic}` : ''}
            </p>
            <h2 ref={headingRef} tabIndex={-1} className="mt-2 text-lg font-semibold text-ink outline-none">{q.prompt}</h2>
            {q.figure && q.figure.length > 0 && <FigureRow figures={q.figure} asksNext={q.figureAsksNext} />}
            <div className={`mt-4 ${q.optionFigures ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'space-y-2'}`}>
              {q.options.map((opt, i) => {
                const chosen = answers[q.id] === i;
                const fig = q.optionFigures?.[i];
                return (
                  <label key={opt} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm transition ${fig ? 'flex-col items-center' : 'items-start'} ${chosen ? 'border-brand-600 bg-brand-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <span className="flex items-center gap-2">
                      <input type="radio" name={`q-${q.id}`} className="h-4 w-4" checked={chosen}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: i }))} />
                      {fig ? <span className="font-semibold text-slate-700">{opt}</span>
                        : <span><span className="font-semibold text-slate-600">{String.fromCharCode(65 + i)}.</span> {opt}</span>}
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
                : <button type="button" className="btn-primary py-1.5 text-sm" onClick={() => setConfirming(true)}>Finish and submit</button>}
              <button type="button" aria-pressed={marked.has(q.id)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 ${marked.has(q.id) ? 'bg-amber-100 text-amber-900 ring-amber-300' : 'bg-white text-slate-700 ring-slate-200'}`}
                onClick={() => setMarked((m) => { const n = new Set(m); if (n.has(q.id)) n.delete(q.id); else n.add(q.id); return n; })}>
                {marked.has(q.id) ? 'Marked for review' : 'Mark for review'}
              </button>
              {answers[q.id] !== undefined && (
                <button type="button" className="text-xs text-slate-500 underline" onClick={() => setAnswers((a) => { const n = { ...a }; delete n[q.id]; return n; })}>Clear answer</button>
              )}
            </div>
          </fieldset>
        </section>
        <nav aria-label="Questions" className="card h-fit p-4">
          <p className="text-sm font-semibold text-ink">Questions</p>
          <ol className="mt-3 grid grid-cols-6 gap-2">
            {questions.map((qq, i) => {
              const answered = answers[qq.id] !== undefined;
              const isMarked = marked.has(qq.id);
              return (
                <li key={qq.id}>
                  <button type="button" onClick={() => setIndex(i)} aria-current={i === index ? 'step' : undefined}
                    aria-label={`Question ${i + 1}${answered ? ', answered' : ''}${isMarked ? ', marked for review' : ''}`}
                    className={`h-9 w-full rounded-lg text-sm font-semibold ring-1 ${i === index ? 'ring-2 ring-brand-600' : 'ring-slate-200'} ${
                      isMarked ? 'bg-amber-100 text-amber-900' : answered ? 'bg-brand-600 text-white' : 'bg-white text-slate-700'}`}>
                    {i + 1}
                  </button>
                </li>
              );
            })}
          </ol>
          <ul className="mt-4 space-y-1 text-xs text-slate-600">
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-brand-600 align-middle" />Answered</li>
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-amber-100 ring-1 ring-amber-300 align-middle" />Marked for review</li>
            <li><span aria-hidden className="mr-1.5 inline-block h-3 w-3 rounded bg-white ring-1 ring-slate-300 align-middle" />Not answered</li>
          </ul>
        </nav>
      </div>
    </div>
  );
}

function Results({ data, result, answers, onRestart, headingRef }: {
  data: PracticeSet;
  result: PracticeScore;
  answers: Record<string, number>;
  onRestart: () => void;
  headingRef: React.RefObject<HTMLHeadingElement>;
}) {
  const { set, questions, passages } = data;
  const [filter, setFilter] = useState<'all' | 'wrong' | 'skipped'>('all');
  const byId = useMemo(() => new Map(result.questions.map((r) => [r.id, r])), [result]);
  const percent = Math.round((result.correct / result.total) * 100);
  const shown = questions.filter((q) => {
    const r = byId.get(q.id)!;
    return filter === 'all' || (filter === 'wrong' ? r.chosen !== null && !r.correct : r.chosen === null);
  });

  return (
    <div className="container-page max-w-4xl space-y-6 py-8">
      <section className="card p-6" aria-labelledby="result-heading">
        <p className="eyebrow">{PRACTICE_LABEL}</p>
        <h1 id="result-heading" ref={headingRef} tabIndex={-1} className="mt-1 font-display text-2xl font-bold text-ink outline-none">
          You scored {result.correct} out of {result.total} ({percent}%)
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          {set.title} · attempted {result.attempted} · not attempted {result.total - result.attempted}. Practice scores do not predict exam results.
        </p>
        <div className="mt-5 overflow-x-auto" tabIndex={0} role="region" aria-label="Score by section">
          <table className="w-full text-sm">
            <thead className="text-left text-slate-600"><tr><th className="py-2 pr-3">Section</th><th className="py-2 pr-3 text-right">Correct</th><th className="py-2 pr-3 text-right">Tried</th><th className="py-2 text-right">Total</th></tr></thead>
            <tbody>
              {result.sections.map((s) => (
                <tr key={s.section} className="border-t border-slate-100">
                  <td className="py-2 pr-3 font-medium text-ink">{s.section}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.correct}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{s.attempted}</td>
                  <td className="py-2 text-right tabular-nums">{s.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={onRestart} className="btn-primary">Try again</button>
          <Link to="/exams/practice" className="btn-secondary">More practice</Link>
          {set.examSlug && <Link to={`/exams/${set.examSlug}`} className="btn-secondary">Exam guide</Link>}
        </div>
      </section>

      <section aria-labelledby="review-heading">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="review-heading" className="font-display text-xl font-bold text-ink">Review your answers</h2>
          <div className="flex gap-2" role="group" aria-label="Show">
            {([['all', 'All'], ['wrong', 'Wrong'], ['skipped', 'Not attempted']] as const).map(([v, label]) => (
              <button key={v} type="button" aria-pressed={filter === v} onClick={() => setFilter(v)}
                className={`chip px-3 py-1 text-sm ${filter === v ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>{label}</button>
            ))}
          </div>
        </div>
        {shown.length === 0 && <p className="card mt-3 p-5 text-sm text-slate-600">Nothing to show here.</p>}
        <ol className="mt-3 space-y-3">
          {shown.map((q) => {
            const r = byId.get(q.id)!;
            const passage = q.passageId ? passages.find((p) => p.id === q.passageId) : undefined;
            const n = questions.indexOf(q) + 1;
            return (
              <li key={q.id} className="card p-5 text-sm">
                <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Question {n} · {q.section}
                  <span className={`chip normal-case ${r.chosen === null ? 'bg-slate-100 text-slate-700' : r.correct ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                    {r.chosen === null ? 'Not attempted' : r.correct ? 'Correct' : 'Wrong'}
                  </span>
                </p>
                {passage && <p className="mt-1 text-xs text-slate-500">From the passage “{passage.title}”</p>}
                <p className="mt-2 font-semibold text-ink">{q.prompt}</p>
                {q.figure && q.figure.length > 0 && <FigureRow figures={q.figure} asksNext={q.figureAsksNext} />}
                <ul className={`mt-2 ${q.optionFigures ? 'grid grid-cols-2 gap-2 sm:grid-cols-4' : 'space-y-1'}`}>
                  {q.options.map((opt, i) => (
                    <li key={opt} className={`rounded-lg px-3 py-1.5 ${i === r.answer ? 'bg-emerald-50 text-emerald-900' : i === answers[q.id] ? 'bg-red-50 text-red-900' : 'text-slate-700'}`}>
                      {q.optionFigures?.[i] && <FigureView figure={q.optionFigures[i]} size={72} className="mb-1" />}
                      {q.optionFigures ? opt : `${String.fromCharCode(65 + i)}. ${opt}`}
                      {i === r.answer && <span className="ml-2 text-xs font-semibold">✓ correct answer</span>}
                      {i === answers[q.id] && i !== r.answer && <span className="ml-2 text-xs font-semibold">your answer</span>}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 rounded-lg bg-slate-50 p-3 text-slate-700"><strong className="text-ink">Why: </strong>{r.explanation}</p>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
