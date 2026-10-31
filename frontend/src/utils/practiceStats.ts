/**
 * Progress analytics from a student's practice attempts — the same calculation for members (attempts from their
 * account) and guests (attempts kept in this browser). Accuracy is correct ÷ attempted; a test's score is
 * correct ÷ total. Nothing here is a prediction of an exam result.
 */

export interface AttemptRecord {
  key: string;
  title: string;
  createdAt: string;
  durationSeconds: number | null;
  total: number;
  attempted: number;
  correct: number;
  marks: number | null;
  maxMarks: number | null;
  sections: { section: string; total: number; attempted: number; correct: number }[];
  topics: { section: string; topic: string; total: number; attempted: number; correct: number }[];
  /** Per question by bank id; null when the attempt was kept before outcomes were recorded. */
  outcomes: { id: string; attempted: boolean; correct: boolean }[] | null;
  /** Where the attempt's review opens. */
  href: string;
}

export interface Tally {
  total: number;
  attempted: number;
  correct: number;
  /** correct ÷ attempted, as a whole percent; null when nothing was attempted */
  accuracy: number | null;
}

export interface PracticeStats {
  tests: number;
  questions: number;
  attempted: number;
  correct: number;
  incorrect: number;
  accuracy: number | null;
  /** Average length of a timed-or-not test that recorded its duration, in seconds. */
  averageSeconds: number | null;
  /** Oldest first, at most the last 20 tests. */
  trend: { key: string; date: string; title: string; score: number; accuracy: number | null }[];
  /** Average score of the earlier and the later half of the trend (needs at least 4 tests). */
  improvement: { earlier: number; later: number } | null;
  /** Weakest first. */
  subjects: (Tally & { subject: string })[];
  /** Weakest first; only questions whose chapter is known. */
  chapters: (Tally & { subject: string; chapter: string })[];
  /** Attempted at least 3 times with accuracy below 60%, weakest first. */
  weakTopics: (Tally & { subject: string; topic: string })[];
  /** What to practise next, as practice-session address parameters. */
  suggestion: { label: string; reason: string; params: Record<string, string> };
}

const percent = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null);

function tally(rows: { total: number; attempted: number; correct: number }[]): Tally {
  const t = rows.reduce((a, r) => ({ total: a.total + r.total, attempted: a.attempted + r.attempted, correct: a.correct + r.correct }),
    { total: 0, attempted: 0, correct: 0 });
  return { ...t, accuracy: percent(t.correct, t.attempted) };
}

/** Weakest (lowest accuracy) first; more practised first among equals; never-attempted last. */
const weakestFirst = (a: Tally, b: Tally) =>
  (a.accuracy ?? 101) - (b.accuracy ?? 101) || b.attempted - a.attempted;

export function practiceStats(
  attempts: AttemptRecord[],
  chapterOf: (questionId: string) => { subject: string; chapter: string | null } | undefined,
): PracticeStats {
  const all = tally(attempts);
  const timed = attempts.filter((a) => a.durationSeconds !== null && a.durationSeconds > 0);
  const byDate = [...attempts].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const trend = byDate.slice(-20).map((a) => ({
    key: a.key, date: a.createdAt, title: a.title, score: percent(a.correct, a.total) ?? 0, accuracy: percent(a.correct, a.attempted),
  }));
  let improvement: PracticeStats['improvement'] = null;
  if (trend.length >= 4) {
    const half = Math.floor(trend.length / 2);
    const avg = (xs: typeof trend) => Math.round(xs.reduce((s, x) => s + x.score, 0) / xs.length);
    improvement = { earlier: avg(trend.slice(0, half)), later: avg(trend.slice(trend.length - half)) };
  }

  const group = <K extends string>(rows: { key: K; total: number; attempted: number; correct: number }[]) => {
    const m = new Map<K, { total: number; attempted: number; correct: number }[]>();
    rows.forEach((r) => m.set(r.key, [...(m.get(r.key) ?? []), r]));
    return [...m.entries()].map(([k, v]) => [k, tally(v)] as const);
  };
  const subjects = group(attempts.flatMap((a) => a.sections.map((s) => ({ ...s, key: s.section }))))
    .map(([subject, t]) => ({ subject, ...t })).sort(weakestFirst);
  const topics = group(attempts.flatMap((a) => a.topics.map((t) => ({ ...t, key: `${t.section}\u0000${t.topic}` }))))
    .map(([k, t]) => { const [subject, topic] = k.split('\u0000'); return { subject, topic, ...t }; });
  const chapters = group(attempts.flatMap((a) => (a.outcomes ?? []).flatMap((o) => {
    const c = chapterOf(o.id);
    return c?.chapter ? [{ key: `${c.subject}\u0000${c.chapter}`, total: 1, attempted: o.attempted ? 1 : 0, correct: o.correct ? 1 : 0 }] : [];
  }))).map(([k, t]) => { const [subject, chapter] = k.split('\u0000'); return { subject, chapter, ...t }; }).sort(weakestFirst);
  const weakTopics = topics.filter((t) => t.attempted >= 3 && (t.accuracy ?? 100) < 60).sort(weakestFirst);

  let suggestion: PracticeStats['suggestion'];
  const weakSubject = subjects.find((s) => s.attempted >= 5 && (s.accuracy ?? 100) < 60);
  if (weakTopics[0]) {
    const t = weakTopics[0];
    suggestion = { label: `Topic practice: ${t.topic}`, reason: `${t.accuracy}% accuracy over ${t.attempted} questions in ${t.subject}.`,
      params: { mode: 'TOPIC', section: t.subject, topic: t.topic, count: '10' } };
  } else if (weakSubject) {
    suggestion = { label: `Practise ${weakSubject.subject}`, reason: `Your weakest subject so far (${weakSubject.accuracy}% accuracy).`,
      params: { mode: 'TOPIC', section: weakSubject.subject, count: '10' } };
  } else if (attempts.length === 0) {
    suggestion = { label: 'Quick practice', reason: 'Five questions to get started.', params: { mode: 'QUICK' } };
  } else {
    suggestion = { label: 'Mini mock test', reason: 'No weak area stands out yet — try ten mixed questions against the clock.',
      params: { mode: 'MINI_MOCK', timer: '1' } };
  }

  return {
    tests: attempts.length, questions: all.total, attempted: all.attempted, correct: all.correct,
    incorrect: all.attempted - all.correct, accuracy: all.accuracy,
    averageSeconds: timed.length ? Math.round(timed.reduce((s, a) => s + (a.durationSeconds ?? 0), 0) / timed.length) : null,
    trend, improvement, subjects, chapters, weakTopics, suggestion,
  };
}
