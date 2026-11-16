import { afterEach, describe, expect, it, vi } from 'vitest';
import { click, render, type Rendered } from '../test/render';
import type { PracticeBankQuestion, PracticeSetSummary } from '../types/api';
import { classOf, drawMock, OlympiadPractice, olympiadSessionText } from './OlympiadPractice';

vi.mock('../hooks/useMember', () => ({ useMember: () => ({ status: 'signedOut' }) }));

const q = (setSlug: string, n: number, section: string, level: string, extra: Partial<PracticeBankQuestion> = {}): PracticeBankQuestion => ({
  id: `${setSlug}/q${n}`, setSlug, examSlug: null, level, section, topic: 'Topic', difficulty: 'MEDIUM', category: 'OLYMPIAD',
  chapter: 'Chapter', hindi: section !== 'English', ...extra,
});
const many = (setSlug: string, count: number, section: string, level: string, extra: (i: number) => Partial<PracticeBankQuestion> = () => ({})) =>
  Array.from({ length: count }, (_, i) => q(setSlug, i + 1, section, level, extra(i)));

const classV = [
  ...many('olympiad-class5-reasoning-1', 14, 'Logical Reasoning', 'Class V', (i) => ({ difficulty: i < 3 ? 'HARD' : 'MEDIUM' })),
  ...many('olympiad-class5-maths-1', 37, 'Mathematics', 'Class V', (i) => ({ difficulty: i % 6 === 0 ? 'HARD' : 'EASY', chapter: i < 20 ? 'Number sense' : 'Geometry' })),
  ...many('olympiad-class5-english-1', 16, 'English', 'Class V', (i) => ({ chapter: i < 5 || i === 12 ? 'Reading' : 'Grammar' })),
];
const set = (slug: string, title: string, level: string, sections: string[], count: number): PracticeSetSummary => ({
  slug, examSlug: null, title, kind: 'QUIZ', level, description: '', durationMinutes: null, questionCount: count, sections, reviewedOn: '2026-11-16',
  category: 'OLYMPIAD', marksPerQuestion: 1, negativeMarks: 0, hindi: true, chapters: ['Number sense', 'Geometry'], sectionMarks: null,
});

describe('Olympiad helpers', () => {
  it('reads a class from a set level and ignores other levels', () => {
    expect(classOf('Class V')).toBe(5);
    expect(classOf('Class XII')).toBe(12);
    expect(classOf('Class V–VI')).toBeNull();
    expect(classOf('Class XII and above')).toBeNull();
    expect(classOf(null)).toBeNull();
  });

  it('names an Olympiad sitting only from known values', () => {
    const p = (s: string) => new URLSearchParams(s);
    expect(olympiadSessionText(p('mode=QUICK&section=Mathematics'), 'Quick practice: Mathematics', 5)).toBeNull();
    expect(olympiadSessionText(p('category=OLYMPIAD&level=Class V'), 'Quick practice: Mathematics', 5)?.title)
      .toBe('Quick practice: Mathematics · Class V Olympiad');
    expect(olympiadSessionText(p('category=OLYMPIAD&level=Class V&mock=maths'), 'Full practice test (50 questions)', 50)?.title)
      .toBe('Maths Olympiad-style mock: Class V');
    // An unknown mock or a made-up level cannot put its own words into the title.
    expect(olympiadSessionText(p('category=OLYMPIAD&level=Class V&mock=Official SOF paper'), 'Full practice test', 50)?.title)
      .toBe('Full practice test · Class V Olympiad');
    expect(olympiadSessionText(p('category=OLYMPIAD&level=Official paper'), 'Daily challenge', 10)).toBeNull();
  });

  it('builds a mock in the SOF order: reasoning first, harder questions last, never more than the paper', () => {
    const { reasoning, subject } = drawMock('maths', 5, classV, 42);
    expect(reasoning).toHaveLength(14); // only 14 reasoning questions exist; the paper has 15
    expect(reasoning.length + subject.length).toBe(50);
    expect(subject.every((x) => x.section === 'Mathematics')).toBe(true);
    const firstHard = subject.findIndex((x) => x.difficulty === 'HARD');
    expect(subject.slice(firstHard).every((x) => x.difficulty === 'HARD')).toBe(true);
    expect(new Set([...reasoning, ...subject].map((x) => x.id)).size).toBe(50);
    // Classes I–IV get the 35-question paper.
    const small = drawMock('maths', 3, classV.map((x) => ({ ...x, level: 'Class III' })), 1);
    expect(small.reasoning).toHaveLength(10);
    expect(small.reasoning.length + small.subject.length).toBe(35);
  });

  it('keeps reading questions together and in order in an English test', () => {
    const { subject } = drawMock('english', 5, classV, 7);
    expect(subject).toHaveLength(16);
    expect(subject.slice(0, 6).map((x) => x.id)).toEqual([1, 2, 3, 4, 5, 13].map((n) => `olympiad-class5-english-1/q${n}`));
  });
});

describe('OlympiadPractice', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  const page = () => render(
    <OlympiadPractice sets={[set('olympiad-class5-maths-1', 'Olympiad Mathematics practice: Class V', 'Class V', ['Mathematics'], 37)]} setsError={null}
      bank={[...classV, q('jnvst-mat-1', 1, 'Mental Ability', 'Class V', { category: 'ENTRANCE' })]} bankError={null} onRetry={() => {}}
      pointsNote={null} advancedBuilder={<p>builder</p>}
      categoryLabels={{ ENTRANCE: 'School entrance exams', SCHOOL: 'School subjects', OLYMPIAD: 'Olympiads', COMPETITIVE: 'Competitive exams' }} />,
  );

  it('leads from class to subject to topic, using only Olympiad questions', () => {
    view = page();
    const text = () => view!.container.textContent ?? '';
    expect(view.container.querySelector('h1')?.textContent).toBe('Olympiad Preparation & Practice');
    expect(text()).toContain('Choose your class');
    // Classes without questions are shown, but cannot be chosen.
    expect(text()).toContain('Coming later');
    expect(view.container.querySelector('button[aria-label^="Class XII"]')).toBeNull();
    // The entrance-exam question in the bank is not counted.
    expect(view.container.querySelector('button[aria-label="Class V, 67 questions"]')).not.toBeNull();
    expect(view.container.querySelector('a[href="/exams/practice/progress"]')?.textContent).toContain('View My Practice Progress');

    click(view.container.querySelector('button[aria-label="Class V, 67 questions"]'));
    expect(text()).toContain('Choose a subject for Class V');
    expect(text()).toContain('Maths Olympiad-style mock');
    expect(text()).toContain('14 Logical Reasoning + 36 Mathematics · 50 questions · 60 min, timed');
    expect(text()).toContain('Class V daily challenge');

    const maths = [...view.container.querySelectorAll('button[role="radio"]')].find((b) => b.textContent?.startsWith('Mathematics'));
    click(maths ?? null);
    expect(text()).toContain('Mathematics: choose a topic and start');
    expect(text()).toContain('Number sense · 20');
    expect([...view.container.querySelectorAll('button')].some((b) => b.textContent?.includes('Start Practice'))).toBe(true);

    const card = view.container.querySelector('a[href="/exams/practice/olympiad-class5-maths-1"]');
    expect(card?.textContent).toContain('Start Practice');
  });
});
