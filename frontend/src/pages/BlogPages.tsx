import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AD_SLOTS, AdSlot } from '../components/common/AdSlot';
import { PaidLabel } from '../components/common/Badges';
import { Icon } from '../components/common/Icon';
import { Pagination } from '../components/common/Pagination';
import { AsyncContent, EmptyState, Spinner } from '../components/common/States';
import { SchoolImage } from '../components/school/SchoolImage';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import {
  BLOG_CATEGORY_INFO, blogCategoryBySlug, blogCategoryLabel, blogCategoryPath, blogService, type BlogArticle, type BlogCard, type BlogCategory,
} from '../services/blogApi';
import { contents, parseBody, parseInline, type Block } from '../utils/blogBody';
import { formatDate } from '../utils/format';
import { NotFoundPage } from './InfoPages';

const PAGE_SIZE = 9;
const HERO_TITLE = 'Education Insights That Help You Make Better Decisions';
const HERO_TEXT = 'Explore school admissions, education updates, parenting guidance, examinations and learning resources for students and parents across India.';
/** Categories whose facts (dates, fees, eligibility) change every year: their articles carry a reminder to check. */
const TIME_SENSITIVE: BlogCategory[] = ['ADMISSIONS', 'GOVERNMENT_SCHOOLS', 'ENTRANCE_EXAMS', 'EDUCATION_NEWS', 'BOARDING_SCHOOLS', 'FEES_SCHOLARSHIPS'];

