import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PaidLabel } from '../../components/common/Badges';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent } from '../../components/common/States';
import { CREATOR_INSTITUTE, CREATOR_NAME } from '../../content/site';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import {
  adminBlogService, BLOG_CATEGORIES, BLOG_STATUSES, blogCategoryLabel, type AdminBlogPost, type BlogCategory, type BlogPostInput, type BlogStatus,
} from '../../services/blogApi';
import { ApiError } from '../../services/http';
import { parseBody } from '../../utils/blogBody';
import { formatDate } from '../../utils/format';
import { BlogBody } from '../BlogPages';

/** The real editor who reviews every article; shown as the byline (no invented authors). */
const EDITOR_BIO = `Editor of SchoolDhundo and an alumnus of the ${CREATOR_INSTITUTE}. Checks every article against official sources before it is published.`;

const blank = (): BlogPostInput => ({
  title: '', slug: '', excerpt: '', body: '', category: 'ADMISSIONS', coverImageUrl: '', coverImageAlt: '', authorName: `${CREATOR_NAME}, Editor`,
  authorBio: EDITOR_BIO, metaTitle: '', metaDescription: '', published: false, status: 'DRAFT', publishAt: null, featured: false, sponsored: false,
  tags: [], lastReviewedOn: null, sources: [], faqs: [],
});

const toForm = (p: AdminBlogPost): BlogPostInput => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, category: p.category, coverImageUrl: p.coverImageUrl ?? '', coverImageAlt: p.coverImageAlt ?? '',
  authorName: p.authorName, authorBio: p.authorBio ?? '', metaTitle: p.metaTitle ?? '', metaDescription: p.metaDescription ?? '', published: p.published,
  status: p.status, publishAt: p.status === 'PUBLISHED' ? p.publishedAt : null, featured: p.featured, sponsored: p.sponsored, tags: p.tags,
  lastReviewedOn: p.lastReviewedOn, sources: p.sources, faqs: p.faqs,
});

const STATUS_TONE: Record<BlogStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700', FACT_CHECK: 'bg-amber-50 text-amber-900', REVIEW: 'bg-violet-50 text-violet-900',
  APPROVED: 'bg-sky-50 text-sky-900', PUBLISHED: 'bg-emerald-50 text-emerald-800',
};
const statusLabel = (s: BlogStatus) => BLOG_STATUSES.find(([v]) => v === s)?.[1] ?? s;
/** A published post whose publication time is still ahead. */
const scheduled = (p: AdminBlogPost) => p.status === 'PUBLISHED' && !!p.publishedAt && new Date(p.publishedAt).getTime() > Date.now();
/** datetime-local works in local time without seconds. */
const toLocalInput = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');

/**
 * Write and move articles through the workflow: draft, fact check, editorial review, approved, published (now or at a
 * scheduled time). Publishing needs at least one source. Drafts and scheduled posts are visible only here.
 */
