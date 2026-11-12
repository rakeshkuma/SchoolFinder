/**
 * JNVST Class VI preparation content, in English and Hindi. The section structure follows the NVS Prospectus cum
 * Notification for JNVST 2027 (sections 5–7); edit the roadmap and tips here without touching the page code.
 * `section` matches the section name of the questions in the practice bank (tools/practice/jnvst).
 */
export type Lang = 'en' | 'hi';
export type Bi = Record<Lang, string>;

export const JNVST_PROSPECTUS_URL = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf';
export const JNVST_PREVIOUS_PAPER_URL = 'https://cbseitms.rcil.gov.in/nvs/assets/pdf/PYQ_English_2026.pdf';
export const JNVST_PORTAL_URL = 'https://cbseitms.rcil.gov.in/nvs/';
/** The academic year the pattern below applies to, and when it was last checked against the prospectus. */
export const JNVST_PATTERN_YEAR = 'JNVST 2027 (admission to Class VI, session 2027-28)';
export const JNVST_PATTERN_CHECKED = '2026-11-12';

export interface JnvstSection {
  key: string;
  section: string;
  name: Bi;
  icon: 'target' | 'sparkle' | 'chart' | 'book';
  tone: string;
  questions: number;
  marks: number;
  minutes: string;
  qualifying: Bi;
  about: Bi;
  topics: { topic: string; label: Bi }[];
  tips: Bi[];
}

