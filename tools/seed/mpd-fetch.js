// Downloads the latest CBSE Mandatory Public Disclosure (MPD) PDF from each Kendriya Vidyalaya website and
// writes its text next to it, so the ranking evidence can be extracted and reviewed.
// Usage: node mpd-fetch.js <seed.csv> <outDir>
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const [csvPath, outDir] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const PDFTEXT = path.join(__dirname, '..', '..', '..', '..', '..', 'AppData', 'Local', 'Temp'); // unused placeholder
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseCsvLine(line) {
  const out = []; let cur = ''; let q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}

async function get(url, binary = false) {
  for (let a = 0; a < 3; a++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      if (res.status === 404) return null;
    } catch { /* retry */ }
    await sleep(3000);
  }
  return null;
}

(async () => {
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const header = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((l) => Object.fromEntries(parseCsvLine(l).map((v, i) => [header[i], v])));
  const index = {};
  for (const s of rows.filter((r) => /kvs\.ac\.in/.test(r.website_url))) {
    const base = new URL(s.website_url).origin;
    const page = await get(`${base}/en/cbse-mandatory-public-disclosure/`);
    const pdfs = page ? [...new Set([...page.matchAll(/href="([^"]+\.pdf)"/g)].map((m) => m[1]))] : [];
    // newest upload first (paths contain /uploads/YYYY/MM/)
    pdfs.sort((a, b) => (b.match(/uploads\/(\d{4}\/\d{2})/)?.[1] ?? '').localeCompare(a.match(/uploads\/(\d{4}\/\d{2})/)?.[1] ?? ''));
    const url = pdfs[0];
    const file = path.join(outDir, s.name.replace(/[^\w]+/g, '_') + '.pdf');
    if (url) {
      const buf = await get(url, true);
      if (buf) fs.writeFileSync(file, buf);
    }
    index[s.name] = { mpdPage: `${base}/en/cbse-mandatory-public-disclosure/`, pdf: url ?? null, file: url ? file : null };
    console.log(`${s.name} | ${url ?? 'NO MPD PDF FOUND'}`);
    await sleep(300);
  }
  fs.writeFileSync(path.join(outDir, 'index.json'), JSON.stringify(index, null, 2));
})();
