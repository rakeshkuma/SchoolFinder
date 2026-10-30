import { useState, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { AsyncContent, EmptyState } from '../../components/common/States';
import { Pagination } from '../../components/common/Pagination';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { AdminPracticeSet, PracticeCategory, PracticeReport, PracticeReportReason, PracticeReportStatus } from '../../types/api';
import { formatDate } from '../../utils/format';
import { isoToday } from '../../utils/exams';

const CATEGORY_LABEL: Record<PracticeCategory, string> = {
  ENTRANCE: 'School entrance exams', SCHOOL: 'School subjects', OLYMPIAD: 'Olympiads', COMPETITIVE: 'Competitive exams',
};

const REASON_LABEL: Record<PracticeReportReason, string> = {
  WRONG_ANSWER: 'Answer key looks wrong', UNCLEAR: 'Question unclear', TYPO: 'Typo or formatting',
  TRANSLATION: 'Hindi translation', OTHER: 'Other',
};

const CSV_TEMPLATE = [
  'id,section,chapter,topic,difficulty,prompt,option_a,option_b,option_c,option_d,answer,explanation,hi_prompt,hi_option_a,hi_option_b,hi_option_c,hi_option_d,hi_explanation',
  'q1,Mathematics,Real Numbers,HCF and LCM,EASY,"What is the HCF of 12 and 18?",6,3,36,2,A,"12 = 2 × 2 × 3 and 18 = 2 × 3 × 3, so the HCF is 2 × 3 = 6.","12 और 18 का म.स. क्या है?",6,3,36,2,"12 = 2 × 2 × 3 और 18 = 2 × 3 × 3, इसलिए म.स. = 2 × 3 = 6।"',
].join('\n');

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Practice content for editors: every set with what needs checking, publishing (only reviewed sets), review dates,
 * JSON export and import, CSV replacement of a set's questions, and the queue of problems visitors report.
 */
export function AdminPracticePage() {
  useDocumentTitle('Admin · Practice questions');
  const [nonce, setNonce] = useState(0);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const sets = useApi(() => adminService.practiceSets(), [nonce]);
  const refresh = () => setNonce((n) => n + 1);

  const run = async (action: () => Promise<string>) => {
    try {
      setMessage({ ok: true, text: await action() });
      refresh();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? [e.message, ...e.fieldErrors.map((f) => f.message)].join(' — ') : 'The request failed.' });
    }
  };
  const togglePublish = (s: AdminPracticeSet) => {
    if (s.published) {
      void run(async () => { await adminService.publishPractice(s.slug, false); return `${s.slug}: unpublished.`; });
      return;
    }
    let reviewedOn: string | undefined;
    if (!s.reviewedOn) {
      const answer = window.prompt('This set has no review date. On which date did a reviewer check every question, answer and explanation? (YYYY-MM-DD)', isoToday());
      if (answer === null) return;
      reviewedOn = answer.trim();
    }
    void run(async () => { await adminService.publishPractice(s.slug, true, reviewedOn); return `${s.slug}: published.`; });
  };
  const review = (s: AdminPracticeSet) => {
    const note = window.prompt(`Record that every question in "${s.title}" was re-checked today. What did you check against? (kept in the audit log)`);
    if (note === null) return;
    void run(async () => { await adminService.reviewPractice(s.slug, note || undefined); return `${s.slug}: reviewed today.`; });
  };
  const exportJson = (s: AdminPracticeSet) => void run(async () => {
    download(`practice-${s.slug}.json`, JSON.stringify(await adminService.exportPractice(s.slug), null, 2), 'application/json');
    return `${s.slug}: exported. Edit the file and use “Import practice JSON” to apply it.`;
  });
  const onCsv = (s: AdminPracticeSet) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!window.confirm(`Replace all ${s.questionCount} questions of "${s.title}" with the questions in ${file.name}? The set will be unpublished until it is reviewed again.`)) return;
    void run(async () => (await adminService.importPracticeCsv(s.slug, file)).message);
  };
  const onJson = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    let body: unknown;
    try {
      body = JSON.parse(await file.text());
    } catch {
      setMessage({ ok: false, text: 'That file is not valid JSON.' });
      return;
    }
    void run(async () => `Imported practice sets: ${(await adminService.importPractice(body)).slugs.join(', ')}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Practice questions</h1>
        <p className="mt-1 text-sm text-slate-600">
          Our own questions only — never copy official, previous-year or commercial papers. A set is published only with a review date:
          the day someone checked every question, answer and explanation (and its Hindi version). Every change is in the audit log.
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label className="btn-secondary inline-flex cursor-pointer">
          Import practice JSON…
          <input type="file" accept="application/json,.json" className="sr-only" onChange={onJson} />
        </label>
        <button type="button" className="btn-ghost" onClick={() => download('practice-questions-template.csv', `﻿${CSV_TEMPLATE}\n`, 'text/csv')}>
          Download CSV template
        </button>
        <label className="ml-auto flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={attentionOnly} onChange={(e) => setAttentionOnly(e.target.checked)} /> Only sets that need attention
        </label>
      </div>
      <details className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600 ring-1 ring-slate-200">
        <summary className="cursor-pointer font-semibold text-ink">CSV format</summary>
        <p className="mt-2">
          One row per question, UTF-8, with a header row. Required: <code>id</code> (lower-case, e.g. q1), <code>section</code> (subject),
          <code> topic</code>, <code>difficulty</code> (EASY, MEDIUM or HARD), <code>prompt</code>, <code>option_a</code> … <code>option_d</code>
          (<code>option_e</code> optional), <code>answer</code> (the letter of the correct option) and <code>explanation</code>. Optional:
          <code> chapter</code>, and a Hindi version in <code>hi_prompt</code>, <code>hi_option_a</code> … and <code>hi_explanation</code>
          (options in the same order). The CSV replaces the set&apos;s questions; set details (title, class, marking) stay as they are and
          are changed through the JSON import. Sets with reading passages or figures are edited as JSON.
        </p>
      </details>
      {message && (
        <p role="status" className={`rounded-xl p-3 text-sm ${message.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>{message.text}</p>
      )}

      <section aria-labelledby="sets-h">
        <h2 id="sets-h" className="text-lg font-semibold">Sets</h2>
        <AsyncContent state={sets} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No practice sets yet." />}>
          {(list) => {
            const shown = attentionOnly ? list.filter((s) => s.flags.length > 0) : list;
            return shown.length === 0 ? <p className="mt-3 text-sm text-emerald-700">Every set is in order.</p> : (
              <ul className="mt-3 space-y-3">
                {shown.map((s) => (
                  <li key={s.slug} className="card space-y-2 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {s.published ? <Link to={`/exams/practice/${s.slug}`} className="hover:text-brand-700">{s.title}</Link> : s.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {s.slug} · {CATEGORY_LABEL[s.category]} · {s.level}{s.examSlug ? ` · ${s.examSlug}` : ''} · {s.kind === 'MOCK' ? 'mock test' : 'quiz'}
                        </p>
                      </div>
                      <span className="flex flex-wrap gap-2">
                        <span className={`chip ${s.published ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{s.published ? 'Published' : 'Not published'}</span>
                        {s.openReports > 0 && <span className="chip bg-amber-100 text-amber-900">{s.openReports} open report{s.openReports === 1 ? '' : 's'}</span>}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      {s.questionCount} questions · Hindi {s.hindiQuestions}/{s.questionCount} · chapters tagged {s.chapterTagged}/{s.questionCount} ·
                      marking +{s.marksPerQuestion}{s.negativeMarks > 0 ? ` / −${s.negativeMarks}` : ''} · {s.reviewedOn ? `reviewed ${formatDate(s.reviewedOn)}` : 'never reviewed'}
                    </p>
                    {s.flags.length > 0 && (
                      <ul className="space-y-1 text-sm">
                        {s.flags.map((f) => <li key={f.code} className="rounded-lg bg-amber-50 px-3 py-1.5 text-amber-900"><strong>{f.code.replace(/_/g, ' ').toLowerCase()}:</strong> {f.message}</li>)}
                      </ul>
                    )}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => review(s)}>Reviewed today</button>
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => togglePublish(s)}>{s.published ? 'Unpublish' : 'Publish'}</button>
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => exportJson(s)}>Export JSON</button>
                      <label className="btn-secondary inline-flex cursor-pointer py-1.5 text-xs">
                        Replace questions from CSV…
                        <input type="file" accept=".csv,text/csv" className="sr-only" onChange={onCsv(s)} />
                      </label>
                    </div>
                  </li>
                ))}
              </ul>
            );
          }}
        </AsyncContent>
      </section>

      <ReportQueue onChange={refresh} setMessage={setMessage} />
    </div>
  );
}

function ReportQueue({ onChange, setMessage }: { onChange: () => void; setMessage: (m: { ok: boolean; text: string }) => void }) {
  const [status, setStatus] = useState<PracticeReportStatus>('OPEN');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const reports = useApi(() => adminService.practiceReports(status, page), [status, page, nonce]);

  const resolve = async (r: PracticeReport, to: 'FIXED' | 'DISMISSED') => {
    const note = window.prompt(to === 'FIXED'
      ? 'What did you change? (Fix the question first: export the set, edit it, import it, and review it again.)'
      : 'Why is the question correct as it is?');
    if (note === null) return;
    try {
      await adminService.resolveReport(r.id, to, note || undefined);
      setMessage({ ok: true, text: `Report #${r.id} marked ${to.toLowerCase()}.` });
      setNonce((n) => n + 1);
      onChange();
    } catch (e) {
      setMessage({ ok: false, text: e instanceof ApiError ? e.message : 'The request failed.' });
    }
  };

  return (
    <section aria-labelledby="reports-h">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="reports-h" className="text-lg font-semibold">Reported problems</h2>
        <div className="flex gap-2" role="group" aria-label="Show reports">
          {(['OPEN', 'FIXED', 'DISMISSED'] as const).map((s) => (
            <button key={s} type="button" aria-pressed={status === s} onClick={() => { setStatus(s); setPage(0); }}
              className={`chip px-3 py-1 text-sm ${status === s ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <AsyncContent state={reports} isEmpty={(d) => d.content.length === 0}
        empty={<p className="mt-3 text-sm text-slate-600">{status === 'OPEN' ? 'No open reports.' : 'Nothing here yet.'}</p>}>
        {(data) => (
          <>
            <ul className="mt-3 space-y-3">
              {data.content.map((r) => (
                <li key={r.id} className="card space-y-2 p-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold">{REASON_LABEL[r.reason]}</p>
                    <p className="text-xs text-slate-500">
                      #{r.id} · {r.setTitle ?? r.setSlug} · {r.questionId} · {formatDate(r.createdAt.slice(0, 10))}{r.signedIn ? ' · signed-in member' : ''}
                    </p>
                  </div>
                  {r.message && <p className="rounded-lg bg-slate-50 p-3 text-slate-800">“{r.message}”</p>}
                  {r.question ? (
                    <div className="rounded-lg border border-slate-200 p-3">
                      <p className="text-xs text-slate-500">{r.question.section}{r.question.topic ? ` · ${r.question.topic}` : ''}</p>
                      <p className="mt-1 font-medium text-ink">{r.question.prompt}</p>
                      <ol className="mt-1 space-y-0.5">
                        {r.question.options.map((o, i) => (
                          <li key={i} className={i === r.question!.answer ? 'font-semibold text-emerald-800' : 'text-slate-700'}>
                            {String.fromCharCode(65 + i)}. {o}{i === r.question!.answer && ' ✓ answer key'}
                          </li>
                        ))}
                      </ol>
                      <p className="mt-2 text-slate-600"><strong>Explanation:</strong> {r.question.explanation}</p>
                      {r.question.hi && (
                        <details className="mt-2" lang="hi">
                          <summary className="cursor-pointer text-xs text-slate-500" lang="en">Hindi version</summary>
                          <p className="mt-1 font-medium">{r.question.hi.prompt}</p>
                          <ol>{r.question.hi.options.map((o, i) => <li key={i}>{String.fromCharCode(65 + i)}. {o}</li>)}</ol>
                          <p className="mt-1 text-slate-600">{r.question.hi.explanation}</p>
                        </details>
                      )}
                    </div>
                  ) : <p className="text-xs text-slate-500">This question is no longer in the set.</p>}
                  {r.status === 'OPEN' ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => void resolve(r, 'FIXED')}>Mark fixed</button>
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void resolve(r, 'DISMISSED')}>Dismiss</button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">
                      {r.status.toLowerCase()} by {r.resolvedBy}{r.resolvedAt ? ` on ${formatDate(r.resolvedAt.slice(0, 10))}` : ''}{r.resolutionNote ? `: ${r.resolutionNote}` : ''}
                    </p>
                  )}
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </AsyncContent>
    </section>
  );
}
