import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ErrorState, Spinner } from '../components/common/States';
import { FigureRow, FigureView } from '../components/exam/FigureView';
import { useApi } from '../hooks/useApi';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { ApiError } from '../services/http';
import { practiceService } from '../services/publicApi';
import type { PracticeLanguage, PracticePassage, PracticeQuestion, PracticeSetSummary } from '../types/api';
import { track } from '../utils/analytics';
import { NotFoundPage } from './InfoPages';
import { LanguageSwitch, PRACTICE_LABEL, passageText, questionText, useLanguage } from './PracticePages';

/** Printed on the paper, so a paper copy leads back to the online test. */
const SITE = 'https://schooldhundo.in';
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** The paper's own words; the questions come in the set's own English or Hindi. */
const WORDS: Record<PracticeLanguage, {
  name: string; date: string; questions: (n: number) => string; minutes: (n: number) => string; untimed: string;
  section: string; instructions: string; passage: string; sheet: string; sheetHint: string; check: string; checkAfter: string;
  original: string;
}> = {
  en: {
    name: 'Name', date: 'Date', questions: (n) => `${n} questions`, minutes: (n) => `${n} minutes`, untimed: 'No time limit',
    section: 'Section',
    instructions: 'Choose one option for each question and mark it on the answer sheet at the end.',
    passage: 'Read the passage, then answer the questions that follow.',
    sheet: 'Answer sheet', sheetHint: 'Tick one option for each question.',
    check: 'Check your answers online: take this test at',
    checkAfter: 'to see your score and the reason for every answer. Free, no sign-up.',
    original: "Original practice questions in the exam's pattern, written and reviewed by SchoolDhundo. Not an official or previous-year paper.",
  },
  hi: {
    name: 'नाम', date: 'दिनांक', questions: (n) => `${n} प्रश्न`, minutes: (n) => `${n} मिनट`, untimed: 'कोई समय सीमा नहीं',
    section: 'खंड',
    instructions: 'हर प्रश्न के लिए एक विकल्प चुनें और उसे अंत में दिए गए उत्तर पत्रक पर चिह्नित करें।',
    passage: 'गद्यांश पढ़ें, फिर उसके बाद के प्रश्नों के उत्तर दें।',
    sheet: 'उत्तर पत्रक', sheetHint: 'हर प्रश्न के लिए एक विकल्प पर निशान लगाएँ।',
    check: 'अपने उत्तर ऑनलाइन जाँचें: यह टेस्ट',
    checkAfter: 'पर दें और अपने अंक व हर उत्तर का कारण देखें। मुफ़्त, साइन-अप की ज़रूरत नहीं।',
    original: 'परीक्षा के पैटर्न पर SchoolDhundo के अपने अभ्यास प्रश्न, जिन्हें हमने लिखा और जाँचा है। यह आधिकारिक या पिछले वर्ष का प्रश्न पत्र नहीं है।',
  },
};

const marks = (n: number) => `${n} mark${n === 1 ? '' : 's'}`;

/** The set's practice marking, as the online test scores it; never presented as the exam's official scheme. */
export function paperMarking(set: Pick<PracticeSetSummary, 'marksPerQuestion' | 'negativeMarks' | 'sectionMarks'>, lang: PracticeLanguage): string {
  const special = Object.entries(set.sectionMarks ?? {}).filter(([, v]) => v !== set.marksPerQuestion);
  // Sections marked differently are described in English only.
  if (lang === 'hi' && special.length === 0) {
    return set.negativeMarks > 0
      ? `अंक: हर सही उत्तर पर ${set.marksPerQuestion} अंक, हर गलत उत्तर पर ${set.negativeMarks} अंक कटेंगे, छोड़े गए प्रश्न पर कुछ नहीं। यह हमारी अभ्यास अंक योजना है, परीक्षा की आधिकारिक योजना नहीं।`
      : `अंक: हर सही उत्तर पर ${set.marksPerQuestion} अंक; गलत या छोड़े गए उत्तर पर कोई अंक नहीं कटता। यह हमारी अभ्यास अंक योजना है, परीक्षा की आधिकारिक योजना नहीं।`;
  }
  const per = special.length
    ? `${special.map(([s, v]) => `${marks(v)} in ${s}`).join(', ')}, ${marks(set.marksPerQuestion)} in other sections`
    : marks(set.marksPerQuestion);
  return set.negativeMarks > 0
    ? `Marking: ${per} for each correct answer, ${marks(set.negativeMarks)} taken off for each wrong one, nothing for a skipped one. This is our practice marking, not the exam's official scheme.`
    : `Marking: ${per} for each correct answer; nothing is taken off for a wrong or skipped one. This is our practice marking, not the exam's official scheme.`;
}

