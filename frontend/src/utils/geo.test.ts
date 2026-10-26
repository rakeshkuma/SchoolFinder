import { describe, expect, it } from 'vitest';
import { formatDistance, haversineKm, parseIds } from './geo';

describe('haversineKm', () => {
  it('measures known city distances', () => {
    // Connaught Place, Delhi -> Gateway of India, Mumbai: about 1,150 km in a straight line.
    expect(haversineKm(28.6315, 77.2167, 18.922, 72.8347)).toBeGreaterThan(1130);
    expect(haversineKm(28.6315, 77.2167, 18.922, 72.8347)).toBeLessThan(1170);
    expect(haversineKm(12.97, 77.59, 12.97, 77.59)).toBe(0);
  });
});

describe('formatDistance', () => {
  it('uses metres below 1 km and fewer decimals further away', () => {
    expect(formatDistance(0.846)).toBe('850 m');
    expect(formatDistance(4.23)).toBe('4.2 km');
    expect(formatDistance(37.4)).toBe('37 km');
  });
});

describe('parseIds', () => {
  it('keeps valid, unique ids up to the limit', () => {
    expect(parseIds('7, 2,abc,-3,2,13483,11089,99', 4)).toEqual([7, 2, 13483, 11089]);
    expect(parseIds(null, 4)).toEqual([]);
    expect(parseIds('1.5,0', 4)).toEqual([]);
  });
});
