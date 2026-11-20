// Builds the JNVST Class VI question bank — original, bilingual practice sets in the structure of the official
// 2027 selection test (NVS prospectus, section 5: Mental Ability 20 + EVS 20, Arithmetic 20, Language 20; 1.25 marks
// each, no negative marking) — and writes them into practice.json, replacing every earlier "jnvst" set.
// Usage: node tools/practice/jnvst/build.mjs backend/src/main/resources/seed/practice.json
import { readFileSync, writeFileSync } from 'node:fs';
import { check, fixed, rng, shuffleFixed } from '../netarhat/core.mjs';
import { arithmeticSet } from './arithmetic.mjs';
import { EVS, EVS_PASSAGES } from './evs.mjs';
import { PASSAGES } from './language.mjs';
import { matSet } from './mat.mjs';

const file = process.argv[2];
if (!file) throw new Error('usage: node build.mjs <path/to/practice.json>');
const data = JSON.parse(readFileSync(file, 'utf8'));
const REVIEWED = '2026-11-12';
const r = rng(20261128); // the 2027 exam date, so the bank is the same on every run
const seenArithmetic = new Set();
const seenMat = new Set();

const MAT_QUIZZES = 5, EVS_QUIZZES = 4, ARITHMETIC_QUIZZES = 5, LANGUAGE_QUIZZES = 3, MOCKS = 2;
const MARKS = 1.25;
const ORIGINAL = 'Written by SchoolDhundo for practice; these are not official or previous-year questions.';

// ── EVS: rows spread across the sets so every set covers all four areas; one passage per set ───────────────────
const evsRow = (row, id) => {
  const [topic, difficulty, en, enOpts, hi, hiOpts, answer, enWhy, hiWhy] = row;
  return shuffleFixed(r, fixed({ id, section: 'Environmental Studies', topic, difficulty, prompt: en, options: enOpts, answer, explanation: enWhy, hi: { prompt: hi, options: hiOpts, explanation: hiWhy } }));
};
const passageBlock = (p, section, topic, idOf) => {
  const [pid, title, text, hiTitle, hiText, qs] = p;
  const passage = { id: pid, title, text, hi: { title: hiTitle, text: hiText } };
  const questions = qs.map(([en, enOpts, hi, hiOpts, answer, enWhy, hiWhy], i) => ({
    ...shuffleFixed(r, fixed({ id: idOf(i), section, topic, difficulty: i < 3 ? 'EASY' : 'MEDIUM', prompt: en, options: enOpts, answer, explanation: enWhy, hi: { prompt: hi, options: hiOpts, explanation: hiWhy } })),
    passageId: pid,
  }));
  return { passage, questions };
};
const EVS_SETS = EVS_QUIZZES + MOCKS;
if (EVS.length < EVS_SETS * 15) throw new Error(`EVS needs ${EVS_SETS * 15} rows, has ${EVS.length}`);
if (EVS_PASSAGES.length < EVS_SETS) throw new Error(`EVS needs ${EVS_SETS} passages, has ${EVS_PASSAGES.length}`);
let evsUsed = 0;
function evsSet(setIndex, prefix = 'e') {
  const rows = EVS.filter((_, i) => i % EVS_SETS === setIndex).slice(0, 15);
  if (rows.length < 15) throw new Error(`EVS set ${setIndex}: only ${rows.length} rows`);
  evsUsed += rows.length;
  const mcqs = rows.map((row, i) => evsRow(row, `${prefix}${i + 1}`));
  const { passage, questions } = passageBlock(EVS_PASSAGES[setIndex], 'Environmental Studies', 'Reading passage (EVS)', (i) => `${prefix}${16 + i}`);
  return { questions: [...mcqs, ...questions], passages: [passage] };
}

// ── Language: four passages per set, five questions each ───────────────────────────────────────────────────────
const LANGUAGE_SETS = LANGUAGE_QUIZZES + MOCKS;
if (PASSAGES.length < LANGUAGE_SETS * 4) throw new Error(`Language needs ${LANGUAGE_SETS * 4} passages, has ${PASSAGES.length}`);
function languageSet(setIndex, prefix = 'l') {
  const passages = [], questions = [];
  PASSAGES.slice(setIndex * 4, setIndex * 4 + 4).forEach((p, k) => {
    const block = passageBlock(p, 'Language', 'Reading comprehension', (i) => `${prefix}${k * 5 + i + 1}`);
    passages.push(block.passage);
    questions.push(...block.questions);
  });
  return { questions, passages };
}

const sets = [];
const quiz = (slug, title, description, order, content, minutes = 30) => sets.push({
  slug, examSlug: 'jnvst', category: 'ENTRANCE', kind: 'QUIZ', level: 'Class V', title, description, durationMinutes: minutes,
  marksPerQuestion: MARKS, negativeMarks: 0, displayOrder: order, published: true, reviewedOn: REVIEWED, content,
});

