import type { ExamBoarding, ExamSchoolType, ExamSummary } from '../types/api';
import { classLabel, romanClass } from './exams';

/** The finder's answers; every one is optional except the child's current class. */
export interface FinderAnswers {
  /** Class the child is in now (1–11); the exams of interest admit to the next class or later. */
  currentClass: number | null;
  /** ISO state code where the family lives; empty = not said. */
  state: string;
  schoolType: ExamSchoolType | '';
  boarding: Exclude<ExamBoarding, 'BOTH'> | '';
}

export const EMPTY_ANSWERS: FinderAnswers = { currentClass: null, state: '', schoolType: '', boarding: '' };

export interface FinderResult {
  exam: ExamSummary;
  /** Why the exam may be relevant, in plain words. */
  reasons: string[];
  /** Classes after this year's target in which the child could still apply (for "later" results). */
  laterClass: number | null;
}

export interface FinderOutcome {
  now: FinderResult[];
  later: FinderResult[];
  /** Exams left out, with the first reason they do not fit. */
  excluded: { exam: ExamSummary; reason: string }[];
}

export function readAnswers(params: URLSearchParams): FinderAnswers {
  const cls = Number(params.get('class'));
  const school = params.get('type') ?? '';
  const boarding = params.get('boarding') ?? '';
  return {
    currentClass: Number.isInteger(cls) && cls >= 1 && cls <= 11 ? cls : null,
    state: /^[A-Z]{2}$/.test(params.get('state') ?? '') ? params.get('state')! : '',
    schoolType: (['GOVERNMENT', 'PRIVATE', 'RESIDENTIAL', 'MILITARY', 'SPECIALISED'] as const).find((t) => t === school) ?? '',
    boarding: boarding === 'BOARDING' || boarding === 'DAY' ? boarding : '',
  };
}

export function writeAnswers(a: FinderAnswers): URLSearchParams {
  const p = new URLSearchParams();
  if (a.currentClass) p.set('class', String(a.currentClass));
  if (a.state) p.set('state', a.state);
  if (a.schoolType) p.set('type', a.schoolType);
  if (a.boarding) p.set('boarding', a.boarding);
  return p;
}

/**
 * Matches exams to the answers. Only facts recorded for each exam are used (entry classes, states, school types,
 * boarding); age limits, residence and other rules are never assumed and must be confirmed in the official notice.
 */
export function findExams(exams: ExamSummary[], a: FinderAnswers, stateName: (code: string) => string): FinderOutcome {
  const out: FinderOutcome = { now: [], later: [], excluded: [] };
  if (!a.currentClass) return out;
  const target = a.currentClass + 1;
  for (const exam of exams) {
    if (a.state && exam.scope === 'STATE' && !exam.stateCodes.includes(a.state)) {
      out.excluded.push({ exam, reason: `Only for candidates from ${exam.stateCodes.map(stateName).join(', ')}.` });
      continue;
    }
    if (a.schoolType && !exam.schoolTypes.includes(a.schoolType)) {
      out.excluded.push({ exam, reason: 'Admits to a different type of school than you chose.' });
      continue;
    }
    if (a.boarding && exam.boarding !== 'BOTH' && exam.boarding !== a.boarding) {
      out.excluded.push({ exam, reason: exam.boarding === 'BOARDING' ? 'Boarding admission only.' : 'Day-school admission only.' });
      continue;
    }
    const reasons: string[] = [];
    reasons.push(exam.scope === 'NATIONAL' ? 'Open to candidates from every state and UT.'
      : a.state ? `For candidates from ${stateName(a.state)}.` : `Only for candidates from ${exam.stateCodes.map(stateName).join(', ')} — check that this applies to you.`);
    if (exam.kind === 'SELECTION_PROCESS') reasons.push('An admission process, not an entrance test — the guide explains how seats are filled.');
    if (exam.boarding === 'BOARDING') reasons.push('Residential: students live at the school.');
    if (exam.applicationFree) reasons.push('Applying is free.');

    if (exam.entryClasses.includes(target)) {
      out.now.push({ exam, laterClass: null, reasons: [`Admits to Class ${romanClass(target)} — the class your child moves into next.`, ...reasons] });
      continue;
    }
    const later = exam.entryClasses.filter((c) => c > target).sort((x, y) => x - y)[0];
    if (later) {
      const years = later - target;
      out.later.push({
        exam, laterClass: later,
        reasons: [`Admits to Class ${romanClass(later)} — your child could apply in ${years} year${years === 1 ? '' : 's'}.`, ...reasons],
      });
      continue;
    }
    out.excluded.push({ exam, reason: `Admits to ${classLabel(exam.entryClasses)} only.` });
  }
  return out;
}
