// Fetches licence, author, description and a 1200px thumbnail URL for named Commons files.
// Usage: node commons-info.js <out.json> "File:A.jpg" "File:B.jpg" ...
const fs = require('fs');
const [outPath, ...titles] = process.argv.slice(2);
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; local development)' };
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const out = [];
  for (let i = 0; i < titles.length; i += 20) {
    const batch = titles.slice(i, i + 20);
    const params = new URLSearchParams({ action: 'query', format: 'json', titles: batch.join('|'), prop: 'imageinfo', iiprop: 'url|extmetadata|size', iiurlwidth: '1200' });
    let data;
    for (let attempt = 0; attempt < 6 && !data; attempt++) {
      const text = await (await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })).text();
      if (text.startsWith('{')) data = JSON.parse(text); else await sleep(5000 * (attempt + 1));
    }
    for (const p of Object.values(data.query.pages)) {
      const ii = p.imageinfo?.[0] ?? {};
      const m = ii.extmetadata ?? {};
      out.push({
        title: p.title, page: ii.descriptionurl, url: ii.thumburl ?? ii.url, width: ii.thumbwidth ?? ii.width, height: ii.thumbheight ?? ii.height,
        license: strip(m.LicenseShortName?.value), licenseUrl: m.LicenseUrl?.value ?? null, artist: strip(m.Artist?.value),
        description: strip(m.ImageDescription?.value).slice(0, 300), date: strip(m.DateTimeOriginal?.value),
      });
    }
    await sleep(1500);
  }
  fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
  for (const o of out) console.log(`${o.title}\n   ${o.license} | ${o.artist} | ${o.width}x${o.height} | ${o.description}`);
})();
