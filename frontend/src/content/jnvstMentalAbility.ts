/**
 * The JNVST Mental Ability page (/exams/jnvst/mental-ability). Its content is jnvstMentalAbility.json, built by
 * tools/practice/jnvst/mental-ability-page.mjs, which writes the same file for the server
 * (backend/src/main/resources/content/jnvst-mental-ability.json): the server sends the page's head and its HTML for
 * crawlers from it, and a backend test fails if the two differ. Edit the builder and re-run it, not the JSON.
 * The interface labels below are the app's own.
 */
import type { PracticeFigure } from '../types/api';
import type { Bi } from './examPrep';
import data from './jnvstMentalAbility.json';

export interface MentalAbilityPart {
  /** "I" to "V", as the prospectus numbers them */
  part: string;
  /** the practice-bank topics of this part (Part IV has two) */
  topics: string[];
  /** its question numbers in the JNVST 2027 booklet, and in the JNVST 2026 paper */
  questions: string;
  paper2026: string;
  name: Bi;
  task: Bi;
  tip: Bi;
}

/** A worked example written for this page, not a practice-bank question, so its answer can be shown. */
export interface MentalAbilityExample {
  part: string;
  topic: string;
  difficulty: string;
  prompt: Bi;
  figure: PracticeFigure[];
  figureAsksNext: boolean;
  optionFigures: PracticeFigure[];
  answer: number;
  explanation: Bi;
}

export interface MentalAbilityContent {
  path: string;
  checkedOn: string;
  title: string;
  description: string;
  heading: Bi;
  intro: Bi;
  patternSource: { label: string; url: string };
  facts: { label: Bi; value: Bi }[];
  parts: MentalAbilityPart[];
  numberingNote: Bi;
  examples: MentalAbilityExample[];
  practiceHelp: Bi;
  mocksHelp: Bi;
  originality: Bi;
  officialPapers: { title: Bi; note: Bi; url: string }[];
  paper2026: { intro: Bi; mirrorNote: Bi; droppedIntro: Bi; dropped: { name: Bi; questions: string }[]; answerKey: Bi };
  faq: { q: Bi; a: Bi }[];
  sources: { label: string; url: string }[];
}

export const MENTAL_ABILITY = data as unknown as MentalAbilityContent;

/** Interface text of the page. */
export const MA_T = {
  eyebrow: { en: 'JNVST Class VI · Section 1', hi: 'JNVST कक्षा 6 · खंड 1' },
  language: { en: 'Page language', hi: 'पृष्ठ की भाषा' },
  start: { en: 'Start practice paper 1', hi: 'अभ्यास प्रश्न-पत्र 1 शुरू करें' },
  prepShort: { en: 'All JNVST sections', hi: 'JNVST के सभी खंड' },
  glance: { en: 'The test at a glance', hi: 'परीक्षा एक नज़र में' },
  pattern: { en: 'Pattern', hi: 'पैटर्न' },
  parts: { en: 'The five parts, with a worked example of each', hi: 'पाँच भाग, हर एक का हल किया हुआ उदाहरण' },
  part: { en: 'Part', hi: 'भाग' },
  questions: { en: 'questions', hi: 'प्रश्न' },
  tip: { en: 'Tip', hi: 'सुझाव' },
  example: { en: 'Worked example', hi: 'हल किया हुआ उदाहरण' },
  problem: { en: 'Problem figure', hi: 'समस्या आकृति' },
  answerFigures: { en: 'Answer figures', hi: 'उत्तर आकृतियाँ' },
  showAnswer: { en: 'Show the answer', hi: 'उत्तर देखें' },
  hideAnswer: { en: 'Hide the answer', hi: 'उत्तर छिपाएँ' },
  answer: { en: 'Answer: figure', hi: 'उत्तर: आकृति' },
  figure: { en: 'Figure', hi: 'आकृति' },
  inPaper: { en: 'In the official 2026 paper: questions', hi: '2026 के आधिकारिक प्रश्न-पत्र में: प्रश्न' },
  practiseType: { en: 'Practise this type', hi: 'इस प्रकार का अभ्यास' },
  practice: { en: 'Free practice papers', hi: 'मुफ़्त अभ्यास प्रश्न-पत्र' },
  minutes: { en: 'min', hi: 'मिनट' },
  mocks: { en: 'Full mock tests', hi: 'पूर्ण मॉक टेस्ट' },
  official: { en: 'Official question papers', hi: 'आधिकारिक प्रश्न-पत्र' },
  faq: { en: 'Questions parents ask', hi: 'अभिभावकों के प्रश्न' },
  sources: { en: 'Sources', hi: 'स्रोत' },
  checked: { en: 'Checked against these sources on', hi: 'इन स्रोतों से जाँच की तिथि:' },
  prep: { en: 'JNVST preparation: every section, full mock tests and a study plan', hi: 'JNVST तैयारी: सभी खंड, पूर्ण मॉक टेस्ट और अध्ययन योजना' },
  guide: { en: 'JNVST eligibility, dates, syllabus and result', hi: 'JNVST पात्रता, तिथियाँ, पाठ्यक्रम और परिणाम' },
} satisfies Record<string, Bi>;
