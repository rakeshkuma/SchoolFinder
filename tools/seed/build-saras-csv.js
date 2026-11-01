// Converts CBSE SARAS affiliation records (from saras-details-bulk.js) into the admin CSV import format.
// Usage: node build-saras-csv.js <details.jsonl[,more.jsonl]> <out.csv> <retrievedDate yyyy-mm-dd>
//
// Only what SARAS states is mapped:
//   name, affiliation number, state, district, postal address, PIN, website, year of foundation,
//   school type (KV / JNV / GOVT / aided / independent / EMRS), principal, managing trust or society and the\n//   CBSE affiliation level.
// Not inferred: classes offered (the affiliation level gives only the highest class), city, coordinates,
// phone and e-mail. Those stay empty ("Not available") until another official source provides them.
const fs = require('fs');
const [inPath, outPath, retrieved] = process.argv.slice(2);
if (!/^\d{4}-\d{2}-\d{2}$/.test(retrieved ?? '')) throw new Error('retrievedDate (yyyy-mm-dd) required');

// SARAS state names → ISO 3166-2:IN codes. Dadra & Nagar Haveli and Daman & Diu merged into DH in 2020.
const STATE = {
  'ANDAMAN & NICOBAR': 'AN', 'ANDHRA PRADESH': 'AP', 'ARUNACHAL PRADESH': 'AR', ASSAM: 'AS', BIHAR: 'BR',
  CHANDIGARH: 'CH', CHATTISGARH: 'CG', CHHATTISGARH: 'CG', 'DADAR & NAGAR HAVELI': 'DH', 'DADRA & NAGAR HAVELI': 'DH',
  'DAMAN & DIU': 'DH', DELHI: 'DL', GOA: 'GA', GUJARAT: 'GJ', HARYANA: 'HR', 'HIMACHAL PRADESH': 'HP',
  'JAMMU & KASHMIR': 'JK', JHARKHAND: 'JH', KARNATAKA: 'KA', KERALA: 'KL', LADAKH: 'LA', LAKSHADWEEP: 'LD',
  'MADHYA PRADESH': 'MP', MAHARASHTRA: 'MH', MANIPUR: 'MN', MEGHALAYA: 'ML', MIZORAM: 'MZ', NAGALAND: 'NL',
  ODISHA: 'OD', ORISSA: 'OD', PUDUCHERRY: 'PY', PONDICHERRY: 'PY', PUNJAB: 'PB', RAJASTHAN: 'RJ', SIKKIM: 'SK',
  TAMILNADU: 'TN', 'TAMIL NADU': 'TN', TELANGANA: 'TS', TRIPURA: 'TR', 'UTTAR PRADESH': 'UP', UTTARAKHAND: 'UK',
  'WEST BENGAL': 'WB',
};

// SARAS "School Type" → [school_type, management, network]. Unlisted types are skipped and reported.
const TYPE = {
  KV: ['GOVERNMENT', 'CENTRAL_GOVERNMENT', 'KENDRIYA_VIDYALAYA'],
  JNV: ['GOVERNMENT', 'CENTRAL_GOVERNMENT', 'JAWAHAR_NAVODAYA_VIDYALAYA'],
  GOVT: ['GOVERNMENT', '', ''],
  'GOVT AIDED': ['AIDED', 'GOVERNMENT_AIDED', ''],
  'GOVT. AIDED': ['AIDED', 'GOVERNMENT_AIDED', ''],
  INDEPENDENT: ['PRIVATE', 'PRIVATE_UNAIDED', ''],
  // Eklavya Model Residential Schools are run by NESTS or state societies, so management is left unknown.
  EMRS: ['GOVERNMENT', '', 'EKLAVYA_MODEL_RESIDENTIAL_SCHOOL'],
  // Sainik Schools Society schools; boarding profiles come only from boarding-profiles.json, school by school.
  SAINIK: ['GOVERNMENT', '', 'SAINIK_SCHOOL'],
};

const LEVEL = {
  'Senior Secondary Level': 'Senior Secondary (up to Class XII)',
  'Secondary Level': 'Secondary (up to Class X)',
  'Middle Level': 'Middle (up to Class VIII)',
};

