/**
 * Netarhat Vidyalaya Class VI entrance preparation content, in English and Hindi, for the shared preparation page. The
 * exam pattern is NOT copied here: the page reads it from the Netarhat exam data (exams.json → /api/v1/exams/netarhat),
 * which follows the school's 2026-27 advertisement. Practice topics are the topic names of the questions in the bank
 * (tools/practice/netarhat).
 */
import type { ExamDetail } from '../types/api';
import type { PatternRow, PrepConfig, PrepSection, PrepTexts, RoadmapStage } from './examPrep';
import { T as JT } from './jnvstPrep';

const LEVEL = 'Class V';
const SITE = 'https://www.netarhatvidyalaya.com/';
const ADVERT = 'https://www.netarhatvidyalaya.com/master_login/dashboard/assest/file/140826_advt_net_2627_ntrht.pdf';
const tp = (topic: string, en: string, hi: string) => ({ topic, label: { en, hi } });
const session = (q: Record<string, string>) => `/exams/practice/session?${new URLSearchParams({ exam: 'netarhat', level: LEVEL, ...q })}`;

const SECTIONS: PrepSection[] = [
  {
    key: 'mental', section: 'Mental Ability', icon: 'target', tone: 'from-violet-600 to-violet-400',
    name: { en: 'Mental Ability', hi: 'मानसिक योग्यता' }, questions: 20, marks: 20,
    about: { en: 'Reasoning with numbers, letters and words: series, coding, analogies, directions, ranking, calendar and relations.', hi: 'संख्याओं, अक्षरों और शब्दों से तर्क: श्रेणी, कूट, सादृश्य, दिशा, क्रम, कैलेंडर और संबंध।' },
    topics: [
      tp('Number series', 'Number series', 'संख्या श्रेणी'), tp('Letter series', 'Letter series', 'अक्षर श्रेणी'), tp('Coding-decoding', 'Coding-decoding', 'कूट-लेखन'),
      tp('Odd one out', 'Odd one out', 'विषम को चुनिए'), tp('Analogy', 'Analogy', 'सादृश्यता'), tp('Direction sense', 'Direction sense', 'दिशा ज्ञान'),
      tp('Ranking', 'Ranking', 'क्रम-स्थान'), tp('Calendar', 'Calendar', 'कैलेंडर'), tp('Age problems', 'Age problems', 'आयु के प्रश्न'),
      tp('Missing number', 'Missing number', 'लुप्त संख्या'), tp('Alphabet test', 'Alphabet test', 'वर्णमाला'), tp('Blood relations', 'Blood relations', 'पारिवारिक संबंध'),
      tp('Counting', 'Counting', 'गिनती'), tp('Dictionary order', 'Dictionary order', 'शब्दकोश क्रम'),
    ],
    tips: [
      { en: 'Find the rule first, then check it on every term before you choose.', hi: 'पहले नियम खोजिए, फिर चुनने से पहले हर पद पर जाँचिए।' },
      { en: 'For directions and family questions, draw a quick sketch.', hi: 'दिशा और संबंध के प्रश्नों में झटपट चित्र बना लीजिए।' },
    ],
  },
  {
    key: 'hindi', section: 'Hindi', icon: 'book', tone: 'from-accent-600 to-accent-400',
    name: { en: 'Hindi', hi: 'हिंदी' }, questions: 20, marks: 20,
    about: { en: 'Asked in Hindi: word meanings, grammar and a short unseen passage, at Class 5 level.', hi: 'हिंदी में: शब्दों के अर्थ, व्याकरण और एक छोटा अपठित गद्यांश, कक्षा 5 के स्तर पर।' },
    topics: [
      tp('पर्यायवाची', 'Synonyms (पर्यायवाची)', 'पर्यायवाची'), tp('विलोम शब्द', 'Antonyms (विलोम)', 'विलोम शब्द'), tp('वचन', 'Singular and plural (वचन)', 'वचन'),
      tp('लिंग', 'Gender (लिंग)', 'लिंग'), tp('मुहावरे', 'Idioms (मुहावरे)', 'मुहावरे'), tp('वाक्यांश के लिए एक शब्द', 'One-word substitution', 'वाक्यांश के लिए एक शब्द'),
      tp('वर्तनी', 'Spelling (वर्तनी)', 'वर्तनी'), tp('अपठित गद्यांश', 'Unseen passage (अपठित गद्यांश)', 'अपठित गद्यांश'),
    ],
    tips: [
      { en: 'Learn ten synonyms, antonyms and idioms a day from your Class 5 Hindi book.', hi: 'कक्षा 5 की हिंदी पुस्तक से रोज़ दस पर्यायवाची, विलोम और मुहावरे याद कीजिए।' },
      { en: 'Read the passage questions first, then find each answer in the text.', hi: 'पहले गद्यांश के प्रश्न पढ़िए, फिर हर उत्तर पाठ में खोजिए।' },
    ],
  },
  {
    key: 'maths', section: 'Mathematics', icon: 'chart', tone: 'from-brand-600 to-brand-400',
    name: { en: 'Mathematics', hi: 'गणित' }, questions: 20, marks: 20,
    about: { en: 'Class 5 arithmetic: numbers, the four operations, LCM and HCF, fractions, decimals, measurement, time, money and word problems.', hi: 'कक्षा 5 का अंकगणित: संख्याएँ, चारों संक्रियाएँ, ल.स. और म.स., भिन्न, दशमलव, माप, समय, धन और शाब्दिक प्रश्न।' },
    topics: [
      tp('Place value', 'Place value', 'स्थानीय मान'), tp('Addition', 'Addition', 'जोड़'), tp('Subtraction', 'Subtraction', 'घटाव'),
      tp('Multiplication', 'Multiplication', 'गुणा'), tp('Division', 'Division', 'भाग'), tp('LCM', 'LCM', 'लघुत्तम समापवर्त्य (ल.स.)'),
      tp('HCF', 'HCF', 'महत्तम समापवर्तक (म.स.)'), tp('Fractions', 'Fractions', 'भिन्न'), tp('Decimals', 'Decimals', 'दशमलव'),
      tp('Perimeter', 'Perimeter', 'परिमाप'), tp('Area', 'Area', 'क्षेत्रफल'), tp('Time', 'Time', 'समय'), tp('Money', 'Money', 'धन'),
      tp('Measurement', 'Measurement', 'माप'), tp('Roman numerals', 'Roman numerals', 'रोमन अंक'), tp('Average', 'Average', 'औसत'),
      tp('Word problems', 'Word problems', 'शाब्दिक प्रश्न'), tp('Prime numbers', 'Prime numbers', 'अभाज्य संख्याएँ'), tp('Rounding', 'Rounding', 'पूर्णांकन'),
    ],
    tips: [
      { en: 'Learn tables to 20 and the rules for LCM, HCF, fractions and units.', hi: '20 तक पहाड़े और ल.स., म.स., भिन्न व इकाइयों के नियम याद कीजिए।' },
      { en: 'In Paper 2 marks go to the working, so practise writing every step.', hi: 'पेपर 2 में हल के चरणों पर अंक मिलते हैं, इसलिए हर चरण लिखने का अभ्यास कीजिए।' },
    ],
  },
  {
    key: 'science', section: 'Science', icon: 'sparkle', tone: 'from-emerald-600 to-emerald-400',
    name: { en: 'Science', hi: 'विज्ञान' }, questions: 20, marks: 20,
    about: { en: 'Plants, animals, the human body and health, materials, force and energy, light and sound, the Earth and space, and the environment.', hi: 'पौधे, जंतु, मानव शरीर और स्वास्थ्य, पदार्थ, बल और ऊर्जा, प्रकाश और ध्वनि, पृथ्वी और अंतरिक्ष, तथा पर्यावरण।' },
    topics: [
      tp('Plants', 'Plants', 'पौधे'), tp('Animals', 'Animals', 'जंतु'), tp('Human body', 'Human body', 'मानव शरीर'), tp('Health', 'Health', 'स्वास्थ्य'),
      tp('Matter', 'Matter', 'पदार्थ'), tp('Force and energy', 'Force and energy', 'बल और ऊर्जा'), tp('Light', 'Light', 'प्रकाश'), tp('Sound', 'Sound', 'ध्वनि'),
      tp('Earth and space', 'Earth and space', 'पृथ्वी और अंतरिक्ष'), tp('Environment', 'Environment', 'पर्यावरण'), tp('Water and weather', 'Water and weather', 'जल और मौसम'),
    ],
    tips: [
      { en: 'Learn the reason behind each fact (why leaves are green, why we see lightning first).', hi: 'हर तथ्य का कारण समझिए (पत्तियाँ हरी क्यों होती हैं, बिजली पहले क्यों दिखती है)।' },
      { en: 'For Paper 2, practise labelled diagrams of a plant, a flower and the human body.', hi: 'पेपर 2 के लिए पौधे, फूल और मानव शरीर के नामांकित चित्र बनाने का अभ्यास कीजिए।' },
    ],
  },
  {
    key: 'social', section: 'Social Studies', icon: 'globe', tone: 'from-teal-600 to-teal-400',
    name: { en: 'Social Studies', hi: 'सामाजिक अध्ययन' }, questions: 20, marks: 20,
    about: { en: 'Jharkhand, India\'s geography, history and government, maps and the globe, and the people and culture of our country.', hi: 'झारखंड, भारत का भूगोल, इतिहास और शासन, मानचित्र और ग्लोब, तथा देश के लोग और संस्कृति।' },
    topics: [
      tp('Jharkhand', 'Jharkhand', 'झारखंड'), tp('India: geography', 'India: geography', 'भारत का भूगोल'), tp('Maps and globe', 'Maps and globe', 'मानचित्र और ग्लोब'),
      tp('History', 'History', 'इतिहास'), tp('Our government', 'Our government', 'हमारी सरकार'), tp('Our country', 'Our country', 'हमारा देश'),
    ],
    tips: [
      { en: 'Know Jharkhand well: districts and divisions, rivers, waterfalls, minerals, tribes, festivals and freedom fighters.', hi: 'झारखंड को अच्छी तरह जानिए: ज़िले और प्रमंडल, नदियाँ, जलप्रपात, खनिज, जनजातियाँ, पर्व और स्वतंत्रता सेनानी।' },
      { en: 'Practise on an outline map of India and of Jharkhand.', hi: 'भारत और झारखंड के रेखा-मानचित्र पर अभ्यास कीजिए।' },
    ],
  },
];

