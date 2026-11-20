import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent } from '../../components/common/States';
import { CATEGORY_LABEL } from '../../components/home/updateVisuals';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminService, type OpportunityFields, type SiteUpdateRequest, type SiteUpdateRow, type SiteUpdateStatus } from '../../services/adminApi';
import { ApiError } from '../../services/http';
import type { UpdateCategory } from '../../services/publicApi';
import { formatDate } from '../../utils/format';
import { AdminSyncPanel, istTime } from './AdminSyncPanel';

const TABS: { value: SiteUpdateStatus; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Waiting for review' },
  { value: 'DRAFT', label: 'Drafts' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'ARCHIVED', label: 'Archived' },
];

const today = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const EMPTY: SiteUpdateRequest = {
  category: 'JOB', title: '', summary: '', imageUrl: null, publishedOn: today(), eventDate: null, eventLabel: null, deadline: false,
  sourceUrl: null, sourceName: null, linkPath: null, actionLabel: null, verificationStatus: 'UNVERIFIED', expiresOn: null, priority: 0,
};

const toRequest = (r: SiteUpdateRow): SiteUpdateRequest => ({
  category: r.category, title: r.title, summary: r.summary, imageUrl: r.imageUrl, publishedOn: r.publishedOn, eventDate: r.eventDate,
  eventLabel: r.eventLabel, deadline: r.deadline, sourceUrl: r.sourceUrl, sourceName: r.sourceName, linkPath: r.linkPath,
  actionLabel: r.actionLabel, verificationStatus: r.verificationStatus, expiresOn: r.expiresOn, priority: r.priority,
  ...(r.details ? { details: pickFacts(r.details) } : {}),
});

/** Only the known fact fields: the server refuses any other key when the update is saved. */
function pickFacts(d: OpportunityFields): OpportunityFields {
  const out = { ...BLANK_FACTS };
  for (const key of Object.keys(BLANK_FACTS) as (keyof OpportunityFields)[]) {
    (out as Record<string, unknown>)[key] = d[key] ?? null;
  }
  return out;
}

const BLANK_FACTS: OpportunityFields = {
  institutionName: null, campus: null, schoolId: null, sector: null, boarding: null, stateCode: null, city: null, noticeType: null,
  opensOn: null, closesOn: null, examOn: null, academicSession: null, classes: null, postTypes: null, subjects: null, staffKind: null,
  employmentType: null, vacancies: null, eligibility: null, experience: null, tetRequirement: null, ageLimit: null, salaryText: null,
  applicationFee: null, selectionProcess: null, applyUrl: null,
};

/** "PGT (Physics) | Physics | 3" per line, as the posts editor shows and reads them. */
const postsText = (r: SiteUpdateRow | undefined) =>
  (r?.positions ?? []).map((p) => [p.postName, p.subject ?? '', p.vacancies ?? ''].join(' | ').replace(/( \| )+$/, '')).join('\n');

const parsePosts = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean).map((l) => {
  const [name, subject, count] = l.split('|').map((s) => s.trim());
  const code = (name.match(/^(PGT|TGT|PRT|NTT)\b/i)?.[1] ?? '').toUpperCase();
  const n = Number.parseInt(count ?? '', 10);
  return { postName: name, postType: code || null, subject: subject || null, postCode: null, vacancies: n > 0 ? n : null, payScale: null, qualification: null };
});

/**
 * School and exam updates: notices found by the daily check of official websites (published automatically when the
 * site gives their date, otherwise waiting for review here) and editorial notices (job alerts and anything the check
 * does not cover). An editorial update is saved as a draft and appears on the home page and /updates once published;
 * every update drops off on its expiry date. Exam dates, open admissions and practice sets reach the feed by themselves.
 */
