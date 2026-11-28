// @ts-expect-error The browser app has no Node types; Vitest runs this file in Node. The seed files are outside the Vite root.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { ExamDetail } from '../types/api';
import { NETARHAT_PREP } from './netarhatPrep';

const here = import.meta.url; // a variable, so Vite does not turn the URL below into an asset import
const seed = (name: string) => JSON.parse(readFileSync(new URL('../../../backend/src/main/resources/seed/' + name, here), 'utf8'));
const sets: { slug: string; examSlug: string; kind: string; level: string; durationMinutes: number; content: { questions: { section: string; topic: string }[] } }[] =
  seed('practice.json').sets.filter((s: { examSlug: string }) => s.examSlug === 'netarhat');
const exam = (seed('exams.json').exams ?? seed('exams.json')).find((e: { slug: string }) => e.slug === 'netarhat');

describe('Netarhat preparation page', () => {
  it('lists exactly the topics of the practice bank, section by section', () => {
    for (const s of NETARHAT_PREP.sections) {
      const bank = new Set(sets.flatMap((x) => x.content.questions).filter((q) => q.section === s.section).map((q) => q.topic));
      expect(new Set(s.topics.map((t) => t.topic)), s.section).toEqual(bank);
    }
  });

  it('has two full Paper 1 mock tests in the pattern: 100 questions, 20 per subject in order, 150 minutes', () => {
    const mocks = sets.filter((s) => s.kind === 'MOCK');
    expect(mocks.map((m) => m.slug)).toEqual(['netarhat-paper1-mock-1', 'netarhat-paper1-mock-2']);
    expect(NETARHAT_PREP.firstMock).toBe('netarhat-paper1-mock-1');
    for (const m of mocks) {
      expect(m.durationMinutes).toBe(150);
      expect(m.level).toBe(NETARHAT_PREP.level);
      const order = m.content.questions.map((q) => q.section);
      expect(order).toHaveLength(100);
      NETARHAT_PREP.sections.forEach((s, i) => expect(order.slice(i * 20, i * 20 + 20).every((x) => x === s.section), s.section).toBe(true));
    }
  });

  it('reads both papers from the exam data, keeping the written Paper 2 apart', () => {
    const detail = { exam, content: exam.content } as unknown as ExamDetail;
    const { rows, total } = NETARHAT_PREP.pattern.table('en', detail);
    expect(rows).toHaveLength(9);
    expect(rows[0]).toMatchObject({ label: 'Paper 1 (objective) · Mental Ability', questions: 20, marks: 20, qualifying: 'Short-list (500 boys)' });
    expect(rows[5]).toMatchObject({ label: 'Paper 2 (written) · Hindi', questions: 'written', marks: 25, qualifying: 'Merit' });
    expect(total).toEqual({ questions: 100, marks: '100 + 100', minutes: '2 × 150 min' });
    expect(NETARHAT_PREP.pattern.table('hi', detail).rows[0].label).toBe('पेपर 1 (वस्तुनिष्ठ) · मानसिक योग्यता');
  });
});
