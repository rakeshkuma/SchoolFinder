/**
 * AISSEE Class VI preparation content, in English and Hindi, for the shared preparation page. The exam pattern and the
 * syllabus are NOT copied here: the page reads them from the existing AISSEE exam data (exams.json → /api/v1/exams/aissee),
 * so the guide stays the single source of truth. Practice topics below are the topic names of the questions in the
 * bank (tools/practice/aissee), each a part of a syllabus line.
 */
import type { ExamDetail } from '../types/api';
import type { Bi, PatternRow, PrepConfig, PrepSection, PrepTexts, RoadmapStage } from './examPrep';
import { T as JT } from './jnvstPrep';

const LEVEL = 'Class V–VI';
const BULLETIN = 'https://cdnbbsr.s3waas.gov.in/s388a839f2f6f1427879fc33ee4acf4f66/uploads/2025/10/20251010937989896.pdf';
const tp = (topic: string, en: string, hi: string, lang?: 'en' | 'hi') => ({ topic, label: { en, hi }, ...(lang ? { lang } : {}) });
const session = (q: Record<string, string>) => `/exams/practice/session?${new URLSearchParams({ exam: 'aissee', level: LEVEL, ...q })}`;

const SECTIONS: PrepSection[] = [
  {
    key: 'language', section: 'Language (English)', syllabusArea: 'Class VI Language', icon: 'book', tone: 'from-accent-600 to-accent-400',
    variants: [{ section: 'Language (English)', label: { en: 'English', hi: 'अंग्रेज़ी' } }, { section: 'Language (Hindi)', label: { en: 'Hindi', hi: 'हिंदी' } }],
    name: { en: 'Language', hi: 'भाषा' }, questions: 25, marks: 50,
    about: { en: 'Answered in the medium you choose. A passage plus grammar and vocabulary, in English or in Hindi.', hi: 'आपके चुने माध्यम में। एक गद्यांश तथा व्याकरण और शब्द-ज्ञान, अंग्रेज़ी या हिंदी में।' },
    topics: [
      tp('Comprehension', 'Comprehension', 'अपठित गद्यांश', 'en'), tp('Synonyms', 'Synonyms', 'Synonyms', 'en'), tp('Antonyms', 'Antonyms', 'Antonyms', 'en'),
      tp('Idioms and phrases', 'Idioms and phrases', 'Idioms', 'en'), tp('Vocabulary', 'Vocabulary', 'Vocabulary', 'en'), tp('Parts of speech', 'Parts of speech', 'Parts of speech', 'en'),
      tp('Articles', 'Articles', 'Articles', 'en'), tp('Prepositions', 'Prepositions', 'Prepositions', 'en'), tp('Tenses', 'Tenses', 'Tenses', 'en'),
      tp('Types of sentences', 'Types of sentences', 'Types of sentences', 'en'), tp('Question tags', 'Question tags', 'Question tags', 'en'), tp('Word order', 'Word order', 'Word order', 'en'),
      tp('Spelling', 'Spelling', 'Spelling', 'en'), tp('Confusing words', 'Confusing words', 'Confusing words', 'en'), tp('Gender', 'Gender', 'Gender', 'en'),
      tp('Number', 'Singular and plural', 'Singular and plural', 'en'), tp('Collective nouns', 'Collective nouns', 'Collective nouns', 'en'), tp('Rhyming words', 'Rhyming words', 'Rhyming words', 'en'),
      tp('अपठित गद्यांश', 'Comprehension (Hindi)', 'अपठित गद्यांश', 'hi'), tp('पर्यायवाची', 'Synonyms (Hindi)', 'पर्यायवाची', 'hi'), tp('विलोम', 'Antonyms (Hindi)', 'विलोम', 'hi'),
      tp('मुहावरे', 'Idioms (Hindi)', 'मुहावरे', 'hi'), tp('शब्द-भंडार', 'Vocabulary (Hindi)', 'शब्द-भंडार', 'hi'), tp('संज्ञा', 'Nouns (Hindi)', 'संज्ञा', 'hi'),
      tp('शब्द-भेद', 'Parts of speech (Hindi)', 'शब्द-भेद', 'hi'), tp('काल', 'Tenses (Hindi)', 'काल', 'hi'), tp('वाक्य', 'Sentences (Hindi)', 'वाक्य', 'hi'),
      tp('शब्द-क्रम', 'Word order (Hindi)', 'शब्द-क्रम', 'hi'), tp('वर्तनी', 'Spelling (Hindi)', 'वर्तनी', 'hi'), tp('लिंग', 'Gender (Hindi)', 'लिंग', 'hi'),
      tp('वचन', 'Number (Hindi)', 'वचन', 'hi'), tp('भ्रामक शब्द', 'Confusing words (Hindi)', 'भ्रामक शब्द', 'hi'), tp('तुकांत शब्द', 'Rhyming words (Hindi)', 'तुकांत शब्द', 'hi'),
    ],
    tips: [
      { en: 'Choose your language medium early and practise only in it; it cannot be changed in the exam hall.', hi: 'भाषा का माध्यम पहले ही चुन लीजिए और उसी में अभ्यास कीजिए; परीक्षा भवन में इसे बदला नहीं जा सकता।' },
      { en: 'Read the passage questions first, then find each answer in the text.', hi: 'पहले गद्यांश के प्रश्न पढ़िए, फिर हर उत्तर पाठ में खोजिए।' },
    ],
  },
  {
    key: 'maths', section: 'Mathematics', syllabusArea: 'Class VI Mathematics', icon: 'chart', tone: 'from-brand-600 to-brand-400',
    name: { en: 'Mathematics', hi: 'गणित' }, questions: 50, marks: 150,
    about: { en: '3 marks a question — half of the 300 marks. Word problems on everyday situations.', hi: 'हर प्रश्न 3 अंक का — 300 में से आधे अंक। रोज़मर्रा की स्थितियों पर शाब्दिक प्रश्न।' },
    topics: [
      tp('Natural numbers', 'Natural numbers', 'प्राकृत संख्याएँ'), tp('LCM and HCF', 'LCM and HCF', 'ल.स. और म.स.'), tp('Unitary method', 'Unitary method', 'ऐकिक नियम'),
      tp('Fractions', 'Fractions', 'भिन्न'), tp('Arranging fractions', 'Arranging fractions', 'भिन्नों का क्रम'), tp('Ratio and proportion', 'Ratio and proportion', 'अनुपात और समानुपात'),
      tp('Profit and loss', 'Profit and loss', 'लाभ और हानि'), tp('Simplification', 'Simplification', 'सरलीकरण'), tp('Average', 'Average', 'औसत'),
      tp('Percentage', 'Percentage', 'प्रतिशत'), tp('Simple interest', 'Simple interest', 'साधारण ब्याज'), tp('Area and perimeter', 'Area and perimeter', 'क्षेत्रफल और परिमाप'),
      tp('Lines and angles', 'Lines and angles', 'रेखाएँ और कोण'), tp('Plane figures', 'Plane figures', 'समतल आकृतियाँ'), tp('Circle', 'Circle', 'वृत्त'),
      tp('Conversion of units', 'Conversion of units', 'इकाइयों का रूपांतरण'), tp('Roman numerals', 'Roman numerals', 'रोमन अंक'), tp('Volume of cube and cuboid', 'Volume of cube and cuboid', 'घन और घनाभ का आयतन'),
      tp('Prime and composite numbers', 'Prime and composite numbers', 'अभाज्य और भाज्य संख्याएँ'), tp('Decimals', 'Decimals', 'दशमलव'), tp('Speed and time', 'Speed and time', 'चाल और समय'),
      tp('Temperature', 'Temperature', 'तापमान'),
    ],
    tips: [
      { en: 'Learn tables to 20, squares to 25 and the formulas for area, volume, profit and simple interest.', hi: '20 तक पहाड़े, 25 तक वर्ग और क्षेत्रफल, आयतन, लाभ व साधारण ब्याज के सूत्र याद कीजिए।' },
      { en: 'Write units at every step and check the answer against the question.', hi: 'हर चरण में इकाई लिखिए और उत्तर को प्रश्न से मिलाइए।' },
    ],
  },
  {
    key: 'intelligence', section: 'Intelligence', syllabusArea: 'Class VI Intelligence', icon: 'target', tone: 'from-violet-600 to-violet-400',
    name: { en: 'Intelligence', hi: 'बुद्धिमत्ता' }, questions: 25, marks: 50,
    about: { en: 'Verbal and non-verbal reasoning: series, analogies, coding, relations and figures.', hi: 'शाब्दिक और अशाब्दिक तर्क: श्रेणी, सादृश्य, कूट, संबंध और आकृतियाँ।' },
    topics: [
      tp('Series and sequences', 'Series and sequences', 'श्रेणी और क्रम'), tp('Analogies', 'Analogies', 'सादृश्यता'), tp('Classification', 'Classification', 'वर्गीकरण'),
      tp('Patterns', 'Patterns', 'पैटर्न'), tp('Visual reasoning', 'Visual reasoning', 'दृश्य तर्क'), tp('Logical reasoning', 'Logical reasoning', 'तार्किक तर्क'),
      tp('Coding and decoding', 'Coding and decoding', 'कूट-लेखन'), tp('Mathematical operations', 'Mathematical operations', 'गणितीय संक्रियाएँ'), tp('Familial relations', 'Familial relations', 'पारिवारिक संबंध'),
    ],
    tips: [
      { en: 'Find the rule first, then test it on every term before choosing.', hi: 'पहले नियम खोजिए, फिर चुनने से पहले हर पद पर जाँचिए।' },
      { en: 'For family questions, draw a small family tree.', hi: 'पारिवारिक संबंध के प्रश्नों में छोटा-सा वंश-वृक्ष बनाइए।' },
    ],
  },
  {
    key: 'gk', section: 'General Knowledge', syllabusArea: 'Class VI General Knowledge', icon: 'globe', tone: 'from-emerald-600 to-emerald-400',
    name: { en: 'General Knowledge', hi: 'सामान्य ज्ञान' }, questions: 25, marks: 50,
    about: { en: 'India, defence, sports, the earth and everyday science, as listed in the syllabus.', hi: 'पाठ्यक्रम के अनुसार भारत, रक्षा, खेल, पृथ्वी और दैनिक विज्ञान।' },
    topics: [
      tp('National symbols', 'National symbols', 'राष्ट्रीय प्रतीक'), tp('India at a glance', 'India at a glance', 'भारत एक नज़र में'), tp('Art and culture', 'Art and culture', 'कला और संस्कृति'),
      tp('Awards', 'Awards', 'पुरस्कार'), tp('Personalities', 'Personalities', 'व्यक्तित्व'), tp('Indian defence', 'Indian defence', 'भारतीय रक्षा'),
      tp('Sports', 'Sports', 'खेल'), tp('Organisations', 'Organisations', 'संगठन'), tp('Solar system and earth', 'Solar system and earth', 'सौरमंडल और पृथ्वी'),
      tp('Mountains', 'Mountains', 'पर्वत'), tp('Water cycle', 'Water cycle', 'जल चक्र'), tp('Energy', 'Energy', 'ऊर्जा'),
      tp('Climate and natural calamities', 'Climate and natural calamities', 'जलवायु और प्राकृतिक आपदाएँ'), tp('Water in daily life', 'Water in daily life', 'दैनिक जीवन में जल'),
      tp('Digestion and food preservation', 'Digestion and food preservation', 'पाचन और भोजन संरक्षण'), tp('Farming', 'Farming', 'खेती'),
      tp('Tribal communities and forests', 'Tribal communities and forests', 'जनजातियाँ और वन'), tp('Scientific devices', 'Scientific devices', 'वैज्ञानिक उपकरण'),
      tp('Water pollution and diseases', 'Water pollution and diseases', 'जल प्रदूषण और रोग'), tp('Humans, plants and animals', 'Humans, plants and animals', 'मनुष्य, पौधे और जीव'),
    ],
    tips: [
      { en: 'Keep a GK notebook and revise it every week.', hi: 'सामान्य ज्ञान की एक कॉपी बनाइए और हर सप्ताह दोहराइए।' },
      { en: 'Learn the defence basics: academies, ranks, days and gallantry awards.', hi: 'रक्षा की मूल बातें सीखिए: अकादमियाँ, पद, दिवस और वीरता पुरस्कार।' },
    ],
  },
];

