import { describe, expect, it } from 'vitest';
import { BOARDING_LANDINGS, boardingLanding } from '../content/boardingLandings';
import type { BoardingStats } from '../types/api';
import { landingCount, landingSearch } from './BoardingLandingPage';

const stats: BoardingStats = { total: 662, byState: { DL: 3 }, byGender: { BOYS: 10, CO_ED: 650 }, genderNotStated: 0, bySystem: {} };

describe('boarding landing pages', () => {
  it('have unique slugs that do not clash with boarding school profiles', () => {
    const slugs = BOARDING_LANDINGS.map((l) => l.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(slugs).toEqual(['india', 'government', 'private', 'boys', 'girls', 'co-ed', 'affordable']);
  });

  it('always search boarding schools and keep the reader\'s state and page', () => {
    const girls = landingSearch(boardingLanding('girls')!, new URLSearchParams('state=UK&page=2'));
    expect(girls).toMatchObject({ boarding: true, genderType: 'GIRLS', state: 'UK', page: 1, sortBy: 'name' });
    expect(landingSearch(boardingLanding('affordable')!, new URLSearchParams('sort=fee'))).toMatchObject({ maxAnnualFee: 150000, sortBy: 'fee' });
    expect(landingSearch(boardingLanding('government')!, new URLSearchParams()).residentialSystem).toContain('NAVODAYA');
  });

  it('count only what the counts endpoint knows', () => {
    expect(landingCount(boardingLanding('india')!, stats)).toBe(662);
    expect(landingCount(boardingLanding('girls')!, stats)).toBe(0);
    expect(landingCount(boardingLanding('government')!, stats)).toBeUndefined();
    expect(landingCount(boardingLanding('boys')!, null)).toBeUndefined();
  });
});
