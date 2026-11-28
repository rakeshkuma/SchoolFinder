// Builds the content of the JNVST Mental Ability page (/exams/jnvst/mental-ability) and writes the same JSON to the app
// (frontend/src/content/jnvstMentalAbility.json) and to the server (backend/src/main/resources/content/
// jnvst-mental-ability.json), which renders the page's head and its HTML for crawlers from it. Edit the text here and
// re-run; a backend test fails if the two copies differ.
//
//   node tools/practice/jnvst/mental-ability-page.mjs
//
// Facts come from the NVS Prospectus cum Notification for JNVST 2027 (sections 5–7) and the JNVST 2026 question paper
// (English) on the NVS admission portal, both read on 27 Nov 2026. The worked examples are new questions from the same
// rules as the practice bank (mat.mjs), checked not to be in it: the bank's answers stay on the server until a test is
// submitted, so no example may give one away.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../netarhat/core.mjs';
import { completeQuestion, embeddedQuestion, mirrorQuestion, patternQuestion, seriesQuestion } from './mat.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = ['frontend/src/content/jnvstMentalAbility.json', 'backend/src/main/resources/content/jnvst-mental-ability.json'];
const BANK = 'backend/src/main/resources/seed/practice.json';
const PROSPECTUS = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf';
const PAPER_2026 = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/PYQ_English_2026.pdf';
const TITLE_MAX = 60, DESCRIPTION_MAX = 160; // as SeoHeadService sends them

// ── The five parts (prospectus section 7, "Nature of the test") ──────────────────────────────────────────────────
// `paper2026`: the same type in the JNVST 2026 paper, whose Mental Ability Test had 40 questions in ten parts.
const PARTS = [
  {
    part: 'I', topics: ['Pattern completion'], questions: '1–4', paper2026: '9–12',
    name: { en: 'Pattern completion', hi: 'पैटर्न पूर्ति' },
    task: {
      en: 'A problem figure has one part missing. Choose the answer figure that fits the gap, without turning it, so the pattern is complete. The prospectus says this part also uses letter and number patterns.',
      hi: 'समस्या आकृति का एक भाग लुप्त है। वह उत्तर आकृति चुनिए जो बिना घुमाए खाली जगह में बैठकर पैटर्न पूरा करे। प्रॉस्पेक्टस के अनुसार इस भाग में अक्षरों और संख्याओं के पैटर्न भी आते हैं।',
    },
    tip: {
      en: 'Carry each line and shape on into the gap; compare the answer figures the same way up, never turned.',
      hi: 'हर रेखा और आकृति को खाली भाग तक आगे बढ़ाइए; उत्तर आकृतियों को उसी दिशा में मिलाइए, घुमाकर नहीं।',
    },
  },
  {
    part: 'II', topics: ['Figure series'], questions: '5–8', paper2026: '13–16',
    name: { en: 'Figure series', hi: 'आकृति श्रेणी' },
    task: {
      en: 'Three problem figures form a series. Choose the answer figure that comes fourth.',
      hi: 'तीन समस्या आकृतियाँ एक श्रेणी बनाती हैं। चौथे स्थान पर आने वाली उत्तर आकृति चुनिए।',
    },
    tip: {
      en: 'Find what changes from the first figure to the second and from the second to the third (turning, moving, adding or shading) and make that change once more. Check every part of the figure, not just one.',
      hi: 'पहली से दूसरी और दूसरी से तीसरी आकृति में क्या बदलता है (घूमना, खिसकना, जुड़ना या छायांकन), यह खोजिए और वही बदलाव एक बार और कीजिए। आकृति के हर हिस्से की जाँच कीजिए, केवल एक की नहीं।',
    },
  },
  {
    part: 'III', topics: ['Geometrical figure completion'], questions: '9–11', paper2026: '21–24',
    name: { en: 'Geometrical figure completion', hi: 'ज्यामितीय आकृति पूर्ति' },
    task: {
      en: 'One part of a triangle, square or circle is given. Choose the answer figure that completes it.',
      hi: 'त्रिभुज, वर्ग या वृत्त का एक भाग दिया है। वह उत्तर आकृति चुनिए जो उसे पूरा करे।',
    },
    tip: {
      en: 'Count the sides and corners that are missing. The right piece fits exactly: no gap, no overlap and no extra line.',
      hi: 'गिनिए कि कौन-सी भुजाएँ और कोने लुप्त हैं। सही टुकड़ा ठीक बैठता है: न खाली जगह, न ओवरलैप, न कोई अतिरिक्त रेखा।',
    },
  },
  {
    part: 'IV', topics: ['Mirror image', 'Water image'], questions: '12–16', paper2026: '25–28',
    name: { en: 'Mirror and water images', hi: 'दर्पण और जल प्रतिबिंब' },
    task: {
      en: 'Choose the exact mirror image of the problem figure when the mirror is held at the line XY, or its water image.',
      hi: 'दर्पण को रेखा XY पर रखने पर समस्या आकृति का सही दर्पण प्रतिबिंब चुनिए, या उसका जल प्रतिबिंब।',
    },
    tip: {
      en: 'Find the mirror line XY first. A mirror at the side swaps left and right; a mirror above or below the figure, like water, swaps top and bottom. Letters and arrows show the flip quickest.',
      hi: 'पहले दर्पण की रेखा XY देखिए। बगल में रखा दर्पण बायाँ-दायाँ बदलता है; आकृति के ऊपर या नीचे रखा दर्पण, जल की तरह, ऊपर-नीचे बदलता है। अक्षर और तीर उलटाव सबसे जल्दी दिखाते हैं।',
    },
  },
  {
    part: 'V', topics: ['Embedded figure'], questions: '17–20', paper2026: '37–40',
    name: { en: 'Embedded figure', hi: 'अंतर्निहित आकृति' },
    task: {
      en: 'Choose the answer figure in which the problem figure is hidden.',
      hi: 'वह उत्तर आकृति चुनिए जिसमें समस्या आकृति छिपी है।',
    },
    tip: {
      en: 'Pick one unusual corner or angle of the problem figure and look for it in each answer figure. The hidden copy is the same size and the same way up.',
      hi: 'समस्या आकृति का कोई एक अलग-सा कोना या कोण चुनिए और उसे हर उत्तर आकृति में खोजिए। छिपी हुई आकृति उसी आकार और उसी दिशा में होती है।',
    },
  },
];

