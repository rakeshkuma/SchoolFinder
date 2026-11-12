// Builds an admissions file for the Sainik Schools and approved New Sainik Schools on the site from the official
// AISSEE-2027 notice and Information Bulletin. Admission to Class VI and Class IX in all of them is through one national
// entrance test, so the cycle is the same apart from the seats, which differ by school.
//
// Usage: node build-aissee-admissions.js <out.json>
//
// Sources (read 2026-11-12):
//   NTA public notice of 03.11.2026 "Inviting Online Application for AISSEE-2027"
//     https://nta.ac.in/Download/Notice/Notice_20261103151121.PDF
//   AISSEE-2027 Information Bulletin (NTA), as linked from Sainik School Amaravathinagar's AISSEE page
//     https://cdnbbsr.s3waas.gov.in/s388a839f2f6f1427879fc33ee4acf4f66/uploads/2026/11/202611031403322790.pdf
// Quoted from the bulletin: online applications "03rd November 2026 to 02nd December 2026 (Upto 11.50 PM)"; late
// submission "with Late Fee Rs. 500/-" from "03rd December 2026 to 06th December 2026"; Class VI "Should be born between
// 01.04.2015 and 31.03.2017 (Both days inclusive)"; Class IX "Should be born between 01.04.2012 and 31.03.2014";
// fee 850/- (General, wards of defence personnel and ex-servicemen, OBC-NCL) and 700/- (SC/ST); qualifying "Min. 25%
// marks in each section and 40% marks in aggregate" (not applied to SC/ST for Sainik Schools); e-counselling at
// sainikschoolssociety.bisag-n.gov.in after the result. Seats are the bulletin's tentative vacancies (Appendices VI-A,
// VI-A1, VI-B and VI-B1). Schools with no Class IX vacancies in the bulletin get no Class IX cycle.
//
// Matching: only schools whose site profile was checked against the bulletin by name, state and district, PIN or
// official website are listed. Veritas Sainik School on the site is the Hyderabad campus, while the bulletin lists
// Tirupati, so it is not included; J & K Sainik School and the state-run UP Sainik Schools are not in the bulletin.
const fs = require('fs');

const [outPath] = process.argv.slice(2);
if (!outPath) {
  console.error('usage: node build-aissee-admissions.js <out.json>');
  process.exit(2);
}
const NOTICE = 'https://nta.ac.in/Download/Notice/Notice_20261103151121.PDF';
const BULLETIN = 'https://cdnbbsr.s3waas.gov.in/s388a839f2f6f1427879fc33ee4acf4f66/uploads/2026/11/202611031403322790.pdf';
const PORTAL = 'https://exams.nta.nic.in/sainik-school-society/';
const ECOUNSELLING = 'https://sainikschoolssociety.bisag-n.gov.in/sainikschoolecounselling/';

// slug: [bulletin name, Class VI seats, Class IX seats]
const SAINIK = {
  'sainik-school-ambikapur': ['Sainik School Ambikapur', 100, 18],
  'sainik-school-amethi': ['Sainik School Amethi', 90, 20],
  'sainik-school-7': ['Sainik School Balachadi', 120, 27],
  'sainik-school-9': ['Sainik School Bhubaneswar', 90, 0],
  'sainik-school-chhingchhip': ['Sainik School Chhingchhip', 120, 90],
  'sainik-school-east-siang': ['Sainik School East Siang', 85, 7],
  'sainik-school-ghorakhal': ['Sainik School Ghorakhal', 80, 40],
  'sainik-school-4': ['Sainik School Goalpara', 120, 49],
  'sainik-school-gopal-ganj-hathwa-gopal-ganj': ['Sainik School Gopalganj', 110, 0],
  'sainik-school-2': ['Sainik School Imphal', 70, 5],
  'sainik-school-jhansi': ['Sainik School Jhansi', 50, 12],
  'sainik-school-kunjpura': ['Sainik School Kunjpura', 120, 30],
  'sainik-school-mainpuri': ['Sainik School Mainpuri', 90, 12],
  'sainik-school-3': ['Sainik School Nagrota', 75, 10],
  'sainik-school-pawapuri': ['Sainik School Nalanda', 85, 48],
  'sainik-school': ['Sainik School Punglwa', 120, 53],
  'sainik-school-5': ['Sainik School Purulia', 120, 20],
  'sainik-school-rewari': ['Sainik School Rewari', 100, 45],
  'sainik-school-sambalpur': ['Sainik School Sambalpur', 80, 12],
  'sainik-school-6': ['Sainik School Sujanpur Tira', 59, 6],
  'sainik-school-8': ['Sainik School Tilaiya', 140, 25],
};
const NEW_SAINIK = {
  'keshav-saraswati-vidya-mandir': ['Keshav Saraswati Vidya Mandir, Patna', 200, 30],
  'ganpat-rai-salarpuria-saraswati': ['Ganpat Rai Salarpuria Saraswati Vidya Mandir, Bhagalpur', 100, 88],
  'the-great-india-school': ['The Great India School, Raipur', 120, 60],
  'aadharshila-vidya-mandir': ['Aadharshila Vidya Mandir, Bilaspur', 200, 120],
  'allons-public-school': ['Allons Public School, Bemetara', 115, 75],
  'shri-brahmanand-vidya-mandir-sainik-school-chaparda': ['Shri Brahmanand Vidya Mandir, Junagadh', 300, 177],
  'shri-motibhai-r-chaudhary-sagar-sainik-school': ['Shri Motibhai R Chaudhari Sagar Sainik School, Mehsana', 120, 62],
  'prarthana-global-school': ['Prarthana Global School, Arvalli', 420, 0],
  'shree-g-k-bharad-vidhyamandir': ['Shree G K Bharad Vidhya Mandir, Rajkot', 100, 0],
  'raj-luxmi-samvid-gurukulam-sainik-school': ['Raj Luxmi Samvid Gurukulam, Solan', 120, 45],
  'woods-park-sainik-school-hamirpur-at-bani': ['Woods Park School, Hamirpur', 225, 110],
  'saraswati-vidhya-mandir-higher-secondary-school': ['Saraswati Vidhya Mandir Higher Secondary School, Mandsaur', 100, 40],
  'saraswati-shishu-vidya-mandir-sr-sec-school': ['Saraswati Shishu Vidya Mandir Sr Sec School, Neemuch', 100, 0],
  'centurion-public-school-bolangir': ['Centurion Public School, Balangir', 80, 0],
  'shri-bhawani-niketan-public-school': ['Shri Bhawani Niketan Public School, Jaipur', 120, 53],
  'bhartiya-public-school': ['Bhartiya Public School, Sikar', 450, 300],
  'samvid-gurukulam-girls-sainik-school': ['Samvid Gurukulam Senior Secondary School, Mathura', 120, 36],
  'surya-sainik-school': ['Surya Sainik School, Lucknow', 80, 0],
  'access-international-school': ['Access International School, Prayagraj', 120, 0],
};

