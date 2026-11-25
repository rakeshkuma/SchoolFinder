import { describe, expect, it } from 'vitest';
import type { ExamDate, ExamSummary } from '../types/api';
import { classLabel, countdown, daysBetween, formatExamDate, isFirm, prepMilestones, upcomingEvents } from './exams';

const date = (over: Partial<ExamDate>): ExamDate => ({
  cycle: 'C-2027', kind: 'EXAM', label: 'Exam', startsOn: '2026-12-06', endsOn: null, precision: 'DAY', confirmed: true,
  note: null, sourceUrl: 'https://example.gov.in/n.pdf', ...over,
});

const exam = (slug: string, currentDates: ExamDate[]) => ({ slug, shortName: slug.toUpperCase(), currentDates }) as unknown as ExamSummary;

describe('exam utils', () => {
  it('names classes in Roman numerals', () => {
    expect(classLabel([6])).toBe('Class VI');
    expect(classLabel([6, 9])).toBe('Classes VI and IX');
    expect(classLabel([6, 8, 9])).toBe('Classes VI, VIII and IX');
  });

  it('counts whole days between calendar dates', () => {
    expect(daysBetween('2026-10-26', '2026-10-26')).toBe(0);
    expect(daysBetween('2026-10-26', '2026-12-06')).toBe(41);
    expect(countdown(0)).toBe('today');
    expect(countdown(1)).toBe('tomorrow');
    expect(countdown(41)).toBe('in 41 days');
  });

  it('treats only confirmed, day-precise dates as firm', () => {
    expect(isFirm(date({}))).toBe(true);
    expect(isFirm(date({ confirmed: false }))).toBe(false);
    expect(isFirm(date({ precision: 'MONTH', startsOn: '2027-07-01' }))).toBe(false);
  });

  it('lists upcoming firm dates soonest first and leaves out tentative and passed ones', () => {
    const today = '2026-10-26';
    const events = upcomingEvents([
      exam('a', [date({ startsOn: '2026-12-06' }), date({ kind: 'RESULT', startsOn: '2027-03-01', precision: 'MONTH', confirmed: false })]),
      exam('b', [date({ startsOn: '2026-11-09', kind: 'ADMIT_CARD' }), date({ startsOn: '2026-10-01', kind: 'APPLICATION_END' })]),
      // A late-fee window that started earlier but is still running counts as upcoming.
      exam('c', [date({ kind: 'LATE_APPLICATION_END', startsOn: '2026-10-20', endsOn: '2026-10-30' })]),
    ], today);
    expect(events.map((e) => `${e.exam.slug}:${e.date.kind}`)).toEqual(['c:LATE_APPLICATION_END', 'b:ADMIT_CARD', 'a:EXAM']);
    expect(upcomingEvents([exam('a', [date({ confirmed: false })])], today)).toHaveLength(0);
    expect(upcomingEvents([exam('a', [date({ confirmed: false })])], today, true)).toHaveLength(1);
  });

  it('formats single days, ranges and month-only dates', () => {
    expect(formatExamDate(date({}))).toBe('6 Dec 2026');
    expect(formatExamDate(date({ startsOn: '2026-10-01', endsOn: '2026-10-07' }))).toBe('1 Oct – 7 Oct 2026');
    expect(formatExamDate(date({ startsOn: '2027-03-01', precision: 'MONTH' }))).toBe('Mar 2027');
  });

  describe('prepMilestones', () => {
    // AISSEE-2027 as the NTA notice of 3 Nov 2026 gives it.
    const aissee = [
      date({ kind: 'APPLICATION_START', startsOn: '2026-11-03' }),
      date({ kind: 'APPLICATION_END', startsOn: '2026-12-02' }),
      date({ kind: 'LATE_APPLICATION_END', startsOn: '2026-12-03', endsOn: '2026-12-06' }),
      date({ kind: 'EXAM', startsOn: '2027-01-31' }),
    ];
    // JNVST-2027 as the prospectus gives it: the result only as a month, not confirmed.
    const jnvst = [
      date({ kind: 'APPLICATION_END', startsOn: '2026-07-31' }),
      date({ kind: 'EXAM', startsOn: '2026-11-28' }),
      date({ kind: 'RESULT', startsOn: '2027-03-01', precision: 'MONTH', confirmed: false }),
    ];

    it('puts the last date to apply next to the exam while applications are open, then the late-fee window', () => {
      expect(prepMilestones(aissee, '2026-11-25')).toMatchObject({ apply: { kind: 'APPLICATION_END' }, exam: { startsOn: '2027-01-31' } });
      expect(prepMilestones(aissee, '2026-12-04').apply?.kind).toBe('LATE_APPLICATION_END');
      expect(prepMilestones(aissee, '2026-12-07').apply).toBeUndefined();
    });

    it('after the exam shows when it was held and the expected result until that month is over', () => {
      expect(prepMilestones(jnvst, '2026-11-25')).toMatchObject({ exam: { startsOn: '2026-11-28' } });
      const after = prepMilestones(jnvst, '2026-11-29');
      expect(after.exam).toBeUndefined();
      expect(after.held?.startsOn).toBe('2026-11-28');
      expect(after.result?.kind).toBe('RESULT');
      expect(prepMilestones(jnvst, '2027-03-20').result?.kind).toBe('RESULT');
      expect(prepMilestones(jnvst, '2027-04-01').result).toBeUndefined();
    });

    it('never counts down to a tentative last date', () => {
      expect(prepMilestones([date({ kind: 'APPLICATION_END', startsOn: '2026-12-02', confirmed: false })], '2026-11-25').apply).toBeUndefined();
    });
  });
});