interface PaperItem {
  q: PracticeQuestion;
  n: number;
  /** The passage, on the first question that uses it */
  passage: PracticePassage | null;
}

/** Questions in order, grouped by section, each passage printed once before its first question. */
export function paperSections(questions: PracticeQuestion[], passages: PracticePassage[]): { section: string; items: PaperItem[] }[] {
  const seen = new Set<string>();
  const groups: { section: string; items: PaperItem[] }[] = [];
  questions.forEach((q, i) => {
    let passage: PracticePassage | null = null;
    if (q.passageId && !seen.has(q.passageId)) {
      seen.add(q.passageId);
      passage = passages.find((p) => p.id === q.passageId) ?? null;
    }
    const item = { q, n: i + 1, passage };
    const last = groups[groups.length - 1];
    if (last && last.section === q.section) last.items.push(item);
    else groups.push({ section: q.section, items: [item] });
  });
  return groups;
}

function PaperQuestion({ item, lang, words }: { item: PaperItem; lang: PracticeLanguage; words: (typeof WORDS)[PracticeLanguage] }) {
  const { q, n, passage } = item;
  const shown = questionText(q, lang);
  const shownPassage = passage ? passageText(passage, lang) : null;
  return (
    <div className="py-3">
      {passage && shownPassage && (
        <div className="mb-3 rounded-lg border border-slate-300 p-3 text-sm" lang={lang === 'hi' && passage.hi ? 'hi' : 'en'}>
          <p className="text-xs font-semibold text-slate-600">{words.passage}</p>
          <p className="mt-1 font-semibold text-ink">{shownPassage.title}</p>
          <p className="mt-1 whitespace-pre-line text-slate-800">{shownPassage.text}</p>
        </div>
      )}
      <div className="break-inside-avoid" lang={shown.hindi ? 'hi' : 'en'}>
        <p className="font-semibold text-ink"><span className="mr-1.5">{n}.</span>{shown.prompt}</p>
        {q.figure && q.figure.length > 0 && <FigureRow figures={q.figure} asksNext={q.figureAsksNext} />}
        <ol className={`mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-800 ${q.optionFigures ? 'grid-cols-2 sm:grid-cols-4 print:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 print:grid-cols-2'}`}>
          {shown.options.map((opt, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="font-semibold">({LETTERS[i]})</span>
              {q.optionFigures?.[i] ? <FigureView figure={q.optionFigures[i]} size={64} /> : <span>{opt}</span>}
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

/**
 * A practice set as a paper to print or save as PDF (/exams/practice/{slug}/paper): every question with its figures,
 * then an answer sheet. Answers are not printed: the server keeps them until a test is scored, so a class can sit the
 * paper offline and check it online, and leaderboard scores stay fair. The server gives this page the set's own
 * address as its canonical, as for any print version.
 */
export function PracticePaperPage() {
  const { slug = '' } = useParams();
  const [params, setParams] = useSearchParams();
  const [stored, store] = useLanguage();
  const state = useApi(() => practiceService.get(slug), [slug]);
  useDocumentTitle(state.data ? `${state.data.set.title}: printable paper` : 'Printable practice paper');

  if (state.error instanceof ApiError && state.error.status === 404) return <NotFoundPage />;
  if (state.error) return <div className="container-page py-10"><ErrorState error={state.error} onRetry={state.reload} /></div>;
  if (!state.data) return <Spinner />;

  const { set, questions, passages } = state.data;
  const hindiCount = questions.filter((q) => q.hi).length;
  const asked = params.get('lang');
  // A shared link's ?lang= wins over this browser's last choice; a set without Hindi is always in English.
  const lang: PracticeLanguage = hindiCount === 0 ? 'en' : asked === 'hi' || asked === 'en' ? asked : stored;
  const words = WORDS[lang];
  const choose = (next: PracticeLanguage) => {
    store(next);
    setParams((p) => {
      const n = new URLSearchParams(p);
      n.set('lang', next);
      return n;
    }, { replace: true });
  };
  const testPath = `/exams/practice/${set.slug}`;
  const testUrl = SITE + testPath;
  const shortUrl = testUrl.replace('https://', '');
  const print = () => {
    track('paper_print', { set_slug: set.slug, exam_slug: set.examSlug ?? undefined, lang });
    window.print();
  };
  const sections = paperSections(questions, passages);

  return (
    <div className="container-page max-w-3xl py-8 print:max-w-none print:py-0">
      <div data-print="hide" className="mb-6 rounded-xl bg-brand-50 p-4 text-sm text-brand-900 ring-1 ring-brand-100">
        <p className="font-semibold">A printable paper: print it, or choose “Save as PDF” in the print window.</p>
        <p className="mt-1">
          Answers are not printed. Students mark theirs on the answer sheet at the end, then take the same test online to
          see the score and the reason for every answer.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" onClick={print} className="btn-primary">Print or save as PDF</button>
          {hindiCount > 0 && <LanguageSwitch lang={lang} onChange={choose} />}
          <Link to={testPath} className="font-semibold underline hover:text-ink">Take this test online</Link>
        </div>
        {lang === 'hi' && hindiCount < questions.length && (
          <p className="mt-2 text-xs">
            {questions.length - hindiCount} of the {questions.length} questions have no Hindi version yet and are printed in English.
          </p>
        )}
      </div>

      <article lang={lang}>
        <header className="border-b-2 border-ink pb-4">
          <p lang="en" className="text-xs font-semibold uppercase tracking-wide text-slate-500">{PRACTICE_LABEL}</p>
          <h1 lang="en" className="mt-1 font-display text-2xl font-bold text-ink">{set.title}</h1>
          <p className="mt-1 text-sm text-slate-700">
            {words.questions(questions.length)} · {set.durationMinutes ? words.minutes(set.durationMinutes) : words.untimed}
            {' · '}<span lang="en">{[...new Set(questions.map((q) => q.section))].join(', ')}</span>
          </p>
          <p className="mt-2 text-sm text-slate-700">{paperMarking(set, lang)}</p>
          <p className="mt-2 text-sm text-slate-700">{words.instructions}</p>
          <p className="mt-3 flex flex-wrap gap-x-10 gap-y-2 text-sm">
            <span>{words.name}: ______________________________</span>
            <span>{words.date}: ________________</span>
          </p>
        </header>

        {sections.map((g) => (
          <section key={`${g.section}-${g.items[0].n}`} className="mt-4">
            {sections.length > 1 && (
              <h2 className="border-b border-slate-300 pb-1 font-display text-base font-bold text-ink">
                {words.section}: <span lang="en">{g.section}</span>
              </h2>
            )}
            {g.items.map((item) => <PaperQuestion key={item.q.id} item={item} lang={lang} words={words} />)}
          </section>
        ))}

        <section className="mt-8 break-before-page" aria-labelledby="answer-sheet">
          <h2 id="answer-sheet" className="font-display text-lg font-bold text-ink">{words.sheet}: <span lang="en">{set.title}</span></h2>
          <p className="mt-1 text-sm text-slate-600">{words.sheetHint}</p>
          <p className="mt-3 flex flex-wrap gap-x-10 gap-y-2 text-sm">
            <span>{words.name}: ______________________________</span>
            <span>{words.date}: ________________</span>
          </p>
          <ol className="mt-4 grid grid-cols-2 gap-x-8 text-sm sm:grid-cols-3 print:grid-cols-3" aria-label={words.sheet}>
            {questions.map((q, i) => (
              <li key={q.id} className="flex items-center gap-2 border-b border-slate-200 py-1.5">
                <span className="w-8 text-right font-semibold">{i + 1}.</span>
                {q.options.map((_, j) => (
                  <span key={j} aria-hidden="true"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-slate-500 text-[10px] font-semibold">
                    {LETTERS[j]}
                  </span>
                ))}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-sm text-slate-800">
            {words.check} <a href={testUrl} className="font-semibold underline">{shortUrl}</a> {words.checkAfter}
          </p>
        </section>

        <footer className="mt-8 border-t border-slate-300 pt-3 text-xs text-slate-600">
          <p>{words.original}</p>
          <p lang="en" className="mt-1">SchoolDhundo · {shortUrl}</p>
        </footer>
      </article>
    </div>
  );
}
