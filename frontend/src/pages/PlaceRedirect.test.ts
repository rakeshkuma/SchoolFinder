import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/publicApi', () => ({
  locationService: {
    states: async () => [{ code: 'BR', name: 'Bihar', slug: 'bihar' }, { code: 'UP', name: 'Uttar Pradesh', slug: 'uttar-pradesh' }, { code: 'DL', name: 'Delhi', slug: 'delhi' }],
    districts: async (state: string) => (state === 'DL' ? [] : state === 'BR' ? [{ name: 'Buxar', slug: 'buxar' }, { name: 'Rohtas', slug: 'rohtas' }] : [{ name: 'Prayagraj', slug: 'prayagraj' }]),
    cities: async (state: string) => (state === 'BR' ? [{ name: 'Ara', slug: 'ara' }, { name: 'Dinara', slug: 'dinara' }, { name: 'Buxar', slug: 'buxar' }] : []),
    localities: async (state: string) => (state === 'DL' ? ['Rohini', 'Mayur Vihar', 'Mayur Vihar Phase I', 'Mayur Vihar Phase III'] : []),
  },
}));

const { placeSlug, resolvePlace } = await import('./PlaceRedirect');

describe('short location addresses', () => {
  it('normalise spelling and known alternative names', () => {
    expect(placeSlug('Arrah')).toBe('ara');
    expect(placeSlug('Dhanoi')).toBe('dhansoi');
    expect(placeSlug('Mayur Vihar')).toBe('mayur-vihar');
  });

  it('go to the state, district or town page, preferring the district', async () => {
    expect(await resolvePlace('bihar')).toBe('/states/bihar');
    expect(await resolvePlace('bihar', 'buxar')).toBe('/states/bihar/buxar');
    expect(await resolvePlace('bihar', 'dinara')).toBe('/states/bihar/city/dinara');
    expect(await resolvePlace('bihar', 'arrah')).toBe('/states/bihar/city/ara');
    expect(await resolvePlace('uttar-pradesh', 'allahabad')).toBe('/states/uttar-pradesh/prayagraj');
  });

  it('filter by a single neighbourhood and search a name shared by several', async () => {
    expect(await resolvePlace('delhi', 'rohini')).toBe('/schools?state=DL&locality=Rohini');
    expect(await resolvePlace('delhi', 'mayur-vihar')).toBe('/schools?q=mayur+vihar&state=DL');
  });

  it('search for places without a page, and are not found for unknown states', async () => {
    expect(await resolvePlace('bihar', 'itarhi')).toBe('/schools?q=itarhi&state=BR');
    expect(await resolvePlace('atlantis')).toBeNull();
  });
});
