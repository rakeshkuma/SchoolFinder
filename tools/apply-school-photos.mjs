// Adds the checked school photos in a data file (e.g. data/images/premier-school-photos-2026-11.json) through the admin
// API: registers each photo, approves it under its stated licence and makes it the school's cover if the school has no
// published photo yet. A school that already has the same photo is skipped, so running it twice changes nothing.
//
// Usage: node tools/apply-school-photos.mjs <api base, e.g. http://127.0.0.1:8080/api/v1> <data file> <password file> [username]
// The password file's first line holds the admin password (a "Password:" label is stripped); it is never printed.
import { readFileSync } from 'node:fs';

const [api, dataFile, passwordFile, username = 'admin'] = process.argv.slice(2);
if (!api || !dataFile || !passwordFile) {
  console.error('usage: node tools/apply-school-photos.mjs <api> <data file> <password file> [username]');
  process.exit(2);
}
const lines = readFileSync(passwordFile, 'utf8').split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
const passwordLine = lines.find((l) => /^password\s*:/i.test(l)) ?? lines[0];
const password = passwordLine.replace(/^password\s*:\s*/i, '');
const { photos } = JSON.parse(readFileSync(dataFile, 'utf8'));

const login = await fetch(`${api}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
if (!login.ok) throw new Error(`sign-in failed: HTTP ${login.status}`);
const { accessToken } = await login.json();
const H = { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' };
const call = async (method, path, body) => {
  const r = await fetch(`${api}${path}`, { method, headers: H, body: body ? JSON.stringify(body) : undefined });
  if (!r.ok) throw new Error(`${method} ${path}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.status === 204 ? null : r.json();
};

let added = 0;
for (const { schoolSlug, schoolName, image } of photos) {
  const school = await fetch(`${api}/schools/slug/${schoolSlug}`).then((r) => (r.ok ? r.json() : null));
  if (!school) { console.log(`skip   ${schoolName}: no school with slug ${schoolSlug}`); continue; }
  const existing = await call('GET', `/admin/schools/${school.id}/images`);
  const list = Array.isArray(existing) ? existing : existing.content ?? [];
  if (list.some((i) => i.sourceUrl === image.sourceUrl)) { console.log(`same   ${schoolName}: already has this photo`); continue; }
  const hadPublished = list.some((i) => i.published || ['PUBLIC_DOMAIN', 'OPEN_LICENCE', 'WRITTEN_PERMISSION', 'PURCHASED_LICENCE', 'OWN_WORK'].includes(i.permissionStatus));
  const created = await call('POST', `/admin/schools/${school.id}/images`, image);
  await call('POST', `/admin/schools/${school.id}/images/${created.id}/approve`, { permissionStatus: image.permissionStatus, note: image.permissionNote });
  if (!hadPublished) await call('POST', `/admin/schools/${school.id}/images/${created.id}/primary`);
  added++;
  console.log(`added  ${schoolName} (school ${school.id}, image ${created.id})${hadPublished ? '' : ', now its cover'}`);
}
console.log(`${added} photo(s) added`);
