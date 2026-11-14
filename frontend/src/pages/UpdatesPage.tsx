import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent } from '../components/common/States';
import { UpdateCard } from '../components/home/UpdateCard';
import { UPDATE_TABS } from '../components/home/updateVisuals';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { updateService, type UpdateCategory } from '../services/publicApi';

const CATEGORIES: UpdateCategory[] = ['ADMISSION', 'EXAM', 'PREP', 'JOB'];
const PAGE_SIZE = 12;

/** Every current school and exam update, newest and most urgent first, by kind; the header's "Notifications". */
export function UpdatesPage() {
  useDocumentTitle('Latest school & exam updates');
  const [params] = useSearchParams();
  const category = CATEGORIES.find((c) => c === params.get('category'));
  const page = Math.max(0, Number.parseInt(params.get('page') ?? '0', 10) || 0);
  const state = useApi(() => updateService.list({ category, page, size: PAGE_SIZE }), [category, page]);
  const href = (c: UpdateCategory | undefined, p = 0) => {
    const q = new URLSearchParams();
    if (c) q.set('category', c);
    if (p > 0) q.set('page', String(p));
    return `/updates${q.size ? `?${q}` : ''}`;
  };
  const label = UPDATE_TABS.find((t) => t.id === (category ?? 'ALL'))?.label ?? 'All';

  return (
    <>
      <PageHeader eyebrow="Notifications" title="Latest School & Exam Updates"
        subtitle="Admission deadlines, entrance exam dates and notices from official sources, and new practice sets: the most urgent first." />
      <div className="container-page py-8">
        <nav aria-label="Kind of update" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-1 sm:mx-0 sm:px-0">
          {UPDATE_TABS.map((t) => {
            const c = t.id === 'ALL' ? undefined : t.id;
            const active = c === category;
            return (
              <Link key={t.id} to={href(c)} aria-current={active ? 'page' : undefined}
                className={`shrink-0 rounded-full px-5 py-2 text-sm font-bold transition ${active
                  ? 'bg-royal-600 text-white shadow-[0_8px_18px_-10px_rgba(11,92,213,0.9)]'
                  : 'bg-white text-navy ring-1 ring-slate-200 hover:text-royal-700 hover:ring-royal-200'}`}>
                {t.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          <AsyncContent state={state} isEmpty={(d) => d.content.length === 0}
            empty={(
              <div className="rounded-2xl bg-white p-6 text-center text-sm text-slate-600 ring-1 ring-slate-200">
                <p>{category === 'JOB'
                  ? 'No job alerts right now. Teaching and school job notices appear here only with their official source.'
                  : `No ${category ? `${label.toLowerCase()} ` : ''}updates right now.`}</p>
                <p className="mt-2">
                  <Link to="/exams/calendar" className="link">Exam calendar</Link>{' · '}
                  <Link to="/admissions" className="link">Open admissions</Link>{' · '}
                  <Link to="/admissions/notifications" className="link">Admission notifications</Link>
                </p>
              </div>
            )}>
            {(data) => (
              <>
                <p className="mb-4 text-sm text-slate-600" aria-live="polite">
                  {data.totalElements.toLocaleString('en-IN')} {data.totalElements === 1 ? 'update' : 'updates'}
                  {category ? ` in ${label}` : ''}
                </p>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {data.content.map((u) => <UpdateCard key={u.id} item={u} />)}
                </div>
                <Pagination page={data.page} totalPages={data.totalPages} hrefFor={(p) => href(category, p)} />
              </>
            )}
          </AsyncContent>
        </div>

        <section aria-labelledby="how-updates" className="mt-12 max-w-3xl rounded-2xl bg-white p-6 text-sm leading-relaxed text-slate-700 ring-1 ring-slate-200">
          <h2 id="how-updates" className="font-display text-lg font-bold text-navy">Where these updates come from</h2>
          <ul className="mt-3 list-disc space-y-1.5 pl-5">
            <li>Exam dates and admission deadlines come from the official notices we record, and each one links its source.</li>
            <li>Practice updates are SchoolDhundo’s own question sets; they are not official exam questions.</li>
            <li>Other notices, such as job alerts, are added by our editors only with an official source, and drop off when they expire.</li>
            <li>
              Badges follow the dates: <strong>Closing soon</strong> means the last date is within 14 days, <strong>New</strong> that it was
              published in the last 7 days, <strong>Open</strong> that applications are open, <strong>Updated</strong> that it changed in
              the last 7 days, and <strong>Upcoming</strong> that its date is still ahead.
            </li>
          </ul>
          <p className="mt-3">
            Always confirm dates with the official notice before you apply. Spotted a mistake?{' '}
            <Link to="/contact?topic=CORRECTION" className="link">Tell us</Link>.
          </p>
        </section>
      </div>
    </>
  );
}