export function AdminUpdatesPage() {
  useDocumentTitle('Admin · School & exam updates');
  const [status, setStatus] = useState<SiteUpdateStatus>('PENDING_REVIEW');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [form, setForm] = useState<SiteUpdateRequest>(EMPTY);
  const [editing, setEditing] = useState<number | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [posts, setPosts] = useState('');
  const formRef = useRef<HTMLFormElement>(null);
  const rows = useApi(() => adminService.updates(status, page), [status, page, nonce]);

  const set = <K extends keyof SiteUpdateRequest>(key: K, value: SiteUpdateRequest[K]) => setForm((f) => ({ ...f, [key]: value }));
  const opportunity = form.category === 'JOB' || form.category === 'ADMISSION';
  const facts = form.details ?? BLANK_FACTS;
  const setFact = <K extends keyof OpportunityFields>(key: K, value: OpportunityFields[K]) =>
    setForm((f) => ({ ...f, details: { ...(f.details ?? BLANK_FACTS), [key]: value } }));
  const factText = (key: 'institutionName' | 'campus' | 'city' | 'academicSession' | 'classes' | 'postTypes' | 'subjects' | 'eligibility'
    | 'experience' | 'tetRequirement' | 'ageLimit' | 'salaryText' | 'applicationFee' | 'selectionProcess' | 'applyUrl' | 'stateCode') =>
    ({ value: facts[key] ?? '', onChange: (e: { target: { value: string } }) => setFact(key, e.target.value || null) });
  const factDate = (key: 'opensOn' | 'closesOn' | 'examOn') =>
    ({ value: facts[key] ?? '', onChange: (e: { target: { value: string } }) => setFact(key, e.target.value || null) });

  const savePosts = async () => {
    if (!editing) return;
    try {
      await adminService.setUpdatePositions(editing, parsePosts(posts));
      setMessage({ ok: true, text: 'Posts saved. Later daily checks keep them.' });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    }
  };
  const text = (key: 'title' | 'summary' | 'imageUrl' | 'eventLabel' | 'sourceUrl' | 'sourceName' | 'linkPath' | 'actionLabel') =>
    ({ value: form[key] ?? '', onChange: (e: { target: { value: string } }) => set(key, key === 'title' || key === 'summary' ? e.target.value : e.target.value || null) });

  const failed = (e: unknown) => {
    if (e instanceof ApiError) {
      const fields = e.fieldErrors.map((f) => `${f.field}: ${f.message}`).join('; ');
      setMessage({ ok: false, text: fields ? `${e.message} ${fields}` : e.message });
    } else {
      setMessage({ ok: false, text: 'The request failed.' });
    }
  };

  const save = async (ev: FormEvent) => {
    ev.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const body = { ...form, title: form.title.trim(), summary: form.summary.trim() };
      if (editing) await adminService.saveUpdate(editing, body);
      else await adminService.createUpdate(body);
      setMessage({ ok: true, text: editing ? 'Saved.' : 'Saved as a draft. Publish it from the Drafts list when it is checked.' });
      setEditing(null);
      setForm({ ...EMPTY, publishedOn: today() });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    } finally {
      setBusy(false);
    }
  };

  const act = async (row: SiteUpdateRow, action: 'publish' | 'archive') => {
    if (action === 'publish' && row.category !== 'PREP' && !row.sourceUrl) {
      setMessage({ ok: false, text: 'Add the official source before publishing.' });
      return;
    }
    if (action === 'archive' && !window.confirm(`Archive “${row.title}”? It will no longer be shown.`)) return;
    try {
      if (action === 'publish') await adminService.publishUpdate(row.id);
      else await adminService.archiveUpdate(row.id);
      setMessage({ ok: true, text: action === 'publish' ? 'Published: it now appears in the public feed.' : 'Archived.' });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    }
  };

  const supersede = async (row: SiteUpdateRow) => {
    const answer = window.prompt(`Which update replaces “${row.title}”? Enter its number (#).`);
    const by = Number.parseInt((answer ?? '').replace('#', ''), 10);
    if (!by) return;
    try {
      await adminService.supersedeUpdate(row.id, by);
      setMessage({ ok: true, text: `Taken off the site: replaced by update #${by}.` });
      setNonce((n) => n + 1);
    } catch (e) {
      failed(e);
    }
  };

  const edit = (row: SiteUpdateRow) => {
    setEditing(row.id);
    setForm(toRequest(row));
    setPosts(postsText(row));
    setMessage(null);
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">School &amp; exam updates</h1>
        <p className="mt-1 text-sm text-slate-600">
          Notices for the home page’s “Latest School &amp; Exam Updates” and <Link to="/updates" className="link" target="_blank">/updates</Link>,
          such as teaching job alerts. Exam dates, open admissions and new practice sets appear there by themselves, and the daily
          check adds notices from approved official websites. Every notice except practice needs its official source; only titles,
          dates and links are taken from official sites, never their text.
        </p>
      </div>

      <AdminSyncPanel onRan={() => setNonce((n) => n + 1)} />

      <form ref={formRef} onSubmit={(e) => void save(e)} className="card space-y-4 p-5 text-sm" aria-labelledby="update-form-title">
        <h2 id="update-form-title" className="text-lg font-semibold">{editing ? `Edit update #${editing}` : 'New update (saved as a draft)'}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Kind</span>
            <select className="input" value={form.category} onChange={(e) => set('category', e.target.value as UpdateCategory)}>
              {(Object.keys(CATEGORY_LABEL) as UpdateCategory[]).map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="label">Published on</span>
            <input type="date" required className="input" value={form.publishedOn} onChange={(e) => set('publishedOn', e.target.value)} />
          </label>
          <label className="block">
            <span className="label">Remove after (optional)</span>
            <input type="date" className="input" value={form.expiresOn ?? ''} onChange={(e) => set('expiresOn', e.target.value || null)} />
          </label>
        </div>
        <label className="block">
          <span className="label">Headline (10–160 characters)</span>
          <input className="input" required minLength={10} maxLength={160} {...text('title')} />
        </label>
        <label className="block">
          <span className="label">Summary (20–400 characters)</span>
          <textarea className="input min-h-[84px]" required minLength={20} maxLength={400} {...text('summary')} />
        </label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block">
            <span className="label">Key date (optional)</span>
            <input type="date" className="input" value={form.eventDate ?? ''} onChange={(e) => set('eventDate', e.target.value || null)} />
          </label>
          <label className="block">
            <span className="label">What the date is</span>
            <input className="input" maxLength={60} placeholder="Last date to apply" {...text('eventLabel')} />
          </label>
          <label className="flex items-center gap-2 self-end pb-2.5">
            <input type="checkbox" checked={form.deadline} onChange={(e) => set('deadline', e.target.checked)} />
            <span>It is a deadline (shows “Closing soon” in its last 14 days)</span>
          </label>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Official source URL {form.category === 'PREP' ? '(optional)' : '(required)'}</span>
            <input type="url" className="input" maxLength={600} placeholder="https://…" {...text('sourceUrl')} />
          </label>
          <label className="block">
            <span className="label">Source name</span>
            <input className="input" maxLength={120} placeholder="e.g. Navodaya Vidyalaya Samiti" {...text('sourceName')} />
          </label>
          <label className="block">
            <span className="label">Page on this site (optional; otherwise the source opens)</span>
            <input className="input" maxLength={300} placeholder="/exams/aissee" pattern="/[^/].*|/" {...text('linkPath')} />
          </label>
          <label className="block">
            <span className="label">Button text (optional)</span>
            <input className="input" maxLength={40} placeholder="View Jobs" {...text('actionLabel')} />
          </label>
          <label className="block">
            <span className="label">Image URL (optional; only a licensed or own picture)</span>
            <input type="url" className="input" maxLength={600} {...text('imageUrl')} />
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="label">Checked against the source?</span>
              <select className="input" value={form.verificationStatus ?? 'UNVERIFIED'}
                onChange={(e) => set('verificationStatus', e.target.value as SiteUpdateRequest['verificationStatus'])}>
                <option value="UNVERIFIED">Not yet</option>
                <option value="VERIFIED">Yes, checked</option>
              </select>
            </label>
            <label className="block">
              <span className="label">Priority (−100 to 100)</span>
              <input type="number" min={-100} max={100} className="input" value={form.priority}
                onChange={(e) => set('priority', Number.parseInt(e.target.value, 10) || 0)} />
            </label>
          </div>
        </div>
        {opportunity && (
          <details className="rounded-xl bg-slate-50 p-4" open={!!form.details}>
            <summary className="cursor-pointer font-semibold">
              {form.category === 'JOB' ? 'Job' : 'Admission'} facts from the official notice (optional)
            </summary>
            <p className="mt-2 text-xs text-slate-600">
              Enter only what the official notice states; leave the rest empty (the page then says “not given”). Daily checks never
              overwrite what staff save. A last date here also sets the card’s date line.
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              <label className="block">
                <span className="label">Kind of notice</span>
                <select className="input" value={facts.noticeType ?? ''}
                  onChange={(e) => setFact('noticeType', (e.target.value || null) as OpportunityFields['noticeType'])}>
                  <option value="">Not set</option>
                  <option value="OPENING">Opening (applications invited)</option>
                  <option value="EXTENSION">Last date extended</option>
                  <option value="CORRIGENDUM">Corrigendum</option>
                  <option value="SCHEDULE">Test or interview schedule</option>
                  <option value="ADMIT_CARD">Admit cards</option>
                  <option value="RESULT">Result or list</option>
                  <option value="OTHER">Other</option>
                </select>
              </label>
              <label className="block"><span className="label">Applications open</span><input type="date" className="input" {...factDate('opensOn')} /></label>
              <label className="block"><span className="label">Last date</span><input type="date" className="input" {...factDate('closesOn')} /></label>
              <label className="block"><span className="label">Exam / interview date</span><input type="date" className="input" {...factDate('examOn')} /></label>
              <label className="block"><span className="label">Institution</span><input className="input" maxLength={160} {...factText('institutionName')} /></label>
              <label className="block"><span className="label">Campus</span><input className="input" maxLength={120} {...factText('campus')} /></label>
              <label className="block"><span className="label">State code</span><input className="input" maxLength={2} placeholder="DL" {...factText('stateCode')} /></label>
              <label className="block"><span className="label">City</span><input className="input" maxLength={80} {...factText('city')} /></label>
              <label className="block">
                <span className="label">Government or private</span>
                <select className="input" value={facts.sector ?? ''} onChange={(e) => setFact('sector', (e.target.value || null) as OpportunityFields['sector'])}>
                  <option value="">Not set</option><option value="GOVERNMENT">Government</option><option value="PRIVATE">Private</option>
                </select>
              </label>
              <label className="block">
                <span className="label">Boarding</span>
                <select className="input" value={facts.boarding === null ? '' : String(facts.boarding)}
                  onChange={(e) => setFact('boarding', e.target.value === '' ? null : e.target.value === 'true')}>
                  <option value="">Not set</option><option value="true">Residential</option><option value="false">Day school</option>
                </select>
              </label>
              {form.category === 'JOB' ? (
                <>
                  <label className="block"><span className="label">Post codes</span><input className="input" maxLength={160} placeholder="PGT,TGT" {...factText('postTypes')} /></label>
                  <label className="block"><span className="label">Subjects</span><input className="input" maxLength={240} placeholder="Physics,Mathematics" {...factText('subjects')} /></label>
                  <label className="block">
                    <span className="label">Number of posts</span>
                    <input type="number" min={1} className="input" value={facts.vacancies ?? ''}
                      onChange={(e) => setFact('vacancies', Number.parseInt(e.target.value, 10) || null)} />
                  </label>
                  <label className="block"><span className="label">Pay (as published)</span><input className="input" maxLength={200} {...factText('salaryText')} /></label>
                  <label className="block"><span className="label">TET / CTET</span><input className="input" maxLength={200} {...factText('tetRequirement')} /></label>
                  <label className="block"><span className="label">Experience</span><input className="input" maxLength={300} {...factText('experience')} /></label>
                </>
              ) : (
                <>
                  <label className="block"><span className="label">Classes</span><input className="input" maxLength={80} placeholder="VI, IX" {...factText('classes')} /></label>
                  <label className="block"><span className="label">Session</span><input className="input" maxLength={9} placeholder="2027-28" {...factText('academicSession')} /></label>
                </>
              )}
              <label className="block"><span className="label">Age limit</span><input className="input" maxLength={200} {...factText('ageLimit')} /></label>
              <label className="block"><span className="label">Application fee</span><input className="input" maxLength={200} {...factText('applicationFee')} /></label>
              <label className="block"><span className="label">Official application URL</span><input type="url" className="input" maxLength={600} {...factText('applyUrl')} /></label>
            </div>
            <label className="mt-4 block">
              <span className="label">Eligibility, in the notice’s words</span>
              <textarea className="input min-h-[64px]" maxLength={600} {...factText('eligibility')} />
            </label>
            <label className="mt-4 block">
              <span className="label">Selection process</span>
              <textarea className="input min-h-[48px]" maxLength={400} {...factText('selectionProcess')} />
            </label>
            {form.category === 'JOB' && editing && (
              <div className="mt-4">
                <label className="block">
                  <span className="label">Posts, one per line: post | subject | number of posts</span>
                  <textarea className="input min-h-[84px] font-mono text-xs" value={posts} onChange={(e) => setPosts(e.target.value)}
                    placeholder={'PGT (Physics) | Physics | 2\nTGT (Mathematics) | Mathematics | 4'} />
                </label>
                <button type="button" className="btn-secondary mt-2 py-1.5 text-xs" onClick={() => void savePosts()}>Save posts</button>
              </div>
            )}
          </details>
        )}
        {message && <p role={message.ok ? 'status' : 'alert'} className={`rounded-xl p-3 ${message.ok ? 'bg-emerald-50 text-emerald-900' : 'bg-red-50 text-red-800'}`}>{message.text}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Save draft'}</button>
          {editing && <button type="button" className="btn-secondary" onClick={() => { setEditing(null); setForm({ ...EMPTY, publishedOn: today() }); }}>Cancel</button>}
        </div>
      </form>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Show updates">
        {TABS.map((t) => (
          <button key={t.value} type="button" aria-pressed={status === t.value} onClick={() => { setStatus(t.value); setPage(0); }}
            className={`chip px-3 py-1 text-sm ${status === t.value ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <AsyncContent state={rows} isEmpty={(d) => d.content.length === 0} empty={<p className="text-sm text-slate-600">Nothing here.</p>}>
        {(data) => (
          <>
            <ul className="space-y-3">
              {data.content.map((r) => (
                <li key={r.id} className="card space-y-1.5 p-4 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-semibold"><span className="text-slate-400">#{r.id}</span> {r.title}</p>
                    <p className="text-xs text-slate-500">
                      {CATEGORY_LABEL[r.category]} · {r.dateConfirmed ? 'published' : 'found'} {formatDate(r.publishedOn)}
                      {r.expiresOn ? ` · until ${formatDate(r.expiresOn)}` : ''}
                    </p>
                  </div>
                  {r.origin === 'OFFICIAL_SYNC' && (
                    <p className="text-xs text-slate-600">
                      <span className="rounded bg-royal-50 px-1.5 py-0.5 font-semibold text-royal-800">Found on the official site ({r.sourceKey})</span>
                      {' '}first seen {istTime(r.firstSeenAt)} · last seen {istTime(r.lastSeenAt)}
                      {r.lastChangedAt ? ` · changed at the source ${istTime(r.lastChangedAt)}` : ''}
                      {r.staffEdited ? ' · edited by staff' : ''}
                      {r.withdrawnAt ? ` · withdrawn ${istTime(r.withdrawnAt)}` : ''}
                      {r.supersededById ? ` · replaced by #${r.supersededById}` : ''}
                    </p>
                  )}
                  {r.officialTitle && r.officialTitle !== r.title && <p className="text-xs text-slate-600">Official title: {r.officialTitle}</p>}
                  {!r.dateConfirmed && (
                    <p className="rounded-lg bg-amber-50 p-2 text-xs text-amber-900">
                      The source gave no date. Open the notice, then edit this update with its real publication date before publishing.
                    </p>
                  )}
                  {r.reviewNote && <p className="rounded-lg bg-slate-50 p-2 text-xs text-slate-700">{r.reviewNote}</p>}
                  <p className="text-slate-700">{r.summary}</p>
                  {r.slug && (r.category === 'JOB' || r.category === 'ADMISSION') && (
                    <p className="text-xs text-slate-600">
                      {r.details?.noticeType ? `${r.details.noticeType.toLowerCase().replace('_', ' ')} · ` : ''}
                      {r.details?.closesOn ? `last date ${formatDate(r.details.closesOn)} · ` : ''}
                      {r.details?.postTypes ? `${r.details.postTypes} · ` : ''}
                      {r.positions.length ? `${r.positions.length} post(s) · ` : ''}
                      {(r.status === 'PUBLISHED' || r.status === 'EXPIRED')
                        ? <a href={`/${r.category === 'JOB' ? 'jobs' : 'admissions'}/${r.slug}`} target="_blank" rel="noopener noreferrer" className="link">Public page</a>
                        : <span>page /{r.category === 'JOB' ? 'jobs' : 'admissions'}/{r.slug} (shown once published)</span>}
                    </p>
                  )}
                  <p className="text-xs text-slate-500">
                    {r.eventDate ? `${r.eventLabel ?? 'Date'}: ${formatDate(r.eventDate)}${r.deadline ? ' (deadline)' : ''} · ` : ''}
                    {r.sourceUrl ? <a href={r.sourceUrl} target="_blank" rel="noopener noreferrer" className="link">{r.sourceName ?? 'Source'}</a> : 'No source'}
                    {' · '}{r.verificationStatus === 'VERIFIED' ? 'Checked' : 'Not checked yet'}
                    {r.updatedBy ? ` · last edited by ${r.updatedBy}` : ''}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => edit(r)}>Edit</button>
                    {r.status !== 'PUBLISHED' && <button type="button" className="btn-primary py-1.5 text-xs" onClick={() => void act(r, 'publish')}>Publish</button>}
                    {r.status !== 'ARCHIVED' && <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void act(r, 'archive')}>Archive</button>}
                    {r.status !== 'ARCHIVED' && <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void supersede(r)}>Replaced by…</button>}
                  </div>
                </li>
              ))}
            </ul>
            <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
          </>
        )}
      </AsyncContent>
    </div>
  );
}
