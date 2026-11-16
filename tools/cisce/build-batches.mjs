// Builds the import batches (500 schools each, the admin JSON import's column names) from verified.json.
// Only facts CISCE's locator states are used: name, CISCE code, address, town, PIN, principal, co-ed/boys/girls,
// residential, and the website (checked by verify-websites.mjs). The district comes from the PIN code via schools
// already on the site. School type: the schema requires one and CISCE does not state it; schools whose name says
// "Government" are GOVERNMENT, the rest PRIVATE with management left unknown (as the CISCE schools already listed),
// and any school whose own site says it is aided was not verified, so it is not here. Classes are left unknown.
//
// Usage: node tools/cisce/build-batches.mjs <verified.json> <out dir> [manual-rejections.json]
// Schools in the manual-rejections file (codes found wrong on review) are left out.
import { readFileSync, writeFileSync } from 'node:fs';

const [verifiedFile, outDir, manualFile] = process.argv.slice(2);
const excluded = new Set(manualFile ? JSON.parse(readFileSync(manualFile, 'utf8')).map((m) => m.code) : []);
const verified = JSON.parse(readFileSync(verifiedFile, 'utf8')).filter((v) => !excluded.has(v.code));
const rows = verified.map((v) => {
  const row = {
    name: v.name,
    school_type: /\b(govt\.?|government|rajkiya)\b/i.test(v.name) ? 'GOVERNMENT' : 'PRIVATE',
    board_code: 'CISCE',
    affiliation_number: v.code,
    state_code: v.state,
    district: v.district,
    city: v.city,
    pin_code: v.pin,
    website_url: v.website,
    source_url: `https://locate.cisce.org/?page=${v.page}`,
    source_retrieved_date: '2026-11-16',
  };
  if (v.addressLine) row.address_line = v.addressLine;
  if (v.principal) row.principal_name = v.principal;
  if (v.gender) row.gender_type = v.gender;
  if (v.hostel !== null && v.hostel !== undefined) row.has_hostel = String(v.hostel);
  return row;
});
const size = 500;
const files = [];
for (let i = 0; i < rows.length; i += size) {
  const file = `${outDir}/batch-${String(i / size + 1).padStart(3, '0')}.json`;
  writeFileSync(file, JSON.stringify(rows.slice(i, i + size), null, 1));
  files.push(file);
}
console.log(`${rows.length} schools in ${files.length} batch(es): ${files.join(', ')}`);
