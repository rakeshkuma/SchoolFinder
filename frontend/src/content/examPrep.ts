/** Shared shape of an exam preparation page (pages/ExamPrepPage.tsx); each exam fills it in its own *Prep.ts file. */
import type { ExamDetail, PracticeSetSummary } from '../types/api';

export type Lang = 'en' | 'hi';
export type Bi = Record<Lang, string>;

export type TextKey = 'eyebrow' | 'title' | 'subtitle' | 'startMock' | 'daily' | 'guide' | 'language' | 'examIn' | 'daysLeft'
  | 'pattern' | 'patternNote' | 'source' | 'checked' | 'sections' | 'questions' | 'marks' | 'inBank' | 'practiseSection'
  | 'quizzes' | 'qualifying' | 'tips' | 'smart' | 'smartHelp' | 'section' | 'allSections' | 'topic' | 'allTopics' | 'level'
  | 'anyLevel' | 'easy' | 'medium' | 'hard' | 'count' | 'timed' | 'start' | 'available' | 'mocks' | 'mocksHelp' | 'roadmap'
  | 'roadmapHelp' | 'progress' | 'progressEmpty' | 'attempts' | 'accuracy' | 'answered' | 'recent' | 'next' | 'nextWeak'
  | 'nextNew' | 'allProgress' | 'updates' | 'officialLinks' | 'originality' | 'total' | 'minutes' | 'part';
/** `noDates` is shown when the current cycle has no dates yet; `syllabus` labels the syllabus list in a section card. */
export type PrepTexts = Record<TextKey, Bi> & { noDates?: Bi; syllabus?: Bi; coverage?: Bi };

export interface PrepSection {
  key: string;
  /** the section name of this part's questions in the practice bank */
  section: string;
  /** when one part has several bank sections (e.g. the language paper in English or in Hindi) */
  variants?: { section: string; label?: Bi }[];
  name: Bi;
  icon: 'target' | 'sparkle' | 'chart' | 'book' | 'globe';
  tone: string;
  questions: number;
  marks: number;
  qualifying?: Bi;
  about: Bi;
  /** `lang` limits a topic to one page language (used for a language paper set in English or in Hindi) */
  topics: { topic: string; label: Bi; lang?: Lang }[];
  tips: Bi[];
  /** shows the exam's own syllabus entry whose area starts with this text (from the exam guide data, unchanged) */
  syllabusArea?: string;
}

export interface RoadmapStage {
  title: Bi;
  weeks: Bi;
  steps: Bi[];
  /** where the stage's main button goes */
  to: string;
  action: Bi;
}

export interface PatternRow { label: string; questions: string | number; marks: string | number; minutes: string; qualifying?: string }

export interface PrepConfig {
  exam: string;
  /** only bank questions of this level (an exam guide can cover more than one entry class) */
  level?: string;
  /** only practice sets whose slug starts with this */
  setPrefix?: string;
  /** shows how many practice topics the visitor has tried (the share of the syllabus covered) */
  coverage?: boolean;
  docTitle: string;
  breadcrumb: string;
  firstMock: string;
  T: PrepTexts;
  sections: PrepSection[];
  roadmap: RoadmapStage[];
  heroStats: [string | number, Bi][];
  examDateFallback: Bi;
  mockLine: (m: PracticeSetSummary, t: (b: Bi) => string) => string;
  links: [string, Bi][];
  findSchools: { to: string; label: Bi };
  pattern: {
    year: Bi;
    sourceLabel: string;
    sourceUrl: string;
    checked: (detail: ExamDetail | null) => string;
    table: (lang: Lang, detail: ExamDetail | null) => { rows: PatternRow[]; total: { questions: string | number; marks: string | number; minutes: string } };
  };
}
