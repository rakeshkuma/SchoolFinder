// Generates backend/src/main/resources/seed/fees-and-admissions.json from facts read on official pages (2026-10-24).
const fs = require('fs');
const out = process.argv[2];

const FEE_KEYS = ['classCode', 'academicYear', 'registrationFee', 'admissionFee', 'monthlyTuition', 'tuitionMonths',
  'monthlyCharges', 'monthlyChargesDescription',
  'annualCharges', 'developmentCharges', 'securityDeposit', 'securityDepositRefundable', 'transportMonthly',
  'transportMonths', 'booksUniformEstimate', 'otherCharges', 'otherChargesDescription', 'sourceUrl', 'notes'];
const ADM_KEYS = ['classCode', 'academicYear', 'category', 'applicationStartDate', 'applicationEndDate', 'statusOverride',
  'statusOverrideReason', 'ageEligibility', 'selectionCriteria', 'officialNotificationUrl', 'applicationUrl',
  'requirements', 'sourceUrl', 'notes'];

function shape(keys, o) {
  const unknown = Object.keys(o).filter(k => !keys.includes(k));
  if (unknown.length) throw new Error('unknown keys ' + unknown);
  const r = {};
  for (const k of keys) r[k] = o[k] === undefined ? null : o[k];
  return r;
}
const fee = o => shape(FEE_KEYS, o);
const adm = o => shape(ADM_KEYS, o);
const doc = (description, mandatory = true) => ({ type: 'DOCUMENT', description, mandatory, points: null });
const elig = description => ({ type: 'ELIGIBILITY', description, mandatory: true, points: null });
const crit = (description, points = null) => ({ type: 'SELECTION_CRITERION', description, mandatory: false, points });

