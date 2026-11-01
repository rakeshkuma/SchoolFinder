import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { Icon } from '../components/common/Icon';
import { PageHeader } from '../components/common/PageHeader';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, Spinner } from '../components/common/States';
import { SchoolImage } from '../components/school/SchoolImage';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { BLOG_CATEGORIES, blogCategoryLabel, blogService, type BlogCard } from '../services/blogApi';
import { contents, parseBody, parseInline, type Block } from '../utils/blogBody';
import { formatDate } from '../utils/format';

const PAGE_SIZE = 9;

function Card({ post }: { post: BlogCard }) {
  const to = `/blog/${post.slug}`;
  return (
    <article className="card card-hover flex flex-col overflow-hidden">
      <Link to={to} tabIndex={-1} aria-hidden>
        <SchoolImage src={post.coverImageUrl} name={post.title} alt={post.coverImageAlt ?? undefined} zoom={false} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">{blogCategoryLabel(post.category)}</p>
        <h2 className="mt-1 font-display text-lg font-bold leading-snug text-ink"><Link to={to} className="hover:text-brand-700">{post.title}</Link></h2>
        <p className="mt-2 line-clamp-3 flex-1 text-sm text-slate-600">{post.excerpt}</p>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500">
          <span>{formatDate(post.publishedAt)} · {post.minutesToRead} min read</span>
          <Link to={to} className="link whitespace-nowrap text-sm font-semibold">Read more<span className="sr-only">: {post.title}</span></Link>
        </div>
      </div>
    </article>
  );
}

/** The blog: search and category at the top, then a paged grid of posts. */
export function BlogListPage() {
  useDocumentTitle('Blogs', 'Practical guides for Indian parents on admissions, choosing a board, fees and scholarships, and parenting.');
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const category = BLOG_CATEGORIES.find(([c]) => c === sp.get('category'))?.[0];
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const posts = useApi(() => blogService.list({ q: q || undefined, category, page, size: PAGE_SIZE }), [q, category, page]);
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  const chip = (active: boolean) => `chip px-3 py-1.5 text-sm font-semibold transition ${active ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`;
  const filtered = !!q || !!category;
  return (
    <>
      <PageHeader title="Blogs" subtitle="Practical guides for parents on admissions, boards, fees and school life."
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/blog', label: 'Blogs' }]} />} />
      <div className="container-page space-y-6 py-8">
        <section className="card space-y-3 p-4" aria-label="Find an article">
          <form role="search" className="flex min-w-0 gap-2" onSubmit={(e) => { e.preventDefault(); set({ q: String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined }); }}>
            <label className="sr-only" htmlFor="blog-search">Search articles</label>
            <input id="blog-search" name="q" className="input min-w-0 flex-1" maxLength={100} placeholder="Search articles" defaultValue={q} key={q} />
            <button type="submit" className="btn-secondary"><Icon name="search" className="h-4 w-4" /><span className="sr-only">Search</span></button>
          </form>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Category">
            <button type="button" aria-pressed={!category} className={chip(!category)} onClick={() => set({ category: undefined })}>All</button>
            {BLOG_CATEGORIES.map(([code, label]) => (
              <button key={code} type="button" aria-pressed={category === code} className={chip(category === code)} onClick={() => set({ category: code })}>{label}</button>
            ))}
          </div>
        </section>
        <AsyncContent state={posts} isEmpty={(d) => d.content.length === 0} empty={(
          <EmptyState title={filtered ? 'No article matches.' : 'New articles are on their way.'}>
            {filtered ? <button type="button" className="link" onClick={() => set({ q: undefined, category: undefined })}>Show all articles</button>
              : <Link to="/schools" className="link">Find schools in the meantime</Link>}
          </EmptyState>
        )}>
          {(data) => (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{data.content.map((p) => <Card key={p.slug} post={p} />)}</div>
              <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p > 0 ? String(p) : undefined })} />
            </>
          )}
        </AsyncContent>
      </div>
    </>
  );
}

function RichText({ text }: { text: string }) {
  return (
    <>
      {parseInline(text).map((part, i) => {
        if (part.kind === 'bold') return <strong key={i} className="font-semibold text-ink">{part.text}</strong>;
        if (part.kind === 'text') return <span key={i}>{part.text}</span>;
        return part.href.startsWith('/')
          ? <Link key={i} to={part.href} className="link">{part.text}</Link>
          : <a key={i} href={part.href} className="link" target="_blank" rel="noopener noreferrer">{part.text}</a>;
      })}
    </>
  );
}

