import { describe, expect, it } from 'vitest';
import type { DirectorySchool } from '../services/publicApi';
import { describe as describeSchool, feeEstimate, inr, profileLink } from './RankingDirectory';

const school = (o: Partial<DirectorySchool>): DirectorySchool => ({
  id: 1, key: 'k', name: 'The Doon School', city: 'Dehradun', stateCode: 'UK', stateName: 'Uttarakhand', section: 'BOYS_RESIDENTIAL',
  boards: [{ code: 'CISCE', confirmed: true }, { code: 'IB', confirmed: false }], curriculumNote: null, gender: 'BOYS', genderConfirmed: true,
  residence: 'BOARDING', residenceConfirmed: true, classesLabel: 'Classes 7 to 12', classesConfirmed: false, feeMinInr: 1450000, feeMaxInr: 1700000,
  feeText: null, websiteUrl: 'https://doonschool.com/', websiteChecked: true, schoolId: 9, slug: 'the-doon-school', campusSearch: null, imageUrl: null,
  imageCredit: null, featured: false, sponsored: false, note: null, checkedOn: '2026-11-11', rank: null, ...o,
});

describe('directory fees', () => {
  it('writes lakh and thousand amounts the Indian way', () => {
    expect(inr(1450000)).toBe('₹14.5 lakh');
    expect(inr(80000)).toBe('₹80,000');
  });

  it('gives a yearly range, or the directory’s own words when there is no range', () => {
    expect(feeEstimate(school({}))).toBe('₹14.5–17 lakh a year');
    expect(feeEstimate(school({ feeMinInr: 80000, feeMaxInr: 140000 }))).toBe('₹80,000–₹1.4 lakh a year');
    expect(feeEstimate(school({ feeMinInr: null, feeMaxInr: null, feeText: 'Nominal (government-aided)' }))).toBe('Nominal (government-aided)');
  });
});

describe('directory cards', () => {
  it('describes a school in one sentence from its listed facts', () => {
    expect(describeSchool(school({}))).toBe('Boys’ boarding school in Dehradun, Uttarakhand, teaching ICSE / ISC and IB.');
    expect(describeSchool(school({ gender: null, residence: null, boards: [] }))).toBe('School in Dehradun, Uttarakhand.');
  });

  it('opens the profile, or a search for the campuses when several share the name', () => {
    expect(profileLink(school({}))).toBe('/schools/the-doon-school');
    expect(profileLink(school({ slug: null, campusSearch: 'City Montessori School' }))).toBe('/schools?q=City%20Montessori%20School');
    expect(profileLink(school({ slug: null }))).toBeNull();
  });
});