// ---------------------------------------------------------------- DPS R. K. Puram
const DPS9 = 'https://dpsrkp.net/admission-class-9-2027-2028/';
const DPS11 = 'https://dpsrkp.net/admission-class-11-2027-2028-round1/';
const DPSIB = 'https://dpsrkp.net/international-baccalaureate-diploma-programme-ibdp-admission-2026-28/';
const dpsApproxFee = 'The page itemises only the Rs. 25 online registration fee. It states that successful applicants pay Rs. 1,00,000 online on admission out of a total school fee of approx. Rs. 2,75,000 (excluding transport; tentative fee structure, annual), adjusted against the 2027-28 fee, with the balance in later instalments; a detailed fee bill is issued later. Components are not itemised, so they are left null.';
const dpsDocs9 = [
  doc('School enrolment form signed by parents, including PEN and UDISE number from the current school'),
  doc('Self-attested photocopy of the Class 8 half-yearly result marksheet (admission confirmed on the final Class 8 result)'),
  doc('Two passport-size photographs of the student and two each of father and mother'),
  doc('Self-attested residence proof (UID/Aadhaar, Voter ID or Passport); originals for verification'),
  doc('Medical form signed by parents and a registered medical practitioner'),
  doc('Undertaking form signed by parents'),
  doc('Character certificate from the head of the institution last attended, within 15 days of admission'),
  doc('Original Transfer Certificate countersigned by the Inspector of Schools, within 15 days of admission'),
];
const dpsDocs11 = [
  doc('School enrolment form signed by parents, including PEN and UDISE number'),
  doc('Hostel admission form (hostellers only)', false),
  doc('Self-attested photocopy of the Class 10 pre-board marksheet; Class 10 final result marksheet after board results'),
  doc('Two passport-size photographs of the student and two each of father and mother'),
  doc('Self-attested residence proof (Voter ID, Passport or UID/Aadhaar); originals for verification'),
  doc("Day scholar's medical form signed by parents and a registered medical practitioner"),
  doc('Undertaking form signed by parents'),
  doc('Character certificate from the head of the institution last attended'),
  doc('Original Transfer Certificate by the first week of July 2027'),
];
const dps = {
  schoolName: 'Delhi Public School R. K. Puram',
  fees: [
    fee({ classCode: 'IX', academicYear: '2027-28', registrationFee: 25, sourceUrl: DPS9, notes: dpsApproxFee }),
    fee({ classCode: 'XI', academicYear: '2027-28', registrationFee: 25, sourceUrl: DPS11,
      notes: dpsApproxFee + ' Hostellers also pay approx. Rs. 4,82,830 per annum towards hostel fee (including one-time hostel admission charges and a refundable security deposit; not itemised).' }),
    fee({ classCode: 'XI', academicYear: '2026-27', registrationFee: 1000, admissionFee: 100000, sourceUrl: DPSIB,
      notes: 'IB Diploma Programme (DP1) only, not the CBSE stream. The page labels the fee structure "Approximate - Academic Session 2026-27": total annual school fee approx. Rs. 6,50,000 per annum plus a one-time Rs. 1,00,000 admission fee; Rs. 2,50,000 is paid at admission and adjusted against the total fee. Tuition and other components are not itemised. Optional transport per month by distance: up to 8 km Rs. 4,450; 8-15 km Rs. 5,200; 15-22 km Rs. 5,850; above 22 km Rs. 6,700; outside Delhi/NCR Rs. 7,150.' }),
  ],
  admissions: [
    adm({ classCode: 'IX', academicYear: '2027-28', category: 'GENERAL', applicationStartDate: '2026-10-24', applicationEndDate: '2027-01-08',
      ageEligibility: 'Minimum age 13 years; successful completion of Class 8; residents of Delhi-NCR only.',
      selectionCriteria: 'Based on (i) successful completion of Class 8, (ii) merit position in the admission test on Sunday 10 January 2027 (9:00 am-12:00 noon; MCQ, +4/-1 marking: English 80, Mathematics 80, Science 80, Social Science 80, Mental Ability 40; total 360) and (iii) verification of documents of shortlisted candidates.',
      officialNotificationUrl: DPS9,
      requirements: [elig('Successful completion of Class 8'), elig('Resident of Delhi-NCR'), elig('Minimum age 13 years'),
        crit('Merit position in the admission test (total 360 marks)'), ...dpsDocs9],
      sourceUrl: DPS9,
      notes: 'Round 1. Online registration only, via the school website (registration fee Rs. 25). Admission list displayed on the school website on 10 January 2027 after 7:00 pm; admission formalities on 11 January 2027. The page says the online registration link "will start shortly" and that the schedule is subject to change.' }),
    adm({ classCode: 'XI', academicYear: '2027-28', category: 'GENERAL', applicationStartDate: '2026-10-23', applicationEndDate: '2027-01-08',
      ageEligibility: null,
      selectionCriteria: 'Registration requires, on the Class 10 half-yearly results, an aggregate of 75% or above in English, Mathematics, Science, Social Science and Second Language, plus a minimum of 75% in English, Science and Mathematics (Science stream) or English and Mathematics (Commerce); Humanities needs only the aggregate. Provisional admission is by merit in the admission test on Sunday 10 January 2027 (English 100, Mathematics 100, General Science or Social Science 100, Mental Ability 40; total 340). Admission is cancelled if the candidate scores below 80% aggregate in the Class 10 board examination.',
      officialNotificationUrl: DPS11,
      requirements: [elig('Aggregate of 75% or above in five Class 10 half-yearly subjects'),
        elig('Science stream: minimum 75% each in English, Science and Mathematics; Commerce: minimum 75% each in English and Mathematics'),
        elig('Minimum 80% aggregate in the Class 10 board examination to confirm admission'),
        elig('Delhi-NCR residents are considered only as day scholars; outstation candidates only as hostellers'),
        crit('Merit position in the admission test (total 340 marks)'), ...dpsDocs11],
      sourceUrl: DPS11,
      notes: 'Round 1. First list 10 January 2027 after 9:00 pm; document verification 11-12 January 2027; second list (if any) 14 January 2027. Round 2 registration January-February 2027 and Round 2 test in March 2027 (not recorded separately). Registration fee Rs. 25. Schedule subject to change.' }),
    adm({ classCode: 'XI', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2026-07-03', applicationEndDate: '2026-07-25',
      ageEligibility: 'Successful completion of Class 10 (CBSE, Cambridge IGCSE, IB, State Board or any other recognised board).',
      selectionCriteria: 'IB Diploma Programme 2026-28: Class 10 aggregate of 85% or above (or equivalent), written admission test on 27 July 2026 (English, Mathematics and Mental Ability, 80 marks each, total 240, MCQ +4/-1), interview/group discussion of shortlisted candidates on 28 July 2026, and document verification.',
      officialNotificationUrl: DPSIB,
      requirements: [elig('Successful completion of Class 10 from a recognised board'), elig('85% or above (or equivalent) aggregate in Class 10'),
        crit('Admission test (total 240 marks)'), crit('Interview / group discussion of shortlisted candidates')],
      sourceUrl: DPSIB,
      notes: 'IB Diploma Programme (DP1) only, not the CBSE stream. Registration via the "Expression of Interest - IBDP" link on the school website; registration fee Rs. 1,000. The page states both batches have started.' }),
  ],
  notRecorded: [
    'No admission notice for other classes (e.g. Nursery or Class I) is published on https://dpsrkp.net/admission/ (only Class 9 and Class 11).',
    'No itemised fee schedule (tuition, annual, development charges) is published; only approximate totals.',
  ],
};

// ---------------------------------------------------------------- Ahlcon International School
const AHL_FEE = 'https://www.ahlconinternational.com/admissions/fee-structure';
const AHL_ENTRY = 'https://www.ahlconinternational.com/home/pdfs/ENTRY-lEVEL-ADMISSION-2026-27.pdf';
const ahlTransport = 'Transport (w.e.f. 1 April 2026, charged for 11 months): Delhi route Rs. 4,000 (AC bus: April, May, July-October) / Rs. 3,300 (November-March); UP route Rs. 4,300 / Rs. 3,500; UP Expressway route Rs. 5,300 / Rs. 4,500. Meal and transport charges are not charged in June.';
function ahlNotes(stage, annual, dev, meal, total, extra = '') {
  return `Provisional Fee Schedule 2026-27, column "${stage}". The school bills every component monthly: tuition fee (monthlyTuition), annual charges Rs. ${annual}, development charges Rs. ${dev}, ${meal ? `meal charges Rs. ${meal}, ` : ''}smart class Rs. 350 (together in monthlyCharges); listed monthly total Rs. ${total}. There is no separate yearly lump sum, so annualCharges and developmentCharges are 0 here because they are included in monthlyCharges. The number of billed months is not stated (12 assumed by the calculator); meal and transport charges are not charged in June. ${extra}${ahlTransport}`;
}
const ahlMonthly = (a, d, m) => ({ monthlyCharges: a + d + (m || 0) + 350,
  monthlyChargesDescription: `annual charges ${a} + development ${d}${m ? ` + meal ${m}` : ''} + smart class 350`, annualCharges: 0, developmentCharges: 0 });
