import type {
  AdmissionCategory,
  AdmissionStatus,
  BoardingType,
  EntranceExam,
  FacilityCategory,
  GenderType,
  ImageType,
  ResidentialSystem,
  SchoolManagement,
  SchoolNetwork,
  SchoolStage,
  SchoolType,
  VerificationStatus,
} from '../types/api';

export const NOT_AVAILABLE = 'Not available';

const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** Formats rupees; null stays "Not available" (never ₹0). */
export function formatMoney(value: number | null | undefined, whole = false): string {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  return (whole ? inrWhole : inr).format(value);
}

/** Short Indian-style amount for cards: ₹85,000 · ₹1.85 L · ₹1.2 Cr. */
export function formatMoneyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  if (value >= 1_00_00_000) return `₹${trim(value / 1_00_00_000)} Cr`;
  if (value >= 1_00_000) return `₹${trim(value / 1_00_000)} L`;
  return inrWhole.format(value);
}

function trim(n: number): string {
  return n.toFixed(2).replace(/\.?0+$/, '');
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return NOT_AVAILABLE;
  const date = new Date(iso.length === 10 ? `${iso}T00:00:00` : iso);
  if (Number.isNaN(date.getTime())) return NOT_AVAILABLE;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatYesNo(value: boolean | null | undefined): string {
  if (value === null || value === undefined) return NOT_AVAILABLE;
  return value ? 'Yes' : 'No';
}

export function orNotAvailable(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return NOT_AVAILABLE;
  return String(value);
}

/** Days from today until an ISO date (negative when past). */
export function daysUntil(iso: string | null | undefined, today = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(`${iso}T00:00:00`);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((target.getTime() - start.getTime()) / 86_400_000);
}

export const schoolTypeLabel: Record<SchoolType, string> = {
  GOVERNMENT: 'Government',
  PRIVATE: 'Private',
  AIDED: 'Government-aided',
  INTERNATIONAL: 'International',
};

export const managementLabel: Record<SchoolManagement, string> = {
  CENTRAL_GOVERNMENT: 'Central government',
  STATE_GOVERNMENT: 'State government',
  LOCAL_BODY: 'Local body (municipal / panchayat)',
  GOVERNMENT_AIDED: 'Government-aided',
  PRIVATE_UNAIDED: 'Private unaided',
  OTHER: 'Other',
};

export const networkLabel: Record<SchoolNetwork, string> = {
  KENDRIYA_VIDYALAYA: 'Kendriya Vidyalaya',
  JAWAHAR_NAVODAYA_VIDYALAYA: 'Jawahar Navodaya Vidyalaya',
  SAINIK_SCHOOL: 'Sainik School',
  EKLAVYA_MODEL_RESIDENTIAL_SCHOOL: 'Eklavya Model Residential School',
  RASHTRIYA_MILITARY_SCHOOL: 'Rashtriya Military School',
};

export const boardingTypeLabel: Record<BoardingType, string> = {
  FULL_BOARDING: 'Full boarding',
  WEEKLY_BOARDING: 'Weekly boarding',
  DAY_CUM_BOARDING: 'Day-cum-boarding',
};

export const residentialSystemLabel: Record<ResidentialSystem, string> = {
  NAVODAYA: 'Jawahar Navodaya Vidyalaya',
  SAINIK: 'Sainik School',
  MILITARY_SCHOOL: 'Rashtriya Military School',
  MILITARY_COLLEGE: 'Military college (RIMC)',
  STATE_RESIDENTIAL: 'State residential school',
  TRIBAL_RESIDENTIAL: 'Tribal residential school',
  PRIVATE_BOARDING: 'Private boarding school',
};

/** Entrance route label and, for system exams, the slug of the exam guide. */
export const entranceExamInfo: Record<EntranceExam, { label: string; guide: string | null }> = {
  JNVST: { label: 'JNVST', guide: 'jnvst' },
  AISSEE: { label: 'AISSEE', guide: 'aissee' },
  RMS_CET: { label: 'RMS CET', guide: 'rms-cet' },
  RIMC: { label: 'RIMC entrance', guide: 'rimc' },
  NETARHAT: { label: 'Netarhat entrance', guide: 'netarhat' },
  SCHOOL_TEST: { label: "School's own test", guide: null },
};

/** "Locality, City, State" without repeats (Delhi, Delhi) or gaps. */
export function placeLine(...parts: (string | null | undefined)[]): string {
  const seen = new Set<string>();
  return parts
    .filter((p): p is string => !!p && p.trim() !== '')
    .filter((p) => {
      const key = p.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join(', ');
}

export const genderLabel: Record<GenderType, string> = {
  CO_ED: 'Co-educational',
  BOYS: 'Boys',
  GIRLS: 'Girls',
};

export const imageTypeLabel: Record<ImageType, string> = {
  LOGO: 'Logo',
  CAMPUS: 'Campus',
  MAIN_BUILDING: 'Main building',
  CLASSROOM: 'Classroom',
  HOSTEL: 'Hostel',
  LIBRARY: 'Library',
  PLAYGROUND: 'Playground',
  LABORATORY: 'Laboratory',
  SPORTS: 'Sports',
  EVENT: 'Event',
  ACTIVITIES: 'Activities',
  OTHER: 'Other',
};

export const stageLabel: Record<SchoolStage, string> = {
  PRE_PRIMARY: 'Nursery & KG',
  PRIMARY: 'Primary (I–V)',
  MIDDLE: 'Middle (VI–VIII)',
  SECONDARY: 'Secondary (IX–X)',
  SENIOR_SECONDARY: 'Senior Secondary (XI–XII)',
};

export const admissionStatusLabel: Record<AdmissionStatus, string> = {
  UPCOMING: 'Upcoming',
  OPEN: 'Open',
  CLOSED: 'Closed',
  NOT_ANNOUNCED: 'Not announced',
};

export const admissionCategoryLabel: Record<AdmissionCategory, string> = {
  GENERAL: 'General',
  EWS_DG: 'EWS / DG',
  CWSN: 'CWSN',
};

export const verificationLabel: Record<VerificationStatus, string> = {
  VERIFIED: 'Verified',
  UNVERIFIED: 'Pending verification',
  OUTDATED: 'Outdated',
  DISPUTED: 'Disputed',
};

export const facilityCategoryLabel: Record<FacilityCategory, string> = {
  SPORTS: 'Sports',
  LIBRARY: 'Library',
  LABORATORY: 'Laboratories',
  COMPUTER: 'Computers & ICT',
  TRANSPORT: 'Transport',
  HOSTEL: 'Hostel',
  ACCESSIBILITY: 'Accessibility',
  EXTRACURRICULAR: 'Extracurricular',
  ARTS: 'Arts & performance',
  HEALTH: 'Health & well-being',
  OTHER: 'Other',
};

export const feeComponentLabel: Record<string, string> = {
  registrationFee: 'Registration fee',
  admissionFee: 'Admission fee',
  monthlyTuition: 'Monthly tuition',
  monthlyCharges: 'Other monthly charges',
  annualCharges: 'Annual charges',
  developmentCharges: 'Development charges',
  otherCharges: 'Other charges',
  transportMonthly: 'Transport fee',
  booksUniformEstimate: 'Books & uniform estimate',
  feeSchedule: 'Fee schedule',
};

/** Builds a Google Maps / OSM directions link without sending any user data. */
export function directionsUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/directions?to=${lat}%2C${lon}`;
}
