import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PracticeFigure, PracticePassage, PracticeQuestion, PracticeSet } from '../types/api';
import { PracticePaperPage, paperMarking, paperSections } from './PracticePaperPage';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const data = vi.hoisted(() => ({ current: null as unknown }));
vi.mock('../services/publicApi', () => ({
  practiceService: { get: () => Promise.resolve(data.current) },
  examService: { all: () => new Promise(() => {}) },
}));
vi.mock('../hooks/useMember', () => ({ useMember: () => ({ status: 'signedOut' }) }));

const square: PracticeFigure = { alt: 'A square', shapes: [{ kind: 'square', x: 50, y: 50, size: 60, rotate: 0, filled: false }] };
const question = (over: Partial<PracticeQuestion>): PracticeQuestion => ({
  id: 'q', section: 'Language', topic: null, passageId: null, prompt: 'Prompt', options: ['One', 'Two', 'Three', 'Four'], figure: null,
  figureAsksNext: false, optionFigures: null, difficulty: 'EASY', chapter: null, hi: null, ...over,
});
const passages: PracticePassage[] = [{ id: 'p1', title: 'The tree', text: 'Ravi planted a tree by the river.', hi: null }];
const questions: PracticeQuestion[] = [
  question({
    id: 'm1', section: 'Mental Ability', prompt: 'Which figure comes next?', options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'],
    figure: [square, square], figureAsksNext: true, optionFigures: [square, square, square, square],
    hi: { prompt: 'अगली आकृति कौन सी है?', options: ['आकृति A', 'आकृति B', 'आकृति C', 'आकृति D'] },
  }),
  question({ id: 'l1', passageId: 'p1', prompt: 'Who planted the tree?', options: ['Ravi', 'Meena', 'The teacher', 'Nobody'] }),
  question({ id: 'l2', passageId: 'p1', prompt: 'Where was the tree?', options: ['In the yard', 'By the river', 'At school', 'On a hill'] }),
];
const fixture = (qs: PracticeQuestion[] = questions): PracticeSet => ({
  set: {
    slug: 'fixture-paper', examSlug: 'jnvst', title: 'Fixture JNVST paper', kind: 'MOCK', level: 'Class V', description: 'A fixture.',
    durationMinutes: 60, questionCount: qs.length, sections: ['Mental Ability', 'Language'], reviewedOn: '2026-11-20', category: 'ENTRANCE',
    marksPerQuestion: 1, negativeMarks: 0, hindi: false, chapters: [], sectionMarks: null,
  },
  passages,
  questions: qs,
});

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

beforeEach(() => {
  localStorage.clear();
  data.current = fixture();
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.restoreAllMocks();
});

async function open(entry: string) {
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[entry]}>
        <Routes>
          <Route path="/exams/practice/:slug/paper" element={<PracticePaperPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  await act(async () => {});
  return container.textContent ?? '';
}

describe('the printable practice paper', () => {
  it('prints every question with lettered options, each passage once, and an answer sheet, but no answers', async () => {
    const text = await open('/exams/practice/fixture-paper/paper');
    expect(text).toContain('Fixture JNVST paper');
    expect(text).toContain('3 questions · 60 minutes');
    expect(text).toContain('Section: Mental Ability');
    expect(text).toContain('Section: Language');
    expect(text).toContain('Marking: 1 mark for each correct answer; nothing is taken off for a wrong or skipped one.');
    expect(text).toContain('(A)Ravi');
    expect(text).toContain('(D)On a hill');
    // Two problem figures and four answer figures, drawn as SVG.
    expect(container.querySelectorAll('svg[role="img"]')).toHaveLength(6);
    // The passage is printed once, before the first question that uses it.
    expect([...container.querySelectorAll('p')].filter((p) => p.textContent === 'The tree')).toHaveLength(1);
    expect(container.querySelectorAll('ol[aria-label="Answer sheet"] > li')).toHaveLength(3);
    expect(container.querySelector('a[href="https://schooldhundo.in/exams/practice/fixture-paper"]')).not.toBeNull();
    expect(text).toContain('Not an official or previous-year paper.');
    expect(text).not.toMatch(/correct answer:|answer key/i);
  });

  it('prints in Hindi from a shared ?lang=hi link, with English where a question has no Hindi version', async () => {
    const text = await open('/exams/practice/fixture-paper/paper?lang=hi');
    expect(text).toContain('अगली आकृति कौन सी है?');
    expect(text).toContain('Who planted the tree?');
    expect(text).toContain('उत्तर पत्रक');
    expect(text).toContain('3 प्रश्न · 60 मिनट');
    expect(text).toContain('2 of the 3 questions have no Hindi version yet and are printed in English.');
  });

  it('keeps a set without Hindi in English, with no language switch', async () => {
    data.current = fixture(questions.map((q) => ({ ...q, hi: null })));
    const text = await open('/exams/practice/fixture-paper/paper?lang=hi');
    expect(text).toContain('Answer sheet');
    expect(container.querySelector('[aria-label="Question language"]')).toBeNull();
  });

  it('opens the print window from its button', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    await open('/exams/practice/fixture-paper/paper');
    const button = [...container.querySelectorAll('button')].find((b) => b.textContent === 'Print or save as PDF');
    act(() => button!.click());
    expect(print).toHaveBeenCalledTimes(1);
  });
});

describe('the paper helpers', () => {
  it('describes negative and section marking, in Hindi where it can', () => {
    expect(paperMarking({ marksPerQuestion: 1, negativeMarks: 0.25, sectionMarks: null }, 'en'))
      .toBe("Marking: 1 mark for each correct answer, 0.25 marks taken off for each wrong one, nothing for a skipped one. This is our practice marking, not the exam's official scheme.");
    expect(paperMarking({ marksPerQuestion: 2, negativeMarks: 0, sectionMarks: { Mathematics: 3, Language: 2 } }, 'en'))
      .toContain('3 marks in Mathematics, 2 marks in other sections for each correct answer');
    expect(paperMarking({ marksPerQuestion: 1, negativeMarks: 0, sectionMarks: null }, 'hi')).toContain('हर सही उत्तर पर 1 अंक');
    // Sections marked differently are described in English only.
    expect(paperMarking({ marksPerQuestion: 2, negativeMarks: 0, sectionMarks: { Mathematics: 3 } }, 'hi')).toMatch(/^Marking: /);
  });

  it('groups questions by section and attaches each passage to its first question only', () => {
    const groups = paperSections(questions, passages);
    expect(groups.map((g) => [g.section, g.items.map((i) => i.n)])).toEqual([['Mental Ability', [1]], ['Language', [2, 3]]]);
    expect(groups[1].items.map((i) => i.passage?.id ?? null)).toEqual(['p1', null]);
  });
});
