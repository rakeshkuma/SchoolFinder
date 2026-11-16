import type { Admission, Fee, SchoolDetail } from '../types/api';
import { formatDate, formatMoneyCompact, networkLabel } from './format';

/**
 * Presentation helpers for the school profile page. Every sentence and label is built only from the school's own record;
 * nothing here is stored, and a missing fact is left out rather than guessed.
 */

/** The board as parents know it: "CBSE", "ICSE/ISC", "State board"; null when no board is recorded. */
export function boardShortName(board: SchoolDetail['board']): string | null {
  if (!board) return null;
  if (board.code === 'CISCE') return 'ICSE/ISC';
  if (board.code === 'STATE') return 'State board';
  if (board.code === 'OTHER') return null;
  return board.code;
}

const unique = (parts: (string | null | undefined)[]): string[] => {
  const seen = new Set<string>();
  return parts.filter((p): p is string => !!p && p.trim() !== '').map((p) => p.trim()).filter((p) => {
    const key = p.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

/** "Locality, Town, District district, State": where the school is, without repeats (Delhi, Delhi). */
export function locationSummary(s: Pick<SchoolDetail, 'locality' | 'city' | 'district' | 'stateName'>): string {
  const district = s.district?.name;
  const sameAsTown = !!district && !!s.city && district.toLowerCase() === s.city.toLowerCase();
  return unique([s.locality, s.city, district && !sameAsTown ? `${district} district` : null, s.stateName]).join(', ');
}

/**
 * The postal address as one line: the recorded address, then the town, district, state and PIN code only when the
 * address does not already contain them ("Netarhat, Dist: Latehar Jharkhand-835218" needs nothing added).
 */
export function fullAddress(s: Pick<SchoolDetail, 'addressLine' | 'city' | 'district' | 'stateName' | 'pinCode'>): string {
  // Shown tidily (a trailing or doubled comma in the record is not repeated); the record itself is unchanged.
  const line = (s.addressLine ?? '').trim().replace(/\s*,(\s*,)+/g, ',').replace(/[,\s]+$/, '');
  const has = (part: string | null | undefined) => !!part && line.toLowerCase().includes(part.toLowerCase());
  const extra = [s.city, s.district?.name, s.stateName].filter((p) => p && !has(p));
  const pin = s.pinCode && !has(s.pinCode) && !has(`${s.pinCode.slice(0, 3)} ${s.pinCode.slice(3)}`) ? s.pinCode : null;
  return unique([line, ...extra]).join(', ') + (pin ? ` – ${pin}` : '');
}

/** "Class VI – XII", "Up to Class XII" (only the board's affiliation level is known) or null. */
export function classesRange(s: Pick<SchoolDetail, 'classesOffered' | 'affiliatedUpTo'>): string | null {
  if (s.classesOffered.length) {
    const first = s.classesOffered[0].name;
    const last = s.classesOffered[s.classesOffered.length - 1].name;
    return first === last ? first : `${first} – ${last.replace(/^Class /, '')}`;
  }
  return s.affiliatedUpTo ? `Up to ${s.affiliatedUpTo}` : null;
}

/** A board-list record copied as the description ("Listed by CBSE as …"): shown with the official record, not as "About". */
export function isBoardRecordText(description: string | null): boolean {
  return !!description && /^Listed by (CBSE|CISCE)\b/i.test(description.trim());
}

const article = (word: string) => (/^[aeiou]/i.test(word) ? 'an' : 'a');

/**
 * A short factual introduction from the record, e.g. "Netarhat Awasiya Vidyalaya is a government boys' boarding school
 * in Netarhat, Latehar district, Jharkhand. It is affiliated to the CBSE, with classes from Class VI to Class XII. It
 * was established in 1954." Facts that are not recorded are left out; nothing about quality or reputation is said.
 */
export function aboutSummary(s: SchoolDetail): string {
  const kind = [
    s.schoolType === 'GOVERNMENT' ? 'government' : s.schoolType === 'AIDED' ? 'government-aided' : s.schoolType === 'INTERNATIONAL' ? 'international' : 'private',
    s.genderType === 'BOYS' ? "boys'" : s.genderType === 'GIRLS' ? "girls'" : s.genderType === 'CO_ED' ? 'co-educational' : null,
    s.hasHostel === true || s.boarding ? 'boarding' : s.hasHostel === false ? 'day' : null,
  ].filter(Boolean).join(' ');
  const place = locationSummary(s);
  const sentences = [`${s.name} is ${article(kind)} ${kind} school${place ? ` in ${place}` : ''}.`];
  if (s.network) sentences.push(`It is part of the ${networkLabel[s.network]} network.`);

  const board = s.board && s.board.code !== 'OTHER'
    ? ['CBSE', 'CISCE', 'STATE', 'NIOS'].includes(s.board.code)
      ? `affiliated to the ${s.board.code === 'CISCE' ? 'CISCE (ICSE/ISC)' : s.board.code === 'CBSE' ? 'CBSE' : s.board.name}`
      : `following the ${s.board.name} curriculum`
    : null;
  const classes = s.classesOffered.length > 1
    ? `with classes from ${s.classesOffered[0].name} to ${s.classesOffered[s.classesOffered.length - 1].name}`
    : s.classesOffered.length === 1 ? `with ${s.classesOffered[0].name}`
      : s.affiliatedUpTo ? `up to ${s.affiliatedUpTo}` : null;
  if (board && classes) sentences.push(`It is ${board}, ${classes}.`);
  else if (board) sentences.push(`It is ${board}.`);
  else if (classes) sentences.push(`It teaches ${classes.replace(/^with /, '')}.`);

  if (s.establishedYear) sentences.push(`It was established in ${s.establishedYear}.`);
  if (s.mediumOfInstruction) sentences.push(`The medium of instruction is ${s.mediumOfInstruction}.`);
  return sentences.join(' ');
}

export type AdmissionFact = { value: string; hint?: string; tone: 'open' | 'upcoming' | 'closed' | 'unknown' };

/**
 * What the record says about admissions, without reading missing data as "closed": an open or upcoming cycle, a cycle
 * the source says is closed or not announced, or simply no dates published here.
 */
export function admissionFact(admissions: Admission[] | null | undefined): AdmissionFact {
  const list = admissions ?? [];
  const open = list.find((a) => a.status === 'OPEN');
  if (open) return { value: `Open · ${open.className}`, hint: open.applicationEndDate ? `Closes ${formatDate(open.applicationEndDate)}` : undefined, tone: 'open' };
  const upcoming = list.find((a) => a.status === 'UPCOMING');
  if (upcoming) return { value: `Upcoming · ${upcoming.className}`, hint: upcoming.applicationStartDate ? `Opens ${formatDate(upcoming.applicationStartDate)}` : undefined, tone: 'upcoming' };
  const latest = [...list].sort((a, b) => b.academicYear.localeCompare(a.academicYear))[0];
  if (latest?.status === 'CLOSED') return { value: `Closed for ${latest.academicYear}`, hint: 'As recorded from the official notice', tone: 'closed' };
  if (latest?.status === 'NOT_ANNOUNCED') return { value: 'Not announced yet', hint: latest.academicYear, tone: 'unknown' };
  return { value: 'Dates not published', hint: 'Check the official notice', tone: 'unknown' };
}

/** The lowest complete official annual fee of the latest year with one, e.g. { value: "₹1.3 L", year: "2026-27" }. */
export function feeFact(fees: Fee[] | null | undefined): { value: string; year: string } | null {
  const complete = (fees ?? []).filter((f) => f.recurringAnnualOfficial !== null);
  const year = complete.map((f) => f.academicYear).sort().reverse()[0];
  if (!year) return null;
  const min = Math.min(...complete.filter((f) => f.academicYear === year).map((f) => f.recurringAnnualOfficial as number));
  return { value: min === 0 ? 'Free' : formatMoneyCompact(min), year };
}
