// Typed mirrors of the backend DTOs. `null` always means "not available / not published by an official source".

export type SchoolType = 'GOVERNMENT' | 'PRIVATE' | 'AIDED' | 'INTERNATIONAL';
export type SchoolManagement =
  | 'CENTRAL_GOVERNMENT' | 'STATE_GOVERNMENT' | 'LOCAL_BODY' | 'GOVERNMENT_AIDED' | 'PRIVATE_UNAIDED' | 'OTHER';
export type SchoolNetwork =
  | 'KENDRIYA_VIDYALAYA' | 'JAWAHAR_NAVODAYA_VIDYALAYA' | 'SAINIK_SCHOOL' | 'EKLAVYA_MODEL_RESIDENTIAL_SCHOOL'
  | 'RASHTRIYA_MILITARY_SCHOOL';
/** How students live at the school; null on a profile = the source does not say whether every student boards. */
export type BoardingType = 'FULL_BOARDING' | 'WEEKLY_BOARDING' | 'DAY_CUM_BOARDING';
/** Residential-school system; systems differ in mission, admission rules and fees. */
export type ResidentialSystem =
  | 'NAVODAYA' | 'SAINIK' | 'MILITARY_SCHOOL' | 'MILITARY_COLLEGE' | 'STATE_RESIDENTIAL' | 'TRIBAL_RESIDENTIAL' | 'PRIVATE_BOARDING';
export type EntranceExam = 'JNVST' | 'AISSEE' | 'RMS_CET' | 'RIMC' | 'NETARHAT' | 'SCHOOL_TEST';
export type StateKind = 'STATE' | 'UNION_TERRITORY';
export type GenderType = 'CO_ED' | 'BOYS' | 'GIRLS';
export type VerificationStatus = 'UNVERIFIED' | 'VERIFIED' | 'OUTDATED' | 'DISPUTED';
export type AdmissionStatus = 'UPCOMING' | 'OPEN' | 'CLOSED' | 'NOT_ANNOUNCED';
export type AdmissionCategory = 'GENERAL' | 'EWS_DG' | 'CWSN';
export type RequirementType = 'DOCUMENT' | 'ELIGIBILITY' | 'SELECTION_CRITERION';
export type FacilityCategory =
  | 'SPORTS' | 'LIBRARY' | 'LABORATORY' | 'COMPUTER' | 'TRANSPORT' | 'HOSTEL'
  | 'ACCESSIBILITY' | 'EXTRACURRICULAR' | 'ARTS' | 'HEALTH' | 'OTHER';
export type ImageType = 'LOGO' | 'CAMPUS' | 'CLASSROOM' | 'LABORATORY' | 'LIBRARY' | 'SPORTS' | 'EVENT' | 'OTHER';
export type SchoolStage = 'PRE_PRIMARY' | 'PRIMARY' | 'MIDDLE' | 'SECONDARY' | 'SENIOR_SECONDARY';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type ReviewerRelationship = 'PARENT' | 'GUARDIAN' | 'ALUMNUS' | 'OTHER';
export type AdminRole = 'ADMIN' | 'EDITOR';
export type VerifiableEntityType = 'SCHOOL' | 'FEE' | 'ADMISSION' | 'IMAGE' | 'FACILITY' | 'CRITERION_SCORE';

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  first: boolean;
  last: boolean;
}

export interface ApiErrorBody {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  fieldErrors?: { field: string; message: string }[];
}

export interface EducationBoard {
  code: string;
  name: string;
  websiteUrl: string | null;
  description: string | null;
}

export interface SchoolClass {
  code: string;
  name: string;
  stage: SchoolStage;
  sortOrder: number;
}

export interface DataSource {
  name: string;
  url: string;
  sourceType: string;
  publisher: string | null;
  description: string | null;
  lastCheckedDate: string | null;
}

export interface SiteStats {
  activeSchools: number;
  verifiedSchools: number;
  localities: number;
  /** states/UTs and districts with at least one listed school */
  statesCovered: number;
  districtsCovered: number;
  schoolsWithCurrentFees: number;
  currentAcademicYear: string;
}

export interface IndianState {
  code: string;
  name: string;
  slug: string;
  kind: StateKind;
  schoolCount: number;
}

export interface District {
  id: number;
  stateCode: string;
  name: string;
  slug: string;
  schoolCount: number;
}

