import { describe, expect, it } from 'vitest';
import { activeRequirements, readCriteria, relax, toParams, writeCriteria } from './finder';

const q = (s: string) => new URLSearchParams(s);

describe('readCriteria', () => {
  it('reads a shared search', () => {
    const c = readCriteria(q('lat=28.6315&lon=77.2167&r=5&cls=VI&board=CBSE&budget=100-250&gender=GIRLS&mode=day&fac=LIBRARY,SPORTS&open=1'));
    expect(c).toEqual({
      lat: 28.6315, lon: 77.2167, r: 5, state: undefined, district: undefined, cls: 'VI', board: 'CBSE', budget: '100-250',
      gender: 'GIRLS', mode: 'day', fac: ['LIBRARY', 'SPORTS'], open: true,
    });
  });

  it('ignores malformed or unknown values instead of guessing', () => {
    const c = readCriteria(q('lat=&lon=abc&r=x&budget=toString&gender=ANY&mode=hostel&fac=LIBRARY,POOL,constructor&open=yes'));
    expect(c.lat).toBeUndefined(); // an empty value must not become 0 (a point off the coast of Africa)
    expect(c.lon).toBeUndefined();
    expect(c.r).toBe(10);
    expect(c.budget).toBeUndefined(); // inherited object keys are not budgets
    expect(c.gender).toBeUndefined();
    expect(c.mode).toBeUndefined();
    expect(c.fac).toEqual(['LIBRARY']);
    expect(c.open).toBe(false);
  });
});

describe('writeCriteria', () => {
  it('round-trips, and a location replaces the state', () => {
    const c = readCriteria(q('lat=28.63151&lon=77.21669&r=10&state=DL&cls=VI&fac=LIBRARY'));
    const written = writeCriteria(c).toString();
    expect(written).toBe('lat=28.6315&lon=77.2167&r=10&cls=VI&fac=LIBRARY');
    expect(readCriteria(q(written)).cls).toBe('VI');
    expect(writeCriteria(readCriteria(q('state=BR&district=patna'))).toString()).toBe('state=BR&district=patna');
  });
});

describe('toParams', () => {
  const c = readCriteria(q('lat=28.6&lon=77.2&r=5&cls=VI&board=CBSE&budget=u25&mode=boarding&fac=LIBRARY,SPORTS&open=1'));

  it('maps every requirement to a directory filter, sorted by distance near a location', () => {
    expect(toParams(c)).toEqual({
      latitude: 28.6, longitude: 77.2, radiusKm: 5, sortBy: 'distance', className: 'VI', board: 'CBSE',
      minAnnualFee: undefined, maxAnnualFee: 25000, hasHostel: true, facility: 'LIBRARY,SPORTS', admissionStatus: 'OPEN', size: 12,
    });
  });

  it('can leave requirements out (for near misses and the "check with the school" list)', () => {
    const p = toParams(c, ['budget', 'fac', 'open'], 1);
    expect(p).not.toHaveProperty('maxAnnualFee');
    expect(p).not.toHaveProperty('facility');
    expect(p).not.toHaveProperty('admissionStatus');
    expect(p.className).toBe('VI');
    expect(p.size).toBe(1);
  });

  it('uses the state and district when there is no location', () => {
    expect(toParams(readCriteria(q('state=BR&district=patna')))).toEqual({ state: 'BR', district: 'patna', size: 12 });
  });
});

describe('activeRequirements and relax', () => {
  it('lists what was asked and removes one requirement at a time', () => {
    const c = readCriteria(q('state=DL&cls=VI&fac=LIBRARY&open=1'));
    expect(activeRequirements(c)).toEqual(['cls', 'fac', 'open']);
    expect(activeRequirements(relax(c, 'fac'))).toEqual(['cls', 'open']);
    expect(relax(c, 'open').open).toBe(false);
    expect(relax(c, 'cls').cls).toBeUndefined();
    expect(relax(c, 'cls').state).toBe('DL');
  });
});
