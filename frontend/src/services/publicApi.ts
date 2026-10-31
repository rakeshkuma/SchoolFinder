import { cleanParams, http } from './http';
import type {
  Admission,
  AdmissionCategory,
  AdmissionStatus,
  City,
  IndiaCity,
  DataSource,
  District,
  EducationBoard,
  ExamBoarding,
  ExamDetail,
  ExamKind,
  ExamMode,
  ExamNotice,
  ExamResource,
  ExamSchoolType,
  ExamSummary,
  IndianState,
  Facility,
  FactSource,
  Fee,
  FeeCalculationSelection,
  FeeComparison,
  FeeEstimate,
  PageResponse,
  PracticeScore,
  PracticeReportReason,
  PracticeBank,
  PracticeMode,
  PracticeSession,
  PracticeSet,
  PracticeSetSummary,
  BoardingStats,
  ExternalRankingFacets,
  ExternalRankingListItem,
  RankingMethodology,
  RankingPublisher,
  RankingPublisherKind,
  RankingScope,
  ResidentialSystem,
  Review,
  ReviewRequest,
  SchoolClass,
  SchoolDetail,
  SchoolImage,
  SchoolNetwork,
  SchoolRanking,
  SchoolRankingDetail,
  SchoolSearchParams,
  SchoolSummary,
  SchoolType,
  SiteStats,
  Suggestions,
  UpdateSubmissionRequest,
} from '../types/api';

/**
 * Session-lifetime cache for reference data that changes rarely (boards, classes, states, districts).
 * Failed requests are evicted so a later call retries.
 */
const referenceCache = new Map<string, Promise<unknown>>();
function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!referenceCache.has(key)) {
    referenceCache.set(key, load().catch((e) => {
      referenceCache.delete(key);
      throw e;
    }));
  }
  return referenceCache.get(key) as Promise<T>;
}

export const schoolService = {
  search: (params: SchoolSearchParams) =>
    http.get<PageResponse<SchoolSummary>>('/schools/search', { params: cleanParams(params) }).then((r) => r.data),
  /** Schools with a real photograph cleared for publication, verified first. Not a ranking. */
  featured: (state?: string, limit = 8) =>
    http.get<SchoolSummary[]>('/schools/featured', { params: cleanParams({ state, limit }) }).then((r) => r.data),
  suggest: (q: string, limit = 6) =>
    http.get<Suggestions>('/schools/suggest', { params: { q, limit } }).then((r) => r.data),
  bySlug: (slug: string) => http.get<SchoolDetail>(`/schools/slug/${encodeURIComponent(slug)}`).then((r) => r.data),
  byId: (id: number) => http.get<SchoolDetail>(`/schools/${id}`).then((r) => r.data),
  nearby: (latitude: number, longitude: number, radiusKm: number, limit = 20, excludeSchoolId?: number) =>
    http
      .get<SchoolSummary[]>('/schools/nearby', { params: cleanParams({ latitude, longitude, radiusKm, limit, excludeSchoolId }) })
      .then((r) => r.data),
  fees: (id: number) => http.get<Fee[]>(`/schools/${id}/fees`).then((r) => r.data),
  admissions: (id: number) => http.get<Admission[]>(`/schools/${id}/admissions`).then((r) => r.data),
  facilities: (id: number) => http.get<Facility[]>(`/schools/${id}/facilities`).then((r) => r.data),
  images: (id: number) => http.get<SchoolImage[]>(`/schools/${id}/images`).then((r) => r.data),
  factSources: (id: number) => http.get<FactSource[]>(`/schools/${id}/fact-sources`).then((r) => r.data),
  suggestUpdate: (id: number, body: UpdateSubmissionRequest) =>
    http.post<{ status: string }>(`/schools/${id}/update-submissions`, body).then((r) => r.data),
  ranking: (id: number) => http.get<SchoolRankingDetail>(`/schools/${id}/ranking`).then((r) => r.data),
  reviews: (id: number, page = 0, size = 10) =>
    http.get<PageResponse<Review>>(`/schools/${id}/reviews`, { params: { page, size } }).then((r) => r.data),
  submitReview: (id: number, review: ReviewRequest) =>
    http.post<Review>(`/schools/${id}/reviews`, review).then((r) => r.data),
};

