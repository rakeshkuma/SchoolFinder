import type { ExamBoarding, ExamDate, ExamDateKind, ExamMode, ExamNoticeKind, ExamSchoolType, ExamStatus, ExamSummary } from '../types/api';

export const examStatusLabel: Record<ExamStatus, string> = {
  APPLICATIONS_OPEN: 'Applications open',
  DEADLINE_APPROACHING: 'Deadline approaching',
  APPLICATIONS_OPENING_SOON: 'Applications opening soon',
  EXAM_DATE_ANNOUNCED: 'Exam date announced',
  APPLICATIONS_CLOSED: 'Applications closed',
  RESULT_ANNOUNCED: 'Result announced',
  AWAITING_NOTIFICATION: 'Awaiting official notification',
};

export const examStatusStyle: Record<ExamStatus, string> = {
  APPLICATIONS_OPEN: 'bg-emerald-100 text-emerald-800 ring-emerald-600/20',
  DEADLINE_APPROACHING: 'bg-amber-100 text-amber-900 ring-amber-600/30',
  APPLICATIONS_OPENING_SOON: 'bg-sky-100 text-sky-800 ring-sky-600/20',
  EXAM_DATE_ANNOUNCED: 'bg-brand-50 text-brand-800 ring-brand-600/20',
  APPLICATIONS_CLOSED: 'bg-slate-200 text-slate-700 ring-slate-500/20',
  RESULT_ANNOUNCED: 'bg-violet-100 text-violet-800 ring-violet-600/20',
  AWAITING_NOTIFICATION: 'bg-white text-slate-700 ring-slate-300',
};

export const examStatusHelp: Record<ExamStatus, string> = {
  APPLICATIONS_OPEN: 'The official application window is open.',
  DEADLINE_APPROACHING: 'Applications are open and the last date is within 7 days.',
  APPLICATIONS_OPENING_SOON: 'The official notice gives an application start date that is still ahead.',
  EXAM_DATE_ANNOUNCED: 'Applications have closed and the official exam date is ahead.',
  APPLICATIONS_CLOSED: 'The application window in the official notice has closed.',
  RESULT_ANNOUNCED: 'The conducting body has published the result for this cycle.',
  AWAITING_NOTIFICATION: 'No confirmed dates have been published for the current cycle yet.',
};

export const examDateKindLabel: Record<ExamDateKind, string> = {
  APPLICATION_START: 'Applications open',
  APPLICATION_END: 'Last date to apply',
  LATE_APPLICATION_END: 'Late applications',
  ADMIT_CARD: 'Admit card',
  EXAM: 'Exam',
  RESULT: 'Result',
  COUNSELLING: 'Counselling',
  SESSION_START: 'Session starts',
  OTHER: 'Other',
};

export const examNoticeKindLabel: Record<ExamNoticeKind, string> = {
  NOTIFICATION: 'Notification',
  DATE_CHANGE: 'Date change',
  ADMIT_CARD: 'Admit card',
  ANSWER_KEY: 'Answer key',
  RESULT: 'Result',
  COUNSELLING: 'Counselling',
  OTHER: 'Notice',
};

export const examSchoolTypeLabel: Record<ExamSchoolType, string> = {
  GOVERNMENT: 'Government',
  PRIVATE: 'Private',
  RESIDENTIAL: 'Residential',
  MILITARY: 'Military',
  SPECIALISED: 'Specialised',
};

export const examBoardingLabel: Record<ExamBoarding, string> = {
  BOARDING: 'Boarding only',
  DAY: 'Day school',
  BOTH: 'Boarding or day',
};

export const examModeLabel: Record<ExamMode, string> = {
  PEN_PAPER: 'Pen and paper',
  COMPUTER: 'Computer-based',
  NO_WRITTEN_TEST: 'No written test',
};

const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** 6 → "Class VI"; [6, 9] → "Classes VI and IX". */
export function classLabel(classes: number[]): string {
  const names = classes.map((c) => ROMAN[c] ?? String(c));
  if (names.length === 0) return '';
  if (names.length === 1) return `Class ${names[0]}`;
  return `Classes ${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

export const romanClass = (c: number) => ROMAN[c] ?? String(c);

/** Local calendar date as yyyy-mm-dd (dates from the API are Indian calendar dates without a time). */
export function isoToday(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Only confirmed, day-precise dates may show a countdown or go into a calendar. */
export const isFirm = (d: ExamDate) => d.confirmed && d.precision === 'DAY';

export const lastDay = (d: ExamDate) => d.endsOn ?? d.startsOn;

/** Whole days from `today` to `iso` (both yyyy-mm-dd). */
export function daysBetween(today: string, iso: string): number {
  return Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export interface ExamEvent {
  exam: ExamSummary;
  date: ExamDate;
}

/** Dates of the current cycles that have not passed, soonest first; tentative ones only when asked for. */
export function upcomingEvents(exams: ExamSummary[], today: string, includeTentative = false): ExamEvent[] {
  return exams
    .flatMap((exam) => exam.currentDates.map((date) => ({ exam, date })))
    .filter(({ date }) => (includeTentative || isFirm(date)) && lastDay(date) >= today)
    .sort((a, b) => (a.date.startsOn < b.date.startsOn ? -1 : a.date.startsOn > b.date.startsOn ? 1 : 0));
}

/** "28 Nov 2026", or "Mar 2027" for month-precision dates, or a range. */
export function formatExamDate(d: Pick<ExamDate, 'startsOn' | 'endsOn' | 'precision'>): string {
  const fmt = (iso: string, opts: Intl.DateTimeFormatOptions) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', opts);
  if (d.precision === 'MONTH') return fmt(d.startsOn, { month: 'short', year: 'numeric' });
  const full: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short', year: 'numeric' };
  return d.endsOn && d.endsOn !== d.startsOn ? `${fmt(d.startsOn, { day: 'numeric', month: 'short' })} – ${fmt(d.endsOn, full)}` : fmt(d.startsOn, full);
}

/** Phrase for a countdown, e.g. "today", "tomorrow", "in 12 days". */
export function countdown(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}
