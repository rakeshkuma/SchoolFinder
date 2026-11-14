import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService, type AdminChallenge, type ChallengeInput } from '../../services/adminApi';
import {
  CHALLENGE_DIFFICULTY_LABEL, CHALLENGE_KIND_LABEL, CHALLENGE_STATUS_LABEL, when,
  type ChallengeDifficulty, type ChallengeKind, type ChallengeRelease,
} from '../../services/challengeApi';
import { ApiError } from '../../services/http';
import { practiceService } from '../../services/publicApi';
import type { PracticeBankQuestion, PracticeCategory } from '../../types/api';

const CATEGORIES: [PracticeCategory, string][] = [
  ['ENTRANCE', 'School entrance exams'], ['SCHOOL', 'School subjects'], ['OLYMPIAD', 'Olympiads'], ['COMPETITIVE', 'Competitive exams'],
];

/** An instant as a datetime-local value, in this browser's time zone. */
export function toLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export const toSlug = (title: string) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);

/** `count` questions from `pool`, not already chosen, shuffled with `random`. */
export function drawQuestions(pool: string[], chosen: string[], count: number, random: () => number = Math.random): string[] {
  const free = pool.filter((id) => !chosen.includes(id));
  for (let i = free.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [free[i], free[j]] = [free[j], free[i]];
  }
  return free.slice(0, count);
}

const blank = (): ChallengeInput => ({
  slug: '', title: '', description: '', rules: null, kind: 'WEEKLY', examSlug: null, category: null, difficulty: 'MIXED', questionIds: [],
  durationMinutes: 15, startsAt: '', endsAt: '', pointsPerCorrect: 10, completionBonus: 0, maxAttempts: 1, resultRelease: 'IMMEDIATE',
  leaderboardEnabled: true,
});

const fromRow = (c: AdminChallenge): ChallengeInput => ({
  slug: c.summary.slug, title: c.summary.title, description: c.summary.description, rules: c.rules, kind: c.summary.kind,
  examSlug: c.summary.examSlug, category: c.summary.category, difficulty: c.summary.difficulty, questionIds: c.questionIds,
  durationMinutes: c.summary.durationMinutes, startsAt: c.summary.startsAt, endsAt: c.summary.endsAt, pointsPerCorrect: c.pointsPerCorrect,
  completionBonus: c.completionBonus, maxAttempts: c.summary.maxAttempts, resultRelease: c.summary.resultRelease, leaderboardEnabled: c.leaderboardEnabled,
});

/** Chooses existing bank questions, by hand or at random from a filter. Questions are referenced, never copied. */
function QuestionPicker({ bank, value, onChange }: { bank: PracticeBankQuestion[]; value: string[]; onChange: (ids: string[]) => void }) {
  const [exam, setExam] = useState('');
  const [section, setSection] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [count, setCount] = useState(10);
  const exams = useMemo(() => [...new Set(bank.map((q) => q.examSlug).filter(Boolean) as string[])].sort(), [bank]);
  const sections = useMemo(() => [...new Set(bank.filter((q) => !exam || q.examSlug === exam).map((q) => q.section))].sort(), [bank, exam]);
  const matches = bank.filter((q) => (!exam || q.examSlug === exam) && (!section || q.section === section) && (!difficulty || q.difficulty === difficulty));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((x) => x !== id) : [...value, id]);
  return (
    <fieldset className="space-y-3 rounded-xl p-3 ring-1 ring-slate-200">
      <legend className="px-1 text-sm font-semibold text-ink">Questions ({value.length} chosen)</legend>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block text-sm"><span className="label">Exam</span>
          <select className="input" value={exam} onChange={(e) => { setExam(e.target.value); setSection(''); }}>
            <option value="">Any</option>{exams.map((x) => <option key={x}>{x}</option>)}
          </select></label>
        <label className="block text-sm"><span className="label">Subject</span>
          <select className="input" value={section} onChange={(e) => setSection(e.target.value)}>
            <option value="">Any</option>{sections.map((x) => <option key={x}>{x}</option>)}
          </select></label>
        <label className="block text-sm"><span className="label">Difficulty</span>
          <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            <option value="">Any</option><option>EASY</option><option>MEDIUM</option><option>HARD</option>
          </select></label>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-slate-600">{matches.length} match</span>
        <input className="input w-20" type="number" min={1} max={100} value={count} aria-label="How many to add" onChange={(e) => setCount(Number(e.target.value))} />
        <button type="button" className="btn-secondary py-1.5 text-xs"
          onClick={() => onChange([...value, ...drawQuestions(matches.map((q) => q.id), value, count)].slice(0, 100))}>Add at random</button>
        {value.length > 0 && <button type="button" className="btn-ghost py-1.5 text-xs" onClick={() => onChange([])}>Clear all</button>}
      </div>
      <ul className="max-h-56 divide-y divide-slate-100 overflow-y-auto rounded-lg text-xs ring-1 ring-slate-200">
        {matches.slice(0, 100).map((q) => (
          <li key={q.id}>
            <label className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50">
              <input type="checkbox" checked={value.includes(q.id)} onChange={() => toggle(q.id)} />
              <span className="min-w-0 truncate">{q.section}{q.topic ? ` · ${q.topic}` : ''} · {q.difficulty ?? 'no level'} <span className="text-slate-500">({q.id})</span></span>
            </label>
          </li>
        ))}
      </ul>
      {matches.length > 100 && <p className="text-xs text-slate-500">Showing the first 100; filter further, or add at random.</p>}
    </fieldset>
  );
}

