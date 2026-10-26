// Fetches CBSE SARAS affiliation detail pages politely: one request at a time, a pause between requests,
// retries with back-off, and resumable output (one JSON object per line; already-fetched numbers are skipped).
// Usage: node saras-details-bulk.js <affs.txt> <out.jsonl> [delayMs=800]
const fs = require('fs');
const [listPath, out, delayArg] = process.argv.slice(2);
const delay = Number(delayArg ?? 800);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const clean = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const done = new Set();
if (fs.existsSync(out)) {
  for (const line of fs.readFileSync(out, 'utf8').split('\n')) if (line.trim()) done.add(JSON.parse(line).aff);
}
const affs = fs.readFileSync(listPath, 'utf8').split(/\s+/).filter(Boolean).filter((a) => !done.has(a));

async function fetchOne(aff) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(`https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${aff}`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      if (res.ok) {
        const row = { aff };
        for (const m of (await res.text()).matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
          const cells = [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => clean(c[1]));
          if (cells.length === 2) row[cells[0].replace(/:$/, '').trim()] = cells[1];
        }
        return row;
      }
    } catch {
      // network error: retry
    }
    await sleep(delay * 4 * attempt);
  }
  return null;
}

(async () => {
  let ok = 0;
  let failed = 0;
  for (const aff of affs) {
    const row = await fetchOne(aff);
    if (row && row['Affiliation Number']) {
      fs.appendFileSync(out, JSON.stringify(row) + '\n');
      ok++;
    } else {
      failed++;
    }
    if ((ok + failed) % 100 === 0) console.log(`${ok + failed}/${affs.length} (failed ${failed})`);
    await sleep(delay);
  }
  console.log(`done: ${ok} fetched, ${failed} failed, ${done.size} previously fetched`);
})();
