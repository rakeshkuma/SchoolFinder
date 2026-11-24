// Checks web pages that link, or might link, to schooldhundo.in: backlink prospects before outreach, and pages that
// already link, to see that the link is still there. Read-only and polite: robots.txt is honoured, each host gets one
// request at a time with a pause between (longer if its robots.txt asks), a generic user agent, no cookies, nothing
// posted or submitted.
//
// Usage: node tools/seo/link-check.mjs <urls.txt> [--site schooldhundo.in] [--outbound] [--json out.json] [--csv out.csv]
//   urls.txt    one page address per line; blank lines and lines starting with # are skipped.
//   --site      the site whose links and mentions are looked for (default schooldhundo.in).
//   --outbound  also checks each page's external links (at most 40 a page) and lists the broken ones (404, 410, 5xx,
//               no such host): the evidence for a broken-link replacement. 401, 403 and 429 count as blocked, not broken.
//   --json/--csv  write the full results; the console gets one line a page.
//
// For each page: status, final address, title, published and modified dates (meta tags, JSON-LD, <time>), words,
// links to the site (address, anchor, rel), plain-text mentions of it, the other sites it links to, contact routes
// (mailto addresses, contact/about/write-for-us links) and resource-page phrases ("useful links", "resources" and so on).
// Run it again later on the pages that linked: a link that was removed shows as 0 links to the site.
import fs from 'node:fs';

const args = process.argv.slice(2);
const valueOf = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const SITE = (valueOf('--site') ?? 'schooldhundo.in').toLowerCase().replace(/^www\./, '');
const OUTBOUND = args.includes('--outbound');
const UA = 'Mozilla/5.0 (compatible; LinkCheck/1.0)';
const ROBOTS_TOKEN = 'linkcheck'; // the robots.txt group this tool obeys, before "*"
const PAUSE_MS = 1500;
const TIMEOUT_MS = 20000;
const MAX_BYTES = 3_000_000;
const HOSTS_AT_ONCE = 4;
const OUTBOUND_PER_PAGE = 40;
const SOCIAL = /(^|\.)(facebook|fb|twitter|x|linkedin|instagram|youtube|youtu|whatsapp|wa|t|telegram|pinterest|threads|reddit|tumblr|snapchat|koo)\.(com|me|be|net|in|org)$/;
const RESOURCE_PHRASES = ['useful links', 'important links', 'helpful links', 'resources', 'free resources', 'study material',
  'recommended', 'write for us', 'guest post', 'submit a resource', 'suggest a resource', 'contribute', 'links for students',
  'e-content', 'mock test', 'practice test'];

// ---- robots.txt (RFC 9309): the most specific matching rule wins; Allow wins a tie. A 4xx robots.txt allows all; a
// 5xx or unreachable one is treated as "disallow all", as the RFC asks.
const robotsCache = new Map();
export function parseRobots(text) {
  const groups = [];
  let group = null;
  let lastWasAgent = false;
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === 'user-agent') {
      if (!lastWasAgent) groups.push(group = { agents: [], allow: [], disallow: [], delay: 0 });
      group.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }
    lastWasAgent = false;
    if (!group) continue;
    if (key === 'allow' && value) group.allow.push(value);
    else if (key === 'disallow' && value) group.disallow.push(value);
    else if (key === 'crawl-delay') group.delay = Math.min(10, Number(value) || 0);
  }
  const own = groups.filter((g) => g.agents.includes(ROBOTS_TOKEN));
  const chosen = own.length ? own : groups.filter((g) => g.agents.includes('*'));
  return {
    allow: chosen.flatMap((g) => g.allow),
    disallow: chosen.flatMap((g) => g.disallow),
    delay: Math.max(0, ...chosen.map((g) => g.delay)),
  };
}
const ruleRegex = (rule) => {
  const anchored = rule.endsWith('$');
  const body = (anchored ? rule.slice(0, -1) : rule).split('*').map((s) => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*');
  return new RegExp('^' + body + (anchored ? '$' : ''));
};
export function robotsAllows(rules, pathAndQuery) {
  let best = { length: -1, allow: true };
  for (const [list, allow] of [[rules.allow, true], [rules.disallow, false]]) {
    for (const rule of list) {
      if (!ruleRegex(rule).test(pathAndQuery)) continue;
      if (rule.length > best.length || (rule.length === best.length && allow)) best = { length: rule.length, allow };
    }
  }
  return best.allow;
}

// ---- one request at a time per host, with a pause
const lastRequest = new Map();
async function politeFetch(url, method = 'GET') {
  const { host, origin } = new URL(url);
  const rules = await robotsFor(origin);
  const wait = (lastRequest.get(host) ?? 0) + Math.max(PAUSE_MS, rules.delay * 1000) - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastRequest.set(host, Date.now());
  return fetch(url, { method, redirect: 'follow', headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
    signal: AbortSignal.timeout(TIMEOUT_MS) });
}
async function robotsFor(origin) {
  if (!robotsCache.has(origin)) {
    robotsCache.set(origin, (async () => {
      try {
        const res = await fetch(origin + '/robots.txt', { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.ok) return parseRobots(await res.text());
        return res.status >= 500 ? { allow: [], disallow: ['/'], delay: 0 } : { allow: [], disallow: [], delay: 0 };
      } catch {
        return { allow: [], disallow: ['/'], delay: 0 };
      }
    })());
  }
  return robotsCache.get(origin);
}

// ---- HTML reading (regular expressions: pages are only scanned for facts, never rendered)
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", apos: "'", nbsp: ' ' };
const decode = (s) => s.replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (_, e) => ENTITIES[e]).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));
const strip = (html) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i'))?.[2] ?? tag.match(new RegExp(`\\s${name}\\s*=\\s*([^\\s>]+)`, 'i'))?.[1] ?? null;
const bareHost = (h) => h.toLowerCase().replace(/^www\./, '');

