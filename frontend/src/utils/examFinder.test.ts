import { describe, expect, it } from 'vitest';
import type { ExamSummary } from '../types/api';
import { EMPTY_ANSWERS, findExams, readAnswers, writeAnswers } from './examFinder';
import { buildIcs } from './ics';

const exam = (slug: string, over: Partial<ExamSummary>) => ({
  slug, shortName: slug.toUpperCase(), scope: 'NATIONAL', stateCodes: [], schoolTypes: ['GOVERNMENT', 'RESIDENTIAL'],
  entryClasses: [6], boarding: 'BOARDING', applicationFree: null, ...over,
}) as unknown as ExamSummary;

const EXAMS = [
  exam('jnvst', { applicationFree: true }),
  exam('aissee', { entryClasses: [6, 9], schoolTypes: ['GOVERNMENT', 'RESIDENTIAL', 'MILITARY'] }),
  exam('rimc', { entryClasses: [8], schoolTypes: ['GOVERNMENT', 'RESIDENTIAL', 'MILITARY'] }),
  exam('netarhat', { scope: 'STATE', stateCodes: ['JH'] }),
];
const name = (c: string) => ({ JH: 'Jharkhand', DL: 'Delhi' }[c] ?? c);

describe('exam finder', () => {
  it('needs the current class before matching anything', () => {
    expect(findExams(EXAMS, EMPTY_ANSWERS, name).now).toEqual([]);
  });

  it('matches the next class now and later classes as "later", explaining why', () => {
    const r = findExams(EXAMS, { ...EMPTY_ANSWERS, currentClass: 5, state: 'JH' }, name);
    expect(r.now.map((x) => x.exam.slug)).toEqual(['jnvst', 'aissee', 'netarhat']);
    expect(r.later.map((x) => [x.exam.slug, x.laterClass])).toEqual([['rimc', 8]]);
    expect(r.now[0].reasons[0]).toBe('Admits to Class VI — the class your child moves into next.');
    expect(r.now[0].reasons).toContain('Applying is free.');
    expect(r.later[0].reasons[0]).toContain('in 2 years');
  });

  it('says when a match is an admission process rather than a test', () => {
    const kv = exam('kvs', { kind: 'SELECTION_PROCESS', boarding: 'DAY', entryClasses: [6, 9] } as Partial<ExamSummary>);
    const r = findExams([kv], { ...EMPTY_ANSWERS, currentClass: 5, boarding: 'DAY' }, name);
    expect(r.now[0].reasons).toContain('An admission process, not an entrance test — the guide explains how seats are filled.');
  });

  it('leaves out state exams for other states and says why', () => {
    const r = findExams(EXAMS, { ...EMPTY_ANSWERS, currentClass: 5, state: 'DL' }, name);
    expect(r.now.map((x) => x.exam.slug)).not.toContain('netarhat');
    expect(r.excluded.find((x) => x.exam.slug === 'netarhat')?.reason).toBe('Only for candidates from Jharkhand.');
  });

  it('applies school type and boarding preferences', () => {
    const military = findExams(EXAMS, { ...EMPTY_ANSWERS, currentClass: 8, schoolType: 'MILITARY' }, name);
    expect(military.now.map((x) => x.exam.slug)).toEqual(['aissee']);
    const day = findExams(EXAMS, { ...EMPTY_ANSWERS, currentClass: 5, boarding: 'DAY' }, name);
    expect(day.now).toEqual([]);
    expect(day.excluded[0].reason).toBe('Boarding admission only.');
  });

  it('round-trips answers through the URL and ignores junk', () => {
    const a = { currentClass: 5, state: 'JH', schoolType: 'MILITARY' as const, boarding: 'BOARDING' as const };
    expect(readAnswers(writeAnswers(a))).toEqual(a);
    expect(readAnswers(new URLSearchParams('class=99&state=jharkhand&type=x&boarding=y'))).toEqual(EMPTY_ANSWERS);
  });
});

describe('calendar file', () => {
  const base = { cycle: 'RIMCEE-2026', kind: 'EXAM' as const, label: 'Written examination', startsOn: '2026-12-06', endsOn: null,
    precision: 'DAY' as const, confirmed: true, note: null, sourceUrl: 'https://nta.ac.in/notice.pdf' };

  it('writes confirmed dates as all-day events with a reminder the day before', () => {
    const ics = buildIcs([{ examSlug: 'rimc', examName: 'RIMC', date: base }], new Date(Date.UTC(2026, 9, 26, 10, 0, 0)));
    expect(ics).toContain('DTSTART;VALUE=DATE:20261206');
    expect(ics).toContain('DTEND;VALUE=DATE:20261207');
    expect(ics).toContain('SUMMARY:RIMC: Written examination');
    expect(ics).toContain('TRIGGER:-P1D');
    expect(ics).toContain('DTSTAMP:20261026T100000Z');
    expect(ics.split('\r\n').every((l) => l.length <= 75)).toBe(true);
  });

  it('never writes tentative or month-only dates', () => {
    const ics = buildIcs([
      { examSlug: 'a', examName: 'A', date: { ...base, confirmed: false } },
      { examSlug: 'b', examName: 'B', date: { ...base, precision: 'MONTH', startsOn: '2027-07-01' } },
    ]);
    expect(ics).not.toContain('BEGIN:VEVENT');
  });

  it('ends a range on the day after its last day and escapes text', () => {
    const ics = buildIcs([{ examSlug: 'r', examName: 'RIMC, Dehradun', date: { ...base, kind: 'LATE_APPLICATION_END', label: 'Late fee; ₹500', startsOn: '2026-10-01', endsOn: '2026-10-07' } }]);
    expect(ics).toContain('DTEND;VALUE=DATE:20261008');
    expect(ics).toContain('SUMMARY:RIMC\\, Dehradun: Late fee\\; ₹500');
  });
});
