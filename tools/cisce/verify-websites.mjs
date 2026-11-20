// Checks that each candidate's website is the school's own official site, before anything is imported:
//   1. the site's robots.txt does not disallow the page for all crawlers or for SchoolDhundoBot;
//   2. the page answers HTTP 200 with HTML (after at most 5 redirects), and is not a parked, suspended or empty domain,
//      nor a directory, aggregator or social-media page;
//   3. the page (title, description and text) names the school: every distinctive word of its name appears
//      (words shared by most schools, like "public" or "convent", are ignored; with none left, the whole name must);
//   4. the page names its place: the town, the district or the PIN code.
// A site that cannot be read (JavaScript-only, blocked, timed out) is not verified, and the school is not imported.
// Requests go through curl with an honest User-Agent, 8 at a time, one page per school (plus robots.txt per site).
//
// Usage: node tools/cisce/verify-websites.mjs <candidates.json> <out dir>   -> verified.json, unverified.json
import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { norm, tokens, host } from './names.mjs';

const run = promisify(execFile);
const [candidatesFile, outDir] = process.argv.slice(2);
const candidates = JSON.parse(readFileSync(candidatesFile, 'utf8'));
const UA = 'SchoolDhundoBot/1.0 (+https://schooldhundo.in/contact)';

const NOT_OFFICIAL = /(^|\.)(facebook|fb|instagram|twitter|x|youtube|youtu|linkedin|justdial|edustoke|careers360|schoolmykids|ezyschooling|yellowslate|uniapply|sulekha|indiamart|icbse|schoolsearch|indiastudychannel|shiksha|collegedunia|google|goo|bit|wikipedia|wikimapia|whatsapp|t)\.[a-z.]+$/;
const PARKED = /domain (is|may be) for sale|buy this domain|this domain (has expired|is parked|name is available)|parked (free|domain)|sedoparking|hugedomains|afternic|dan\.com|domain has been suspended|account (has been )?suspended|website (is )?(expired|suspended)|this site can.?t be reached|default web site page|apache2? (ubuntu )?default page|welcome to nginx|index of \//i;

async function curl(url, maxTime = 25) {
  try {
    const { stdout } = await run('curl', ['-sS', '-L', '--ssl-no-revoke', '--max-redirs', '5', '-m', String(maxTime), '--compressed', '-A', UA,
      '-w', '\n__CURL__%{http_code}|%{content_type}|%{url_effective}', url], { encoding: 'latin1', maxBuffer: 30e6 });
    const i = stdout.lastIndexOf('\n__CURL__');
    const [status, type, ...eff] = stdout.slice(i + 9).split('|');
    return { status: Number(status) || 0, type, effective: eff.join('|').trim(), body: Buffer.from(stdout.slice(0, i), 'latin1').toString('utf8') };
  } catch (e) {
    return { status: 0, type: '', effective: url, body: '', error: (e.stderr || e.message || '').toString().slice(0, 120) };
  }
}

const robotsCache = new Map();
async function allowedByRobots(url) {
  const u = new URL(url);
  const key = u.origin;
  if (!robotsCache.has(key)) {
    robotsCache.set(key, curl(`${u.origin}/robots.txt`, 15).then((r) => (r.status === 200 && !/<html/i.test(r.body.slice(0, 500)) ? r.body : '')));
  }
  const text = await robotsCache.get(key);
  let applies = false, inGroup = false;
  const rules = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, '').trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const [, field, value] = m;
    if (/^user-agent$/i.test(field)) {
      if (!inGroup) applies = false;
      inGroup = true;
      if (value === '*' || /schooldhundobot/i.test(value)) applies = true;
    } else {
      inGroup = false;
      if (applies && /^disallow$/i.test(field) && value) rules.push(value);
    }
  }
  const path = u.pathname || '/';
  return !rules.some((rule) => rule === '/' || (rule.endsWith('*') ? path.startsWith(rule.slice(0, -1)) : path.startsWith(rule)));
}

