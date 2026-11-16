// Text for the Olympiad preparation page (/exams/practice?category=OLYMPIAD). Exam facts were checked on the
// organisers' own pages on 16 Nov 2026; keep CHECKED_ON in step when they are checked again.

export const OLYMPIAD_TITLE = 'Olympiad Preparation & Practice';
/** The same title and description as the server's head for this page (SeoHeadService.OLYMPIAD_TITLE). */
export const OLYMPIAD_DOC_TITLE = 'Olympiad Preparation & Practice: Classes 1 to 10';
export const OLYMPIAD_DESCRIPTION = 'Free class-wise Olympiad practice for Classes 1 to 10: original Maths, Science, English, '
  + 'reasoning and IOQM-style questions, mock tests and explained answers.';
export const OLYMPIAD_SUBTITLE = 'Prepare smarter with class-wise Olympiad questions, topic practice, mock tests and detailed explanations.';
export const CHECKED_ON = '2026-11-16';

/** Subjects in the order students look for them, with how each is described on its card. */
export const SUBJECTS: { section: string; label: string; icon: 'calculator' | 'sparkle' | 'bookOpen' | 'layers' | 'crown'; blurb: string; advanced?: boolean }[] = [
  { section: 'Mathematics', label: 'Mathematics', icon: 'calculator', blurb: 'Mathematical reasoning and everyday maths' },
  { section: 'Science', label: 'Science', icon: 'sparkle', blurb: 'Concepts, everyday science and scientific reasoning' },
  { section: 'English', label: 'English', icon: 'bookOpen', blurb: 'Vocabulary, grammar, reading and expression' },
  { section: 'Logical Reasoning', label: 'Logical Reasoning', icon: 'layers', blurb: 'Patterns, coding, directions, puzzles and figures' },
  { section: 'IOQM-style Mathematics', label: 'IOQM-style Mathematics', icon: 'crown', blurb: 'Harder problems for the Mathematical Olympiad track', advanced: true },
];

/** Class bands on the class picker. */
export const BANDS: { from: number; to: number; label: string }[] = [
  { from: 1, to: 2, label: 'Foundation' },
  { from: 3, to: 5, label: 'Primary' },
  { from: 6, to: 8, label: 'Middle school' },
  { from: 9, to: 10, label: 'Secondary' },
  { from: 11, to: 12, label: 'Senior secondary' },
];

export interface PatternRow { exam: string; classes: string; questions: string; sections: string; time: string }

/** Level 1 patterns as published by SOF (sofworld.org syllabus pages) and the IOQM 2025 paper's instructions. */
export const PATTERNS: PatternRow[] = [
  { exam: 'SOF International Mathematics Olympiad (IMO)', classes: 'I–IV', questions: '35 questions, 40 marks', time: '1 hour',
    sections: 'Logical Reasoning 10, Mathematical Reasoning 10, Everyday Mathematics 10, Achievers 5 (2 marks each)' },
  { exam: 'SOF International Mathematics Olympiad (IMO)', classes: 'V–X', questions: '50 questions, 60 marks', time: '1 hour',
    sections: 'Logical Reasoning 15, Mathematical Reasoning 20, Everyday Mathematics 10, Achievers 5 (3 marks each)' },
  { exam: 'SOF International Science Olympiad (ISO)', classes: 'I–IV', questions: '35 questions, 40 marks', time: '1 hour',
    sections: 'Logical Reasoning 5, Science 25, Achievers 5 (2 marks each)' },
  { exam: 'SOF International Science Olympiad (ISO)', classes: 'V–X', questions: '50 questions, 60 marks', time: '1 hour',
    sections: 'Logical Reasoning 10, Science 35, Achievers 5 (3 marks each)' },
  { exam: 'SOF International English Olympiad (IEO)', classes: 'I–IV', questions: '35 questions, 40 marks', time: '1 hour',
    sections: 'Word and Structure Knowledge 15, Reading 10, Spoken and Written Expression 5, Achievers 5 (2 marks each)' },
  { exam: 'SOF International English Olympiad (IEO)', classes: 'V–XII', questions: '50 questions, 60 marks', time: '1 hour',
    sections: 'Word and Structure Knowledge 30, Reading 10, Spoken and Written Expression 5, Achievers 5 (3 marks each)' },
  { exam: 'Indian Olympiad Qualifier in Mathematics (IOQM)', classes: 'VIII–XII', questions: '30 questions, 100 marks', time: '3 hours',
    sections: 'Every answer is a one- or two-digit number. Questions 1–10: 2 marks, 11–20: 3 marks, 21–30: 5 marks; no negative marks' },
];

