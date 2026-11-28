// Loads the article files in content/blog into a running server as drafts awaiting editorial review, through the admin
// API (so every article passes the same validation as one written in the admin page). An article whose address already
// exists is left alone, so nothing an editor changed or published is overwritten.
//
// Usage: ADMIN_USERNAME=admin ADMIN_PASSWORD=... node tools/blog/load-drafts.js https://schooldhundo.in/api/v1 [content/blog]
//        [--publish] [--featured <slug>] [--update <slug>]
// --publish creates the articles as published (only once the owner has approved them); --featured marks one article.
// --update <slug> rewrites that one existing article from its file (text, meta title and description, tags, sources,
// questions, review date) and keeps everything else as it is in the admin: status, publication date, cover, featured,
// sponsored and the byline. Nothing else is created or changed.
//
// File format: "key: value" lines, then a line "---", then the article body. Repeated keys:
//   source: Title | https://… | 2026-11-11
//   faq: Question? || Answer.
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const publish = args.includes('--publish');
const featuredAt = args.indexOf('--featured');
const featuredSlug = featuredAt >= 0 ? args[featuredAt + 1] : null;
const updateAt = args.indexOf('--update');
const updateSlug = updateAt >= 0 ? args[updateAt + 1] : null;
const positional = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--featured' && args[i - 1] !== '--update');
const apiBase = (positional[0] ?? '').replace(/\/$/, '');
const dir = positional[1] ?? path.join(__dirname, '..', '..', 'content', 'blog');
const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
const AUTHOR = 'Rakesh Kumar, Editor';
const BIO = 'Editor of SchoolDhundo and an alumnus of the Indian Institute of Information Technology, Allahabad. Checks every article against official sources before it is published.';

if (!/^https?:\/\/.+\/api\/v1$/.test(apiBase) || !ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('usage: ADMIN_USERNAME=… ADMIN_PASSWORD=… node tools/blog/load-drafts.js <https://host/api/v1> [dir]');
  process.exit(2);
}

/** Splits a file into its header fields and body. */
function parse(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const cut = text.indexOf('\n---\n');
  if (cut < 0) throw new Error(`${file}: no "---" line between header and body`);
  const article = { sources: [], faqs: [], tags: [] };
  for (const line of text.slice(0, cut).split('\n')) {
    const m = /^([a-zA-Z]+):\s*(.*)$/.exec(line.trim());
    if (!m) continue;
    const [, key, value] = m;
    if (key === 'source') {
      const [title, url, checkedOn] = value.split('|').map((s) => s.trim());
      article.sources.push({ title, url, checkedOn: checkedOn || null });
    } else if (key === 'faq') {
      const [question, answer] = value.split('||').map((s) => s.trim());
      article.faqs.push({ question, answer });
    } else if (key === 'tags') {
      article.tags = value.split(',').map((s) => s.trim()).filter(Boolean);
    } else {
      article[key] = value;
    }
  }
  article.body = text.slice(cut + 5).trim();
  return article;
}

async function main() {
  const login = await fetch(`${apiBase}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!login.ok) throw new Error(`login failed: HTTP ${login.status}`);
  const auth = { Authorization: `Bearer ${(await login.json()).accessToken}`, 'Content-Type': 'application/json' };

  const existing = new Map();
  for (let page = 0; ; page++) {
    const res = await fetch(`${apiBase}/admin/blog/posts?page=${page}&size=100`, { headers: auth });
    const data = await res.json();
    data.content.forEach((p) => existing.set(p.slug, p));
    if (data.last) break;
  }

  if (updateSlug) {
    await update(auth, existing.get(updateSlug), dir);
    return;
  }

  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).sort();
  for (const f of files) {
    const a = parse(path.join(dir, f));
    if (existing.has(a.slug)) {
      console.log(`skip    ${a.slug} (already in the admin)`);
      continue;
    }
    const body = {
      title: a.title, slug: a.slug, excerpt: a.excerpt, body: a.body, category: a.category, coverImageUrl: a.coverImageUrl ?? '',
      coverImageAlt: a.coverImageAlt ?? '', authorName: AUTHOR, authorBio: BIO, metaTitle: a.metaTitle ?? '', metaDescription: a.metaDescription ?? '',
      published: publish, status: publish ? 'PUBLISHED' : 'REVIEW', publishAt: null, featured: a.slug === featuredSlug, sponsored: false, tags: a.tags,
      lastReviewedOn: a.lastReviewedOn || null, sources: a.sources, faqs: a.faqs,
    };
    const res = await fetch(`${apiBase}/admin/blog/posts`, { method: 'POST', headers: auth, body: JSON.stringify(body) });
    if (!res.ok) {
      console.log(`FAILED  ${a.slug}: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
      process.exitCode = 1;
    } else {
      console.log(publish ? `published ${a.slug}${a.slug === featuredSlug ? ' (featured)' : ''}` : `draft   ${a.slug} (editorial review)`);
    }
  }
}

/** --update: the file's text over one existing article; the admin keeps its status, dates, cover, flags and byline. */
async function update(auth, current, dir) {
  if (!current) throw new Error(`no article with the address "${updateSlug}" in the admin`);
  const file = fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parse(path.join(dir, f))).find((a) => a.slug === updateSlug);
  if (!file) throw new Error(`no file in ${dir} has slug: ${updateSlug}`);
  const body = {
    title: file.title, slug: current.slug, excerpt: file.excerpt, body: file.body, category: file.category,
    coverImageUrl: current.coverImageUrl ?? '', coverImageAlt: current.coverImageAlt ?? '', authorName: current.authorName, authorBio: current.authorBio ?? '',
    metaTitle: file.metaTitle ?? '', metaDescription: file.metaDescription ?? '', published: current.published, status: current.status,
    // A published article keeps the date readers see (BlogService sets it only on first publication).
    publishAt: null, featured: current.featured, sponsored: current.sponsored, tags: file.tags,
    lastReviewedOn: file.lastReviewedOn || current.lastReviewedOn || null, sources: file.sources, faqs: file.faqs,
  };
  const res = await fetch(`${apiBase}/admin/blog/posts/${current.id}`, { method: 'PUT', headers: auth, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`update of ${updateSlug} failed: HTTP ${res.status} ${(await res.text()).slice(0, 300)}`);
  const saved = await res.json();
  console.log(`updated ${saved.slug} (${saved.status}; published ${saved.publishedAt ?? 'not yet'}; updated ${saved.updatedAt})`);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