export interface City {
  name: string;
  stateCode: string;
  schoolCount: number;
}

export interface SchoolSuggestion {
  id: number;
  name: string;
  slug: string;
  locality: string | null;
  city: string | null;
  stateCode: string;
}

export interface PlaceSuggestion {
  type: 'STATE' | 'DISTRICT' | 'CITY';
  label: string;
  stateCode: string;
  stateName: string;
  stateSlug: string;
  /** district slug (DISTRICT only) */
  district: string | null;
  /** city name (CITY only) */
  city: string | null;
}

export interface Suggestions {
  schools: SchoolSuggestion[];
  places: PlaceSuggestion[];
}

export interface SchoolSummary {
  id: number;
  name: string;
  slug: string;
  schoolType: SchoolType;
  management: SchoolManagement | null;
  network: SchoolNetwork | null;
  boardCode: string | null;
  locality: string | null;
  city: string | null;
  districtName: string | null;
  stateCode: string;
  stateName: string | null;
  pinCode: string | null;
  hasHostel: boolean | null;
  logoUrl: string | null;
  coverImageUrl: string | null;
  coverImageCredit: string | null;
  averageRating: number | null;
  reviewCount: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
  /** lowest complete official recurring annual fee (latest year with one) */
  annualFeeFrom: number | null;
  annualFeeYear: string | null;
  /** OPEN or UPCOMING when any admission cycle is; null otherwise */
  admissionStatus: AdmissionStatus | null;
  genderType: GenderType | null;
  websiteUrl: string | null;
  /** Boarding-profile facts; all null for schools without a boarding profile. */
  boardingType: BoardingType | null;
  residentialSystem: ResidentialSystem | null;
  entranceExam: EntranceExam | null;
  entryClasses: string | null;
  boardingSummary: string | null;
  boardingVerificationStatus: VerificationStatus | null;
  /** Lowest and highest class offered; null when the school's classes are not published. */
  classesFrom: string | null;
  classesTo: string | null;
  /** Facility categories a cited source states are available. */
  facilityCategories: FacilityCategory[];
  admissionPortalUrl: string | null;
  /** Date the cited source was read (lastVerifiedDate is set only after an editor's check). */
  sourceRetrievedDate: string | null;
  /** The cover is an illustration, not a photograph of this school. */
  coverImageIllustrative: boolean;
}

export type UpdateTopic = 'FEES' | 'ADMISSIONS' | 'CLASSES' | 'CONTACT' | 'FACILITIES' | 'PHOTOS' | 'CORRECTION' | 'OTHER';
export type SubmitterRole = 'SCHOOL' | 'PARENT' | 'OTHER';
export type SubmissionStatus = 'NEW' | 'ACCEPTED' | 'REJECTED';

/** A suggested update; `website` is a honeypot left empty by people. */
export interface UpdateSubmissionRequest {
  topic: UpdateTopic;
  message: string;
  sourceUrl: string;
  role: SubmitterRole;
  contactEmail?: string;
  website?: string;
}

