import { describe, expect, it } from 'vitest';
import type { Achievement } from '../../services/accountApi';
import { badgeOrder, lastDays, periodLabel } from './ProgressReport';

const badge = (code: string, current: number, target: number, earnedAt: string | null = null): Achievement =>
  ({ code, title: code, description: '', group: 'Practice', earnedAt, current, target });

describe('progress report helpers', () => {
  it('lists the days up to today across a month end', () => {
    expect(lastDays(3, new Date(2026, 10, 1))).toEqual(['2026-10-30', '2026-10-31', '2026-11-01']);
  });

  it('labels weeks by date and months by name', () => {
    expect(periodLabel('2026-10-05', false)).toContain('Oct');
    expect(periodLabel('2026-10-05', false)).toContain('5');
    expect(periodLabel('2026-10-01', true)).toBe('Oct');
  });

  it('puts earned badges first, then the nearest', () => {
    const order = badgeOrder([badge('rank', 0, 0), badge('far', 1, 50), badge('near', 8, 10), badge('won', 1, 1, '2026-10-01T00:00:00Z')]);
    expect(order.map((b) => b.code)).toEqual(['won', 'near', 'far', 'rank']);
  });
});
