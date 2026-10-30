import { describe, expect, it } from 'vitest';
import { practiceStats, type AttemptRecord } from './practiceStats';

const attempt = (key: string, createdAt: string, correct: number, attempted: number, total: number,
  extra: Partial<AttemptRecord> = {}): AttemptRecord => ({
  key, title: `Test ${key}`, createdAt, durationSeconds: 300, total, attempted, correct, marks: null, maxMarks: null,
  sections: [{ section: 'Mathematics', total, attempted, correct }], topics: [], outcomes: null, href: `/x/${key}`, ...extra,
});

const chapters: Record<string, { subject: string; chapter: string | null }> = {
  'm/1': { subject: 'Mathematics', chapter: 'Polynomials' },
  'm/2': { subject: 'Mathematics', chapter: 'Polynomials' },
  'm/3': { subject: 'Mathematics', chapter: 'Probability' },
  'e/1': { subject: 'English', chapter: null },
};

describe('practiceStats', () => {
  it('suggests a first quick practice when there is no history', () => {
    const s = practiceStats([], () => undefined);
    expect(s).toMatchObject({ tests: 0, accuracy: null, averageSeconds: null, improvement: null });
    expect(s.suggestion.params).toEqual({ mode: 'QUICK' });
  });

  it('totals tests, separates accuracy from score and orders the trend oldest first', () => {
    const s = practiceStats([
      attempt('b', '2026-10-02T10:00:00Z', 6, 8, 10, { durationSeconds: 100 }),
      attempt('a', '2026-10-01T10:00:00Z', 3, 10, 10, { durationSeconds: null }),
    ], () => undefined);
    expect(s).toMatchObject({ tests: 2, questions: 20, attempted: 18, correct: 9, incorrect: 9, accuracy: 50, averageSeconds: 100 });
    expect(s.trend.map((t) => [t.key, t.score, t.accuracy])).toEqual([['a', 30, 30], ['b', 60, 75]]);
  });

  it('measures improvement between the earlier and later half of recent tests', () => {
    const s = practiceStats(['01', '02', '03', '04'].map((d, i) => attempt(d, `2026-10-${d}T00:00:00Z`, [2, 4, 6, 8][i], 10, 10)), () => undefined);
    expect(s.improvement).toEqual({ earlier: 30, later: 70 });
  });

  it('builds chapter results from per-question outcomes and skips unknown chapters', () => {
    const s = practiceStats([attempt('a', '2026-10-01T00:00:00Z', 2, 3, 4, {
      outcomes: [{ id: 'm/1', attempted: true, correct: true }, { id: 'm/2', attempted: true, correct: false },
        { id: 'm/3', attempted: true, correct: true }, { id: 'e/1', attempted: false, correct: false }],
    })], (id) => chapters[id]);
    expect(s.chapters).toEqual([
      { subject: 'Mathematics', chapter: 'Polynomials', total: 2, attempted: 2, correct: 1, accuracy: 50 },
      { subject: 'Mathematics', chapter: 'Probability', total: 1, attempted: 1, correct: 1, accuracy: 100 },
    ]);
  });

  it('flags weak topics only with enough attempts and suggests the weakest', () => {
    const topics = [
      { section: 'Mathematics', topic: 'Fractions', total: 4, attempted: 4, correct: 1 },
      { section: 'Mathematics', topic: 'Time', total: 2, attempted: 2, correct: 0 }, // too few to judge
      { section: 'Mathematics', topic: 'Geometry', total: 5, attempted: 5, correct: 5 },
    ];
    const s = practiceStats([attempt('a', '2026-10-01T00:00:00Z', 6, 11, 11, { topics })], () => undefined);
    expect(s.weakTopics.map((t) => t.topic)).toEqual(['Fractions']);
    expect(s.suggestion.params).toEqual({ mode: 'TOPIC', section: 'Mathematics', topic: 'Fractions', count: '10' });
  });
});
