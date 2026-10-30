import { lazy, Suspense, type ComponentType } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Spinner } from './components/common/States';
import { Layout } from './components/layout/Layout';
import { AuthProvider } from './hooks/useAuth';
import { MemberProvider } from './hooks/useMember';
import { CompareProvider } from './hooks/useCompare';
import { BOARDING_LANDINGS } from './content/boardingLandings';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AdminLoginPage } from './pages/admin/AdminLoginPage';

/**
 * Each page is downloaded when it is first visited, so a parent opening one school profile on a phone does not also
 * download the code (and chart/map libraries) of every other page.
 */
function page<M>(load: () => Promise<M>, name: keyof M) {
  return lazy(() => load().then((m) => ({ default: m[name] as unknown as ComponentType })));
}
const directory = () => import('./pages/DirectoryPages');
const info = () => import('./pages/InfoPages');
const HomePage = page(() => import('./pages/HomePage'), 'HomePage');
const SchoolsPage = page(directory, 'SchoolsPage');
const StatesPage = page(directory, 'StatesPage');
const CitiesPage = page(directory, 'CitiesPage');
const StatePage = page(directory, 'StatePage');
const NetworkPage = page(directory, 'NetworkPage');
const SavedSchoolsPage = page(directory, 'SavedSchoolsPage');
const BoardPage = page(directory, 'BoardPage');
const SchoolTypePage = page(directory, 'SchoolTypePage');
const StagePage = page(directory, 'StagePage');
const SchoolDetailPage = page(() => import('./pages/SchoolDetailPage'), 'SchoolDetailPage');
const ComparePage = page(() => import('./pages/ComparePage'), 'ComparePage');
const AdmissionsPage = page(() => import('./pages/AdmissionsPages'), 'AdmissionsPage');
const NotificationsPage = page(() => import('./pages/AdmissionsPages'), 'NotificationsPage');
const AdmissionGuidePage = page(() => import('./pages/AdmissionsPages'), 'AdmissionGuidePage');
const FeeCalculatorPage = page(() => import('./pages/FeeCalculatorPage'), 'FeeCalculatorPage');
const NearbyPage = page(() => import('./pages/NearbyPage'), 'NearbyPage');
const BoardingPage = page(() => import('./pages/BoardingDirectoryPage'), 'BoardingPage');
const BoardingSchoolPage = page(() => import('./pages/BoardingPages'), 'BoardingSchoolPage');
const ExamsPage = page(() => import('./pages/ExamPages'), 'ExamsPage');
const ExamGuidePage = page(() => import('./pages/ExamPages'), 'ExamGuidePage');
const ExamFinderPage = page(() => import('./pages/ExamToolsPages'), 'ExamFinderPage');
const ExamCalendarPage = page(() => import('./pages/ExamToolsPages'), 'ExamCalendarPage');
const ExamClassPage = page(() => import('./pages/ExamHubPages'), 'ExamClassPage');
const ExamStatePage = page(() => import('./pages/ExamHubPages'), 'ExamStatePage');
const ExamSyllabusPage = page(() => import('./pages/ExamHubPages'), 'ExamSyllabusPage');
const ExamResourcesPage = page(() => import('./pages/ExamResourcesPage'), 'ExamResourcesPage');
const PracticeListPage = page(() => import('./pages/PracticePages'), 'PracticeListPage');
const PracticeTestPage = page(() => import('./pages/PracticePages'), 'PracticeTestPage');
const PracticeAttemptPage = page(() => import('./pages/PracticePages'), 'PracticeAttemptPage');
const PracticeSessionPage = page(() => import('./pages/PracticePages'), 'PracticeSessionPage');
const PracticeProgressPage = page(() => import('./pages/PracticeProgressPage'), 'PracticeProgressPage');
const MethodologyPage = page(() => import('./pages/MethodologyPage'), 'MethodologyPage');
const RankingsPage = page(() => import('./pages/RankingsPage'), 'RankingsPage');
const PublishedRankingsPage = page(() => import('./pages/PublishedRankingsPage'), 'PublishedRankingsPage');
const RankingComparePage = page(() => import('./pages/RankingComparePage'), 'RankingComparePage');
const BoardingLandingPage = lazy(() => import('./pages/BoardingLandingPage').then((m) => ({ default: m.BoardingLandingPage })));
const ReviewsPage = page(() => import('./pages/ReviewsPage'), 'ReviewsPage');
const AboutPage = page(info, 'AboutPage');
const ContactPage = page(info, 'ContactPage');
const PrivacyPage = page(info, 'PrivacyPage');
const TermsPage = page(info, 'TermsPage');
const account = () => import('./pages/AccountPages');
const SignInPage = page(account, 'SignInPage');
const RegisterPage = page(account, 'RegisterPage');
const VerifyEmailPage = page(account, 'VerifyEmailPage');
const ForgotPasswordPage = page(account, 'ForgotPasswordPage');
const ResetPasswordPage = page(account, 'ResetPasswordPage');
const AccountPage = page(account, 'AccountPage');
const DisclaimerPage = page(info, 'DisclaimerPage');
const NotFoundPage = page(info, 'NotFoundPage');
const SuggestUpdatePage = page(() => import('./pages/SuggestUpdatePage'), 'SuggestUpdatePage');
const FindSchoolPage = page(() => import('./pages/FindSchoolPage'), 'FindSchoolPage');

