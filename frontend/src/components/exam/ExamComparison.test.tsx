import { afterEach, describe, expect, it } from 'vitest';
import { render, type Rendered } from '../../test/render';
import type { ExamSummary } from '../../types/api';
import { applicationText, examDateText, ExamComparison } from './ExamComparison';

/** Test fixture; the exams and bodies are made up. */
const exam = (o: Partial<ExamSummary> = {}): ExamSummary => ({
  slug: 'fixture-test', shortName: 'FXT', name: 'Fixture Entrance Test – Class VI', kind: 'ENTRANCE_TEST',
  conductingAuthority: 'Fixture Board', scope: 'NATIONAL', stateCodes: [], schoolTypes: ['RESIDENTIAL'], entryClasses: [6],
  entryClassText: 'Class VI', boarding: 'BOARDING', applicationFree: true, examMode: 'PEN_PAPER', currentCycle: 'FXT-2027',
  academicSession: '2027-28', summary: '', status: 'EXAM_DATE_ANNOUNCED', applicationDeadline: null, examDate: '2026-11-28',
  nextDate: null, currentDates: [], officialPaperCount: 0, lastVerifiedOn: '2026-10-24', verificationStatus: 'VERIFIED',
  officialUrl: 'https://fixture.example.org/notice', ...o,
});

describe('examDateText', () => {
  it('gives the date while it is ahead and says "Held on" once it has passed', () => {
    expect(examDateText(exam())).toBe('28 Nov 2026');
    expect(examDateText(exam({ status: 'APPLICATIONS_CLOSED' }))).toBe('Held on 28 Nov 2026');
    expect(examDateText(exam({ status: 'RESULT_ANNOUNCED' }))).toBe('Held on 28 Nov 2026');
  });

  it('says when there is no date instead of guessing one', () => {
    expect(examDateText(exam({ examDate: null, status: 'AWAITING_NOTIFICATION' }))).toBe('Not announced yet');
    expect(examDateText(exam({ examDate: null, status: 'APPLICATIONS_CLOSED' }))).toBe('No confirmed date');
  });
});

describe('applicationText', () => {
  it('never claims a fee or a free application the record does not state', () => {
    expect(applicationText(true)).toBe('Free');
    expect(applicationText(false)).toBe('Fee charged');
    expect(applicationText(null)).toBe('Not stated');
  });
});

describe('ExamComparison', () => {
  let view: Rendered | undefined;
  afterEach(() => view?.unmount());

  it('puts each exam in a row with its guide, who can apply and its official source', () => {
    view = render(<ExamComparison caption="Fixture caption" stateName={(c) => (c === 'JH' ? 'Jharkhand' : c)} exams={[
      exam(),
      exam({ slug: 'state-test', shortName: 'STX', scope: 'STATE', stateCodes: ['JH'], applicationFree: null, examMode: null,
        examDate: null, status: 'AWAITING_NOTIFICATION', lastVerifiedOn: null }),
    ]} />);
    const rows = view.container.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(2);
    expect(view.container.querySelector('caption')?.textContent).toBe('Fixture caption');
    expect(rows[0].querySelector('th[scope="row"] a')?.getAttribute('href')).toBe('/exams/fixture-test');
    expect(rows[0].textContent).toContain('All India');
    expect(rows[0].textContent).toContain('Free');
    expect(rows[0].textContent).toContain('Checked 24 Oct 2026');
    expect(rows[1].textContent).toContain('Jharkhand');
    expect(rows[1].textContent).toContain('Not announced yet');
    expect(rows[1].textContent?.match(/Not stated/g)).toHaveLength(2); // application and mode
    const source = rows[0].querySelector('a[href="https://fixture.example.org/notice"]');
    expect(source?.getAttribute('rel')).toContain('noopener');
  });
});
