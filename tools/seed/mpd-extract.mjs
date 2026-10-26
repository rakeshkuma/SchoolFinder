// Extracts ranking-relevant fields from downloaded CBSE Mandatory Public Disclosure PDFs and prints them with the
// raw lines they came from, for manual review before they are recorded as evidence.
// Usage: node mpd-extract.mjs <dirWithPdfsAndIndex.json> <out.json>
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfjsPath = process.env.PDFJS ?? 'pdfjs-dist/legacy/build/pdf.mjs';
const { getDocument } = await import(pdfjsPath);
const [dir, outPath] = process.argv.slice(2);
const index = JSON.parse(fs.readFileSync(path.join(dir, 'index.json'), 'utf8'));

async function textOf(file) {
  const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(file)), useSystemFonts: true }).promise;
  const lines = [];
  for (let p = 1; p <= Math.min(doc.numPages, 8); p++) {
    const page = await doc.getPage(p);
    let line = ''; let lastY = null;
    for (const item of (await page.getTextContent()).items) {
      const y = Math.round(item.transform[5]);
      if (lastY !== null && Math.abs(y - lastY) > 3) { lines.push(line.trim()); line = ''; }
      line += item.str + ' ';
      lastY = y;
    }
    lines.push(line.trim());
  }
  return lines.map((l) => l.replace(/\s+/g, ' ')).filter(Boolean);
}

const pct = (s) => { const m = s.match(/(\d{2,3}(?:\.\d+)?)\s*%?\s*$/) ?? s.match(/(\d{2,3}(?:\.\d+)?)\s*%/); return m ? Number(m[1]) : null; };

const result = {};
for (const [name, info] of Object.entries(index)) {
  if (!info.file || !fs.existsSync(info.file)) { result[name] = { error: 'no MPD PDF' }; continue; }
  let lines;
  try { lines = await textOf(info.file); } catch (e) { result[name] = { error: 'unreadable: ' + e.message }; continue; }
  if (lines.join(' ').length < 400) { result[name] = { error: 'scanned / no text layer' }; continue; }
  const find = (re) => lines.find((l) => re.test(l)) ?? null;
  const after = (re, n = 6) => { const i = lines.findIndex((l) => re.test(l)); return i < 0 ? [] : lines.slice(i, i + n); };
  const r = {
    pdf: info.pdf,
    resultX: after(/RESULT\s*CLASS\s*:?\s*X\b(?!I)/i, 7),
    resultXII: after(/RESULT\s*CLASS\s*:?\s*XII/i, 7),
    teachers: find(/TOTAL\s*NO\.?\s*OF\s*TEACHERS/i),
    ratio: find(/TEACHERS?\s*SECTION\s*RATIO/i),
    specialEducator: find(/SPECIAL\s*EDUCATOR/i),
    counsellor: find(/COUNSELLOR/i),
    campus: find(/CAMPUS\s*AREA/i),
    labs: find(/LABORATOR/i),
    cwsn: find(/CWSN/i),
    building: find(/BUILDING\s*SAFETY/i),
    fire: find(/FIRE\s*SAFETY/i),
    water: find(/WATER/i),
  };
  result[name] = r;
}
fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
for (const [name, r] of Object.entries(result)) {
  console.log(`\n##### ${name}`);
  if (r.error) { console.log('  ' + r.error); continue; }
  for (const k of ['resultX', 'resultXII']) console.log(`  ${k}: ${r[k].slice(1).join(' / ')}`);
  for (const k of ['teachers', 'ratio', 'specialEducator', 'counsellor', 'campus', 'labs', 'cwsn']) console.log(`  ${k}: ${r[k]}`);
}