export interface UpdateSubmission {
  id: number;
  schoolId: number;
  schoolName: string | null;
  schoolSlug: string | null;
  topic: UpdateTopic;
  message: string;
  sourceUrl: string;
  role: SubmitterRole;
  /** Erased when the submission is closed. */
  contactEmail: string | null;
  status: SubmissionStatus;
  reviewerNote: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

/** Source of a profile fact read from another page than the profile's main source. */
export interface FactSource {
  fact: 'CLASSES' | 'LOCATION' | 'CITY';
  sourceUrl: string;
  sourceRetrievedDate: string;
  note: string | null;
}

/** Boarding profile; null text fields are "not stated by the source". */
export interface BoardingProfile {
  schoolId: number;
  boardingType: BoardingType | null;
  residentialSystem: ResidentialSystem;
  governmentSystem: boolean;
  defenceOriented: boolean;
  entranceExam: EntranceExam | null;
  entryClasses: string | null;
  summary: string | null;
  accommodation: string | null;
  pastoralCare: string | null;
  dining: string | null;
  medicalCare: string | null;
  nearestTransport: string | null;
  academicSession: string | null;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
}

export interface SchoolDetail {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  schoolType: SchoolType;
  management: SchoolManagement | null;
  network: SchoolNetwork | null;
  board: EducationBoard | null;
  affiliationNumber: string | null;
  udiseCode: string | null;
  principalName: string | null;
  managingBody: string | null;
  genderType: GenderType | null;
  mediumOfInstruction: string | null;
  classesOffered: SchoolClass[];
  websiteUrl: string | null;
  admissionPortalUrl: string | null;
  phone: string | null;
  email: string | null;
  addressLine: string | null;
  locality: string | null;
  city: string | null;
  district: { name: string; slug: string } | null;
  stateCode: string;
  stateName: string | null;
  stateSlug: string | null;
  pinCode: string | null;
  latitude: number | null;
  longitude: number | null;
  studentTeacherRatio: number | null;
  schoolTimings: string | null;
  establishedYear: number | null;
  hasTransport: boolean | null;
  hasHostel: boolean | null;
  accessibilityFeatures: string | null;
  logoUrl: string | null;
  averageRating: number | null;
  reviewCount: number;
  sourceUrl: string;
  sourceRetrievedDate: string | null;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
  active: boolean;
  version: number;
  updatedAt: string;
  /** null when the school has no boarding profile */
  boarding: BoardingProfile | null;
}

export interface SchoolSearchParams {
  q?: string;
  name?: string;
  locality?: string;
  /** ISO code ("UP") or slug */
  state?: string;
  /** district slug */
  district?: string;
  city?: string;
  pinCode?: string;
  board?: string;
  schoolType?: SchoolType;
  management?: SchoolManagement;
  network?: SchoolNetwork;
  className?: string;
  stage?: SchoolStage;
  minAnnualFee?: number;
  maxAnnualFee?: number;
  feeAcademicYear?: string;
  admissionStatus?: AdmissionStatus;
  minRating?: number;
  /** true = boarding (hostel stated); false = day school (no hostel stated); unknown matches neither */
  hasHostel?: boolean;
  hasTransport?: boolean;
  /** medium of instruction as the source states it, e.g. "English" */
  medium?: string;
  genderType?: GenderType;
  /** comma-separated facility categories; every one must be stated as available */
  facility?: string;
  /** true = has a boarding profile (residential school) */
  boarding?: boolean;
  boardingType?: BoardingType;
  /** comma-separated systems, any of which matches, e.g. "SAINIK,MILITARY_SCHOOL" */
  residentialSystem?: string;
  entranceExam?: EntranceExam;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  /** fee = lowest published annual fee; schools without fee data come last */
  /** recommended (default) = ranked and best-documented profiles first; see the published order rules */
  sortBy?: 'recommended' | 'name' | 'fee' | 'locality' | 'city' | 'rating' | 'reviews' | 'newest' | 'updated' | 'verified' | 'distance';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface Facility {
  id: number;
  category: FacilityCategory;
  name: string;
  description: string | null;
  available: boolean | null;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
}

/** The basis on which an image may be shown; PENDING and REVOKED images are never served publicly. */
export type ImagePermission =
  | 'PUBLIC_DOMAIN' | 'OPEN_LICENCE' | 'WRITTEN_PERMISSION' | 'PURCHASED_LICENCE' | 'OWN_WORK' | 'PENDING' | 'REVOKED';

export interface SchoolImage {
  id: number;
  imageType: ImageType;
  url: string;
  thumbnailUrl: string | null;
  caption: string | null;
  altText: string;
  credit: string | null;
  license: string;
  attributionText: string | null;
  permissionStatus: ImagePermission;
  /** A generic illustration, not a photograph of this school. */
  illustrative: boolean;
  sourceUrl: string;
  width: number | null;
  height: number | null;
  sortOrder: number;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
}

export interface Fee {
  id: number;
  schoolId: number;
  classCode: string;
  className: string;
  academicYear: string;
  registrationFee: number | null;
  admissionFee: number | null;
  monthlyTuition: number | null;
  tuitionMonths: number;
  monthlyCharges: number | null;
  monthlyChargesDescription: string | null;
  annualCharges: number | null;
  developmentCharges: number | null;
  securityDeposit: number | null;
  securityDepositRefundable: boolean;
  transportMonthly: number | null;
  transportMonths: number | null;
  booksUniformEstimate: number | null;
  otherCharges: number | null;
  otherChargesDescription: string | null;
  recurringAnnualOfficial: number | null;
  firstYearOfficial: number | null;
  missingComponents: string[];
  currency: string;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
  notes: string | null;
}

export interface FeeComparison {
  academicYear: string;
  classCode: string;
  schools: { schoolId: number; schoolName: string; slug: string; available: boolean; fee: Fee | null }[];
}

export interface FeeCalculationSelection {
  schoolId: number;
  classCode: string;
  includeTransport: boolean;
  transportMonths?: number;
  includeBooksAndUniform: boolean;
}

export interface FeeLine {
  component: string;
  label: string;
  frequency: 'ONE_TIME' | 'MONTHLY' | 'ANNUAL';
  amount: number;
  multiplier: number;
  annualisedAmount: number;
  official: boolean;
  refundable: boolean;
  optional: boolean;
  includedInFirstYear: boolean;
  includedInRecurring: boolean;
}

export interface FeeEstimate {
  schoolId: number;
  schoolName: string;
  classCode: string;
  academicYear: string | null;
  feeDataAvailable: boolean;
  lines: FeeLine[];
  recurringAnnualTotal: number | null;
  firstYearTotal: number | null;
  refundableDeposit: number | null;
  firstYearCashOutlay: number | null;
  missingComponents: string[];
  formula: string[];
  sourceUrl: string | null;
  verificationStatus: VerificationStatus | null;
  lastVerifiedDate: string | null;
}

export interface AdmissionRequirement {
  type: RequirementType;
  description: string;
  mandatory: boolean;
  points: number | null;
}

export interface Admission {
  id: number;
  schoolId: number;
  schoolName: string | null;
  schoolSlug: string | null;
  classCode: string;
  className: string;
  academicYear: string;
  category: AdmissionCategory;
  applicationStartDate: string | null;
  applicationEndDate: string | null;
  status: AdmissionStatus;
  statusOverridden: boolean;
  statusOverrideReason: string | null;
  ageEligibility: string | null;
  selectionCriteria: string | null;
  officialNotificationUrl: string | null;
  applicationUrl: string | null;
  requirements: AdmissionRequirement[];
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
  notes: string | null;
  updatedAt: string;
}

export interface CriterionContribution {
  criterionCode: string;
  criterionName: string;
  weight: number;
  normalizedScore: number | null;
  contribution: number | null;
  dataAvailable: boolean;
  sourceUrl: string | null;
  /** null on results calculated before methodology 2.0 */
  verified: boolean | null;
  evidenceType: EvidenceType | null;
  evidenceNote: string | null;
}

export type EvidenceType = 'VERIFIED_SCORE' | 'PARENT_REVIEWS' | 'DOCUMENTED_FACILITIES' | 'PUBLISHED_RATIO';

/** RANKED: definitive position. PROVISIONAL: scored, too little verified evidence. NOT_YET_RANKED: no usable evidence. */
export type RankingStatus = 'RANKED' | 'PROVISIONAL' | 'NOT_YET_RANKED';

export interface SchoolRanking {
  schoolId: number;
  schoolName: string;
  slug: string;
  locality: string | null;
  city: string | null;
  districtName: string | null;
  stateCode: string;
  stateName: string | null;
  boardCode: string | null;
  schoolType: SchoolType;
  academicYear: string;
  totalScore: number;
  /** All-India position; null when provisional. */
  rankPosition: number | null;
  /** Position within the requested scope (state, district, board…); null when provisional. */
  scopePosition: number | null;
  status: RankingStatus;
  provisional: boolean;
  /** Share of weight backed by any evidence. */
  coveragePercent: number;
  /** Share of weight backed by verified evidence; a definitive rank needs the published minimum. */
  verifiedCoveragePercent: number;
  breakdown: CriterionContribution[];
  methodologyVersion: string;
  calculatedAt: string;
  /** Card facts (publishable cover image, lowest official fee, admission status); never part of the score. */
  card: SchoolSummary | null;
  /** Lowest / highest class offered; null when not published. */
  lowestClass: string | null;
  highestClass: string | null;
}

export interface ExternalRanking {
  id: number;
  publisher: string;
  rankingName: string;
  rankingYear: string;
  category: string | null;
  rankPosition: number | null;
  scoreText: string | null;
  sourceUrl: string;
  retrievedDate: string;
  verificationStatus: VerificationStatus;
}

export interface SchoolRankingDetail {
  schoolId: number;
  status: RankingStatus;
  siteRanking: SchoolRanking | null;
  externalRankings: ExternalRanking[];
  disclaimer: string;
}

export interface RankingCriterion {
  id: number;
  code: string;
  name: string;
  description: string;
  weight: number;
  displayOrder: number;
  active: boolean;
}

export interface RankingMethodology {
  methodologyVersion: string;
  academicYear: string;
  criteria: RankingCriterion[];
  minimumCoveragePercent: number;
  minimumReviewsForParentFeedback: number;
  maxEvidenceAgeYears: number;
  studentTeacherRatioBest: number;
  studentTeacherRatioWorst: number;
  checklists: { criterionCode: string; items: string[] }[];
  rankedSchools: number;
  provisionalSchools: number;
  rules: string[];
  disclaimer: string;
}

export interface Review {
  id: number;
  schoolId: number;
  reviewerName: string | null;
  relationship: ReviewerRelationship;
  rating: number;
  title: string;
  comment: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface ReviewRequest {
  reviewerName?: string;
  relationship: ReviewerRelationship;
  rating: number;
  title: string;
  comment: string;
  consentGiven: boolean;
}

// ----- Admin -----

export interface TokenResponse {
  accessToken: string;
  tokenType: string;
  expiresInSeconds: number;
  username: string;
  role: AdminRole;
}

export interface SchoolRequest {
  name: string;
  description?: string | null;
  schoolType: SchoolType;
  management?: SchoolManagement | null;
  network?: SchoolNetwork | null;
  boardCode?: string | null;
  affiliationNumber?: string | null;
  udiseCode?: string | null;
  principalName?: string | null;
  managingBody?: string | null;
  genderType?: GenderType | null;
  mediumOfInstruction?: string | null;
  classCodes?: string[];
  websiteUrl?: string | null;
  admissionPortalUrl?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine?: string | null;
  locality?: string | null;
  city?: string | null;
  /** district name; created on first use */
  district?: string | null;
  /** ISO code or full state/UT name */
  stateCode: string;
  pinCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  studentTeacherRatio?: number | null;
  schoolTimings?: string | null;
  establishedYear?: number | null;
  hasTransport?: boolean | null;
  hasHostel?: boolean | null;
  accessibilityFeatures?: string | null;
  logoUrl?: string | null;
  sourceUrl: string;
  sourceRetrievedDate?: string | null;
}

export interface FeeRequest {
  classCode: string;
  academicYear: string;
  registrationFee?: number | null;
  admissionFee?: number | null;
  monthlyTuition?: number | null;
  tuitionMonths?: number | null;
  monthlyCharges?: number | null;
  monthlyChargesDescription?: string | null;
  annualCharges?: number | null;
  developmentCharges?: number | null;
  securityDeposit?: number | null;
  securityDepositRefundable?: boolean | null;
  transportMonthly?: number | null;
  transportMonths?: number | null;
  booksUniformEstimate?: number | null;
  otherCharges?: number | null;
  otherChargesDescription?: string | null;
  sourceUrl: string;
  notes?: string | null;
}

export interface AdmissionRequest {
  classCode: string;
  academicYear: string;
  category: AdmissionCategory;
  applicationStartDate?: string | null;
  applicationEndDate?: string | null;
  statusOverride?: AdmissionStatus | null;
  statusOverrideReason?: string | null;
  ageEligibility?: string | null;
  selectionCriteria?: string | null;
  officialNotificationUrl?: string | null;
  applicationUrl?: string | null;
  requirements?: { type: RequirementType; description: string; mandatory?: boolean; points?: number | null }[];
  sourceUrl: string;
  notes?: string | null;
}

export interface ImageRequest {
  imageType: ImageType;
  url: string;
  caption?: string | null;
  altText: string;
  credit?: string | null;
  license: string;
  thumbnailUrl?: string | null;
  attributionText?: string | null;
  permissionStatus: ImagePermission;
  permissionNote?: string | null;
  illustrative?: boolean;
  sourceUrl: string;
  sortOrder?: number | null;
}

export interface VerifyRequest {
  entityType: VerifiableEntityType;
  entityId?: number | null;
  status: VerificationStatus;
  sourceUrl: string;
  notes?: string | null;
}

/** One decision applied to several records of one school, all checked against the same source. */
export interface BatchVerifyRequest {
  entityType: Exclude<VerifiableEntityType, 'SCHOOL'>;
  entityIds: number[];
  status: VerificationStatus;
  sourceUrl: string;
  notes?: string | null;
}

/** A school with facility records awaiting verification; facilities lists all its records. */
export interface FacilityQueueItem {
  schoolId: number;
  schoolName: string;
  slug: string;
  stateCode: string;
  stateName: string | null;
  websiteUrl: string | null;
  sourceUrl: string | null;
  unverifiedCount: number;
  facilities: Facility[];
}

export interface VerificationHistory {
  id: number;
  entityType: VerifiableEntityType;
  entityId: number;
  previousStatus: VerificationStatus | null;
  newStatus: VerificationStatus;
  sourceUrl: string;
  notes: string | null;
  verifiedBy: string;
  verifiedAt: string;
}

export interface CriterionScoreRequest {
  criterionCode: string;
  academicYear: string;
  rawScore: number;
  maxScore: number;
  evidenceNotes?: string | null;
  sourceUrl: string;
}

export interface CriterionScore {
  id: number;
  schoolId: number;
  criterionCode: string;
  academicYear: string;
  rawScore: number;
  maxScore: number;
  normalizedScore: number;
  evidenceNotes: string | null;
  sourceUrl: string;
  verificationStatus: VerificationStatus;
  lastVerifiedDate: string | null;
}

export interface CsvImportResult {
  mode: string;
  totalRows: number;
  validRows: number;
  created: number;
  updated: number;
  skipped: number;
  committed: boolean;
  errors: { row: number; field: string; message: string }[];
}

/** Counts of what this database holds per state; never a claim that a state is fully covered. */
export interface StateCoverage {
  code: string;
  name: string;
  priority: boolean;
  schools: number;
  privateSchools: number;
  verified: number;
  withPhoto: number;
  withFees: number;
  withAdmissions: number;
  withContact: number;
  withCoordinates: number;
  withClasses: number;
  lastUpdated: string | null;
}

export interface CoverageReport {
  generatedAt: string;
  states: StateCoverage[];
}

export interface DataQualityReport {
  generatedAt: string;
  currentAcademicYear: string;
  totalSchools: number;
  activeSchools: number;
  verifiedSchools: number;
  unverifiedSchools: number;
  staleVerifications: number;
  missingCoordinates: number;
  missingContactDetails: number;
  missingBoard: number;
  schoolsWithoutCurrentFees: number;
  admissionsWithoutDates: number;
  pendingReviews: number;
  provisionalRankings: number;
  definitiveRankings: number;
  schoolsNeedingAttention: { schoolId: number; name: string; slug: string; issues: string[] }[];
}

export interface AuditLogEntry {
  id: number;
  actor: string;
  action: string;
  entityType: string;
  entityId: number | null;
  details: string | null;
  createdAt: string;
}

// --- Exams -----------------------------------------------------------------------------------------------------------

export type ExamKind = 'ENTRANCE_TEST' | 'SELECTION_PROCESS';
export type ExamScope = 'NATIONAL' | 'STATE';
export type ExamBoarding = 'BOARDING' | 'DAY' | 'BOTH';
export type ExamMode = 'PEN_PAPER' | 'COMPUTER' | 'NO_WRITTEN_TEST';
export type ExamSchoolType = 'GOVERNMENT' | 'PRIVATE' | 'RESIDENTIAL' | 'MILITARY' | 'SPECIALISED';
export type ExamVerificationStatus = 'VERIFIED' | 'NEEDS_REVIEW' | 'DRAFT';
export type ExamDateKind = 'APPLICATION_START' | 'APPLICATION_END' | 'LATE_APPLICATION_END' | 'ADMIT_CARD' | 'EXAM'
  | 'RESULT' | 'COUNSELLING' | 'SESSION_START' | 'OTHER';
export type ExamNoticeKind = 'NOTIFICATION' | 'DATE_CHANGE' | 'ADMIT_CARD' | 'ANSWER_KEY' | 'RESULT' | 'COUNSELLING' | 'OTHER';
/** Derived on the server from confirmed, day-precise dates of the current cycle only. */
export type ExamStatus = 'APPLICATIONS_OPEN' | 'DEADLINE_APPROACHING' | 'APPLICATIONS_OPENING_SOON' | 'EXAM_DATE_ANNOUNCED'
  | 'APPLICATIONS_CLOSED' | 'RESULT_ANNOUNCED' | 'AWAITING_NOTIFICATION';

export interface ExamDate {
  cycle: string;
  kind: ExamDateKind;
  label: string;
  startsOn: string;
  endsOn: string | null;
  precision: 'DAY' | 'MONTH';
  /** Stated in an official notice; tentative dates are never counted down. */
  confirmed: boolean;
  note: string | null;
  sourceUrl: string;
}

export interface ExamNotice {
  examSlug: string;
  examShortName: string;
  cycle: string | null;
  kind: ExamNoticeKind;
  title: string;
  publishedOn: string;
  url: string;
}

export interface ExamSummary {
  slug: string;
  shortName: string;
  name: string;
  kind: ExamKind;
  conductingAuthority: string;
  scope: ExamScope;
  stateCodes: string[];
  schoolTypes: ExamSchoolType[];
  entryClasses: number[];
  entryClassText: string;
  boarding: ExamBoarding;
  applicationFree: boolean | null;
  examMode: ExamMode | null;
  currentCycle: string;
  academicSession: string | null;
  summary: string;
  status: ExamStatus;
  applicationDeadline: string | null;
  examDate: string | null;
  nextDate: ExamDate | null;
  currentDates: ExamDate[];
  officialPaperCount: number;
  lastVerifiedOn: string | null;
  verificationStatus: ExamVerificationStatus;
}

export interface ExamLink { label: string; url: string }

export interface ExamContent {
  forSchools: string;
  entryClassText: string;
  eligibility: string[];
  pattern: { title: string; sections: { name: string; questions: number | null; marks: number | null; duration: string | null }[]; notes: string[] }[];
  syllabus: { area: string; topics: string[] }[];
  selection: string[];
  fee: string | null;
  preparation: { step: string; detail: string }[];
  documents: string[] | null;
  faq: { question: string; answer: string; guidance: boolean }[] | null;
  papers: { year: string; title: string; kind: string; url: string; note: string | null }[];
  papersNote: string | null;
  officialLinks: ExamLink[];
  sources: ExamLink[];
  languages: string | null;
  /** how to apply, from the official notice */
  applicationSteps: string[] | null;
  /** exam-day rules from the official notice */
  examDay: string[] | null;
}

export interface ExamDetail {
  exam: ExamSummary;
  content: ExamContent;
  dates: ExamDate[];
  notices: ExamNotice[];
}

export interface ExamReview {
  slug: string;
  shortName: string;
  published: boolean;
  verificationStatus: ExamVerificationStatus;
  lastVerifiedOn: string | null;
  currentCycle: string;
  status: ExamStatus;
  flags: { code: string; message: string }[];
}

// --- Practice (India School Finder's own questions) ------------------------------------------------------------------

export interface PracticeSetSummary {
  slug: string;
  examSlug: string | null;
  title: string;
  kind: 'QUIZ' | 'MOCK';
  level: string;
  description: string;
  /** null = untimed */
  durationMinutes: number | null;
  questionCount: number;
  sections: string[];
}

export interface PracticeShape {
  kind: 'circle' | 'square' | 'triangle' | 'arrow' | 'dot' | 'line';
  x: number;
  y: number;
  size: number;
  /** degrees, clockwise */
  rotate: number;
  filled: boolean;
}

/** A drawing on a 100 x 100 grid; alt describes it for screen readers. */
export interface PracticeFigure {
  alt: string;
  shapes: PracticeShape[];
}

export interface PracticeQuestion {
  id: string;
  section: string;
  topic: string | null;
  passageId: string | null;
  prompt: string;
  options: string[];
  figure: PracticeFigure[] | null;
  figureAsksNext: boolean;
  /** one per option when the options are figures */
  optionFigures: PracticeFigure[] | null;
}

export interface PracticeSet {
  set: PracticeSetSummary;
  passages: { id: string; title: string; text: string }[];
  questions: PracticeQuestion[];
}

export interface PracticeScore {
  total: number;
  attempted: number;
  correct: number;
  sections: { section: string; total: number; attempted: number; correct: number }[];
  questions: { id: string; chosen: number | null; answer: number; correct: boolean; explanation: string }[];
}
