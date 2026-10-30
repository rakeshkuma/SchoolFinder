import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdmissionStatusBadge } from '../components/common/Badges';
import { MoreFilters } from '../components/common/FilterSheet';
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

const GUIDE_SECTIONS = [
  { id: 'process', label: 'Admission process' },
  { id: 'eligibility', label: 'Eligibility' },
  { id: 'dates', label: 'Important dates' },
  { id: 'documents', label: 'Documents required' },
  { id: 'hostel', label: 'Hostel information' },
] as const;

/**
 * General guidance on how school admissions work in India. Rules differ by state, board and school, so every
 * section points back to the official notice; nothing here replaces it.
 */
export function AdmissionGuidePage() {
  useDocumentTitle('School admission guide: process, eligibility and documents');
  return (
    <>
      <PageHeader eyebrow="Admissions" title="School admission guide"
        subtitle="How school admission usually works in India — the steps, age rules, documents and what to check about hostels. Rules differ by state, board and school: the school's official notice is always the final word.">
        <nav aria-label="On this page" className="flex flex-wrap gap-2">
          {GUIDE_SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">{s.label}</a>
          ))}
        </nav>
      </PageHeader>
      <div className="container-page grid gap-8 py-8 lg:grid-cols-[1fr_320px]">
        <div className="prose-page min-w-0 space-y-10 text-[15px] leading-relaxed text-slate-700">
          <GuideSection id="process" title="Admission process">
            <ol className="list-decimal space-y-2 pl-5">
              <li><strong>Shortlist schools</strong> — compare board, distance, classes and official fees. <Link to="/schools" className="link">Find schools</Link> · <Link to="/compare" className="link">compare them</Link>.</li>
              <li><strong>Read each school&apos;s admission notice</strong> — seats per class, criteria, fee and the last date. Schools publish it on their website or notice board.</li>
              <li><strong>Register or apply</strong> — online or on a paper form, by the deadline. Many schools charge a registration fee; the notice states it.</li>
              <li><strong>Selection</strong> — for the entry classes of elementary education, the Right to Education Act does not allow schools to screen children or parents; schools use published criteria (such as distance or siblings) or a draw. For higher classes, some schools hold an admission test or look at previous results.</li>
              <li><strong>Lists and confirmation</strong> — the school publishes a selection list. Bring the documents for verification and pay the fee by the date given, or the seat may go to the next child.</li>
            </ol>
            <p className="mt-3">
              <strong>Reserved seats:</strong> under Section 12(1)(c) of the Right to Education Act, private unaided (non-minority) schools reserve at least
              25% of entry-level seats for children from economically weaker sections and disadvantaged groups. The state or UT runs this process, usually
              through a central online application and draw.
            </p>
            <p className="mt-3">
              <strong>Government residential schools</strong> such as Navodaya Vidyalayas and Sainik Schools admit through entrance tests — see the{' '}
              <Link to="/exams" className="link">entrance exam guides</Link>. <strong>Kendriya Vidyalayas</strong> follow the admission guidelines KVS publishes each year.
            </p>
          </GuideSection>

          <GuideSection id="eligibility" title="Eligibility">
            <ul className="list-disc space-y-2 pl-5">
              <li><strong>Age for Class I and pre-primary:</strong> each state and UT notifies its own minimum age and cut-off date. The Ministry of Education has asked states to set the minimum age for Class I at six years, in line with the National Education Policy 2020; check your state&apos;s current notification.</li>
              <li><strong>Higher classes:</strong> the child must have passed the previous class. Schools usually ask for a transfer certificate and the last report card, and may hold a test.</li>
              <li><strong>Class XI:</strong> streams and subjects often depend on Class X results and the seats the school has in each stream.</li>
              <li><strong>Entrance-test schools:</strong> class, age and domicile rules are set in each exam&apos;s official notice — the <Link to="/exams/finder" className="link">exam finder</Link> shows which tests may fit.</li>
            </ul>
          </GuideSection>

          <GuideSection id="dates" title="Important dates">
            <p>
              Admission dates differ by state, school and class, and change every year. We list admission cycles recorded from official notices, with the
              days left until each deadline.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to="/admissions" className="btn-primary">Open and upcoming admissions</Link>
              <Link to="/admissions/notifications" className="btn-secondary">Latest notifications</Link>
              <Link to="/exams/calendar" className="btn-secondary">Entrance exam calendar</Link>
            </div>
          </GuideSection>

          <GuideSection id="documents" title="Documents required">
            <p>Documents commonly asked for — the school&apos;s notice lists the exact ones, and the formats it accepts:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Birth certificate of the child (proof of age).</li>
              <li>Proof of residence of the parents or guardian.</li>
              <li>Recent passport-size photographs of the child (and of parents, where asked).</li>
              <li>Identity documents of the child and parents, where the school or state asks for them.</li>
              <li>For classes above the entry class: transfer certificate and the last report card; a counter-signed transfer certificate may be needed when moving from another state or board.</li>
              <li>For reserved seats: category certificate, and income certificate for economically weaker sections, issued by the competent authority.</li>
              <li>Medical or disability certificate, where relevant to the child&apos;s needs.</li>
            </ul>
            <p className="mt-3 text-sm text-slate-500">Keep photocopies and a scanned set ready; many applications are made online.</p>
          </GuideSection>

          <GuideSection id="hostel" title="Hostel information">
            <p>Before applying to a boarding school, ask the school (and check its official prospectus) about:</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li>Whether boarding is offered for your child&apos;s class and gender, and how many places there are.</li>
              <li>Hostel and mess fees, which are often charged separately from tuition, and any refundable deposit.</li>
              <li>Who looks after the children — wardens and house parents — and how many children each looks after.</li>
              <li>Medical care: a nurse or doctor on campus, and the nearest hospital.</li>
              <li>Food, laundry, study hours, phone and visiting rules, and leave and holidays.</li>
              <li>Safety: fire safety arrangements and how the campus is secured.</li>
            </ul>
            <p className="mt-3">
              Where a school publishes these facts, they appear on its profile&apos;s Boarding tab. <Link to="/boarding" className="link">Browse boarding schools →</Link>
            </p>
          </GuideSection>
        </div>
        <aside className="h-fit space-y-3 lg:sticky lg:top-24">
          <div className="card p-5 text-sm">
            <p className="font-semibold text-ink">This is general guidance</p>
            <p className="mt-1 text-slate-600">
              It is written by India School Finder from the rules that apply across India. It is not legal advice and does not replace any school&apos;s,
              board&apos;s or state&apos;s official notice.
            </p>
          </div>
          <nav aria-label="Guide sections" className="card p-5 text-sm">
            <p className="font-semibold text-ink">On this page</p>
            <ul className="mt-2 space-y-1.5">
              {GUIDE_SECTIONS.map((s) => <li key={s.id}><a href={`#${s.id}`} className="link">{s.label}</a></li>)}
            </ul>
          </nav>
        </aside>
      </div>
    </>
  );
}

