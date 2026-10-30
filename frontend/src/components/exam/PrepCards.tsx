import { Link } from 'react-router-dom';
import { useApi } from '../../hooks/useApi';
import { practiceService } from '../../services/publicApi';
import type { PracticeBankQuestion } from '../../types/api';
import { Icon, type IconName } from '../common/Icon';

interface PrepCard {
  to: string;
  title: string;
  text: string;
  icon: IconName;
  tone: string;
  /** Questions in the bank this card leads to; the count shown is always live. */
  count: (q: PracticeBankQuestion) => boolean;
}

const session = (p: Record<string, string>) => `/exams/practice/session?${new URLSearchParams({ mode: 'TOPIC', count: '10', ...p })}`;

const EXAM_CARDS: PrepCard[] = [
  { to: '/exams/jnvst', title: 'JNVST', text: 'Navodaya Class VI entrance: guide and mock tests', icon: 'graduation', tone: 'from-brand-600 to-brand-400', count: (q) => q.examSlug === 'jnvst' },
  { to: '/exams/aissee', title: 'Sainik School', text: 'AISSEE Class VI and IX practice', icon: 'flag', tone: 'from-emerald-600 to-emerald-400', count: (q) => q.examSlug === 'aissee' },
  { to: '/exams/practice/class10-maths-1', title: 'CBSE Class 10', text: 'Mathematics, chapter by chapter, in English and Hindi', icon: 'book', tone: 'from-violet-600 to-violet-400', count: (q) => q.category === 'SCHOOL' && q.level === 'Class X' },
  { to: '/exams/practice/class12-maths-1', title: 'CBSE Class 12', text: 'Mathematics and Physics, chapter by chapter', icon: 'layers', tone: 'from-rose-600 to-rose-400', count: (q) => q.category === 'SCHOOL' && q.level === 'Class XII' },
  { to: '/exams/practice?category=OLYMPIAD', title: 'Olympiads', text: 'Original Olympiad-style questions', icon: 'trophy', tone: 'from-accent-600 to-accent-400', count: (q) => q.category === 'OLYMPIAD' },
];

const SUBJECT_CARDS: PrepCard[] = [
  { to: session({ section: 'Mathematics' }), title: 'Mathematics', text: 'Number skills to calculus', icon: 'target', tone: 'bg-brand-50 text-brand-700', count: (q) => q.section === 'Mathematics' },
  { to: session({ section: 'General Science' }), title: 'Science', text: 'General science for school and entrance exams', icon: 'sparkle', tone: 'bg-emerald-50 text-emerald-700', count: (q) => q.section === 'General Science' },
  { to: session({ section: 'English' }), title: 'English', text: 'Grammar, vocabulary and reading', icon: 'book', tone: 'bg-violet-50 text-violet-700', count: (q) => q.section === 'English' },
  { to: session({ section: 'General Knowledge' }), title: 'General Knowledge', text: 'India, the world and everyday science', icon: 'globe', tone: 'bg-accent-50 text-accent-700', count: (q) => q.section === 'General Knowledge' },
];

const TOOLS: { to: string; title: string; icon: IconName }[] = [
  { to: '/exams/practice', title: 'Practice questions', icon: 'target' },
  { to: '/exams/practice/session?mode=MINI_MOCK&timer=1', title: 'Mock tests', icon: 'clock' },
  { to: '/exams/resources?type=QUESTION_PAPER', title: 'Previous year papers', icon: 'file' },
  { to: '/exams/practice?category=SCHOOL', title: 'Chapter-wise practice', icon: 'list' },
  { to: '/exams/practice/session?mode=DAILY&timer=1', title: 'Daily quiz', icon: 'sun' },
  { to: '/exams/practice/progress', title: 'My dashboard', icon: 'chart' },
];

/** The preparation front door: exams, subjects and tools, each with how many questions it holds today. */
export function PrepCards() {
  const bank = useApi(() => practiceService.bank(), []);
  const n = (card: PrepCard) => (bank.data ? bank.data.questions.filter(card.count).length : null);
  const label = (count: number | null) => (count === null ? '' : `${count} question${count === 1 ? '' : 's'}`);
  return (
    <section aria-labelledby="prep-cards-heading" className="space-y-6">
      <div>
        <p className="eyebrow">Prepare</p>
        <h2 id="prep-cards-heading" className="section-title mt-2">Start preparing</h2>
        <p className="mt-1 text-sm text-slate-600">Original practice questions with explanations — free and no sign-in needed. Not official or previous-year questions.</p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {EXAM_CARDS.map((c) => (
          <li key={c.title}>
            <Link to={c.to} className={`flex h-full flex-col rounded-3xl bg-gradient-to-br ${c.tone} p-5 text-white shadow-card transition hover:-translate-y-0.5 hover:shadow-lift`}>
              <Icon name={c.icon} className="h-7 w-7 text-white/90" />
              <span className="mt-4 font-display text-xl font-extrabold">{c.title}</span>
              <span className="mt-1 flex-1 text-sm text-white/90">{c.text}</span>
              <span className="mt-3 text-xs font-semibold text-white/90">{label(n(c))}</span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SUBJECT_CARDS.map((c) => (
          <li key={c.title}>
            <Link to={c.to} className="card card-hover flex items-center gap-4 p-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${c.tone}`}><Icon name={c.icon} className="h-6 w-6" /></span>
              <span className="min-w-0">
                <span className="block font-display font-bold text-ink">{c.title}</span>
                <span className="block text-xs text-slate-500">{c.text}{n(c) !== null && ` · ${label(n(c))}`}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
      <ul className="flex flex-wrap gap-2" aria-label="Preparation tools">
        {TOOLS.map((t) => (
          <li key={t.title}>
            <Link to={t.to} className="chip gap-2 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-card ring-1 ring-slate-200 hover:bg-brand-50 hover:text-brand-700">
              <Icon name={t.icon} className="h-4 w-4" /> {t.title}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