const KEEP_UPPER = new Set(['PM', 'SHRI', 'KV', 'JNV', 'DAV', 'DPS', 'CBSE', 'BSF', 'CRPF', 'ITBP', 'SSB', 'CISF',
  'NTPC', 'NHPC', 'ONGC', 'BHEL', 'SAIL', 'IIT', 'NIT', 'AFS', 'ISRO', 'DRDO', 'HAL', 'BEL', 'GAIL', 'IOCL', 'OFK',
  'MES', 'CRP', 'IAF', 'INS', 'DLW', 'BHU', 'AMU', 'JNU', 'IIM', 'ITI', 'NFL', 'BARC', 'NCL', 'CCL', 'BCCL', 'ECL',
  'SECL', 'WCL', 'MCL', 'NEEPCO', 'IFFCO', 'RCF', 'ICSE', 'II', 'III', 'IV', 'VI', 'VII', 'VIII', 'IX', 'XI', 'XII']);
const title = (s) => s.toLowerCase().split(/(\s+|-|\/|\()/).map((w) => {
  const bare = w.replace(/[^a-z]/g, '').toUpperCase();
  if (KEEP_UPPER.has(bare) || /^[IVXL]{2,6}$/.test(bare)) return w.toUpperCase();
  return w.replace(/^([a-z])/, (m) => m.toUpperCase());
}).join('');

const csv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

const GENERIC = /^(PM\s*SHRI\s*(SCHOOL\s*)?)?(KENDRIYA\s+VIDYALAYA|JAWAHAR\s+NAVODAYA\s+VIDYALAYA|GOVT\.?|GOVERNMENT)\b/i;

/** A short place name from the official postal address, without PIN, state, district or postal noise. */
function placeFrom(address, district, stateName) {
  // SARAS escapes line breaks and some characters as HTML entities (&#xD;&#xA;); their ";" must not split segments.
  let a = ` ${(address ?? '').replace(/&#x(D|A);/gi, ', ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&amp;/g, '&').toUpperCase()} `
    .replace(/\b\d{3}\s?\d{3}\b/g, ' ')
    .replace(/\b(P\.?\s?O\.?|POST|DISTT?\.?|DISTRICT|TEH(SIL)?\.?|TALUKA?|MANDAL|BLOCK|VILL(AGE)?\.?|NEAR|OPP\.?|PIN(\s*CODE)?|INDIA)\b/g, ' ');
  // Former state names still used in postal addresses.
  const FORMER = { UTTARAKHAND: ['UTTARANCHAL', 'UTTRANCHAL', 'UTTRAKHAND'], ODISHA: ['ORISSA'], PUDUCHERRY: ['PONDICHERRY'], CHATTISGARH: ['CHHATTISGARH'] };
  for (const drop of [district, stateName, STATE[stateName], ...(FORMER[stateName] ?? [])]) {
    if (drop) a = a.replace(new RegExp(`\\b${drop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g'), ' ');
  }
  const segments = a.split(/[,;]/).map((x) => x.replace(/[^A-Z0-9 .&-]/g, ' ').replace(/\s+/g, ' ').trim()
    .replace(/^(?:[.&\s-]+|AT\b)+/, '')).filter((x) => x.length > 1);
  // A plot, lane or building number, or a landmark ("SUB DIVISION HOSPITAL", "BEHIND ..."), does not say where a school
  // is to a parent; such segments are skipped, and with none left the caller uses the district.
  const NOT_PLACE = /\b(PLOT|H\.?\s?NO|HOUSE|LANE|GALI|KHASRA|HOSPITAL|BEHIND|SHIFT|PETROL|PUMP|MOTORS|BUILDING|FLOOR|PSP|SSS|FINAL|SCHOOL|COMPLEX|CAMPUS|BANK)\b/;
  const first = segments.find((x) => /[A-Z]{3,}/.test(x) && !NOT_PLACE.test(x)) ?? '';
  // Keep whole words up to ~45 characters, and never end on a connector ("AT", "NEW", "ROAD" alone is fine).
  const words = [];
  for (const w of first.split(' ')) {
    if ((words.join(' ') + ' ' + w).trim().length > 45) break;
    words.push(w);
  }
  while (words.length > 1 && /^(AT|AND|&|OF|THE|NEW|NO\.?|-|PO|VIA)$/.test(words[words.length - 1])) words.pop();
  return words.join(' ');
}

/** True when the official name already says where the school is ("KENDRIYA VIDYALAYA GANJ BASODA"). */
function namesItsPlace(official) {
  const rest = official.toUpperCase().replace(GENERIC, ' ')
    .replace(/\b(SCHOOL|PM|SHRI|NO\.?|NUMBER|SR\.?|SEC\.?|SENIOR|SECONDARY|HIGHER|HIGH|[IVX]+|\d+)\b/g, ' ');
  return /[A-Z]{3,}/.test(rest);
}

// Researched boarding data (boarding-profiles.json): per-affiliation overlays and per-network rules. Each overlay may
// set name, network and gender_type (stated by the school itself), managing_body and pin_code (when the CBSE record is
// wrong; give the reason in the overlay's _note) and the boarding-profile columns, which cite their own boarding_source_url. Applying it here keeps curated names and profiles on every rebuild.
const BOARDING_FILE = require('path').join(__dirname, 'boarding-profiles.json');
const boardingData = fs.existsSync(BOARDING_FILE) ? JSON.parse(fs.readFileSync(BOARDING_FILE, 'utf8')) : { cbse: {}, systems: {} };
const BOARDING_COLUMNS = ['residential_system', 'boarding_type', 'entrance_exam', 'entry_classes', 'boarding_summary',
  'accommodation', 'pastoral_care', 'dining', 'medical_care', 'boarding_source_url'];

// Delhi is one city: its schools get city "Delhi" (any 110xxx PIN) and, when the postal address names a well-known
// neighbourhood, that locality. Other states leave both blank here (towns come from build-town-facts.js), and a blank
// cell never overwrites a stored value on re-import.
const DELHI_LOCALITIES = [
  ['Mayur Vihar', /\bMAYUR VIHAR\b/], ['Preet Vihar', /\bPREET VIHAR\b/], ['Laxmi Nagar', /\bLA[KX]SHMI NAGAR\b|\bLAXMI NAGAR\b/],
  ['Patparganj', /\bPATPAR ?GANJ\b|\bI\.?P\.? EXTENSION\b/], ['Shahdara', /\bSHAHDARA\b/], ['Dilshad Garden', /\bDILSHAD GARDEN\b/],
  ['Krishna Nagar', /\bKRISHNA NAGAR\b/], ['Vasundhara Enclave', /\bVASUNDHARA ENCLAVE\b/], ['Rohini', /\bROHINI\b/],
  ['Dwarka', /\bDWARKA\b/], ['Janakpuri', /\bJANAK ?PURI\b/], ['Vikaspuri', /\bVIKAS ?PURI\b/], ['Uttam Nagar', /\bUTTAM NAGAR\b/],
  ['Paschim Vihar', /\bPASCHIM VIHAR\b/], ['Punjabi Bagh', /\bPUNJABI BAGH\b/], ['Rajouri Garden', /\bRAJOURI GARDEN\b/],
  ['Pitampura', /\bPITAM ?PURA\b/], ['Shalimar Bagh', /\bSHALIMAR BAGH\b/], ['Ashok Vihar', /\bASHOK VIHAR\b/],
  ['Model Town', /\bMODEL TOWN\b/], ['Mukherjee Nagar', /\bMUKHERJEE NAGAR\b/], ['Narela', /\bNARELA\b/], ['Bawana', /\bBAWANA\b/],
  ['Najafgarh', /\bNAJAFGARH\b/], ['Vasant Kunj', /\bVASANT KUNJ\b/], ['Vasant Vihar', /\bVASANT VIHAR\b/], ['Saket', /\bSAKET\b/],
  ['Mehrauli', /\bMEHRAULI\b/], ['Kalkaji', /\bKALKAJI\b/], ['Greater Kailash', /\bGREATER KAILASH\b/],
  ['Lajpat Nagar', /\bLAJPAT NAGAR\b/], ['Defence Colony', /\bDEFEN[CS]E COLONY\b/], ['R K Puram', /\bR\.? ?K\.? ?PURAM\b/],
  ['Chanakyapuri', /\bCHANAKYA ?PURI\b/], ['Karol Bagh', /\bKAROL BAGH\b/], ['Sarita Vihar', /\bSARITA VIHAR\b/],
  ['Jasola', /\bJASOLA\b/], ['Badarpur', /\bBADARPUR\b/], ['Malviya Nagar', /\bMALVIYA NAGAR\b/], ['Hauz Khas', /\bHAUZ KHAS\b/],
  ['Delhi Cantt', /\bDELHI CANTT?\b|\bDELHI CANTONMENT\b/], ['Tilak Nagar', /\bTILAK NAGAR\b/], ['Rajinder Nagar', /\bRAJINDER NAGAR\b/],
];
const MAYUR_PHASE = [[/\bPH(ASE)?[- .]*(III|3)\b/, 'Phase III'], [/\bPH(ASE)?[- .]*(II|2)\b/, 'Phase II'], [/\bPH(ASE)?[- .]*(I|1)\b/, 'Phase I']];

function delhiPlace(address, pinCode) {
  if (!/^110\d{3}$/.test(pinCode ?? '')) return { city: '', locality: '' };
  const a = (address ?? '').replace(/&#xD;&#xA;/g, ' ').toUpperCase();
  const hit = DELHI_LOCALITIES.find(([, re]) => re.test(a));
  let locality = hit ? hit[0] : '';
  if (locality === 'Mayur Vihar') {
    const phase = MAYUR_PHASE.find(([re]) => re.test(a));
    if (phase) locality = `Mayur Vihar ${phase[1]}`;
  }
  return { city: 'Delhi', locality };
}

const header = ['name', 'school_type', 'management', 'network', 'affiliation_number', 'board_code', 'address_line',
  'district', 'state_code', 'pin_code', 'website_url', 'established_year', 'principal_name', 'managing_body', 'description', 'source_url',
  'source_retrieved_date', 'gender_type', ...BOARDING_COLUMNS, 'city', 'locality'];
const rows = [header.join(',')];
const skipped = {};
let count = 0;

// A file copied while saras-details-bulk.js was still writing can end in a partial line; skip and report it.
let unreadable = 0;
const readRecords = (paths) => paths.flatMap((p) => fs.readFileSync(p, 'utf8').replace(/^\uFEFF/, '').split('\n'))
  .filter((l) => l.trim()).flatMap((l) => {
    try {
      return [JSON.parse(l)];
    } catch {
      unreadable++;
      return [];
    }
  });
const records = readRecords(inPath.split(','));
if (unreadable) console.warn(`skipped ${unreadable} unreadable line(s)`);
// Whether a name repeats is judged against every SARAS file in data/saras, not just this run's input, so a school
// gets the same name whichever batch imports it first (an update never renames a school).
const SARAS_DIR = require('path').join(__dirname, '../../data/saras');
const everyRecord = new Map();
for (const r of [...readRecords(fs.readdirSync(SARAS_DIR).filter((f) => f.endsWith('.jsonl')).map((f) => `${SARAS_DIR}/${f}`)), ...records]) {
  everyRecord.set(r['Affiliation Number'] ?? r.aff, r);
}
const officialName = (r) => (r['Name of Institution'] ?? '').replace(/[,\s]+$/, '').replace(/\s+/g, ' ').trim();
// Names that repeat within a state ("DELHI PUBLIC SCHOOL", "RAJEEV GANDHI NAVODAYA VIDYALAYA") need a place to be told apart.
// Punctuation and spacing are ignored: "FR AGNEL SCHOOL" and "FR. AGNEL SCHOOL" read the same to a parent.
const nameKey = (stateName, official) => `${stateName}|${official.toUpperCase().replace(/[^A-Z0-9]/g, '')}`;
const nameCount = {};
for (const r of everyRecord.values()) {
  const key = nameKey((r.State ?? '').trim().toUpperCase(), officialName(r));
  nameCount[key] = (nameCount[key] ?? 0) + 1;
}
/** The display name: the official name, plus a place from the address (else the district) when it alone is ambiguous. */
function displayName(r, withDistrict = false) {
  const stateName = (r.State ?? '').trim().toUpperCase();
  const official = officialName(r);
  const district = r.District ? title(r.District.trim()) : '';
  let name = title(official);
  if ((GENERIC.test(official) && !namesItsPlace(official)) || nameCount[nameKey(stateName, official)] > 1) {
    const place = placeFrom(r['Postal Address'], r.District, stateName);
    if (place && !official.toUpperCase().includes(place)) name = `${name}, ${title(place)}`;
    else if (district) name = `${name}, ${district}`;
  }
  if (withDistrict && district && !name.toUpperCase().includes(district.toUpperCase())) name = `${name}, ${district}`;
  return name;
}
// Two schools whose display names still match (two "Kendriya Vidyalaya, Bangalore") also get their district; a pair
// left identical after that is reported, for a person to tell apart.
const displayCount = {};
for (const r of everyRecord.values()) {
  const key = nameKey((r.State ?? '').trim().toUpperCase(), displayName(r));
  displayCount[key] = (displayCount[key] ?? 0) + 1;
}
const clashes = (r) => displayCount[nameKey((r.State ?? '').trim().toUpperCase(), displayName(r))] > 1;
const stillSame = {};
for (const r of everyRecord.values()) {
  if (!clashes(r)) continue;
  const key = nameKey((r.State ?? '').trim().toUpperCase(), displayName(r, true));
  (stillSame[key] ??= []).push(r['Affiliation Number'] ?? r.aff);
}
const unresolved = Object.values(stillSame).filter((v) => v.length > 1);
if (unresolved.length) console.warn(`${unresolved.length} name(s) still shared after adding the district, e.g. affiliations ${unresolved.slice(0, 3).map((v) => v.join('/')).join(', ')}`);
for (const r of records) {
  const stateName = (r.State ?? '').trim().toUpperCase();
  const state = STATE[stateName];
  const type = TYPE[(r['School Type'] ?? '').trim().toUpperCase()];
  if (!state || !type) {
    const key = !state ? `state:${stateName}` : `type:${r['School Type']}`;
    skipped[key] = (skipped[key] ?? 0) + 1;
    continue;
  }
  const official = officialName(r);
  if (!official) continue;
  const district = r.District ? title(r.District.trim()) : '';
  const name = displayName(r, clashes(r));
  const pin = /^[1-9]\d{5}$/.test(r['Pin Code'] ?? '') ? r['Pin Code'] : '';
  const year = /^(18|19|20)\d{2}$/.test(r['Year of Foundation'] ?? '') ? r['Year of Foundation'] : '';
  let website = (r.Website ?? '').trim();
  if (website && !/^https?:\/\//i.test(website)) website = `http://${website}`;
  try {
    const u = new URL(website);
    // Same rule as the backend's HttpUrlValidator (java.net.URI): a hostname of letters, digits, dots and hyphens.
    // Every dot-separated label must be non-empty ("www..school.in" is rejected by java.net.URI).
    if (!/^https?:$/.test(u.protocol) || !/^([a-z0-9-]+\.)+[a-z]{2,}$/i.test(u.hostname) || /[\s,@]/.test(website)) website = ''; // "@": an email given as the website
  } catch {
    website = '';
  }
  const level = LEVEL[r['Status of The School']] ?? r['Status of The School'];
  const description = [
    `Listed by CBSE as "${official}" (affiliation no. ${r['Affiliation Number']}).`,
    level ? `CBSE affiliation level: ${level}.` : '',
    r['Affiliation Period'] ? `Affiliation period: ${r['Affiliation Period'].replace(/\s+/g, ' ')}.` : '',
  ].filter(Boolean).join(' ');

  const overlay = boardingData.cbse?.[r['Affiliation Number']] ?? boardingData.cbse?.[r.aff];
  const network = overlay?.network ?? type[2];
  const profile = overlay ?? boardingData.systems?.[network] ?? {};
  const place = state === 'DL' ? delhiPlace(r['Postal Address'], overlay?.pin_code ?? pin) : { city: '', locality: '' };
  rows.push([(overlay?.name ?? name).slice(0, 200), type[0], type[1], network, r['Affiliation Number'], 'CBSE',
    title(r['Postal Address'] ?? '').slice(0, 400), district, state, overlay?.pin_code ?? pin, website, year,
    title((r['Name of Principal/ Head of Institution'] ?? '').trim()).slice(0, 150),
    (overlay?.managing_body ?? title((r['Name of Trust/ Society/ Managing Committee'] ?? '').trim())).slice(0, 300), description,
    `https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${r.aff}`, retrieved,
    profile.gender_type ?? '', ...BOARDING_COLUMNS.map((c) => profile[c] ?? ''), place.city, place.locality].map(csv).join(','));
  count++;
}
// The admin import accepts at most 5,000 rows per file, so larger outputs are split: out-1.csv, out-2.csv, ...
const CHUNK = 4500;
const body = rows.slice(1);
const base = outPath.replace(/\.csv$/i, '');
for (const old of fs.readdirSync(require('path').dirname(outPath))) {
  const full = require('path').join(require('path').dirname(outPath), old);
  if (full.startsWith(`${base}-`) && /-\d+\.csv$/.test(old)) fs.unlinkSync(full);
}
const files = [];
if (body.length <= CHUNK) {
  fs.writeFileSync(outPath, rows.join('\n') + '\n', 'utf8');
  files.push(outPath);
} else {
  if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
  for (let i = 0; i * CHUNK < body.length; i++) {
    const file = `${base}-${i + 1}.csv`;
    fs.writeFileSync(file, [header.join(','), ...body.slice(i * CHUNK, (i + 1) * CHUNK)].join('\n') + '\n', 'utf8');
    files.push(file);
  }
}
console.log(`rows written: ${count} in ${files.length} file(s); skipped: ${JSON.stringify(skipped)}`);
for (const f of files) console.log(`FILE ${f}`);