// The other five parts of the JNVST 2026 paper: types that are not in the JNVST 2027 pattern.
const DROPPED = [
  { name: { en: 'Odd figure out', hi: 'भिन्न आकृति चुनना' }, questions: '1–4' },
  { name: { en: 'Figure matching', hi: 'आकृति मिलान' }, questions: '5–8' },
  { name: { en: 'Analogy', hi: 'सादृश्यता' }, questions: '17–20' },
  { name: { en: 'Punched-hole patterns (paper folding)', hi: 'छिद्रित कागज़ (कागज़ मोड़ना)' }, questions: '29–32' },
  { name: { en: 'Space visualisation (cut-out pieces)', hi: 'स्थान कल्पना (कटे हुए टुकड़े)' }, questions: '33–36' },
];

const FAQ = [
  {
    q: { en: 'Is there an official Navodaya Mental Ability question paper?', hi: 'क्या नवोदय मानसिक योग्यता का आधिकारिक प्रश्न-पत्र है?' },
    a: {
      en: 'Yes. NVS publishes the JNVST 2026 question paper (English, PDF) on its admission portal, and the JNVST 2027 prospectus has a solved example of each Mental Ability part. The 2026 paper follows the earlier 40-question pattern; its questions 9–16, 21–28 and 37–40 are the types in the test now. We did not find an official answer key for it.',
      hi: 'हाँ। NVS अपने प्रवेश पोर्टल पर JNVST 2026 का प्रश्न-पत्र (अंग्रेज़ी, PDF) प्रकाशित करता है, और JNVST 2027 के प्रॉस्पेक्टस में मानसिक योग्यता के हर भाग का एक हल किया हुआ उदाहरण है। 2026 का प्रश्न-पत्र पुराने 40 प्रश्नों वाले पैटर्न में है; उसके प्रश्न 9–16, 21–28 और 37–40 अब की परीक्षा वाले प्रकार हैं। हमें इसकी आधिकारिक उत्तर-कुंजी नहीं मिली।',
    },
  },
  {
    q: { en: 'How many Mental Ability questions are there in JNVST?', hi: 'JNVST में मानसिक योग्यता के कितने प्रश्न होते हैं?' },
    a: {
      en: '20 questions for 25 marks, numbered 1 to 20 in the test booklet, in five parts. The JNVST 2026 paper had 40 Mental Ability questions in ten parts, so older papers have twice as many.',
      hi: '25 अंकों के 20 प्रश्न, परीक्षा पुस्तिका में क्रमांक 1 से 20, पाँच भागों में। JNVST 2026 के प्रश्न-पत्र में दस भागों में मानसिक योग्यता के 40 प्रश्न थे, इसलिए पुराने प्रश्न-पत्रों में दोगुने प्रश्न हैं।',
    },
  },
  {
    q: { en: 'How much time is there for the Mental Ability Test?', hi: 'मानसिक योग्यता परीक्षा के लिए कितना समय मिलता है?' },
    a: {
      en: 'Mental Ability and EVS make up Section 1: 40 questions in 60 minutes. The whole test runs from 11:30 a.m. to 1:30 p.m. and a bell rings every 30 minutes, so about 30 minutes for Mental Ability keeps you on pace.',
      hi: 'मानसिक योग्यता और EVS मिलकर खंड 1 बनाते हैं: 60 मिनट में 40 प्रश्न। पूरी परीक्षा सुबह 11:30 से दोपहर 1:30 तक होती है और हर 30 मिनट पर घंटी बजती है, इसलिए मानसिक योग्यता के लिए लगभग 30 मिनट रखना ठीक रहता है।',
    },
  },
  {
    q: { en: 'What are the qualifying marks for Mental Ability?', hi: 'मानसिक योग्यता में न्यूनतम अंक कितने चाहिए?' },
    a: {
      en: 'There is no separate cut-off for Mental Ability. You need at least 14 marks in Section 1, Mental Ability and EVS together, as well as 7 in Arithmetic and 7 in Language.',
      hi: 'मानसिक योग्यता का अलग न्यूनतम अंक नहीं है। खंड 1 में, मानसिक योग्यता और EVS मिलाकर, कम से कम 14 अंक चाहिए, साथ ही अंकगणित में 7 और भाषा में 7।',
    },
  },
  {
    q: { en: 'Is there negative marking in the Mental Ability Test?', hi: 'क्या मानसिक योग्यता परीक्षा में ऋणात्मक अंकन है?' },
    a: {
      en: 'No. Each correct answer gets 1.25 marks and a wrong answer loses nothing, so leave no question blank.',
      hi: 'नहीं। हर सही उत्तर पर 1.25 अंक मिलते हैं और गलत उत्तर पर कोई अंक नहीं कटता, इसलिए कोई प्रश्न खाली मत छोड़िए।',
    },
  },
  {
    q: { en: 'Which question types should I practise?', hi: 'किन प्रश्न-प्रकारों का अभ्यास करना चाहिए?' },
    a: {
      en: 'The five parts in the JNVST 2027 prospectus: pattern completion, figure series, geometrical figure completion, mirror and water images, and embedded figures. Odd figure out, figure matching, analogy, punched-hole patterns and space visualisation, which older papers have, are not in that pattern.',
      hi: 'JNVST 2027 के प्रॉस्पेक्टस के पाँच भाग: पैटर्न पूर्ति, आकृति श्रेणी, ज्यामितीय आकृति पूर्ति, दर्पण और जल प्रतिबिंब, और अंतर्निहित आकृति। भिन्न आकृति चुनना, आकृति मिलान, सादृश्यता, छिद्रित कागज़ और स्थान कल्पना, जो पुराने प्रश्न-पत्रों में हैं, उस पैटर्न में नहीं हैं।',
    },
  },
  {
    q: { en: 'Does the Mental Ability score matter beyond qualifying?', hi: 'क्या न्यूनतम अंक के अलावा भी मानसिक योग्यता के अंक मायने रखते हैं?' },
    a: {
      en: 'Yes. If two candidates have the same total, the one with more marks in Mental Ability and EVS is preferred (prospectus, section 7F).',
      hi: 'हाँ। दो उम्मीदवारों के कुल अंक बराबर हों तो मानसिक योग्यता और EVS में अधिक अंक वाले को वरीयता मिलती है (प्रॉस्पेक्टस, खंड 7F)।',
    },
  },
  {
    q: { en: 'Are the questions on this page official?', hi: 'क्या इस पृष्ठ के प्रश्न आधिकारिक हैं?' },
    a: {
      en: 'No. The examples and practice papers are written by SchoolDhundo in the style of the official pattern. They are not official or previous-year questions, and a practice score does not predict selection.',
      hi: 'नहीं। उदाहरण और अभ्यास प्रश्न-पत्र SchoolDhundo ने आधिकारिक पैटर्न की शैली में लिखे हैं। ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं, और अभ्यास के अंक चयन का अनुमान नहीं हैं।',
    },
  },
  {
    q: { en: 'Will the pattern be the same next year?', hi: 'क्या अगले वर्ष भी यही पैटर्न रहेगा?' },
    a: {
      en: "NVS sets the pattern in each year's prospectus. This page follows the JNVST 2027 prospectus, and we check it again when NVS publishes the next one.",
      hi: 'NVS हर वर्ष के प्रॉस्पेक्टस में पैटर्न तय करता है। यह पृष्ठ JNVST 2027 के प्रॉस्पेक्टस पर आधारित है, और NVS के अगला प्रॉस्पेक्टस प्रकाशित करने पर हम इसे फिर जाँचेंगे।',
    },
  },
];

