import { describe, expect, it } from 'vitest';
import type { DirectorySummary, RankingPlaces } from '../services/publicApi';
import { categoryDoors, listTitle, sizedPhoto, tiedRanks, topFrom } from './RankingsHome';

describe('rankings home helpers', () => {
  it('reads Top 10/20/100/All from the address and keeps Top 20 as the default', () => {
    expect(topFrom('10')).toBe('10');
    expect(topFrom('100')).toBe('100');
    expect(topFrom('all')).toBe('all');
    expect(topFrom(null)).toBe('20');
    expect(topFrom('50')).toBe('20'); // never an invented cut-off
  });

  it('names a list by publisher, year and its own name', () => {
    expect(listTitle({ publisherCode: 'IIRF', year: '2026', category: 'Top (10+2) Schools in India', name: 'x' }))
      .toBe('IIRF 2026 — Top (10+2) Schools in India');
    expect(listTitle({ publisherCode: 'EW', year: '2026-27', category: null, name: 'Government Boarding' })).toBe('EW 2026-27 — Government Boarding');
  });

  it('marks ranks shared by several schools, and only those', () => {
    const ties = tiedRanks([{ nationalRank: 1 }, { nationalRank: 5 }, { nationalRank: 5 }, { nationalRank: 6 }, { nationalRank: null }]);
    expect([...ties]).toEqual([5]);
  });

  it('asks Wikimedia Commons for a standard thumbnail width and leaves other addresses alone', () => {
    expect(sizedPhoto('https://upload.wikimedia.org/wikipedia/commons/5/51/Mayo_college_in_a_sunny_day.jpg', 500))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/5/51/Mayo_college_in_a_sunny_day.jpg/500px-Mayo_college_in_a_sunny_day.jpg');
    // A stored 640px thumbnail (a width Commons no longer serves) becomes a standard one.
    expect(sizedPhoto('https://thumb.wikimedia.org/wikipedia/commons/thumb/6/69/LawrenceChapel1.jpg/640px-LawrenceChapel1.jpg', 960))
      .toBe('https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/LawrenceChapel1.jpg/960px-LawrenceChapel1.jpg');
    expect(sizedPhoto('/images/schools/florence-public-school-mayur-vihar.webp', 500)).toBe('/images/schools/florence-public-school-mayur-vihar.webp');
    expect(sizedPhoto(null, 500)).toBeNull();
  });

  it('shows six doors first, labels directory views apart from published ranks, and hides empty ones', () => {
    const summary: DirectorySummary = {
      schools: 100, states: 19, cities: 42, boarding: 62, boards: 5, checkedOn: null,
      categories: [
        { slug: 'top-premier-schools', title: '', description: '', schools: 100 },
        { slug: 'boarding-schools', title: '', description: '', schools: 62 },
        { slug: 'boys-boarding-schools', title: '', description: '', schools: 11 },
        { slug: 'girls-boarding-schools', title: '', description: '', schools: 10 },
        { slug: 'cambridge-schools', title: '', description: '', schools: 0 },
        { slug: 'ib-schools', title: '', description: '', schools: 31 },
      ],
    };
    const places = { states: [{ code: 'DL', name: 'Delhi', slug: 'delhi', entries: 50 }], boards: [{ code: 'CBSE', entries: 90 }] } as unknown as RankingPlaces;
    const { first, more } = categoryDoors(summary, places);
    expect(first.map((d) => d.title)).toEqual(['Premier Schools of India', 'Boarding Schools', 'Boys’ Boarding Schools', 'Girls’ Boarding Schools',
      'State & City Rankings', 'Board-wise Rankings']);
    expect(first.filter((d) => d.kind === 'ranks').map((d) => d.to)).toEqual(['/rankings/states', '/rankings/boards']);
    expect(first[0].count).toBe('100 schools');
    expect(more.some((d) => d.to === '/rankings/cambridge-schools')).toBe(false); // nothing behind it
    expect(more.some((d) => d.to === '/rankings/ib-schools')).toBe(true);
    // No door calls an A-to-Z directory view a ranking.
    expect([...first, ...more].filter((d) => d.kind === 'directory').every((d) => !/rank/i.test(d.title))).toBe(true);
  });
});
