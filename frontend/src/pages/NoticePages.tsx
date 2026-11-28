import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { MoreFilters } from '../components/common/FilterSheet';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, Spinner } from '../components/common/States';
import { SyncNote, UpdateGrid } from '../components/home/HomeUpdates';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  noticeService, updateService, type ApplicationStatus, type NoticeDetail, type NoticeFacet, type NoticeFacets, type NoticeFilters,
} from '../services/publicApi';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 12;

/** Status colours (white text keeps at least 4.5:1 on each). */
const STATUS_STYLE: Record<ApplicationStatus, string> = {
  OPEN: 'bg-emerald-700 text-white',
  CLOSING_SOON: 'bg-flame-700 text-white',
  OPENING_SOON: 'bg-royal-600 text-white',
  CLOSED: 'bg-slate-600 text-white',
  DATE_NOT_ANNOUNCED: 'bg-slate-100 text-slate-800 ring-1 ring-slate-300',
};

const FILTERS: { key: keyof NoticeFilters; label: string; facet: (f: NoticeFacets) => NoticeFacet[]; any: string }[] = [
  { key: 'state', label: 'State', facet: (f) => f.states, any: 'All states' },
  { key: 'sector', label: 'School type', facet: (f) => f.sectors, any: 'Government, private or boarding' },
  { key: 'staff', label: 'Teaching or not', facet: (f) => f.staff, any: 'Teaching and non-teaching' },
  { key: 'post', label: 'Post', facet: (f) => f.posts, any: 'Any post' },
  { key: 'subject', label: 'Subject', facet: (f) => f.subjects, any: 'Any subject' },
  { key: 'status', label: 'Applications', facet: (f) => f.statuses, any: 'Any status' },
];

/** Shown on the page itself; the others sit under "More filters" (a bottom sheet on phones). */
const MAIN_FILTERS: (keyof NoticeFilters)[] = ['state', 'post'];

function FilterSelect({ filter, facets, value, onChange, className }: {
  filter: (typeof FILTERS)[number]; facets: NoticeFacets | null; value: string; onChange: (value: string) => void; className: string;
}) {
  const options = facets ? filter.facet(facets) : [];
  return (
    <label className={`text-sm ${className}`}>
      <span className="label">{filter.label}</span>
      <select className="input mt-1 w-full" value={value} disabled={!facets} onChange={(e) => onChange(e.target.value)}>
        <option value="">{filter.any}</option>
        {value && !options.some((o) => o.value === value) && <option value={value}>{value}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label} ({o.count})</option>)}
      </select>
    </label>
  );
}

/**
 * School jobs: teaching and school staff vacancies from official sources, open ones first (nearest last date first),
 * with filters for state, school type, teaching or not, post, subject and status. Filters live in the address, so a
 * filtered list can be shared; search engines index only the plain /jobs page (its canonical address).
 */