const AGE = {
  VI: 'Aged 10 to 12 on 31.03.2027: born between 01.04.2015 and 31.03.2017 (both dates inclusive).',
  IX: 'Aged 13 to 15 on 31.03.2027: born between 01.04.2012 and 31.03.2014 (both dates inclusive).',
};
const STUDYING = { VI: 'Class V', IX: 'Class VIII' };

function cycle(classCode, name, seats, isNew) {
  const route = isNew
    ? `${name} is an approved New Sainik School. 40% of its seats are filled from the all-India AISSEE-2027 merit list and `
      + '60% from its own students who qualify in AISSEE-2027. Boys/girls admission, fees, board and hostel follow the '
      + "school's own policy; check its website before applying."
    : 'The merit list is prepared school-wise and category-wise (home state and other states), separately for boys and '
      + 'girls.';
  const qualify = isNew
    ? 'Minimum 25% marks in each section and 40% in aggregate, for all candidates.'
    : 'Minimum 25% marks in each section and 40% in aggregate (not applied to SC/ST candidates).';
  return {
    classCode,
    academicYear: '2027-28',
    category: 'GENERAL',
    applicationStartDate: '2026-11-03',
    applicationEndDate: '2026-12-02',
    statusOverride: null,
    statusOverrideReason: null,
    ageEligibility: AGE[classCode],
    selectionCriteria: `Admission to Class ${classCode} is through the All India Sainik Schools Entrance Examination `
      + '(AISSEE-2027), conducted by NTA on 31 January 2027 (pen and paper, OMR). Exam city slip from 11.01.2027 and '
      + `admit card from 25.01.2027. ${route} ${qualify} Admission is by e-counselling on the AISSEE-2027 merit list, `
      + `subject to medical fitness and document verification. Tentative Class ${classCode} vacancies in the bulletin: `
      + `${seats}.`,
    officialNotificationUrl: NOTICE,
    applicationUrl: PORTAL,
    requirements: [
      { type: 'ELIGIBILITY', description: AGE[classCode], mandatory: true, points: null },
      { type: 'ELIGIBILITY', description: `Studying in / passed ${STUDYING[classCode]} as on 31.03.2027.`, mandatory: true, points: null },
      { type: 'SELECTION_CRITERION', description: 'Qualify in AISSEE-2027 (31 January 2027) and register for e-counselling after the result.', mandatory: true, points: null },
      { type: 'DOCUMENT', description: 'Date of birth certificate issued by the competent authority.', mandatory: true, points: null },
      { type: 'DOCUMENT', description: 'Category certificate (SC/ST/OBC-NCL) or serving/ex-servicemen certificate, if claiming that category.', mandatory: false, points: null },
    ],
    sourceUrl: BULLETIN,
    notes: 'From the NTA notice of 03.11.2026 and the AISSEE-2027 Information Bulletin (read 12 November 2026). Apply online '
      + 'by 02.12.2026 (11:50 PM); late applications with a Rs. 500 late fee from 03.12.2026 to 06.12.2026. Application '
      + 'fee Rs. 850 (General, defence wards, OBC-NCL) or Rs. 700 (SC/ST). Seats are tentative. After the result, '
      + `register for e-counselling at ${ECOUNSELLING}.`,
  };
}

const schools = [];
for (const [map, isNew] of [[SAINIK, false], [NEW_SAINIK, true]]) {
  for (const [slug, [name, vi, ix]] of Object.entries(map)) {
    const admissions = [cycle('VI', name, vi, isNew)];
    if (ix > 0) admissions.push(cycle('IX', name, ix, isNew));
    schools.push({ slug, admissions });
  }
}
fs.writeFileSync(outPath, JSON.stringify({
  _comment: 'Generated by build-aissee-admissions.js from the NTA AISSEE-2027 notice (03.11.2026) and Information Bulletin '
    + '(see that file for the quoted source and how schools were matched). Entries are AdmissionRequest bodies for POST '
    + '/api/v1/admin/schools/{id}/admissions, keyed by slug; loading them again updates the same cycle. Load with '
    + 'LocalAdmissionsImport or import-to-server.js.',
  schools,
}, null, 1));
console.log(`wrote ${schools.length} schools, ${schools.reduce((n, s) => n + s.admissions.length, 0)} cycles`);
