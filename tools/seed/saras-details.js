// Fetches CBSE SARAS affiliation detail pages and prints key fields as JSON.
// Usage: node saras.js <out.json> <aff1> <aff2> ...
const fs = require('fs');
const [out, ...affs] = process.argv.slice(2);
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();

(async () => {
  const results = [];
  for (const aff of affs) {
    const res = await fetch(`https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${aff}`, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const html = await res.text();
    const row = { aff };
    for (const m of html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
      const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => clean(c[1]));
      if (cells.length === 2) row[cells[0].replace(/:$/, '').trim()] = cells[1];
    }
    results.push(row);
    await new Promise((r) => setTimeout(r, 300));
  }
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  for (const r of results) {
    console.log([r.aff, r['Name of Institution'], r['Pin Code'], r['Year of Foundation'], r['School Type'], r['Status of The School'], r['Website'], r['Postal Address']].join(' | '));
  }
})();
