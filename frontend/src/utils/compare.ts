import type { Admission, Facility, FacilityCategory, SchoolDetail, SchoolRankingDetail } from '../types/api';
import { boardingTypeLabel, entranceExamInfo, residentialSystemLabel } from './format';

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
export function publishedPositions(r: SchoolRankingDetail | undefined): { text: string; sourceUrl: string }[] {
  if (!r) return [];
  return r.externalRankings
    .filter((e) => !e.sponsored && e.verificationStatus === 'VERIFIED')
    .map((e) => {
      const position = e.rankPosition ? `#${e.rankPosition}` : e.scoreText ?? 'Listed';
      const scope = [e.category, e.region].filter(Boolean).join(', ');
      return { text: `${position} · ${e.publisher} ${e.rankingName} ${e.rankingYear}${scope ? ` (${scope})` : ''}`, sourceUrl: e.sourceUrl };
    });
}
