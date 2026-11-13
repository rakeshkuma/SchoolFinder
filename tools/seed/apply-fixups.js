// Applies the "deactivate" entries of a fixups file (expansion-2026-11-fixups.json) to a running server through the
// admin API: each lapsed second listing of a school CBSE lists twice is hidden, with the reason recorded. Schools are
// found by affiliation number (via the SARAS record's name and PIN, then checked on the profile), never by id, so the
// same file works on the local and the live database. Renames and merges are applied separately (SQL on the live
// database; LocalRenameSchools / LocalMergeDuplicates locally), because the admin API has no partial update for them.
//
// Usage: ADMIN_USERNAME=... ADMIN_PASSWORD=... node apply-fixups.js <apiBase> <fixups.json> [apply]
const fs = require('fs');
const path = require('path');
const [apiBase, file, mode] = process.argv.slice(2);
if (!/^https?:\/\/.+\/api\/v1$/.test(apiBase ?? '') || !file) {
  console.error('usage: node apply-fixups.js <https://host/api/v1> <fixups.json> [apply]');
  process.exit(2);
}
const apply = mode === 'apply';
const { ADMIN_USERNAME, ADMIN_PASSWORD } = process.env;
if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
  console.error('set ADMIN_USERNAME and ADMIN_PASSWORD in the environment');
  process.exit(2);
}
const fixups = JSON.parse(fs.readFileSync(file, 'utf8'));
const saras = new Map();
const dir = path.join(__dirname, '../../data/saras');
for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.jsonl'))) {
  for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) if (l.trim()) { const r = JSON.parse(l); saras.set(r.aff, r); }
}
const decode = (s) => (s ?? '').replace(/&#xD;&#xA;/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');

/** The school carrying this affiliation number, found through a name search and confirmed on its profile. */
async function findByAffiliation(aff) {
  const r = saras.get(aff);
  if (!r) return null;
  const q = `${decode(r['Name of Institution'])} ${r['Pin Code'] ?? ''}`.trim();
  const page = await (await fetch(`${apiBase}/schools/search?q=${encodeURIComponent(q)}&size=50`)).json();
  for (const s of page.content ?? []) {
    const d = await (await fetch(`${apiBase}/schools/${s.id}`)).json();
    if (d.affiliationNumber === aff) return d;
  }
  return null;
}

(async () => {
  const login = await fetch(`${apiBase}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: ADMIN_USERNAME, password: ADMIN_PASSWORD }) });
  if (!login.ok) { console.error(`login failed: HTTP ${login.status}`); process.exit(1); }
  const { accessToken, token } = await login.json();
  const auth = { Authorization: `Bearer ${accessToken ?? token}`, 'Content-Type': 'application/json' };
  let done = 0, missing = 0, failed = 0;
  for (const { affiliation, kept } of fixups.deactivate ?? []) {
    const school = await findByAffiliation(affiliation);
    if (!school) { console.log(`  ${affiliation}: not in the database (already absent or never imported)`); missing++; continue; }
    if (!school.active) { console.log(`  ${affiliation}: ${school.name} is already hidden`); continue; }
    if (!apply) { console.log(`  would hide ${school.id} ${school.name} (${affiliation}; kept ${kept})`); done++; continue; }
    const res = await fetch(`${apiBase}/admin/schools/${school.id}/status`, { method: 'PATCH', headers: auth, body: JSON.stringify({ active: false,
      reason: `CBSE lists this school under two affiliation numbers; the listing with the current affiliation period (no. ${kept}) is kept. Lapsed listing hidden.` }) });
    if (res.ok) { console.log(`  hidden ${school.id} ${school.name} (${affiliation})`); done++; } else { console.log(`  ${affiliation}: HTTP ${res.status}`); failed++; }
  }
  console.log(`${apply ? 'hidden' : 'to hide'}=${done} missing=${missing} failed=${failed}`);
  if (failed) process.exitCode = 1;
})();