/** Also shown as the preview while writing a post. */
export function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[1.0625rem] leading-8 text-slate-800">
      {blocks.map((b, i) => {
        if (b.kind === 'p') return <p key={i}><RichText text={b.text} /></p>;
        if ('items' in b) {
          const List = b.kind;
          return <List key={i} className={`space-y-2 pl-6 ${b.kind === 'ul' ? 'list-disc' : 'list-decimal'}`}>{b.items.map((item, j) => <li key={j}><RichText text={item} /></li>)}</List>;
        }
        return b.kind === 'h2'
          ? <h2 key={i} id={b.id} className="scroll-mt-24 pt-3 font-display text-2xl font-bold text-ink"><RichText text={b.text} /></h2>
          : <h3 key={i} id={b.id} className="scroll-mt-24 font-display text-xl font-bold text-ink"><RichText text={b.text} /></h3>;
      })}
    </div>
  );
}

function ShareLinks({ title }: { title: string }) {
  const url = window.location.href.split(/[?#]/)[0];
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(title);
  const links = [
    ['WhatsApp', `https://wa.me/?text=${encodeURIComponent(`${title} ${url}`)}`],
    ['Facebook', `https://www.facebook.com/sharer/sharer.php?u=${u}`],
    ['X', `https://twitter.com/intent/tweet?url=${u}&text=${t}`],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-ink">Share:</span>
      {links.map(([name, href]) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary rounded-full px-3 py-1.5 text-sm">
          {name}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

export function BlogPostPage() {
  const { slug = '' } = useParams();
  const state = useApi(() => blogService.article(slug), [slug]);
  const post = state.data;
  useDocumentTitle(post?.card.title ?? 'Blogs', post?.card.excerpt);
  if (state.error?.status === 404) {
    return (
      <div className="container-page py-12">
        <EmptyState title="This article is not available."><Link to="/blog" className="link">See all articles</Link></EmptyState>
      </div>
    );
  }
  if (!post) return <div className="container-page py-12">{state.error ? <EmptyState title="This article could not be opened."><Link to="/blog" className="link">See all articles</Link></EmptyState> : <Spinner label="Loading article…" />}</div>;
  const { card } = post;
  const blocks = parseBody(post.body);
  const toc = contents(blocks);
  return (
    <>
      <PageHeader eyebrow={blogCategoryLabel(card.category)} title={card.title}
        subtitle={`${card.authorName} · ${formatDate(card.publishedAt)} · ${card.minutesToRead} min read`}
        top={<Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/blog', label: 'Blogs' }, { to: `/blog/${card.slug}`, label: card.title }]} />} />
      <div className="container-page grid grid-cols-1 gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="mx-auto w-full min-w-0 max-w-3xl space-y-6">
          {card.coverImageUrl && <SchoolImage src={card.coverImageUrl} name={card.title} alt={card.coverImageAlt ?? undefined} zoom={false} priority className="rounded-2xl" />}
          <BlogBody blocks={blocks} />
          <ShareLinks title={card.title} />
          <section aria-label="About the author" className="card p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Written by</p>
            <p className="mt-1 font-display font-bold text-ink">{card.authorName}</p>
            {post.authorBio && <p className="mt-1 text-sm text-slate-600">{post.authorBio}</p>}
          </section>
          <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-violet-700 p-6 text-white">
            <h2 className="font-display text-xl font-bold text-white">Find the best school near you</h2>
            <p className="mt-1 text-sm text-blue-100">Search by location, board and fees, with every fact linked to its source.</p>
            <Link to="/schools" className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-blue-50">Search schools</Link>
          </section>
        </article>
        {toc.length > 1 && (
          <aside className="order-first lg:order-last">
            <nav aria-label="In this article" className="card p-4 text-sm lg:sticky lg:top-24">
              <h2 className="mb-2 font-semibold text-ink">In this article</h2>
              <ol className="space-y-1.5">{toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="link">{t.text}</a></li>)}</ol>
            </nav>
          </aside>
        )}
      </div>
      {post.related.length > 0 && (
        <section aria-labelledby="related-heading" className="container-page pb-10">
          <h2 id="related-heading" className="section-title">Related articles</h2>
          <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">{post.related.map((p) => <Card key={p.slug} post={p} />)}</div>
        </section>
      )}
    </>
  );
}