export const JNVST_SECTIONS: JnvstSection[] = [
  {
    key: 'mat', section: 'Mental Ability', icon: 'target', tone: 'from-violet-600 to-violet-400',
    name: { en: 'Mental Ability', hi: 'मानसिक योग्यता' }, questions: 20, marks: 25, minutes: '60 min with EVS',
    qualifying: { en: '14 marks in Section 1 (with EVS)', hi: 'खंड 1 (EVS सहित) में 14 अंक' },
    about: { en: 'Non-verbal: figures and diagrams only. Five parts of four questions each.', hi: 'अशाब्दिक: केवल आकृतियाँ और चित्र। चार-चार प्रश्नों के पाँच भाग।' },
    topics: [
      { topic: 'Pattern completion', label: { en: 'Pattern completion', hi: 'पैटर्न पूर्ति' } },
      { topic: 'Figure series', label: { en: 'Figure series', hi: 'आकृति श्रेणी' } },
      { topic: 'Geometrical figure completion', label: { en: 'Geometrical figure completion', hi: 'ज्यामितीय आकृति पूर्ति' } },
      { topic: 'Mirror image', label: { en: 'Mirror image', hi: 'दर्पण प्रतिबिंब' } },
      { topic: 'Water image', label: { en: 'Water image', hi: 'जल प्रतिबिंब' } },
      { topic: 'Embedded figure', label: { en: 'Embedded figure', hi: 'अंतर्निहित आकृति' } },
    ],
    tips: [
      { en: 'Look for one change at a time: turning, moving, adding or filling.', hi: 'एक बार में एक बदलाव खोजिए: घूमना, खिसकना, जुड़ना या भरना।' },
      { en: 'In a mirror on the right, left and right swap; top and bottom stay.', hi: 'दाईं ओर के दर्पण में बायाँ-दायाँ बदलता है; ऊपर-नीचे वही रहता है।' },
    ],
  },
  {
    key: 'evs', section: 'Environmental Studies', icon: 'sparkle', tone: 'from-emerald-600 to-emerald-400',
    name: { en: 'Environmental Studies (EVS)', hi: 'पर्यावरण अध्ययन (EVS)' }, questions: 20, marks: 25, minutes: '60 min with MAT',
    qualifying: { en: '14 marks in Section 1 (with Mental Ability)', hi: 'खंड 1 (मानसिक योग्यता सहित) में 14 अंक' },
    about: { en: '15 multiple-choice questions and one passage with five questions.', hi: '15 बहुविकल्पीय प्रश्न और पाँच प्रश्नों वाला एक गद्यांश।' },
    topics: [
      { topic: 'Natural world', label: { en: 'The natural world', hi: 'प्राकृतिक संसार' } },
      { topic: 'Human body', label: { en: 'The human body', hi: 'मानव शरीर' } },
      { topic: 'Science in daily life', label: { en: 'Science in daily life', hi: 'दैनिक जीवन में विज्ञान' } },
      { topic: 'Social surroundings', label: { en: 'Social surroundings', hi: 'सामाजिक परिवेश' } },
      { topic: 'Reading passage (EVS)', label: { en: 'EVS passage', hi: 'EVS गद्यांश' } },
    ],
    tips: [
      { en: 'Revise your Class 3–5 EVS books: water, food, plants, animals, India.', hi: 'कक्षा 3–5 की पर्यावरण अध्ययन की किताबें दोहराइए: जल, भोजन, पौधे, जीव, भारत।' },
      { en: 'For the passage, read the questions first, then the passage.', hi: 'गद्यांश के लिए पहले प्रश्न पढ़िए, फिर गद्यांश।' },
    ],
  },
  {
    key: 'arithmetic', section: 'Arithmetic', icon: 'chart', tone: 'from-brand-600 to-brand-400',
    name: { en: 'Arithmetic', hi: 'अंकगणित' }, questions: 20, marks: 25, minutes: '30 min',
    qualifying: { en: '7 marks', hi: '7 अंक' },
    about: { en: 'Twenty questions over the nine topics in the prospectus, testing understanding and use.', hi: 'प्रॉस्पेक्टस के नौ विषयों पर बीस प्रश्न, समझ और प्रयोग की जाँच।' },
    topics: [
      { topic: 'Number system', label: { en: 'Numbers and place value', hi: 'संख्याएँ और स्थानीय मान' } },
      { topic: 'Four operations', label: { en: 'Four operations', hi: 'चार मूल संक्रियाएँ' } },
      { topic: 'Factors and multiples', label: { en: 'Factors and multiples', hi: 'गुणनखंड और गुणज' } },
      { topic: 'Fractions', label: { en: 'Fractions', hi: 'भिन्न' } },
      { topic: 'Measurement', label: { en: 'Measurement, time and money', hi: 'माप, समय और धन' } },
      { topic: 'Simplification', label: { en: 'Simplification', hi: 'सरलीकरण' } },
      { topic: 'Perimeter and area', label: { en: 'Perimeter and area', hi: 'परिमाप और क्षेत्रफल' } },
      { topic: 'Angles and directions', label: { en: 'Angles and directions', hi: 'कोण और दिशाएँ' } },
      { topic: 'Data handling', label: { en: 'Bar graphs, tables, pictographs', hi: 'दंड आलेख, सारणी, चित्रालेख' } },
    ],
    tips: [
      { en: 'Only like fractions are added or subtracted; multiplication can be of unlike fractions.', hi: 'केवल समान भिन्नों का जोड़-घटाव आता है; गुणा असमान भिन्नों का भी हो सकता है।' },
      { en: 'Write units in every step: m, cm, kg, L, ₹.', hi: 'हर चरण में इकाई लिखिए: मी, सेमी, किग्रा, लीटर, ₹।' },
    ],
  },
  {
    key: 'language', section: 'Language', icon: 'book', tone: 'from-accent-600 to-accent-400',
    name: { en: 'Language', hi: 'भाषा' }, questions: 20, marks: 25, minutes: '30 min',
    qualifying: { en: '7 marks', hi: '7 अंक' },
    about: { en: 'Four passages with five questions each, in the language you choose for the test.', hi: 'पाँच-पाँच प्रश्नों वाले चार गद्यांश, उस भाषा में जो आप परीक्षा के लिए चुनें।' },
    topics: [{ topic: 'Reading comprehension', label: { en: 'Reading comprehension', hi: 'अपठित गद्यांश' } }],
    tips: [
      { en: 'Answers are in the passage: find the line, do not guess from memory.', hi: 'उत्तर गद्यांश में ही है: पंक्ति खोजिए, याद से अनुमान मत लगाइए।' },
      { en: 'Learn common opposites and similar words; they appear in every passage.', hi: 'आम विलोम और समानार्थी शब्द सीखिए; ये हर गद्यांश में आते हैं।' },
    ],
  },
];

