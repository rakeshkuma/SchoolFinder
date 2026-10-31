import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { click, render, type Rendered } from '../../test/render';
import type { CriterionContribution, SchoolRanking, SchoolSummary } from '../../types/api';
import { RankingCard } from './RankingCard';

const criterion = (code: string, score: number | null, verified: boolean | null): CriterionContribution => ({
  criterionCode: code, criterionName: code === 'INFRASTRUCTURE' ? 'Infrastructure' : 'Academic performance', weight: 15,
  normalizedScore: score, contribution: null, dataAvailable: score !== null, sourceUrl: 'https://example.org',
  verified, evidenceType: verified ? 'VERIFIED_SCORE' : 'DOCUMENTED_FACILITIES', evidenceNote: null,
});

/** Test fixture; describes no real school. */
function ranking(overrides: Partial<SchoolRanking> = {}): SchoolRanking {
  return {
    schoolId: 7, schoolName: 'Fixture Public School', slug: 'fixture-public-school', locality: 'Sector 1', city: 'Patna',
    districtName: 'Patna', stateCode: 'BR', stateName: 'Bihar', boardCode: 'CBSE', schoolType: 'PRIVATE',
    academicYear: '2026-27', totalScore: 62.5, rankPosition: null, scopePosition: null, status: 'PROVISIONAL',
    provisional: true, coveragePercent: 20, verifiedCoveragePercent: 0,
    breakdown: [criterion('INFRASTRUCTURE', 66.67, false), criterion('ACADEMIC_PERFORMANCE', null, null)],
    methodologyVersion: '2.0', calculatedAt: '2026-10-25T00:00:00Z', card: null, lowestClass: null, highestClass: null,
    ...overrides,
  };
}

const card = (overrides: Partial<SchoolSummary>): SchoolSummary => ({
  id: 7, name: 'Fixture Public School', slug: 'fixture-public-school', schoolType: 'PRIVATE', management: null, network: null,
  boardCode: 'CBSE', locality: null, city: null, districtName: null, stateCode: 'BR', stateName: null, pinCode: null,
  hasHostel: null, logoUrl: null, coverImageUrl: null, coverImageCredit: null, averageRating: null, reviewCount: 0,
  latitude: null, longitude: null, distanceKm: null, verificationStatus: 'UNVERIFIED', lastVerifiedDate: null,
  annualFeeFrom: null, annualFeeYear: null, admissionStatus: null, genderType: null, websiteUrl: null, boardingType: null,
  residentialSystem: null, entranceExam: null, entryClasses: null, boardingSummary: null, boardingVerificationStatus: null,
  classesFrom: null, classesTo: null, facilityCategories: [], admissionPortalUrl: null, sourceRetrievedDate: null,
  coverImageIllustrative: false, ...overrides,
});

describe('RankingCard', () => {
  let view: Rendered | undefined;
  beforeEach(() => localStorage.clear());
  afterEach(() => view?.unmount());

  it('shows a provisional result without a position and never fills in missing facts', () => {
    view = render(<RankingCard r={ranking()} showIndiaRank />);
    const text = view.container.textContent ?? '';
    expect(text).toContain('Provisional');
    expect(text).not.toMatch(/#\d/);
    // Status is announced to screen readers, not only shown on the (aria-hidden) photo.
    expect(view.container.querySelector('h3 .sr-only')?.textContent).toBe('Provisional, no rank: ');
    expect(text).toContain('62.5');
    expect(text).toContain('20% evidence · 0% verified');
    // Classes and fee are unpublished: labelled, not estimated.
    expect(text.match(/Not published/g)).toHaveLength(2);
    // No cleared photo: generated cover, no <img>.
    expect(view.container.querySelector('img')).toBeNull();
    // Unverified criterion is marked; criteria without evidence are not shown as strengths.
    expect(view.container.querySelector('[aria-label="documented, not verified"]')).not.toBeNull();
    expect(text).not.toContain('Academic performance');
  });

  it('shows rank, India position, photo, classes, official fee and admission status for a ranked school', () => {
    view = render(
      <RankingCard
        showIndiaRank
        r={ranking({
          status: 'RANKED', provisional: false, scopePosition: 3, rankPosition: 41, coveragePercent: 85, verifiedCoveragePercent: 75,
          breakdown: [criterion('ACADEMIC_PERFORMANCE', 90, true)], lowestClass: 'Nursery', highestClass: 'Class XII',
          card: card({ coverImageUrl: 'https://example.org/photo.jpg', coverImageCredit: 'Example credit',
            annualFeeFrom: 113640, annualFeeYear: '2026-27', admissionStatus: 'OPEN' }),
        })}
      />,
    );
    const text = view.container.textContent ?? '';
    expect(text).toContain('#3');
    expect(text).toContain('#41 in India');
    expect(text).not.toContain('Provisional');
    expect(text).toContain('Nursery – Class XII');
    expect(text).toContain('2026-27');
    expect(text).not.toContain('Not published');
    expect(text).toContain('Admissions open');
    expect(view.container.querySelector('img')?.getAttribute('src')).toBe('https://example.org/photo.jpg');
    expect(text).not.toContain('Example credit'); // no credit over the photo
    expect(view.container.querySelector('img')?.getAttribute('title')).toBe('Photo: Example credit');
    expect(view.container.querySelector('[aria-label="documented, not verified"]')).toBeNull();
  });

  it('hides the India position outside a state view and links to the score breakdown', () => {
    view = render(<RankingCard showIndiaRank={false} r={ranking({ status: 'RANKED', provisional: false, scopePosition: 2, rankPosition: 2 })} />);
    expect(view.container.textContent).not.toContain('in India');
    const link = view.container.querySelector('a[href="/schools/fixture-public-school?tab=ranking"]');
    expect(link).not.toBeNull();
  });

  it('adds the school to the comparison and remembers it', () => {
    view = render(<RankingCard r={ranking()} showIndiaRank={false} />);
    const button = view.container.querySelector('button[aria-pressed]');
    expect(button?.getAttribute('aria-pressed')).toBe('false');
    click(button);
    expect(button?.getAttribute('aria-pressed')).toBe('true');
    expect(JSON.parse(localStorage.getItem('dsf.compare') ?? '[]')).toEqual([
      { id: 7, name: 'Fixture Public School', slug: 'fixture-public-school' },
    ]);
  });
});
