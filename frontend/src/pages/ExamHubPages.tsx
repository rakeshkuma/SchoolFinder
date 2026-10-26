import { Link, useParams } from 'react-router-dom';
import { ExamCard } from '../components/exam/ExamCard';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, Spinner } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { examService, locationService } from '../services/publicApi';
import type { ExamDetail } from '../types/api';
import { formatDate } from '../utils/format';
import { classLabel, examModeLabel, romanClass } from '../utils/exams';
import { NotFoundPage } from './InfoPages';

function Crumbs({ here }: { here: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
      <ol className="flex flex-wrap items-center gap-1.5">
        <li><Link to="/" className="hover:text-brand-700">Home</Link> /</li>
        <li><Link to="/exams" className="hover:text-brand-700">Entrance exams</Link> /</li>
        <li aria-current="page" className="font-medium text-ink">{here}</li>
      </ol>
    </nav>
  );
}

function useStateNames() {
  const states = useApi(() => locationService.states(), []);
  return { list: states.data ?? [], name: (code: string) => states.data?.find((s) => s.code === code)?.name ?? code };
}

/** /exams/class/:n — exams that admit to one class. Only classes with at least one exam are linked or indexed. */
export function ExamClassPage() {
  const n = Number(useParams().n);
  const exams = useApi(() => examService.all(), []);
  const { name } = useStateNames();
  const valid = Number.isInteger(n) && n >= 1 && n <= 12;
  const label = valid ? `Class ${romanClass(n)}` : '';
  useDocumentTitle(valid ? `Entrance exams for ${label} admission` : undefined);
  if (!valid) return <NotFoundPage />;
  if (!exams.data) return <Spinner />;
  const list = exams.data.filter((e) => e.entryClasses.includes(n));
  const others = [...new Set(exams.data.flatMap((e) => e.entryClasses))].filter((c) => c !== n).sort((a, b) => a - b);
  if (list.length === 0) return <NotFoundPage />;
  return (
    <>
      <PageHeader eyebrow="Entrance exams by class" title={`Entrance exams for ${label} admission`}
        subtitle={`${list.length} exam${list.length === 1 ? '' : 's'} admit${list.length === 1 ? 's' : ''} students to ${label}. Each guide has the official eligibility, dates, pattern and syllabus, linked to the conducting body's notice.`} />
      <div className="container-page space-y-8 py-8">
        <Crumbs here={label} />
        <div className="grid gap-4 md:grid-cols-2">{list.map((e) => <ExamCard key={e.slug} exam={e} stateName={name} />)}</div>
        <section className="card p-5 text-sm text-slate-700">
          <h2 className="font-display text-lg font-bold text-ink">Not sure which fits your child?</h2>
          <p className="mt-1">The <Link to={`/exams/finder?class=${n - 1}`} className="link">exam finder</Link> checks class, state, school type and boarding together and lists the rules to confirm in each notice.
            Admission to {label} in most other schools is through the school&apos;s own process — see <Link to="/admissions" className="link">admissions</Link>.</p>
          {others.length > 0 && (
            <p className="mt-3">Other classes: {others.map((c, i) => (
              <span key={c}><Link to={`/exams/class/${c}`} className="link">Class {romanClass(c)}</Link>{i < others.length - 1 ? ' · ' : ''}</span>
            ))}</p>
          )}
        </section>
      </div>
    </>
  );
}

/** /exams/state/:slug — national exams open to the state plus its own state-level exams. */
export function ExamStatePage() {
  const { slug = '' } = useParams();
  const state = useApi(() => locationService.state(slug), [slug]);
  const exams = useApi(() => examService.all(), []);
  const { name } = useStateNames();
  useDocumentTitle(state.data ? `School entrance exams in ${state.data.name}` : undefined);
  if (state.error) return <NotFoundPage />;
  if (!state.data || !exams.data) return <Spinner />;
  const s = state.data;
  const own = exams.data.filter((e) => e.scope === 'STATE' && e.stateCodes.includes(s.code));
  const national = exams.data.filter((e) => e.scope === 'NATIONAL');
  return (
    <>
      <PageHeader eyebrow="Entrance exams by state" title={`School entrance exams in ${s.name}`}
        subtitle={own.length > 0
          ? `${own.length} exam${own.length === 1 ? '' : 's'} only for candidates from ${s.name}, and ${national.length} national exams open to them.`
          : `We have not yet recorded a state-level exam for ${s.name}. These ${national.length} national exams are open to its candidates.`} />
      <div className="container-page space-y-8 py-8">
        <Crumbs here={s.name} />
        {own.length > 0 && (
          <section aria-labelledby="own-heading">
            <h2 id="own-heading" className="font-display text-xl font-bold text-ink">Only for {s.name} candidates</h2>
            <div className="mt-3 grid gap-4 md:grid-cols-2">{own.map((e) => <ExamCard key={e.slug} exam={e} stateName={name} />)}</div>
          </section>
        )}
        <section aria-labelledby="nat-heading">
          <h2 id="nat-heading" className="font-display text-xl font-bold text-ink">National exams open to {s.name} candidates</h2>
          <p className="mt-1 text-sm text-slate-600">District or state rules still apply — for example, JNV tests are district-wise and Sainik School seats are split by home state.</p>
          <div className="mt-3 grid gap-4 md:grid-cols-2">{national.map((e) => <ExamCard key={e.slug} exam={e} stateName={name} />)}</div>
        </section>
        <p className="text-sm text-slate-600">
          Looking for schools rather than exams? See <Link to={`/states/${s.slug}`} className="link">schools in {s.name}</Link>.
        </p>
      </div>
    </>
  );
}

