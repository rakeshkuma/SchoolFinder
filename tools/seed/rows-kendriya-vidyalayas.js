// Builds seed CSV rows for Delhi Kendriya Vidyalayas from CBSE SARAS records (retrieved 2026-10-24).
const fs = require('fs');
const details = Object.fromEntries(JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).map((d) => [d.aff, d]));

// aff: [display name (place), locality, CBSE school code]
const KV = {
  2700002: ['R. K. Puram Sector 2', 'R K Puram', 29013], 2700003: ['R. K. Puram Sector 8', 'R K Puram', 29011],
  2700004: ['R. K. Puram Sector 4', 'R K Puram', 29012], 2700005: ['INA Colony', 'INA Colony', 29015],
  2700006: ['No. 1 Delhi Cantt', 'Delhi Cantt', 29010], 2700007: ['Janakpuri', 'Janakpuri', 89014],
  2700008: ['Tagore Garden', 'Tagore Garden', 89015], 2700009: ['Gole Market', 'Gole Market', 89001],
  2700011: ['Jharoda Kalan', 'Jharoda Kalan', 29031], 2700012: ['Keshavpuram', 'Keshav Puram', 89005],
  2700013: ['No. 2 Delhi Cantt', 'Delhi Cantt', 29008], 2700014: ['Masjid Moth', 'Sadiq Nagar', 29024],
  2700015: ['NTPC Badarpur', 'Badarpur', 29023], 2700016: ['AGCR Colony', 'Karkardooma', 29017],
  2700017: ['Shalimar Bagh', 'Shalimar Bagh', 89004], 2700018: ['AFS Tughlakabad', 'Tughlakabad', 29025],
  2700019: ['JNU Campus', 'New Mehrauli Road', 29021], 2700020: ['AFS Arjangarh', 'Arjangarh', 29019],
  2700021: ['Sainik Vihar', 'Sainik Vihar', 89013], 2700022: ['Pragati Vihar', 'Lodhi Road', 29016],
  2700023: ['Pushp Vihar', 'Pushp Vihar', 29020], 2700024: ['No. 3 Delhi Cantt', 'Delhi Cantt', 29006],
  2700025: ['NFC Vigyan Vihar', 'Vigyan Vihar', 29002], 2700026: ['Pitampura', 'Pitampura', 89006],
  2700027: ['AFS Bawana', 'Ghoga Bawana', 89002], 2700028: ['AFS Rajokri', 'Rajokri', 29018],
  2700029: ['Vikaspuri', 'Vikaspuri', 89018], 2700030: ['BSF Chhawla', 'Chhawla', 29026],
  2700031: ['No. 4 Delhi Cantt', 'Delhi Cantt', 29007], 2700032: ['AAI Rangpuri', 'Rangpuri', 29009],
  2700033: ['Paschim Vihar', 'Paschim Vihar', 89016], 2700034: ['Rohini Sector 8', 'Rohini', 89008],
  2700035: ['Rohini Sector 3', 'Rohini', 89009], 2700036: ['Dwarka Sector 5', 'Dwarka', 29027],
  2700037: ['Rohini Sector 25', 'Rohini', 89011], 2700038: ['Rohini Sector 22', 'Rohini', 89010],
  2700039: ['Vasant Kunj', 'Vasant Kunj', 29014], 2700040: ['Narela', 'Narela', 89003],
  2700041: ['Dwarka Sector 12', 'Dwarka', 29028], 2700042: ['Shakurbasti', 'Paschim Vihar', 89017],
  2700043: ['Khichripur', 'Khichripur', 29001], 2700044: ['SPG Dwarka', 'Dwarka', 29029],
  2700045: ['Rohini Sector 28', 'Rohini', 89012], 2700046: [null, 'President Estate', 27110],
  2700150: ['Shahdara', 'Naveen Shahdara', 29100],
};

const csv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const title = (s) => s.toLowerCase().replace(/\b([a-z])/g, (m) => m.toUpperCase());

const rows = Object.entries(KV).map(([aff, [place, locality, code]]) => {
  const d = details[aff];
  if (!d) throw new Error('missing ' + aff);
  const official = d['Name of Institution'];
  const pmShri = /PM SHRI/.test(official);
  const name = place === null ? 'Dr. Rajendra Prasad Kendriya Vidyalaya, President Estate'
    : `${pmShri ? 'PM SHRI ' : ''}Kendriya Vidyalaya ${place}`;
  let website = (d['Website'] || '').trim();
  if (website.includes('@')) website = '';
  if (website && !/^https?:\/\//.test(website)) website = 'https://' + website;
  const level = d['Status of The School'].toLowerCase();
  const description = `A Kendriya Vidyalaya run by Kendriya Vidyalaya Sangathan (Ministry of Education). Affiliated to CBSE `
    + `(affiliation no. ${aff}, school code ${code}) at ${level}. Registered name: ${official}.`;
  return [
    name, 'GOVERNMENT', 'CBSE', '', '', '', website, '', '', '',
    title(d['Postal Address']), locality, d['Pin Code'], '', '', '', d['Year of Foundation'] || '', '', '', '',
    description, `https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${aff}`, '2026-10-24', '', '',
  ].map(csv).join(',');
});
process.stdout.write(rows.join('\n') + '\n');
