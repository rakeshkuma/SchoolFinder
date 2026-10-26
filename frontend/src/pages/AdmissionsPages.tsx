import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdmissionStatusBadge } from '../components/common/Badges';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState } from '../components/common/States';
import { ExamCard } from '../components/exam/ExamCard';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { admissionService, examService, locationService, referenceService, type AdmissionListParams } from '../services/publicApi';
import type { AdmissionCategory, AdmissionStatus } from '../types/api';
import { admissionCategoryLabel, admissionStatusLabel, daysUntil, formatDate } from '../utils/format';
import { AdmissionCard } from './SchoolDetailPage';

export function AdmissionsPage() {
  useDocumentTitle('Admission process and deadlines');
  const [page, setPage] = useState(0);
  const upcoming = useApi(() => admissionService.upcoming(page, 20), [page]);
  const exams = useApi(() => examService.all(), []);
  const states = useApi(() => locationService.states(), []);
  const stateName = (code: string) => states.data?.find((s) => s.code === code)?.name ?? code;

  return (
    <>
      <PageHeader
        title="Admission process and deadlines"
        subtitle="Upcoming and open admission cycles recorded from official notices, soonest deadline first."
      >
        <Link to="/admissions/notifications" className="link text-sm">See all admission notifications →</Link>
      </PageHeader>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-10">
        <section aria-label="Upcoming and open admission cycles">
          <AsyncContent
            state={upcoming}
            isEmpty={(d) => d.content.length === 0}
            empty={
              <EmptyState title="No upcoming or open admission cycles are recorded right now.">
                Official schedules are published by schools and by state and UT education departments.
              </EmptyState>
            }
          >
            {(data) => (
              <>
                <ol className="space-y-3">
                  {data.content.map((a) => {
                    const days = daysUntil(a.applicationEndDate);
                    return (
                      <li key={a.id} className="card flex flex-wrap items-center gap-4 p-4">
                        <div className="w-20 text-center">
                          {days !== null && days >= 0 ? (
                            <><p className="text-2xl font-bold text-brand-700">{days}</p><p className="text-xs text-slate-500">day{days === 1 ? '' : 's'} left</p></>
                          ) : <p className="text-xs text-slate-500">Deadline not announced</p>}
                        </div>
                        <div className="min-w-0 flex-1">
                          <Link to={`/schools/${a.schoolSlug}?tab=admissions`} className="font-semibold hover:text-brand-700">{a.schoolName}</Link>
                          <p className="text-sm text-slate-600">
                            {a.className} · {a.academicYear} · {admissionCategoryLabel[a.category]} · {formatDate(a.applicationStartDate)} → {formatDate(a.applicationEndDate)}
                          </p>
                        </div>
                        <AdmissionStatusBadge status={a.status} overridden={a.statusOverridden} />
                      </li>
                    );
                  })}
                </ol>
                <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
              </>
            )}
          </AsyncContent>
        </section>
        <section aria-labelledby="tests-heading">
          <h2 id="tests-heading" className="text-lg font-semibold text-ink">National and state entrance tests</h2>
          <p className="mt-1 text-sm text-slate-600">
            Status and dates from each conducting body&apos;s official notice. <Link to="/exams" className="link">Compare all entrance exams →</Link>
          </p>
          <AsyncContent state={exams} isEmpty={(d) => d.length === 0} empty={<p className="mt-4 text-sm text-slate-600">No exam guides are available right now.</p>}>
            {(list) => (
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {list.map((e) => <ExamCard key={e.slug} exam={e} stateName={stateName} />)}
              </div>
            )}
          </AsyncContent>
        </section>
        </div>
        <aside className="card prose-page h-fit p-5 text-sm">
          <h2 className="!mt-0">How school admissions work in India</h2>
          <ul>
            <li><strong>Private schools:</strong> each school publishes its own criteria and schedule, within the rules of the state or UT education department.</li>
            <li><strong>RTE / EWS seats:</strong> under Section 12(1)(c) of the Right to Education Act, private unaided (non-minority) schools reserve at least 25% of entry-level seats for children from weaker sections and disadvantaged groups. The state or UT runs the process (in Delhi, the Directorate of Education’s online lottery).</li>
            <li><strong>Kendriya Vidyalayas:</strong> admission follows the guidelines KVS publishes each year; Class I applications are made online.</li>
            <li><strong>Navodaya, Sainik and other residential schools:</strong> entry is through the entrance tests on this page.</li>
            <li>Age limits for pre-primary classes and Class I are set by each state or UT and can change from year to year.</li>
          </ul>
          <p>Always check dates on the official notice linked with each entry before applying.</p>
        </aside>
      </div>
    </>
  );
}