const ROADMAP: RoadmapStage[] = [
  {
    title: { en: 'Beginner: know the exam', hi: 'शुरुआत: परीक्षा को जानिए' }, weeks: { en: 'Week 1', hi: 'सप्ताह 1' },
    steps: [
      { en: 'Read the pattern, eligibility and the NTA bulletin', hi: 'पैटर्न, पात्रता और NTA बुलेटिन पढ़िए' },
      { en: 'Choose your language medium', hi: 'अपनी भाषा का माध्यम चुनिए' },
      { en: 'Take one quiz in each section to see where you stand', hi: 'अपनी स्थिति जानने के लिए हर खंड का एक क्विज़ दीजिए' },
    ],
    to: '/exams/aissee/guide', action: { en: 'Read the guide', hi: 'गाइड पढ़िए' },
  },
  {
    title: { en: 'Subject-wise preparation', hi: 'विषयवार तैयारी' }, weeks: { en: 'Weeks 2–5', hi: 'सप्ताह 2–5' },
    steps: [
      { en: 'Mathematics every day: it carries 150 of 300 marks', hi: 'गणित रोज़: 300 में से 150 अंक इसी के हैं' },
      { en: 'Alternate Intelligence, Language and GK on the other days', hi: 'बाकी दिनों बुद्धिमत्ता, भाषा और सामान्य ज्ञान बारी-बारी से' },
    ],
    to: session({ mode: 'TOPIC', section: 'Mathematics', count: '20', timer: '1' }), action: { en: 'Practise Mathematics', hi: 'गणित का अभ्यास' },
  },
  {
    title: { en: 'Topic-wise learning', hi: 'विषय-बिंदुवार अध्ययन' }, weeks: { en: 'Weeks 4–7', hi: 'सप्ताह 4–7' },
    steps: [
      { en: 'One syllabus topic at a time, easy then medium', hi: 'एक बार में पाठ्यक्रम का एक बिंदु, पहले आसान फिर मध्यम' },
      { en: 'Read the explanation for every wrong answer', hi: 'हर गलत उत्तर की व्याख्या पढ़िए' },
    ],
    to: session({ mode: 'TOPIC', section: 'Mathematics', topic: 'LCM and HCF', count: '10' }), action: { en: 'Start with LCM and HCF', hi: 'ल.स. और म.स. से शुरू करें' },
  },
  {
    title: { en: 'Daily practice', hi: 'दैनिक अभ्यास' }, weeks: { en: 'Every day', hi: 'हर दिन' },
    steps: [
      { en: 'The 10-question daily quiz, timed', hi: 'समयबद्ध 10 प्रश्नों का दैनिक क्विज़' },
      { en: '20 Intelligence questions a day', hi: 'रोज़ 20 बुद्धिमत्ता प्रश्न' },
    ],
    to: session({ mode: 'DAILY', timer: '1' }), action: { en: "Today's quiz", hi: 'आज का क्विज़' },
  },
  {
    title: { en: 'Weekly revision', hi: 'साप्ताहिक दोहराई' }, weeks: { en: 'Every Sunday', hi: 'हर रविवार' },
    steps: [
      { en: 'Retry the week\'s wrong answers', hi: 'सप्ताह के गलत उत्तर दोबारा हल कीजिए' },
      { en: 'Revise the GK notebook', hi: 'सामान्य ज्ञान की कॉपी दोहराइए' },
    ],
    to: '/exams/practice/session?mode=REVISION', action: { en: 'Revise my mistakes', hi: 'मेरी गलतियाँ दोहराएँ' },
  },
  {
    title: { en: 'Mock test preparation', hi: 'मॉक टेस्ट की तैयारी' }, weeks: { en: 'Weeks 8–11', hi: 'सप्ताह 8–11' },
    steps: [
      { en: '125 questions in 150 minutes, at the real exam time', hi: 'असली परीक्षा के समय पर 150 मिनट में 125 प्रश्न' },
      { en: 'There is no negative marking: attempt every question', hi: 'ऋणात्मक अंकन नहीं है: हर प्रश्न का उत्तर दीजिए' },
    ],
    to: '/exams/practice/aissee-class6-mock-1', action: { en: 'Start mock test 1', hi: 'मॉक टेस्ट 1 शुरू करें' },
  },
  {
    title: { en: 'Final revision', hi: 'अंतिम दोहराई' }, weeks: { en: 'Last two weeks', hi: 'अंतिम दो सप्ताह' },
    steps: [
      { en: 'Weak topics, bookmarked questions and formulas', hi: 'कमज़ोर विषय, बुकमार्क किए प्रश्न और सूत्र' },
      { en: 'Keep the admit card and documents ready; check the medical standards', hi: 'प्रवेश पत्र और दस्तावेज़ तैयार रखिए; चिकित्सा मानक देख लीजिए' },
    ],
    to: '/exams/practice/progress', action: { en: 'See my progress', hi: 'मेरी प्रगति देखें' },
  },
];

