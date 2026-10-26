// Loads school files into a running server (e.g. production) through the admin import API, so every row passes the
// same validation, duplicate and verified-record rules as an import from the admin page.
//
// Usage:
//   ADMIN_USERNAME=admin ADMIN_PASSWORD=... node tools/seed/import-to-server.js <apiBase> [--mode VALIDATE_ONLY|VALID_ROWS_ONLY|ALL_OR_NOTHING] [--update] [--chunk 300] <file.csv|file.json> ...
//   e.g. node tools/seed/import-to-server.js https://schools.example.in/api/v1 --mode VALIDATE_ONLY data/saras/import/*.csv
//
// Image files (like curated-images.json) are registered per school via /admin/schools/{id}/images; schools must be
// imported first; fact files (like school-facts.json) are applied per school via PATCH /admin/schools/{id}/facts. Large files are sent in chunks (default 300 rows) so no single HTTP request runs for minutes. The password is read
// from the environment only, never from the command line (where it would end up in shell history).
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const apiBase = (args.shift() ?? '').replace(/\/$/, '');
let mode = 'VALIDATE_ONLY';
let update = false;
let chunk = 300;
const files = [];
while (args.length) {
  const a = args.shift();
  if (a === '--mode') mode = args.shift();
  else if (a === '--update') update = true;
  else if (a === '--chunk') chunk = Number(args.shift());
  else files.push(a);
}
if (!/^https?:\/\/.+\/api\/v1$/.test(apiBase) || files.length === 0 || !(chunk > 0)) {
  console.error('usage: node import-to-server.js <https://host/api/v1> [--mode M] [--update] [--chunk N] <files...>');
  process.exit(2);
}
const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('set ADMIN_USERNAME and ADMIN_PASSWORD in the environment');
  process.exit(2);
}

/** CSV records, honouring quoted fields that contain commas, quotes or line breaks. */
function csvRecords(text) {
  const records = [];
  let start = 0;
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '"') quoted = !quoted;
    else if (ch === '\n' && !quoted) {
      const rec = text.slice(start, i).replace(/\r$/, '');
      if (rec.trim()) records.push(rec);
      start = i + 1;
    }
  }
  const last = text.slice(start).replace(/\r$/, '');
  if (last.trim()) records.push(last);
  return records;
}

/** [{name, body, type}] parts of at most `chunk` schools each. */
function parts(file) {
  const text = fs.readFileSync(file, 'utf8').replace(/^﻿/, '');
  const base = path.basename(file);
  if (file.toLowerCase().endsWith('.json')) {
    const root = JSON.parse(text);
    const schools = Array.isArray(root) ? root : root.schools;
    const out = [];
    for (let i = 0; i < schools.length; i += chunk) {
      out.push({ name: `${base} [${i + 1}-${Math.min(i + chunk, schools.length)}]`, offset: i, type: 'json',
        body: JSON.stringify(schools.slice(i, i + chunk)) });
    }
    return out;
  }
  const [header, ...rows] = csvRecords(text);
  const out = [];
  for (let i = 0; i < rows.length; i += chunk) {
    out.push({ name: `${base} [${i + 1}-${Math.min(i + chunk, rows.length)}]`, offset: i, type: 'csv',
      body: [header, ...rows.slice(i, i + chunk)].join('\n') + '\n' });
  }
  return out;
}

/** True for files like curated-images.json: {"schools": [{"slug": ..., "images": [...]}]}. */
function isImageFile(file) {
  if (!file.toLowerCase().endsWith('.json')) return false;
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  return Array.isArray(root.schools) && root.schools.length > 0 && Array.isArray(root.schools[0].images);
}

/** True for files like school-facts.json: {"schools": [{"slug": ..., "facts": {...}}]}. */
function isFactsFile(file) {
  if (!file.toLowerCase().endsWith('.json')) return false;
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  return Array.isArray(root.schools) && root.schools.length > 0 && root.schools[0].facts !== undefined;
}