const ahlRows = [
  ['NURSERY', 'Pre-Sch', 8790, 2995, 635, 2200, 14970, 'Pre-School = Nursery/Balvatika-1. '],
  ['KG', 'Pre-Pri', 7985, 2720, 575, 2200, 13830, 'Pre-Primary is recorded as KG (the 2026-27 entry-level notice lists Pre-School/Balvatika-1, K.G and Class I). '],
  ['I', 'I & II', 6730, 1885, 505, 2200, 11670], ['II', 'I & II', 6730, 1885, 505, 2200, 11670],
  ['III', 'III To V', 6730, 1885, 505, null, 9470], ['IV', 'III To V', 6730, 1885, 505, null, 9470], ['V', 'III To V', 6730, 1885, 505, null, 9470],
  ['VI', 'VI- To VIII', 6730, 1885, 505, null, 9470], ['VII', 'VI- To VIII', 6730, 1885, 505, null, 9470], ['VIII', 'VI- To VIII', 6730, 1885, 505, null, 9470],
  ['IX', 'IX-X', 6730, 1885, 505, null, 9470], ['X', 'IX-X', 6730, 1885, 505, null, 9470],
];
const ahlSenior = 'Recorded figures are for the Commerce/Humanities stream (column "XI & XII Comm./Hum."). Science stream: tuition Rs. 7,740, annual charges Rs. 1,960, development Rs. 590, smart class Rs. 350, monthly total Rs. 10,640. ';
const ahlFees = ahlRows.map(([c, stage, t, a, d, m, tot, extra]) =>
  fee({ classCode: c, academicYear: '2026-27', monthlyTuition: t, ...ahlMonthly(a, d, m), sourceUrl: AHL_FEE, notes: ahlNotes(stage, a, d, m, tot, extra || '') }));
for (const c of ['XI', 'XII']) {
  ahlFees.push(fee({ classCode: c, academicYear: '2026-27', monthlyTuition: 7205, ...ahlMonthly(1960, 590, null), sourceUrl: AHL_FEE,
    notes: ahlNotes('XI & XII Comm./Hum.', 1960, 590, null, 10105, ahlSenior) }));
}
const ahlPoints = [
  crit('Neighbourhood: 0-3 km (Group A areas) 45 points; 3.1-6 km (Group B) 35 points; 6.1 km and above 25 points', 45),
  crit('Sibling studying in the school (real brother/sister)', 25),
  crit('Staff child', 15),
  crit('Alumni parent (Class XII from Ahlcon International School)', 10),
  crit('Single parent / girl child / first child', 5),
];
const ahlDocs = [
  doc('Date of birth certificate issued by the Municipal Corporation'),
  doc('Address proof in the name of father/mother/child (Aadhaar, domicile certificate, Voter ID, passport, ration card, electricity/MTNL bill)'),
  doc('Aadhaar card of child, father and mother'),
  doc('Another ID of father and mother (Voter ID / Passport / PAN)'),
  doc('Fitness certificate and immunisation record from an MBBS doctor'),
  doc('Sibling, alumni, single-parent, first-child or caste proof, if claimed', false),
];
const ahlAge = { NURSERY: '3 to 4 years as on 31 March 2026 (born 01-04-2022 to 31-03-2023)',
  KG: '4 to 5 years as on 31 March 2026 (born 01-04-2021 to 31-03-2022)',
  I: '5 to 6 years as on 31 March 2026 (born 01-04-2020 to 31-03-2021)' };
const ahlSeats = { NURSERY: '144 fresh seats (80 general, 64 discretionary quota inclusive of EWS/DG)', KG: '8 fresh seats (6 general, 2 discretionary inclusive of EWS/DG)', I: '8 fresh seats (6 general, 2 discretionary inclusive of EWS/DG)' };
const ahlcon = {
  schoolName: 'Ahlcon International School',
  fees: ahlFees,
  admissions: Object.keys(ahlAge).map(c => adm({ classCode: c, academicYear: '2026-27', category: 'GENERAL',
    applicationStartDate: '2025-12-04', applicationEndDate: '2025-12-27', ageEligibility: ahlAge[c] + '. Age relaxation of up to 30 days as per DoE.',
    selectionCriteria: 'Points system for the general category (schedule as decided by the Directorate of Education): neighbourhood 45/35/25, sibling 25, staff child 15, alumni 10, single parent/girl child/first child 5. Draw of lots if required.',
    officialNotificationUrl: AHL_ENTRY, applicationUrl: 'https://www.ahlconinternational.com/admissions/admission-form',
    requirements: [...ahlPoints, ...ahlDocs], sourceUrl: AHL_ENTRY,
    notes: `${ahlSeats[c]}. Online registration from 04.12.2025 9:00 am to 27.12.2025 4:00 pm (offline form by 29.12.2025 1:00 pm with a Rs. 25 demand draft). Registered list 09.01.2026, points list 16.01.2026, first selection list 23.01.2026, second list 09.02.2026. EWS/DG seats are filled by the Directorate of Education.` })),
  notRecorded: [
    'Class XI 2026-27 external admissions: application dates are not stated on https://www.ahlconinternational.com/admissions/admission-form (only provisional lists dated March 2026).',
    'Registration fee: the entry-level notice mentions a Rs. 25 demand draft for offline forms; it is kept in the admission notes, not the fee records, because the fee page does not list it.',
    'EWS/DG admissions are run by the Directorate of Education; no school-level dates.',
  ],
};

