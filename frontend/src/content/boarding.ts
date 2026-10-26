/**
 * Featured government residential (boarding) schools. This is a curated list, not a ranking.
 * Every fact is taken from the page in `sources` (read 24 Oct 2026); photos are freely licensed Wikimedia Commons files.
 * Delhi's two JNVs are full school records in the directory (`directorySlug`).
 */
export interface BoardingPhoto {
  url: string;
  caption: string;
  credit: string;
  license: string;
  sourceUrl: string;
}

export interface BoardingSchool {
  slug: string;
  name: string;
  kind: 'Jawahar Navodaya Vidyalaya' | 'Sainik School' | 'Military college' | 'Military school' | 'State residential school';
  location: { place: string; state: string; lat: number | null; lon: number | null };
  directorySlug?: string;
  examSlug: string;
  established: string | null;
  managedBy: string;
  board: string;
  students: string;
  classes: string;
  highlights: string[];
  admission: string[];
  fees: { label: string; amount: string }[];
  feeNote: string;
  facilities: string[];
  contact: { address: string; phone: string | null; email: string | null; website: string };
  photos: BoardingPhoto[];
  sources: string[];
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;

export const BOARDING_SCHOOLS: BoardingSchool[] = [
  {
    slug: 'jnv-mungeshpur',
    name: 'Jawahar Navodaya Vidyalaya North West Delhi (Mungeshpur)',
    kind: 'Jawahar Navodaya Vidyalaya',
    location: { place: 'Mungeshpur, Bawana, Delhi 110039', state: 'Delhi', lat: null, lon: null },
    directorySlug: 'jawahar-navodaya-vidyalaya-north-west-delhi-mungeshpur',
    examSlug: 'jnvst',
    established: '1988 (CBSE record)',
    managedBy: 'Navodaya Vidyalaya Samiti, Ministry of Education',
    board: 'CBSE (affiliation no. 2740001)',
    students: 'Co-educational; separate hostels for boys and girls',
    classes: 'VI–XII',
    highlights: ['Fully free education, board and lodging, uniform and textbooks', 'Caters (tentatively) to North West and Outer North Delhi', 'Migration scheme: a year in a JNV of another language region in Class IX'],
    admission: ['Class VI through JNVST — district-specific; apply for the district where the child lives and studies Class V', 'JNVST-2027: last date 31 July 2026; test 28 November 2026'],
    fees: [{ label: 'Classes VI–VIII', amount: 'Free' }, { label: 'Classes IX–XII (Vidyalaya Vikas Nidhi)', amount: '₹600 / month' }],
    feeNote: 'SC/ST, Divyang, all girls and BPL students are exempt from VVN; non-exempt wards of Government employees pay ₹1,500/month or actual CEA, whichever is less.',
    facilities: ['Residential campus with separate boys’ and girls’ hostels', 'Sports and games', 'NCC, Scouts & Guides, NSS', 'Cultural exchange through the migration scheme'],
    contact: { address: 'Mungeshpur P.O. Bawana, Delhi 110039', phone: null, email: null, website: 'https://navodaya.gov.in/nvs-school/dl/mungeshpur' },
    photos: [],
    sources: ['https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf', 'https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/2740001'],
  },
  {
    slug: 'jnv-jaffarpur-kalan',
    name: 'Jawahar Navodaya Vidyalaya South West Delhi (Jaffarpur Kalan)',
    kind: 'Jawahar Navodaya Vidyalaya',
    location: { place: 'Jaffarpur Kalan, New Delhi 110073', state: 'Delhi', lat: 28.5944936, lon: 76.9065084 },
    directorySlug: 'jawahar-navodaya-vidyalaya-south-west-delhi-jaffarpur-kalan',
    examSlug: 'jnvst',
    established: '1991 (CBSE record)',
    managedBy: 'Navodaya Vidyalaya Samiti, Ministry of Education',
    board: 'CBSE (affiliation no. 2740002)',
    students: 'Co-educational; separate hostels for boys and girls',
    classes: 'VI–XII',
    highlights: ['Fully free education, board and lodging, uniform and textbooks', 'Caters (tentatively) to South West, South and West Delhi', 'NVS’s East Delhi JNV page currently shows a Jaffarpur Kalan (110073) office address'],
    admission: ['Class VI through JNVST — district-specific', 'JNVST-2027: last date 31 July 2026; test 28 November 2026'],
    fees: [{ label: 'Classes VI–VIII', amount: 'Free' }, { label: 'Classes IX–XII (Vidyalaya Vikas Nidhi)', amount: '₹600 / month' }],
    feeNote: 'SC/ST, Divyang, all girls and BPL students are exempt from VVN.',
    facilities: ['Residential campus with separate boys’ and girls’ hostels', 'Sports and games', 'NCC, Scouts & Guides, NSS'],
    contact: { address: 'Najafgarh–Dhansa Road, Jaffarpur Kalan, New Delhi 110073', phone: null, email: null, website: 'https://navodaya.gov.in/nvs-school/dl/jaffarpurkalan' },
    photos: [],
    sources: ['https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf', 'https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/2740002'],
  },
  {
    slug: 'netarhat',
    name: 'Netarhat Awasiya Vidyalaya',
    kind: 'State residential school',
    location: { place: 'Netarhat, Latehar, Jharkhand 835218', state: 'Jharkhand', lat: 23.4723103, lon: 84.2623866 },
    examSlug: 'netarhat',
    established: '1954',
    managedBy: 'Netarhat Vidyalaya Samiti, Department of School Education & Literacy, Govt. of Jharkhand',
    board: 'CBSE (+2 school, affiliation no. 3420006)',
    students: 'Boys only — 100 seats in Class 6 each year',
    classes: '6 onwards (residential)',
    highlights: ['Free, quality residential education for meritorious boys of Jharkhand', 'Gurukul tradition combined with modern schooling', 'Two-level written entrance exam, then physical & psychological test'],
    admission: ['Class 6 entrance (2026-27): apply free online at the school website', 'Last date (revised) 08 October 2026; exam 06 December 2026 at every divisional headquarters'],
    fees: [{ label: 'Application', amount: 'Free' }, { label: 'School fee', amount: 'Subsidised by income group (A–E)' }],
    feeNote: 'The State Government meets the school’s expenditure; guardians pay a subsidised amount fixed for their income group.',
    facilities: ['Residential ashrams (houses)', 'Library', 'Tinkering and STEM labs', 'Student Police Cadets programme', 'Career counselling'],
    contact: { address: 'Netarhat Vidyalaya, Netarhat, Latehar 835218, Jharkhand', phone: '+91 6201750198, 6201750193', email: null, website: 'https://www.netarhatvidyalaya.com/' },
    photos: [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/2/25/Netarhat_School.jpg', caption: 'Main building', credit: 'Vikash.iitb / Wikimedia Commons', license: 'Public domain', sourceUrl: commons('Netarhat_School.jpg') },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/d/dd/Netarhat_Awasiya_Vidyalaya.jpg', caption: 'Main gate', credit: 'Noukayami / Wikimedia Commons', license: 'CC BY-SA 4.0', sourceUrl: commons('Netarhat_Awasiya_Vidyalaya.jpg') },
    ],
    sources: ['https://www.netarhatvidyalaya.com/', 'https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/140826_advt_net_2627_ntrht.pdf', 'https://www.netarhatvidyalaya.com/fee_strctr.php'],
  },
  {
    slug: 'rimc',
    name: 'Rashtriya Indian Military College (RIMC)',
    kind: 'Military college',
    location: { place: 'Garhi Cantt, Dehradun, Uttarakhand 248003', state: 'Uttarakhand', lat: 30.3475195, lon: 78.0242946 },
    examSlug: 'rimc',
    established: null,
    managedBy: 'Inter-Service establishment under ARTRAC, Ministry of Defence',
    board: 'As per RIMC',
    students: 'Boys and girls — about 25 boys and 10 girls admitted each term',
    classes: 'Admission to Class VIII only (January and July terms)',
    highlights: ['Prepares cadets for the Defence Forces', 'State-wise vacancies — generally one per state (Delhi: 1)', 'Alumni include four Chiefs of Army Staff and two Chiefs of the Air Staff (per RIMC)'],
    admission: ['Online application through NTA from the December 2026 cycle (for July 2027 term)', 'Age 12½–14 years; studying or passed Class VII', 'Written exam, viva-voce and medical examination'],
    fees: [
      { label: 'Annual fee — boarder cadet (General)', amount: '₹1,48,650' },
      { label: 'Annual fee — boarder cadet (SC/ST)', amount: '₹1,31,850' },
      { label: 'Security (one-time, refundable)', amount: '₹50,000' },
    ],
    feeNote: 'Fee structure w.e.f. January 2024 term as published by RIMC, including tuition (₹22,400 General / ₹5,600 SC/ST), books, sports, hostel maintenance and cadets’ private expenditure.',
    facilities: ['Library', 'Computer centre', 'Swimming pool', 'Squash court', 'Horse riding', 'NDA preparation cell'],
    contact: { address: 'Garhi Cantt, Dehradun, Uttarakhand 248003', phone: '0135-2753983 (Prospectus Cell)', email: 'rimcentexam@gmail.com (question-paper booklet)', website: 'https://rimc.edu.in/' },
    photos: [
      { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/22/The_Chief_of_the_Air_Staff%2C_Air_Chief_Marshal_Arup_Raha_with_the_cadets_of_Rashtriya_Indian_Military_College_%28RIMC%29%2C_in_Dehradun_on_October_20%2C_2015._The_Air_Chief_Marshal_%28Retired%29_N.C._Suri_is_also_seen.jpg/1280px-thumbnail.jpg', caption: 'Cadets of RIMC with the Chief of the Air Staff (2015)', credit: 'Ministry of Defence / Wikimedia Commons', license: 'GODL-India', sourceUrl: commons('The_Chief_of_the_Air_Staff,_Air_Chief_Marshal_Arup_Raha_with_the_cadets_of_Rashtriya_Indian_Military_College_(RIMC),_in_Dehradun_on_October_20,_2015._The_Air_Chief_Marshal_(Retired)_N.C._Suri_is_also_seen.jpg') },
    ],
    sources: ['https://rimc.edu.in/admission.aspx', 'https://rimc.edu.in/fees.aspx', 'https://rimc.edu.in/contactus.aspx'],
  },
  {
    slug: 'sainik-school-kunjpura',
    name: 'Sainik School Kunjpura',
    kind: 'Sainik School',
    location: { place: 'Kunjpura, Karnal, Haryana 132023', state: 'Haryana', lat: 29.7279414, lon: 77.0577302 },
    examSlug: 'aissee',
    established: null,
    managedBy: 'Sainik Schools Society, Ministry of Defence',
    board: 'CBSE, English medium',
    students: 'Cadets admitted through AISSEE',
    classes: 'VI and IX entry',
    highlights: ['Prepares cadets for NDA and other officer academies', 'Swimming and horse riding (indemnity bond required)', 'Hosted the 48th All India Sainik School Principals’ Conference (2018)'],
    admission: ['Class VI and IX through AISSEE (NTA) and e-counselling'],
    fees: [
      { label: 'Tuition fee (2026-27)', amount: '₹1,28,660' },
      { label: 'Diet charges', amount: '₹59,000' },
      { label: 'Incidental charges', amount: '₹5,000' },
      { label: 'Total (existing cadet)', amount: '₹1,92,660' },
      { label: 'Refundable security (new entrants)', amount: '₹3,000 Gen/Def · ₹1,500 SC/ST' },
      { label: 'Total for new entrants (Gen/Def)', amount: '₹1,95,660' },
    ],
    feeNote: 'Up to ₹22,125 of diet charges and ₹2,000 clothing are reimbursed by the Govt. of Haryana to eligible awardees, as stated on the fee sheet.',
    facilities: ['Residential campus', 'Swimming pool', 'Horse riding', 'NDA classes', 'Scholarship schemes'],
    contact: { address: 'Sainik School Kunjpura, Karnal, Haryana 132023', phone: '+91 9306057684 (9 a.m.–5 p.m.)', email: 'sskunjpura@sainikschoolsociety.in', website: 'https://sskunjpura.org/' },
    photos: [
      { url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1b/The_Minister_of_State_for_Defence%2C_Dr._Subhash_Ramrao_Bhamre_paying_homage_at_War_Memorial%2C_at_the_inauguration_of_the_48th_All_India_Sainik_School_%28AISS%29_Principals%E2%80%99_Conference%2C_at_Sainik_School_Kunjpura%2C_Haryana.JPG/1280px-thumbnail.jpg', caption: 'War Memorial, Sainik School Kunjpura (2018)', credit: 'Ministry of Defence / Wikimedia Commons', license: 'GODL-India', sourceUrl: commons('The_Minister_of_State_for_Defence,_Dr._Subhash_Ramrao_Bhamre_paying_homage_at_War_Memorial,_at_the_inauguration_of_the_48th_All_India_Sainik_School_(AISS)_Principals%E2%80%99_Conference,_at_Sainik_School_Kunjpura,_Haryana.JPG') },
    ],
    sources: ['https://sskunjpura.org/', 'https://sskunjpura.org/admin/logged/images/academicupdate/1679091c5a880faf6fb5e6087eb1b2dcFee-Structure-2026-27.pdf'],
  },
  {
    slug: 'sainik-school-rewari',
    name: 'Sainik School Rewari',
    kind: 'Sainik School',
    location: { place: 'Garhi Bolni Road, Rewari, Haryana 123401', state: 'Haryana', lat: 28.1831861, lon: 76.6296195 },
    examSlug: 'aissee',
    established: null,
    managedBy: 'Sainik Schools Society, Ministry of Defence',
    board: 'CBSE, English medium',
    students: 'Cadets admitted through AISSEE',
    classes: 'VI and IX entry',
    highlights: ['Prepares cadets for NDA and other officer academies', 'In Haryana, south-west of Delhi (Rewari district)'],
    admission: ['Class VI and IX through AISSEE (NTA) and e-counselling'],
    fees: [
      { label: 'Tuition fee (2026-27)', amount: '₹1,28,615' },
      { label: 'Diet charges', amount: '₹55,165' },
      { label: 'Incidental charges', amount: '₹9,390' },
      { label: 'Clothing (new / existing)', amount: '₹28,525 / ₹10,000' },
      { label: 'Pocket money', amount: '₹3,000' },
      { label: 'Total (existing cadet)', amount: '₹2,06,170' },
      { label: 'Total for new entrants (Gen/OBC/Def · SC/ST)', amount: '₹2,27,695 · ₹2,26,195' },
    ],
    feeNote: 'Includes a refundable security deposit of ₹3,000 (Gen/OBC/Def) or ₹1,500 (SC/ST) for new entrants. Actual expenditure on services is borne by parents.',
    facilities: ['Residential campus', 'Online fee payment (SBI/PNB)', 'Scholarships'],
    contact: { address: 'Garhi Bolni Road, Rewari, Haryana 123401', phone: '01281-298751', email: 'ssrewari@sainikschoolsociety.in', website: 'https://ssrw.org/' },
    photos: [],
    sources: ['https://ssrw.org/', 'https://ssrw.org/wp-content/uploads/2026/04/Fee-Structure-2026-27.pdf'],
  },
  {
    slug: 'sainik-school-ghorakhal',
    name: 'Sainik School Ghorakhal',
    kind: 'Sainik School',
    location: { place: 'Ghorakhal, Nainital, Uttarakhand 263136', state: 'Uttarakhand', lat: 29.3806148, lon: 79.5426696 },
    examSlug: 'aissee',
    established: '21 March 1966',
    managedBy: 'Sainik Schools Society, Ministry of Defence',
    board: 'CBSE, English medium',
    students: 'Cadets admitted through AISSEE',
    classes: 'VI and IX entry',
    highlights: ['Set on the former estate of the Nawab of Rampur near Nainital', 'Celebrating sixty years (2026)', 'Overlooks Bhimtal lake'],
    admission: ['Class VI and IX through AISSEE (NTA) and e-counselling'],
    fees: [{ label: 'Fee structure', amount: 'See the school’s published PDF' }],
    feeNote: 'The school publishes its fee structure (tuition, incidental charges and refundable security) as a PDF on its website.',
    facilities: ['Laboratories', 'Library', 'Hostel and mess'],
    contact: { address: 'Ghorakhal, Distt. Nainital, Uttarakhand', phone: '+91 05942-220051', email: 'ssghorakhal@sainikschoolsociety.in', website: 'https://www.ssghorakhal.org/' },
    photos: [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/4/47/View_of_Bhimtal_Lake_from_Sainik_School_Ghorakhal.jpg', caption: 'View of Bhimtal lake from the school', credit: 'Twbnrftw / Wikimedia Commons', license: 'CC BY-SA 4.0', sourceUrl: commons('View_of_Bhimtal_Lake_from_Sainik_School_Ghorakhal.jpg') },
      { url: 'https://upload.wikimedia.org/wikipedia/commons/b/b7/Ssgk_garden.jpg', caption: 'School garden maintained by students', credit: 'Djay29ssgk / Wikimedia Commons', license: 'CC BY 3.0', sourceUrl: commons('Ssgk_garden.jpg') },
    ],
    sources: ['https://www.ssghorakhal.org/'],
  },
  {
    slug: 'sainik-school-tilaiya',
    name: 'Sainik School Tilaiya',
    kind: 'Sainik School',
    location: { place: 'P.O. Tilaiya Dam, Koderma, Jharkhand 825413', state: 'Jharkhand', lat: null, lon: null },
    examSlug: 'aissee',
    established: null,
    managedBy: 'Sainik Schools Society, Ministry of Defence',
    board: 'CBSE, English medium',
    students: 'Boys and girl cadets',
    classes: 'VI and IX entry',
    highlights: ['Overall champions, All India Sainik Schools National Games 2026 (Group D) — per the school', 'NCC independent company'],
    admission: ['Class VI and IX through AISSEE (NTA) and e-counselling'],
    fees: [{ label: 'Fee structure', amount: 'See the school’s fee page' }],
    feeNote: 'Published on the school’s Fee Structure page.',
    facilities: ['Library', 'NDA training', 'NCC', 'Inter-house sports for boys and girls'],
    contact: { address: 'Sainik School Tilaiya, P.O. Tilaiya Dam, Dist. Koderma, Jharkhand 825413', phone: '06534 235048', email: 'sainikschooltilaiya@gmail.com', website: 'https://www.sainikschooltilaiya.org/' },
    photos: [
      { url: 'https://upload.wikimedia.org/wikipedia/commons/5/50/Sainik_school_tilaiya.jpg', caption: 'Sainik School Tilaiya', credit: 'Wikiditot / Wikimedia Commons', license: 'CC BY-SA 4.0', sourceUrl: commons('Sainik_school_tilaiya.jpg') },
    ],
    sources: ['https://www.sainikschooltilaiya.org/', 'https://www.sainikschooltilaiya.org/fee-structure/'],
  },
  {
    slug: 'rashtriya-military-schools',
    name: 'Rashtriya Military Schools (Chail, Ajmer, Belgaum, Bengaluru, Dholpur)',
    kind: 'Military school',
    location: { place: 'Five campuses — Himachal Pradesh, Rajasthan (2), Karnataka (2)', state: 'Multiple states', lat: null, lon: null },
    examSlug: 'rms-cet',
    established: null,
    managedBy: 'Ministry of Defence',
    board: 'CBSE',
    students: 'All admissions as boarders; check the CET notification for eligibility of girls',
    classes: 'VI and IX entry',
    highlights: ['Five residential military schools under the Ministry of Defence', 'Common Entrance Test held in December'],
    admission: ['Class VI (10–12 years) and IX (13–15 years) as on 31 March, through the CET and interview'],
    fees: [
      { label: 'Entitled category (OR)', amount: '₹12,000 / year' },
      { label: 'Entitled category (JCO)', amount: '₹18,000 / year' },
      { label: 'Non-entitled (Officer)', amount: '₹32,000 / year' },
      { label: 'Non-entitled (Civilian)', amount: '₹51,000 / year' },
    ],
    feeNote: 'Revised structure effective 2020-21 (MoD letter of 17 Dec 2019). SC/ST pay 25% of their category fee; no tuition fee for wards of personnel killed in action.',
    facilities: ['Boarding for all students'],
    contact: { address: 'RMS Ajmer, Rajasthan 305001 (see website for each campus)', phone: '0145-2624105 (Ajmer) · 080-29602555 (Bengaluru) · 0831-2407531 (Belgaum)', email: null, website: 'https://www.rashtriyamilitaryschools.edu.in/' },
    photos: [],
    sources: ['https://www.rashtriyamilitaryschools.edu.in/admission.html', 'https://www.rashtriyamilitaryschools.edu.in/fee-structure.html'],
  },
  {
    slug: 'sainik-schools',
    name: 'All 33 Sainik Schools (and approved New Sainik Schools)',
    kind: 'Sainik School',
    location: { place: 'Across India — in Haryana: Rewari and Kunjpura', state: 'Multiple states', lat: null, lon: null },
    examSlug: 'aissee',
    established: null,
    managedBy: 'Sainik Schools Society, Ministry of Defence',
    board: 'CBSE, English medium',
    students: 'Boys and girls (as per AISSEE seat matrix)',
    classes: 'VI and IX entry',
    highlights: ['English-medium residential schools preparing cadets for NDA, INA Ezhimala and other academies', 'Approved New Sainik Schools run in partnership with NGOs, private and state schools'],
    admission: ['AISSEE (NTA) merit list, e-counselling, medical fitness and document verification'],
    fees: [{ label: 'Fees', amount: 'Differ by school — see each school’s website' }],
    feeNote: 'Fee structure, board and language of New Sainik Schools differ from school to school (AISSEE bulletin).',
    facilities: ['Residential campuses', 'NDA preparation'],
    contact: { address: 'Sainik Schools Society (see AISSEE bulletin Appendix I-A for all school websites)', phone: null, email: null, website: 'https://exams.nta.nic.in/sainik-school-society/' },
    photos: [],
    sources: ['https://cdnbbsr.s3waas.gov.in/s388a839f2f6f1427879fc33ee4acf4f66/uploads/2025/10/20251010937989896.pdf'],
  },
];

export const boardingBySlug = (slug: string) => BOARDING_SCHOOLS.find((s) => s.slug === slug);