const textOf = (html) => {
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const metas = [...html.matchAll(/<meta[^>]+(?:name|property)=["'](?:description|og:title|og:site_name|og:description)["'][^>]*content=["']([^"']*)["']/gi)].map((m) => m[1]);
  const body = html.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#0?39;|&rsquo;|&apos;/g, "'");
  return { title: title.trim(), text: ` ${norm([title, ...metas, body].join(' '))} ` };
};

async function verify(c) {
  // Typing slips in the listed address are corrected mechanically (a comma for a dot in the domain, a doubled or
  // misspelt scheme); the corrected address must still pass every check below. Nothing else is changed or guessed.
  const cleaned = c.website.trim().replace(/^(https?[:;]\/\/)+(?=https?[:;]\/\/)/i, '').replace(/^https?;\/\//i, 'https://')
    .replace(/^(https?:\/\/)?([^/]*)/i, (m, scheme, h) => (scheme || '') + h.replace(/,/g, '.'));
  const url = /^https?:\/\//i.test(cleaned) ? cleaned : `http://${cleaned}`;
  const listedHost = host(url);
  if (!listedHost || NOT_OFFICIAL.test(listedHost)) return { ok: false, reason: `not an official school website (${listedHost})` };
  if (!(await allowedByRobots(url))) return { ok: false, reason: 'robots.txt disallows the page' };
  let r = await curl(url);
  // One retry after a pause for a reset connection or a server error; a missing domain or a bad certificate is final.
  if ((r.status === 0 && /reset|refused|timed out|Failed to connect/i.test(r.error || '')) || r.status >= 500) {
    await new Promise((ok) => setTimeout(ok, 5000));
    r = await curl(url, 40);
  }
  if (r.status !== 200) return { ok: false, reason: r.status ? `HTTP ${r.status}` : `no answer (${r.error || 'timeout'})` };
  if (!/html/i.test(r.type)) return { ok: false, reason: `not a web page (${r.type || 'unknown type'})` };
  const finalHost = host(r.effective);
  if (!finalHost || NOT_OFFICIAL.test(finalHost)) return { ok: false, reason: `redirects to ${finalHost}, not the school's own site` };
  const { title, text } = textOf(r.body);
  // Redirected to another domain: that page's own title must name the school (a vendor or unrelated site that only
  // mentions the school is not its website).
  const titleWords = ` ${norm(title)} `;
  const distinct = tokens(c.name).filter((w) => !new Set([...tokens(c.city), ...tokens(c.district)]).has(w));
  if (finalHost !== listedHost && !(distinct.length ? distinct.every((w) => titleWords.includes(` ${w} `) || (w.endsWith('s') && titleWords.includes(` ${w.slice(0, -1)} `))) : titleWords.includes(` ${norm(c.name)} `))) {
    return { ok: false, reason: `redirects to ${finalHost}, whose page title does not name the school`, title };
  }
  if (text.length < 120) return { ok: false, reason: 'no readable content (site needs JavaScript or is empty)' };
  if (PARKED.test(text) || PARKED.test(r.body.slice(0, 20000))) return { ok: false, reason: 'parked, suspended or default page' };
  const has = (w) => text.includes(` ${w} `) || (w === 'st' && text.includes(' saint ')) || (w.endsWith('s') && text.includes(` ${w.slice(0, -1)} `));
  const place = new Set([...tokens(c.city), ...tokens(c.district)]);
  const words = tokens(c.name).filter((w) => !place.has(w));
  const nameOk = words.length ? words.every(has) : text.includes(` ${norm(c.name)} `);
  if (!nameOk) return { ok: false, reason: `page does not name the school (missing: ${words.filter((w) => !has(w)).join(', ') || norm(c.name)})`, title };
  const pinOk = text.includes(` ${c.pin} `) || text.includes(` ${c.pin.slice(0, 3)} ${c.pin.slice(3)} `);
  const placeOk = pinOk || text.includes(` ${norm(c.city)} `) || text.includes(` ${norm(c.district)} `);
  if (!placeOk) return { ok: false, reason: `page does not name the town, district or PIN (${c.city}, ${c.district}, ${c.pin})`, title };
  if (/\b(government|govt) aided\b|\baided school\b|\bgrant in aid\b/.test(text)) return { ok: false, reason: 'site says the school is aided: type cannot be set without checking', title };
  const eff = new URL(r.effective);
  const website = eff.pathname === '/' || /^\/(index\.(php|html?|aspx?))?$/i.test(eff.pathname) ? `${eff.origin}/` : `${eff.origin}${eff.pathname}`;
  return { ok: true, website, title, sameHost: finalHost === listedHost };
}

const verified = [], unverified = [];
let next = 0, done = 0;
async function worker() {
  while (next < candidates.length) {
    const c = candidates[next++];
    const v = await verify(c);
    if (v.ok) verified.push({ ...c, website: v.website, listedWebsite: c.website, pageTitle: v.title, checkedOn: '2026-11-16' });
    else unverified.push({ code: c.code, name: c.name, city: c.city, state: c.state, website: c.website, reason: v.reason, pageTitle: v.title });
    if (++done % 100 === 0) console.error(`${done}/${candidates.length}: verified ${verified.length}`);
  }
}
await Promise.all(Array.from({ length: 8 }, worker));
verified.sort((a, b) => a.code.localeCompare(b.code));
writeFileSync(`${outDir}/verified.json`, JSON.stringify(verified, null, 1));
writeFileSync(`${outDir}/unverified.json`, JSON.stringify(unverified, null, 1));
const reasons = {};
for (const u of unverified) { const k = u.reason.replace(/\(.*\)|HTTP \d+/g, (m) => (m.startsWith('HTTP') ? 'HTTP error' : '')).trim(); reasons[k] = (reasons[k] || 0) + 1; }
console.log(`checked ${candidates.length}: verified ${verified.length}, not verified ${unverified.length}`);
console.log(reasons);