const T: PrepTexts = {
  ...JT,
  eyebrow: { en: 'AISSEE Class VI preparation', hi: 'AISSEE कक्षा 6 की तैयारी' },
  title: { en: 'AISSEE Class 6 Preparation 2027', hi: 'AISSEE कक्षा 6 की तैयारी 2027' },
  subtitle: {
    en: 'Free practice for the All India Sainik Schools Entrance Examination: original questions in English and Hindi, full mock tests in the Class VI pattern, and a study plan.',
    hi: 'अखिल भारतीय सैनिक स्कूल प्रवेश परीक्षा की मुफ़्त तैयारी: अंग्रेज़ी और हिंदी में मौलिक प्रश्न, कक्षा 6 के पैटर्न में पूर्ण मॉक टेस्ट और अध्ययन योजना।',
  },
  examIn: { en: 'Entrance exam (AISSEE 2027)', hi: 'प्रवेश परीक्षा (AISSEE 2027)' },
  pattern: { en: 'Class VI exam pattern', hi: 'कक्षा 6 का परीक्षा पैटर्न' },
  patternNote: {
    en: 'One OMR paper. Mathematics carries 3 marks a question and the other sections 2 marks each; no marks are deducted for wrong answers. The question paper is bilingual, and the language section is answered in the medium you choose.',
    hi: 'एक OMR प्रश्न-पत्र। गणित के हर प्रश्न पर 3 अंक और बाकी खंडों में 2-2 अंक; गलत उत्तर पर अंक नहीं कटते। प्रश्न-पत्र द्विभाषी है और भाषा खंड आपके चुने माध्यम में होता है।',
  },
  mocksHelp: {
    en: '125 questions, 300 marks, 150 minutes, in the order of the pattern above. Mock 1 has the language section in English, mock 2 in Hindi; the other sections can be read in either language at any time.',
    hi: '125 प्रश्न, 300 अंक, 150 मिनट, ऊपर दिए पैटर्न के क्रम में। मॉक 1 में भाषा खंड अंग्रेज़ी में, मॉक 2 में हिंदी में है; बाकी खंड कभी भी किसी भी भाषा में पढ़े जा सकते हैं।',
  },
  roadmapHelp: { en: 'A plan for about twelve weeks. Start wherever you are; the stages can overlap.', hi: 'लगभग बारह सप्ताह की योजना। जहाँ हैं वहीं से शुरू कीजिए; चरण साथ-साथ चल सकते हैं।' },
  progress: { en: 'Your AISSEE progress', hi: 'आपकी AISSEE प्रगति' },
  progressEmpty: {
    en: 'No AISSEE Class VI practice on this device yet. Your scores, section accuracy, syllabus covered and a suggestion for what to practise next will appear here after your first quiz.',
    hi: 'इस डिवाइस पर अभी कोई AISSEE कक्षा 6 अभ्यास नहीं। पहले क्विज़ के बाद आपके अंक, खंडवार सटीकता, पढ़ा गया पाठ्यक्रम और अगले अभ्यास का सुझाव यहाँ दिखेगा।',
  },
  originality: {
    en: 'All practice questions on this page are written by SchoolDhundo in the style of the AISSEE Class VI paper. They are not official or previous-year questions, and practice scores do not predict selection. Official papers and answer keys are linked from the AISSEE guide, never copied.',
    hi: 'इस पृष्ठ के सभी अभ्यास प्रश्न SchoolDhundo ने AISSEE कक्षा 6 के प्रश्न-पत्र की शैली में लिखे हैं। ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं, और अभ्यास के अंक चयन का अनुमान नहीं हैं। आधिकारिक प्रश्न-पत्र और उत्तर कुंजियाँ AISSEE गाइड में लिंक हैं, नकल नहीं की गईं।',
  },
  guide: { en: 'Eligibility, dates and answer keys', hi: 'पात्रता, तिथियाँ और उत्तर कुंजियाँ' },
  noDates: { en: 'NTA has not announced the AISSEE 2027 dates yet; last year\'s dates are in the guide.', hi: 'NTA ने अभी AISSEE 2027 की तिथियाँ घोषित नहीं की हैं; पिछले वर्ष की तिथियाँ गाइड में हैं।' },
  syllabus: { en: 'Syllabus', hi: 'पाठ्यक्रम' },
  coverage: { en: 'Practice topics tried', hi: 'अभ्यास किए गए विषय' },
};

