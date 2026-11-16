// Reads CISCE's official school locator (https://locate.cisce.org/, robots.txt: "User-agent: * Allow: /",
// Content-Signal search=yes, ai-train=no) page by page, politely (one request every 1.5 s), and writes one JSON line per
// school: CISCE code, name, principal, address, gender, day/residential, exams and the website the locator links.
// Usage: node tools/cisce/fetch-locate.mjs data/cisce/locate-2026-11-16.jsonl
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const UA = 'SchoolDhundoBot/1.0 (+https://schooldhundo.in/contact)';
const out = process.argv[2];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#0?39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<')
  .replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

// curl, not Node's fetch: Cloudflare answers Node's client with a JavaScript challenge, which is never solved or worked
// around here. If curl is challenged too, the run stops.
async function page(n) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    let html = '';
    try {
      html = execFileSync('curl', ['-s', '-m', '60', '-A', UA, `https://locate.cisce.org/?page=${n}`], { encoding: 'utf8', maxBuffer: 20e6 });
    } catch (e) { html = ''; }
    if (/Just a moment|challenge-platform/i.test(html) && !html.includes('school-card')) throw new Error(`page ${n}: challenged; stopping`);
    if (html.includes('school-card')) return html;
    console.error(`page ${n}: no list, attempt ${attempt}`);
    await sleep(5000 * attempt);
  }
  throw new Error(`page ${n} failed`);
}

const rows = [];
let last = 1;
for (let n = 1; n <= last; n++) {
  const html = await page(n);
  if (n === 1) last = Math.max(...[...html.matchAll(/\?page=(\d+)/g)].map((m) => Number(m[1])));
  for (const card of html.split('<div class="school-card">').slice(1)) {
    const body = card.split('</td>')[0];
    // The gender and day/residential badges break the tag across lines ("<span\n class=..."), so \s+ not a space.
    const badges = [...body.matchAll(/<span\s+class="badge[^"]*">([^<]*)<\/span>/g)].map((m) => decode(m[1]));
    const title = decode((body.match(/<h6[^>]*>([\s\S]*?)<\/h6>/) || [])[1] || '');
    const [, code = '', name = title] = title.match(/^([A-Z]{2,3}\d{2,4})\s*-\s*(.*)$/) || [];
    const p = (body.match(/<p class="mb-1">([\s\S]*?)<\/p>/) || [])[1] || '';
    const [principal, ...addr] = p.split(/<br\s*\/?>/i).map(decode);
    const website = decode((body.match(/<a href="([^"]*)"[^>]*visit-btn/) || [])[1] || '') || null;
    rows.push({ page: n, code, name, principal: principal || null, address: addr.join(', ') || null, badges, website });
  }
  if (n % 25 === 0) console.error(`page ${n}/${last}: ${rows.length} schools`);
  await sleep(1500);
}
writeFileSync(out, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
console.error(`done: ${rows.length} schools from ${last} pages`);
