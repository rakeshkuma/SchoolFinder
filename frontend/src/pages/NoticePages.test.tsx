import { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { NoticeDetail, NoticeList, UpdateItem } from '../services/publicApi';
import { ApiError } from '../services/http';
import { AdmissionNoticePage, JobNoticePage, JobsPage } from './NoticePages';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const list = vi.fn();
const detail = vi.fn();
vi.mock('../services/publicApi', () => ({
  noticeService: { list: (...a: unknown[]) => list(...a), detail: (...a: unknown[]) => detail(...a) },
  updateService: { syncStatus: () => Promise.resolve({ lastCheckedAt: null, nextCheckAt: null, schedule: 'Daily at 6:00 AM IST', sources: 20 }) },
}));

const item = (title: string, extra: Partial<UpdateItem> = {}): UpdateItem => ({
  id: `official:${title}`, category: 'JOB', title, summary: 'Sainik School Korukonda published this notice on 17 Nov 2026.',
  imageUrl: null, publishedOn: '2026-11-17', updatedAt: null, eventDate: '2026-12-01', eventLabel: 'Last date', deadline: true,
  badge: 'NEW', sourceUrl: 'https://www.sainikschoolkorukonda.org/x.pdf', sourceName: 'Sainik School Korukonda',
  linkPath: '/jobs/sainik-school-korukonda-tgt-maths', actionLabel: 'View Notice', verified: false, origin: 'OFFICIAL_SOURCE',
  topic: 'sainik-school-korukonda', applicationStatus: 'OPEN', noticeType: 'OPENING', ...extra,
});

const listing = (items: UpdateItem[]): NoticeList => ({
  category: 'JOB',
  page: { content: items, page: 0, size: 12, totalElements: items.length, totalPages: 1, first: true, last: true },
  facets: {
    states: [{ value: 'AP', label: 'Andhra Pradesh', count: 1 }, { value: 'DL', label: 'Delhi', count: 2 }],
    sectors: [{ value: 'GOVERNMENT', label: 'Government', count: 3 }], staff: [{ value: 'TEACHING', label: 'Teaching', count: 3 }],
    posts: [{ value: 'TGT', label: 'TGT (Trained Graduate Teacher)', count: 2 }], subjects: [{ value: 'Mathematics', label: 'Mathematics', count: 1 }],
    statuses: [{ value: 'OPEN', label: 'Apply now', count: 3 }], classes: [], sessions: [],
  },
  current: 3,
});

const notice = (extra: Partial<NoticeDetail> = {}): NoticeDetail => ({
  id: 7, slug: 'sainik-school-korukonda-tgt-maths', category: 'JOB', path: '/jobs/sainik-school-korukonda-tgt-maths',
  title: 'Sainik School Korukonda: Application for TGT Maths', officialTitle: 'Application for TGT Maths',
  summary: 'Sainik School Korukonda published this notice on 12 Sep 2026: recruitment for TGT (Mathematics).',
  institutionName: 'Sainik School Korukonda', campus: null, school: { slug: 'sainik-school-vizianagaram', name: 'Sainik School Korukonda', city: 'Vizianagaram', stateCode: 'AP' },
  sector: 'GOVERNMENT', boarding: true, stateCode: 'AP', stateName: 'Andhra Pradesh', stateSlug: 'andhra-pradesh', city: 'Vizianagaram',
  noticeType: 'OPENING', noticeTypeLabel: 'Recruitment notice', applicationStatus: 'DATE_NOT_ANNOUNCED',
  applicationStatusLabel: 'Last date not announced', publishedOn: '2026-09-12', dateConfirmed: true, opensOn: null, closesOn: null,
  examOn: null, examLabel: 'Exam / interview date', academicSession: null, classes: null,
  postTypes: [{ value: 'TGT', label: 'TGT (Trained Graduate Teacher)', count: 0 }], subjects: ['Mathematics'], staffKind: 'TEACHING',
  employmentType: null, vacancies: null, eligibility: null, experience: null, tetRequirement: null, ageLimit: null, salaryText: null,
  applicationFee: null, selectionProcess: null, applyUrl: null, sourceUrl: 'https://www.sainikschoolkorukonda.org/tgt-maths.pdf',
  sourceName: 'Sainik School Korukonda', sourceDomain: 'sainikschoolkorukonda.org', reliability: 'Official source',
  verification: 'OFFICIAL_SOURCE', lastVerifiedAt: '2026-11-19T00:30:00Z', lastChangedAt: null, current: true, indexable: true,
  positions: [], answers: [{ question: 'What is the last date to apply?', answer: 'The official listing gives no last date, so this page cannot say.', linkUrl: null, linkLabel: null },
    { question: 'Where is the official notice?', answer: 'On Sainik School Korukonda’s website.', linkUrl: 'https://www.sainikschoolkorukonda.org/tgt-maths.pdf', linkLabel: 'Open the official notice' }],
  related: [], ...extra,
});

const flush = () => act(async () => { await new Promise((r) => setTimeout(r, 0)); });

function mount(path: string) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  let root: Root;
  act(() => {
    root = createRoot(container);
    root.render(
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/jobs/:slug" element={<JobNoticePage />} />
          <Route path="/admissions/:slug" element={<AdmissionNoticePage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
  return { container, unmount: () => { act(() => root.unmount()); container.remove(); } };
}

describe('school jobs and notice pages', () => {
  let view: ReturnType<typeof mount> | undefined;
  beforeEach(() => { list.mockReset(); detail.mockReset(); });
  afterEach(() => view?.unmount());

  it('lists current jobs as update cards with filters built from the choices the server offers', async () => {
    list.mockResolvedValue(listing([item('Sainik School Korukonda: TGT Maths'), item('DSSSB: PGT recruitment')]));
    view = mount('/jobs?state=DL');
    await flush();
    expect(list).toHaveBeenCalledWith('JOB', expect.objectContaining({ state: 'DL', past: false, page: 0 }));
    const text = view.container.textContent ?? '';
    expect(text).toContain('School Teacher & Staff Jobs');
    expect(text).toContain('Sainik School Korukonda: TGT Maths');
    expect(text).toContain('2 notices matching your filters');
    const state = view.container.querySelector('select') as HTMLSelectElement;
    expect(state.value).toBe('DL');
    expect([...state.options].map((o) => o.textContent)).toContain('Delhi (2)');
    // Cards open the notice's page here, not the PDF.
    expect(view.container.querySelector('a[href="/jobs/sainik-school-korukonda-tgt-maths"]')).not.toBeNull();
    expect(text).toContain('Clear filters');
  });

  it('says plainly when nothing matches', async () => {
    list.mockResolvedValue(listing([]));
    view = mount('/jobs?post=PRT');
    await flush();
    expect(view.container.textContent).toContain('No current school job notices match these filters.');
  });

  it('shows a notice with its status, the facts given, "not given" for a missing last date, answers and the official link', async () => {
    detail.mockResolvedValue(notice());
    view = mount('/jobs/sainik-school-korukonda-tgt-maths');
    await flush();
    const text = view.container.textContent ?? '';
    expect(text).toContain('Sainik School Korukonda: Application for TGT Maths');
    expect(text).toContain('Last date not announced');
    expect(text).toContain('Not given in the official listing');
    expect(text).toContain('Government, residential (boarding)');
    expect(text).toContain('What is the last date to apply?');
    expect(text).toContain('Taken from the official website by our daily check');
    expect(text).not.toMatch(/salary|₹/i); // no pay was published, so none is shown
    const official = view.container.querySelector('a[href="https://www.sainikschoolkorukonda.org/tgt-maths.pdf"]') as HTMLAnchorElement;
    expect(official.getAttribute('rel')).toContain('noopener');
    expect(view.container.querySelector('a[href="/schools/sainik-school-vizianagaram"]')).not.toBeNull();
  });

  it('marks a closed notice as no longer current', async () => {
    detail.mockResolvedValue(notice({ applicationStatus: 'CLOSED', applicationStatusLabel: 'Closed', closesOn: '2026-10-01', current: false }));
    view = mount('/jobs/sainik-school-korukonda-tgt-maths');
    await flush();
    expect(view.container.textContent).toContain('This notice is no longer current: its last date was');
  });

  it('answers a missing notice with a way back', async () => {
    detail.mockRejectedValue(new ApiError('Not found', 404));
    view = mount('/jobs/gone');
    await flush();
    expect(view.container.textContent).toContain('This notice is not available.');
    expect(view.container.querySelector('a[href="/jobs"]')).not.toBeNull();
  });

  it('sends a job opened under /admissions to its own address', async () => {
    detail.mockResolvedValue(notice());
    view = mount('/admissions/sainik-school-korukonda-tgt-maths');
    await flush();
    // Navigated to /jobs/... where the job route renders the same notice.
    expect(view.container.textContent).toContain('Recruitment notice');
    expect(detail).toHaveBeenCalledWith('sainik-school-korukonda-tgt-maths');
  });
});