const ROADMAP: RoadmapStage[] = [
  {
    title: { en: 'Know the exam', hi: 'परीक्षा को जानिए' }, weeks: { en: 'Week 1', hi: 'सप्ताह 1' },
    steps: [
      { en: 'Read the eligibility, the two papers and the selection stages', hi: 'पात्रता, दोनों प्रश्न-पत्र और चयन के चरण पढ़िए' },
      { en: 'Look through the school\'s official sample papers', hi: 'विद्यालय के आधिकारिक नमूना प्रश्न-पत्र देखिए' },
      { en: 'Take one quiz in each subject to see where you stand', hi: 'अपनी स्थिति जानने के लिए हर विषय का एक क्विज़ दीजिए' },
    ],
    to: '/exams/netarhat/guide#papers', action: { en: 'See the sample papers', hi: 'नमूना प्रश्न-पत्र देखें' },
  },
  {
    title: { en: 'Subject-wise preparation', hi: 'विषयवार तैयारी' }, weeks: { en: 'Weeks 2–5', hi: 'सप्ताह 2–5' },
    steps: [
      { en: 'Mathematics and Mental Ability every day', hi: 'गणित और मानसिक योग्यता रोज़' },
      { en: 'Hindi, Science and Social Studies in turn, from the Class 5 books', hi: 'कक्षा 5 की पुस्तकों से हिंदी, विज्ञान और सामाजिक अध्ययन बारी-बारी से' },
    ],
    to: session({ mode: 'TOPIC', section: 'Mathematics', count: '20', timer: '1' }), action: { en: 'Practise Mathematics', hi: 'गणित का अभ्यास' },
  },
  {
    title: { en: 'Daily practice', hi: 'दैनिक अभ्यास' }, weeks: { en: 'Every day', hi: 'हर दिन' },
    steps: [
      { en: 'The 10-question daily quiz, timed', hi: 'समयबद्ध 10 प्रश्नों का दैनिक क्विज़' },
      { en: 'Read the explanation for every wrong answer', hi: 'हर गलत उत्तर की व्याख्या पढ़िए' },
    ],
    to: session({ mode: 'DAILY', timer: '1' }), action: { en: "Today's quiz", hi: 'आज का क्विज़' },
  },
  {
    title: { en: 'Paper 2: written answers', hi: 'पेपर 2: लिखित उत्तर' }, weeks: { en: 'Weeks 3–8, twice a week', hi: 'सप्ताह 3–8, सप्ताह में दो बार' },
    steps: [
      { en: 'Hindi: a short essay, a letter and answers on an unseen passage', hi: 'हिंदी: छोटा निबंध, पत्र और अपठित गद्यांश पर उत्तर' },
      { en: 'Mathematics: show every step and write the unit in the answer', hi: 'गणित: हर चरण लिखिए और उत्तर में इकाई लिखिए' },
      { en: 'Science and Social Studies: answers of 2–4 sentences, diagrams and maps', hi: 'विज्ञान और सामाजिक अध्ययन: 2–4 वाक्यों के उत्तर, चित्र और मानचित्र' },
    ],
    to: '/exams/netarhat/guide#prep', action: { en: 'Preparation tips in the guide', hi: 'गाइड में तैयारी के सुझाव' },
  },
  {
    title: { en: 'Weekly revision', hi: 'साप्ताहिक दोहराई' }, weeks: { en: 'Every Sunday', hi: 'हर रविवार' },
    steps: [
      { en: 'Retry the week\'s wrong answers', hi: 'सप्ताह के गलत उत्तर दोबारा हल कीजिए' },
      { en: 'Revise Jharkhand facts, idioms and formulas', hi: 'झारखंड के तथ्य, मुहावरे और सूत्र दोहराइए' },
    ],
    to: '/exams/practice/session?mode=REVISION', action: { en: 'Revise my mistakes', hi: 'मेरी गलतियाँ दोहराएँ' },
  },
  {
    title: { en: 'Full mock tests', hi: 'पूर्ण मॉक टेस्ट' }, weeks: { en: 'Last 3–4 weeks', hi: 'अंतिम 3–4 सप्ताह' },
    steps: [
      { en: '100 questions in 2½ hours, starting at 10 a.m. like the real Paper 1', hi: 'असली पेपर 1 की तरह सुबह 10 बजे से 2½ घंटे में 100 प्रश्न' },
      { en: 'There is no negative marking: answer every question', hi: 'ऋणात्मक अंकन नहीं है: हर प्रश्न का उत्तर दीजिए' },
    ],
    to: '/exams/practice/netarhat-paper1-mock-1', action: { en: 'Start mock test 1', hi: 'मॉक टेस्ट 1 शुरू करें' },
  },
  {
    title: { en: 'Final revision', hi: 'अंतिम दोहराई' }, weeks: { en: 'Last week', hi: 'अंतिम सप्ताह' },
    steps: [
      { en: 'Weak topics and bookmarked questions only', hi: 'केवल कमज़ोर विषय और बुकमार्क किए प्रश्न' },
      { en: 'Keep the admit card ready and check your centre', hi: 'प्रवेश पत्र तैयार रखिए और अपना परीक्षा केंद्र देख लीजिए' },
    ],
    to: '/exams/practice/progress', action: { en: 'See my progress', hi: 'मेरी प्रगति देखें' },
  },
];