export function JobsPage() {
  useDocumentTitle('School teacher jobs: government and private',
    'Teaching and school staff vacancies from official sources, by state, post and subject, with last dates.');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const filters: NoticeFilters = {};
  for (const f of FILTERS) {
    const v = params.get(f.key);
    if (v) (filters as Record<string, string>)[f.key] = v;
  }
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0);
  const past = params.get('view') === 'past';
  const state = useApi(() => noticeService.list('JOB', { ...filters, past, page, size: PAGE_SIZE }),
    [params.toString()]);
  const sync = useApi(() => updateService.syncStatus(), [], true, 'home.sync');
  const facets = state.data?.facets ?? null;
  const href = (changes: Record<string, string | null>) => {
    const q = new URLSearchParams(params);
    Object.entries(changes).forEach(([k, v]) => (v ? q.set(k, v) : q.delete(k)));
    if (!('page' in changes)) q.delete('page');
    return `/jobs${q.size ? `?${q}` : ''}`;
  };
  const active = FILTERS.some((f) => params.get(f.key));

  return (
    <>
      <PageHeader eyebrow="School jobs" title="School Teacher & Staff Jobs"
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/jobs', label: 'School jobs' }]} />}
        subtitle={<>Teaching and school staff vacancies from official sources: government, private and boarding schools. Open ones come
          first, nearest last date first. Every notice links its official source; SchoolDhundo does not take applications.</>} />
      <div className="container-page py-8">
        <form aria-label="Filter school jobs" className="flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4 ring-1 ring-slate-200"
          onSubmit={(e) => e.preventDefault()}>
          {FILTERS.filter((f) => MAIN_FILTERS.includes(f.key)).map((f) => (
            <FilterSelect key={f.key} filter={f} facets={facets} value={params.get(f.key) ?? ''}
              onChange={(v) => navigate(href({ [f.key]: v || null }))} className="min-w-0 flex-1 basis-56" />
          ))}
          <MoreFilters activeCount={FILTERS.filter((f) => !MAIN_FILTERS.includes(f.key) && params.get(f.key)).length}
            resultLabel={state.data ? `${state.data.page.totalElements.toLocaleString('en-IN')} notices` : undefined}
            onClearAll={() => navigate('/jobs')}>
            {FILTERS.filter((f) => !MAIN_FILTERS.includes(f.key)).map((f) => (
              <FilterSelect key={f.key} filter={f} facets={facets} value={params.get(f.key) ?? ''}
                onChange={(v) => navigate(href({ [f.key]: v || null }))} className="block" />
            ))}
          </MoreFilters>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
          <SyncNote status={sync.data} />
          <p className="flex flex-wrap gap-x-4 text-sm font-bold">
            {active && <Link to="/jobs" className="text-royal-700 hover:underline">Clear filters</Link>}
            <Link to={href({ view: past ? null : 'past' })} className="text-royal-700 hover:underline">
              {past ? 'Back to current jobs' : 'Past job notices (expired)'}
            </Link>
          </p>
        </div>

        <div className="mt-6">
          <AsyncContent state={state} isEmpty={(d) => d.page.content.length === 0}
            empty={(
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600 ring-1 ring-slate-200">
                <p>{past ? 'No school job notices expired in the last 90 days.' : active
                  ? 'No current school job notices match these filters.'
                  : 'No school job notices are current right now. Teaching and school job notices appear here only with their official source.'}</p>
                <p className="mt-2"><Link to="/updates?category=JOB" className="link">All job updates</Link>{' · '}
                  <Link to="/admissions" className="link">Open admissions</Link></p>
              </div>
            )}>
            {(data) => (
              <>
                <p className="mb-4 text-sm text-slate-600" aria-live="polite">
                  {data.page.totalElements.toLocaleString('en-IN')} {past ? 'past ' : ''}{data.page.totalElements === 1 ? 'notice' : 'notices'}
                  {active ? ' matching your filters' : ''}{past ? ', expired in the last 90 days' : ''}
                </p>
                <UpdateGrid items={data.page.content} />
                <Pagination page={data.page.page} totalPages={data.page.totalPages} hrefFor={(p) => href({ page: p > 0 ? String(p) : null })} />
              </>
            )}
          </AsyncContent>
        </div>

        <section aria-labelledby="how-jobs" className="mt-12 max-w-3xl rounded-2xl bg-white p-6 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          <h2 id="how-jobs" className="font-display text-lg font-bold text-navy">Where these jobs come from</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Our daily check (6:00 AM India time) reads official websites only: KVS, Navodaya Vidyalaya Samiti, DSSSB, BPSC, NESTS (EMRS),
              Odisha Adarsha Vidyalaya Sangathan, Sainik Schools, and the careers pages of boarding schools such as Mayo College.</li>
            <li>A notice appears on its own only when the official site gives its date. Notices without a date, or that name no school
              post, wait for an editor. From commissions and selection boards we keep school posts only.</li>
            <li>Post, subject and last date are read from the official title. If the official notice gives no last date, we say so; we never
              guess one, and we never estimate pay.</li>
            <li>Open, Closing soon, Upcoming and Closed follow the official dates. Notices drop off after their last date and stay under past
              notices for 90 days.</li>
          </ul>
          <p className="mt-3">Always confirm eligibility and dates in the official notice before you apply. Spotted a mistake?{' '}
            <Link to="/contact?topic=CORRECTION" className="link">Tell us</Link>.</p>
        </section>
      </div>
    </>
  );
}

const STAFF_LABEL = { TEACHING: 'Teaching', NON_TEACHING: 'Non-teaching', MIXED: 'Teaching and non-teaching' } as const;
const EMPLOYMENT_LABEL = { REGULAR: 'Regular', FULL_TIME: 'Full-time', CONTRACT: 'Contract or guest', PART_TIME: 'Part-time', TEMPORARY: 'Temporary' } as const;
const VERIFICATION_LABEL = {
  EDITOR_VERIFIED: 'Checked by a SchoolDhundo editor against the official notice.',
  OFFICIAL_SOURCE: 'Taken from the official website by our daily check: the title, date and link are the official site’s. Not yet checked by an editor.',
  EDITORIAL: 'Added by a SchoolDhundo editor, citing the official source.',
} as const;

function Fact({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-3 border-b border-slate-100 py-2.5 last:border-0">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-ink">{value}</dd>
    </div>
  );
}

/**
 * One admission or job notice: its status today, the facts the official source states (with "not given" where the
 * date that matters is missing), the posts, questions answered from those facts, and the official links. Closed or
 * expired notices stay readable, marked so.
 */
