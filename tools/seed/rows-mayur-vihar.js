// Builds seed CSV rows for Mayur Vihar schools from CBSE SARAS affiliation records (retrieved 2026-10-24).
// Usage: node mayur-rows.js <saras-details.json> >> rows.csv
const fs = require('fs');
const details = Object.fromEntries(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((d) => [d.aff, d]));

// aff, display name, school code, locality, gender, website override, coordinates (OSM school feature) or null
const SCHOOLS = [
  [2730104, 'Bal Bhavan Public School', 25021, 'Mayur Vihar Phase II', null, null, [28.6187992, 77.3025948]],
  [2730168, 'Ahlcon Public School', 25020, 'Mayur Vihar Phase I', null, null, [28.6080923, 77.2912634]],
  [2730203, 'ASN Senior Secondary School', 25019, 'Mayur Vihar Phase I', null, null, [28.5982379, 77.2959696]],
  [2730355, 'Ryan International School Mayur Vihar', 25010, 'Mayur Vihar Phase III', null, null, [28.6138419, 77.3363667]],
  [2730377, 'Rishabh Public School', 25025, 'Mayur Vihar Phase I', null, null, [28.6041527, 77.2912858]],
  [2730401, 'Salwan Public School Mayur Vihar', 25026, 'Mayur Vihar Phase III', null, null, [28.6101286, 77.3399312]],
  [2730473, "St. Mary's Secondary School Mayur Vihar", 25023, 'Mayur Vihar Phase III', null, null, [28.6105632, 77.3378948]],
  [2730489, 'Vanasthali Public School', 25028, 'Mayur Vihar Phase III', null, null, [28.6045491, 77.3350634]],
  [2730534, 'Bharti Public School', 25029, 'Kondli, Mayur Vihar', null, null, [28.6061809, 77.3324268]],
  [2730573, "Mother Mary's School", 25030, 'Mayur Vihar Phase I', null, 'https://www.mothermarys.school/', [28.5983247, 77.2992961]],
  [2730586, 'Amity International School Mayur Vihar', 25031, 'Mayur Vihar Phase I', null, null, [28.5977732, 77.2985162]],
  [2730593, 'Vidya Bal Bhavan Senior School', 25024, 'Mayur Vihar Phase III', null, null, null],
  [2730613, 'Dashmesh Public School', 25046, 'Mayur Vihar Phase III', null, null, null],
  [2730929, 'Lovely Heritage School', 25574, 'Mayur Vihar Phase II', null, null, null],
  [2752043, 'Govt. Sarvodaya Boys Sr. Sec. School, Mayur Vihar Phase I Pocket 2', 27063, 'Mayur Vihar Phase I', 'BOYS', '', null],
  [2752076, 'Shaheed Captain Hanifuddin Govt. Boys Sr. Sec. School', 27065, 'Mayur Vihar Phase I', 'BOYS', '', [28.6028764, 77.2944256]],
  [2752107, 'Govt. Girls Secondary School, Mayur Vihar Phase III', 27067, 'Mayur Vihar Phase III', 'GIRLS', '', null],
  [2752108, 'Govt. Boys Secondary School, Kondli Gharoli', 27040, 'Mayur Vihar Phase III', 'BOYS', '', null],
  [2752125, "Government Boys' Secondary School, Mayur Vihar Phase III", 27068, 'Mayur Vihar Phase III', 'BOYS', '', null],
  [2762041, 'Govt. Sarvodaya Girls Sr. Sec. School, Mayur Vihar Phase I', 27070, 'Mayur Vihar Phase I', 'GIRLS', '', null],
  [2762065, 'Sarvodaya Kanya Vidyalaya, Mayur Vihar Phase I Pocket IV', 27064, 'Mayur Vihar Phase I', 'GIRLS', '', [28.6028764, 77.2944256]],
  [2762066, 'Govt. Sarvodaya Girls Sr. Sec. School, Mayur Vihar Phase II Pocket B', 27066, 'Mayur Vihar Phase II', 'GIRLS', '', null],
  [2762092, 'Govt. Girls Secondary School, Kondli Gharoli', 27041, 'Mayur Vihar Phase III', 'GIRLS', '', null],
  [2772015, 'Kerala Education Society Sr. Sec. School', 27069, 'Mayur Vihar Phase III', null, null, null],
];

const TYPE = { INDEPENDENT: 'PRIVATE', GOVT: 'GOVERNMENT', 'GOVT AIDED': 'AIDED' };
const TYPE_TEXT = { INDEPENDENT: 'an independent (private unaided) school', GOVT: 'a government school', 'GOVT AIDED': 'a government-aided school' };
const csv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const titleAddress = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase()).replace(/\bIii\b/g, 'III').replace(/\bIi\b/g, 'II').replace(/\bIv\b/g, 'IV').replace(/\bPh\b/g, 'Ph');

const rows = SCHOOLS.map(([aff, name, code, locality, gender, websiteOverride, coords]) => {
  const d = details[aff];
  if (!d) throw new Error('missing SARAS record ' + aff);
  const type = d['School Type'];
  if (!TYPE[type]) throw new Error('unknown type ' + type);
  const level = d['Status of The School'].toLowerCase();
  let website = websiteOverride !== null ? websiteOverride : (d['Website'] || '');
  if (website && !/^https?:\/\//.test(website)) website = 'http://' + website;
  if (/edudel\.nic\.in/.test(website)) website = ''; // department portal, not the school's own site
  const source = `https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${aff}`;
  const description = `Affiliated to CBSE (affiliation no. ${aff}, school code ${code}); CBSE lists it as ${TYPE_TEXT[type]} at ${level}. `
    + `Registered name: ${d['Name of Institution']}.`;
  return [
    name, TYPE[type], 'CBSE', '', '', gender || '', website, '', '', '',
    titleAddress(d['Postal Address']), locality, d['Pin Code'],
    coords ? coords[0] : '', coords ? coords[1] : '', '', d['Year of Foundation'] || '', '', '', '',
    description, source, '2026-10-24', '', '',
  ].map(csv).join(',');
});
process.stdout.write(rows.join('\n') + '\n');