/** Breadcrumbs for the blog's light header (the shared component is styled for dark headers and is left unchanged). */
function Breadcrumbs({ items }: { items: { to: string; label: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, i) => (
          <li key={item.to} className="flex min-w-0 items-center gap-1.5">
            {i > 0 && <span aria-hidden className="text-slate-400">/</span>}
            {i === items.length - 1
              ? <span aria-current="page" className="line-clamp-1 text-slate-600">{item.label}</span>
              : <Link to={item.to} className="text-brand-700 hover:underline">{item.label}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

/** One article in a list: image, category, title, summary, date and reading time; paid content is labelled. */
function Card({ post, size = 'md' }: { post: BlogCard; size?: 'md' | 'sm' }) {
  const to = `/blog/${post.slug}`;
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:shadow-lift">
      <Link to={to} tabIndex={-1} aria-hidden className="block overflow-hidden">
        <SchoolImage src={post.coverImageUrl} name={post.title} alt={post.coverImageAlt ?? undefined} zoom={false} small={size === 'sm'} />
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          <Link to={blogCategoryPath(post.category)} className="hover:underline">{blogCategoryLabel(post.category)}</Link>
          {post.sponsored && <PaidLabel />}
        </p>
        <h3 className={`mt-1.5 font-display font-bold leading-snug text-ink ${size === 'sm' ? 'text-base' : 'text-lg'}`}>
          <Link to={to} className="hover:text-brand-700">{post.title}</Link>
        </h3>
        {size === 'md' && <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-slate-600">{post.excerpt}</p>}
        <p className="mt-3 text-xs text-slate-500">{formatDate(post.publishedAt)} · {post.minutesToRead} min read</p>
      </div>
    </article>
  );
}

function SearchBar({ q, onSearch, big }: { q: string; onSearch: (q: string | undefined) => void; big?: boolean }) {
  return (
    <form role="search" className="flex min-w-0 gap-2" onSubmit={(e) => { e.preventDefault(); onSearch(String(new FormData(e.currentTarget).get('q') ?? '').trim() || undefined); }}>
      <label className="sr-only" htmlFor="blog-search">Search articles</label>
      <input id="blog-search" name="q" className={`input min-w-0 flex-1 ${big ? 'h-12 rounded-xl text-base' : ''}`} maxLength={100}
        placeholder="Search admissions, JNVST, boarding schools…" defaultValue={q} key={q} />
      <button type="submit" className={`btn-primary ${big ? 'h-12 rounded-xl px-5' : ''}`}><Icon name="search" className="h-4 w-4" /><span className={big ? '' : 'sr-only'}>Search</span></button>
    </form>
  );
}

/** The blog's own header: calm, with the search; no breadcrumb beyond Home. */
function BlogHero({ q, onSearch }: { q: string; onSearch: (q: string | undefined) => void }) {
  return (
    <header className="border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-white">
      <div className="container-page py-10 sm:py-14">
        <Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/blog', label: 'Blog' }]} />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-brand-700">The SchoolDhundo Blog</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{HERO_TITLE}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">{HERO_TEXT}</p>
        <div className="mt-6 max-w-2xl"><SearchBar q={q} onSearch={onSearch} big /></div>
      </div>
    </header>
  );
}

/** The most recent featured article (or the newest one) shown large. */
function Featured({ post }: { post: BlogCard }) {
  const to = `/blog/${post.slug}`;
  return (
    <article className="grid overflow-hidden rounded-3xl border border-slate-200 bg-white md:grid-cols-2">
      <Link to={to} tabIndex={-1} aria-hidden className="block">
        <SchoolImage src={post.coverImageUrl} name={post.title} alt={post.coverImageAlt ?? undefined} zoom={false} priority className="h-full" />
      </Link>
      <div className="flex flex-col justify-center p-6 sm:p-8">
        <p className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
          <span>Featured</span><span aria-hidden>·</span>
          <Link to={blogCategoryPath(post.category)} className="hover:underline">{blogCategoryLabel(post.category)}</Link>
          {post.sponsored && <PaidLabel />}
        </p>
        <h2 className="mt-2 font-display text-2xl font-bold leading-snug text-ink sm:text-3xl"><Link to={to} className="hover:text-brand-700">{post.title}</Link></h2>
        <p className="mt-3 leading-relaxed text-slate-600">{post.excerpt}</p>
        <p className="mt-4 text-sm text-slate-500">{post.authorName} · {formatDate(post.publishedAt)} · {post.minutesToRead} min read</p>
        <Link to={to} className="btn-primary mt-5 w-fit">Read the article</Link>
      </div>
    </article>
  );
}

/**
 * /blog: hero and search; then the featured article, latest articles, categories that have articles and topics. A
 * search or an old ?category= link shows results instead. Nothing is shown for sections without articles.
 */
export function BlogListPage() {
  useDocumentTitle('Blog: education insights for parents and students', HERO_TEXT);
  const [sp, setSp] = useSearchParams();
  const q = sp.get('q') ?? '';
  const tag = sp.get('tag') ?? '';
  const category = BLOG_CATEGORY_INFO.find((c) => c.code === sp.get('category'))?.code;
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const searching = !!q || !!tag || !!category;
  const results = useApi(() => blogService.list({ q: q || undefined, tag: tag || undefined, category, page, size: PAGE_SIZE }), [q, tag, category, page], searching);
  const latest = useApi(() => blogService.list({ size: 7 }), [], !searching);
  const featured = useApi(() => blogService.list({ featured: true, size: 1 }), [], !searching);
  const counts = useApi(() => blogService.categories(), []);
  const topics = useApi(() => blogService.topics(), []);
  const set = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(sp);
    Object.entries(patch).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
    if (!('page' in patch)) next.delete('page');
    setSp(next, { replace: true });
  };
  const lead = featured.data?.content[0] ?? latest.data?.content[0];
  const rest = (latest.data?.content ?? []).filter((p) => p.slug !== lead?.slug).slice(0, 6);
  const withPosts = BLOG_CATEGORY_INFO.filter((c) => (counts.data?.[c.code] ?? 0) > 0);
  return (
    <>
      <BlogHero q={q} onSearch={(v) => set({ q: v, tag: undefined, category: undefined })} />
      <div className="container-page space-y-12 py-10">
        {(topics.data?.length ?? 0) > 0 && (
          <nav aria-label="Topics" className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-ink">Topics:</span>
            {topics.data!.map((t) => (
              <button key={t.tag} type="button" aria-pressed={tag.toLowerCase() === t.tag.toLowerCase()} onClick={() => set({ tag: t.tag, q: undefined, category: undefined })}
                className={`rounded-full border px-3 py-1 text-sm transition ${tag.toLowerCase() === t.tag.toLowerCase() ? 'border-brand-600 bg-brand-600 text-white' : 'border-slate-200 bg-white text-slate-700 hover:border-brand-300'}`}>
                {t.tag}
              </button>
            ))}
          </nav>
        )}

        {searching ? (
          <section aria-labelledby="results-h" className="space-y-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 id="results-h" className="font-display text-2xl font-bold text-ink">
                {q ? `Articles about “${q}”` : tag ? `Topic: ${tag}` : blogCategoryLabel(category!)}
              </h2>
              <button type="button" className="link text-sm" onClick={() => set({ q: undefined, tag: undefined, category: undefined })}>All articles</button>
            </div>
            <AsyncContent state={results} isEmpty={(d) => d.content.length === 0}
              empty={<EmptyState title="No article matches yet."><button type="button" className="link" onClick={() => set({ q: undefined, tag: undefined, category: undefined })}>Show all articles</button></EmptyState>}>
              {(data) => (
                <>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.content.map((p) => <Card key={p.slug} post={p} />)}</div>
                  <Pagination page={data.page} totalPages={data.totalPages} onChange={(p) => set({ page: p > 0 ? String(p) : undefined })} />
                </>
              )}
            </AsyncContent>
          </section>
        ) : (
          <AsyncContent state={latest} isEmpty={(d) => d.content.length === 0} empty={(
            <EmptyState title="Our first guides are being fact-checked.">
              Every article is checked against official sources before it is published. Meanwhile, see the{' '}
              <Link to="/admissions/guide" className="link">school admission guide</Link>, <Link to="/exams" className="link">entrance exams</Link> or{' '}
              <Link to="/schools" className="link">find schools</Link>.
            </EmptyState>
          )}>
            {() => (
              <>
                {lead && <Featured post={lead} />}
                {rest.length > 0 && (
                  <section aria-labelledby="latest-h" className="space-y-5">
                    <h2 id="latest-h" className="font-display text-2xl font-bold text-ink">Latest articles</h2>
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{rest.map((p) => <Card key={p.slug} post={p} />)}</div>
                  </section>
                )}
                {withPosts.length > 0 && (
                  <section aria-labelledby="cats-h" className="space-y-5">
                    <h2 id="cats-h" className="font-display text-2xl font-bold text-ink">Explore categories</h2>
                    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {withPosts.map((c) => (
                        <li key={c.code}>
                          <Link to={`/blog/category/${c.slug}`} className="group flex h-full gap-3 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-brand-300 hover:shadow-card">
                            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700 transition group-hover:bg-brand-600 group-hover:text-white"><Icon name={c.icon} className="h-5 w-5" /></span>
                            <span className="min-w-0">
                              <span className="block font-semibold text-ink">{c.label}</span>
                              <span className="mt-0.5 block text-sm text-slate-600">{c.blurb}</span>
                              <span className="mt-1 block text-xs text-slate-500">{counts.data?.[c.code]} {counts.data?.[c.code] === 1 ? 'article' : 'articles'}</span>
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
              </>
            )}
          </AsyncContent>
        )}
      </div>
    </>
  );
}

/** /blog/category/{slug}: a category's articles. A category without published articles has no page. */
export function BlogCategoryPage() {
  const { slug = '' } = useParams();
  const info = blogCategoryBySlug(slug);
  const [sp, setSp] = useSearchParams();
  const page = Math.max(0, Number(sp.get('page')) || 0);
  const posts = useApi(() => blogService.list({ category: info!.code, page, size: PAGE_SIZE }), [info?.code, page], !!info);
  useDocumentTitle(info ? `${info.label}: articles` : undefined, info?.blurb);
  if (!info || (posts.data && posts.data.totalElements === 0)) return <NotFoundPage />;
  return (
    <>
      <header className="border-b border-slate-200 bg-gradient-to-b from-brand-50/70 to-white">
        <div className="container-page py-10">
          <Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/blog', label: 'Blog' }, { to: `/blog/category/${info.slug}`, label: info.label }]} />
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-ink">{info.label}</h1>
          <p className="mt-2 max-w-2xl text-slate-600">{info.blurb}</p>
        </div>
      </header>
      <div className="container-page py-10">
        <AsyncContent state={posts}>
          {(data) => (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{data.content.map((p) => <Card key={p.slug} post={p} />)}</div>
              <Pagination page={data.page} totalPages={data.totalPages}
                onChange={(p) => { const next = new URLSearchParams(sp); if (p > 0) next.set('page', String(p)); else next.delete('page'); setSp(next, { replace: true }); }} />
            </div>
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

/** The article text. Also shown as the preview while writing a post. */
export function BlogBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-6 text-[1.0625rem] leading-8 text-slate-800">
      {blocks.map((b, i) => {
        if (b.kind === 'p') return <p key={i}><RichText text={b.text} /></p>;
        if (b.kind === 'note') {
          return (
            <aside key={i} className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-base leading-7 text-amber-950">
              <Icon name="info" className="mt-1 h-5 w-5 shrink-0 text-amber-700" /><p><RichText text={b.text} /></p>
            </aside>
          );
        }
        if (b.kind === 'table') {
          return (
            <div key={i} className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[480px] text-left text-base">
                <thead className="bg-slate-50 text-sm font-semibold text-ink">
                  <tr>{b.head.map((h, j) => <th key={j} scope="col" className="px-4 py-3"><RichText text={h} /></th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {b.rows.map((row, j) => <tr key={j}>{row.map((c, k) => <td key={k} className="px-4 py-3 align-top leading-7"><RichText text={c} /></td>)}</tr>)}
                </tbody>
              </table>
            </div>
          );
        }
        if ('items' in b) {
          const List = b.kind;
          return <List key={i} className={`space-y-2 pl-6 ${b.kind === 'ul' ? 'list-disc' : 'list-decimal'}`}>{b.items.map((item, j) => <li key={j}><RichText text={item} /></li>)}</List>;
        }
        return b.kind === 'h2'
          ? <h2 key={i} id={b.id} className="scroll-mt-24 pt-4 font-display text-2xl font-bold text-ink"><RichText text={b.text} /></h2>
          : <h3 key={i} id={b.id} className="scroll-mt-24 pt-1 font-display text-xl font-bold text-ink"><RichText text={b.text} /></h3>;
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
    ['LinkedIn', `https://www.linkedin.com/sharing/share-offsite/?url=${u}`],
  ];
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="font-semibold text-ink">Share this article:</span>
      {links.map(([name, href]) => (
        <a key={name} href={href} target="_blank" rel="noopener noreferrer" className="btn-secondary rounded-full px-3 py-1.5 text-sm">
          {name}<span className="sr-only"> (opens in a new tab)</span>
        </a>
      ))}
    </div>
  );
}

function SourcesAndFaq({ post }: { post: BlogArticle }) {
  return (
    <>
      {post.sources.length > 0 && (
        <section aria-labelledby="sources-h" className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <h2 id="sources-h" className="font-display text-lg font-bold text-ink">Official references and sources</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-slate-700">
            {post.sources.map((s) => (
              <li key={s.url + s.title}>
                <a href={s.url} target="_blank" rel="noopener noreferrer" className="link">{s.title}</a>
                {s.checkedOn && <span className="text-slate-500"> · checked {formatDate(s.checkedOn)}</span>}
              </li>
            ))}
          </ol>
        </section>
      )}
      {post.faqs.length > 0 && (
        <section aria-labelledby="faq-h">
          <h2 id="faq-h" className="font-display text-2xl font-bold text-ink">Frequently asked questions</h2>
          <div className="mt-4 divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {post.faqs.map((f) => (
              <details key={f.question} className="group p-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-ink">
                  {f.question}<Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <p className="mt-2 leading-7 text-slate-700"><RichText text={f.answer} /></p>
              </details>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

export function BlogPostPage() {
  const { slug = '' } = useParams();
  const state = useApi(() => blogService.article(slug), [slug]);
  const post = state.data;
  useDocumentTitle(post?.card.title ?? 'Blog', post?.card.excerpt);
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
  const updated = post.updatedAt && card.publishedAt && post.updatedAt.slice(0, 10) > card.publishedAt.slice(0, 10) ? post.updatedAt : null;
  return (
    <>
      <header className="border-b border-slate-200 bg-gradient-to-b from-brand-50/60 to-white">
        <div className="container-page max-w-4xl py-8 sm:py-10">
          <Breadcrumbs items={[{ to: '/', label: 'Home' }, { to: '/blog', label: 'Blog' },
            { to: blogCategoryPath(card.category), label: blogCategoryLabel(card.category) }, { to: `/blog/${card.slug}`, label: card.title }]} />
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-brand-700">
            <Link to={blogCategoryPath(card.category)} className="hover:underline">{blogCategoryLabel(card.category)}</Link>
            {card.sponsored && <PaidLabel />}
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-4xl">{card.title}</h1>
          <p className="mt-3 text-lg leading-relaxed text-slate-600">{card.excerpt}</p>
          <p className="mt-4 flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
            <span className="font-semibold text-ink">{card.authorName}</span>
            <span>Published {formatDate(card.publishedAt)}</span>
            {updated && <span>Updated {formatDate(updated)}</span>}
            {card.lastReviewedOn && <span>Facts checked {formatDate(card.lastReviewedOn)}</span>}
            <span>{card.minutesToRead} min read</span>
          </p>
        </div>
      </header>
      <div className="container-page grid grid-cols-1 gap-10 py-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="mx-auto w-full min-w-0 max-w-3xl space-y-8">
          {card.coverImageUrl && <SchoolImage src={card.coverImageUrl} name={card.title} alt={card.coverImageAlt ?? undefined} zoom={false} priority className="rounded-2xl" />}
          {TIME_SENSITIVE.includes(card.category) && (
            <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 ring-1 ring-slate-200">
              Dates, fees and eligibility change from year to year. Always confirm them in the official notice linked below before you apply.
            </p>
          )}
          <BlogBody blocks={blocks} />
          <SourcesAndFaq post={post} />
          {card.tags.length > 0 && (
            <p className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-semibold text-ink">Topics:</span>
              {card.tags.map((t) => <Link key={t} to={`/blog?tag=${encodeURIComponent(t)}`} className="rounded-full border border-slate-200 px-3 py-1 text-slate-700 hover:border-brand-300">{t}</Link>)}
            </p>
          )}
          <ShareLinks title={card.title} />
          <section aria-label="About the author" className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-5">
            <span aria-hidden className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-600 font-display text-lg font-bold text-white">
              {card.authorName.split(/\s+/).slice(0, 2).map((w) => w[0]).join('')}
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Written and reviewed by</p>
              <p className="mt-0.5 font-display font-bold text-ink">{card.authorName}</p>
              {post.authorBio && <p className="mt-1 text-sm leading-relaxed text-slate-600">{post.authorBio}</p>}
              <p className="mt-1 text-xs text-slate-500">How we write and check articles: <Link to="/editorial-policy" className="link">editorial policy</Link> · <Link to="/corrections-policy" className="link">report a mistake</Link></p>
            </div>
          </section>
          <AdSlot slot={AD_SLOTS.blogPost} />
          {(post.previous || post.next) && (
            <nav aria-label="More articles" className="grid gap-3 sm:grid-cols-2">
              {post.previous ? (
                <Link to={`/blog/${post.previous.slug}`} className="rounded-2xl border border-slate-200 p-4 hover:border-brand-300">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">← Previous article</span>
                  <span className="mt-1 block font-semibold text-ink">{post.previous.title}</span>
                </Link>
              ) : <span />}
              {post.next && (
                <Link to={`/blog/${post.next.slug}`} className="rounded-2xl border border-slate-200 p-4 text-right hover:border-brand-300">
                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Next article →</span>
                  <span className="mt-1 block font-semibold text-ink">{post.next.title}</span>
                </Link>
              )}
            </nav>
          )}
          <section className="rounded-2xl bg-gradient-to-br from-brand-700 to-violet-700 p-6 text-white">
            <h2 className="font-display text-xl font-bold text-white">Find the best school near you</h2>
            <p className="mt-1 text-sm text-blue-100">Search by location, board and fees, with every fact linked to its source.</p>
            <Link to="/schools" className="mt-4 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-blue-50">Search schools</Link>
          </section>
        </article>
        {toc.length > 1 && (
          <aside className="order-first lg:order-last">
            <nav aria-label="In this article" className="rounded-2xl border border-slate-200 bg-white p-4 text-sm lg:sticky lg:top-24">
              <h2 className="mb-2 font-semibold text-ink">In this article</h2>
              <ol className="space-y-1.5">{toc.map((t) => <li key={t.id}><a href={`#${t.id}`} className="link">{t.text}</a></li>)}</ol>
            </nav>
          </aside>
        )}
      </div>
      {post.related.length > 0 && (
        <section aria-labelledby="related-heading" className="container-page pb-12">
          <h2 id="related-heading" className="font-display text-2xl font-bold text-ink">Related articles</h2>
          <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">{post.related.map((p) => <Card key={p.slug} post={p} />)}</div>
        </section>
      )}
    </>
  );
}
