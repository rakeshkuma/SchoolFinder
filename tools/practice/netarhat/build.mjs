// Phase 7: builds the Netarhat question bank — 25 original practice sets of 20 questions (500 in all), five per
// subject of Paper 1 (Mental Ability, Hindi, Mathematics, Science, Social Studies) at Class 5 level — and writes them
// into practice.json. Usage: node build.mjs <path/to/practice.json>. Re-running replaces these sets, never duplicates.
import { readFileSync, writeFileSync } from 'node:fs';
import { check, fixed, int, mcq, rng, shuffleFixed } from './core.mjs';
import { hindiSet } from './hindi.mjs';
import { GENERATORS as MATHS, mathsSet } from './maths.mjs';
import { GENERATORS as MENTAL, mentalSet } from './mental.mjs';
import { SCIENCE_MOCK, SOCIAL_MOCK, hindiMockSet } from './mock.mjs';
import { SCIENCE } from './science.mjs';
import { SOCIAL } from './social.mjs';

const file = process.argv[2];
const data = JSON.parse(readFileSync(file, 'utf8'));
const REVIEWED = '2026-10-30';
const r = rng(20261206); // the 2026-27 exam date, so the bank is the same on every run
const seen = new Set();

const fromRows = (rows, prefix, section, setNo) => rows
  .filter((_, i) => i % 5 === setNo - 1) // spread every topic across the five sets
  .map((row, i) => {
    const [topic, difficulty, en, enOpts, hi, hiOpts, answer, enWhy, hiWhy] = row;
    return shuffleFixed(r, fixed({ id: `${prefix}${setNo}-${String(i + 1).padStart(2, '0')}`, section, topic, difficulty,
      prompt: en, options: enOpts, answer, explanation: enWhy, hi: { prompt: hi, options: hiOpts, explanation: hiWhy } }));
  });

const SUBJECTS = [
  { key: 'mental-ability', name: 'Mental Ability', hindiName: 'मानसिक योग्यता', order: 300,
    about: 'number and letter series, coding, analogies, odd one out, directions, ranking, calendar and relations',
    make: (n) => ({ questions: mentalSet(r, n, seen), passages: [] }) },
  { key: 'hindi', name: 'Hindi', hindiName: 'हिंदी', order: 310,
    about: 'synonyms, antonyms, plurals, gender, idioms, one-word substitutes, spelling and a short passage, in Hindi',
    make: (n) => hindiSet(r, n) },
  { key: 'maths', name: 'Mathematics', hindiName: 'गणित', order: 320,
    about: 'place value, the four operations, LCM and HCF, fractions, decimals, measurement, time, money and word problems',
    make: (n) => ({ questions: mathsSet(r, n, seen), passages: [] }) },
  { key: 'science', name: 'Science', hindiName: 'विज्ञान', order: 330,
    about: 'plants, animals, the human body and health, materials, force and energy, light and sound, the Earth and space, and the environment',
    make: (n) => ({ questions: fromRows(SCIENCE, 'sc', 'Science', n), passages: [] }) },
  { key: 'social-studies', name: 'Social Studies', hindiName: 'सामाजिक अध्ययन', order: 340,
    about: 'Jharkhand, India\'s geography, history and government, maps and the globe, and our country\'s people and culture',
    make: (n) => ({ questions: fromRows(SOCIAL, 'ss', 'Social Studies', n), passages: [] }) },
];

const sets = [];
for (const s of SUBJECTS) {
  for (let n = 1; n <= 5; n++) {
    const content = s.make(n);
    content.questions.forEach(check);
    if (content.questions.length !== 20) throw new Error(`netarhat-${s.key}-${n}: ${content.questions.length} questions`);
    sets.push({
      slug: `netarhat-${s.key}-${n}`, examSlug: 'netarhat', category: 'ENTRANCE', kind: 'QUIZ', level: 'Class V',
      title: `Netarhat Paper 1 practice: ${s.name} ${n} (${s.hindiName})`,
      description: `20 original multiple-choice questions on ${s.about}, at the Class 5 level of the Netarhat entrance test`
        + `${s.key === 'hindi' ? '' : ', in English and Hindi'}. Paper 1 has 20 one-mark questions in each of five subjects in 2½ hours, so 30 minutes`
        + ' is a fair pace. Written by SchoolDhundo; these are not official questions, and the subjective Paper 2 is not covered here.',
      durationMinutes: 30, displayOrder: s.order + n, published: true, reviewedOn: REVIEWED, content,
    });
  }
}

