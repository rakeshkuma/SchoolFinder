import { describe, expect, it, vi } from 'vitest';
import { scoringLine } from '../ChallengePages';
import { drawQuestions, toLocalInput, toSlug } from './AdminChallengesPage';

vi.mock('../../services/publicApi', () => ({ practiceService: {}, locationService: {}, examService: {} }));

describe('challenge helpers', () => {
  it('makes an address from a title', () => {
    expect(toSlug('JNVST Weekly: Arithmetic!')).toBe('jnvst-weekly-arithmetic');
  });

  it('draws only questions not already chosen, and no more than asked', () => {
    const drawn = drawQuestions(['a', 'b', 'c', 'd'], ['b'], 2, () => 0);
    expect(drawn).toHaveLength(2);
    expect(drawn).not.toContain('b');
    expect(drawQuestions(['a'], ['a'], 5)).toEqual([]);
  });

  it('round-trips an instant through the date input', () => {
    const iso = '2026-11-01T04:30:00.000Z';
    expect(new Date(toLocalInput(iso)).toISOString()).toBe(iso);
  });

  it('states the scoring plainly', () => {
    expect(scoringLine({ pointsPerCorrect: 1, completionBonus: 0 })).toBe('1 point for each correct answer. Wrong and unanswered questions score nothing.');
    expect(scoringLine({ pointsPerCorrect: 20, completionBonus: 5 })).toContain('plus a finishing bonus of 5 points');
  });
});
