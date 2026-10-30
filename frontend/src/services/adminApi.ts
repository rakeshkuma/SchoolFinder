import { cleanParams, http } from './http';
import type {
  Admission,
  AdminPracticeSet,
  PracticeReport,
  PracticeReportStatus,
  AdmissionRequest,
  AuditLogEntry,
  BatchVerifyRequest,
  CriterionScore,
  CriterionScoreRequest,
  CsvImportResult,
  CoverageReport,
  DataQualityReport,
  ExamReview,
  ExamVerificationStatus,
  Facility,
  FacilityCategory,
  FacilityQueueItem,
  Fee,
  FeeRequest,
  ImageRequest,
  PageResponse,
  RankingMethodology,
  Review,
  ReviewStatus,
  SchoolDetail,
  SchoolImage,
  SchoolRequest,
  SchoolSummary,
  SubmissionStatus,
  TokenResponse,
  UpdateSubmission,
  VerificationHistory,
  VerifyRequest,
} from '../types/api';

export const authService = {
  login: (username: string, password: string) =>
    http.post<TokenResponse>('/auth/login', { username, password }).then((r) => r.data),
};

export const adminService = {
  schools: (q: string | undefined, active: boolean | undefined, page: number, size = 25) =>
    http
      .get<PageResponse<SchoolSummary>>('/admin/schools', { params: cleanParams({ q, active, page, size }) })
      .then((r) => r.data),
  school: (id: number) => http.get<SchoolDetail>(`/admin/schools/${id}`).then((r) => r.data),
  createSchool: (body: SchoolRequest) => http.post<SchoolDetail>('/admin/schools', body).then((r) => r.data),
  updateSchool: (id: number, body: SchoolRequest, version: number) =>
    http
      .put<SchoolDetail>(`/admin/schools/${id}`, body, { headers: { 'If-Match': `"${version}"` } })
      .then((r) => r.data),
  setStatus: (id: number, active: boolean, reason: string) =>
    http.patch<SchoolDetail>(`/admin/schools/${id}/status`, { active, reason }).then((r) => r.data),
  upsertFee: (id: number, body: FeeRequest) => http.post<Fee>(`/admin/schools/${id}/fees`, body).then((r) => r.data),
  upsertAdmission: (id: number, body: AdmissionRequest) =>
    http.post<Admission>(`/admin/schools/${id}/admissions`, body).then((r) => r.data),
  addFacility: (id: number, body: { category: FacilityCategory; name: string; description?: string; available?: boolean | null; sourceUrl: string }) =>
    http.post<Facility>(`/admin/schools/${id}/facilities`, body).then((r) => r.data),
  images: (id: number) => http.get<SchoolImage[]>(`/admin/schools/${id}/images`).then((r) => r.data),
  registerImage: (id: number, body: ImageRequest) =>
    http.post<SchoolImage>(`/admin/schools/${id}/images`, body).then((r) => r.data),
  uploadImage: (id: number, file: File, metadata: ImageRequest) => {
    const form = new FormData();
    form.append('file', file);
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    return http.post<SchoolImage>(`/admin/schools/${id}/images`, form).then((r) => r.data);
  },
  deleteImage: (id: number, imageId: number) => http.delete(`/admin/schools/${id}/images/${imageId}`),
  verify: (id: number, body: VerifyRequest) =>
    http.post<VerificationHistory>(`/admin/schools/${id}/verify`, body).then((r) => r.data),
  verifyBatch: (id: number, body: BatchVerifyRequest) =>
    http.post<VerificationHistory[]>(`/admin/schools/${id}/verify/batch`, body).then((r) => r.data),
  facilityQueue: (state: string | undefined, page = 0, size = 10) =>
    http
      .get<PageResponse<FacilityQueueItem>>('/admin/schools/facility-verification-queue', { params: cleanParams({ state, page, size }) })
      .then((r) => r.data),
  verificationHistory: (id: number) =>
    http.get<VerificationHistory[]>(`/admin/schools/${id}/verification-history`).then((r) => r.data),
  criterionScores: (id: number, academicYear?: string) =>
    http
      .get<CriterionScore[]>(`/admin/schools/${id}/criterion-scores`, { params: cleanParams({ academicYear }) })
      .then((r) => r.data),
  upsertCriterionScore: (id: number, body: CriterionScoreRequest) =>
    http.post<CriterionScore>(`/admin/schools/${id}/criterion-scores`, body).then((r) => r.data),
  /** CSV or JSON (array of objects keyed by the CSV column names), chosen by the file extension. */
  importCsv: (file: File, mode: string, updateExisting: boolean) => {
    const form = new FormData();
    form.append('file', file);
    const format = file.name.toLowerCase().endsWith('.json') ? 'json' : 'csv';
    return http
      .post<CsvImportResult>(`/admin/import/${format}`, form, { params: { mode, updateExisting } })
      .then((r) => r.data);
  },
  dataQuality: () => http.get<DataQualityReport>('/admin/data-quality').then((r) => r.data),
  coverage: () => http.get<CoverageReport>('/admin/coverage').then((r) => r.data),
  reviews: (status: ReviewStatus, page = 0) =>
    http.get<PageResponse<Review>>('/admin/reviews', { params: { status, page } }).then((r) => r.data),
  moderateReview: (id: number, status: ReviewStatus, note?: string) =>
    http.patch<Review>(`/admin/reviews/${id}`, { status, note }).then((r) => r.data),
  updateSubmissions: (status: SubmissionStatus, page = 0) =>
    http.get<PageResponse<UpdateSubmission>>('/admin/update-submissions', { params: { status, page } }).then((r) => r.data),
  reviewUpdateSubmission: (id: number, status: SubmissionStatus, note?: string) =>
    http.patch<UpdateSubmission>(`/admin/update-submissions/${id}`, { status, note }).then((r) => r.data),
  updateWeights: (weights: { code: string; weight: number; active?: boolean }[]) =>
    http.put<RankingMethodology>('/admin/ranking-criteria', { weights }).then((r) => r.data),
  recalculateRankings: () =>
    http.post<{ scoredSchools: number }>('/admin/rankings/recalculate').then((r) => r.data),
  auditLog: (page = 0) =>
    http.get<PageResponse<AuditLogEntry>>('/admin/audit-log', { params: { page } }).then((r) => r.data),
  exams: () => http.get<ExamReview[]>('/admin/exams').then((r) => r.data),
  verifyExam: (slug: string, status: ExamVerificationStatus, checkedOn: string, note?: string) =>
    http.patch<ExamReview>(`/admin/exams/${encodeURIComponent(slug)}/verification`, { status, checkedOn, note }).then((r) => r.data),
  publishExam: (slug: string, value: boolean) =>
    http.patch<ExamReview>(`/admin/exams/${encodeURIComponent(slug)}/published`, null, { params: { value } }).then((r) => r.data),
  /** Body in the exam import format: { "exams": [ … ] }; each record replaces its dates and notices. */
  /** Body in the practice import format: { "sets": [ … ] } (see seed/practice.json). */
  importPractice: (body: unknown) =>
    http.post<{ slugs: string[] }>('/admin/practice-sets/import', body).then((r) => r.data),
  /** Every practice set, published or not, with what needs checking. */
  practiceSets: () => http.get<AdminPracticeSet[]>('/admin/practice-sets').then((r) => r.data),
  publishPractice: (slug: string, published: boolean, reviewedOn?: string) =>
    http.patch<AdminPracticeSet>(`/admin/practice-sets/${encodeURIComponent(slug)}/published`, { published, reviewedOn })
      .then((r) => r.data),
  reviewPractice: (slug: string, note?: string) =>
    http.post<AdminPracticeSet>(`/admin/practice-sets/${encodeURIComponent(slug)}/review`, { note }).then((r) => r.data),
  /** The set in the JSON import format, answers included. */
  exportPractice: (slug: string) =>
    http.get<unknown>(`/admin/practice-sets/${encodeURIComponent(slug)}/export`).then((r) => r.data),
  /** Replaces the set's questions; the set is unpublished until it is reviewed and published again. */
  importPracticeCsv: (slug: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return http.post<{ slug: string; questions: number; hindiQuestions: number; published: boolean; message: string }>(
      `/admin/practice-sets/${encodeURIComponent(slug)}/questions/csv`, form).then((r) => r.data);
  },
  practiceReports: (status: PracticeReportStatus, page = 0, size = 20) =>
    http.get<PageResponse<PracticeReport>>('/admin/practice-reports', { params: { status, page, size } }).then((r) => r.data),
  resolveReport: (id: number, status: Exclude<PracticeReportStatus, 'OPEN'>, note?: string) =>
    http.patch<PracticeReport>(`/admin/practice-reports/${id}`, { status, note }).then((r) => r.data),
  importExams: (body: unknown) =>
    http.post<{ created: number; updated: number; slugs: string[] }>('/admin/exams/import', body).then((r) => r.data),
};
