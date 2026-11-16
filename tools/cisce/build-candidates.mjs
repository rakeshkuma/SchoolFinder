// Turns the CISCE locator rows (fetch-locate.mjs) into import candidates, checks each against the live schools for
// duplicates, and works out the district from the PIN code using schools already on the site (CBSE's own records).
// Nothing is guessed: a row whose state, PIN, town or district cannot be read is rejected with the reason.
//
// Usage: node tools/cisce/build-candidates.mjs <locate.jsonl> <live-index.json> <out dir>
// Writes <out>/candidates.json (to verify), <out>/duplicates.json and <out>/rejected.json.
import { readFileSync, writeFileSync } from 'node:fs';
import { norm, tokens, host } from './names.mjs';

const [locateFile, liveFile, outDir] = process.argv.slice(2);
const rows = readFileSync(locateFile, 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const live = JSON.parse(readFileSync(liveFile, 'utf8'));

const STATES = {
  'andaman and nicobar islands': 'AN', 'andaman & nicobar islands': 'AN', 'andaman & nicobar': 'AN', 'andhra pradesh': 'AP',
  'arunachal pradesh': 'AR', assam: 'AS', bihar: 'BR', chandigarh: 'CH', chhattisgarh: 'CG', chattisgarh: 'CG',
  'dadra and nagar haveli and daman and diu': 'DH', 'dadra & nagar haveli': 'DH', 'dadra and nagar haveli': 'DH', 'daman & diu': 'DH',
  'daman and diu': 'DH', delhi: 'DL', 'new delhi': 'DL', goa: 'GA', gujarat: 'GJ', haryana: 'HR', 'himachal pradesh': 'HP',
  'jammu and kashmir': 'JK', 'jammu & kashmir': 'JK', jharkhand: 'JH', karnataka: 'KA', kerala: 'KL', ladakh: 'LA',
  lakshadweep: 'LD', 'madhya pradesh': 'MP', maharashtra: 'MH', manipur: 'MN', meghalaya: 'ML', mizoram: 'MZ',
  nagaland: 'NL', odisha: 'OD', orissa: 'OD', puducherry: 'PY', pondicherry: 'PY', punjab: 'PB', rajasthan: 'RJ',
  sikkim: 'SK', 'tamil nadu': 'TN', tamilnadu: 'TN', telangana: 'TS', tripura: 'TR', 'uttar pradesh': 'UP',
  uttarakhand: 'UK', uttaranchal: 'UK', 'west bengal': 'WB',
};
const jaccard = (a, b) => {
  const A = new Set(a), B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  return A.size + B.size === 0 ? 0 : inter / (A.size + B.size - inter);
};

// Places already on the site, per state: district and town names (districts come from CBSE's records, towns from the
// town facts), and what other schools with the same PIN code are filed under.
const districtsByState = new Map(), citiesByState = new Map(), pinDistricts = new Map(), pinCities = new Map();
const count = (map, key, value) => {
  if (!map.has(key)) map.set(key, new Map());
  map.get(key).set(value, (map.get(key).get(value) || 0) + 1);
};
for (const s of live) {
  if (s.district) {
    if (!districtsByState.has(s.state)) districtsByState.set(s.state, new Map());
    districtsByState.get(s.state).set(norm(s.district), s.district);
  }
  if (s.city) {
    if (!citiesByState.has(s.state)) citiesByState.set(s.state, new Map());
    citiesByState.get(s.state).set(norm(s.city), s.city);
  }
  if (s.pin && s.district) count(pinDistricts, `${s.state}|${s.pin}`, s.district);
  if (s.pin && s.city) count(pinCities, `${s.state}|${s.pin}`, s.city);
}
const majority = (m) => {
  if (!m) return null;
  const total = [...m.values()].reduce((a, b) => a + b, 0);
  const [best, n] = [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  return n / total >= 0.6 ? { value: best, n, total } : null;
};

// Older or alternative spellings in CISCE addresses -> the district name the site uses (official renames: Belgaum ->
// Belagavi, Shimoga -> Shivamogga, ...). Only exact, unambiguous ones.
const DISTRICT_ALIASES = {
  GA: { 'north goa': 'Goa North', 'south goa': 'Goa South' },
  GJ: { kutch: 'Kachchh' },
  KA: { bengaluru: 'Bengaluru Urban', bangalore: 'Bengaluru Urban', 'bangalore urban': 'Bengaluru Urban', 'bangalore rural': 'Bengaluru Rural',
    belgaum: 'Belagavi', bellary: 'Ballari', chikballapur: 'Chikkaballapura', chikkaballapur: 'Chikkaballapura',
    davanagere: 'Davangere', shimoga: 'Shivamogga' },
  MH: { 'mumbai city': 'Mumbai' },
  PB: { firozpur: 'Ferozepur', 'shaheed bhagat singh nagar': 'Shahid Bhagat Singh Nagar' },
  UP: { shravasti: 'Shrawasti', siddharthnagar: 'Siddharth Nagar' },
};

// CISCE addresses read "<locality or town>, <town or district>, <state>, <PIN>, India".
function placeFor(state, pin, parts) {
  const before = (parts[parts.length - 1] || '').replace(/^(distt?\.?|district)\s*/i, '').trim();
  const earlier = parts.length > 1 ? parts[parts.length - 2] : null;
  const alias = DISTRICT_ALIASES[state]?.[before.toLowerCase()];
  const knownDistrict = districtsByState.get(state)?.get(norm(alias || before));
  const knownCity = citiesByState.get(state)?.get(norm(before));
  let district = null, districtHow = null;
  if (knownDistrict) { district = knownDistrict; districtHow = `named in the address (${before})`; }
  else {
    const m = majority(pinDistricts.get(`${state}|${pin}`));
    if (m) { district = m.value; districtHow = `PIN ${pin}: ${m.n} of ${m.total} schools on the site`; }
  }
  let city = null, cityHow = null;
  const pc = majority(pinCities.get(`${state}|${pin}`));
  if (pc) { city = pc.value; cityHow = `PIN ${pin}: ${pc.n} of ${pc.total} schools on the site`; }
  else if (knownCity) { city = knownCity; cityHow = 'named in the address'; }
  else if (knownDistrict && earlier && !/\d/.test(earlier)) { city = earlier; cityHow = 'named in the address, before the district'; }
  else if (before && !/\d/.test(before)) { city = before; cityHow = 'named in the address'; }
  return { district, districtHow, city, cityHow };
}

const liveByState = new Map();
for (const s of live) {
  if (!liveByState.has(s.state)) liveByState.set(s.state, []);
  liveByState.get(s.state).push({ ...s, tok: tokens(s.name), host: s.web ? host(s.web) : null, ncity: norm(s.city), ndist: norm(s.district) });
}

const candidates = [], duplicates = [], rejected = [];
const seen = new Map();
for (const r of rows) {
  const reject = (reason) => rejected.push({ code: r.code, name: r.name, address: r.address, website: r.website, reason });
  const parts = (r.address || '').split(',').map((p) => p.trim()).filter(Boolean);
  if (!parts.length || !/^india$/i.test(parts[parts.length - 1])) { reject('outside India'); continue; }
  parts.pop();
  const pinIdx = parts.findLastIndex((p) => /^\d{3}\s?\d{3}$/.test(p));
  const stateIdx = parts.findLastIndex((p) => STATES[p.toLowerCase()]);
  if (stateIdx < 0) { reject('state not readable in the address'); continue; }
  if (pinIdx < 0) { reject('no PIN code in the address'); continue; }
  const state = STATES[parts[stateIdx].toLowerCase()];
  const pin = parts[pinIdx].replace(/\s/g, '');
  const rest = parts.filter((_, i) => i !== pinIdx && i !== stateIdx);
  if (!r.website) { reject('no website listed by CISCE'); continue; }
  if (!r.code) { reject('no CISCE school code'); continue; }
  const place = placeFor(state, pin, rest);
  const city = place.city;
  if (!city) { reject('town not readable in the address'); continue; }
  if (!place.district) { reject(`district not confirmed (PIN ${pin} and "${rest[rest.length - 1]}" match no district on the site)`); continue; }
  const d = { district: place.district, how: place.districtHow };
  if (seen.has(r.code)) { reject(`same CISCE code as an earlier row (${seen.get(r.code)})`); continue; }
  seen.set(r.code, r.name);

  // Duplicate check against live schools in the same state: a similar name at the same PIN or in the same town, or the
  // same website at the same PIN or in the same town. A shared website elsewhere (a society's branches) is not a
  // duplicate, nor is a same-named school in another town of the district.
  const tok = tokens(r.name);
  const h = host(r.website);
  const nCity = norm(city);
  let match = null;
  for (const s of liveByState.get(state) || []) {
    const samePlace = (s.pin && s.pin === pin) || (s.ncity && s.ncity === nCity);
    if (!samePlace) continue;
    const sim = tok.length && s.tok.length ? jaccard(tok, s.tok) : norm(s.name) === norm(r.name) ? 1 : 0;
    const sameHost = h && s.host && h === s.host;
    if (sim >= 0.75 || (sameHost && (s.pin === pin || s.ncity === nCity))) {
      match = { id: s.id, name: s.name, board: s.board, city: s.city, pin: s.pin, web: s.web, similarity: Math.round(sim * 100) / 100, sameWebsite: !!sameHost };
      if (sim >= 0.75 && (s.pin === pin)) break;
    }
  }
  if (match) { duplicates.push({ code: r.code, name: r.name, city, pin, website: r.website, matches: match }); continue; }

  const badges = r.badges.map((b) => b.toLowerCase());
  candidates.push({
    code: r.code, name: r.name, principal: r.principal, state, district: d.district, districtHow: d.how, city, cityHow: place.cityHow, pin,
    addressLine: rest.join(', ') || null, website: r.website, page: r.page,
    gender: badges.includes('co-ed.') || badges.includes('co-ed') ? 'CO_ED' : badges.includes('boys') ? 'BOYS' : badges.includes('girls') ? 'GIRLS' : null,
    // CISCE's classification: "Residential", "Day/Residential" or "Day/Boarding" = boarding available; "Day" = a day school.
    hostel: badges.some((b) => /residential|boarding/.test(b)) ? true : badges.includes('day') ? false : null,
    exams: r.badges.filter((b) => /^(ICSE|ISC|CVE)$/.test(b)),
  });
}
writeFileSync(`${outDir}/candidates.json`, JSON.stringify(candidates, null, 1));
writeFileSync(`${outDir}/duplicates.json`, JSON.stringify(duplicates, null, 1));
writeFileSync(`${outDir}/rejected.json`, JSON.stringify(rejected, null, 1));
const reasons = {};
for (const x of rejected) { const k = x.reason.replace(/\(.*\)/, '').trim(); reasons[k] = (reasons[k] || 0) + 1; }
console.log(`rows ${rows.length}: candidates ${candidates.length}, duplicates of live schools ${duplicates.length}, rejected ${rejected.length}`);
console.log(reasons);