// ---------------------------------------------------------------- The British School
const TBS_FEE = 'https://www.british-school.org/wp-content/uploads/2026/06/Fee-Schedule-for-2026-27.pdf';
const tbsCommon = 'Fee Schedule 2026-27, column "Nursery and Reception". Tuition is billed per term, not per month: term fee Rs. 2,59,000, payable every quarter (one term fee is also payable at admission), so monthlyTuition is left null. One-time development fee Rs. 6,25,000 (non-refundable; recorded only here because developmentCharges is treated as a recurring annual charge). Society fee Rs. 5,000 per annum per family. Total payable at admission Rs. 12,98,000. Refundable deposit equals one term\'s tuition and must be topped up annually. Bus service: NA for Nursery and Reception. Optional lunch Rs. 260 per day; EAL support Rs. 20,000 per term if applicable; late fee Rs. 1,000 per week.';
const tbs = {
  schoolName: 'The British School',
  fees: [
    fee({ classCode: 'NURSERY', academicYear: '2026-27', registrationFee: 30000, admissionFee: 150000, securityDeposit: 259000, securityDepositRefundable: true, sourceUrl: TBS_FEE,
      notes: 'Year group "Nursery" (age 3 on 1 September 2026 per the school\'s Age vs Class Guide 2026-27). ' + tbsCommon }),
    fee({ classCode: 'KG', academicYear: '2026-27', registrationFee: 30000, admissionFee: 150000, securityDeposit: 259000, securityDepositRefundable: true, sourceUrl: TBS_FEE,
      notes: 'Year group "Reception" (age 4 on 1 September 2026 per the school\'s Age vs Class Guide 2026-27), recorded as KG. ' + tbsCommon }),
  ],
  admissions: [],
  notRecorded: [
    'Years 1-13 fees are published by UK year group, which the school does not map to Indian class codes, so they are not stored as FeeRequests. Verbatim (2026-27, INR): registration 30,000 for all; development (one-time) 6,25,000 for Years 1-11 and 1,56,250 for Years 12-13 (75% subsidy); admission 1,50,000; society fee 5,000 per family per year; refundable deposit = one term fee; term fee per quarter: Years 1-6 2,28,000; Years 7-9 3,05,000; Years 10-11 3,05,000; Years 12-13 3,66,000; book deposit: Years 7-9 2,000, Years 10-13 3,000; total at admission: Years 1-6 12,36,000; Years 7-9 13,92,000; Years 10-11 13,93,000; Years 12-13 10,46,250; bus fee TBC. Source: ' + TBS_FEE,
    'Admissions: rolling throughout the year subject to seats (https://www.british-school.org/admissions/admission-process/); no application window to record.',
  ],
};

// ---------------------------------------------------------------- KV Andrews Ganj
const KVS_SCHED = 'https://cdnbbsr.s3waas.gov.in/s3kv013a54fb788422a7751afc1caaa165/uploads/2026/03/2026031915.pdf';
const kv = {
  schoolName: 'PM SHRI Kendriya Vidyalaya Andrews Ganj',
  fees: [],
  admissions: [
    adm({ classCode: 'I', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2026-03-20', applicationEndDate: '2026-04-02',
      selectionCriteria: 'As per KVS admission guidelines 2026-27. Admission of selected candidates in the order: RTE, service priority categories I and II, then shortfall of reservation quota.',
      officialNotificationUrl: KVS_SCHED, sourceUrl: KVS_SCHED,
      notes: 'Kendriya Vidyalaya Sangathan schedule for all KVs (linked from https://andrewsganj.kvs.ac.in/ as "Admission schedule for session 2026-27"). Online registration from 20.03.2026 10:00 am to 02.04.2026; first provisional list for Class I on 09.04.2026, second 16.04.2026, third 21.04.2026 (if seats remain). Offline second notification for RTE/SC/ST/OBC(NCL) 22-26.04.2026 if required. Class II onwards (except XI): offline registration 02-08.04.2026, list 13.04.2026, admissions 15-20.04.2026, subject to vacancies.' }),
  ],
  notRecorded: [
    'Fees: https://andrewsganj.kvs.ac.in/ fee-structure page lists admission fee Rs. 25, re-admission fee Rs. 100, tuition fee Classes IX-X Rs. 200, Classes XI-XII Commerce/Humanities (boys) Rs. 300, Science (boys) Rs. 400, computer fund Rs. 100 (Class III onwards) / Rs. 150 (computer science elective), Vidyalaya Vikas Nidhi Rs. 500 (Classes I-XII). It states neither the academic year nor the billing period (monthly/quarterly), so no FeeRequest is recorded.',
    'Class XI admissions: dates depend on the Class X result declaration; no fixed window to record.',
  ],
};