/** Applies each school's sourced facts via PATCH /admin/schools/{id}/facts (unchanged facts are a no-op server-side). */
async function importFacts(file, token) {
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const auth = { Authorization: `Bearer ${token}` };
  let applied = 0;
  let failed = 0;
  for (const school of root.schools) {
    const found = await fetch(`${apiBase}/schools/slug/${encodeURIComponent(school.slug)}`);
    if (!found.ok) {
      console.log(`  ${school.slug}: school not found (HTTP ${found.status})`);
      failed++;
      continue;
    }
    if (mode === 'VALIDATE_ONLY') {
      applied++;
      continue;
    }
    const { id } = await found.json();
    const res = await fetch(`${apiBase}/admin/schools/${id}/facts`, {
      method: 'PATCH', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(school.facts),
    });
    if (res.ok) applied++;
    else {
      failed++;
      const body = await res.json().catch(() => ({}));
      console.log(`  ${school.slug}: HTTP ${res.status} ${body.message ?? ''}`);
    }
  }
  console.log(`${path.basename(file)}: facts ${mode === 'VALIDATE_ONLY' ? 'found' : 'applied'}=${applied} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

/** True for files like jnv-admissions.json: {"schools": [{"slug": ..., "admissions": [...]}]}. */
function isAdmissionsFile(file) {
  if (!file.toLowerCase().endsWith('.json')) return false;
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  return Array.isArray(root.schools) && root.schools.length > 0 && Array.isArray(root.schools[0].admissions);
}

/** Upserts each admission cycle via POST /admin/schools/{id}/admissions (same school, class, year and category = update). */
async function importAdmissions(file, token) {
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const auth = { Authorization: `Bearer ${token}` };
  let applied = 0;
  let failed = 0;
  for (const school of root.schools) {
    const found = await fetch(`${apiBase}/schools/slug/${encodeURIComponent(school.slug)}`);
    if (!found.ok) {
      console.log(`  ${school.slug}: school not found (HTTP ${found.status})`);
      failed += school.admissions.length;
      continue;
    }
    const { id } = await found.json();
    for (const cycle of school.admissions) {
      if (mode === 'VALIDATE_ONLY') {
        applied++;
        continue;
      }
      const res = await fetch(`${apiBase}/admin/schools/${id}/admissions`, {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(cycle),
      });
      if (res.ok) applied++;
      else {
        failed++;
        const body = await res.json().catch(() => ({}));
        console.log(`  ${school.slug}: HTTP ${res.status} ${body.message ?? ''}`);
      }
    }
  }
  console.log(`${path.basename(file)}: admission cycles ${mode === 'VALIDATE_ONLY' ? 'found' : 'applied'}=${applied} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

/** Registers each image unless the school already has one with the same URL (safe to re-run). */
async function importImages(file, token) {
  const root = JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, ''));
  const auth = { Authorization: `Bearer ${token}` };
  let added = 0;
  let skipped = 0;
  let failed = 0;
  for (const school of root.schools) {
    const found = await fetch(`${apiBase}/schools/slug/${encodeURIComponent(school.slug)}`);
    if (!found.ok) {
      console.log(`  ${school.slug}: school not found (HTTP ${found.status})`);
      failed += school.images.length;
      continue;
    }
    const { id } = await found.json();
    const listed = await fetch(`${apiBase}/admin/schools/${id}/images`, { headers: auth });
    const existing = new Set((listed.ok ? await listed.json() : []).map((i) => i.url));
    for (const image of school.images) {
      if (existing.has(image.url)) {
        skipped++;
        continue;
      }
      if (mode === 'VALIDATE_ONLY') {
        added++;
        continue;
      }
      const res = await fetch(`${apiBase}/admin/schools/${id}/images`, {
        method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(image),
      });
      if (res.ok) added++;
      else {
        failed++;
        const body = await res.json().catch(() => ({}));
        console.log(`  ${school.slug}: HTTP ${res.status} ${body.message ?? ''}`);
      }
    }
  }
  console.log(`${path.basename(file)}: images ${mode === 'VALIDATE_ONLY' ? 'to add' : 'added'}=${added} `
    + `already present=${skipped} failed=${failed}`);
  if (failed) process.exitCode = 1;
}

async function login() {
  const res = await fetch(`${apiBase}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`login failed: HTTP ${res.status}`);
  return (await res.json()).accessToken;
}

(async () => {
  let token = await login();
  let issuedAt = Date.now();
  const totals = { created: 0, updated: 0, errors: 0 };
  for (const file of files) {
    if (isImageFile(file)) {
      await importImages(file, token);
      continue;
    }
    if (isFactsFile(file)) {
      await importFacts(file, token);
      continue;
    }
    if (isAdmissionsFile(file)) {
      await importAdmissions(file, token);
      continue;
    }
    for (const part of parts(file)) {
      // Access tokens last 15 minutes; renew well before that.
      if (Date.now() - issuedAt > 10 * 60 * 1000) {
        token = await login();
        issuedAt = Date.now();
      }
      const form = new FormData();
      form.append('file', new Blob([part.body], { type: part.type === 'json' ? 'application/json' : 'text/csv' }),
        `part.${part.type}`);
      const url = `${apiBase}/admin/import/${part.type}?mode=${mode}&updateExisting=${update}`;
      const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error(`${part.name}: HTTP ${res.status} ${body.message ?? ''}`);
        process.exitCode = 1;
        continue;
      }
      totals.created += body.created;
      totals.updated += body.updated;
      totals.errors += body.errors.length;
      console.log(`${part.name}: rows=${body.totalRows} valid=${body.validRows} created=${body.created} `
        + `updated=${body.updated} committed=${body.committed} errors=${body.errors.length}`);
      // Report rows by their position in the original file (CSV rows count the header line as row 1).
      for (const e of body.errors.slice(0, 20)) {
        console.log(`  row ${e.row + part.offset} ${e.field}: ${e.message}`);
      }
    }
  }
  console.log(`done (${mode}): created=${totals.created} updated=${totals.updated} errors=${totals.errors}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
