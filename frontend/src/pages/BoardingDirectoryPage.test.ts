import { describe, expect, it } from 'vitest';
import { boardingSearchParams } from './BoardingDirectoryPage';

describe('boardingSearchParams', () => {
  it('always limits the directory to boarding schools and maps system groups to the systems they cover', () => {
    const p = boardingSearchParams(new URLSearchParams('system=defence&state=UK&page=3&maxFee=150000&sort=fee'));
    expect(p.boarding).toBe(true);
    expect(p.residentialSystem).toBe('SAINIK,MILITARY_SCHOOL,MILITARY_COLLEGE');
    expect(p.state).toBe('UK');
    expect(p.page).toBe(2); // URL pages are 1-based
    expect(p.maxAnnualFee).toBe(150000);
    expect(p.sortBy).toBe('fee');
  });

  it('passes a single system through and ignores malformed numbers and sorts', () => {
    const p = boardingSearchParams(new URLSearchParams('system=NAVODAYA&maxFee=lots&page=-4&sort=hacker'));
    expect(p.residentialSystem).toBe('NAVODAYA');
    expect(p.maxAnnualFee).toBeUndefined();
    expect(p.page).toBe(0);
    expect(p.sortBy).toBe('name');
  });
});