// ---------------------------------------------------------------- Modern School Barakhamba Road
const MOD_FEE = 'https://www.modernschool.net/pdfs/general-information/FEE-STRUCTURE-FOR-THE-YEAR-2022-2023-1.pdf';
const modAnnualItems = 'Student Benevolence Fund Rs. 200, Education & Field Excursion Rs. 525, School Magazine Rs. 400, School Diary & Calendar Rs. 120, Student Medicare Rs. 600';
const modern = {
  schoolName: 'Modern School Barakhamba Road',
  fees: [
    ...['VI', 'VII', 'VIII', 'IX', 'X'].map(c => fee({ classCode: c, academicYear: '2022-23', admissionFee: 200, monthlyTuition: 12350, annualCharges: 2345,
      monthlyCharges: 1850, monthlyChargesDescription: 'development fund', developmentCharges: 0,
      securityDeposit: 500, securityDepositRefundable: true, sourceUrl: MOD_FEE,
      notes: `OLD DATA: "Proposed fee structure for the F.Year 2022-2023"; this is the only fee document on the school website. Admission fee is one-time for new admissions. annualCharges is the sum of the listed annual charges for Class VI-X: ${modAnnualItems}, Virtual School & Internet Facility Rs. 500. Development fund Rs. 1,850 is per month (monthlyCharges), so developmentCharges is 0. No registration fee is listed. Optional transport Rs. 39,500 (period not stated).` })),
    ...['XI', 'XII'].map(c => fee({ classCode: c, academicYear: '2022-23', admissionFee: 200, monthlyTuition: 14250, annualCharges: 1845,
      monthlyCharges: 2135, monthlyChargesDescription: 'development fund', developmentCharges: 0,
      securityDeposit: 500, securityDepositRefundable: true, sourceUrl: MOD_FEE,
      notes: `OLD DATA: "Proposed fee structure for the F.Year 2022-2023"; this is the only fee document on the school website. Admission fee is one-time for new admissions. annualCharges is the sum of the listed annual charges that apply to all Class XI-XII students: ${modAnnualItems}. Additional annual fees: Science fee Rs. 600 (Science stream) and Computer fee Rs. 600 (students opting for Computer subject). Development fund Rs. 2,135 is per month (monthlyCharges), so developmentCharges is 0. No registration fee is listed. Optional transport Rs. 39,500 (period not stated).` })),
  ],
  admissions: [],
  notRecorded: ['No admission schedule is published on https://www.modernschool.net/ (checked home and general-information pages).',
    'No fee structure for 2023-24 or later is published.'],
};

// ---------------------------------------------------------------- Sanskriti School
const SK_XI = 'https://www.sanskritischool.edu.in/admissions/class-XI-2026-2027.html';
const SK_IX = 'https://www.sanskritischool.edu.in/admissions/class-IX-2026-2027.html';
const SK_24 = 'https://www.sanskritischool.edu.in/admissions/class-24-2026-2027.html';
const SK_FORM = 'https://erp.sanskritischool.edu.in/admission/form/';
const sanskriti = { schoolName: 'Sanskriti School', fees: [],
  admissions: [
    adm({ classCode: 'IX', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2026-01-02', applicationEndDate: '2026-01-19',
      selectionCriteria: 'Entrance exam (offline only, 8:00 am, 22/01/2026) for shortlisted candidates, on the CBSE/NCERT Class VIII syllabus: English, Mathematics, Science and any one language.',
      officialNotificationUrl: SK_IX, applicationUrl: SK_FORM, requirements: [crit('Entrance exam: English, Mathematics, Science and any one language (Class VIII syllabus)')],
      sourceUrl: SK_IX, notes: 'Application forms online only. Shortlist for the entrance exam published 20/01/2026.' }),
    adm({ classCode: 'XI', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: null, applicationEndDate: '2026-04-12',
      selectionCriteria: 'Entrance exam (offline only, 8:00 am, 20/04/2026) for shortlisted candidates, as per the Term-II CBSE Class X syllabus: English, Mathematics, Science.',
      officialNotificationUrl: SK_XI, applicationUrl: SK_FORM, requirements: [crit('Entrance exam: English, Mathematics, Science (Class X syllabus)')],
      sourceUrl: SK_XI, notes: 'Application forms online only; the page gives no start date for forms (guidelines uploaded 23/03/2026). Shortlist published 13/04/2026.' }),
    ...['II', 'IV'].map(c => adm({ classCode: c, academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2026-01-02', applicationEndDate: '2026-01-19',
      officialNotificationUrl: SK_24, applicationUrl: SK_FORM, sourceUrl: SK_24,
      notes: 'Classes II and IV 2026-27 (one notice for both). Application forms online only; guidelines uploaded 01/01/2026. Selection criteria are in the guidelines PDF, not on the page.' })),
  ],
  notRecorded: ['Fees: no fee schedule found on https://www.sanskritischool.edu.in/.',
    'Nursery 2026-27: registration portal (https://erp.sanskritischool.edu.in/admission/nursery/index.cfm) shows no dates; guidelines PDF not read.'] };