// Full-length mocks first (built before the quizzes so their questions are drawn from the same seeded generators).
for (let n = 1; n <= MOCKS; n++) {
  const mat = matSet(r, seenMat, 'q');
  const evs = evsSet(EVS_QUIZZES + n - 1, 'q');
  const arithmetic = arithmeticSet(r, 100 + n, seenArithmetic, 'q');
  const language = languageSet(LANGUAGE_QUIZZES + n - 1, 'q');
  // Official order: Mental Ability (1–20), EVS (21–40), Arithmetic (41–60), Language (61–80).
  const ordered = [...mat, ...evs.questions, ...arithmetic, ...language.questions].map((q, i) => ({ ...q, id: `q${i + 1}` }));
  ordered.forEach(check);
  if (ordered.length !== 80) throw new Error(`jnvst-mock-${n}: ${ordered.length} questions`);
  sets.push({
    slug: `jnvst-mock-${n}`, examSlug: 'jnvst', category: 'ENTRANCE', kind: 'MOCK', level: 'Class V',
    title: `JNVST Class VI full mock test ${n} (पूर्ण मॉक टेस्ट ${n})`,
    description: `A full-length paper in the structure of the official JNVST 2027 Class VI test: 80 questions for 100 marks in 2 hours — Mental Ability (20, figure-based) and EVS (20, with a passage), Arithmetic (20) and Language (20, four passages). 1.25 marks per correct answer, no negative marking; the real test needs 14 marks in Section 1 and 7 each in the other two. In English and Hindi. ${ORIGINAL}`,
    durationMinutes: 120, marksPerQuestion: MARKS, negativeMarks: 0, displayOrder: 100 + n, published: true, reviewedOn: REVIEWED,
    content: { passages: [...evs.passages, ...language.passages], questions: ordered },
  });
}

for (let n = 1; n <= MAT_QUIZZES; n++) {
  const questions = matSet(r, seenMat, 'm');
  questions.forEach(check);
  quiz(`jnvst-mat-${n}`, `JNVST Mental Ability practice ${n} (मानसिक योग्यता ${n})`,
    `20 figure-based questions, four from each of the five parts of the official Mental Ability section: pattern completion, figure series, geometrical figure completion, mirror and water images and embedded figures. Section 1 of the real paper gives 60 minutes for 40 questions, so 30 minutes is the official pace. Instructions in English and Hindi. ${ORIGINAL}`,
    110 + n, { questions, passages: [] });
}
for (let n = 1; n <= EVS_QUIZZES; n++) {
  const { questions, passages } = evsSet(n - 1);
  questions.forEach(check);
  quiz(`jnvst-evs-${n}`, `JNVST Environmental Studies practice ${n} (पर्यावरण अध्ययन ${n})`,
    `15 multiple-choice questions and one passage with 5 questions, exactly as the official EVS part of Section 1 is set: the natural world, the human body, science in daily life and social surroundings. In English and Hindi. ${ORIGINAL}`,
    120 + n, { questions, passages });
}
for (let n = 1; n <= ARITHMETIC_QUIZZES; n++) {
  const questions = arithmeticSet(r, n, seenArithmetic);
  questions.forEach(check);
  quiz(`jnvst-arithmetic-${n}`, `JNVST Arithmetic practice ${n} (अंकगणित ${n})`,
    `20 questions over the nine topics the prospectus lists for the Arithmetic Test: numbers and place value, the four operations, factors and multiples, like fractions, measurement and units, simplification, perimeter and area, angles and directions, and data handling. The real section allows 30 minutes. In English and Hindi, every answer worked out. ${ORIGINAL}`,
    130 + n, { questions, passages: [] });
}
for (let n = 1; n <= LANGUAGE_QUIZZES; n++) {
  const { questions, passages } = languageSet(n - 1);
  questions.forEach(check);
  quiz(`jnvst-language-${n}`, `JNVST Language practice ${n} (भाषा ${n})`,
    `Four short passages with five questions each — comprehension, word meanings and opposites — as in the official Language Test, which allows 30 minutes. Each passage and question is written in both English and Hindi. ${ORIGINAL}`,
    140 + n, { questions, passages });
}

// Every set must be fully bilingual, and no bank id may repeat inside a set.
for (const s of sets) {
  const ids = new Set();
  for (const q of s.content.questions) {
    if (ids.has(q.id)) throw new Error(`${s.slug}: duplicate id ${q.id}`);
    ids.add(q.id);
    if (!q.hi) throw new Error(`${s.slug}/${q.id}: no Hindi version`);
    if (q.passageId && !s.content.passages.some((p) => p.id === q.passageId)) throw new Error(`${s.slug}/${q.id}: unknown passage`);
  }
  for (const p of s.content.passages) if (!p.hi) throw new Error(`${s.slug}/${p.id}: passage has no Hindi version`);
}

const before = data.sets.filter((s) => s.examSlug === 'jnvst').map((s) => s.slug);
data.sets = [...data.sets.filter((s) => s.examSlug !== 'jnvst'), ...sets];
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const total = sets.reduce((n, s) => n + s.content.questions.length, 0);
const bySection = {};
for (const s of sets) for (const q of s.content.questions) bySection[q.section] = (bySection[q.section] ?? 0) + 1;
console.log(`${sets.length} JNVST sets, ${total} questions (${Object.entries(bySection).map(([k, v]) => `${k} ${v}`).join(', ')}); EVS rows used ${evsUsed} of ${EVS.length}; practice.json now has ${data.sets.length} sets`);
const gone = before.filter((slug) => !sets.some((s) => s.slug === slug));
if (gone.length) console.log(`Removed earlier sets that are not rebuilt (unpublish them on a live server): ${gone.join(', ')}`);