const NAME_HI: Record<string, string> = { Language: 'भाषा', Mathematics: 'गणित', Intelligence: 'बुद्धिमत्ता', 'General Knowledge': 'सामान्य ज्ञान' };

/** The Class VI pattern exactly as stored for the AISSEE guide (the entry whose title starts "Class VI"). */
function table(lang: 'en' | 'hi', detail: ExamDetail | null) {
  const p = detail?.content.pattern.find((x) => x.title.startsWith('Class VI'));
  const rows: PatternRow[] = (p?.sections ?? []).map((s, i) => ({
    label: `${i + 1}. ${lang === 'hi' ? NAME_HI[s.name] ?? s.name : s.name}`, questions: s.questions ?? '–', marks: s.marks ?? '–', minutes: s.duration ?? '–',
  }));
  const minutes = p?.title.match(/(\d+)\s*minutes/)?.[1];
  return {
    rows,
    total: {
      questions: p ? p.sections.reduce((n, s) => n + (s.questions ?? 0), 0) : '–',
      marks: p ? p.sections.reduce((n, s) => n + (s.marks ?? 0), 0) : '–',
      minutes: minutes ? `${minutes} min` : '–',
    },
  };
}

export const AISSEE_PREP: PrepConfig = {
  exam: 'aissee',
  level: LEVEL,
  setPrefix: 'aissee-class6-',
  coverage: true,
  docTitle: 'AISSEE Class 6 Preparation 2027 – Free Sainik School Mock Tests, Practice Questions and Study Plan',
  breadcrumb: 'AISSEE',
  firstMock: 'aissee-class6-mock-1',
  T,
  sections: SECTIONS,
  roadmap: ROADMAP,
  heroStats: [[125, JT.questions], [300, JT.marks], ['150 min', JT.minutes]],
  examDateFallback: { en: 'Not announced yet', hi: 'अभी घोषित नहीं' },
  mockLine: (m, t) => `${m.questionCount} ${t(JT.questions)} · ${m.durationMinutes} min · 300 ${t(JT.marks)}`,
  links: [
    ['https://exams.nta.nic.in/sainik-school-society/', { en: 'NTA AISSEE page', hi: 'NTA का AISSEE पृष्ठ' }],
    [BULLETIN, { en: 'AISSEE-2026 information bulletin (PDF)', hi: 'AISSEE-2026 सूचना बुलेटिन (PDF)' }],
    ['https://nta.ac.in/', { en: 'National Testing Agency', hi: 'राष्ट्रीय परीक्षा एजेंसी (NTA)' }],
  ],
  findSchools: { to: '/schools?network=SAINIK_SCHOOL', label: { en: 'Find Sainik Schools near you', hi: 'अपने पास के सैनिक स्कूल खोजें' } },
  pattern: {
    year: { en: 'Class VI, as listed in the AISSEE guide on SchoolDhundo (latest published bulletin: AISSEE-2026)', hi: 'कक्षा 6, SchoolDhundo की AISSEE गाइड के अनुसार (नवीनतम प्रकाशित बुलेटिन: AISSEE-2026)' },
    sourceLabel: 'NTA AISSEE-2026 information bulletin',
    sourceUrl: BULLETIN,
    checked: (detail) => detail?.exam.lastVerifiedOn ?? '2026-10-25',
    table,
  },
};

export type { Bi };