const T: PrepTexts = {
  ...JT,
  eyebrow: { en: 'Netarhat Vidyalaya Class VI entrance', hi: 'नेतरहाट विद्यालय कक्षा 6 प्रवेश परीक्षा' },
  title: { en: 'Netarhat Entrance Exam Preparation 2026-27', hi: 'नेतरहाट प्रवेश परीक्षा की तैयारी 2026-27' },
  subtitle: {
    en: 'Free practice for the Netarhat Vidyalaya Class 6 entrance test: original questions in Hindi and English for all five Paper 1 subjects, full mock tests in the 100-question pattern, help with the written Paper 2, and a study plan.',
    hi: 'नेतरहाट विद्यालय कक्षा 6 प्रवेश परीक्षा की मुफ़्त तैयारी: पेपर 1 के पाँचों विषयों के हिंदी और अंग्रेज़ी में मौलिक प्रश्न, 100 प्रश्नों के पैटर्न में पूर्ण मॉक टेस्ट, लिखित पेपर 2 की तैयारी और अध्ययन योजना।',
  },
  examIn: { en: 'Entrance exam (2026-27)', hi: 'प्रवेश परीक्षा (2026-27)' },
  pattern: { en: 'Exam pattern', hi: 'परीक्षा पैटर्न' },
  patternNote: {
    en: 'Both papers are on the same day. Paper 1 has 100 objective questions on an OMR sheet, 1 mark each, with no negative marking; it only short-lists 500 boys (five for each of the 100 seats). Paper 2 is written answers, and only the short-listed boys\' answer books are marked; its marks decide who is called for the physical and psychological test. Questions are at Class 5 level, in Hindi and English.',
    hi: 'दोनों प्रश्न-पत्र एक ही दिन होते हैं। पेपर 1 में OMR शीट पर 100 वस्तुनिष्ठ प्रश्न, हर प्रश्न 1 अंक का, कोई ऋणात्मक अंकन नहीं; इससे केवल 500 छात्र (100 सीटों में हर सीट के लिए पाँच) चुने जाते हैं। पेपर 2 लिखित उत्तरों का है और केवल चुने गए छात्रों की उत्तर-पुस्तिकाएँ जाँची जाती हैं; इसके अंकों से तय होता है कि शारीरिक और मनोवैज्ञानिक परीक्षा के लिए किसे बुलाया जाएगा। प्रश्न कक्षा 5 के स्तर के होते हैं, हिंदी और अंग्रेज़ी में।',
  },
  qualifying: { en: 'Used for', hi: 'उपयोग' },
  mocksHelp: {
    en: '100 questions, 100 marks, 2½ hours, in the order of Paper 1: Mental Ability, Hindi, Mathematics, Science, Social Studies. Hindi is in Hindi; switch the other subjects between English and Hindi at any time.',
    hi: '100 प्रश्न, 100 अंक, 2½ घंटे, पेपर 1 के क्रम में: मानसिक योग्यता, हिंदी, गणित, विज्ञान, सामाजिक अध्ययन। हिंदी खंड हिंदी में है; बाकी विषय कभी भी अंग्रेज़ी या हिंदी में पढ़ें।',
  },
  roadmapHelp: {
    en: 'A plan of about ten weeks. If the exam is close, do the daily quiz, the two mock tests and Paper 2 writing practice.',
    hi: 'लगभग दस सप्ताह की योजना। परीक्षा निकट हो तो दैनिक क्विज़, दोनों मॉक टेस्ट और पेपर 2 का लेखन अभ्यास कीजिए।',
  },
  progress: { en: 'Your Netarhat progress', hi: 'आपकी नेतरहाट प्रगति' },
  progressEmpty: {
    en: 'No Netarhat practice on this device yet. Your scores, subject accuracy, topics covered and a suggestion for what to practise next will appear here after your first quiz.',
    hi: 'इस डिवाइस पर अभी कोई नेतरहाट अभ्यास नहीं। पहले क्विज़ के बाद आपके अंक, विषयवार सटीकता, पढ़े गए विषय और अगले अभ्यास का सुझाव यहाँ दिखेगा।',
  },
  sections: { en: 'Prepare subject by subject', hi: 'विषय-दर-विषय तैयारी' },
  quizzes: { en: 'Quiz', hi: 'क्विज़' },
  originality: {
    en: 'All practice questions on this page are written by SchoolDhundo at the Class 5 level of the Netarhat entrance test. They are not official or previous-year questions, and practice scores do not predict selection. The school\'s own sample papers are linked from this page and the guide, never copied.',
    hi: 'इस पृष्ठ के सभी अभ्यास प्रश्न SchoolDhundo ने नेतरहाट प्रवेश परीक्षा के कक्षा 5 के स्तर पर लिखे हैं। ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं, और अभ्यास के अंक चयन का अनुमान नहीं हैं। विद्यालय के अपने नमूना प्रश्न-पत्र इस पृष्ठ और गाइड से लिंक हैं, नकल नहीं किए गए।',
  },
  guide: { en: 'Eligibility, dates and sample papers', hi: 'पात्रता, तिथियाँ और नमूना प्रश्न-पत्र' },
  noDates: { en: 'The school has not announced the next dates yet; earlier dates are in the guide.', hi: 'विद्यालय ने अभी अगली तिथियाँ घोषित नहीं की हैं; पिछली तिथियाँ गाइड में हैं।' },
  coverage: { en: 'Practice topics tried', hi: 'अभ्यास किए गए विषय' },
};

