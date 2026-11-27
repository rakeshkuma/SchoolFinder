import { act } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MENTAL_ABILITY as c } from '../content/jnvstMentalAbility';
import { MENTAL_ABILITY_PATH } from '../content/jnvstLinks';
import { JNVST_PREP } from '../content/jnvstPrep';
import { click, render, type Rendered } from '../test/render';
import type { PracticeBankQuestion, PracticeSetSummary } from '../types/api';
import { MentalAbilityPage, typeCounts, typeSession } from './MentalAbilityPage';

vi.mock('../hooks/useMember', () => ({ useMember: () => ({ status: 'signedOut' }) }));

const set = (slug: string, title: string, kind: 'QUIZ' | 'MOCK', count: number, minutes: number): PracticeSetSummary => ({
  slug, examSlug: 'jnvst', title, kind, level: 'Class V', description: '', durationMinutes: minutes, questionCount: count,
  sections: kind === 'MOCK' ? ['Mental Ability', 'Environmental Studies', 'Arithmetic', 'Language'] : ['Mental Ability'],
  reviewedOn: '2026-11-12', category: 'ENTRANCE', marksPerQuestion: 1.25, negativeMarks: 0, hindi: true, chapters: [], sectionMarks: null,
});
const bankQuestion = (n: number, topic: string, extra: Partial<PracticeBankQuestion> = {}): PracticeBankQuestion => ({
  id: `jnvst-mat-1/m${n}`, setSlug: 'jnvst-mat-1', examSlug: 'jnvst', level: 'Class V', section: 'Mental Ability', topic,
  difficulty: 'MEDIUM', category: 'ENTRANCE', chapter: null, hindi: true, ...extra,
});

vi.mock('../services/publicApi', () => ({
  practiceService: {
    list: () => Promise.resolve([
      set('jnvst-mock-1', 'JNVST Class VI full mock test 1', 'MOCK', 80, 120),
      set('jnvst-mat-1', 'JNVST Mental Ability practice 1', 'QUIZ', 20, 30),
      set('jnvst-mat-2', 'JNVST Mental Ability practice 2', 'QUIZ', 20, 30),
      set('jnvst-arithmetic-1', 'JNVST Arithmetic practice 1', 'QUIZ', 20, 30),
    ]),
    bank: () => Promise.resolve({ questions: [
      bankQuestion(1, 'Pattern completion'), bankQuestion(2, 'Pattern completion'), bankQuestion(3, 'Water image'),
      bankQuestion(4, 'Arithmetic topic', { section: 'Arithmetic' }), bankQuestion(5, 'Pattern completion', { examSlug: 'aissee' }),
    ] }),
  },
}));

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });
let view: Rendered | null = null;
afterEach(() => {
  view?.unmount();
  view = null;
  localStorage.clear();
});

describe('the JNVST Mental Ability content', () => {
  it('has five parts, a worked example for each, and both kinds of image in Part IV', () => {
    expect(c.path).toBe(MENTAL_ABILITY_PATH);
    expect(c.parts.map((p) => p.part)).toEqual(['I', 'II', 'III', 'IV', 'V']);
    c.parts.forEach((p) => expect(c.examples.some((e) => e.part === p.part)).toBe(true));
    expect(c.examples.filter((e) => e.part === 'IV').map((e) => e.topic)).toEqual(['Mirror image', 'Water image']);
    c.examples.forEach((e) => {
      expect(e.optionFigures).toHaveLength(4);
      expect(e.explanation.en.toLowerCase()).toContain(`figure ${'ABCD'[e.answer]}`.toLowerCase());
    });
  });

  it('is linked from the Mental Ability card of the JNVST preparation page', () => {
    expect(JNVST_PREP.sections.find((s) => s.section === 'Mental Ability')?.guide?.to).toBe(MENTAL_ABILITY_PATH);
  });

  it('counts only JNVST Mental Ability bank questions by type, and practises one type at a time', () => {
    expect(typeCounts([
      bankQuestion(1, 'Pattern completion'), bankQuestion(2, 'Pattern completion'), bankQuestion(3, 'Embedded figure'),
      bankQuestion(4, 'Pattern completion', { examSlug: 'aissee' }), bankQuestion(5, 'Fractions', { section: 'Arithmetic' }),
    ])).toEqual({ 'Pattern completion': 2, 'Embedded figure': 1 });
    expect(typeSession('Mirror image')).toBe('/exams/practice/session?exam=jnvst&mode=TOPIC&section=Mental+Ability&topic=Mirror+image&count=10');
  });
});

describe('MentalAbilityPage', () => {
  it('shows the parts, the papers and the questions parents ask, with answers only when asked for', async () => {
    view = render(<MentalAbilityPage />);
    await flush();
    const page = view.container;
    expect(page.querySelector('h1')?.textContent).toBe(c.heading.en);
    expect([...page.querySelectorAll('article h3')].map((h) => h.textContent)).toEqual(c.parts.map((p) => p.name.en));
    // The practice papers and mock tests from the server, and no other sets.
    const links = [...page.querySelectorAll('a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/exams/practice/jnvst-mat-1');
    expect(links).toContain('/exams/practice/jnvst-mock-1');
    expect(links).not.toContain('/exams/practice/jnvst-arithmetic-1');
    expect(links).toContain('https://cbseitms.rcil.gov.in/nvs/assets/pdf/PYQ_English_2026.pdf');
    expect(page.textContent).toContain('Practise this type (2)');
    expect(page.querySelectorAll('details')).toHaveLength(c.faq.length);
    // An answer appears only after "Show the answer", with its reason.
    const first = c.examples[0];
    expect(page.textContent).not.toContain(first.explanation.en);
    click([...page.querySelectorAll('button')].find((b) => b.textContent === 'Show the answer') ?? null);
    expect(page.textContent).toContain(`Answer: figure ${'ABCD'[first.answer]}. ${first.explanation.en}`);
  });

  it('switches the whole page to Hindi', async () => {
    view = render(<MentalAbilityPage />);
    await flush();
    click([...view.container.querySelectorAll('button')].find((b) => b.textContent === 'हिन्दी') ?? null);
    expect(view.container.querySelector('h1')?.textContent).toBe(c.heading.hi);
    expect(view.container.textContent).toContain(c.faq[0].q.hi);
    expect(view.container.firstElementChild?.getAttribute('lang')).toBe('hi');
  });
});