export function NoticePage({ category }: { category: 'JOB' | 'ADMISSION' }) {
  const { slug = '' } = useParams();
  const state = useApi(() => noticeService.detail(slug), [slug]);
  const d = state.data;
  const job = category === 'JOB';
  useDocumentTitle(d?.title ?? (job ? 'School job notice' : 'Admission notice'), d?.summary);
  if (state.error?.status === 404) {
    return (
      <div className="container-page py-12">
        <EmptyState title="This notice is not available.">
          <Link to={job ? '/jobs' : '/updates?category=ADMISSION'} className="link">{job ? 'See current school jobs' : 'See current admission notices'}</Link>
        </EmptyState>
      </div>
    );
  }
  if (!d) {
    return (
      <div className="container-page py-12">
        {state.error ? <EmptyState title="This notice could not be opened."><Link to="/updates" className="link">See all updates</Link></EmptyState>
          : <Spinner label="Loading notice…" />}
      </div>
    );
  }
  if (d.category !== category) return <Navigate to={d.path} replace />;
  return <NoticeView d={d} />;
}

/** /jobs/:slug */
export function JobNoticePage() {
  return <NoticePage category="JOB" />;
}

/** /admissions/:slug (the static /admissions/notifications and /admissions/guide pages take precedence). */
export function AdmissionNoticePage() {
  return <NoticePage category="ADMISSION" />;
}

