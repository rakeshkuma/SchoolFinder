// Reads the map location each Kendriya Vidyalaya publishes on its own site: the Google Maps embed on
// https://<name>.kvs.ac.in/en/contact-us/ names a place (!2s...) and gives its coordinates (!2d<lon>!3d<lat>).
// Only the coordinates (a fact the school publishes) are used, citing the contact page; no map content is copied.
//
// Usage: node kv-locations.js <kvs.json> <out-facts.json> <out-report.csv> [cache.json]
//   kvs.json: [{slug, websiteUrl, state}] (state = the profile's state name)
//
// A location is accepted only when
//   - the embedded place is named as a Kendriya Vidyalaya / KV (not a town or a landmark),
//   - the map view is at most 40 km wide (a wider view centres on a region, not the school),
//   - no other school's page embeds the same coordinates (a copied template), and
//   - an OpenStreetMap reverse lookup puts the point in the profile's own state.
// Everything else goes to the report for manual review. kvs.ac.in robots.txt allows these pages; requests are spaced
// out and cached, and Nominatim is called at most once per second with an identifying User-Agent.
const fs = require('fs');

const [inPath, factsPath, reportPath, cachePath = 'kv-location-cache.json'] = process.argv.slice(2);
if (!inPath || !factsPath || !reportPath) {
  console.error('usage: node kv-locations.js <kvs.json> <out-facts.json> <out-report.csv> [cache.json]');
  process.exit(2);
}
const UA = { 'User-Agent': 'Mozilla/5.0 (compatible; IndiaSchoolFinder/0.1; school directory, reads published locations)' };
const PAGE = '/en/contact-us/';
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
// "Jammu & Kashmir" and "Jammu and Kashmir" compare equal.
const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/\band\b|&/g, '').replace(/[^a-z]/g, '');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

const schools = read(inPath);
const cache = fs.existsSync(cachePath) ? read(cachePath) : { pages: {}, reverse: {} };
const save = () => fs.writeFileSync(cachePath, JSON.stringify(cache));

/** {lat, lon, place} from the first Google Maps embed on the page, or {error}. */
function parseEmbed(src) {
  if (!src) return { error: 'no map embed on the contact page' };
  const lon = src.match(/!2d(-?\d+\.\d+)/);
  const lat = src.match(/!3d(-?\d+\.\d+)/);
  const place = src.match(/!2s([^!]+)/);
  if (!lat || !lon) return { error: 'map embed has no coordinates' };
  const name = place ? decodeURIComponent(place[1].replace(/\+/g, ' ')) : '';
  if (!/kendriya|\bk\.?\s?v\b/i.test(name)) return { error: `embedded place is not named as a KV ('${name || 'none'}')` };
  // !1d is the width of the map view in metres. A view tens of kilometres wide centres on a region, not on the school:
  // checked against independent OpenStreetMap locations, every such embed was 8–100 km off, while embeds that agreed
  // within 500 m were at most 31 km wide.
  const view = src.match(/!1d(\d+(?:\.\d+)?)/);
  if (view && Number(view[1]) > 40000) return { error: `map view is ${Math.round(Number(view[1]) / 1000)} km wide, too coarse` };
  const result = { lat: Number(Number(lat[1]).toFixed(7)), lon: Number(Number(lon[1]).toFixed(7)), place: name };
  if (result.lat < 6 || result.lat > 38 || result.lon < 68 || result.lon > 98) return { error: 'coordinates outside India' };
  return result;
}

async function contactEmbed(s) {
  let host;
  try {
    host = new URL(s.websiteUrl).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { error: 'no valid website' };
  }
  if (!/\.kvs\.ac\.in$/.test(host)) return { error: 'website is not on kvs.ac.in' };
  const url = `https://${host}${PAGE}`;
  if (cache.pages[url] === undefined) {
    try {
      const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(30000) });
      if (!res.ok) return { url, error: `fetch failed: HTTP ${res.status}` };
      const html = await res.text();
      cache.pages[url] = (html.match(/<iframe[^>]+src="(https:\/\/www\.google\.com\/maps\/embed[^"]+)"/i) ?? [])[1] ?? null;
      save();
    } catch (e) {
      return { url, error: `fetch failed: ${e.cause?.code ?? e.message}` };
    } finally {
      await sleep(700);
    }
  }
  return { url, ...parseEmbed(cache.pages[url]) };
}

async function stateAt(lat, lon) {
  const key = `${lat},${lon}`;
  if (cache.reverse[key] === undefined) {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&lat=${lat}&lon=${lon}`,
      { headers: { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; checking published school locations)' } });
    if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
    cache.reverse[key] = (await res.json()).address?.state ?? null;
    save();
    await sleep(1100);
  }
  return cache.reverse[key];
}

(async () => {
  const found = new Array(schools.length);
  let next = 0;
  let done = 0;
  const worker = async () => {
    while (next < schools.length) {
      const i = next++;
      found[i] = await contactEmbed(schools[i]);
      if (++done % 100 === 0) console.log(`pages ${done}/${schools.length}`);
    }
  };
  await Promise.all([worker(), worker()]);

  // The same coordinates on two schools' pages means a copied embed: neither can be trusted.
  const uses = {};
  for (const f of found) if (!f.error) uses[`${f.lat},${f.lon}`] = (uses[`${f.lat},${f.lon}`] ?? 0) + 1;

  const facts = [];
  const report = ['slug,result,detail'];
  for (let i = 0; i < schools.length; i++) {
    const s = schools[i];
    const f = found[i];
    let error = f.error;
    if (!error && uses[`${f.lat},${f.lon}`] > 1) error = 'same coordinates are embedded for another school';
    if (!error) {
      const state = await stateAt(f.lat, f.lon);
      if (norm(state) !== norm(s.state)) error = `point lies in ${state ?? 'no state'}, profile is in ${s.state}`;
    }
    if (error) {
      report.push([s.slug, 'REVIEW', error].map(csv).join(','));
      continue;
    }
    facts.push({ slug: s.slug, facts: { location: { latitude: f.lat, longitude: f.lon, source: { url: f.url, retrievedDate: today,
      note: `Map embedded on the Vidyalaya's own Contact Us page, showing '${f.place}'.` } } } });
    report.push([s.slug, 'OK', `${f.lat},${f.lon} ${f.place}`].map(csv).join(','));
  }
  fs.writeFileSync(factsPath, JSON.stringify({
    _comment: `Generated by kv-locations.js on ${today} from the map each Kendriya Vidyalaya embeds on its own Contact Us page.`,
    schools: facts,
  }, null, 1));
  fs.writeFileSync(reportPath, report.join('\n') + '\n');
  console.log(`done: ${facts.length} located, ${schools.length - facts.length} for review`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
