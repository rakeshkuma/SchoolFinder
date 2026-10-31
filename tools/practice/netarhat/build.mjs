// Phase 7: builds the Netarhat question bank — 25 original practice sets of 20 questions (500 in all), five per
// subject of Paper 1 (Mental Ability, Hindi, Mathematics, Science, Social Studies) at Class 5 level — and writes them
// into practice.json. Usage: node build.mjs <path/to/practice.json>. Re-running replaces these sets, never duplicates.
import { readFileSync, writeFileSync } from 'node:fs';
import { check, fixed, rng, shuffleFixed } from './core.mjs';
import { hindiSet } from './hindi.mjs';
import { mathsSet } from './maths.mjs';
import { mentalSet } from './mental.mjs';
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
        + ' is a fair pace. Written by India School Finder; these are not official questions, and the subjective Paper 2 is not covered here.',
      durationMinutes: 30, displayOrder: s.order + n, published: true, reviewedOn: REVIEWED, content,
    });
  }
}

const ids = new Set(sets.map((s) => s.slug));
data.sets = [...data.sets.filter((s) => !ids.has(s.slug)), ...sets];
writeFileSync(file, JSON.stringify(data, null, 2) + '\n');
const total = sets.reduce((n, s) => n + s.content.questions.length, 0);
console.log(`${sets.length} Netarhat sets, ${total} questions; practice.json now has ${data.sets.length} sets`);
