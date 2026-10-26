// Searches Wikimedia Commons (files) for each query, politely, and prints licence/author/description for review.
// Usage: node commons-find.js "query 1" "query 2" ...
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; local development)' };
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const text = await (await fetch(`https://commons.wikimedia.org/w/api.php?${new URLSearchParams({ format: 'json', ...params })}`, { headers: UA })).text();
    if (text.startsWith('{')) return JSON.parse(text);
    await sleep(8000 * (attempt + 1));
  }
  throw new Error('rate limited');
}

(async () => {
  for (const q of process.argv.slice(2)) {
    const data = await api({ action: 'query', generator: 'search', gsrnamespace: '6', gsrlimit: '6', gsrsearch: q,
      prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: '1200' });
    console.log(`== ${q}`);
    for (const p of Object.values(data.query?.pages ?? {})) {
      const m = p.imageinfo?.[0]?.extmetadata ?? {};
      console.log(`   ${p.title} | ${strip(m.LicenseShortName?.value)} | ${strip(m.Artist?.value).slice(0, 40)} | ${strip(m.ImageDescription?.value).slice(0, 120)}`);
    }
    await sleep(4000);
  }
})();