// Admin screens are only downloaded by administrators.
const AdminDashboardPage = lazy(() => import('./pages/admin/AdminDashboardPage').then((m) => ({ default: m.AdminDashboardPage })));
const AdminCoveragePage = lazy(() => import('./pages/admin/AdminCoveragePage').then((m) => ({ default: m.AdminCoveragePage })));
const AdminSchoolsPage = lazy(() => import('./pages/admin/AdminSchoolsPage').then((m) => ({ default: m.AdminSchoolsPage })));
const AdminSchoolEditorPage = lazy(() => import('./pages/admin/AdminSchoolEditorPage').then((m) => ({ default: m.AdminSchoolEditorPage })));
const AdminFacilityVerificationPage = lazy(() => import('./pages/admin/AdminFacilityVerificationPage').then((m) => ({ default: m.AdminFacilityVerificationPage })));
const AdminImagesPage = lazy(() => import('./pages/admin/AdminImagesPage').then((m) => ({ default: m.AdminImagesPage })));
const AdminExternalRankingsPage = lazy(() => import('./pages/admin/AdminExternalRankingsPage').then((m) => ({ default: m.AdminExternalRankingsPage })));
const AdminDocumentsPage = lazy(() => import('./pages/admin/AdminDocumentsPage').then((m) => ({ default: m.AdminDocumentsPage })));
const AdminDuplicatesPage = lazy(() => import('./pages/admin/AdminDuplicatesPage').then((m) => ({ default: m.AdminDuplicatesPage })));
const AdminImportPage = lazy(() => import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminImportPage })));
const AdminReviewsPage = lazy(() => import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminReviewsPage })));
const AdminRankingPage = lazy(() => import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminRankingPage })));
const AdminSubmissionsPage = lazy(() => import('./pages/admin/AdminSubmissionsPage').then((m) => ({ default: m.AdminSubmissionsPage })));
const AdminExamsPage = lazy(() => import('./pages/admin/AdminExamsPage').then((m) => ({ default: m.AdminExamsPage })));
const AdminPracticePage = lazy(() => import('./pages/admin/AdminPracticePage').then((m) => ({ default: m.AdminPracticePage })));
const AdminAuditPage = lazy(() => import('./pages/admin/AdminOperationsPages').then((m) => ({ default: m.AdminAuditPage })));

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
      <MemberProvider>
        <CompareProvider>
          <Suspense fallback={<Spinner />}>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<HomePage />} />
              <Route path="schools" element={<SchoolsPage />} />
              <Route path="schools/:slug" element={<SchoolDetailPage />} />
              <Route path="states" element={<StatesPage />} />
              <Route path="cities" element={<CitiesPage />} />
              <Route path="states/:state" element={<StatePage />} />
              <Route path="states/:state/:district" element={<StatePage />} />
              <Route path="states/:state/city/:city" element={<StatePage />} />
              <Route path="network/:network" element={<NetworkPage />} />
              <Route path="saved" element={<SavedSchoolsPage />} />
              <Route path="rankings" element={<RankingsPage />} />
              <Route path="rankings/methodology" element={<MethodologyPage />} />
              <Route path="rankings/published" element={<PublishedRankingsPage />} />
              <Route path="rankings/compare" element={<RankingComparePage />} />
              <Route path="admissions" element={<AdmissionsPage />} />
              <Route path="admissions/notifications" element={<NotificationsPage />} />
              <Route path="admissions/guide" element={<AdmissionGuidePage />} />
              <Route path="fees" element={<FeeCalculatorPage />} />
              <Route path="compare" element={<ComparePage />} />
              <Route path="compare-schools" element={<Navigate to="/compare" replace />} />
              <Route path="nearby" element={<NearbyPage />} />
              <Route path="boarding" element={<BoardingPage />} />
              {BOARDING_LANDINGS.map((l) => (
                <Route key={l.slug} path={`boarding/${l.slug}`} element={<BoardingLandingPage slug={l.slug} />} />
              ))}
              <Route path="boarding/:slug" element={<BoardingSchoolPage />} />
              <Route path="exams" element={<ExamsPage />} />
              <Route path="exams/finder" element={<ExamFinderPage />} />
              <Route path="exams/calendar" element={<ExamCalendarPage />} />
              <Route path="exams/class/:n" element={<ExamClassPage />} />
              <Route path="exams/state/:slug" element={<ExamStatePage />} />
              <Route path="exams/netarhat-entrance" element={<Navigate to="/exams/netarhat" replace />} />
              <Route path="exams/syllabus" element={<ExamSyllabusPage />} />
              <Route path="exams/resources" element={<ExamResourcesPage />} />
              <Route path="exams/practice" element={<PracticeListPage />} />
              <Route path="exams/practice/session" element={<PracticeSessionPage />} />
              <Route path="exams/practice/progress" element={<PracticeProgressPage />} />
              <Route path="exams/practice/attempts/:id" element={<PracticeAttemptPage />} />
              <Route path="exams/practice/:slug" element={<PracticeTestPage />} />
              <Route path="exams/:slug" element={<ExamGuidePage />} />
              <Route path="boards/:code" element={<BoardPage />} />
              <Route path="type/:type" element={<SchoolTypePage />} />
              <Route path="type/:type/:kind" element={<SchoolTypePage />} />
              <Route path="stages/:stage" element={<StagePage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="suggest" element={<SuggestUpdatePage />} />
              <Route path="find" element={<FindSchoolPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="terms" element={<TermsPage />} />
              <Route path="signin" element={<SignInPage />} />
              <Route path="register" element={<RegisterPage />} />
              <Route path="verify-email" element={<VerifyEmailPage />} />
              <Route path="forgot-password" element={<ForgotPasswordPage />} />
              <Route path="reset-password" element={<ResetPasswordPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route path="disclaimer" element={<DisclaimerPage />} />
              <Route path="admin/login" element={<AdminLoginPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboardPage />} />
                <Route path="coverage" element={<AdminCoveragePage />} />
                <Route path="schools" element={<AdminSchoolsPage />} />
                <Route path="schools/:id" element={<AdminSchoolEditorPage />} />
                <Route path="facility-verification" element={<AdminFacilityVerificationPage />} />
                <Route path="images" element={<AdminImagesPage />} />
                <Route path="import" element={<AdminImportPage />} />
                <Route path="submissions" element={<AdminSubmissionsPage />} />
                <Route path="exams" element={<AdminExamsPage />} />
                <Route path="practice" element={<AdminPracticePage />} />
                <Route path="reviews" element={<AdminReviewsPage />} />
                <Route path="rankings" element={<AdminRankingPage />} />
                <Route path="external-rankings" element={<AdminExternalRankingsPage />} />
                <Route path="documents" element={<AdminDocumentsPage />} />
                <Route path="duplicates" element={<AdminDuplicatesPage />} />
                <Route path="audit" element={<AdminAuditPage />} />
              </Route>
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
          </Suspense>
        </CompareProvider>
      </MemberProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