// ---------------------------------------------------------------- Springdales School Pusa Road (new)
const SPR_FEE = 'https://www.springdalespusa.com/school-fees.php';
const SPR_ADM = 'https://www.springdalespusa.com/admission-policy.php';
const sprRows = [['NURSERY', 'Nursery To I', 8740, 10390, 'Pre-School to I'], ['KG', 'Nursery To I', 8740, 10390, 'Pre-School to I'], ['I', 'Nursery To I', 8740, 10390, 'Pre-School to I'],
  ...['II', 'III', 'IV', 'V'].map(c => [c, 'II to V', 9240, 11030, 'II to V']),
  ...['VI', 'VII', 'VIII'].map(c => [c, 'VI to VIII', 9350, 11150, 'VI to VIII']),
  ...['IX', 'X'].map(c => [c, 'IX and X', 9550, 11430, 'IX and X'])];
const sprCommon = 'Fee Schedule 2025-2026. Annual charges Rs. 15,270 per annum (sports, medical insurance, annual day, supplementary readers, co-curricular activities, publications, work experience, educational technology and IT). Development charges per annum (no increase in development fee). Security: NIL. Optional sports coaching charged per discipline.';
const springdales = {
  schoolName: 'Springdales School Pusa Road',
  fees: [
    ...sprRows.map(([c, t, tu, dv, dl]) => fee({ classCode: c, academicYear: '2025-26', registrationFee: 25, admissionFee: 200, monthlyTuition: tu,
      annualCharges: 15270, developmentCharges: dv, securityDeposit: 0, sourceUrl: SPR_FEE,
      notes: `Tuition row "${t}", development row "${dl}". ${sprCommon}${c === 'KG' ? ' KG is the "Prep" class named in the schedule\'s refreshment row ("Nursery / Prep").' : ''}${c === 'NURSERY' || c === 'KG' ? ' Optional refreshment Rs. 500 per month (Nursery / Prep).' : ''}` })),
    ...['XI', 'XII'].map(c => fee({ classCode: c, academicYear: '2025-26', registrationFee: 25, admissionFee: 200, monthlyTuition: 9550,
      annualCharges: 15270, developmentCharges: 11430, securityDeposit: 0, sourceUrl: SPR_FEE,
      notes: 'Recorded figures are for XI and XII Arts/Commerce. Science (with lab facilities: Physics/Chemistry/Biology/Computer): tuition Rs. 9,900 per month and development charges Rs. 11,880 per annum. ' + sprCommon })),
  ],
  admissions: [
    adm({ classCode: 'NURSERY', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2025-12-04', applicationEndDate: '2025-12-27',
      ageEligibility: 'Minimum age 3 years as on 31 March 2026 (DoE circular dated 24/10/2025); age relaxation up to 30 days at the Head of School\'s level.',
      selectionCriteria: 'General category (85 of 170 seats) by DoE-guideline points: residence 39 (listed areas) or 29 (other areas), sibling 35, alumni 26/16/11 by years in school. Ties for remaining seats are resolved by draw of lots.',
      officialNotificationUrl: SPR_ADM, applicationUrl: 'https://www.springdalespusa.com/admission/index.php',
      requirements: [crit('Residence in areas listed in the registration form (others get 29 points)', 39), crit('Real sibling studying in Springdales Pusa Road', 35),
        crit('Alumni parent (11+ years with character certificate: 26; 5-10 years with OSA membership: 16; under 5 years: 11)', 26),
        doc('Copy of birth certificate of the child'), doc('Proof of residence (any two: domicile, Voter ID, electricity/MTNL/water bill, passport, Aadhaar)'),
        doc('Sibling proof (fee bill and report card), if claimed', false), doc('Alumni proof (character certificate / OSA membership), if claimed', false),
        doc('Printout of the online form with online payment receipt of the Rs. 25 registration fee, dropped at Gate No. 4')],
      sourceUrl: SPR_ADM,
      notes: 'Pre-School (Nursery) 2026-27. 170 seats: EWS/DG/CWSN 42 (allocated by the Directorate of Education), General 85, Staff children 9, Management quota 34. Forms online only from 04.12.2025 8:30 am to 27.12.2025; hard copy in the drop box 8:30-11:30 am. First list 23.01.2026, second list 09.02.2026, admission closes 19.03.2026.' }),
  ],
  notRecorded: ['EWS/DG/CWSN seats are allotted by the Directorate of Education; no school-level dates.'],
};

// ---------------------------------------------------------------- Bal Bharati Public School Pitampura (new)
const BB_FEE = 'https://drive.google.com/file/d/1LW8jV9BTxdSLuiE_VbqnbrXEp1Nr_7Ks/view?usp=drive_link';
const bbCourt = 'IMPORTANT: the school states the 2026-27 structure was approved by its Managing Committee, but under the Delhi High Court interim order dated 28.02.2026 (W.P. 122/2026) it continues to charge the 2025-26 fee structure until further directions; the 2025-26 structure is not published. ';
const bbCommon = 'Annual charges Rs. 13,750. Monthly add-ons: health & hygiene Rs. 50, activity fees Rs. 285, smart class (CAL) Rs. 150. Specific activity charges average Rs. 3,000 per quarter (proposed). No caution money. No fee/charges for EWS students. Linked as "Fee structure of the school" from https://bbpspp.balbharati.org/mandatory-disclosure.';
const bbRows = [['NURSERY', 'Pre-School', 9260, 990], ...['KG', 'I', 'II', 'III', 'IV', 'V'].map(c => [c, 'Pre-Primary to Class-V', 8010, 855]),
  ...['VI', 'VII', 'VIII'].map(c => [c, 'Middle (VI-VIII)', 9100, 970]), ...['IX', 'X'].map(c => [c, 'Secondary (IX & X)', 9475, 1010]),
  ...['XI', 'XII'].map(c => [c, 'Sr. Sec. (XI & XII)', 9475, 1010])];