/** /exams/syllabus — every exam's official pattern side by side, with the syllabus link and source. */
export function ExamSyllabusPage() {
  useDocumentTitle('Exam pattern and syllabus of school entrance exams');
  const exams = useApi(() => examService.all(), []);
  const details = useApi(
    () => Promise.all((exams.data ?? []).map((e) => examService.get(e.slug))),
    [exams.data?.map((e) => e.slug).join(',')],
    !!exams.data,
  );
  return (
    <>
      <PageHeader eyebrow="Syllabus and pattern" title="Exam pattern and syllabus of school entrance exams"
        subtitle="Subjects, number of questions, marks, duration, format and language for each exam, from the conducting body's official notice. Open a guide for the topic-wise syllabus." />
      <div className="container-page space-y-6 py-8">
        <Crumbs here="Syllabus and pattern" />
        <AsyncContent state={details} isEmpty={(d) => d.length === 0}>
          {(list) => (
            <>
              <nav aria-label="Exams on this page" className="flex flex-wrap gap-2 text-sm">
                {list.map((d) => <a key={d.exam.slug} href={`#p-${d.exam.slug}`} className="chip bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200">{d.exam.shortName}</a>)}
              </nav>
              {list.map((d) => <PatternCard key={d.exam.slug} d={d} />)}
            </>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

function PatternCard({ d }: { d: ExamDetail }) {
  const { exam, content } = d;
  return (
    <section id={`p-${exam.slug}`} aria-labelledby={`h-${exam.slug}`} className="card scroll-mt-24 overflow-hidden">
      <div className="border-b border-slate-100 p-5">
        <h2 id={`h-${exam.slug}`} className="font-display text-lg font-bold text-ink">
          <Link to={`/exams/${exam.slug}?tab=pattern`} className="hover:text-brand-700">{exam.name}</Link>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {classLabel(exam.entryClasses)} · {exam.currentCycle}
          {exam.examMode && ` · ${examModeLabel[exam.examMode]}`}
          {content.languages && ` · ${content.languages}`}
        </p>
      </div>
      {content.pattern.map((p) => (
        <div key={p.title} className="border-b border-slate-100 last:border-b-0">
          <h3 className="px-5 pt-4 text-sm font-semibold text-ink">{p.title}</h3>
          {p.sections.length > 0 && <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={`${exam.shortName}: ${p.title}`}>
            <table className="mt-2 w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr><th className="px-5 py-2">Section</th><th className="px-5 py-2 text-right">Questions</th><th className="px-5 py-2 text-right">Marks</th><th className="px-5 py-2 text-right">Time</th></tr>
              </thead>
              <tbody>
                {p.sections.map((s) => (
                  <tr key={s.name} className="border-t border-slate-100">
                    <td className="px-5 py-2 text-ink">{s.name}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{s.questions ?? '—'}</td>
                    <td className="px-5 py-2 text-right tabular-nums">{s.marks ?? '—'}</td>
                    <td className="px-5 py-2 text-right">{s.duration ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>}
          {p.notes.length > 0 && <ul className="list-disc space-y-0.5 px-10 py-3 text-sm text-slate-600">{p.notes.map((n) => <li key={n}>{n}</li>)}</ul>}
        </div>
      ))}
      <p className="bg-slate-50 px-5 py-3 text-xs text-slate-600">
        <Link to={`/exams/${exam.slug}?tab=pattern`} className="link">Topic-wise syllabus</Link>
        {' · Source: '}<a href={content.sources[0].url} target="_blank" rel="noopener noreferrer" className="link">{content.sources[0].label} ↗</a>
        {exam.lastVerifiedOn && ` · checked ${formatDate(exam.lastVerifiedOn)}`}
      </p>
    </section>
  );
}