export interface RoadmapStage {
  title: Bi;
  weeks: Bi;
  steps: Bi[];
  /** where the stage's main button goes */
  to: string;
  action: Bi;
}

const session = (q: Record<string, string>) => `/exams/practice/session?${new URLSearchParams({ exam: 'jnvst', ...q })}`;

export const JNVST_ROADMAP: RoadmapStage[] = [
  {
    title: { en: 'Understand the exam', hi: 'परीक्षा को समझिए' }, weeks: { en: 'Week 1', hi: 'सप्ताह 1' },
    steps: [
      { en: 'Read the official pattern and eligibility', hi: 'आधिकारिक पैटर्न और पात्रता पढ़िए' },
      { en: 'Note the qualifying marks: 14, 7 and 7', hi: 'न्यूनतम अंक याद रखिए: 14, 7 और 7' },
      { en: 'Try one quiz from each section to see where you stand', hi: 'अपनी स्थिति जानने के लिए हर खंड का एक क्विज़ हल कीजिए' },
    ],
    to: '/exams/jnvst/guide', action: { en: 'Read the guide', hi: 'गाइड पढ़िए' },
  },
  {
    title: { en: 'Learn the concepts', hi: 'अवधारणाएँ सीखिए' }, weeks: { en: 'Weeks 2–5', hi: 'सप्ताह 2–5' },
    steps: [
      { en: 'One Arithmetic topic and one EVS area each day', hi: 'हर दिन अंकगणित का एक विषय और EVS का एक क्षेत्र' },
      { en: 'Learn the five Mental Ability question types', hi: 'मानसिक योग्यता के पाँचों प्रश्न-प्रकार सीखिए' },
      { en: 'Read every explanation, even when you were right', hi: 'हर व्याख्या पढ़िए, सही होने पर भी' },
    ],
    to: session({ mode: 'TOPIC', section: 'Arithmetic', count: '10' }), action: { en: 'Practise a topic', hi: 'एक विषय का अभ्यास' },
  },
  {
    title: { en: 'Build accuracy', hi: 'सटीकता बढ़ाइए' }, weeks: { en: 'Weeks 6–8', hi: 'सप्ताह 6–8' },
    steps: [
      { en: 'Topic tests of 10–20 questions, easy and medium first', hi: '10–20 प्रश्नों के विषय-टेस्ट, पहले आसान और मध्यम' },
      { en: 'Retry every wrong answer the next day', hi: 'हर गलत उत्तर अगले दिन दोबारा हल कीजिए' },
    ],
    to: '/exams/practice/session?mode=REVISION', action: { en: 'Revise my mistakes', hi: 'मेरी गलतियाँ दोहराएँ' },
  },
  {
    title: { en: 'Improve speed', hi: 'गति बढ़ाइए' }, weeks: { en: 'Weeks 9–10', hi: 'सप्ताह 9–10' },
    steps: [
      { en: 'Timed section quizzes: 20 questions in 30 minutes', hi: 'समयबद्ध खंड-क्विज़: 30 मिनट में 20 प्रश्न' },
      { en: 'The daily 10-question quiz, every day', hi: 'रोज़ 10 प्रश्नों का दैनिक क्विज़' },
    ],
    to: session({ mode: 'DAILY', timer: '1' }), action: { en: "Today's quiz", hi: 'आज का क्विज़' },
  },
  {
    title: { en: 'Full mock tests', hi: 'पूर्ण मॉक टेस्ट' }, weeks: { en: 'Weeks 11–12', hi: 'सप्ताह 11–12' },
    steps: [
      { en: '80 questions in 2 hours, at 11:30 a.m. like the real test', hi: '2 घंटे में 80 प्रश्न, असली परीक्षा की तरह सुबह 11:30 बजे' },
      { en: 'Check section marks against 14, 7 and 7', hi: 'खंडवार अंकों को 14, 7 और 7 से मिलाइए' },
    ],
    to: '/exams/practice/jnvst-mock-1', action: { en: 'Start mock test 1', hi: 'मॉक टेस्ट 1 शुरू करें' },
  },
  {
    title: { en: 'Final revision', hi: 'अंतिम दोहराई' }, weeks: { en: 'Last two weeks', hi: 'अंतिम दो सप्ताह' },
    steps: [
      { en: 'Revise weak topics and bookmarked questions', hi: 'कमज़ोर विषय और बुकमार्क किए प्रश्न दोहराइए' },
      { en: 'Sleep well and keep the admit card ready', hi: 'अच्छी नींद लीजिए और प्रवेश पत्र तैयार रखिए' },
    ],
    to: '/exams/practice/progress', action: { en: 'See my progress', hi: 'मेरी प्रगति देखें' },
  },
];

