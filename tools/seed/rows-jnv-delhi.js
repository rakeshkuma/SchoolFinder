// Seed CSV rows for Delhi's two functional Jawahar Navodaya Vidyalayas.
// Sources: CBSE SARAS affiliation records (2740001, 2740002) and the NVS JNVST-2027 prospectus.
const PROSPECTUS = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf';
const csv = (v) => {
  const s = v === null || v === undefined ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const CLASSES = 'VI;VII;VIII;IX;X;XI;XII';
// <= 100 characters (column limit); full wording is in the description
const MEDIUM = 'Regional language/mother tongue to Class VIII; then English (Maths, Science), Hindi (Soc. Sc.)';
const FACILITIES = 'HOSTEL:Separate hostels for boys and girls;SPORTS:Sports and games;EXTRACURRICULAR:NCC, Scouts & Guides and NSS';
const common = (aff, code, catchment) => `A Jawahar Navodaya Vidyalaya run by Navodaya Vidyalaya Samiti (Ministry of Education). `
  + `NVS describes JNVs as fully free, co-educational residential schools for talented children, mainly from rural areas, for Classes VI to XII; `
  + `education, board and lodging, uniform and textbooks are free, with a Vidyalaya Vikas Nidhi of Rs. 600 per month collected only in Classes IX–XII (exemptions apply). `
  + `Admission to Class VI is through the JNV Selection Test (JNVST). ${catchment} `
  + `Affiliated to CBSE (affiliation no. ${aff}, school code ${code}). Source for scheme facts: ${PROSPECTUS}`;

const rows = [
  ['Jawahar Navodaya Vidyalaya North West Delhi (Mungeshpur)', 'GOVERNMENT', 'CBSE', CLASSES, MEDIUM, 'CO_ED',
    'https://navodaya.gov.in/nvs-school/dl/mungeshpur', 'https://cbseitms.rcil.gov.in/nvs/', '', '',
    'Mungeshpur P.O. Bawana, Delhi', 'Mungeshpur, Bawana', '110039', '', '', '', '1988', '', 'yes', '',
    common(2740001, 89007, 'Per the JNVST-2027 prospectus (Annexure-I, tentative) it caters to North West and Outer North Delhi (Kirari, Rohini, Nangloi Jat, Bawana, Mundka, Narela).'),
    'https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/2740001', '2026-10-24', FACILITIES, PROSPECTUS],
  ['Jawahar Navodaya Vidyalaya South West Delhi (Jaffarpur Kalan)', 'GOVERNMENT', 'CBSE', CLASSES, MEDIUM, 'CO_ED',
    'https://navodaya.gov.in/nvs-school/dl/jaffarpurkalan', 'https://cbseitms.rcil.gov.in/nvs/', '', '',
    'Najafgarh–Dhansa Road, Jaffarpur Kalan, New Delhi', 'Jaffarpur Kalan', '110073', '28.5944936', '76.9065084', '', '1991', '', 'yes', '',
    common(2740002, 29030, 'Per the JNVST-2027 prospectus (Annexure-I, tentative) it caters to South West, South and West Delhi (Dwarka, Bijwasan, Najafgarh, Matiala, Chhatarpur, Mehrauli, Deoli, Malviya Nagar, Janakpuri, Vikaspuri, Rajouri Garden).'),
    'https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/2740002', '2026-10-24', FACILITIES, PROSPECTUS],
];
process.stdout.write(rows.map((r) => r.map(csv).join(',')).join('\n') + '\n');
