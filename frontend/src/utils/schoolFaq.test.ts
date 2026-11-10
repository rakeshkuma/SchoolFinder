import { describe, expect, it } from 'vitest';
import type { SchoolDetail } from '../types/api';
import { schoolFaqs } from './schoolFaq';

const base = {
  id: 1, name: 'Test School', slug: 'test-school', description: null, schoolType: 'GOVERNMENT', management: null, network: null,
  board: null, affiliationNumber: null, udiseCode: null, principalName: null, managingBody: null, genderType: null,
  mediumOfInstruction: null, classesOffered: [], websiteUrl: null, admissionPortalUrl: null, phone: null, email: null,
  addressLine: null, locality: null, city: null, district: null, stateCode: 'BR', stateName: null, stateSlug: null, pinCode: null,
  latitude: null, longitude: null, studentTeacherRatio: null, schoolTimings: null, establishedYear: null, hasTransport: null,
  hasHostel: null, accessibilityFeatures: null, logoUrl: null, averageRating: null, reviewCount: 0, sourceUrl: 'https://example.org',
  sourceRetrievedDate: null, verificationStatus: 'PENDING', lastVerifiedDate: null, active: true, version: 0, updatedAt: '2026-11-10',
  boarding: null,
} as unknown as SchoolDetail;

describe('schoolFaqs', () => {
  it('asks nothing when the record publishes nothing', () => {
    expect(schoolFaqs(base)).toEqual([]);
  });

  it('answers only from published facts', () => {
    const faqs = schoolFaqs({
      ...base,
      board: { code: 'CBSE', name: 'Central Board of Secondary Education' },
      affiliationNumber: '330123',
      classesOffered: [{ name: 'Class VI' }, { name: 'Class XII' }],
      city: 'Buxar', district: { name: 'Buxar', slug: 'buxar' }, stateName: 'Bihar', pinCode: '802101',
      management: 'CENTRAL_GOVERNMENT', genderType: 'CO_ED', mediumOfInstruction: 'Hindi',
      hasHostel: true, phone: '06183-222222',
    } as unknown as SchoolDetail);
    const text = faqs.map((f) => `${f.question} ${f.answer}`).join('\n');
    expect(text).toContain('Central Board of Secondary Education (affiliation number 330123)');
    expect(text).toContain('classes from Class VI to Class XII');
    expect(text).toContain('Buxar, Buxar district, Bihar, PIN 802101.');
    expect(text).toContain('listed as a central government school, co-educational, teaching in Hindi.');
    expect(text).toContain('boarding (hostel) is available');
    expect(text).toContain('phone 06183-222222');
    // No admission question without a portal or website, and fees are never answered here.
    expect(text).not.toMatch(/apply|fee/i);
  });

  it('says a day school is a day school', () => {
    const [faq] = schoolFaqs({ ...base, hasHostel: false });
    expect(faq.answer).toBe('No. Its source lists it as a day school.');
  });
});