const NAME_HI: Record<string, string> = { 'Mental Ability': 'मानसिक योग्यता', Hindi: 'हिंदी', Mathematics: 'गणित', Science: 'विज्ञान', 'Social Studies': 'सामाजिक अध्ययन' };

/** Both papers exactly as stored for the Netarhat guide: "Paper 1 — Preliminary (qualifying), 10:00 a.m. – 12:30 p.m." etc. */
function table(lang: 'en' | 'hi', detail: ExamDetail | null) {
  const papers = (detail?.content.pattern ?? []).filter((p) => /^Paper [12]\b/.test(p.title));
  const rows: PatternRow[] = papers.flatMap((p) => {
    const first = p.title.startsWith('Paper 1');
    const time = p.title.split(',').slice(1).join(',').trim() || '–';
    const paper = lang === 'hi' ? (first ? 'पेपर 1 (वस्तुनिष्ठ)' : 'पेपर 2 (लिखित)') : (first ? 'Paper 1 (objective)' : 'Paper 2 (written)');
    const use = lang === 'hi' ? (first ? 'छँटाई (500 छात्र)' : 'मेरिट') : (first ? 'Short-list (500 boys)' : 'Merit');
    return p.sections.map((s) => ({
      label: `${paper} · ${lang === 'hi' ? NAME_HI[s.name] ?? s.name : s.name}`,
      questions: s.questions ?? (lang === 'hi' ? 'लिखित' : 'written'), marks: s.marks ?? '–', minutes: time, qualifying: use,
    }));
  });
  const sum = (title: string) => papers.find((p) => p.title.startsWith(title))?.sections.reduce((n, s) => n + (s.marks ?? 0), 0);
  const p1 = sum('Paper 1'), p2 = sum('Paper 2');
  return {
    rows,
    total: {
      questions: papers[0] ? papers[0].sections.reduce((n, s) => n + (s.questions ?? 0), 0) : '–',
      marks: p1 && p2 ? `${p1} + ${p2}` : p1 ?? '–',
      minutes: papers.length === 2 ? (lang === 'hi' ? '2 × 150 मिनट' : '2 × 150 min') : '–',
    },
  };
}