// ── Worked examples: one per part, and both kinds in Part IV ───────────────────────────────────────────────────────
// A question by its shapes alone, so a reworded figure description cannot hide a copy of a bank question.
const key = (q) => JSON.stringify([q.figure.map((f) => f.shapes), q.optionFigures.map((f) => JSON.stringify(f.shapes)).sort()]);
// Every figure question in the bank, not only JNVST's: other builders reuse these rules (a first draft's pattern example
// was question 13 of olympiad-class4-reasoning-1).
const bank = JSON.parse(fs.readFileSync(path.join(ROOT, BANK), 'utf8'));
const inBank = new Set(bank.sets.flatMap((s) => s.content.questions).filter((q) => q.optionFigures && q.figure).map(key));
if (inBank.size < 100) throw new Error(`expected the figure questions in ${BANK}, found ${inBank.size}`);
// Descriptions read aloud by screen readers and sent to crawlers: "pointing 120°" is accurate but not how a child says it.
const plain = (q) => ![...q.figure, ...q.optionFigures].some((f) => /\d+°/.test(f.alt.replace('(rotated 180°)', '')));

const r = rng(20261127); // not the bank's seed (20261128)
const WANTED = [
  ['I', 'Pattern completion', patternQuestion],
  ['II', 'Figure series', seriesQuestion],
  ['III', 'Geometrical figure completion', completeQuestion],
  ['IV', 'Mirror image', mirrorQuestion],
  ['IV', 'Water image', mirrorQuestion],
  ['V', 'Embedded figure', embeddedQuestion],
];
const examples = WANTED.map(([part, topic, make]) => {
  for (let tries = 0; tries < 200; tries++) {
    const q = make(r);
    if (q.topic !== topic || inBank.has(key(q)) || q.difficulty === 'HARD' || !plain(q)) continue;
    return {
      part, topic, difficulty: q.difficulty,
      prompt: { en: q.prompt, hi: q.hi.prompt },
      figure: q.figure, figureAsksNext: q.figureAsksNext, optionFigures: q.optionFigures,
      answer: q.answer,
      explanation: { en: q.explanation, hi: q.hi.explanation },
    };
  }
  throw new Error(`no new example for ${topic}`);
});