export function readPage(html, pageUrl, site = SITE) {
  const title = strip(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const metas = [...html.matchAll(/<meta\s[^>]*>/gi)].map((m) => m[0]);
  const meta = (keys) => {
    for (const tag of metas) {
      const key = (attr(tag, 'property') ?? attr(tag, 'name') ?? attr(tag, 'itemprop') ?? '').toLowerCase();
      if (keys.includes(key)) return attr(tag, 'content');
    }
    return null;
  };
  const jsonDate = (key) => html.match(new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`))?.[1] ?? null;
  const published = meta(['article:published_time', 'datepublished', 'date', 'dc.date', 'publish-date']) ?? jsonDate('datePublished')
    ?? attr(html.match(/<time\s[^>]*datetime[^>]*>/i)?.[0] ?? '', 'datetime');
  const modified = meta(['article:modified_time', 'og:updated_time', 'datemodified', 'last-modified']) ?? jsonDate('dateModified');
  const body = html.replace(/<(script|style|noscript|template)[\s\S]*?<\/\1>/gi, ' ');
  const text = strip(body);
  const own = bareHost(new URL(pageUrl).hostname);
  const links = [];
  for (const m of body.matchAll(/<a\s[^>]*>[\s\S]*?<\/a>/gi)) {
    const tag = m[0].match(/^<a\s[^>]*>/i)[0];
    const href = attr(tag, 'href');
    if (!href || href.startsWith('#') || /^javascript:/i.test(href)) continue;
    let resolved;
    try { resolved = new URL(decode(href), pageUrl); } catch { continue; }
    links.push({ href: resolved.href, protocol: resolved.protocol, host: bareHost(resolved.hostname),
      anchor: strip(m[0]).slice(0, 120), rel: (attr(tag, 'rel') ?? '').toLowerCase() });
  }
  const web = links.filter((l) => l.protocol === 'http:' || l.protocol === 'https:');
  const toSite = web.filter((l) => l.host === site || l.host.endsWith('.' + site))
    .map(({ href, anchor, rel }) => ({ href, anchor, rel: rel || 'follow' }));
  const external = web.filter((l) => l.host !== own && !l.host.endsWith('.' + own) && !(l.host === site || l.host.endsWith('.' + site)));
  const emails = new Set(links.filter((l) => l.protocol === 'mailto:').map((l) => decodeURIComponent(l.href.slice(7).split('?')[0]).toLowerCase()));
  for (const e of text.matchAll(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi)) if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(e[0])) emails.add(e[0].toLowerCase());
  const contactLinks = [...new Set(web.filter((l) => /contact|about|write[- ]?for[- ]?us|submit|advertis|partner|get in touch|reach us|team/i
    .test(l.anchor + ' ' + l.href) && l.host === own).map((l) => l.href))].slice(0, 6);
  const lower = text.toLowerCase();
  return {
    title, published, modified, words: text ? text.split(' ').length : 0,
    linksToSite: toSite, mentions: (text.match(new RegExp(site.split('.')[0].replace(/dhundo/i, '\\s*dhundo'), 'gi')) ?? []).length,
    externalDomains: [...new Set(external.map((l) => l.host))],
    externalLinks: external.filter((l) => !SOCIAL.test(l.host)),
    emails: [...emails].slice(0, 8),
    obfuscatedEmail: /__cf_email__|email-protection|\[email&#160;protected\]|\[email protected\]/i.test(html),
    contactLinks,
    resourceSignals: RESOURCE_PHRASES.filter((p) => lower.includes(p)),
  };
}

async function checkLink(href) {
  try {
    let res = await politeFetch(href, 'HEAD');
    if ([400, 403, 405, 501].includes(res.status)) { res.body?.cancel(); res = await politeFetch(href, 'GET'); }
    res.body?.cancel();
    return { status: res.status };
  } catch (e) {
    return { error: e.cause?.code ?? e.name ?? 'error' };
  }
}

async function checkPage(url) {
  const out = { url };
  let res;
  try {
    const { origin, pathname, search } = new URL(url);
    if (!robotsAllows(await robotsFor(origin), pathname + search)) return { ...out, robots: 'disallowed' };
    res = await politeFetch(url);
  } catch (e) {
    return { ...out, error: e.cause?.code ?? e.message };
  }
  out.status = res.status;
  out.finalUrl = res.url !== url ? res.url : undefined;
  const type = res.headers.get('content-type') ?? '';
  if (!/html|xml/i.test(type)) { res.body?.cancel(); return { ...out, contentType: type.split(';')[0] }; }
  const html = Buffer.from(await res.arrayBuffer()).subarray(0, MAX_BYTES).toString('utf8');
  if (res.status >= 400) return { ...out, challenge: /just a moment|cf-chl|captcha/i.test(html) || undefined };
  const page = readPage(html, res.url);
  if (OUTBOUND) {
    const targets = [...new Map(page.externalLinks.map((l) => [l.href.split('#')[0], l])).values()].slice(0, OUTBOUND_PER_PAGE);
    const broken = [];
    let blocked = 0;
    for (const l of targets) {
      const r = await checkLink(l.href);
      if (r.error === 'ENOTFOUND' || r.error === 'EAI_AGAIN' || [404, 410].includes(r.status) || r.status >= 500) broken.push({ href: l.href, anchor: l.anchor, ...r });
      else if ([401, 403, 429].includes(r.status) || r.error) blocked++;
    }
    page.outbound = { checked: targets.length, broken, blocked };
  }
  delete page.externalLinks;
  return { ...out, ...page };
}

// ---- run: hosts in parallel (a few at once), each host's pages one after another
async function main() {
  const file = args.find((a, i) => !a.startsWith('--') && !['--site', '--json', '--csv'].includes(args[i - 1]));
  if (!file) {
    console.error('Usage: node tools/seo/link-check.mjs <urls.txt> [--site domain] [--outbound] [--json file] [--csv file]');
    process.exit(2);
  }
  const urls = [...new Set(fs.readFileSync(file, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#')))];
  const byHost = new Map();
  for (const u of urls) {
    let host;
    try { host = new URL(u).host; } catch { console.error(`Skipped, not an address: ${u}`); continue; }
    byHost.set(host, [...(byHost.get(host) ?? []), u]);
  }
  const queues = [...byHost.values()];
  const results = new Map();
  await Promise.all(Array.from({ length: HOSTS_AT_ONCE }, async () => {
    for (let q = queues.shift(); q; q = queues.shift()) for (const u of q) results.set(u, await checkPage(u));
  }));
  const rows = urls.filter((u) => results.has(u)).map((u) => results.get(u));
  for (const r of rows) {
    const state = r.robots === 'disallowed' ? 'ROBOTS' : r.error ? `ERR ${r.error}` : r.contentType ? `${r.status} ${r.contentType}` : String(r.status);
    console.log([state.padEnd(8), `${r.words ?? '-'}w`.padStart(6), `ext ${r.externalDomains?.length ?? '-'}`.padEnd(7),
      `site ${r.linksToSite?.length ?? '-'}/${r.mentions ?? '-'}`, `mail ${r.emails?.length ?? 0}${r.obfuscatedEmail ? '+cf' : ''}`,
      r.outbound ? `broken ${r.outbound.broken.length}/${r.outbound.checked}` : '', (r.published ?? r.modified ?? '').slice(0, 10).padEnd(10),
      (r.title ?? '').slice(0, 60), r.url].filter(Boolean).join(' | '));
  }
  const json = valueOf('--json');
  if (json) fs.writeFileSync(json, JSON.stringify({ checkedAt: new Date().toISOString(), site: SITE, pages: rows }, null, 1));
  const csv = valueOf('--csv');
  if (csv) {
    const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const head = ['url', 'status', 'title', 'published', 'modified', 'words', 'links_to_site', 'link_rel', 'mentions', 'external_domains',
      'emails', 'contact_links', 'resource_signals', 'broken_outbound'];
    const lines = rows.map((r) => [r.url, r.robots ?? r.error ?? r.status, r.title, r.published, r.modified, r.words,
      r.linksToSite?.length ?? '', r.linksToSite?.map((l) => l.rel).join(' '), r.mentions, r.externalDomains?.length ?? '',
      r.emails?.join(' '), r.contactLinks?.join(' '), r.resourceSignals?.join('; '),
      r.outbound?.broken.map((b) => `${b.status ?? b.error} ${b.href}`).join(' ')].map(cell).join(','));
    fs.writeFileSync(csv, [head.join(','), ...lines].join('\n') + '\n');
  }
}

// Run only when started as a script, so tests can import readPage and robotsAllows.
if (process.argv[1]?.replace(/\\/g, '/').endsWith('/link-check.mjs')) {
  main().catch((e) => { console.error(e); process.exit(1); });
}