function ChallengeForm({ initial, editingId, onDone, onCancel, bank, setMessage }: {
  initial: ChallengeInput; editingId: number | null; onDone: () => void; onCancel: () => void; bank: PracticeBankQuestion[];
  setMessage: (m: { ok: boolean; text: string }) => void;
}) {
  const [f, setF] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof ChallengeInput>(k: K, v: ChallengeInput[K]) => setF((x) => ({ ...x, [k]: v }));
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const body = { ...f, slug: f.slug || toSlug(f.title), startsAt: new Date(f.startsAt).toISOString(), endsAt: new Date(f.endsAt).toISOString() };
      if (editingId === null) await adminService.createChallenge(body); else await adminService.updateChallenge(editingId, body);
      setMessage({ ok: true, text: `Saved. ${editingId === null ? 'It stays hidden until you publish it.' : ''}` });
      onDone();
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? [err.message, ...err.fieldErrors.map((x) => x.message)].join(' — ') : 'The request failed.' });
    } finally {
      setBusy(false);
    }
  };
  const number = (k: 'durationMinutes' | 'pointsPerCorrect' | 'completionBonus' | 'maxAttempts', label: string, min: number, max: number) => (
    <label className="block text-sm"><span className="label">{label}</span>
      <input className="input" type="number" required min={min} max={max} value={f[k]} onChange={(e) => set(k, Number(e.target.value))} /></label>
  );
  return (
    <form onSubmit={save} className="card space-y-4 p-4" aria-label={editingId === null ? 'New challenge' : 'Edit challenge'}>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="label">Title</span>
          <input className="input" required maxLength={160} value={f.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="block text-sm"><span className="label">Address (leave blank to use the title)</span>
          <input className="input" maxLength={80} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={f.slug} onChange={(e) => set('slug', e.target.value)} /></label>
      </div>
      <label className="block text-sm"><span className="label">Description</span>
        <textarea className="input" required rows={2} maxLength={1000} value={f.description} onChange={(e) => set('description', e.target.value)} /></label>
      <label className="block text-sm"><span className="label">Extra rules (optional)</span>
        <textarea className="input" rows={2} maxLength={2000} value={f.rules ?? ''} onChange={(e) => set('rules', e.target.value || null)} /></label>
      <div className="grid gap-3 sm:grid-cols-4">
        <label className="block text-sm"><span className="label">Type</span>
          <select className="input" value={f.kind} onChange={(e) => set('kind', e.target.value as ChallengeKind)}>
            {Object.entries(CHALLENGE_KIND_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label className="block text-sm"><span className="label">Exam (optional)</span>
          <input className="input" placeholder="e.g. jnvst" value={f.examSlug ?? ''} onChange={(e) => set('examSlug', e.target.value.trim() || null)} /></label>
        <label className="block text-sm"><span className="label">Category</span>
          <select className="input" value={f.category ?? ''} onChange={(e) => set('category', (e.target.value || null) as PracticeCategory | null)}>
            <option value="">All subjects</option>{CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
        <label className="block text-sm"><span className="label">Difficulty</span>
          <select className="input" value={f.difficulty} onChange={(e) => set('difficulty', e.target.value as ChallengeDifficulty)}>
            {Object.entries(CHALLENGE_DIFFICULTY_LABEL).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select></label>
      </div>
      <QuestionPicker bank={bank} value={f.questionIds} onChange={(ids) => set('questionIds', ids)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-sm"><span className="label">Opens</span>
          <input className="input" type="datetime-local" required value={f.startsAt ? toLocalInput(f.startsAt) : ''} onChange={(e) => set('startsAt', e.target.value)} /></label>
        <label className="block text-sm"><span className="label">Closes</span>
          <input className="input" type="datetime-local" required value={f.endsAt ? toLocalInput(f.endsAt) : ''} onChange={(e) => set('endsAt', e.target.value)} /></label>
      </div>
      <div className="grid gap-3 sm:grid-cols-4">
        {number('durationMinutes', 'Duration (minutes)', 1, 300)}
        {number('pointsPerCorrect', 'Points per correct answer', 1, 100)}
        {number('completionBonus', 'Completion bonus', 0, 1000)}
        {number('maxAttempts', 'Attempts allowed', 1, 10)}
      </div>
      <div className="flex flex-wrap items-end gap-4">
        <label className="block text-sm"><span className="label">Results</span>
          <select className="input" value={f.resultRelease} onChange={(e) => set('resultRelease', e.target.value as ChallengeRelease)}>
            <option value="IMMEDIATE">Straight after submitting</option><option value="AFTER_END">After the challenge ends</option>
          </select></label>
        <label className="flex items-center gap-2 pb-2 text-sm">
          <input type="checkbox" checked={f.leaderboardEnabled} onChange={(e) => set('leaderboardEnabled', e.target.checked)} /> Show a leaderboard
        </label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="btn-primary" disabled={busy || f.questionIds.length === 0}>{busy ? 'Saving…' : 'Save'}</button>
        <button type="button" className="btn-secondary" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

/** Editors schedule challenges over existing questions. Questions, scoring and duration lock once a student starts. */
export function AdminChallengesPage() {
  useDocumentTitle('Admin · Challenges');
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [editing, setEditing] = useState<{ id: number | null; input: ChallengeInput } | null>(null);
  const list = useApi(() => adminService.challenges(), [nonce]);
  const bank = useApi(() => practiceService.bank(), []);
  const refresh = () => setNonce((n) => n + 1);
  const act = async (action: () => Promise<void>, text: string) => {
    try {
      await action();
      setMessage({ ok: true, text });
      refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? [e.message, ...e.fieldErrors.map((x) => x.message)].join(' — ') : 'The request failed.' });
    }
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Challenges</h1>
          <p className="mt-1 text-sm text-slate-600">
            Scheduled tests over published practice questions, which are referenced and never copied. Questions, scoring and duration
            lock once a student starts. Every change is in the audit log.
          </p>
        </div>
        {!editing && <button type="button" className="btn-primary" onClick={() => setEditing({ id: null, input: blank() })}>New challenge</button>}
      </div>
      {message && <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}
      {editing && (
        <ChallengeForm key={editing.id ?? 'new'} initial={editing.input} editingId={editing.id} bank={bank.data?.questions ?? []} setMessage={setMessage}
          onCancel={() => setEditing(null)} onDone={() => { setEditing(null); refresh(); }} />
      )}
      <AsyncContent state={list} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No challenges yet." />}>
        {(rows) => (
          <ul className="space-y-3">
            {rows.map((c) => (
              <li key={c.id} className="card space-y-2 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{c.published ? <Link to={`/exams/challenges/${c.summary.slug}`} className="hover:text-brand-700">{c.summary.title}</Link> : c.summary.title}</p>
                    <p className="text-xs text-slate-500">{c.summary.slug} · {CHALLENGE_KIND_LABEL[c.summary.kind]}{c.summary.examSlug ? ` · ${c.summary.examSlug}` : ''}</p>
                  </div>
                  <span className="flex flex-wrap gap-2">
                    <span className={`chip ${c.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{c.published ? 'Published' : 'Not published'}</span>
                    <span className="chip bg-slate-100 text-slate-700">{CHALLENGE_STATUS_LABEL[c.summary.status]}</span>
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  {when(c.summary.startsAt)} to {when(c.summary.endsAt)} · {c.summary.questions} questions · {c.summary.durationMinutes} min · up to {c.summary.maxScore} points ·
                  {' '}{c.summary.participants} students · {c.attempts} attempts{c.flagged > 0 ? ` · ${c.flagged} flagged` : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => setEditing({ id: c.id, input: fromRow(c) })}>Edit</button>
                  <button type="button" className="btn-secondary py-1.5 text-xs"
                    onClick={() => void act(() => adminService.publishChallenge(c.id, !c.published), c.published ? 'Unpublished.' : 'Published.')}>{c.published ? 'Unpublish' : 'Publish'}</button>
                  {c.attempts === 0 && (
                    <button type="button" className="btn-ghost py-1.5 text-xs text-red-700"
                      onClick={() => { if (window.confirm(`Delete "${c.summary.title}"?`)) void act(() => adminService.deleteChallenge(c.id), 'Deleted.'); }}>Delete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </AsyncContent>
    </div>
  );
}
