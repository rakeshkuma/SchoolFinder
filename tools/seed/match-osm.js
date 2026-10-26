// Matches school profiles to OpenStreetMap schools with conservative, explainable rules and writes a facts file
// (see school-facts.json) for the confident matches plus a report of everything left for manual review.
//
// Usage: node match-osm.js <schools.json> <keyword> <out-facts.json> <out-report.csv> [cache.json]
//   schools.json: [{slug, name, district, state, pin}], e.g. exported from GET /api/v1/schools/{id}
//   keyword:      regular expression the OSM school name must match (case-insensitive), e.g. "navodaya|^JNV"
//
// 1. One Overpass query lists every OSM school in India whose name contains the keyword.
// 2. Each OSM school's state, district and postcode come from a Nominatim reverse lookup of its own coordinates.
// 3. A profile is matched to an OSM school in the same state when
//    (a) the OSM postcode equals the profile's PIN and no other keyword school has it, or
//    (b) the OSM district equals the profile's district, it is the only keyword school in that district, and the
//        input holds only one school for that district (two JNVs in one district are never guessed apart).
// Profiles that two OSM schools or one OSM school and two profiles could match are left for manual review.
// Requests follow the Overpass and Nominatim usage policies (one bulk query; ≤ 1 lookup per second, identifying
// User-Agent); results are cached so an interrupted run resumes without repeating requests.
const fs = require('fs');

const [inPath, keyword, factsPath, reportPath, cachePath = 'osm-cache.json'] = process.argv.slice(2);
if (!inPath || !keyword || !factsPath || !reportPath) {
  console.error('usage: node match-osm.js <schools.json> <keyword> <out-facts.json> <out-report.csv> [cache.json]');
  process.exit(2);
}
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; one-time matching of school locations)' };
const today = new Date().toISOString().slice(0, 10);
// Lower-case letters and digits only; also drops a trailing "district" so "Purulia District" equals "Purulia".
const norm = (s) => (s || '').toLowerCase().normalize('NFKD').replace(/district$/, '').replace(/[^a-z0-9]/g, '');
const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
// Features named after a school but not the school itself ("KV ground", "JNV Office building"). Plural "Grounds" is
// left alone: "Island Grounds" is a Chennai locality that names a Kendriya Vidyalaya.
const NOT_A_SCHOOL = /\b(ground|play ?ground|stadium|office building)\b/i;

const schools = JSON.parse(fs.readFileSync(inPath, 'utf8').replace(/^﻿/, ''));
const cache = fs.existsSync(cachePath)
  ? JSON.parse(fs.readFileSync(cachePath, 'utf8').replace(/^﻿/, ''))
  : { overpass: null, reverse: {} };
const save = () => fs.writeFileSync(cachePath, JSON.stringify(cache));

async function overpass() {
  if (cache.overpass) return cache.overpass;
  // Schools are mapped as amenity=school/college, building=school or landuse=education areas; JNVs are often "JNV ...".
  const pattern = keyword.replace(/[^A-Za-z| ^]/g, '');
  const query = `[out:json][timeout:240];area["ISO3166-1"="IN"][admin_level=2]->.in;
    (nwr(area.in)["amenity"~"^(school|college)$"]["name"~"${pattern}",i];
     nwr(area.in)["building"="school"]["name"~"${pattern}",i];
     nwr(area.in)["landuse"="education"]["name"~"${pattern}",i];);
    out center tags;`;
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST', headers: { ...UA, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'data=' + encodeURIComponent(query),
  });
  if (!res.ok) throw new Error(`Overpass HTTP ${res.status}`);
  cache.overpass = (await res.json()).elements.map((e) => ({
    url: `https://www.openstreetmap.org/${e.type}/${e.id}`, name: e.tags?.name ?? '',
    lat: e.lat ?? e.center?.lat, lon: e.lon ?? e.center?.lon, postcode: e.tags?.['addr:postcode'] ?? null,
    amenity: e.tags?.amenity ?? null,
  })).filter((e) => e.lat !== undefined);
  save();
  return cache.overpass;
}