function GuideSection({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24">
      <h2 id={`${id}-h`} className="font-display text-2xl font-bold text-ink">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function NotificationsPage() {
  useDocumentTitle('Latest admission notifications');
  // Every Navodaya Vidyalaya has the same national cycle (one entrance test), so they are summarised once instead of
  // filling the list with hundreds of identical entries; the toggle brings them back.
  const [params, setParams] = useState<AdmissionListParams>({ sortBy: 'updated', page: 0, size: 20, excludeNetwork: 'JAWAHAR_NAVODAYA_VIDYALAYA' });
  const classes = useApi(() => referenceService.classes(), []);
  const states = useApi(() => locationService.states(), []);
  const boards = useApi(() => referenceService.boards(), []);
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
        {(() => {
          const field = (id: string, label: string, control: React.ReactNode) => (
            <label className="block text-sm" htmlFor={id}><span className="label">{label}</span>{control}</label>
          );
          const stateSelect = (id: string) => field(id, 'State', (
            <select id={id} className="input" value={params.state ?? ''} onChange={(e) => set({ state: e.target.value || undefined })}>
              <option value="">All of India</option>
              {(states.data ?? []).filter((s) => s.schoolCount > 0).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          ));
          const classSelect = (id: string) => field(id, 'Class', (
            <select id={id} className="input" value={params.classCode ?? ''} onChange={(e) => set({ classCode: e.target.value || undefined })}>
              <option value="">Any class</option>
              {(classes.data ?? []).map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          ));
          const boardSelect = (id: string) => field(id, 'Board', (
            <select id={id} className="input" value={params.board ?? ''} onChange={(e) => set({ board: e.target.value || undefined })}>
              <option value="">Any board</option>
              {(boards.data ?? []).map((b) => <option key={b.code} value={b.code}>{b.code === 'CISCE' ? 'ICSE / ISC' : b.code}</option>)}
            </select>
          ));
          const more = (
            <>
              {field('am-status', 'Status', (
                <select id="am-status" className="input" value={params.status ?? ''} onChange={(e) => set({ status: (e.target.value || undefined) as AdmissionStatus | undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(admissionStatusLabel) as AdmissionStatus[]).map((s) => <option key={s} value={s}>{admissionStatusLabel[s]}</option>)}
                </select>
              ))}
              {field('am-category', 'Seat category', (
                <select id="am-category" className="input" value={params.category ?? ''} onChange={(e) => set({ category: (e.target.value || undefined) as AdmissionCategory | undefined })}>
                  <option value="">Any</option>
                  {(Object.keys(admissionCategoryLabel) as AdmissionCategory[]).map((c) => <option key={c} value={c}>{admissionCategoryLabel[c]}</option>)}
                </select>
              ))}
            </>
          );
          const moreCount = [params.status, params.category].filter(Boolean).length;
          const clearAll = () => setParams((p) => ({ sortBy: p.sortBy, page: 0, size: p.size, excludeNetwork: p.excludeNetwork }));
          const resultLabel = state.data ? `${state.data.totalElements} notification${state.data.totalElements === 1 ? '' : 's'}` : undefined;
          return (
            <div className="card mb-4 flex flex-wrap items-end gap-3 p-4">
              <div className="hidden flex-1 gap-3 sm:grid sm:grid-cols-3">{stateSelect('af-state')}{classSelect('af-class')}{boardSelect('af-board')}</div>
              <div className="hidden sm:block">
                <MoreFilters activeCount={moreCount} resultLabel={resultLabel} onClearAll={clearAll}>{more}</MoreFilters>
              </div>
              <div className="sm:hidden">
                <MoreFilters label="Filters" resultLabel={resultLabel} onClearAll={clearAll}
                  activeCount={moreCount + [params.state, params.classCode, params.board].filter(Boolean).length}>
                  {stateSelect('as-state')}{classSelect('as-class')}{boardSelect('as-board')}{more}
                </MoreFilters>
              </div>
              <div className="ml-auto w-full sm:w-48">
                {field('af-sort', 'Sort by', (
                  <select id="af-sort" className="input" value={params.sortBy} onChange={(e) => set({ sortBy: e.target.value as AdmissionListParams['sortBy'] })}>
                    <option value="updated">Recently updated</option>
                    <option value="deadline">Deadline</option>
                    <option value="start">Start date</option>
                  </select>
                ))}
              </div>
            </div>
          );
        })()}
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
