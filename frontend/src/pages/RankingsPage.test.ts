import { describe, expect, it } from 'vitest';
import { CATEGORIES, fromRankingQuery, toRankingQuery } from './RankingsPage';

describe('rankings URL state', () => {
  it('reads defaults from an empty query and writes none back', () => {
    const p = fromRankingQuery(new URLSearchParams());
    expect(p).toMatchObject({ includeProvisional: true, size: 20, page: 0 });
    expect(toRankingQuery(p).toString()).toBe('');
  });

  it('round-trips a scoped, filtered view', () => {
    const q = 'state=UP&city=Lucknow&board=CBSE&boarding=true&provisional=false&size=100';
    const p = fromRankingQuery(new URLSearchParams(q));
    expect(p).toMatchObject({ state: 'UP', city: 'Lucknow', board: 'CBSE', boarding: true, includeProvisional: false, size: 100 });
    expect(toRankingQuery(p).toString()).toBe('state=UP&city=Lucknow&board=CBSE&boarding=true&provisional=false&size=100');
  });

  it('ignores a size that is not a Top-N option', () => {
    expect(fromRankingQuery(new URLSearchParams('size=5000')).size).toBe(20);
  });

  it('offers the categories parents ask for', () => {
    expect(CATEGORIES.map((c) => c.label)).toEqual(['All schools', 'Boarding', 'Government', 'Private', 'CBSE', 'ICSE / ISC']);
  });
});