export const feeService = {
  compare: (schoolIds: number[], classCode: string, academicYear?: string) =>
    http
      .get<FeeComparison>('/fees/compare', { params: cleanParams({ schoolIds, classCode, academicYear }) })
      .then((r) => r.data),
  calculate: (selections: FeeCalculationSelection[], academicYear?: string) =>
    http.post<FeeEstimate[]>('/fees/calculate', { selections, academicYear: academicYear || undefined }).then((r) => r.data),
};

export interface AdmissionListParams {
  academicYear?: string;
  status?: AdmissionStatus;
  category?: AdmissionCategory;
  classCode?: string;
  /** Leave out one network's schools, e.g. the identical national JNV cycles. */
  excludeNetwork?: SchoolNetwork;
  /** ISO code or slug: only schools in this state or UT */
  state?: string;
  /** board code, e.g. CBSE */
  board?: string;
  sortBy?: 'updated' | 'deadline' | 'start';
  page?: number;
  size?: number;
}

export const admissionService = {
  list: (params: AdmissionListParams) =>
    http.get<PageResponse<Admission>>('/admissions', { params: cleanParams(params) }).then((r) => r.data),
  upcoming: (page = 0, size = 20) =>
    http.get<PageResponse<Admission>>('/admissions/upcoming', { params: { page, size } }).then((r) => r.data),
  get: (id: number) => http.get<Admission>(`/admissions/${id}`).then((r) => r.data),
};

export interface RankingParams {
  academicYear?: string;
  /** ISO code (BR) or slug; empty = all of India */
  state?: string;
  /** district slug; needs state */
  district?: string;
  city?: string;
  board?: string;
  locality?: string;
  schoolType?: SchoolType;
  includeProvisional?: boolean;
  /** only schools with a boarding profile */
  boarding?: boolean;
  /** comma-separated residential systems (any of); implies boarding */
  residentialSystem?: string;
  page?: number;
  size?: number;
}

export interface ExternalRankingParams {
  publisher?: string;
  kind?: RankingPublisherKind;
  year?: string;
  category?: string;
  scope?: RankingScope;
  region?: string;
  page?: number;
  size?: number;
}

export const rankingService = {
  list: (params: RankingParams) =>
    http.get<PageResponse<SchoolRanking>>('/rankings', { params: cleanParams(params) }).then((r) => r.data),
  top: (limit = 10) => http.get<SchoolRanking[]>('/rankings/top-schools', { params: { limit } }).then((r) => r.data),
  methodology: () => http.get<RankingMethodology>('/rankings/methodology').then((r) => r.data),
  publishers: () => http.get<RankingPublisher[]>('/rankings/publishers').then((r) => r.data),
  /** Verified, non-sponsored entries of rankings published by others, grouped by list in rank order. */
  external: (params: ExternalRankingParams) =>
    http.get<PageResponse<ExternalRankingListItem>>('/rankings/external', { params: cleanParams(params) }).then((r) => r.data),
  externalFacets: () => http.get<ExternalRankingFacets>('/rankings/external/facets').then((r) => r.data),
};

export interface ExamListParams {
  q?: string;
  entryClass?: number;
  /** ISO code; national exams always match */
  state?: string;
  schoolType?: ExamSchoolType;
  kind?: ExamKind;
  /** comma-separated statuses (any of) */
  status?: string;
  boarding?: ExamBoarding;
  free?: boolean;
  mode?: ExamMode;
  session?: string;
  /** part of the conducting authority's name */
  authority?: string;
  examMonth?: string;
  sort?: 'relevance' | 'deadline' | 'exam_date' | 'updated' | 'name';
  page?: number;
  size?: number;
}

export const examService = {
  list: (params: ExamListParams) =>
    http.get<PageResponse<ExamSummary>>('/exams', { params: cleanParams(params) }).then((r) => r.data),
  get: (slug: string) => http.get<ExamDetail>(`/exams/${encodeURIComponent(slug)}`).then((r) => r.data),
  notices: (limit = 10) => http.get<ExamNotice[]>('/exams/notices', { params: { limit } }).then((r) => r.data),
  /** Official papers and links, and this site's syllabus, pattern, preparation, checklist and FAQ pages. */
  resources: () => cached('exam-resources', () => http.get<ExamResource[]>('/exams/resources').then((r) => r.data)),
  /** Every published exam (the catalogue is small); cached for the session. */
  all: () => cached('exams', () => examService.list({ size: 100 }).then((p) => p.content)),
};