function NoticeView({ d }: { d: NoticeDetail }) {
  const job = d.category === 'JOB';
  const opening = d.applicationStatus !== null;
  const walkIn = d.examLabel === 'Walk-in interview';
  const place = d.city && d.stateName ? `${d.city}, ${d.stateName}` : d.stateName ?? (d.stateCode ? null : 'All India');
  const posts = d.positions.length > 0 ? d.positions.map((p) => p.postName) : d.postTypes.map((p) => p.label);
  const kind = [d.sector === 'GOVERNMENT' ? 'Government' : d.sector === 'PRIVATE' ? 'Private' : null,
    d.boarding === true ? 'residential (boarding)' : d.boarding === false ? 'day' : null].filter(Boolean).join(', ');
  return (
    <>
      <PageHeader eyebrow={d.noticeTypeLabel} title={d.title} subtitle={d.summary}
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, job ? { to: '/jobs', label: 'School jobs' } : { to: '/admissions', label: 'Admissions' },
          { to: d.path, label: d.title }]} />}>
        <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-blue-100">
          {d.applicationStatus && (
            <span className={`rounded-md px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${STATUS_STYLE[d.applicationStatus]}`}>
              {d.applicationStatusLabel}
            </span>
          )}
          {d.institutionName && <span className="font-semibold text-white">{d.institutionName}</span>}
          <span>Published <time dateTime={d.publishedOn}>{formatDate(d.publishedOn)}</time></span>
          {d.lastVerifiedAt && <span>Last checked {new Date(d.lastVerifiedAt).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric' })}</span>}
        </p>
      </PageHeader>

      <div className="container-page grid max-w-5xl grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0 space-y-8">
          {!d.current && (
            <p role="status" className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
              This notice is no longer current{d.closesOn ? `: its last date was ${formatDate(d.closesOn)}` : ''}. It stays here for reference;
              check the official website for newer notices.
            </p>
          )}
          <section aria-labelledby="facts">
            <h2 id="facts" className="font-display text-xl font-bold text-navy">Key facts</h2>
            <dl className="mt-3 rounded-2xl bg-white px-4 text-sm ring-1 ring-slate-200">
              <Fact label={job ? 'Hiring' : 'Institution'} value={d.institutionName} />
              <Fact label="Campus" value={d.campus} />
              <Fact label="Location" value={place} />
              <Fact label="School type" value={kind || null} />
              <Fact label="Applications open" value={d.opensOn ? formatDate(d.opensOn) : null} />
              <Fact label={walkIn ? 'Walk-in interview' : 'Last date'}
                value={d.closesOn ? formatDate(d.closesOn) : opening ? 'Not given in the official listing' : null} />
              {!walkIn && <Fact label={d.examLabel} value={d.examOn ? formatDate(d.examOn) : null} />}
              <Fact label="Posts" value={posts.length ? posts.join(', ') : null} />
              <Fact label="Subjects" value={d.subjects.length ? d.subjects.join(', ') : null} />
              <Fact label="Number of posts" value={d.vacancies ? String(d.vacancies) : null} />
              <Fact label="Classes" value={d.classes} />
              <Fact label="Session" value={d.academicSession} />
              <Fact label="Staff" value={d.staffKind ? STAFF_LABEL[d.staffKind] : null} />
              <Fact label="Employment" value={d.employmentType ? EMPLOYMENT_LABEL[d.employmentType] : null} />
              <Fact label="Eligibility" value={d.eligibility} />
              <Fact label="Experience" value={d.experience} />
              <Fact label="TET / CTET" value={d.tetRequirement} />
              <Fact label="Age limit" value={d.ageLimit} />
              <Fact label="Pay (as published)" value={d.salaryText} />
              <Fact label="Application fee" value={d.applicationFee} />
              <Fact label="Selection" value={d.selectionProcess} />
            </dl>
            <p className="mt-2 text-xs text-slate-500">Only facts the official notice states are shown. Pay, fees and eligibility not listed here are
              in the official notice.</p>
          </section>

          {d.positions.length > 0 && (
            <section aria-labelledby="posts">
              <h2 id="posts" className="font-display text-xl font-bold text-navy">Posts in this notice</h2>
              <div className="mt-3 overflow-x-auto rounded-2xl bg-white ring-1 ring-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr><th className="px-4 py-2.5">Post</th><th className="px-4 py-2.5">Subject</th><th className="px-4 py-2.5">Posts</th></tr>
                  </thead>
                  <tbody>
                    {d.positions.map((p) => (
                      <tr key={p.id} className="border-t border-slate-100">
                        <td className="px-4 py-2.5 font-medium text-ink">{p.postName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.subject ?? '—'}</td>
                        <td className="px-4 py-2.5 text-slate-600">{p.vacancies ?? 'See notice'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {d.positions.every((p) => p.origin === 'TITLE') && (
                <p className="mt-2 text-xs text-slate-500">Read from the notice’s title; the official notice gives the number of posts and eligibility for each.</p>
              )}
            </section>
          )}

          {d.answers.length > 0 && (
            <section aria-labelledby="answers">
              <h2 id="answers" className="font-display text-xl font-bold text-navy">Questions and answers</h2>
              <dl className="mt-3 space-y-3">
                {d.answers.map((a) => (
                  <div key={a.question} className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                    <dt className="font-semibold text-ink">{a.question}</dt>
                    <dd className="mt-1 text-sm leading-relaxed text-slate-700">
                      {a.answer}{' '}
                      {a.linkUrl && <a href={a.linkUrl} target="_blank" rel="noopener noreferrer" className="link">{a.linkLabel}<span className="sr-only"> (opens in a new tab)</span></a>}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )}

          <section aria-labelledby="about-info" className="rounded-2xl bg-slate-50 p-5 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
            <h2 id="about-info" className="font-display text-base font-bold text-navy">About this information</h2>
            <p className="mt-2">{VERIFICATION_LABEL[d.verification]}</p>
            <p className="mt-2">The summary is SchoolDhundo’s own. Always confirm dates and eligibility in the official notice before you apply;
              SchoolDhundo does not take applications or fees. Spotted a mistake? <Link to="/contact?topic=CORRECTION" className="link">Tell us</Link>
              {' '}(<Link to="/corrections-policy" className="link">corrections policy</Link>).</p>
          </section>
        </article>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl bg-white p-5 ring-1 ring-slate-200">
            <h2 className="font-display text-base font-bold text-navy">Official source</h2>
            {d.sourceName && <p className="mt-1 text-sm text-slate-600">{d.sourceName}{d.sourceDomain ? ` (${d.sourceDomain})` : ''}</p>}
            <div className="mt-4 space-y-2">
              {d.sourceUrl && (
                <a href={d.sourceUrl} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full justify-center">
                  Open the official notice <Icon name="arrowRight" className="h-4 w-4" /><span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
              {d.applyUrl && (
                <a href={d.applyUrl} target="_blank" rel="noopener noreferrer" className="btn btn-secondary w-full justify-center">
                  Official application page<span className="sr-only"> (opens in a new tab)</span>
                </a>
              )}
            </div>
            {d.school && (
              <p className="mt-4 text-sm"><Link to={`/schools/${d.school.slug}`} className="link">{d.school.name}: school profile</Link></p>
            )}
          </div>
          <p className="text-sm">
            <Link to={job ? '/jobs' : '/updates?category=ADMISSION'} className="font-bold text-royal-700 hover:underline">
              {job ? 'All school jobs' : 'All admission notices'}
            </Link>
            {d.stateCode && job && <>{' · '}<Link to={`/jobs?state=${d.stateCode}`} className="font-bold text-royal-700 hover:underline">Jobs in {d.stateName ?? d.stateCode}</Link></>}
          </p>
        </aside>
      </div>

      {d.related.length > 0 && (
        <section aria-labelledby="related" className="container-page max-w-5xl pb-12">
          <h2 id="related" className="font-display text-xl font-bold text-navy">{job ? 'More school jobs' : 'More admission notices'}</h2>
          <div className="mt-4"><UpdateGrid items={d.related} /></div>
        </section>
      )}
    </>
  );
}