export function AdminBlogPage() {
  useDocumentTitle('Admin · Blog');
  const [page, setPage] = useState(0);
  const [nonce, setNonce] = useState(0);
  const [editing, setEditing] = useState<{ id: number | null; form: BlogPostInput } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const posts = useApi(() => adminBlogService.list(page), [page, nonce]);
  const form = editing?.form;
  const preview = useMemo(() => parseBody(form?.body ?? ''), [form?.body]);
  const set = <K extends keyof BlogPostInput>(k: K, v: BlogPostInput[K]) => setEditing((e) => (e ? { ...e, form: { ...e.form, [k]: v } } : e));

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setErrors({});
    setMessage(null);
    const body: BlogPostInput = { ...editing.form, published: editing.form.status === 'PUBLISHED',
      sources: editing.form.sources.filter((s) => s.title.trim() || s.url.trim()), faqs: editing.form.faqs.filter((f) => f.question.trim() || f.answer.trim()) };
    try {
      if (editing.id === null) await adminBlogService.create(body);
      else await adminBlogService.update(editing.id, body);
      const later = body.status === 'PUBLISHED' && body.publishAt && new Date(body.publishAt).getTime() > Date.now();
      setMessage(body.status === 'PUBLISHED' ? (later ? `Scheduled for ${formatDate(body.publishAt)}.` : 'Saved and published.') : `Saved: ${statusLabel(body.status)}.`);
      setEditing(null);
      setNonce((n) => n + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field.replace(/\[\d+\].*/, ''), f.message])));
        setMessage(err.fieldErrors.length ? 'Please correct the highlighted fields.' : err.message);
      } else setMessage('The post could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (p: AdminBlogPost) => {
    if (!window.confirm(`Delete "${p.title}"? This cannot be undone.`)) return;
    try {
      await adminBlogService.remove(p.id);
      setNonce((n) => n + 1);
    } catch (e) {
      setMessage(e instanceof ApiError ? e.message : 'The post could not be deleted.');
    }
  };

  const text = (label: string, key: keyof BlogPostInput, opts: { hint?: string; maxLength: number; required?: boolean; placeholder?: string }) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input w-full" required={opts.required} maxLength={opts.maxLength} placeholder={opts.placeholder} value={String(form?.[key] ?? '')}
        onChange={(e) => set(key, e.target.value as never)} />
      {opts.hint && !errors[key] && <span className="mt-1 block text-xs text-slate-500">{opts.hint}</span>}
      {errors[key] && <span className="field-error mt-1 block text-sm">{errors[key]}</span>}
    </label>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Blog</h1>
          <p className="mt-1 text-sm text-slate-600">Draft → Fact check → Editorial review → Approved → Published. Only published articles whose time has come are public.</p>
        </div>
        {!editing && <button type="button" className="btn-primary" onClick={() => { setErrors({}); setMessage(null); setEditing({ id: null, form: blank() }); }}>New post</button>}
      </div>
      {message && <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{message}</p>}

      {form ? (
        <form onSubmit={save} className="card space-y-5 p-5 text-sm">
          {text('Title', 'title', { required: true, maxLength: 160 })}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {text('Address', 'slug', { maxLength: 160, placeholder: 'made from the title', hint: 'The end of /blog/… Leave blank to use the title.' })}
            <label className="block">
              <span className="label">Category</span>
              <select className="input w-full" value={form.category} onChange={(e) => set('category', e.target.value as BlogCategory)}>
                {BLOG_CATEGORIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="label">Topics</span>
              <input className="input w-full" value={form.tags.join(', ')} placeholder="JNVST, Class 6, admission"
                onChange={(e) => set('tags', e.target.value.split(',').map((t) => t.trimStart()).filter((t, i, all) => t || i === all.length - 1))} />
              <span className="mt-1 block text-xs text-slate-500">Separate with commas; up to 12.</span>
            </label>
          </div>
          {text('Introduction (excerpt)', 'excerpt', { required: true, maxLength: 300, hint: 'Shown under the title, on cards and, unless set below, in search results.' })}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="label">Article</span>
              <textarea className="input w-full font-mono" rows={22} required maxLength={100000} value={form.body} onChange={(e) => set('body', e.target.value)} />
              <span className="mt-1 block text-xs text-slate-500">
                ## Heading · ### Smaller heading · - list · 1. numbered · **bold** · [link](https://…) · | table | row | (first row is the header) · &gt; note.
                Blank line between paragraphs.
              </span>
              {errors.body && <span className="field-error mt-1 block text-sm">{errors.body}</span>}
            </label>
            <div className="min-w-0">
              <p className="label">Preview</p>
              <div className="max-h-[36rem] overflow-y-auto rounded-xl border border-slate-200 p-4"><BlogBody blocks={preview} /></div>
            </div>
          </div>

          <fieldset className="space-y-2 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 font-semibold">Sources (official notices first)</legend>
            {errors.sources && <p className="field-error text-sm">{errors.sources}</p>}
            {form.sources.map((s, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_160px_auto]">
                <input className="input" aria-label={`Source ${i + 1} title`} placeholder="Title, e.g. JNVST 2026 prospectus" value={s.title} maxLength={200}
                  onChange={(e) => set('sources', form.sources.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))} />
                <input className="input" aria-label={`Source ${i + 1} address`} placeholder="https://…" value={s.url} maxLength={500}
                  onChange={(e) => set('sources', form.sources.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                <input className="input" type="date" aria-label={`Source ${i + 1} checked on`} value={s.checkedOn ?? ''}
                  onChange={(e) => set('sources', form.sources.map((x, j) => (j === i ? { ...x, checkedOn: e.target.value || null } : x)))} />
                <button type="button" className="btn-ghost text-xs" onClick={() => set('sources', form.sources.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => set('sources', [...form.sources, { title: '', url: '', checkedOn: new Date().toISOString().slice(0, 10) }])}>Add source</button>
          </fieldset>

          <fieldset className="space-y-2 rounded-xl border border-slate-200 p-4">
            <legend className="px-1 font-semibold">Frequently asked questions (optional)</legend>
            {form.faqs.map((f, i) => (
              <div key={i} className="grid gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
                <input className="input" aria-label={`Question ${i + 1}`} placeholder="Question" value={f.question} maxLength={300}
                  onChange={(e) => set('faqs', form.faqs.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} />
                <textarea className="input" rows={2} aria-label={`Answer ${i + 1}`} placeholder="Answer" value={f.answer} maxLength={2000}
                  onChange={(e) => set('faqs', form.faqs.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} />
                <button type="button" className="btn-ghost text-xs" onClick={() => set('faqs', form.faqs.filter((_, j) => j !== i))}>Remove</button>
              </div>
            ))}
            <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => set('faqs', [...form.faqs, { question: '', answer: '' }])}>Add question</button>
          </fieldset>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('Cover image address', 'coverImageUrl', { maxLength: 500, hint: 'Use only an image you have the right to publish. Must start with https://' })}
            {text('Cover image description', 'coverImageAlt', { maxLength: 200, hint: 'For people using screen readers and for Google Images.' })}
            {text('Author / editor', 'authorName', { required: true, maxLength: 100 })}
            {text('About the author', 'authorBio', { maxLength: 400 })}
            {text('Search title', 'metaTitle', { maxLength: 70, hint: 'Optional, up to 70 characters. Uses the title if blank.' })}
            {text('Search description', 'metaDescription', { maxLength: 170, hint: 'Optional, up to 170 characters. Uses the introduction if blank.' })}
            <label className="block">
              <span className="label">Facts checked on</span>
              <input className="input w-full" type="date" value={form.lastReviewedOn ?? ''} onChange={(e) => set('lastReviewedOn', e.target.value || null)} />
              <span className="mt-1 block text-xs text-slate-500">The day the dates, rules and figures were last checked against the sources.</span>
            </label>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-xl bg-slate-50 p-4 sm:grid-cols-3">
            <label className="block">
              <span className="label">Workflow step</span>
              <select className="input w-full" value={form.status} onChange={(e) => set('status', e.target.value as BlogStatus)}>
                {BLOG_STATUSES.map(([s, l]) => <option key={s} value={s}>{l}</option>)}
              </select>
            </label>
            {form.status === 'PUBLISHED' && (
              <label className="block">
                <span className="label">Publish at</span>
                <input className="input w-full" type="datetime-local" value={toLocalInput(form.publishAt)}
                  onChange={(e) => set('publishAt', e.target.value ? new Date(e.target.value).toISOString() : null)} />
                <span className="mt-1 block text-xs text-slate-500">Blank: now. A later time schedules it.</span>
              </label>
            )}
            <div className="space-y-2 self-end">
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.featured} onChange={(e) => set('featured', e.target.checked)} /> Feature on the blog home</label>
              <label className="flex items-center gap-2"><input type="checkbox" checked={form.sponsored} onChange={(e) => set('sponsored', e.target.checked)} /> Sponsored (paid; labelled on the site)</label>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
            <button type="button" className="btn-secondary" onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      ) : (
        <AsyncContent state={posts} isEmpty={(d) => d.content.length === 0} empty={<p className="text-sm text-slate-600">No posts yet. Choose “New post” to write the first one.</p>}>
          {(data) => (
            <>
              <ul className="space-y-3">
                {data.content.map((p) => (
                  <li key={p.id} className="card flex flex-wrap items-center justify-between gap-3 p-4 text-sm">
                    <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-semibold">
                        {p.title}
                        <span className={`chip ${STATUS_TONE[p.status]}`}>{scheduled(p) ? `Scheduled ${formatDate(p.publishedAt)}` : statusLabel(p.status)}</span>
                        {p.featured && <span className="chip bg-brand-50 text-brand-700">Featured</span>}
                        {p.sponsored && <PaidLabel />}
                      </p>
                      <p className="text-xs text-slate-500">
                        {blogCategoryLabel(p.category)} · {p.sources.length} {p.sources.length === 1 ? 'source' : 'sources'}
                        {p.lastReviewedOn ? ` · facts checked ${formatDate(p.lastReviewedOn)}` : ''} · updated {formatDate(p.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.status === 'PUBLISHED' && !scheduled(p) && <Link to={`/blog/${p.slug}`} className="btn-ghost py-1.5 text-xs">View</Link>}
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => { setErrors({}); setMessage(null); setEditing({ id: p.id, form: toForm(p) }); }}>Edit</button>
                      {p.status !== 'PUBLISHED' && <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void remove(p)}>Delete</button>}
                    </div>
                  </li>
                ))}
              </ul>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />
            </>
          )}
        </AsyncContent>
      )}
    </div>
  );
}
