import { Link, useSearchParams } from 'react-router-dom';
import { Icon, type IconName } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { AsyncContent, EmptyState } from '../components/common/States';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { examService, practiceService } from '../services/publicApi';
import type { ExamResource, ExamResourceType } from '../types/api';
import { formatDate } from '../utils/format';
import { classLabel, romanClass } from '../utils/exams';

const TYPE_INFO: Record<ExamResourceType | 'PRACTICE_SET', { label: string; icon: IconName }> = {
  QUESTION_PAPER: { label: 'Previous-year paper', icon: 'external' },
  ANSWER_KEY: { label: 'Answer key', icon: 'check' },
  SAMPLE_PAPER: { label: 'Sample paper', icon: 'book' },
  OFFICIAL_LINK: { label: 'Official notice or page', icon: 'info' },
  SYLLABUS: { label: 'Syllabus', icon: 'list' },
  EXAM_PATTERN: { label: 'Exam pattern', icon: 'columns' },
  PREPARATION_GUIDE: { label: 'Preparation plan', icon: 'calendar' },
  DOCUMENT_CHECKLIST: { label: 'Document checklist', icon: 'shield' },
  FAQ: { label: 'FAQ', icon: 'info' },
  PRACTICE_SET: { label: 'Practice set', icon: 'target' },
};

type Row = ExamResource & { kind: ExamResourceType | 'PRACTICE_SET' };

export function ExamResourcesPage() {
  useDocumentTitle('Learning resources for school entrance exams');
  const [params, setParams] = useSearchParams();
  const resources = useApi(() => examService.resources(), []);
  const practice = useApi(() => practiceService.list(), []);
  const exam = params.get('exam') ?? '';
  const cls = Number(params.get('class')) || null;
  const type = params.get('type') ?? '';
  const source = params.get('source') ?? '';
  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v); else next.delete(k);
    setParams(next, { replace: true });
  };

  // Practice sets are this site's own material, listed with the other resources of their exam.
  const rows: Row[] = [
    ...(resources.data ?? []).map((r) => ({ ...r, kind: r.type })),
    ...(practice.data ?? []).filter((p) => p.examSlug).map((p) => {
      const owner = resources.data?.find((r) => r.examSlug === p.examSlug);
      return {
        examSlug: p.examSlug!, examShortName: owner?.examShortName ?? p.examSlug!, entryClasses: owner?.entryClasses ?? [],
        academicSession: null, type: 'FAQ' as ExamResourceType, kind: 'PRACTICE_SET' as const, title: p.title,
        detail: `${p.questionCount} original questions · ${p.durationMinutes ? `${p.durationMinutes} minutes` : 'untimed'} · ${p.level}`,
        year: null, official: false, url: null, path: `/exams/practice/${p.slug}`, lastVerifiedOn: p.reviewedOn,
      };
    }),
  ];
  const exams = [...new Map(rows.map((r) => [r.examSlug, r.examShortName])).entries()];
  const classes = [...new Set(rows.flatMap((r) => r.entryClasses))].sort((a, b) => a - b);
  const shown = rows.filter((r) => (!exam || r.examSlug === exam) && (!cls || r.entryClasses.includes(cls))
    && (!type || r.kind === type) && (!source || (source === 'official') === r.official));
  const official = shown.filter((r) => r.official);
  const own = shown.filter((r) => !r.official);
  const filtered = !!(exam || cls || type || source);

  return (
    <>
      <PageHeader eyebrow="Learning resources" title="Syllabus, papers and preparation guides"
        subtitle="Officially published papers, answer keys and notices — linked at the conducting body's own site, never copied — together with our syllabus summaries, preparation plans, checklists and practice sets.">
        <div className="flex flex-wrap gap-2">
          <Link to="/exams" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">All entrance exams</Link>
          <Link to="/exams/syllabus" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Syllabus &amp; pattern compared</Link>
          <Link to="/exams/practice" className="chip bg-white/10 px-3 py-1.5 text-sm text-slate-100 ring-1 ring-white/15 hover:bg-white/20">Practice centre</Link>
        </div>
      </PageHeader>
      <div className="container-page space-y-8 py-8">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-600">
          <ol className="flex flex-wrap items-center gap-1.5">
            <li><Link to="/" className="hover:text-brand-700">Home</Link> /</li>
            <li><Link to="/exams" className="hover:text-brand-700">Entrance exams</Link> /</li>
            <li aria-current="page" className="font-medium text-ink">Learning resources</li>
          </ol>
        </nav>

        <form aria-label="Filter resources" className="card flex flex-wrap items-end gap-3 p-4 text-sm" onSubmit={(e) => e.preventDefault()}>
          <label className="min-w-[160px] flex-1"><span className="label">Exam</span>
            <select className="input" value={exam} onChange={(e) => set('exam', e.target.value)}>
              <option value="">All exams</option>
              {exams.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
            </select>
          </label>
          <label className="min-w-[140px] flex-1"><span className="label">Admission to class</span>
            <select className="input" value={cls ?? ''} onChange={(e) => set('class', e.target.value)}>
              <option value="">Any class</option>
              {classes.map((c) => <option key={c} value={c}>Class {romanClass(c)}</option>)}
            </select>
          </label>
          <label className="min-w-[180px] flex-1"><span className="label">Type</span>
            <select className="input" value={type} onChange={(e) => set('type', e.target.value)}>
              <option value="">All types</option>
              {(Object.keys(TYPE_INFO) as (keyof typeof TYPE_INFO)[]).map((t) => <option key={t} value={t}>{TYPE_INFO[t].label}</option>)}
            </select>
          </label>
          <label className="min-w-[180px] flex-1"><span className="label">Source</span>
            <select className="input" value={source} onChange={(e) => set('source', e.target.value)}>
              <option value="">Official and our guides</option>
              <option value="official">Official only</option>
              <option value="guide">India School Finder guides only</option>
            </select>
          </label>
          {filtered && <button type="button" className="btn-secondary" onClick={() => setParams(new URLSearchParams(), { replace: true })}>Clear</button>}
        </form>

        <AsyncContent state={resources} isEmpty={() => false}>
          {() => shown.length === 0 ? (
            <EmptyState title="No resources match these filters.">
              {type === 'QUESTION_PAPER' || type === 'ANSWER_KEY' || type === 'SAMPLE_PAPER'
                ? 'Not every conducting body publishes its papers. Where none is published officially, none is listed — we do not copy unofficial ones.'
                : 'Try removing a filter.'}
            </EmptyState>
          ) : (
            <div className="space-y-10">
              {official.length > 0 && (
                <ResourceGroup title="Official — published by the conducting body" note="Opens the conducting body's own site. Files are linked, never copied or re-hosted."
                  rows={official} />
              )}
              {own.length > 0 && (
                <ResourceGroup title="India School Finder guides and practice" note="Our own material, built from the official notices. Practice questions are original, not official."
                  rows={own} />
              )}
            </div>
          )}
        </AsyncContent>

        <section aria-labelledby="general-heading" className="grid gap-6 lg:grid-cols-2">
          <h2 id="general-heading" className="sr-only">General preparation guides</h2>
          <GuideCard title="Revision checklist for the last two weeks" items={[
            'Re-read the exam pattern: sections, number of questions, marks and time for each part.',
            'Take one timed mock test a day and review every wrong answer the same day.',
            'Keep a notebook of mistakes; revise it every evening instead of starting new chapters.',
            'Practise reading passages and answering in order — speed comes from practice, not rushing.',
            'Check the admit card as soon as it is out: name, photo, date, time and centre address.',
            'Sleep at the usual time; a rested child does better than a tired one.',
          ]} />
          <GuideCard title="Preparation strategy that works for most children" items={[
            'Start from the official syllabus of the exam, not from a guidebook\'s list.',
            'Spend most time on the subject with the most marks, but never skip a section.',
            'Short daily practice (30–45 minutes) beats long weekend sessions.',
            'Learn the reason behind each answer — explanations matter more than scores.',
            'Use topic practice for weak areas and mixed mock tests for exam rhythm.',
            'Talk about the exam calmly at home; no practice score predicts the result.',
          ]} />
        </section>
        <p className="text-xs text-slate-500">
          These two checklists are general India School Finder guidance, not rules of any exam. Each exam&apos;s official notice and admit card come first.
        </p>
      </div>
    </>
  );
}

