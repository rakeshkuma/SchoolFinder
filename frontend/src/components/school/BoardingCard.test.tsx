import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { SchoolSummary } from '../../types/api';
import { BoardingCard } from './BoardingCard';

/** Test fixture; describes no real school. */
const school = (o: Partial<SchoolSummary> = {}): SchoolSummary => ({
  id: 3, name: 'Fixture Hill School', slug: 'fixture-hill-school', schoolType: 'PRIVATE', management: null, network: null,
  boardCode: 'CISCE', locality: null, city: 'Nainital', districtName: 'Nainital', stateCode: 'UK', stateName: 'Uttarakhand',
  pinCode: null, hasHostel: true, logoUrl: null, coverImageUrl: null, coverImageCredit: null, averageRating: null,
  reviewCount: 0, latitude: null, longitude: null, distanceKm: null, verificationStatus: 'UNVERIFIED', lastVerifiedDate: null,
  annualFeeFrom: null, annualFeeYear: null, admissionStatus: null, genderType: 'CO_ED', websiteUrl: null, boardingType: null,
  residentialSystem: 'PRIVATE_BOARDING', entranceExam: 'SCHOOL_TEST', entryClasses: null,
  boardingSummary: 'Fixture summary.', boardingVerificationStatus: 'UNVERIFIED', classesFrom: null, classesTo: null,
  facilityCategories: [], admissionPortalUrl: null, sourceRetrievedDate: null, coverImageIllustrative: false, ...o,
});

describe('BoardingCard', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('labels unstated facts instead of guessing them', () => {
    view = render(<BoardingCard school={school()} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Boarding (arrangement not stated)');
    expect(text.match(/Not published/g)).toHaveLength(2); // entry classes and fee
    expect(text).toContain('ICSE/ISC');
    expect(text).toContain('Co-educational');
    expect(text).toContain("School's own test");
    expect(view.container.querySelector('img')).toBeNull();
    expect(text).not.toContain('Official website');
    expect(text).not.toContain('Verified profile');
  });

  it('shows sourced facts, the exam guide and the official website', () => {
    view = render(<BoardingCard school={school({
      boardingType: 'FULL_BOARDING', residentialSystem: 'SAINIK', entranceExam: 'AISSEE', entryClasses: 'VI and IX',
      annualFeeFrom: 192660, annualFeeYear: '2026-27', websiteUrl: 'https://school.example.org',
      coverImageUrl: 'https://example.org/campus.jpg', coverImageCredit: 'Example / CC BY-SA 4.0',
      boardingVerificationStatus: 'VERIFIED', admissionStatus: 'OPEN',
    })} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Full boarding');
    expect(text).toContain('Sainik School');
    expect(text).toContain('VI and IX');
    expect(text).toContain('2026-27');
    expect(text).toContain('Admissions open');
    expect(text).toContain('Verified profile');
    expect(view.container.querySelector('a[href="/exams/aissee"]')).not.toBeNull();
    const site = view.container.querySelector('a[href="https://school.example.org"]');
    expect(site?.getAttribute('rel')).toContain('noopener');
    expect(view.container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
  });
});