export const PATTERN_NOTES = [
  'SOF Olympiads are held in English, at schools that register with SOF; students cannot apply on their own. Level 2 is for Classes III–XII.',
  'In SOF’s published marking tables every question carries positive marks only; no deduction for wrong answers is listed.',
  'For IOQM 2026, students born between 1 August 2007 and 31 July 2014 and studying in Classes VIII–XII were eligible (HBCSE eligibility notice). IOQM 2026 was held on 6 September 2026.',
];

/** SOF's Level 1 dates for 2026–27 as listed on its exam pages (each school picks one of them). */
export const SOF_DATES: { exam: string; dates: string }[] = [
  { exam: 'IEO', dates: '30 September, 27 October and 17 November 2026' },
  { exam: 'IMO', dates: '23 October, 26 November and 10 December 2026' },
  { exam: 'ISO', dates: '30 October, 19 November and 3 December 2026' },
];

export const SOURCES: { label: string; url: string }[] = [
  { label: 'SOF IMO: exam page and class-wise syllabus', url: 'https://sofworld.org/sof-imo-syllabus' },
  { label: 'SOF ISO: exam page and class-wise syllabus', url: 'https://sofworld.org/sof-international-science-olympiad-syllabus' },
  { label: 'SOF IEO: exam page and class-wise syllabus', url: 'https://sofworld.org/sof-ieo-syllabus' },
  { label: 'SOF: pattern of questions and marking scheme', url: 'https://sofworld.org/pattern-questions-and-marking-scheme' },
  { label: 'SOF: official sample papers (IMO)', url: 'https://sofworld.org/sof-international-mathematics-olympiad-sample-papers' },
  { label: 'HBCSE: Mathematical Olympiad 2026–27 and past IOQM papers', url: 'https://olympiads.hbcse.tifr.res.in/how-to-prepare/past-papers/' },
  { label: 'MTA(I): IOQM 2026', url: 'https://www.mtai.org.in/ioqm-2026/' },
];

export const FAQ: { q: string; a: string }[] = [
  { q: 'Are these official Olympiad or previous-year questions?',
    a: 'No. Every question here is written and checked by SchoolDhundo in the style of school Olympiads and their published class-wise syllabus. None is taken from an SOF paper, sample paper or previous-year paper. For official papers, use the organisers’ links on this page.' },
  { q: 'Which classes are covered?',
    a: 'Classes I to X have questions now, with the most practice for Classes III to VIII. Classes XI and XII will be added later; until then they show no sets.' },
  { q: 'Can my child practise in Hindi?',
    a: 'Mathematics, Science, Logical Reasoning and IOQM-style questions can be read in English or Hindi. English Olympiad questions are in English only, because they test English itself. The SOF Olympiads themselves are held in English.' },
  { q: 'Where can I see my scores?',
    a: 'On your practice progress page, the same page that shows every SchoolDhundo practice test. Results are kept in your browser, or in your account if you sign in.' },
  { q: 'Is SchoolDhundo connected with SOF, HBCSE or MTA(I)?',
    a: 'No. SchoolDhundo is independent and not affiliated with any Olympiad organiser. IMO, ISO and IEO are run by the Science Olympiad Foundation; IOQM is run by MTA(I) with HBCSE.' },
];