const balBharati = {
  schoolName: 'Bal Bharati Public School Pitampura',
  fees: bbRows.map(([c, col, tu, dv]) => fee({ classCode: c, academicYear: '2026-27', registrationFee: 25, admissionFee: 200, monthlyTuition: tu,
    monthlyCharges: 50 + dv + 285 + 150, monthlyChargesDescription: `development ${dv} + health & hygiene 50 + activity 285 + smart class 150`,
    annualCharges: 13750, developmentCharges: 0, securityDeposit: 0, transportMonthly: 3950, sourceUrl: BB_FEE,
    notes: bbCourt + `Column "${col}". Development fee Rs. ${dv} is per month (in monthlyCharges), so developmentCharges is 0. ` + bbCommon
      + (c === 'NURSERY' ? ' New admissions to Pre-School also pay a one-time activity fee for the orientation programme of Rs. 8,500.' : '')
      + ' New admissions pay a one-time activity fee for life skill development of Rs. 9,500.'
      + (c === 'XI' || c === 'XII' ? ' Science stream adds computer fees Rs. 75 and science fees Rs. 75 per month.' : '')
      + (c === 'KG' ? ' Pre-Primary is recorded as KG.' : '')
      + ' Optional transport Rs. 3,950 per month (months not stated).' })),
  admissions: [],
  notRecorded: ['Admissions page (https://bbpspp.balbharati.org/admissions) says only "Admissions for academic session 2026-27 will open soon"; no dates published.'],
};

// ---------------------------------------------------------------- Amity International School Saket (new)
const amity = { schoolName: 'Amity International School Saket', fees: [], admissions: [],
  notRecorded: ['Fees: https://amityschools.in/saket/admission says the fee structure is shared at document submission; none is published.',
    'Admissions: vacancy-based per Directorate of Education guidelines; no dates published.'] };

// ---------------------------------------------------------------- Salwan Public School, Mayur Vihar
const SAL_ADM = 'https://www.spsmayurvihar.edu.in/admissions';
const salwan = {
  schoolName: 'Salwan Public School Mayur Vihar',
  fees: [],
  admissions: [
    adm({ classCode: 'NURSERY', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2025-12-04', applicationEndDate: '2025-12-27',
      selectionCriteria: 'Points as per the Directorate of Education guidelines (DoE circular DE.23(749)/Sch.Br./2025/976 dated 24 October 2025), including distance from the school (up to 8 km, or beyond 8 km where school transport is available: 60 points; beyond 8 km without school transport: 50) and alumni of Salwan Education Trust schools.',
      officialNotificationUrl: SAL_ADM, applicationUrl: 'https://www.spsmayurvihar.edu.in/', sourceUrl: SAL_ADM,
      requirements: [crit('Distance from residence: up to 8 km, or beyond 8 km where school transport is available', 60),
        crit('Distance beyond 8 km without school transport', 50),
        crit('Parent completed schooling till Class XII at a Salwan Education Trust school')],
      notes: 'Nursery (Balvatika-I). Online registration on the school website from 04.12.2025 to 27.12.2025; registration fee Rs. 25 (online, or cash for the offline form at Gate No. 1). 25% of seats under the RTE Act (EWS/DG) are allotted by the Directorate of Education.' }),
  ],
  notRecorded: ['Fee structure: the admissions page covers fees and transport, but no itemised schedule was recorded in this pass.',
    'Classes KG to IX: registration subject to seat availability with a written test; no dates recorded.'],
};

