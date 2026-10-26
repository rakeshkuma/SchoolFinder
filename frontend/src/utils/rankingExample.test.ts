import { describe, expect, it } from 'vitest';
import type { RankingCriterion } from '../types/api';
import { scoreExample, type ExampleEvidence } from './rankingExample';

const c = (code: string, weight: number, displayOrder: number, active = true): RankingCriterion =>
  ({ id: displayOrder, code, name: code, description: '', weight, displayOrder, active });

const CRITERIA = [
  c('ACADEMIC_PERFORMANCE', 25, 1), c('TEACHING_QUALITY', 20, 2), c('INFRASTRUCTURE', 15, 3), c('SAFETY_WELLBEING', 15, 4),
  c('SPORTS_EXTRACURRICULAR', 10, 5), c('PARENT_FEEDBACK', 10, 6), c('ACCESSIBILITY_TRANSPORT', 5, 7),
];

const e = (code: string, score: number | null, verified: boolean): ExampleEvidence => ({ code, score, verified, basis: '' });

describe('scoreExample', () => {
  it('matches the server formula: re-weighted score, evidence share and verified share', () => {
    const r = scoreExample(CRITERIA, [
      e('ACADEMIC_PERFORMANCE', 80, true), e('SAFETY_WELLBEING', 60, true),
      e('TEACHING_QUALITY', 75, false), e('INFRASTRUCTURE', 100, false),
    ], 70);
    // Same case as RankingEngineTest: (25×80 + 15×60 + 20×75 + 15×100) / 75 = 78.67
    expect(r.score).toBe(78.67);
    expect(r.coveragePercent).toBe(75);
    expect(r.verifiedCoveragePercent).toBe(40);
    expect(r.status).toBe('PROVISIONAL');
    expect(r.rows.find((x) => x.code === 'SPORTS_EXTRACURRICULAR')?.contribution).toBeNull();
  });

  it('is definitive at exactly the minimum verified share and unscored without evidence', () => {
    const at70 = scoreExample(CRITERIA, [
      e('ACADEMIC_PERFORMANCE', 50, true), e('TEACHING_QUALITY', 50, true),
      e('INFRASTRUCTURE', 50, true), e('SPORTS_EXTRACURRICULAR', 50, true),
    ], 70);
    expect(at70.status).toBe('RANKED');
    const none = scoreExample(CRITERIA, [], 70);
    expect(none.status).toBe('NOT_YET_RANKED');
    expect(none.score).toBeNull();
  });

  it('ignores inactive criteria', () => {
    const r = scoreExample([...CRITERIA.slice(0, 6), c('ACCESSIBILITY_TRANSPORT', 5, 7, false)],
      [e('ACCESSIBILITY_TRANSPORT', 100, true)], 70);
    expect(r.status).toBe('NOT_YET_RANKED');
  });
});
