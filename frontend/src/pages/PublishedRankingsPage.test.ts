import { describe, expect, it } from 'vitest';
import type { ExternalRanking, ExternalRankingListItem, SchoolRankingDetail } from '../types/api';
import { groupByList, listTitle } from './PublishedRankingsPage';
import { rankingRows } from './RankingComparePage';

const entry = (over: Partial<ExternalRanking>): ExternalRanking => ({
  id: 1, publisher: 'EducationWorld', rankingName: 'India School Rankings', rankingYear: '2025-26', category: 'Day schools',
  rankPosition: 1, scoreText: null, sourceUrl: 'https://example.org', retrievedDate: '2026-10-01', verificationStatus: 'VERIFIED',
  publisherCode: 'EDUCATIONWORLD', scope: 'NATIONAL', region: null, sponsored: false, notes: null, lastVerifiedDate: '2026-10-02',
  ...over,
});
const item = (e: ExternalRanking, schoolId: number): ExternalRankingListItem => ({
  entry: e, schoolId, schoolName: `School ${schoolId}`, schoolSlug: `school-${schoolId}`, city: null, stateCode: null,
});

describe('published rankings', () => {
  it('names a list by publisher, edition, category and region', () => {
    expect(listTitle(entry({ scope: 'STATE', region: 'Delhi' }))).toBe('EducationWorld · India School Rankings 2025-26 · Day schools · Delhi');
  });

  it('keeps entries of one list together, in the order received', () => {
    const groups = groupByList([
      item(entry({ id: 1, rankPosition: 1 }), 1),
      item(entry({ id: 2, rankPosition: 2 }), 2),
      item(entry({ id: 3, category: 'Boarding schools' }), 3),
    ]);
    expect(groups.map((g) => g.items.length)).toEqual([2, 1]);
  });

  it('compares schools on each list any of them appears in, leaving sponsored listings out', () => {
    const detail = (schoolId: number, externalRankings: ExternalRanking[]): SchoolRankingDetail =>
      ({ schoolId, status: 'NOT_YET_RANKED', siteRanking: null, externalRankings, disclaimer: '' }) as SchoolRankingDetail;
    const rows = rankingRows([
      detail(1, [entry({})]),
      detail(2, [entry({ category: 'Boarding schools' }), entry({ publisher: 'Paid Guide', sponsored: true, rankPosition: null })]),
    ]);
    expect(rows).toHaveLength(2);
    expect(rows.some((r) => r.includes('Paid Guide'))).toBe(false);
  });
});
