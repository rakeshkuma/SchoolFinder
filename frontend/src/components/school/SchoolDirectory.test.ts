import { describe, expect, it } from 'vitest';
import { filterChips } from './SchoolDirectory';

describe('filterChips', () => {
  it('lists nothing when no filter is set', () => {
    expect(filterChips({ page: 2, size: 24, sortBy: 'name' })).toEqual([]);
  });

  it('gives each facility its own chip and merges fee bounds into one', () => {
    const chips = filterChips({ board: 'CISCE', facility: 'LIBRARY,SPORTS', minAnnualFee: 25000, maxAnnualFee: 100000, hasHostel: false });
    expect(chips.map((c) => c.id)).toEqual(['board', 'hasHostel', 'facility-LIBRARY', 'facility-SPORTS', 'fee']);
    expect(chips.find((c) => c.id === 'board')?.label).toBe('ICSE / ISC');
    expect(chips.find((c) => c.id === 'hasHostel')?.label).toBe('Day school');
    expect(chips.find((c) => c.id === 'fee')?.clear).toEqual(['minAnnualFee', 'maxAnnualFee']);
  });

  it('describes a one-sided fee range and a map search', () => {
    const chips = filterChips({ maxAnnualFee: 50000, latitude: 28.6, longitude: 77.2, radiusKm: 5 });
    expect(chips.find((c) => c.id === 'fee')?.label).toMatch(/^Fee up to /);
    expect(chips.find((c) => c.id === 'near')).toMatchObject({ label: 'Within 5 km of a location', clear: ['latitude', 'longitude', 'radiusKm'] });
  });
});
