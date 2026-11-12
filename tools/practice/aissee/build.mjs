// Builds the AISSEE Class VI question bank — original practice sets in the Class VI pattern already configured for
// AISSEE on SchoolDhundo (exams.json: Language 25, Mathematics 50 at 3 marks, Intelligence 25, General Knowledge 25,
// 300 marks, 150 minutes) — and writes them into practice.json. Replaces only the "aissee-class6-*" sets; the
// Class IX sets are not touched.
// Usage: node tools/practice/aissee/build.mjs backend/src/main/resources/seed/practice.json
import { readFileSync, writeFileSync } from 'node:fs';
import { check, fixed, rng, shuffleFixed } from '../netarhat/core.mjs';
import { GK } from './gk.mjs';
import { intelligenceSet } from './intelligence.mjs';
import { ENGLISH, ENGLISH_PASSAGES, HINDI, HINDI_PASSAGES } from './language.mjs';
import { mathsSet } from './maths.mjs';

const file = process.argv[2];
if (!file) throw new Error('usage: node build.mjs <path/to/practice.json>');
const data = JSON.parse(readFileSync(file, 'utf8'));
const REVIEWED = '2026-11-12';
const r = rng(20270118);
const seenMaths = new Set(), seenInt = new Set();
const ORIGINAL = 'Written by SchoolDhundo for practice; these are not official or previous-year questions.';
const LEVEL = 'Class V–VI';
const EN_SECTION = 'Language (English)', HI_SECTION = 'Language (Hindi)';

const gkRow = (row, id) => {
  const [topic, difficulty, en, enOpts, hi, hiOpts, answer, enWhy, hiWhy] = row;
  return shuffleFixed(r, fixed({ id, section: 'General Knowledge', topic, difficulty, prompt: en, options: enOpts, answer, explanation: enWhy, hi: { prompt: hi, options: hiOpts, explanation: hiWhy } }));
};
/** A language row; Hindi-medium rows carry the same text as their Hindi version so the language switch keeps them. */
const langRow = (row, id, section, hindi) => {
  const [topic, difficulty, prompt, options, answer, explanation] = row;
  return shuffleFixed(r, fixed({ id, section, topic, difficulty, prompt, options, answer, explanation, hi: hindi ? { prompt, options, explanation } : undefined }));
};
const passage = (p, section, hindi, idOf) => {
  const [pid, title, text, qs] = p;
  return {
    passage: { id: pid, title, text, ...(hindi ? { hi: { title, text } } : {}) },
    questions: qs.map(([q, opts, answer, why], i) => ({
      ...shuffleFixed(r, fixed({ id: idOf(i), section, topic: hindi ? 'अपठित गद्यांश' : 'Comprehension', difficulty: i < 3 ? 'EASY' : 'MEDIUM', prompt: q, options: opts, answer, explanation: why, hi: hindi ? { prompt: q, options: opts, explanation: why } : undefined })),
      passageId: pid,
    })),
  };
};
const spread = (rows, setIndex, sets, n) => {
  const out = rows.filter((_, i) => i % sets === setIndex).slice(0, n);
  if (out.length < n) throw new Error(`only ${out.length} of ${n} rows for set ${setIndex}`);
  return out;
};

const GK_SETS = 4, LANG_SETS = 3; // GK: 2 quizzes + 2 mocks; each language: 2 quizzes + 1 mock
const gkSet = (i, prefix) => spread(GK, i, GK_SETS, 25).map((row, k) => gkRow(row, `${prefix}${k + 1}`));
const englishSet = (i, prefix) => {
  const p = passage(ENGLISH_PASSAGES[i], EN_SECTION, false, (k) => `${prefix}${k + 1}`);
  return { passages: [p.passage], questions: [...p.questions, ...spread(ENGLISH, i, LANG_SETS, 20).map((row, k) => langRow(row, `${prefix}${k + 6}`, EN_SECTION, false))] };
};
const hindiSet = (i, prefix) => {
  const p = passage(HINDI_PASSAGES[i], HI_SECTION, true, (k) => `${prefix}${k + 1}`);
  return { passages: [p.passage], questions: [...p.questions, ...spread(HINDI, i, LANG_SETS, 20).map((row, k) => langRow(row, `${prefix}${k + 6}`, HI_SECTION, true))] };
};

const sets = [];
const add = (slug, kind, title, description, order, content, minutes, marks, sectionMarks) => {
  content.questions.forEach(check);
  if (sectionMarks) content.sectionMarks = sectionMarks;
  sets.push({ slug, examSlug: 'aissee', category: 'ENTRANCE', kind, level: LEVEL, title, description, durationMinutes: minutes,
    marksPerQuestion: marks, negativeMarks: 0, displayOrder: order, published: true, reviewedOn: REVIEWED, content });
};

