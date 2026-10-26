import type { ExamContent } from '../types/api';

/**
 * Week-by-week study plans built from an exam's official syllabus and marks. This is India School Finder guidance:
 * it spreads the published topics over the time available and weights daily practice by marks; it does not
 * predict or promise any result.
 */
export interface Subject {
  name: string;
  /** Relative importance: marks or number of questions in the official pattern. */
  weight: number;
  topics: string[];
}

export interface PlanWeek {
  n: number;
  /** 1-based day numbers covered by the week. */
  fromDay: number;
  toDay: number;
  phase: 'learn' | 'practice' | 'revise';
  focus: { subject: string; topics: string[] }[];
  tasks: string[];
}

export interface StudyPlan {
  days: number;
  minutesPerDay: number;
  daily: { subject: string; minutes: number }[];
  weeks: PlanWeek[];
}

/** "Mathematics (35 marks)" → { name: "Mathematics", weight: 35 }; null when the area states no number. */
function parseArea(area: string): { name: string; weight: number } | null {
  const m = area.match(/^(.*?)\s*\((\d+)([^)]*)\)/);
  if (!m) return null;
  const name = m[1].replace(/^Class [IVX]+\s+/, '').trim();
  // "Science and Social Science (20 each)" is worth 20 per subject named.
  const each = /\beach\b/.test(m[3]) ? name.split(/\s+and\s+/).length : 1;
  return { name, weight: Number(m[2]) * each };
}

/**
 * Subjects for the planner. Uses the syllabus areas when they state their weight, otherwise the official pattern's
 * section marks (summing sections that appear in more than one paper). Returns [] when neither is published.
 */
export function subjectsFrom(content: Pick<ExamContent, 'syllabus' | 'pattern'>): Subject[] {
  const parsed = content.syllabus.map((a) => ({ area: a, p: parseArea(a.area) }));
  if (parsed.length > 0 && parsed.every((x) => x.p !== null)) {
    return parsed.map(({ area, p }) => ({ name: p!.name, weight: p!.weight, topics: area.topics }));
  }
  const bySection = new Map<string, number>();
  for (const block of content.pattern) {
    for (const s of block.sections) {
      if (s.marks) bySection.set(s.name, (bySection.get(s.name) ?? 0) + s.marks);
    }
  }
  return [...bySection.entries()].map(([name, weight]) => ({ name, weight, topics: [] }));
}

/**
 * Splits the day into 5-minute blocks by weight (largest remainder, so equal weights get equal time and the total is
 * exact), with at least 10 minutes per subject where the day allows it.
 */
function splitMinutes(subjects: Subject[], minutesPerDay: number, total: number): { subject: string; minutes: number }[] {
  if (subjects.length === 0) return [];
  const blocks = Math.floor(minutesPerDay / 5);
  const exact = subjects.map((s) => (blocks * s.weight) / total);
  const units = exact.map((x) => Math.max(Math.min(2, Math.floor(blocks / subjects.length)), Math.floor(x)));
  let left = blocks - units.reduce((a, b) => a + b, 0);
  const byRemainder = exact.map((x, i) => ({ i, r: x - Math.floor(x) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % byRemainder.length, left--) units[byRemainder[k].i]++;
  const byWeight = subjects.map((s, i) => ({ i, w: s.weight })).sort((a, b) => b.w - a.w);
  for (let k = 0; left < 0; k = (k + 1) % byWeight.length) {
    if (units[byWeight[k].i] > 2) { units[byWeight[k].i]--; left++; }
  }
  return subjects.map((s, i) => ({ subject: s.name, minutes: units[i] * 5 }));
}

export function buildPlan(subjects: Subject[], days: number, minutesPerDay: number): StudyPlan {
  const weeks = Math.max(1, Math.ceil(days / 7));
  const total = subjects.reduce((s, x) => s + x.weight, 0) || 1;
  const daily = splitMinutes(subjects, minutesPerDay, total);

  // About 60% learning, 25% timed practice, the rest full mocks and revision — at least one week of each when possible.
  let revise = Math.max(1, Math.round(weeks * 0.15));
  let practice = weeks >= 3 ? Math.max(1, Math.round(weeks * 0.25)) : 0;
  let learn = weeks - practice - revise;
  if (learn < 1) {
    learn = 1;
    practice = Math.max(0, weeks - learn - 1);
    revise = weeks - learn - practice;
  }

  const plan: PlanWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    const fromDay = w * 7 + 1;
    const toDay = Math.min(days, fromDay + 6);
    if (w < learn) {
      const focus = subjects.map((s) => ({
        subject: s.name,
        topics: s.topics.filter((_, i) => Math.floor((i * learn) / s.topics.length) === w),
      }));
      plan.push({
        n: w + 1, fromDay, toDay, phase: 'learn',
        focus: focus.filter((f) => f.topics.length > 0 || subjects.find((s) => s.name === f.subject)!.topics.length === 0)
          .map((f) => (f.topics.length > 0 ? f : { subject: f.subject, topics: [`Questions at the official level for ${f.subject}`] })),
        tasks: [
          'Learn each topic from the school textbook, then solve 10–15 questions on it.',
          'Keep a notebook of mistakes and formulas; read it on the last day of the week.',
        ],
      });
    } else if (w < learn + practice) {
      plan.push({
        n: w + 1, fromDay, toDay, phase: 'practice', focus: [],
        tasks: [
          'Timed section tests in every subject, at the time allowed per question in the official pattern.',
          'Go back over every wrong answer and re-learn the topic behind it.',
          'Give extra time to the subjects with the most marks.',
        ],
      });
    } else {
      const last = w === weeks - 1;
      plan.push({
        n: w + 1, fromDay, toDay, phase: 'revise', focus: [],
        tasks: last
          ? ['One full-length timed mock early in the week, then light revision only.', 'Read your mistakes notebook.',
            'Check the admit card, exam centre, documents and reporting time from the official notice.', 'Sleep well before the exam day.']
          : ['Two full-length timed mocks (official papers where published, or our practice mock tests).',
            'Revise the weakest topics found in the mocks.', 'Practise answering on an OMR-style sheet if the exam uses one.'],
      });
    }
  }
  return { days, minutesPerDay, daily, weeks: plan };
}
