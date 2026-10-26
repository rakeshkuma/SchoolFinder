// Builds import rows for City Montessori School (CMS) campuses from their official campus pages on cmseducation.org
// (saved by page-text.js). Only values that appear verbatim on a campus page are used; everything else is blank.
// Usage: node build-cms-campuses.js <pagesDir> <out.csv> <retrievedDate>
//
// Facts common to all campuses come from cmseducation.org (home and about-us pages, read 2026-10-24): founded 1959
// by Dr Jagdish Gandhi and Dr Bharti Gandhi, CISCE (ICSE/ISC) and Cambridge (CAIE), co-educational K-12 day school,
// all campuses in Lucknow. Campus addresses are as printed on https://cmseducation.org/campuses/.
const fs = require('fs');
const path = require('path');
const [dir, out, retrieved] = process.argv.slice(2);

// campus slug → [campus name, address as listed on the campuses page, locality]
const CAMPUSES = {
  'aliganj-campus-1': ['Aliganj Campus I', "Sector 'O', Aliganj", 'Aliganj'],
  'aliganj-campus-ii': ['Aliganj Campus II', 'A-7, Sector-B, Aliganj', 'Aliganj'],
  'anand-nagar-campus': ['Anand Nagar Campus', 'Jail Road, Anand Nagar', 'Anand Nagar'],
  'asharfabad-campus': ['Asharfabad Campus', 'Mansoor Nagar, Asharfabad', 'Asharfabad'],
  'ayodhya-road-campus': ['Ayodhya Road Campus', 'Tiwariganj Crossing, Ayodhya Road', 'Tiwariganj'],
  'chowk-campus': ['Chowk Campus', 'Hardoi Road, Chowk', 'Chowk'],
  'golf-city-campus': ['Golf City Campus', 'Sector C, Pocket 9, Golf City', 'Golf City'],
  'gomti-nagar-campus-1': ['Gomti Nagar Campus I', 'Vishal Khand-2, Gomti Nagar', 'Gomti Nagar'],
  'gomti-nagar-extension-campus': ['Gomti Nagar Extension Campus', 'Vardhan Khand, Gomti Nagar Extension', 'Gomti Nagar Extension'],
  'indira-nagar-campus-i': ['Indira Nagar Campus I', 'A-823, Sector A, Indira Nagar', 'Indira Nagar'],
  'indira-nagar-campus-ii': ['Indira Nagar Campus II', 'C-Block, Indira Nagar', 'Indira Nagar'],
  'jankipuram-campus': ['Jankipuram Campus', 'Kursi Road, Behind Sargam Apartments, Jankipuram', 'Jankipuram'],
  'jopling-road-campus': ['Jopling Road Campus', 'Opp. Skyotel Hotel, Jopling Road', 'Jopling Road'],
  'kanpur-road-campus': ['Kanpur Road Campus', 'LDA Colony, Kanpur Road', 'LDA Colony'],
  'mahanagar-campus': ['Mahanagar Campus', '90-A, Mahanagar', 'Mahanagar'],
  'rajajipuram-campus-i': ['Rajajipuram Campus I', 'F-Block, Rajajipuram', 'Rajajipuram'],
  'rajajipuram-campus-ii': ['Rajajipuram Campus II', 'C-Block, Rajajipuram', 'Rajajipuram'],
  'rajendra-nagar-campus-i': ['Rajendra Nagar Campus I', 'Aishbagh Road, Rajendra Nagar', 'Rajendra Nagar'],
  'rajendra-nagar-campus-ii': ['Rajendra Nagar Campus II', 'Street 2, Rajendra Nagar', 'Rajendra Nagar'],
  'rdso-campus': ['RDSO Campus', 'Manak Nagar', 'Manak Nagar'],
  'shalimar-one-world-campus': ['Shalimar OneWorld Campus', 'Shalimar OneWorld Township, Sector 6, Gomti Nagar Extn., Near Ekana Stadium', 'Gomti Nagar Extension'],
  'station-road-campus': ['Station Road Campus', '11, Station Road', 'Station Road'],
};
const ALL_CLASSES = ['NURSERY', 'KG', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

const csv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const header = ['name', 'school_type', 'management', 'board_code', 'class_codes', 'gender_type', 'website_url', 'phone',
  'email', 'address_line', 'locality', 'city', 'district', 'state_code', 'established_year', 'principal_name',
  'managing_body', 'description', 'source_url', 'source_retrieved_date'];
const rows = [header.join(',')];

for (const [slug, [campus, address, locality]] of Object.entries(CAMPUSES)) {
  const file = fs.readdirSync(dir).find((f) => f.includes(slug.replace(/[^a-z0-9]+/g, '_')));
  if (!file) { console.warn('missing page for', slug); continue; }
  const t = fs.readFileSync(path.join(dir, file), 'utf8');
  const url = t.match(/^URL: (.+)$/m)[1];
  const principal = t.match(/\n\s*((?:Ms|Mrs|Mr|Dr|Sr|Fr)\.?\s+[A-Z][A-Za-z.' ]{2,60}?)\s*\n\s*Principal\s*\n/)?.[1]?.trim() ?? '';
  const year = t.match(/Established in (\d{4})/i)?.[1] ?? '';
  const emails = [...new Set([...t.matchAll(/[a-z0-9._-]+@cmseducation\.org/gi)].map((m) => m[0].toLowerCase()))]
    .filter((e) => !/^(info|helpdesk|qaid|admission)/.test(e));
  const phones = [...new Set([...t.matchAll(/\+91[\s-]?\d[\d\s-]{8,13}\d/g)].map((m) => m[0].replace(/\s+/g, ' ').trim()))]
    .filter((p) => !/79690\s?15748|2638483|2638738|2638606/.test(p.replace(/\D/g, ' ')));
  // Classes: only when the page states the senior section (IX-XII) or the primary-to-VIII span.
  let classes = '';
  if (/IX\s*[-–]\s*XII/.test(t) && /Nursery/i.test(t)) classes = ALL_CLASSES.join(';');
  else if (/VI\s*[-–]\s*VIII/.test(t) && !/IX\s*[-–]\s*X/.test(t) && /Nursery/i.test(t)) classes = ALL_CLASSES.slice(0, 10).join(';');
  const boards = /ISC|ICSE/.test(t) ? 'CISCE' : '';

  rows.push([`City Montessori School, ${campus}`, 'PRIVATE', 'PRIVATE_UNAIDED', boards, classes, 'CO_ED',
    url, phones.slice(0, 2).join(', '), emails[0] ?? '', address, locality, 'Lucknow', 'Lucknow', 'UP', year, principal,
    '', 'A campus of City Montessori School (CMS), Lucknow, founded in 1959 by Dr Jagdish Gandhi and Dr Bharti Gandhi. '
    + 'CMS describes itself as a co-educational K-12 day school offering CISCE (ICSE/ISC) and Cambridge (IGCSE/A Level) '
    + 'qualifications.', url, retrieved].map(csv).join(','));
  console.log([campus, principal || '-', year || '-', emails[0] || '-', phones.slice(0, 2).join(' / ') || '-', classes ? `classes ${classes.split(';').length}` : 'classes -', boards || '-'].join(' | '));
}
fs.writeFileSync(out, rows.join('\n') + '\n', 'utf8');
