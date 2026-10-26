// Searches Wikimedia Commons for freely licensed photos of each seed school and prints candidates for manual review.
// Usage: node commons-search.js <seed.csv> <out.json>
const fs = require('fs');
const [csvPath, outPath] = process.argv.slice(2);
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; local development)' };
const API = 'https://commons.wikimedia.org/w/api.php';

const names = fs.readFileSync(csvPath, 'utf8').trim().split('\n').slice(1)
  .map((l) => (l.startsWith('"') ? l.slice(1, l.indexOf('",')) : l.split(',')[0]));

const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

(async () => {
  const out = {};
  for (const name of names) {
    const query = name.replace(/^PM SHRI /, '').replace(/[,.']/g, ' ') + ' Delhi';
    const params = new URLSearchParams({
      action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '6', gsrsearch: query,
      prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1200',
    });
    const res = await fetch(`${API}?${params}`, { headers: UA });
    const data = await res.json();
    const pages = Object.values(data.query?.pages ?? {});
    out[name] = pages.map((p) => {
      const ii = p.imageinfo?.[0] ?? {};
      const m = ii.extmetadata ?? {};
      return {
        title: p.title, page: ii.descriptionurl, url: ii.thumburl ?? ii.url, width: ii.thumbwidth ?? ii.width,
        license: strip(m.LicenseShortName?.value), artist: strip(m.Artist?.value), description: strip(m.ImageDescription?.value).slice(0, 160),
      };
    });
    console.log(`== ${name}`);
    for (const c of out[name]) console.log(`   ${c.title} | ${c.license} | ${c.artist} | ${c.description}`);
    await new Promise((r) => setTimeout(r, 400));
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
})();