/** Interface text of the preparation page. */
export const T = {
  eyebrow: { en: 'JNVST Class VI preparation', hi: 'JNVST कक्षा 6 की तैयारी' },
  title: { en: 'JNVST Class 6 Preparation 2027', hi: 'JNVST कक्षा 6 की तैयारी 2027' },
  subtitle: {
    en: 'Free practice for the Jawahar Navodaya Vidyalaya Selection Test: original questions in English and Hindi, full mock tests in the official pattern, and a study plan.',
    hi: 'जवाहर नवोदय विद्यालय चयन परीक्षा की मुफ़्त तैयारी: अंग्रेज़ी और हिंदी में मौलिक प्रश्न, आधिकारिक पैटर्न में पूर्ण मॉक टेस्ट और अध्ययन योजना।',
  },
  startMock: { en: 'Start a full mock test', hi: 'पूर्ण मॉक टेस्ट शुरू करें' },
  daily: { en: "Today's 10-question quiz", hi: 'आज का 10 प्रश्नों का क्विज़' },
  guide: { en: 'Eligibility, dates and FAQ', hi: 'पात्रता, तिथियाँ और प्रश्नोत्तर' },
  language: { en: 'Practice language', hi: 'अभ्यास की भाषा' },
  examIn: { en: 'Selection test', hi: 'चयन परीक्षा' },
  daysLeft: { en: 'days left', hi: 'दिन शेष' },
  pattern: { en: 'Official exam pattern', hi: 'आधिकारिक परीक्षा पैटर्न' },
  patternNote: {
    en: 'One test booklet, 11:30 a.m. to 1:30 p.m. 1.25 marks for each correct answer and no negative marking. You must reach the qualifying marks in all three sections. Divyang candidates get 40 extra minutes.',
    hi: 'एक ही परीक्षा पुस्तिका, सुबह 11:30 से दोपहर 1:30 तक। हर सही उत्तर पर 1.25 अंक, कोई ऋणात्मक अंकन नहीं। तीनों खंडों में न्यूनतम अंक लाना ज़रूरी है। दिव्यांग उम्मीदवारों को 40 मिनट अतिरिक्त मिलते हैं।',
  },
  source: { en: 'Source', hi: 'स्रोत' },
  checked: { en: 'checked', hi: 'जाँचा गया' },
  sections: { en: 'Prepare section by section', hi: 'खंड-दर-खंड तैयारी' },
  questions: { en: 'questions', hi: 'प्रश्न' },
  marks: { en: 'marks', hi: 'अंक' },
  inBank: { en: 'practice questions', hi: 'अभ्यास प्रश्न' },
  practiseSection: { en: 'Practise this section', hi: 'इस खंड का अभ्यास' },
  quizzes: { en: 'Section quizzes', hi: 'खंड क्विज़' },
  qualifying: { en: 'Qualifying', hi: 'न्यूनतम' },
  tips: { en: 'Tips', hi: 'सुझाव' },
  smart: { en: 'Build your own practice', hi: 'अपना अभ्यास बनाइए' },
  smartHelp: { en: 'Choose a section, topic, level and number of questions. Questions come from the original SchoolDhundo bank.', hi: 'खंड, विषय, स्तर और प्रश्नों की संख्या चुनिए। प्रश्न SchoolDhundo के मौलिक प्रश्न-बैंक से आते हैं।' },
  section: { en: 'Section', hi: 'खंड' },
  allSections: { en: 'All sections', hi: 'सभी खंड' },
  topic: { en: 'Topic', hi: 'विषय' },
  allTopics: { en: 'All topics', hi: 'सभी विषय' },
  level: { en: 'Level', hi: 'स्तर' },
  anyLevel: { en: 'Any level', hi: 'कोई भी स्तर' },
  easy: { en: 'Easy', hi: 'आसान' },
  medium: { en: 'Medium', hi: 'मध्यम' },
  hard: { en: 'Hard', hi: 'कठिन' },
  count: { en: 'Questions', hi: 'प्रश्न' },
  timed: { en: 'Timed (1.5 min a question)', hi: 'समयबद्ध (प्रति प्रश्न 1.5 मिनट)' },
  start: { en: 'Start practice', hi: 'अभ्यास शुरू करें' },
  available: { en: 'available', hi: 'उपलब्ध' },
  mocks: { en: 'Full-length mock tests', hi: 'पूर्ण लंबाई के मॉक टेस्ट' },
  mocksHelp: { en: '80 questions, 100 marks, 2 hours, in the order of the real booklet. Switch between English and Hindi at any time during the test.', hi: '80 प्रश्न, 100 अंक, 2 घंटे, असली पुस्तिका के क्रम में। परीक्षा के दौरान कभी भी अंग्रेज़ी और हिंदी के बीच बदलें।' },
  roadmap: { en: 'Preparation roadmap', hi: 'तैयारी की रूपरेखा' },
  roadmapHelp: { en: 'A twelve-week plan. Start wherever you are; the stages can overlap.', hi: 'बारह सप्ताह की योजना। जहाँ हैं वहीं से शुरू कीजिए; चरण साथ-साथ भी चल सकते हैं।' },
  progress: { en: 'Your JNVST progress', hi: 'आपकी JNVST प्रगति' },
  progressEmpty: { en: 'No JNVST practice on this device yet. Your scores, section accuracy and a suggestion for what to practise next will appear here after your first quiz.', hi: 'इस डिवाइस पर अभी कोई JNVST अभ्यास नहीं। पहले क्विज़ के बाद आपके अंक, खंडवार सटीकता और अगले अभ्यास का सुझाव यहाँ दिखेगा।' },
  attempts: { en: 'tests taken', hi: 'टेस्ट दिए' },
  accuracy: { en: 'accuracy', hi: 'सटीकता' },
  answered: { en: 'questions answered', hi: 'प्रश्न हल किए' },
  recent: { en: 'Recent tests', hi: 'हाल के टेस्ट' },
  next: { en: 'Recommended next', hi: 'अगला सुझाव' },
  nextWeak: { en: 'Your lowest accuracy is in', hi: 'आपकी सबसे कम सटीकता इसमें है:' },
  nextNew: { en: 'You have not practised this section yet:', hi: 'आपने अभी इस खंड का अभ्यास नहीं किया:' },
  allProgress: { en: 'Full progress report', hi: 'पूरी प्रगति रिपोर्ट' },
  updates: { en: 'Important dates', hi: 'महत्त्वपूर्ण तिथियाँ' },
  officialLinks: { en: 'Official links', hi: 'आधिकारिक लिंक' },
  prospectus: { en: 'JNVST 2027 prospectus (PDF)', hi: 'JNVST 2027 प्रॉस्पेक्टस (PDF)' },
  previousPaper: { en: 'Official previous question booklet (PDF)', hi: 'आधिकारिक पिछला प्रश्न-पत्र (PDF)' },
  portal: { en: 'NVS admission portal and admit card', hi: 'NVS प्रवेश पोर्टल और प्रवेश पत्र' },
  originality: {
    en: 'All practice questions on this page are written by SchoolDhundo in the style of the official pattern. They are not official or previous-year questions, and practice scores do not predict selection. Official papers are linked above, never copied.',
    hi: 'इस पृष्ठ के सभी अभ्यास प्रश्न SchoolDhundo ने आधिकारिक पैटर्न की शैली में लिखे हैं। ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं, और अभ्यास के अंक चयन का अनुमान नहीं हैं। आधिकारिक प्रश्न-पत्र ऊपर लिंक किए गए हैं, नकल नहीं किए गए।',
  },
  total: { en: 'Total', hi: 'कुल' },
  minutes: { en: 'Time', hi: 'समय' },
  part: { en: 'Section', hi: 'खंड' },
} satisfies Record<string, Bi>;