async function reverse(o) {
  if (cache.reverse[o.url]) return cache.reverse[o.url];
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${o.lat}&lon=${o.lon}`;
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`Nominatim HTTP ${res.status}`);
  const a = (await res.json()).address ?? {};
  cache.reverse[o.url] = { state: a.state ?? null, district: a.state_district ?? a.county ?? a.district ?? null, postcode: a.postcode ?? null };
  save();
  await new Promise((r) => setTimeout(r, 1100));
  return cache.reverse[o.url];
}

(async () => {
  const osm = (await overpass()).filter((o) => !NOT_A_SCHOOL.test(o.name));
  console.log(`OSM schools named like '${keyword}': ${osm.length}`);
  let n = 0;
  for (const o of osm) {
    Object.assign(o, await reverse(o));
    o.postcode = o.postcode ?? cache.reverse[o.url].postcode;
    if (++n % 50 === 0) console.log(`reverse lookups ${n}/${osm.length}`);
  }

  // The same campus is often mapped twice (a school point and an education area): objects within 500 m in the same
  // district are one site, represented by its amenity=school object when there is one.
  const km = (a, b) => {
    const r = Math.PI / 180;
    const x = (b.lon - a.lon) * r * Math.cos(((a.lat + b.lat) / 2) * r);
    return Math.hypot(x, (b.lat - a.lat) * r) * 6371;
  };
  const osmAll = osm.splice(0);
  for (const o of osmAll.sort((a, b) => Number(b.amenity === 'school') - Number(a.amenity === 'school'))) {
    const site = osm.find((x) => norm(x.district) === norm(o.district) && km(x, o) < 0.5);
    if (site) site.postcode = site.postcode ?? o.postcode;
    else osm.push(o);
  }
  console.log(`distinct sites: ${osm.length}`);

  const profilesPerDistrict = {};
  for (const s of schools) {
    const k = `${norm(s.state)}|${norm(s.district)}`;
    profilesPerDistrict[k] = (profilesPerDistrict[k] ?? 0) + 1;
  }

  const proposals = [];
  const report = ['slug,name,district,state,pin,result,detail'];
  for (const s of schools) {
    const sameState = osm.filter((o) => norm(o.state) === norm(s.state));
    const byPin = sameState.filter((o) => s.pin && o.postcode === s.pin);
    const inDistrict = sameState.filter((o) => norm(o.district) === norm(s.district));
    let match = null;
    let basis = null;
    if (byPin.length === 1) {
      match = byPin[0];
      basis = `its postcode ${s.pin} equals the profile's PIN`;
    } else if (byPin.length === 0 && inDistrict.length === 1 && profilesPerDistrict[`${norm(s.state)}|${norm(s.district)}`] === 1) {
      match = inDistrict[0];
      basis = `it is the only school with a matching name that OpenStreetMap places in ${s.district} district, and this directory has one such school there`;
    }
    if (match) proposals.push({ s, match, basis });
    else {
      const detail = sameState.length === 0 ? 'no OSM school with the keyword in this state'
        : `${byPin.length} with this PIN, ${inDistrict.length} in this district`;
      report.push([s.slug, s.name, s.district, s.state, s.pin, 'REVIEW', detail].map(csv).join(','));
    }
  }
  // One OSM school must never be given to two profiles.
  const uses = {};
  for (const p of proposals) uses[p.match.url] = (uses[p.match.url] ?? 0) + 1;
  const facts = [];
  for (const { s, match, basis } of proposals) {
    if (uses[match.url] > 1) {
      report.push([s.slug, s.name, s.district, s.state, s.pin, 'REVIEW', `${match.url} also matches another profile`].map(csv).join(','));
      continue;
    }
    facts.push({ slug: s.slug, facts: { location: {
      latitude: Number(Number(match.lat).toFixed(7)), longitude: Number(Number(match.lon).toFixed(7)),
      source: { url: match.url, retrievedDate: today,
        note: `OpenStreetMap school '${match.name}' (${match.district ?? 'district not given'}, ${match.state}); matched automatically because ${basis}.` },
    } } });
    report.push([s.slug, s.name, s.district, s.state, s.pin, 'MATCHED', match.url].map(csv).join(','));
  }
  fs.writeFileSync(factsPath, JSON.stringify({ schools: facts }, null, 2));
  fs.writeFileSync(reportPath, report.join('\n') + '\n');
  console.log(`done: ${facts.length} matched, ${schools.length - facts.length} for review`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