// Full mocks in the configured order: Language (1–25), Mathematics (26–75), Intelligence (76–100), GK (101–125).
for (const [n, medium] of [[1, 'English'], [2, 'Hindi']]) {
  const lang = medium === 'English' ? englishSet(2, 'q') : hindiSet(2, 'q');
  const qs = [...lang.questions, ...mathsSet(r, 100 + n, seenMaths, 50, 'q'), ...intelligenceSet(r, 100 + n, seenInt, 25, 'q'), ...gkSet(1 + n, 'q')]
    .map((q, i) => ({ ...q, id: `q${i + 1}` }));
  if (qs.length !== 125) throw new Error(`mock ${n}: ${qs.length}`);
  add(`aissee-class6-mock-${n}`, 'MOCK', `AISSEE Class VI full mock test ${n} — ${medium}-medium language section (पूर्ण मॉक टेस्ट ${n})`,
    `A full-length paper in the Class VI pattern shown on SchoolDhundo: 125 questions, 300 marks, 150 minutes — Language 25, Mathematics 50 (3 marks each), Intelligence 25 and General Knowledge 25 (2 marks each). The language section is in ${medium}, as the real test is answered in the medium you choose; the other sections can be read in English or Hindi. No marks are taken off for wrong answers. ${ORIGINAL}`,
    200 + n, { passages: lang.passages, questions: qs }, 150, 2, { Mathematics: 3 });
}
for (let n = 1; n <= 4; n++) {
  add(`aissee-class6-maths-${n}`, 'QUIZ', `AISSEE Class VI Mathematics practice ${n} (गणित ${n})`,
    `25 questions across the AISSEE Class VI Mathematics syllabus — numbers, LCM & HCF, unitary method, fractions, ratio, profit & loss, simplification, average, percentage, simple interest, area & perimeter, angles, circle, units, Roman numerals, volume, primes, decimals, speed & time and temperature. 3 marks each, as in the exam. In English and Hindi, every answer worked out. ${ORIGINAL}`,
    210 + n, { passages: [], questions: mathsSet(r, n, seenMaths, 25) }, 30, 3);
}
for (let n = 1; n <= 3; n++) {
  add(`aissee-class6-intelligence-${n}`, 'QUIZ', `AISSEE Class VI Intelligence practice ${n} (बुद्धिमत्ता ${n})`,
    `25 questions on analogies, patterns, classification, visual and logical reasoning, series, coding and family relations, including figure questions. In English and Hindi. ${ORIGINAL}`,
    220 + n, { passages: [], questions: intelligenceSet(r, n, seenInt, 25) }, 30, 2);
}
for (let n = 1; n <= 2; n++) {
  add(`aissee-class6-gk-${n}`, 'QUIZ', `AISSEE Class VI General Knowledge practice ${n} (सामान्य ज्ञान ${n})`,
    `25 questions on national symbols, India, art and culture, awards, personalities, defence, sports, organisations, the solar system and earth, water, energy, food, farming, forests, scientific devices, diseases and living things. In English and Hindi. ${ORIGINAL}`,
    230 + n, { passages: [], questions: gkSet(n - 1, 'g') }, 30, 2);
  add(`aissee-class6-english-${n}`, 'QUIZ', `AISSEE Class VI Language practice ${n} — English`,
    `A reading passage with 5 questions and 20 on vocabulary, synonyms and antonyms, idioms, parts of speech, articles, prepositions, tenses, sentence types, question tags, word order, spelling, gender, number, collective nouns and rhyming words. For candidates taking the language section in English. ${ORIGINAL}`,
    240 + n, englishSet(n - 1, 'e'), 30, 2);
  add(`aissee-class6-hindi-${n}`, 'QUIZ', `AISSEE कक्षा 6 भाषा अभ्यास ${n} — हिंदी (Language practice — Hindi)`,
    `एक अपठित गद्यांश पर 5 प्रश्न और पर्यायवाची, विलोम, मुहावरे, शब्द-भंडार, संज्ञा, शब्द-भेद, काल, वाक्य, शब्द-क्रम, वर्तनी, लिंग, वचन, भ्रामक शब्द और तुकांत शब्दों पर 20 प्रश्न। हिंदी माध्यम से भाषा खंड देने वाले विद्यार्थियों के लिए। SchoolDhundo द्वारा लिखे गए; ये आधिकारिक या पिछले वर्षों के प्रश्न नहीं हैं।`,
    250 + n, hindiSet(n - 1, 'h'), 30, 2);
}

for (const s of sets) {
  const ids = new Set();
  for (const q of s.content.questions) {
    if (ids.has(q.id)) throw new Error(`${s.slug}: duplicate id ${q.id}`);
    ids.add(q.id);
    if (q.passageId && !s.content.passages.some((p) => p.id === q.passageId)) throw new Error(`${s.slug}/${q.id}: unknown passage`);
    if (q.hi === undefined) delete q.hi;
  }
}

const before = data.sets.filter((s) => s.slug.startsWith('aissee-class6-')).map((s) => s.slug);
data.sets = [...data.sets.filter((s) => !s.slug.startsWith('aissee-class6-')), ...sets];
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const bySection = {};
for (const s of sets) for (const q of s.content.questions) bySection[q.section] = (bySection[q.section] ?? 0) + 1;
console.log(`${sets.length} AISSEE Class VI sets, ${sets.reduce((n, s) => n + s.content.questions.length, 0)} questions (${Object.entries(bySection).map(([k, v]) => `${k} ${v}`).join(', ')}); practice.json now has ${data.sets.length} sets`);
const gone = before.filter((slug) => !sets.some((s) => s.slug === slug));
if (gone.length) console.log(`No longer built (unpublish on a live server): ${gone.join(', ')}`);
