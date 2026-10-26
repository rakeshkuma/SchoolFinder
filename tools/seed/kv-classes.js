// Reads the classes each Kendriya Vidyalaya runs from the "Class & social category wise enrolment position" table its
// official site (https://<name>.kvs.ac.in) publishes, and writes a facts file (see school-facts.json).
//
// Usage: node kv-classes.js <kvs.json> <out-facts.json> <out-report.csv> [cache.json]
//   kvs.json: [{slug, websiteUrl}], e.g. exported from GET /api/v1/schools?network=KENDRIYA_VIDYALAYA
//
// A class is recorded when its row lists at least one section. A table is used only when every row label is
// recognised (I–XII in Roman or Arabic numerals, optionally with a stream such as "XI Sci", or Balvatika 1–3) and
// the classes form a continuous range of at least four classes starting at Balvatika or Class I; anything else is
// reported for manual review instead of guessed. Balvatika-1/2/3 (the NEP 2020 pre-primary years)
// are recorded as Pre-Nursery/Nursery/KG and the source note says so. robots.txt on kvs.ac.in sites allows these pages;
// requests are made two at a time with a pause, and results are cached so an interrupted run resumes.
const fs = require('fs');

const [inPath, factsPath, reportPath, cachePath = 'kv-cache.json'] = process.argv.slice(2);
if (!inPath || !factsPath || !reportPath) {
  console.error('usage: node kv-classes.js <kvs.json> <out-facts.json> <out-report.csv> [cache.json]');
  process.exit(2);
}
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; IndiaSchoolFinder/0.1; school directory, reads enrolment tables)' };
const PAGE = '/en/class-social-category-wise-enrolment-position/';
const today = new Date().toISOString().slice(0, 10);
const ORDER = ['PRE_NURSERY', 'NURSERY', 'KG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const ROMAN = ORDER.slice(3);
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

const schools = read(inPath);
const cache = fs.existsSync(cachePath) ? read(cachePath) : {};

const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

/** Class code for a row label, or null when the label is not recognised. */
function classCode(label) {
  // Other scripts (e.g. a stream written in Hindi, "XII-कला") are dropped, then stray edge hyphens ("Class -1").
  const l = label.replace(/बालवाटिका/g, 'BALVATIKA').toUpperCase().replace(/CLASS|STD\.?/g, ' ')
    .replace(/[^A-Z0-9 -]/g, ' ').replace(/\s+/g, ' ').replace(/^[ -]+|[ -]+$/g, '');
  const bal = l.match(/^BALA? ?VATIKA ?-? ?(1|2|3|I|II|III)$/);
  if (bal) return { '1': 'PRE_NURSERY', I: 'PRE_NURSERY', '2': 'NURSERY', II: 'NURSERY', '3': 'KG', III: 'KG' }[bal[1]];
  // A class numeral, optionally followed by a stream ("XI Sci", "XII Science Stream", "XI-COM", "XIIArts").
  const stream = '(?:SCI(?:ENCE)?|COM(?:MERCE)?|HUM(?:ANITIES)?|ARTS?|MATHS?|BIO(?:LOGY)?)';
  const m = l.match(new RegExp(`^([IVX]+|\\d{1,2})(?:[ -]*${stream}|[ -]+[A-Z]{1,4})?(?: STREAM)?$`));
  if (!m) return null;
  const code = /^\d+$/.test(m[1]) ? ROMAN[Number(m[1]) - 1] : m[1];
  return ROMAN.includes(code) ? code : null;
}

/** {codes, rows} from the enrolment table, or {error}. */
function parse(html) {
  const table = (html.match(/<table[\s\S]*?<\/table>/gi) ?? []).find((t) => /Number of Section/i.test(t));
  if (!table) return { error: 'no enrolment table on the page' };
  const all = (table.match(/<tr[\s\S]*?<\/tr>/gi) ?? []).map((r) => (r.match(/<t[dh][\s\S]*?<\/t[dh]>/gi) ?? []).map(text));
  // Some sites add columns (e.g. "Title"), so the Class and Sections columns are located from the header row.
  const header = all.findIndex((cells) => cells.some((c) => /Number of Section/i.test(c)));
  const classCol = all[header].findIndex((c) => /^class$/i.test(c));
  const sectionCol = all[header].findIndex((c) => /Number of Section/i.test(c));
  if (classCol < 0) return { error: 'enrolment table has no Class column' };
  const rows = all.slice(header + 1)
    .map((cells) => [cells[classCol] ?? '', cells[sectionCol] ?? ''])
    .filter(([label]) => label && !/total/i.test(label));
  if (rows.length === 0) return { error: 'enrolment table has no class rows' };
  const codes = new Set();
  const labels = [];
  for (const [label, sections] of rows) {
    const code = classCode(label);
    if (!code) return { error: `unrecognised class label '${label}'` };
    if (Number(sections) > 0) {
      codes.add(code);
      labels.push(label);
    }
  }
  if (codes.size === 0) return { error: 'no class with a section' };
  const ordered = ORDER.filter((c) => codes.has(c));
  // A school runs a continuous range of classes; a gap (e.g. V missing) is most likely an entry error in the table.
  const span = ORDER.slice(ORDER.indexOf(ordered[0]), ORDER.indexOf(ordered[ordered.length - 1]) + 1);
  if (span.length !== ordered.length) {
    return { error: `classes with sections are not continuous (${ordered.join(' ')}); missing ${span.filter((c) => !codes.has(c)).join(' ')}` };
  }
  // Kendriya Vidyalayas start at Balvatika or Class I; a table starting higher, or listing only one to three classes,
  // is far more likely incomplete than a true picture of the school.
  if (ORDER.indexOf(ordered[0]) > ORDER.indexOf('I')) return { error: `classes start at ${ordered[0]}, above Class I` };
  if (ordered.length < 4) return { error: `only ${ordered.length} class(es) listed (${ordered.join(' ')})` };
  return { codes: ordered, balvatika: labels.some((l) => /vatika|वाटिका/i.test(l)) };
}

async function fetchPage(url) {
  const res = await fetch(url, { headers: UA, redirect: 'follow', signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

async function handle(s) {
  let host;
  try {
    // CBSE records some sites as www.<name>.kvs.ac.in; KVS subdomains have no www and those names do not resolve.
    host = new URL(s.websiteUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { error: 'no valid website' };
  }
  if (!/\.kvs\.ac\.in$/.test(host)) return { error: 'website is not on kvs.ac.in' };
  const origin = `https://${host}`;
  const url = origin + PAGE;
  // The cache keeps the page's enrolment table (not the parsed result), so parser changes never re-fetch a site.
  if (cache[url] === undefined) {
    try {
      const html = await fetchPage(url);
      cache[url] = (html.match(/<table[\s\S]*?<\/table>/gi) ?? []).find((t) => /Number of Section/i.test(t)) ?? null;
      fs.writeFileSync(cachePath, JSON.stringify(cache));
    } catch (e) {
      return { url, error: `fetch failed: ${e.cause?.code ?? e.message}` }; // not cached: retried on the next run
    } finally {
      await new Promise((r) => setTimeout(r, 700));
    }
  }
  return { url, ...parse(cache[url] ?? '') };
}

(async () => {
  const results = new Array(schools.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < schools.length) {
      const i = next++;
      results[i] = await handle(schools[i]);
      if (++done % 50 === 0) console.log(`${done}/${schools.length}`);
    }
  };
  await Promise.all([worker(), worker()]);

  const facts = [];
  const report = ['slug,result,detail'];
  schools.forEach((s, i) => {
    const r = results[i];
    if (r.error) {
      report.push([s.slug, 'REVIEW', r.error].map(csv).join(','));
      return;
    }
    const first = r.codes[0];
    const last = r.codes[r.codes.length - 1];
    const note = `Enrolment table published by the Vidyalaya lists sections for ${r.codes.length} class(es), ${first} to ${last}.`
      + (r.balvatika ? ' Balvatika-1/2/3 are recorded as Pre-Nursery/Nursery/KG.' : '');
    facts.push({ slug: s.slug, facts: { classes: { codes: r.codes, source: { url: r.url, retrievedDate: today, note } } } });
    report.push([s.slug, 'OK', r.codes.join(' ')].map(csv).join(','));
  });
  fs.writeFileSync(factsPath, JSON.stringify({
    _comment: `Generated by kv-classes.js on ${today} from each Kendriya Vidyalaya's own enrolment table.`, schools: facts,
  }, null, 1));
  fs.writeFileSync(reportPath, report.join('\n') + '\n');
  console.log(`done: ${facts.length} with classes, ${schools.length - facts.length} for review`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