// Two full Paper 1 mock tests: 100 questions in the order of the 2026-27 advertisement (Mental Ability, Hindi,
// Mathematics, Science, Social Studies; 20 each, 1 mark, no negative marking), 2½ hours. Every question is new: the
// rule-based subjects skip anything already in a quiz (`seen`), and Hindi, Science and Social Studies come from
// mock.mjs. A separate seed keeps the quizzes above exactly as they were.
const rm = rng(20261207);
const fresh = (make) => {
  for (let i = 0; i < 400; i++) {
    let q;
    try { q = make(); } catch { continue; } // an unlucky draw without three distinct distractors
    const key = `${q.prompt}|${[...q.options].sort().join('|')}`;
    if (!seen.has(key)) {
      seen.add(key);
      return q;
    }
  }
  throw new Error('mock: could not find a new question');
};
// The quizzes have used every square series that the Number series rule makes (2² to 10²), so mocks start at 7².
const bigSquares = () => {
  const s = int(rm, 7, 10), xs = [0, 1, 2, 3].map((i) => (s + i) ** 2), n = (s + 4) ** 2;
  return { topic: 'Number series', difficulty: 'MEDIUM', correct: n, wrong: [n - 1, n + 2, xs[3] + (xs[3] - xs[2]), (s + 4) * 2],
    en: [`What comes next? ${xs.join(', ')}, ?`, `These are squares: ${xs.map((x, i) => `${s + i}²`).join(', ')}; next is ${s + 4}² = ${n}.`],
    hi: [`आगे क्या आएगा? ${xs.join(', ')}, ?`, `ये वर्ग संख्याएँ हैं: ${xs.map((x, i) => `${s + i}²`).join(', ')}; अगली ${s + 4}² = ${n}।`] };
};
const mockMental = (setNo) => MENTAL.map((g, i) => fresh(() => {
  const x = i === 3 ? bigSquares() : g(rm, setNo);
  const hiFmt = x.hiMap ? (v) => x.hiMap[v] ?? String(v) : undefined;
  return mcq(rm, { id: 'x', section: 'Mental Ability', topic: x.topic, difficulty: x.difficulty, prompt: x.en[0], correct: x.correct,
    wrong: x.wrong, explanation: x.en[1], hi: { prompt: x.hi[0], explanation: x.hi[1], fmt: hiFmt } });
}));
const mockMaths = () => MATHS.map((g) => fresh(() => {
  const x = g(rm);
  return mcq(rm, { id: 'x', section: 'Mathematics', topic: x.topic, difficulty: x.difficulty, prompt: x.en[0], correct: x.correct,
    wrong: x.wrong, explanation: x.en[1], fmt: x.fmt, hi: { prompt: x.hi[0], explanation: x.hi[1], fmt: x.hiFmt ?? x.fmt } });
}));
const mockRows = (rows, section, k) => rows.filter((_, i) => i % 2 === k).map((row) => {
  const [topic, difficulty, en, enOpts, hi, hiOpts, answer, enWhy, hiWhy] = row;
  return shuffleFixed(rm, fixed({ id: 'x', section, topic, difficulty, prompt: en, options: enOpts, answer, explanation: enWhy,
    hi: { prompt: hi, options: hiOpts, explanation: hiWhy } }));
});
for (const n of [1, 2]) {
  const hindi = hindiMockSet(rm, n - 1);
  const parts = [mockMental(5 + n), hindi.questions, mockMaths(), mockRows(SCIENCE_MOCK, 'Science', n - 1), mockRows(SOCIAL_MOCK, 'Social Studies', n - 1)];
  parts.forEach((p, i) => { if (p.length !== 20) throw new Error(`mock ${n}, part ${i + 1}: ${p.length} questions`); });
  const questions = parts.flat().map((q, i) => check({ ...q, id: `q${i + 1}` }));
  sets.push({
    slug: `netarhat-paper1-mock-${n}`, examSlug: 'netarhat', category: 'ENTRANCE', kind: 'MOCK', level: 'Class V',
    title: `Netarhat Paper 1 full mock test ${n} (पूर्ण मॉक टेस्ट ${n})`,
    description: 'A full-length practice paper in the Paper 1 pattern of the 2026-27 advertisement: 100 objective questions, 1 mark each,'
      + ' in 2½ hours — Mental Ability 1–20, Hindi 21–40, Mathematics 41–60, Science 61–80 and Social Studies 81–100. No marks are taken'
      + ' off for wrong answers. Hindi is in Hindi; the other subjects can be read in English or Hindi. Paper 1 is qualifying; the written'
      + ' Paper 2 is not covered here. Written by SchoolDhundo for practice; these are not official or previous-year questions.',
    durationMinutes: 150, marksPerQuestion: 1, negativeMarks: 0, displayOrder: 290 + n, published: true, reviewedOn: '2026-11-15',
    content: { questions, passages: hindi.passages },
  });
}

// Sets keep their place in the file (a small diff); new ones go after the last Netarhat set.
const bySlug = new Map(sets.map((s) => [s.slug, s]));
const kept = data.sets.map((s) => bySlug.get(s.slug) ?? s);
const added = sets.filter((s) => !data.sets.some((x) => x.slug === s.slug));
const last = kept.findLastIndex((s) => s.examSlug === 'netarhat');
data.sets = last < 0 ? [...kept, ...added] : [...kept.slice(0, last + 1), ...added, ...kept.slice(last + 1)];
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const total = sets.reduce((n, s) => n + s.content.questions.length, 0);
console.log(`${sets.length} Netarhat sets, ${total} questions; practice.json now has ${data.sets.length} sets`);