export function NotificationsPage() {
  useDocumentTitle('Latest admission notifications');
  // Every Navodaya Vidyalaya has the same national cycle (one entrance test), so they are summarised once instead of
  // filling the list with hundreds of identical entries; the toggle brings them back.
  const [params, setParams] = useState<AdmissionListParams>({ sortBy: 'updated', page: 0, size: 20, excludeNetwork: 'JAWAHAR_NAVODAYA_VIDYALAYA' });
  const classes = useApi(() => referenceService.classes(), []);
  const state = useApi(() => admissionService.list(params), [JSON.stringify(params)]);
  const set = (patch: Partial<AdmissionListParams>) => setParams((p) => ({ ...p, ...patch, page: 0 }));
  const jnvHidden = params.excludeNetwork === 'JAWAHAR_NAVODAYA_VIDYALAYA';

  return (
    <>
      <PageHeader title="Latest admission notifications" subtitle="Admission cycles recently added or updated from official notices." />
      <div className="container-page py-8">
        <section aria-labelledby="jnvst-heading" className="card mb-4 flex flex-wrap items-center justify-between gap-3 border-brand-100 bg-brand-50/60 p-4 text-sm">
          <div className="min-w-0">
            <h2 id="jnvst-heading" className="font-semibold text-ink">Navodaya Vidyalayas: one national entrance test</h2>
            <p className="text-slate-600">
              Admission to Class VI in every Jawahar Navodaya Vidyalaya is through the JNV Selection Test (JNVST). Dates,
              eligibility and the official prospectus are in the <Link to="/exams/jnvst" className="link">JNVST guide</Link> and
              on each JNV&apos;s page.
            </p>
          </div>
          <label className="flex shrink-0 items-center gap-2 text-slate-700">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={!jnvHidden}
              onChange={(e) => set({ excludeNetwork: e.target.checked ? undefined : 'JAWAHAR_NAVODAYA_VIDYALAYA' })} />
            Show each Navodaya Vidyalaya in the list
          </label>
        </section>
        <div className="card mb-4 flex flex-wrap items-end gap-3 p-4 text-sm">
          <label><span className="label">Status</span>
            <select className="input" value={params.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as AdmissionStatus | undefined })}>
              <option value="">Any</option>
              {(Object.keys(admissionStatusLabel) as AdmissionStatus[]).map((s) => <option key={s} value={s}>{admissionStatusLabel[s]}</option>)}
            </select>
          </label>
          <label><span className="label">Category</span>
            <select className="input" value={params.category ?? ''} onChange={(e) => set({ category: (e.target.value || undefined) as AdmissionCategory | undefined })}>
              <option value="">Any</option>
              {(Object.keys(admissionCategoryLabel) as AdmissionCategory[]).map((c) => <option key={c} value={c}>{admissionCategoryLabel[c]}</option>)}
            </select>
          </label>
          <label><span className="label">Class</span>
            <select className="input" value={params.classCode ?? ''} onChange={(e) => set({ classCode: e.target.value || undefined })}>
              <option value="">Any</option>
              {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </label>
          <label><span className="label">Sort</span>
            <select className="input" value={params.sortBy} onChange={(e) => set({ sortBy: e.target.value as AdmissionListParams['sortBy'] })}>
              <option value="updated">Recently updated</option>
              <option value="deadline">Deadline</option>
              <option value="start">Start date</option>
            </select>
          </label>
        </div>
        <AsyncContent state={state} isEmpty={(d) => d.content.length === 0} empty={<EmptyState title="No admission notifications match." />}>
          {(data) => (
            <>
              <div className="space-y-4">{data.content.map((a) => <AdmissionCard key={a.id} admission={a} showSchool />)}</div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => setParams((x) => ({ ...x, page: p }))} />
            </>
          )}
        </AsyncContent>
      </div>
    </>
  );
}