export const practiceService = {
  list: (exam?: string) =>
    http.get<PracticeSetSummary[]>('/practice-sets', { params: cleanParams({ exam }) }).then((r) => r.data),
  get: (slug: string) => http.get<PracticeSet>(`/practice-sets/${encodeURIComponent(slug)}`).then((r) => r.data),
  /** Answers are checked on the server; nothing about the attempt is stored. */
  score: (slug: string, answers: Record<string, number>) =>
    http.post<PracticeScore>(`/practice-sets/${encodeURIComponent(slug)}/score`, { answers }).then((r) => r.data),
  /** What the question bank holds, for building filters (no question text or answers). */
  bank: () => cached('practice-bank', () => http.get<PracticeBank>('/practice-bank').then((r) => r.data)),
  /** Questions for one sitting, drawn from the bank (or exactly `ids`, in order), without answers. */
  session: (params: PracticeSessionParams) =>
    http.get<PracticeSession>('/practice-sessions', {
      params: cleanParams({ ...params, ids: params.ids?.join(',') }),
    }).then((r) => r.data),
  /** Reports a problem in a question (bank id "set/question"); reviewed by editors. */
  report: (id: string, reason: PracticeReportReason, message?: string, website?: string) => {
    const [set, question] = id.split('/');
    return http.post<void>(`/practice-questions/${encodeURIComponent(set)}/${encodeURIComponent(question ?? '')}/reports`,
      { reason, message: message || undefined, website: website || undefined }).then(() => undefined);
  },
  /** Scores a bank session on the server; nothing is stored. */
  scoreSession: (questionIds: string[], answers: Record<string, number>) =>
    http.post<PracticeScore>('/practice-sessions/score', { questionIds, answers }).then((r) => r.data),
};

export interface PracticeSessionParams {
  mode: PracticeMode;
  exam?: string;
  level?: string;
  section?: string;
  topic?: string;
  difficulty?: string;
  category?: string;
  chapter?: string;
  /** only questions with a Hindi version */
  hindi?: boolean;
  count?: number;
  ids?: string[];
  seed?: number;
}

export const boardingService = {
  /** Active boarding schools per residential system; systems without schools are absent. */
  systems: () => http.get<Partial<Record<ResidentialSystem, number>>>('/boarding/systems').then((r) => r.data),
  /** Active boarding schools by state, gender (as sources state it) and system, for the landing pages. */
  stats: () => http.get<BoardingStats>('/boarding/stats').then((r) => r.data),
};

export const locationService = {
  states: () => cached('states', () => http.get<IndianState[]>('/locations/states').then((r) => r.data)),
  state: (codeOrSlug: string) =>
    http.get<IndianState>(`/locations/states/${encodeURIComponent(codeOrSlug)}`).then((r) => r.data),
  districts: (state: string) =>
    cached(`districts:${state}`, () => http.get<District[]>('/locations/districts', { params: { state } }).then((r) => r.data)),
  cities: (state: string) =>
    cached(`cities:${state}`, () => http.get<City[]>('/locations/cities', { params: { state } }).then((r) => r.data)),
  /** Every city in India with listed schools, largest first. */
  citiesAcrossIndia: () => http.get<IndiaCity[]>('/locations/cities/all').then((r) => r.data),
  localities: (state?: string) =>
    http.get<string[]>('/locations/localities', { params: cleanParams({ state }) }).then((r) => r.data),
};

export const referenceService = {
  boards: () => cached('boards', () => http.get<EducationBoard[]>('/boards').then((r) => r.data)),
  classes: () => cached('classes', () => http.get<SchoolClass[]>('/classes').then((r) => r.data)),
  localities: () => http.get<string[]>('/localities').then((r) => r.data),
  dataSources: () => http.get<DataSource[]>('/data-sources').then((r) => r.data),
  stats: () => http.get<SiteStats>('/stats').then((r) => r.data),
  /** Points behind the directory's "recommended" order (documentation completeness, not quality). */
  orderRules: () => cached('orderRules', () => http.get<{ points: number; fact: string }[]>('/directory/order-rules').then((r) => r.data)),
};