// ---------------------------------------------------------------- Jawahar Navodaya Vidyalayas (Delhi)
const JNV_PROSPECTUS = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf';
const jnvFees = ['VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'].map((c) => {
  const senior = ['IX', 'X', 'XI', 'XII'].includes(c);
  return fee({ classCode: c, academicYear: '2027-28', registrationFee: 0, monthlyTuition: 0, annualCharges: 0, developmentCharges: 0,
    ...(senior ? { monthlyCharges: 600, monthlyChargesDescription: 'Vidyalaya Vikas Nidhi (VVN)' } : {}),
    sourceUrl: JNV_PROSPECTUS,
    notes: 'NVS JNVST-2027 prospectus: education in JNVs is free including board and lodging, uniform and textbooks; JNVST registration is free. '
      + (senior
        ? 'A Vidyalaya Vikas Nidhi of Rs. 600 per month is collected only in Classes IX–XII. Exempt: SC/ST, Divyang and all girl students, and students from BPL families. Wards of Government employees (non-exempt) pay Rs. 1,500 per month or the actual Children Education Allowance, whichever is less (not less than Rs. 600).'
        : 'No Vidyalaya Vikas Nidhi is collected in Classes VI–VIII.') });
});
const jnvAdmission = (catchment) => adm({ classCode: 'VI', academicYear: '2027-28', category: 'GENERAL', applicationStartDate: null, applicationEndDate: '2026-07-31',
  ageEligibility: 'Born between 01.05.2015 and 31.07.2017 (both inclusive); studying in Class V for the full session 2026-27 in a Govt./Govt.-aided/recognised school (or NIOS "B" certificate) in the district of residence; must have studied Classes III, IV and V for full sessions; repeaters are not eligible.',
  selectionCriteria: 'JNV Selection Test (JNVST-2027) on 28 November 2026, 11:30 a.m.–1:30 p.m.: 80 objective questions, 100 marks, 2 hours — Mental Ability & EVS (40 questions, 50 marks, 60 min), Arithmetic (20 questions, 25 marks, 30 min), Language (20 questions, 25 marks, 30 min). 1.25 marks per correct answer, no negative marking; minimum qualifying marks: 14 in Mental Ability & EVS, 7 in Arithmetic, 7 in Language. At least 75% of seats for rural candidates; minimum one-third girls; SC/ST as per district population (min. 15% and 7.5%); 27% OBC (Central list); Divyang reservation as per GOI norms.',
  officialNotificationUrl: JNV_PROSPECTUS, applicationUrl: 'https://cbseitms.rcil.gov.in/nvs/',
  requirements: [
    elig('Bona fide resident of the district and studying Class V there in 2026-27 (a school within 10 km radial distance in a neighbouring district is allowed)'),
    elig('Born between 01.05.2015 and 31.07.2017 (both inclusive)'),
    elig('Studied Classes III, IV and V for full academic sessions in recognised schools'),
    doc('Photograph (JPG, 10–100 KB)'), doc('Signature of parent and of candidate (JPG, 10–100 KB)'),
    doc('Aadhaar details or residence certificate issued by a competent Government authority'),
    doc('At admission: birth certificate, residence proof, rural-area / caste / Divyang certificates as applicable'),
  ],
  sourceUrl: JNV_PROSPECTUS,
  notes: `Registration was free and online through the NVS admission portal; last date 31 July 2026 as per the prospectus (check the portal for any extension notice). Up to 80 seats in Class VI. Results expected by end of March 2027; admission process closes by 31 August 2027. ${catchment}` });
const jnvMungeshpur = { schoolName: 'Jawahar Navodaya Vidyalaya North West Delhi (Mungeshpur)', fees: jnvFees,
  admissions: [jnvAdmission('Catchment (tentative, Annexure-I): North West and Outer North Delhi.')], notRecorded: [] };
const jnvJaffarpur = { schoolName: 'Jawahar Navodaya Vidyalaya South West Delhi (Jaffarpur Kalan)', fees: jnvFees,
  admissions: [jnvAdmission('Catchment (tentative, Annexure-I): South West, South and West Delhi.')], notRecorded: [] };

// ---------------------------------------------------------------- Kendriya Vidyalayas: KVS-wide Class I schedule 2026-27
const kvNames = fs.readFileSync(require('path').join(__dirname, '../../backend/src/main/resources/seed/delhi-schools.csv'), 'utf8')
  .split('\n').slice(1).map((l) => (l.startsWith('"') ? l.slice(1, l.indexOf('",')) : l.split(',')[0]))
  .filter((n) => /Kendriya Vidyalaya/.test(n) && n !== kv.schoolName);
const kvSchools = kvNames.map((name) => ({
  schoolName: name, fees: [],
  admissions: [adm({ classCode: 'I', academicYear: '2026-27', category: 'GENERAL', applicationStartDate: '2026-03-20', applicationEndDate: '2026-04-02',
    selectionCriteria: 'As per KVS admission guidelines 2026-27. Admission of selected candidates in the order: RTE, service priority categories I and II, then shortfall of reservation quota.',
    officialNotificationUrl: KVS_SCHED, sourceUrl: KVS_SCHED,
    notes: 'Kendriya Vidyalaya Sangathan schedule for all KVs. Online registration from 20.03.2026 10:00 am to 02.04.2026; first provisional list for Class I on 09.04.2026, second 16.04.2026, third 21.04.2026 (if seats remain). Class II onwards (except XI): offline registration 02-08.04.2026, subject to vacancies. Check the Vidyalaya website for its own lists.' })],
  notRecorded: [],
}));

const result = {
  _comment: 'Official, source-linked fee schedules and admission cycles. Each "fees" entry is a FeeRequest for POST /api/v1/admin/schools/{id}/fees and each "admissions" entry an AdmissionRequest for POST /api/v1/admin/schools/{id}/admissions; resolve {id} by schoolName (as in delhi-schools.csv). Components the source does not state are null; 0 only where the source says no charge (NIL security / no caution money). Facts read on 2026-10-24. "notRecorded" lists what was looked for and not found or not mappable.',
  retrievedDate: '2026-10-24',
  schools: [dps, modern, sanskriti, ahlcon, tbs, kv, springdales, balBharati, amity, salwan, jnvMungeshpur, jnvJaffarpur, ...kvSchools],
};
fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n', 'utf8');
console.log('fees', result.schools.reduce((n, s) => n + s.fees.length, 0), 'admissions', result.schools.reduce((n, s) => n + s.admissions.length, 0));
