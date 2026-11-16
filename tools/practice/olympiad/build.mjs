// Builds the class-wise Olympiad practice sets (Classes I–X) from the question files in this folder and writes them
// into practice.json. It owns only the sets whose slug starts with "olympiad-class"; every other set, including the
// older "olympiad-maths-class5-1", is left byte-for-byte unchanged (checked before writing).
//
// Usage: node tools/practice/olympiad/build.mjs backend/src/main/resources/seed/practice.json [--import-file out.json]
//   --import-file also writes just the new sets, in the admin import format, for loading into a running server.
//
// Every question is checked before it is accepted:
//   - the rules of the admin import (4 options here, no repeated option, Hindi options one-to-one, lengths);
//   - a real explanation (not "Option C is correct"), a topic, a chapter and a difficulty;
//   - computed answers: where a row carries a verify function, its result must equal the correct option;
//   - duplicates: against every question already in practice.json (all exams) and within this batch, by exact text,
//     by text with the numbers blanked out (the same question with altered numbers), by word overlap and, for figure
//     questions, by their figures. Anything flagged is left out and reported, never imported.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { rng } from '../netarhat/core.mjs';
import { mirrorQuestion, patternQuestion, seriesQuestion } from '../jnvst/mat.mjs';
import { MATHS, IOQM } from './maths.mjs';
import { SCIENCE } from './science.mjs';
import { ENGLISH, PASSAGES } from './english.mjs';
import { REASONING, FIGURES } from './reasoning.mjs';

const args = process.argv.slice(2);
const file = args[0];
if (!file) throw new Error('usage: node build.mjs <path/to/practice.json> [--import-file out.json]');
const importFile = args.includes('--import-file') ? args[args.indexOf('--import-file') + 1] : null;
const here = dirname(fileURLToPath(import.meta.url));

const OWN = 'olympiad-class';
const REVIEWED = '2026-11-16';
const ROMAN = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
const DIFF = { E: 'EASY', M: 'MEDIUM', H: 'HARD' };
const ORIGINAL = 'Original Olympiad-style practice written by SchoolDhundo. Not taken from SOF, HBCSE or any Olympiad paper, and not official or previous-year questions.';
const r = rng(20261116);

const raw = readFileSync(file, 'utf8');
const data = JSON.parse(raw);
const others = data.sets.filter((s) => !s.slug.startsWith(OWN));
const othersBefore = JSON.stringify(others);

