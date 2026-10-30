import { describe, expect, it } from 'vitest';
import type { Admission, ExternalRanking, Facility, SchoolDetail, SchoolRankingDetail } from '../types/api';
import { ACADEMIC_FACILITIES, admissionProcess, dayOrBoarding, facilityNames, hostelDetails, publishedPositions } from './compare';

const school = (over: Partial<SchoolDetail>): SchoolDetail => ({ boarding: null, hasHostel: null, ...over }) as SchoolDetail;
const facility = (name: string, category: Facility['category'], available: boolean | null): Facility =>
  ({ id: 1, name, category, available, description: null, sourceUrl: 'https://x.org', verificationStatus: 'UNVERIFIED', lastVerifiedDate: null });

describe('school comparison rows', () => {
  it('never turns an unknown hostel into "day school"', () => {
    expect(dayOrBoarding(school({}))).toBeNull();
    expect(dayOrBoarding(school({ hasHostel: false }))).toBe('Day school');
    expect(dayOrBoarding(school({ boarding: { boardingType: 'FULL_BOARDING', residentialSystem: 'NAVODAYA' } as SchoolDetail['boarding'] })))
      .toMatch(/^Full boarding · /);
  });

  it('lists only facilities a source says are present, by group', () => {
    const list = [facility('Library', 'LIBRARY', true), facility('Physics lab', 'LABORATORY', null), facility('Pool', 'SPORTS', true),
      facility('Computer lab', 'COMPUTER', false)];
    expect(facilityNames(list, ACADEMIC_FACILITIES)).toEqual(['Library', 'Physics lab']);
  });

  it('describes hostel life and admission only from what is recorded', () => {
    expect(hostelDetails(school({}))).toEqual([]);
    const b = { accommodation: '21 ashrams', dining: null, medicalCare: '15-bed sick room', pastoralCare: null, entranceExam: 'NETARHAT', entryClasses: 'Class 6 only' };
    const s = school({ boarding: b as unknown as SchoolDetail['boarding'] });
    expect(hostelDetails(s)).toEqual(['Rooms: 21 ashrams', 'Medical care: 15-bed sick room']);
    const admissions = [{ status: 'CLOSED', selectionCriteria: 'Written test, then interview.' }] as Admission[];
    expect(admissionProcess(s, admissions)).toEqual([expect.stringMatching(/^Entrance: /), 'Entry: Class 6 only', 'Written test, then interview.']);
  });

  it('shows checked published positions with their source and edition, never sponsored ones', () => {
    const e = (over: Partial<ExternalRanking>): ExternalRanking => ({ id: 1, publisher: 'EducationWorld', rankingName: 'India School Rankings',
      rankingYear: '2025-26', category: 'Day schools', rankPosition: 3, scoreText: null, sourceUrl: 'https://x.org', retrievedDate: '2026-10-01',
      verificationStatus: 'VERIFIED', publisherCode: 'EDUCATIONWORLD', scope: 'NATIONAL', region: null, sponsored: false, notes: null,
      lastVerifiedDate: null, ...over });
    const r = { externalRankings: [e({}), e({ id: 2, sponsored: true, rankPosition: null }), e({ id: 3, verificationStatus: 'UNVERIFIED' })] } as SchoolRankingDetail;
    expect(publishedPositions(r).map((p) => p.text)).toEqual(['#3 · EducationWorld India School Rankings 2025-26 (Day schools)']);
    expect(publishedPositions(undefined)).toEqual([]);
  });
});