function ResourceGroup({ title, note, rows }: { title: string; note: string; rows: Row[] }) {
  return (
    <section aria-label={title}>
      <h2 className="font-display text-xl font-bold text-ink">{title}</h2>
      <p className="mt-1 text-sm text-slate-600">{note}</p>
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {rows.map((r) => {
          const info = TYPE_INFO[r.kind];
          const body = (
            <>
              <span className="flex items-center justify-between gap-2">
                <span className={`chip ${r.official ? 'bg-emerald-50 text-emerald-800' : 'bg-brand-50 text-brand-800'}`}>
                  <Icon name={info.icon} className="h-3.5 w-3.5" /> {info.label}
                </span>
                <span className="text-xs text-slate-500">{r.official ? 'Official' : 'Our guide'}</span>
              </span>
              <span className="mt-3 block font-semibold text-ink">{r.title}</span>
              <span className="mt-1 block flex-1 text-sm text-slate-600">{r.detail}</span>
              <span className="mt-3 block text-xs text-slate-500">
                {r.examShortName}{r.entryClasses.length > 0 && ` · ${classLabel(r.entryClasses)}`}
                {r.year ? ` · ${r.year}` : r.academicSession ? ` · session ${r.academicSession}` : ''}
                {r.lastVerifiedOn && ` · ${r.kind === 'PRACTICE_SET' ? 'reviewed' : 'checked'} ${formatDate(r.lastVerifiedOn)}`}
              </span>
              <span className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-brand-700">
                {r.url ? <>Open on the official site <Icon name="external" className="h-3.5 w-3.5" /></> : <>Open <Icon name="arrowRight" className="h-3.5 w-3.5" /></>}
              </span>
            </>
          );
          const cls = 'card card-hover flex h-full flex-col p-4';
          return (
            <li key={`${r.kind}-${r.examSlug}-${r.title}-${r.url ?? r.path}`}>
              {r.url ? <a href={r.url} target="_blank" rel="noopener noreferrer" className={cls}>{body}</a>
                : <Link to={r.path!} className={cls}>{body}</Link>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function GuideCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="card p-5">
      <p className="eyebrow">India School Finder guidance</p>
      <h3 className="mt-1 font-display text-lg font-bold text-ink">{title}</h3>
      <ul className="mt-3 space-y-2 text-sm text-slate-700">
        {items.map((i) => (
          <li key={i} className="flex gap-2"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />{i}</li>
        ))}
      </ul>
    </div>
  );
}