export const NETARHAT_PREP: PrepConfig = {
  exam: 'netarhat',
  level: LEVEL,
  setPrefix: 'netarhat-',
  coverage: true,
  docTitle: 'Netarhat Vidyalaya Entrance Exam 2026-27: Free Mock Tests',
  breadcrumb: 'Netarhat',
  firstMock: 'netarhat-paper1-mock-1',
  T,
  sections: SECTIONS,
  roadmap: ROADMAP,
  heroStats: [[100, JT.questions], [100, JT.marks], ['2½ h', JT.minutes]],
  examDateFallback: { en: 'Not announced yet', hi: 'अभी घोषित नहीं' },
  mockLine: (m, t) => `${m.questionCount} ${t(JT.questions)} · ${m.durationMinutes} min · ${m.questionCount} ${t(JT.marks)}`,
  links: [
    [SITE, { en: 'Netarhat Vidyalaya website', hi: 'नेतरहाट विद्यालय की वेबसाइट' }],
    [ADVERT, { en: '2026-27 admission advertisement (PDF, Hindi)', hi: '2026-27 प्रवेश विज्ञापन (PDF, हिंदी)' }],
    ['https://www.netarhatvidyalaya.com/gdln.php', { en: 'Official sample question papers', hi: 'आधिकारिक नमूना प्रश्न-पत्र' }],
  ],
  findSchools: { to: '/boarding/netarhat', label: { en: 'About Netarhat Vidyalaya', hi: 'नेतरहाट विद्यालय के बारे में' } },
  pattern: {
    year: { en: 'Session 2026-27, as listed in the Netarhat guide on SchoolDhundo', hi: 'सत्र 2026-27, SchoolDhundo की नेतरहाट गाइड के अनुसार' },
    sourceLabel: 'Netarhat Vidyalaya 2026-27 advertisement',
    sourceUrl: ADVERT,
    checked: (detail) => detail?.exam.lastVerifiedOn ?? '2026-10-25',
    table,
  },
};
