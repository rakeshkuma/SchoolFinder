import { describe, expect, it } from 'vitest';
import type { RankingEdition, RankingRow } from '../services/publicApi';
import { boardTabs, pickList, rankText, shownRanks } from './RankingHubPage';

const edition = (id: number, o: Partial<RankingEdition>): RankingEdition => ({
  id, publisherCode: 'X', publisher: 'X', kind: 'SURVEY', name: 'List', year: '2026', categoryCode: null, category: null, family: null, boardCode: null,
  scope: 'NATIONAL', region: null, ratingBased: false, hasScores: false, maxScore: null, methodology: null, sourceUrl: 'https://example.org',
  publishedOn: null, collectedOn: '2026-10-30', lastVerified: null, entries: 1, parameters: [], ...o,
});
const row = (o: Partial<RankingRow>) => ({ nationalRank: null, stateRank: null, cityRank: null, ...o }) as RankingRow;

describe('which published list a page shows', () => {
  const a26 = edition(1, { publisherCode: 'A' });
  const b26 = edition(2, { publisherCode: 'B' });
  const a25 = edition(3, { publisherCode: 'A', year: '2025' });

  it('opens on the newest year and its first publisher', () => {
    const p = pickList([a26, b26, a25], {});
    expect(p.list?.id).toBe(1);
    expect(p.years).toEqual(['2026', '2025']);
    expect(p.sources).toEqual(['A', 'B']);
  });

  it('always returns one list, so publishers and years never blend', () => {
    expect(pickList([a26, b26, a25], { year: '2025' }).list?.id).toBe(3);
    expect(pickList([a26, b26, a25], { source: 'B' }).list?.id).toBe(2);
    expect(pickList([a26, b26, a25], { year: '2025', source: 'B' }).list?.id).toBe(3);
  });

  it('ignores a year or publisher that has no list', () => {
    expect(pickList([a26], { year: '1999', source: 'Z' }).list?.id).toBe(1);
    expect(pickList([], {}).list).toBeUndefined();
  });
});

describe('boards', () => {
  it('shows a board only with data, and names the others once', () => {
    const { available, missing } = boardTabs([], [{ code: 'CBSE' }, { code: 'CISCE' }]);
    expect(available.map(([c]) => c)).toEqual(['CBSE', 'CISCE']);
    expect(missing).toEqual(['IB', 'Cambridge / IGCSE', 'State Boards']);
  });

  it('counts a list a publisher made for that board', () => {
    expect(boardTabs([edition(4, { boardCode: 'IB' })], []).available.map(([c]) => c)).toEqual(['IB']);
  });
});

describe('ranks', () => {
  it('never fills in a rank', () => {
    expect(rankText(null)).toBe('–');
    expect(rankText(4)).toBe('#4');
  });

  it('shows a column only for ranks the publisher printed, and keeps them apart', () => {
    expect(shownRanks([row({ nationalRank: 3, stateRank: 1 })], ['state', 'city', 'national'])).toEqual(['state', 'national']);
    expect(shownRanks([row({})], ['state', 'city', 'national'])).toEqual(['national']);
  });
});
