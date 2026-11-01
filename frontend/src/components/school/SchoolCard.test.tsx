import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { SchoolSummary } from '../../types/api';
import { SchoolCard, classRange } from './SchoolCard';

/** Test fixture; describes no real school. */
const school = (o: Partial<SchoolSummary> = {}): SchoolSummary => ({
  id: 5, name: 'Fixture Valley School', slug: 'fixture-valley-school', schoolType: 'PRIVATE', management: null, network: null,
  boardCode: 'CBSE', locality: null, city: 'Patna', districtName: 'Patna', stateCode: 'BR', stateName: 'Bihar',
  pinCode: null, hasHostel: null, logoUrl: null, coverImageUrl: null, coverImageCredit: null, averageRating: null,
  reviewCount: 0, latitude: null, longitude: null, distanceKm: null, verificationStatus: 'UNVERIFIED', lastVerifiedDate: null,
  annualFeeFrom: null, annualFeeYear: null, admissionStatus: null, genderType: null, websiteUrl: null, boardingType: null,
  residentialSystem: null, entranceExam: null, entryClasses: null, boardingSummary: null, boardingVerificationStatus: null,
  classesFrom: null, classesTo: null, facilityCategories: [], admissionPortalUrl: null, sourceRetrievedDate: null,
  coverImageIllustrative: false, ...o,
});

describe('classRange', () => {
  it('joins the lowest and highest class, or says nothing when unknown', () => {
    expect(classRange('Nursery', 'Class XII')).toBe('Nursery – Class XII');
    expect(classRange('Class XII', 'Class XII')).toBe('Class XII');
    expect(classRange(null, null)).toBeNull();
  });
});

describe('SchoolCard', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('states what is unknown and shows no photo or links it does not have', () => {
    view = render(<SchoolCard school={school()} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Not available'); // classes
    expect(text).toContain('not yet editor-verified');
    expect(text).not.toContain('Website');
    expect(text).not.toContain('Facilities');
    expect(view.container.querySelector('img')).toBeNull();
  });

  it('shows classes, facilities, verification and official links', () => {
    view = render(<SchoolCard school={school({
      classesFrom: 'Nursery', classesTo: 'Class XII', facilityCategories: ['LIBRARY', 'LABORATORY', 'SPORTS', 'COMPUTER'],
      verificationStatus: 'VERIFIED', lastVerifiedDate: '2026-10-01', websiteUrl: 'https://school.example.org',
      admissionPortalUrl: 'https://school.example.org/admissions',
      coverImageUrl: 'https://example.org/campus.jpg', coverImageCredit: 'Example / CC BY-SA 4.0',
    })} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Nursery – Class XII');
    expect(text).toContain('+1'); // fourth facility collapsed
    expect(text).toContain('Verified by an editor');
    expect(view.container.querySelector('a[href="https://school.example.org"]')?.getAttribute('rel')).toContain('noopener');
    expect(view.container.querySelector('a[href="https://school.example.org/admissions"]')).not.toBeNull();
    expect(view.container.querySelector('img')?.getAttribute('loading')).toBe('lazy');
    // The credit is not drawn over the photo; it is the image's tooltip (and shown in full on the profile).
    expect(text).not.toContain('Example / CC BY-SA 4.0');
    expect(view.container.querySelector('img')?.getAttribute('title')).toBe('Photo: Example / CC BY-SA 4.0');
  });

  it('labels an illustration without a copyright mark', () => {
    view = render(<SchoolCard school={school({
      coverImageUrl: 'https://example.org/illustration.svg', coverImageIllustrative: true,
      coverImageCredit: 'Illustration, not a photo of this school',
    })} />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Illustration, not a photo of this school');
    expect(text).not.toContain('©');
  });
});
