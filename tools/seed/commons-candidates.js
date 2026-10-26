// Lists Wikimedia Commons photo candidates (with licence, author, description and categories) for schools, for manual
// review: only files whose description or categories clearly name the school may be used.
// Usage: node commons-candidates.js <targets.json [{id, slug, name, city, state}]> <out.json>
// Uses the public MediaWiki API politely (one request at a time, pauses, back-off on rate limits).
const fs = require('fs');
const [inPath, outPath] = process.argv.slice(2);
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; licence-checked photo research)' };
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const FREE = /^(cc0|public domain|pd|cc by(-sa)? \d|cc by(-sa)?$|godl|attribution)/i;

async function api(params) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}?${new URLSearchParams({ format: 'json', ...params })}`, { headers: UA });
    const text = await res.text();
    if (res.ok && text.startsWith('{')) return JSON.parse(text);
    await sleep(4000 * (attempt + 1));
  }
  throw new Error('Commons API unavailable');
}

/** "PM SHRI Kendriya Vidyalaya No. 1 Delhi Cantt" -> "Kendriya Vidyalaya No. 1 Delhi Cantt". */
const searchName = (name) => name.replace(/^PM\s*SHRI\s+/i, '').replace(/\s*\(.*\)\s*$/, '').trim();

(async () => {
  const targets = JSON.parse(fs.readFileSync(inPath, 'utf8').replace(/^﻿/, ''));
  const out = [];
  for (const t of targets) {
    const query = `${searchName(t.name)} ${t.city ?? ''}`.trim();
    const found = await api({ action: 'query', list: 'search', srsearch: query, srnamespace: '6', srlimit: '6' });
    const titles = (found.query?.search ?? []).map((s) => s.title).filter((x) => /\.(jpe?g|png|webp)$/i.test(x));
    const candidates = [];
    if (titles.length) {
      await sleep(400);
      const info = await api({ action: 'query', titles: titles.join('|'), prop: 'imageinfo|categories', cllimit: '20',
        iiprop: 'url|extmetadata|size', iiurlwidth: '960' });
      for (const page of Object.values(info.query?.pages ?? {})) {
        const ii = page.imageinfo?.[0];
        if (!ii) continue;
        const m = ii.extmetadata ?? {};
        const license = strip(m.LicenseShortName?.value);
        candidates.push({
          title: page.title, license, free: FREE.test(license), artist: strip(m.Artist?.value),
          description: strip(m.ImageDescription?.value).slice(0, 300), date: strip(m.DateTimeOriginal?.value).slice(0, 20),
          categories: (page.categories ?? []).map((c) => c.title.replace(/^Category:/, '')),
          url: ii.url, thumb: ii.thumburl, width: ii.width, height: ii.height, page: ii.descriptionurl,
        });
      }
    }
    out.push({ ...t, query, candidates });
    console.log(`${t.id} ${t.name}: ${candidates.length} candidate(s)`);
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    await sleep(800);
  }
})();
