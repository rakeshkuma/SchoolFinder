// Shared helpers for the Netarhat practice builder: a seeded random generator (so every run gives the same bank),
// option shuffling that keeps the answer index right, and Indian number formatting.

export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const pick = (r, list) => list[Math.floor(r() * list.length)];
export const int = (r, lo, hi) => lo + Math.floor(r() * (hi - lo + 1));

/** "12,34,567" style grouping as used in Indian textbooks. */
export const inr = (n) => Number(n).toLocaleString('en-IN');

/**
 * Builds a question from a correct value and distractors, placing the answer at a seeded position. Values are
 * compared as strings, so duplicates are dropped; at least three distractors must remain.
 */
export function mcq(r, { id, section, topic, difficulty, prompt, correct, wrong, explanation, hi, fmt = String }) {
  const seen = new Set([fmt(correct)]);
  const distractors = [];
  for (const w of wrong) {
    const s = fmt(w);
    if (!seen.has(s)) {
      seen.add(s);
      distractors.push(w);
    }
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) throw new Error(`${id}: not enough distinct distractors`);
  const answer = Math.floor(r() * 4);
  const values = [...distractors];
  values.splice(answer, 0, correct);
  const options = values.map(fmt);
  const q = { id, section, topic, difficulty, prompt, options, answer, explanation };
  if (hi) {
    const hiFmt = hi.fmt ?? fmt;
    q.hi = { prompt: hi.prompt, options: values.map(hiFmt), explanation: hi.explanation };
  }
  return q;
}

/** A hand-written question; options[answer] is correct. Hindi options follow the same order. */
export function fixed({ id, section, topic, difficulty, prompt, options, answer, explanation, hi }) {
  const q = { id, section, topic, difficulty, prompt, options, answer, explanation };
  if (hi) q.hi = { prompt: hi.prompt, options: hi.options ?? options, explanation: hi.explanation };
  return q;
}

/** Moves the correct option to a seeded position so answers are not always "A". */
export function shuffleFixed(r, q) {
  const target = Math.floor(r() * q.options.length);
  const move = (list) => {
    const out = [...list];
    const [item] = out.splice(q.answer, 1);
    out.splice(target, 0, item);
    return out;
  };
  const out = { ...q, options: move(q.options), answer: target };
  if (q.hi) out.hi = { ...q.hi, options: move(q.hi.options) };
  return out;
}

/** Checks a question the way the import does, plus the builder's own rules. */
export function check(q) {
  const fail = (m) => { throw new Error(`${q.id}: ${m}`); };
  if (!/^[a-z0-9-]+$/.test(q.id)) fail('bad id');
  if (q.options.length < 2 || q.options.length > 5) fail('option count');
  if (new Set(q.options).size !== q.options.length) fail(`duplicate options ${q.options}`);
  if (q.answer < 0 || q.answer >= q.options.length) fail('answer index');
  if (q.prompt.length > 1000 || q.explanation.length > 1000) fail('too long');
  if (q.options.some((o) => !o || o.length > 300)) fail('option text');
  if (q.hi) {
    if (q.hi.options.length !== q.options.length) fail('hi option count');
    if (new Set(q.hi.options).size !== q.hi.options.length) fail('hi duplicate options');
  }
  return q;
}

/**
 * Runs a generator until it yields a question not yet in the bank (same prompt and options), so repeated sets
 * never repeat a question.
 */
export function unique(seen, make, tries = 40) {
  for (let i = 0; i < tries; i++) {
    const q = make();
    const key = `${q.prompt}|${[...q.options].sort().join('|')}`;
    if (!seen.has(key)) {
      seen.add(key);
      return q;
    }
  }
  throw new Error('could not generate a new question');
}