// ── The page ────────────────────────────────────────────────────────────────────────────────────────────────────
const page = {
  path: '/exams/jnvst/mental-ability',
  checkedOn: '2026-11-27',
  title: 'Navodaya Mental Ability Question Paper: Free Practice Tests',
  description: 'JNVST Class 6 Mental Ability Test: the 5 question types with worked examples, 5 free practice papers of 20 questions, and the official NVS papers.',
  heading: { en: 'Navodaya Mental Ability Test: Question Papers and Practice', hi: 'नवोदय मानसिक योग्यता परीक्षा: प्रश्न-पत्र और अभ्यास' },
  intro: {
    en: 'The Mental Ability Test opens the Jawahar Navodaya Vidyalaya Selection Test (JNVST) for Class VI: 20 questions on figures and diagrams. Below are its five question types, each with a worked example, five free practice papers of 20 questions, and how to use the official NVS question paper.',
    hi: 'मानसिक योग्यता परीक्षा जवाहर नवोदय विद्यालय चयन परीक्षा (JNVST) कक्षा 6 का पहला भाग है: आकृतियों और चित्रों पर 20 प्रश्न। नीचे इसके पाँच प्रश्न-प्रकार हैं, हर एक का हल किया हुआ उदाहरण, 20 प्रश्नों के पाँच मुफ़्त अभ्यास प्रश्न-पत्र, और NVS के आधिकारिक प्रश्न-पत्र का उपयोग कैसे करें।',
  },
  patternSource: { label: 'NVS Prospectus cum Notification, JNVST 2027, sections 5–7', url: PROSPECTUS },
  facts: [
    { label: { en: 'Questions', hi: 'प्रश्न' }, value: { en: '20, numbered 1–20 in the test booklet', hi: '20, परीक्षा पुस्तिका में क्रमांक 1–20' } },
    { label: { en: 'Marks', hi: 'अंक' }, value: { en: '25: 1.25 for each correct answer, no negative marking', hi: '25: हर सही उत्तर पर 1.25, कोई ऋणात्मक अंकन नहीं' } },
    { label: { en: 'Time', hi: 'समय' }, value: { en: '60 minutes for Section 1, shared with the 20 EVS questions', hi: 'खंड 1 के लिए 60 मिनट, EVS के 20 प्रश्नों के साथ' } },
    { label: { en: 'Qualifying', hi: 'न्यूनतम अंक' }, value: { en: '14 marks in Section 1, Mental Ability and EVS together', hi: 'खंड 1 में 14 अंक, मानसिक योग्यता और EVS मिलाकर' } },
    { label: { en: 'Kind', hi: 'प्रकार' }, value: { en: 'Non-verbal: figures and diagrams only', hi: 'अशाब्दिक: केवल आकृतियाँ और चित्र' } },
  ],
  parts: PARTS,
  numberingNote: {
    en: 'The prospectus says each of the five parts has four questions; its directions number Part III as questions 9–11 and Part IV as 12–16. Practise all five types.',
    hi: 'प्रॉस्पेक्टस के अनुसार पाँचों भागों में चार-चार प्रश्न हैं; उसके निर्देशों में भाग III को प्रश्न 9–11 और भाग IV को 12–16 क्रमांकित किया गया है। पाँचों प्रकारों का अभ्यास कीजिए।',
  },
  examples,
  practiceHelp: {
    en: 'Each paper has 20 questions, four from each part, in 30 minutes: the pace of the real Section 1. Instructions are in English and Hindi, and every answer is explained after you submit.',
    hi: 'हर प्रश्न-पत्र में 20 प्रश्न हैं, हर भाग से चार, 30 मिनट में: असली खंड 1 की गति। निर्देश अंग्रेज़ी और हिंदी में हैं, और जमा करने के बाद हर उत्तर समझाया जाता है।',
  },
  mocksHelp: {
    en: 'In the full mock tests, Mental Ability is questions 1–20, as in the real booklet.',
    hi: 'पूर्ण मॉक टेस्ट में मानसिक योग्यता प्रश्न 1–20 है, जैसे असली पुस्तिका में।',
  },
  originality: {
    en: 'The examples and practice papers on this page are written by SchoolDhundo in the style of the official pattern. They are not official or previous-year questions, and practice scores do not predict selection. Official papers are linked, never copied.',
    hi: 'इस पृष्ठ के उदाहरण और अभ्यास प्रश्न-पत्र SchoolDhundo ने आधिकारिक पैटर्न की शैली में लिखे हैं। ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं, और अभ्यास के अंक चयन का अनुमान नहीं हैं। आधिकारिक प्रश्न-पत्र लिंक किए गए हैं, नकल नहीं किए गए।',
  },
  officialPapers: [
    {
      title: { en: 'JNVST 2026 question paper (English, PDF)', hi: 'JNVST 2026 प्रश्न-पत्र (अंग्रेज़ी, PDF)' },
      note: { en: 'Published by NVS on its admission portal.', hi: 'NVS ने अपने प्रवेश पोर्टल पर प्रकाशित किया।' },
      url: PAPER_2026,
    },
    {
      title: { en: 'JNVST 2027 prospectus (PDF): a solved example of each part', hi: 'JNVST 2027 प्रॉस्पेक्टस (PDF): हर भाग का एक हल किया हुआ उदाहरण' },
      note: { en: 'Section 7, "Nature of the test".', hi: 'खंड 7, "परीक्षा का स्वरूप"।' },
      url: PROSPECTUS,
    },
  ],
  paper2026: {
    intro: {
      en: 'The 2026 paper was set in the earlier pattern: its Mental Ability Test has 40 questions in ten parts. Five of those parts are the five types in the test now, so practise these 20 questions from it:',
      hi: '2026 का प्रश्न-पत्र पुराने पैटर्न में था: उसकी मानसिक योग्यता परीक्षा में दस भागों में 40 प्रश्न हैं। उनमें से पाँच भाग अब की परीक्षा के पाँचों प्रकार हैं, इसलिए उसके ये 20 प्रश्न हल कीजिए:',
    },
    mirrorNote: { en: 'Its mirror questions have no water images.', hi: 'उसके दर्पण वाले प्रश्नों में जल प्रतिबिंब नहीं है।' },
    droppedIntro: {
      en: 'Its other parts are not in the JNVST 2027 pattern:',
      hi: 'उसके बाकी भाग JNVST 2027 के पैटर्न में नहीं हैं:',
    },
    dropped: DROPPED,
    answerKey: {
      en: 'We did not find an official answer key for the 2026 paper, so none is linked.',
      hi: 'हमें 2026 के प्रश्न-पत्र की आधिकारिक उत्तर-कुंजी नहीं मिली, इसलिए कोई लिंक नहीं दिया गया।',
    },
  },
  faq: FAQ,
  sources: [
    { label: 'NVS, Prospectus cum Notification for JNVST 2027 (Class VI), sections 5–7', url: PROSPECTUS },
    { label: 'NVS, JNVST 2026 question paper (English), Section I', url: PAPER_2026 },
  ],
};

if (page.title.length > TITLE_MAX) throw new Error(`title is ${page.title.length} characters`);
if (page.description.length > DESCRIPTION_MAX) throw new Error(`description is ${page.description.length} characters`);
const json = `${JSON.stringify(page, null, 2)}\n`;
for (const file of OUT) {
  fs.mkdirSync(path.dirname(path.join(ROOT, file)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, file), json);
}
console.log(`Mental Ability page: ${PARTS.length} parts, ${examples.length} examples (${examples.map((e) => `${e.topic} ${'ABCD'[e.answer]}`).join(', ')}), `
  + `${FAQ.length} questions; title ${page.title.length}, description ${page.description.length} characters; written to ${OUT.join(' and ')}`);
