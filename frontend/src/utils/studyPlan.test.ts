import { describe, expect, it } from 'vitest';
import { buildPlan, subjectsFrom } from './studyPlan';

const jnv9 = {
  syllabus: [
    { area: 'English (15 marks)', topics: ['A', 'B', 'C'] },
    { area: 'Mathematics (35 marks)', topics: ['M1', 'M2', 'M3', 'M4', 'M5', 'M6'] },
    { area: 'Hindi (15 marks)', topics: ['H'] },
  ],
  pattern: [],
};

describe('study plan', () => {
  it('takes weights from syllabus areas that state them', () => {
    expect(subjectsFrom(jnv9).map((s) => [s.name, s.weight])).toEqual([['English', 15], ['Mathematics', 35], ['Hindi', 15]]);
    expect(subjectsFrom({ syllabus: [{ area: 'Class VI Mathematics (50 questions)', topics: ['x'] }], pattern: [] })[0].name).toBe('Mathematics');
    expect(subjectsFrom({ syllabus: [{ area: 'Science and Social Science (20 each)', topics: ['x'] }], pattern: [] })[0].weight).toBe(40);
  });

  it('falls back to the pattern marks, summing repeated sections, and gives nothing when no marks are published', () => {
    const netarhat = {
      syllabus: [{ area: 'Level', topics: ['Class 5'] }],
      pattern: [
        { title: 'Paper 1', notes: [], sections: [{ name: 'Hindi', questions: 20, marks: 20, duration: null }, { name: 'Mathematics', questions: 20, marks: 20, duration: null }] },
        { title: 'Paper 2', notes: [], sections: [{ name: 'Hindi', questions: null, marks: 25, duration: null }] },
      ],
    };
    expect(subjectsFrom(netarhat)).toEqual([{ name: 'Hindi', weight: 45, topics: [] }, { name: 'Mathematics', weight: 20, topics: [] }]);
    expect(subjectsFrom({ syllabus: [{ area: 'Scheme', topics: ['As published'] }], pattern: [{ title: 'Stages', notes: [], sections: [{ name: 'Written', questions: null, marks: null, duration: null }] }] })).toEqual([]);
  });

  it('covers every day in learn → practice → revise order and schedules every topic once', () => {
    const subjects = subjectsFrom(jnv9);
    for (const days of [30, 60, 90]) {
      const plan = buildPlan(subjects, days, 90);
      expect(plan.weeks[0].fromDay).toBe(1);
      expect(plan.weeks[plan.weeks.length - 1].toDay).toBe(days);
      const phases = plan.weeks.map((w) => w.phase);
      expect(phases[0]).toBe('learn');
      expect(phases[phases.length - 1]).toBe('revise');
      expect([...phases].sort((a, b) => ['learn', 'practice', 'revise'].indexOf(a) - ['learn', 'practice', 'revise'].indexOf(b))).toEqual(phases);
      const scheduled = plan.weeks.flatMap((w) => w.focus.flatMap((f) => f.topics));
      expect(scheduled.sort()).toEqual(['A', 'B', 'C', 'H', 'M1', 'M2', 'M3', 'M4', 'M5', 'M6']);
    }
  });

  it('splits daily time by weight in 5-minute steps', () => {
    const plan = buildPlan(subjectsFrom(jnv9), 30, 65);
    expect(plan.daily).toEqual([{ subject: 'English', minutes: 15 }, { subject: 'Mathematics', minutes: 35 }, { subject: 'Hindi', minutes: 15 }]);
  });

  it('makes the daily split add up to the chosen time', () => {
    const subjects = [{ name: 'Maths', weight: 150, topics: [] }, { name: 'GK', weight: 50, topics: [] },
      { name: 'Language', weight: 50, topics: [] }, { name: 'Intelligence', weight: 50, topics: [] }];
    for (const m of [45, 60, 90, 120]) {
      expect(buildPlan(subjects, 30, m).daily.reduce((s, d) => s + d.minutes, 0)).toBe(m);
    }
    // Equal weights get equal time (give or take one 5-minute block), never one subject squeezed.
    const equal = ['A', 'B', 'C', 'D'].map((name) => ({ name, weight: 20, topics: [] }));
    const minutes = buildPlan(equal, 30, 90).daily.map((d) => d.minutes);
    expect(minutes.reduce((a, b) => a + b, 0)).toBe(90);
    expect(Math.max(...minutes) - Math.min(...minutes)).toBeLessThanOrEqual(5);
  });

  it('does not fail without subjects (exams that publish no syllabus)', () => {
    expect(buildPlan([], 60, 90).daily).toEqual([]);
  });

  it('still makes a sensible plan for a short time', () => {
    const plan = buildPlan(subjectsFrom(jnv9), 10, 60);
    expect(plan.weeks.map((w) => w.phase)).toEqual(['learn', 'revise']);
  });
});