// --- duplicate detection -------------------------------------------------------------------------------------------
const STOP = new Set(['the', 'a', 'an', 'of', 'is', 'are', 'in', 'to', 'and', 'what', 'which', 'how', 'many', 'for', 'it', 'its', 'on', 'at', 'by', 'with', 'from', 'this', 'that', 'these', 'be', 'does', 'do', 'there', 'has', 'have']);
// Only ordinary punctuation is dropped: symbols such as ○ △ × √ are part of a question.
const norm = (s) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[.,;:!?"'()[\]_—–\-/]+/g, ' ').replace(/\s+/g, ' ').trim();
const shape = (s) => norm(s).replace(/\d+/g, '#');
const wordCount = (s) => (s.match(/\p{L}{2,}/gu) ?? []).length;
const words = (s) => new Set(norm(s).split(' ').filter((w) => w && !STOP.has(w)));
const jaccard = (a, b) => { let i = 0; for (const w of a) if (b.has(w)) i++; return i / (a.size + b.size - i || 1); };
const figKey = (q) => (q.figure ? JSON.stringify([q.figure, (q.optionFigures ?? []).map((f) => JSON.stringify(f.shapes)).sort()]) : null);
const bank = [];
const remember = (where, q) => bank.push({ where, prompt: norm(q.prompt), shape: shape(q.prompt), words: words(q.prompt), options: new Set(q.options.map(norm)),
  key: norm(q.options[q.answer]), fig: figKey(q) });
for (const s of others) for (const q of s.content.questions) remember(`${s.slug}/${q.id}`, q);
const existingCount = bank.length;
const common = (a, b) => [...a].filter((x) => b.has(x)).length;

/**
 * The first earlier question this one repeats, or null. Figure questions are compared by their figures only. A short
 * stem ("Which word is spelt correctly?", "What comes next? 2, 4, 6") is shared by many different questions, so for
 * those the options or the answer must match as well.
 */
function duplicateOf(q) {
  const f = figKey(q);
  if (f) return bank.find((b) => b.fig === f)?.where ?? null;
  const p = norm(q.prompt), sh = shape(q.prompt), w = words(q.prompt), o = new Set(q.options.map(norm)), key = norm(q.options[q.answer]);
  const stemWords = wordCount(sh.replace(/#/g, ''));
  const numbers = (sh.match(/#/g) ?? []).length;
  // In "Find the odd one out: 21, 35, 49, 54" the numbers are the question, so a short stem with a list of three or
  // more numbers is not "the same question with other numbers".
  const numbersAreTheQuestion = numbers >= 3 && stemWords < 8;
  const wordyKey = key.length >= 4 && !/^[\d\s.,%₹#]+$/.test(key);
  for (const b of bank) {
    if (b.fig) continue;
    const sameAnswerOrOptions = b.key === key || common(b.options, o) >= 2;
    if (b.prompt === p && (stemWords >= 6 || sameAnswerOrOptions)) return `${b.where} (same question)`;
    if (stemWords >= 5 && !numbersAreTheQuestion && b.shape === sh && sh.includes('#')) return `${b.where} (same question with other numbers)`;
    const j = jaccard(w, b.words);
    if ((stemWords >= 6 && j >= 0.85) ||(j >= 0.6 && (b.key === key || common(b.options, o) >= 3)) || (j >= 0.4 && wordyKey && b.key === key)) {
      return `${b.where} (${Math.round(j * 100)}% word overlap, similar answer)`;
    }
  }
  return null;
}

// --- checks --------------------------------------------------------------------------------------------------------
const DEVANAGARI = /[ऀ-ॿ]/;
const GENERIC = /^(option|answer)\s*[a-d]?\s*(is)?\s*(the)?\s*(correct|right)/i;
function check(q, where) {
  const fail = (m) => { throw new Error(`${where}: ${m}`); };
  if (q.options.length !== 4) fail('needs exactly 4 options');
  if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) fail(`repeats an option: ${q.options}`);
  if (q.answer < 0 || q.answer > 3) fail('answer index');
  if (!q.prompt || q.prompt.length > 1000) fail('prompt length');
  if (!q.explanation || q.explanation.length < 25 || q.explanation.length > 1000 || GENERIC.test(q.explanation)) fail('explanation must explain, in 25–1000 characters');
  if (q.options.some((o) => !o.trim() || o.length > 300)) fail('option text');
  if (!q.topic || q.topic.length > 80 || !q.chapter || q.chapter.length > 80 || q.section.length > 60) fail('topic / chapter / section');
  if (!['EASY', 'MEDIUM', 'HARD'].includes(q.difficulty)) fail('difficulty');
  if (q.hi) {
    if (q.hi.options.length !== 4 || new Set(q.hi.options.map((o) => o.trim())).size !== 4) fail('Hindi options must be 4 and distinct');
    // A prompt made only of symbols and codes ("4 : 16 :: 6 : ?") reads the same in both languages.
    const hasWords = /[a-z]{4,}/.test(q.prompt);
    if ((hasWords && !DEVANAGARI.test(q.hi.prompt)) || !DEVANAGARI.test(q.hi.explanation)) fail('Hindi text is not in Hindi');
    if (q.hi.prompt.length > 1000 || q.hi.explanation.length > 1000 || q.hi.options.some((o) => o.length > 300)) fail('Hindi lengths');
  }
}

// --- building questions --------------------------------------------------------------------------------------------
const stats = { verified: 0, rejected: [], figures: 0 };
/** Answer positions for a set: each of A–D equally often, in a seeded order. */
function positions(n) {
  const out = [];
  while (out.length < n) {
    const block = [0, 1, 2, 3];
    for (let i = 3; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [block[i], block[j]] = [block[j], block[i]]; }
    out.push(...block);
  }
  return out.slice(0, n);
}
const move = (list, to) => { const out = [...list]; const [first] = out.splice(0, 1); out.splice(to, 0, first); return out; };

/** A row (correct option first) as a question with its answer moved to `to`. */
function fromRow(row, section, to, where, english = false) {
  const [chapter, topic, d, prompt, options, explanation, ...rest] = row;
  let hi = null, verify = null;
  if (english) verify = rest[0];
  else { const [hiPrompt, hiOptions, hiWhy, v] = rest; hi = { prompt: hiPrompt, options: hiOptions ?? options, explanation: hiWhy }; verify = v; }
  if (typeof verify === 'function') {
    const got = String(verify());
    if (got !== options[0]) throw new Error(`${where}: computed answer "${got}" does not match the keyed answer "${options[0]}"`);
    stats.verified++;
  }
  const q = { section, chapter, topic, difficulty: DIFF[d], prompt, options: move(options, to), answer: to, explanation };
  if (hi) q.hi = { prompt: hi.prompt, options: move(hi.options, to), explanation: hi.explanation };
  return q;
}

const FIG_MAKERS = { series: seriesQuestion, mirror: mirrorQuestion, pattern: patternQuestion };
const FIG_CHAPTER = { 'Figure series': 'Figure patterns', 'Pattern completion': 'Figure patterns', 'Mirror image': 'Mirror and water images', 'Water image': 'Mirror and water images' };
function figureQuestion(kind, where) {
  for (let tries = 0; tries < 80; tries++) {
    const g = FIG_MAKERS[kind](r);
    const q = { section: 'Logical Reasoning', chapter: FIG_CHAPTER[g.topic] ?? 'Figure patterns', topic: g.topic, difficulty: g.difficulty, prompt: g.prompt, options: g.options,
      answer: g.answer, explanation: g.explanation, figure: g.figure, figureAsksNext: g.figureAsksNext, optionFigures: g.optionFigures, hi: g.hi };
    if (!duplicateOf(q)) { stats.figures++; return q; }
  }
  throw new Error(`${where}: could not make a new ${kind} figure question`);
}

/** Accepts a question unless it repeats one already in the bank; numbers it within its set. */
function accept(list, q, where) {
  check(q, where);
  const dup = duplicateOf(q);
  if (dup) { stats.rejected.push({ where, prompt: q.prompt, duplicateOf: dup }); return; }
  remember(where, q);
  list.push({ id: `q${list.length + 1}`, ...q });
}

const IOQM_SECTION = 'IOQM-style Mathematics';
/** The IOQM area of a problem from its topic: number theory, algebra, geometry or combinatorics. */
function ioqmArea(topic) {
  if (/^(Number theory|Counting divisors)/.test(topic)) return 'Number theory';
  if (/^(Algebra|Sequences)/.test(topic)) return 'Algebra';
  if (/^Geometry/.test(topic)) return 'Geometry';
  if (/^(Counting|Probability)/.test(topic)) return 'Combinatorics';
  throw new Error(`no IOQM area for topic "${topic}"`);
}

const sets = [];
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const listOf = (items) => (items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
function addSet(n, key, title, about, order, questions, passages = []) {
  if (questions.length === 0) return;
  const chapters = [...new Set(questions.map((q) => q.chapter))];
  const hindi = questions.every((q) => q.hi);
  const hots = questions.filter((q) => q.difficulty === 'HARD').length;
  const description = `${questions.length} questions for Class ${ROMAN[n]} on ${listOf(chapters.map(lower))}${hots ? `, including ${hots} higher-order thinking question${hots === 1 ? '' : 's'}` : ''}. ${about}${hindi ? ' In English and Hindi.' : ''} Every answer is explained. ${ORIGINAL}`;
  if (description.length > 1000) throw new Error(`${key}: description too long`);
  sets.push({ slug: `${OWN}${n}-${key}`, examSlug: null, category: 'OLYMPIAD', kind: 'QUIZ', level: `Class ${ROMAN[n]}`, title, description, durationMinutes: null,
    marksPerQuestion: 1, negativeMarks: 0, displayOrder: 300 + n * 10 + order, published: true, reviewedOn: REVIEWED, content: { passages, questions } });
}

for (let n = 1; n <= 10; n++) {
  const R = ROMAN[n];
  // Mathematics
  {
    const rows = MATHS[n] ?? [];
    const pos = positions(rows.length);
    const out = [];
    rows.forEach((row, i) => accept(out, fromRow(row, 'Mathematics', pos[i], `class ${n} maths ${i + 1}`), `class ${n} maths ${i + 1}`));
    addSet(n, 'maths-1', `Olympiad Mathematics practice: Class ${R}`, 'Mathematical reasoning and everyday mathematics in the style of school Olympiads.', 1, out);
  }
  // IOQM-style (Classes VIII–X): a subject of its own, so ordinary Mathematics practice and mixed tests never include
  // these harder problems unless a student chooses them. Chapters are the four IOQM areas.
  if (IOQM[n]) {
    const rows = IOQM[n].map((row) => [ioqmArea(row[1]), ...row.slice(1)]);
    const pos = positions(rows.length);
    const out = [];
    rows.forEach((row, i) => accept(out, fromRow(row, IOQM_SECTION, pos[i], `class ${n} ioqm ${i + 1}`), `class ${n} ioqm ${i + 1}`));
    addSet(n, 'ioqm-style-1', `IOQM-style problems: Class ${R}${n === 8 ? ' (introduction)' : ''}`,
      `${n === 8 ? 'A first step towards IOQM-style problem solving, for students who enjoy harder mathematics; it is optional, not part of the regular Class VIII practice.' : 'Problems in the style of the IOQM, for students preparing for the Mathematical Olympiad.'} In the real IOQM every answer is a whole number from 0 to 99 and is written, not chosen; here each problem has four choices.`,
      2, out);
  }
  // Science
  {
    const rows = SCIENCE[n] ?? [];
    const pos = positions(rows.length);
    const out = [];
    rows.forEach((row, i) => accept(out, fromRow(row, 'Science', pos[i], `class ${n} science ${i + 1}`), `class ${n} science ${i + 1}`));
    addSet(n, 'science-1', `Olympiad Science practice: Class ${R}`, n >= 9 ? 'Physics, chemistry and biology from the Class syllabus, with reasoning-based questions.' : 'Concepts and everyday science, with reasoning-based questions.', 3, out);
  }
  // English (with a reading passage from Class III)
  {
    const rows = ENGLISH[n] ?? [];
    const passage = PASSAGES[n];
    const total = rows.length + (passage ? passage.questions.length : 0);
    const pos = positions(total);
    const out = [];
    let k = 0;
    const passages = [];
    if (passage) {
      if (passage.text.length > 4000 || passage.title.length > 200) throw new Error(`class ${n} passage too long`);
      passages.push({ id: passage.id, title: passage.title, text: passage.text });
      passage.questions.forEach(([topic, d, prompt, options, why], i) => {
        const where = `class ${n} english passage ${i + 1}`;
        const q = fromRow(['Reading', topic, d, prompt, options, why], 'English', pos[k++], where, true);
        check(q, where);
        out.push({ id: `q${out.length + 1}`, ...q, passageId: passage.id }); // questions on a new passage cannot repeat old ones
        remember(where, q);
      });
    }
    rows.forEach((row, i) => accept(out, fromRow(row, 'English', pos[k++], `class ${n} english ${i + 1}`, true), `class ${n} english ${i + 1}`));
    addSet(n, 'english-1', `Olympiad English practice: Class ${R}`, `Word and structure knowledge${passage ? ', reading' : ''} and spoken and written expression. English only, because these questions test English itself.`, 4, out, passages);
  }
  // Logical Reasoning (with figure questions in Classes III–VI)
  {
    const rows = REASONING[n] ?? [];
    const pos = positions(rows.length);
    const out = [];
    rows.forEach((row, i) => accept(out, fromRow(row, 'Logical Reasoning', pos[i], `class ${n} reasoning ${i + 1}`), `class ${n} reasoning ${i + 1}`));
    for (const kind of FIGURES[n] ?? []) {
      const where = `class ${n} reasoning figure ${kind}`;
      const q = figureQuestion(kind, where);
      check(q, where);
      remember(where, q);
      out.push({ id: `q${out.length + 1}`, ...q });
    }
    addSet(n, 'reasoning-1', `Logical Reasoning practice: Class ${R}`, 'Verbal and non-verbal reasoning as tested in the Logical Reasoning section of school Olympiads.', 5, out);
  }
}

// --- write ---------------------------------------------------------------------------------------------------------
for (const s of sets) {
  const ids = new Set();
  for (const q of s.content.questions) {
    if (ids.has(q.id)) throw new Error(`${s.slug}: duplicate id ${q.id}`);
    ids.add(q.id);
  }
}
if (JSON.stringify(data.sets.filter((s) => !s.slug.startsWith(OWN))) !== othersBefore) throw new Error('another set changed');
const before = data.sets.filter((s) => s.slug.startsWith(OWN)).map((s) => s.slug);
data.sets = [...others, ...sets];
// The seed loader imports the whole file at once, and an import holds at most 200 sets (PracticeImportRequest).
if (data.sets.length > 200) throw new Error(`practice.json would hold ${data.sets.length} sets; one import accepts at most 200`);
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
if (JSON.stringify(JSON.parse(readFileSync(file, 'utf8')).sets.filter((s) => !s.slug.startsWith(OWN))) !== othersBefore) throw new Error('other sets were altered on write');
if (importFile) writeFileSync(importFile, JSON.stringify({ sets }, null, 2) + '\n');

// --- report --------------------------------------------------------------------------------------------------------
const all = sets.flatMap((s) => s.content.questions.map((q) => ({ ...q, level: s.level, n: ROMAN.indexOf(s.level.replace('Class ', '')) })));
const tally = (key) => all.reduce((m, q) => ({ ...m, [key(q)]: (m[key(q)] ?? 0) + 1 }), {});
const group = (n) => (n <= 2 ? 'Classes 1–2' : n <= 5 ? 'Classes 3–5' : n <= 8 ? 'Classes 6–8' : 'Classes 9–10');
const pct = (v) => `${Math.round((v / all.length) * 1000) / 10}%`;
const byGroup = tally((q) => group(q.n));
const answers = tally((q) => 'ABCD'[q.answer]);
const md = [
  '# Olympiad question bank: build report',
  '',
  `Generated by \`node tools/practice/olympiad/build.mjs\`. Reviewed on ${REVIEWED}.`,
  '',
  `- New questions: **${all.length}** in **${sets.length}** sets (Classes I–X); ${all.filter((q) => q.hi).length} also in Hindi.`,
  `- Answers recomputed by machine: ${stats.verified}; figure questions generated from rules: ${stats.figures}; the rest checked by hand.`,
  `- Compared against ${existingCount} questions already in practice.json; left out as duplicates: ${stats.rejected.length}.`,
  `- Correct answers by position: ${Object.entries(answers).sort().map(([k, v]) => `${k} ${v}`).join(', ')}.`,
  '',
  '## By class group',
  '',
  '| Group | Questions | Share |',
  '|---|---:|---:|',
  ...['Classes 1–2', 'Classes 3–5', 'Classes 6–8', 'Classes 9–10'].map((g) => `| ${g} | ${byGroup[g] ?? 0} | ${pct(byGroup[g] ?? 0)} |`),
  '',
  '## By class and subject',
  '',
  '| Class | Mathematics | IOQM-style | Science | English | Logical Reasoning | Total |',
  '|---|---:|---:|---:|---:|---:|---:|',
  ...[...Array(10).keys()].map((i) => i + 1).map((n) => {
    const of = (pred) => all.filter((q) => q.n === n && pred(q)).length;
    return `| ${ROMAN[n]} | ${of((q) => q.section === 'Mathematics')} | ${of((q) => q.section === IOQM_SECTION)} | ${of((q) => q.section === 'Science')} | ${of((q) => q.section === 'English')} | ${of((q) => q.section === 'Logical Reasoning')} | ${of(() => true)} |`;
  }),
  '',
  '## By difficulty',
  '',
  ...Object.entries(tally((q) => q.difficulty)).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Sets',
  '',
  '| Slug | Title | Questions | Hindi |',
  '|---|---|---:|---|',
  ...sets.map((s) => `| \`${s.slug}\` | ${s.title} | ${s.content.questions.length} | ${s.content.questions.every((q) => q.hi) ? 'yes' : 'no'} |`),
  '',
  '## Topics (class · subject · chapter: questions)',
  '',
  ...Object.entries(tally((q) => `${q.level} · ${q.section} · ${q.chapter}`)).map(([k, v]) => `- ${k}: ${v}`),
  '',
  '## Left out as possible duplicates',
  '',
  ...(stats.rejected.length ? stats.rejected.map((x) => `- ${x.where}: "${x.prompt}" — repeats ${x.duplicateOf}`) : ['None.']),
  '',
];
writeFileSync(join(here, 'REPORT.md'), md.join('\n'));
console.log(`${sets.length} Olympiad sets, ${all.length} questions (${Object.entries(byGroup).map(([k, v]) => `${k} ${v}`).join(', ')}); ${stats.verified} answers machine-checked; ${stats.rejected.length} left out as duplicates; practice.json now has ${data.sets.length} sets.`);
for (const x of stats.rejected) console.log(`  duplicate: ${x.where}: ${x.prompt.slice(0, 90)} — ${x.duplicateOf}`);
const gone = before.filter((slug) => !sets.some((s) => s.slug === slug));
if (gone.length) console.log(`No longer built (unpublish on a live server): ${gone.join(', ')}`);
