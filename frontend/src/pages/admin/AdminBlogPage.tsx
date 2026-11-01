import { useMemo, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Pagination } from '../../components/common/Pagination';
import { AsyncContent } from '../../components/common/States';
import { CREATOR_NAME } from '../../content/site';
import { useApi } from '../../hooks/useApi';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { adminBlogService, BLOG_CATEGORIES, blogCategoryLabel, type AdminBlogPost, type BlogCategory, type BlogPostInput } from '../../services/blogApi';
import { ApiError } from '../../services/http';
import { parseBody } from '../../utils/blogBody';
import { formatDate } from '../../utils/format';
import { BlogBody } from '../BlogPages';

const blank = (): BlogPostInput => ({
  title: '', slug: '', excerpt: '', body: '', category: 'ADMISSIONS', coverImageUrl: '', coverImageAlt: '', authorName: CREATOR_NAME, authorBio: '',
  metaTitle: '', metaDescription: '', published: false,
});

const toForm = (p: AdminBlogPost): BlogPostInput => ({
  title: p.title, slug: p.slug, excerpt: p.excerpt, body: p.body, category: p.category, coverImageUrl: p.coverImageUrl ?? '', coverImageAlt: p.coverImageAlt ?? '',
  authorName: p.authorName, authorBio: p.authorBio ?? '', metaTitle: p.metaTitle ?? '', metaDescription: p.metaDescription ?? '', published: p.published,
});

/** Write, publish, unpublish and delete blog posts. A post stays a draft until "Published" is ticked. */
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
    try {
      if (editing.id === null) await adminBlogService.create(editing.form);
      else await adminBlogService.update(editing.id, editing.form);
      setMessage(editing.form.published ? 'Saved and published.' : 'Saved as a draft.');
      setEditing(null);
      setNonce((n) => n + 1);
    } catch (err) {
      if (err instanceof ApiError) {
        setErrors(Object.fromEntries(err.fieldErrors.map((f) => [f.field, f.message])));
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
          <p className="mt-1 text-sm text-slate-600">Write and publish articles. Drafts are visible only here.</p>
        </div>
        {!editing && <button type="button" className="btn-primary" onClick={() => { setErrors({}); setMessage(null); setEditing({ id: null, form: blank() }); }}>New post</button>}
      </div>
      {message && <p role="status" className="rounded-xl bg-brand-50 p-3 text-sm text-brand-900">{message}</p>}

      {form ? (
        <form onSubmit={save} className="card space-y-4 p-5 text-sm">
          {text('Title', 'title', { required: true, maxLength: 160 })}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('Address', 'slug', { maxLength: 160, placeholder: 'made from the title', hint: 'The end of /blog/… Leave blank to use the title.' })}
            <label className="block">
              <span className="label">Category</span>
              <select className="input w-full" value={form.category} onChange={(e) => set('category', e.target.value as BlogCategory)}>
                {BLOG_CATEGORIES.map(([c, l]) => <option key={c} value={c}>{l}</option>)}
              </select>
            </label>
          </div>
          {text('Short excerpt', 'excerpt', { required: true, maxLength: 300, hint: 'Shown on the post card and, unless you set one below, in search results.' })}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <label className="block">
              <span className="label">Article</span>
              <textarea className="input w-full font-mono" rows={18} required maxLength={100000} value={form.body} onChange={(e) => set('body', e.target.value)} />
              <span className="mt-1 block text-xs text-slate-500">## Heading, ### Smaller heading, - list, 1. numbered list, **bold**, [link text](https://…). Leave a blank line between paragraphs.</span>
              {errors.body && <span className="field-error mt-1 block text-sm">{errors.body}</span>}
            </label>
            <div className="min-w-0">
              <p className="label">Preview</p>
              <div className="max-h-[30rem] overflow-y-auto rounded-xl border border-slate-200 p-4"><BlogBody blocks={preview} /></div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {text('Cover image address', 'coverImageUrl', { maxLength: 500, hint: 'Use only an image you have the right to publish. Must start with https://' })}
            {text('Cover image description', 'coverImageAlt', { maxLength: 200, hint: 'For people using screen readers.' })}
            {text('Author name', 'authorName', { required: true, maxLength: 100 })}
            {text('About the author', 'authorBio', { maxLength: 400 })}
            {text('Search title', 'metaTitle', { maxLength: 70, hint: 'Optional. Uses the post title if blank.' })}
            {text('Search description', 'metaDescription', { maxLength: 170, hint: 'Optional. Uses the excerpt if blank.' })}
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" className="h-4 w-4 rounded border-slate-300" checked={form.published} onChange={(e) => set('published', e.target.checked)} />
            Published: show this post on the site
          </label>
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
                      <p className="font-semibold">{p.title}</p>
                      <p className="text-xs text-slate-500">
                        {blogCategoryLabel(p.category)} · {p.published ? `Published ${formatDate(p.publishedAt)}` : 'Draft'} · Updated {formatDate(p.updatedAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {p.published && <Link to={`/blog/${p.slug}`} className="btn-ghost py-1.5 text-xs">View</Link>}
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => { setErrors({}); setMessage(null); setEditing({ id: p.id, form: toForm(p) }); }}>Edit</button>
                      <button type="button" className="btn-secondary py-1.5 text-xs" onClick={() => void remove(p)}>Delete</button>
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
