import type { Admission, ExternalRanking, Facility, FacilityCategory, SchoolDetail, SchoolRankingDetail } from '../types/api';
import { boardingTypeLabel, entranceExamInfo, residentialSystemLabel } from './format';
import { listTitle } from './rankingLists';

/** Facilities of the given categories that a source documents as present; "not available" records are left out. */
export function facilityNames(list: Facility[], categories: FacilityCategory[]): string[] {
  return list.filter((f) => categories.includes(f.category) && f.available !== false).map((f) => f.name);
}

export const ACADEMIC_FACILITIES: FacilityCategory[] = ['LIBRARY', 'LABORATORY', 'COMPUTER'];
export const SPORTS_FACILITIES: FacilityCategory[] = ['SPORTS'];

/** "Full boarding · State residential school", "Day school", or null when no source says. */
export function dayOrBoarding(s: SchoolDetail): string | null {
  if (s.boarding) {
    const type = s.boarding.boardingType ? boardingTypeLabel[s.boarding.boardingType] : 'Boarding';
    return `${type} · ${residentialSystemLabel[s.boarding.residentialSystem]}`;
  }
  if (s.hasHostel === true) return 'Hostel available';
  if (s.hasHostel === false) return 'Day school';
  return null;
}

/** What the boarding profile says about hostel life, in one line per topic. */
export function hostelDetails(s: SchoolDetail): string[] {
  const b = s.boarding;
  if (!b) return [];
  return [
    b.accommodation && `Rooms: ${b.accommodation}`,
    b.dining && `Meals: ${b.dining}`,
    b.medicalCare && `Medical care: ${b.medicalCare}`,
    b.pastoralCare && `Care: ${b.pastoralCare}`,
  ].filter((x): x is string => !!x);
}

/** Entrance exam, entry classes and the selection rule of the current admission cycle, as each source states them. */
export function admissionProcess(s: SchoolDetail, admissions: Admission[]): string[] {
  const current = admissions.find((a) => a.status === 'OPEN') ?? admissions.find((a) => a.status === 'UPCOMING') ?? admissions[0];
  const exam = s.boarding?.entranceExam ? entranceExamInfo[s.boarding.entranceExam]?.label : null;
  const criteria = current?.selectionCriteria;
  return [
    exam && `Entrance: ${exam}`,
    s.boarding?.entryClasses && `Entry: ${s.boarding.entryClasses}`,
    criteria && (criteria.length > 180 ? `${criteria.slice(0, 177)}…` : criteria),
  ].filter((x): x is string => !!x);
}

/** Checked, non-sponsored published positions: "#3 · EducationWorld India School Rankings 2025-26 (Day schools)". */
const isPublished = (e: ExternalRanking) => !e.sponsored && e.verificationStatus === 'VERIFIED';

export function rankingLists(details: (SchoolRankingDetail | undefined)[]): string[] {
  const titles = new Set<string>();
  details.forEach((d) => d?.externalRankings.filter(isPublished).forEach((e) => titles.add(listTitle(e))));
  return [...titles].sort();
}

/** A school's place in one list, with national, state and city ranks kept apart. */
export function listPosition(d: SchoolRankingDetail | undefined, title: string): string {
  const e = d?.externalRankings.find((x) => isPublished(x) && listTitle(x) === title);
  if (!e) return 'Not listed';
  const ranks = [e.nationalRank != null && `National #${e.nationalRank}`, e.stateRank != null && `State #${e.stateRank}`, e.cityRank != null && `City #${e.cityRank}`].filter(Boolean);
  if (ranks.length > 0) return ranks.join(' · ');
  return e.rating ? `${e.rating} rating` : e.rankPosition ? `#${e.rankPosition}` : e.scoreText ?? 'Listed';
}
