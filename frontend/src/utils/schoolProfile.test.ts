import { describe, expect, it } from 'vitest';
import type { Admission, Fee, SchoolDetail } from '../types/api';
import { aboutSummary, admissionFact, boardShortName, classesRange, feeFact, fullAddress, isBoardRecordText, locationSummary } from './schoolProfile';

const cls = (code: string) => ({ code, name: `Class ${code}`, stage: 'SECONDARY' as const, sortOrder: 0 });

/** Netarhat as recorded: a boarding school whose address already contains its town, district, state and PIN. */
const netarhat = {
  name: 'Netarhat Awasiya Vidyalaya', schoolType: 'GOVERNMENT', genderType: 'BOYS', hasHostel: true, boarding: {} as never,
  network: null, board: { code: 'CBSE', name: 'Central Board of Secondary Education' }, classesOffered: [cls('VI'), cls('VII'), cls('XII')],
  affiliatedUpTo: 'Class XII', establishedYear: 1954, mediumOfInstruction: null, locality: null, city: 'Netarhat',
  district: { name: 'Latehar', slug: 'latehar' }, stateName: 'Jharkhand', addressLine: 'Netarhat, Dist: Latehar Jharkhand-835218', pinCode: '835218',
} as unknown as SchoolDetail;

/** A bare board listing: name, state and board only. */
const bare = {
  name: "St. Mary's & Joseph's School", schoolType: 'PRIVATE', genderType: null, hasHostel: null, boarding: null, network: null,
  board: null, classesOffered: [], affiliatedUpTo: null, establishedYear: null, mediumOfInstruction: null, locality: null, city: null,
  district: null, stateName: 'Delhi', addressLine: null, pinCode: null,
} as unknown as SchoolDetail;

const admission = (over: Partial<Admission>) => ({ className: 'Class VI', academicYear: '2027-28', status: 'CLOSED', applicationStartDate: null, applicationEndDate: null, ...over }) as Admission;

describe('school profile helpers', () => {
  it('writes the place and the postal address without repeating what the address already says', () => {
    expect(locationSummary(netarhat)).toBe('Netarhat, Latehar district, Jharkhand');
    expect(fullAddress(netarhat)).toBe('Netarhat, Dist: Latehar Jharkhand-835218');
    // Town and district of the same name are named once; a missing address gives the place and PIN.
    expect(locationSummary({ locality: 'Mayur Vihar', city: 'Delhi', district: { name: 'Delhi', slug: 'delhi' }, stateName: 'Delhi' })).toBe('Mayur Vihar, Delhi');
    expect(fullAddress({ addressLine: null, city: 'Guntur', district: { name: 'Guntur', slug: 'guntur' }, stateName: 'Andhra Pradesh', pinCode: '522005' }))
      .toBe('Guntur, Andhra Pradesh – 522005');
    expect(fullAddress(bare)).toBe('Delhi');
    // A doubled or trailing comma in the record is not shown twice.
    expect(fullAddress({ addressLine: '595/D, Arcot Road,, Tiruvannamalai,', city: null, district: null, stateName: 'Tamil Nadu', pinCode: '604407' }))
      .toBe('595/D, Arcot Road, Tiruvannamalai, Tamil Nadu – 604407');
  });

  it('builds a factual summary only from recorded facts', () => {
    expect(aboutSummary(netarhat)).toBe("Netarhat Awasiya Vidyalaya is a government boys' boarding school in Netarhat, Latehar district, Jharkhand. "
      + 'It is affiliated to the CBSE, with classes from Class VI to Class XII. It was established in 1954.');
    // Nothing recorded beyond the name, type and state: no board, classes, year or claims are added.
    expect(aboutSummary(bare)).toBe("St. Mary's & Joseph's School is a private school in Delhi.");
    expect(aboutSummary({ ...bare, schoolType: 'INTERNATIONAL', network: 'KENDRIYA_VIDYALAYA', affiliatedUpTo: 'Class X' } as SchoolDetail))
      .toBe("St. Mary's & Joseph's School is an international school in Delhi. It is part of the Kendriya Vidyalaya network. It teaches up to Class X.");
    expect(aboutSummary(netarhat)).not.toMatch(/best|top|leading|renowned|verified/i);
  });

  it('names classes and boards the way parents read them', () => {
    expect(classesRange(netarhat)).toBe('Class VI – XII');
    expect(classesRange({ classesOffered: [], affiliatedUpTo: 'Class XII' })).toBe('Up to Class XII');
    expect(classesRange(bare)).toBeNull();
    expect(boardShortName({ code: 'CISCE', name: 'CISCE' } as SchoolDetail['board'])).toBe('ICSE/ISC');
    expect(boardShortName(null)).toBeNull();
    expect(isBoardRecordText('Listed by CBSE as "NETARHAT AWASIYA VIDYALAYA" (affiliation no. 3420006).')).toBe(true);
    expect(isBoardRecordText('A residential school founded in 1954.')).toBe(false);
  });

  it('never reads missing admission records as closed', () => {
    expect(admissionFact([])).toEqual({ value: 'Dates not published', hint: 'Check the official notice', tone: 'unknown' });
    expect(admissionFact(undefined).tone).toBe('unknown');
    expect(admissionFact([admission({ status: 'OPEN', applicationEndDate: '2026-12-15' })]).value).toBe('Open · Class VI');
    expect(admissionFact([admission({ status: 'UPCOMING' })]).tone).toBe('upcoming');
    expect(admissionFact([admission({ status: 'CLOSED', academicYear: '2026-27' })]).value).toBe('Closed for 2026-27');
    expect(admissionFact([admission({ status: 'NOT_ANNOUNCED' })]).value).toBe('Not announced yet');
  });

  it('shows the lowest complete official fee of the latest year, or nothing', () => {
    const fee = (academicYear: string, recurringAnnualOfficial: number | null) => ({ academicYear, recurringAnnualOfficial }) as Fee;
    expect(feeFact([fee('2025-26', 90000), fee('2026-27', 130540), fee('2026-27', 150000), fee('2026-27', null)])).toEqual({ value: '₹1.31 L', year: '2026-27' });
    expect(feeFact([fee('2026-27', null)])).toBeNull();
    expect(feeFact([])).toBeNull();
  });
});
