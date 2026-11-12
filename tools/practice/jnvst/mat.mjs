// JNVST Class VI Mental Ability Test: original non-verbal questions generated from rules for the five parts the NVS
// prospectus lists (pattern completion, figure series, geometrical figure completion, mirror and water images,
// embedded figures). Every figure is data on a 100 × 100 grid (circle, square, triangle, arrow, dot, line) drawn by the
// site as SVG; the correct option is computed from the rule, so every key is right by construction. Prompts are
// bilingual; figure descriptions (alt text) are in English.
import { int, pick } from '../netarhat/core.mjs';

const S = (kind, x, y, size, rotate = 0, filled = false) => ({ kind, x, y, size, rotate, filled });
const fig = (alt, shapes) => ({ alt, shapes });
const norm = (a) => { let d = ((a % 360) + 360) % 360; if (d > 180) d -= 360; return d; };
const round = (v) => Math.round(v * 10) / 10;
const mirror = (s) => ({ ...s, x: round(100 - s.x), rotate: norm(-s.rotate) });
const water = (s) => ({ ...s, y: round(100 - s.y), rotate: norm(180 - s.rotate) });
const turn = (s) => ({ ...s, x: round(100 - s.x), y: round(100 - s.y), rotate: norm(s.rotate + 180) });
/** Identity of a question by its figures, whatever order the options were shuffled into. */
const key = (q) => JSON.stringify([q.figure, q.optionFigures.map((f) => JSON.stringify(f.shapes)).sort()]);

const DIR = { 0: 'up', 45: 'up-right', 90: 'right', 135: 'down-right', 180: 'down', '-135': 'down-left', '-90': 'left', '-45': 'up-left' };
const dir = (a) => DIR[String(norm(a))] ?? `${norm(a)}°`;
const KIND_EN = { circle: 'circle', square: 'square', triangle: 'triangle', arrow: 'arrow', dot: 'dot', line: 'line' };

const PROMPTS = {
  pattern: ['A part of the problem figure (marked by the empty corner) is missing. Which answer figure fits in the missing part, without changing direction, to complete the pattern?',
    'समस्या आकृति का एक भाग (खाली कोना) लुप्त है। कौन-सी उत्तर आकृति, बिना दिशा बदले, लुप्त भाग में बैठकर पैटर्न पूरा करेगी?'],
  series: ['The problem figures form a series. Which answer figure comes in the blank space as the fourth figure?',
    'समस्या आकृतियाँ एक श्रेणी बनाती हैं। चौथी आकृति के रिक्त स्थान पर कौन-सी उत्तर आकृति आएगी?'],
  complete: ['One part of a geometrical figure is given as the problem figure. Which answer figure, placed on it, completes the figure?',
    'समस्या आकृति में एक ज्यामितीय आकृति का एक भाग दिया है। कौन-सी उत्तर आकृति उस पर रखने से आकृति पूरी हो जाती है?'],
  mirror: ['A mirror is held along the right-hand edge of the problem figure. Which answer figure is its exact mirror image?',
    'समस्या आकृति के दाएँ किनारे पर एक दर्पण रखा है। कौन-सी उत्तर आकृति उसका सही दर्पण प्रतिबिंब है?'],
  water: ['The problem figure is placed on still water along its lower edge. Which answer figure is its water image?',
    'समस्या आकृति को उसके निचले किनारे के साथ शांत जल पर रखा गया है। कौन-सी उत्तर आकृति उसका जल प्रतिबिंब है?'],
  embedded: ['The problem figure is hidden in exactly one of the answer figures, the same size and the same way up. Which one?',
    'समस्या आकृति उत्तर आकृतियों में से ठीक एक में, उसी आकार और उसी दिशा में, छिपी है। कौन-सी?'],
};

/** Shuffles the four option figures with a seeded order and returns {optionFigures, answer}. */
function options(r, correct, wrong, explain) {
  const list = [{ f: correct, ok: true }, ...wrong.map((f) => ({ f, ok: false }))];
  for (let i = list.length - 1; i > 0; i--) { const j = int(r, 0, i); [list[i], list[j]] = [list[j], list[i]]; }
  const answer = list.findIndex((o) => o.ok);
  const letter = 'ABCD'[answer];
  return { optionFigures: list.map((o) => o.f), answer, letter, explanation: explain(letter) };
}

const build = (part, topic, difficulty, figure, figureAsksNext, o, hiWhy) => ({
  section: 'Mental Ability', topic, difficulty, prompt: PROMPTS[part][0], options: ['Figure A', 'Figure B', 'Figure C', 'Figure D'],
  answer: o.answer, explanation: o.explanation, figure, figureAsksNext, optionFigures: o.optionFigures,
  hi: { prompt: PROMPTS[part][1], options: ['आकृति A', 'आकृति B', 'आकृति C', 'आकृति D'], explanation: hiWhy(o.letter) },
});

// ── Part I: pattern completion (a 2 × 2 pattern inside a square with one corner missing) ────────────────────────
const Q = [[28, 28], [72, 28], [28, 72], [72, 72]]; // top-left, top-right, bottom-left, bottom-right
const QNAME = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];
const QNAME_HI = ['ऊपर-बाएँ', 'ऊपर-दाएँ', 'नीचे-बाएँ', 'नीचे-दाएँ'];
const CLOCK = [0, 1, 3, 2]; // reading corners clockwise from top-left

function patternQuestion(r) {
  const missing = int(r, 0, 3);
  const rule = pick(r, ['rotate', 'checker', 'count', 'size']);
  const tile = (shapesAt) => fig('', shapesAt(50, 50, 2)); // answer tile: same motif, drawn twice as large
  const grid = (motif) => fig('A square divided into four parts; one part is empty', [S('square', 50, 50, 88), S('line', 50, 50, 88, 0), S('line', 50, 50, 88, 90),
    ...Q.flatMap(([x, y], i) => (i === missing ? [] : motif(i)(x, y, 1)))]);
  const alt = (f, text) => ({ ...f, alt: text });
  if (rule === 'rotate') {
    const kind = pick(r, ['arrow', 'triangle']);
    const step = pick(r, [90, -90]);
    const base = pick(r, [0, 45]);
    const rotOf = (i) => norm(base + step * CLOCK.indexOf(i));
    const motif = (i) => (x, y, k) => [S(kind, x, y, 22 * k, rotOf(i))];
    const correct = alt(tile(motif(missing)), `${KIND_EN[kind]} pointing ${dir(rotOf(missing))}`);
    const wrong = [1, 2, 3].map((d) => alt(tile((x, y, k) => [S(kind, x, y, 22 * k, norm(rotOf(missing) + d * step))]), `${KIND_EN[kind]} pointing ${dir(rotOf(missing) + d * step)}`));
    const o = options(r, correct, wrong, (L) => `Going clockwise round the square, the ${KIND_EN[kind]} turns ${Math.abs(step)}° ${step > 0 ? 'clockwise' : 'anticlockwise'} each time, so the ${QNAME[missing]} part must point ${dir(rotOf(missing))}: figure ${L}.`);
    return build('pattern', 'Pattern completion', 'MEDIUM', [grid(motif)], false, o, (L) => `वर्ग में दक्षिणावर्त चलने पर ${kind === 'arrow' ? 'तीर' : 'त्रिभुज'} हर बार ${Math.abs(step)}° ${step > 0 ? 'दक्षिणावर्त' : 'वामावर्त'} घूमता है, इसलिए ${QNAME_HI[missing]} भाग में वही दिशा चाहिए: आकृति ${L}।`);
  }
  if (rule === 'checker') {
    const [a, b] = pick(r, [['circle', 'square'], ['triangle', 'circle'], ['square', 'triangle']]);
    const filled = r() < 0.5;
    const kindOf = (i) => (i === 0 || i === 3 ? a : b);
    const motif = (i) => (x, y, k) => [S(kindOf(i), x, y, 22 * k, 0, filled)];
    const want = kindOf(missing), other = want === a ? b : a;
    const third = ['circle', 'square', 'triangle'].find((k) => k !== a && k !== b);
    const correct = alt(tile(motif(missing)), `${filled ? 'filled ' : ''}${want}`);
    const wrong = [alt(tile((x, y, k) => [S(other, x, y, 22 * k, 0, filled)]), `${filled ? 'filled ' : ''}${other}`),
      alt(tile((x, y, k) => [S(want, x, y, 22 * k, 0, !filled)]), `${filled ? 'unfilled' : 'filled'} ${want}`),
      alt(tile((x, y, k) => [S(third, x, y, 22 * k, 0, filled)]), `${filled ? 'filled ' : ''}${third}`)];
    const o = options(r, correct, wrong, (L) => `Opposite corners hold the same shape: ${a} in the top-left and bottom-right, ${b} in the other two. The ${QNAME[missing]} part needs a ${filled ? 'filled ' : ''}${want}: figure ${L}.`);
    return build('pattern', 'Pattern completion', 'EASY', [grid(motif)], false, o, (L) => `आमने-सामने के कोनों में एक जैसी आकृति है। ${QNAME_HI[missing]} भाग में ${filled ? 'भरा हुआ ' : ''}${want === 'circle' ? 'वृत्त' : want === 'square' ? 'वर्ग' : 'त्रिभुज'} चाहिए: आकृति ${L}।`);
  }
  if (rule === 'count') {
    const countOf = (i) => i + 1; // 1, 2, 3, 4 dots in reading order
    const dots = (n, x, y, k) => Array.from({ length: n }, (_, j) => S('dot', x + (j - (n - 1) / 2) * 9 * k, y, 6 * k, 0, true));
    const motif = (i) => (x, y, k) => dots(countOf(i), x, y, k);
    const want = countOf(missing);
    const correct = alt(tile(motif(missing)), `${want} dots in a row`);
    const wrongCounts = [want + 1, want - 1 || want + 2, want + 2].filter((n, i, a) => n >= 1 && n <= 6 && a.indexOf(n) === i).slice(0, 3);
    while (wrongCounts.length < 3) wrongCounts.push(wrongCounts[wrongCounts.length - 1] + 1);
    const wrong = wrongCounts.map((n) => alt(tile((x, y, k) => dots(n, x, y, k)), `${n} dots in a row`));
    const o = options(r, correct, wrong, (L) => `Reading left to right and then down, the parts hold 1, 2, 3 and 4 dots. The ${QNAME[missing]} part needs ${want}: figure ${L}.`);
    return build('pattern', 'Pattern completion', 'EASY', [grid(motif)], false, o, (L) => `बाएँ से दाएँ और फिर नीचे पढ़ने पर भागों में 1, 2, 3 और 4 बिंदु हैं। ${QNAME_HI[missing]} भाग में ${want} बिंदु चाहिए: आकृति ${L}।`);
  }
  // size: the shape grows along the clockwise path
  const kind = pick(r, ['circle', 'square']);
  const sizes = [10, 16, 22, 28];
  const sizeOf = (i) => sizes[CLOCK.indexOf(i)];
  const motif = (i) => (x, y, k) => [S(kind, x, y, sizeOf(i) * k, 0, false)];
  const want = sizeOf(missing);
  const correct = alt(tile(motif(missing)), `${kind}, size ${want}`);
  const wrong = sizes.filter((s) => s !== want).map((s) => alt(tile((x, y, k) => [S(kind, x, y, s * k)]), `${kind}, size ${s}`));
  const o = options(r, correct, wrong, (L) => `Going clockwise from the top-left, the ${kind} grows a little each time. The ${QNAME[missing]} part needs the ${['smallest', 'second', 'third', 'largest'][CLOCK.indexOf(missing)]} size: figure ${L}.`);
  return build('pattern', 'Pattern completion', 'MEDIUM', [grid(motif)], false, o, (L) => `ऊपर-बाएँ से दक्षिणावर्त चलने पर ${kind === 'circle' ? 'वृत्त' : 'वर्ग'} हर बार थोड़ा बड़ा होता है। ${QNAME_HI[missing]} भाग में ${['सबसे छोटा', 'दूसरा', 'तीसरा', 'सबसे बड़ा'][CLOCK.indexOf(missing)]} आकार चाहिए: आकृति ${L}।`);
}

// ── Part II: figure series (three figures, find the fourth) ──────────────────────────────────────────────────────
function seriesQuestion(r) {
  const rule = pick(r, ['rotate', 'dots', 'fillrotate', 'grow', 'corner']);
  if (rule === 'rotate') {
    const kind = pick(r, ['arrow', 'triangle', 'line']);
    const step = pick(r, kind === 'line' ? [45, -45] : [45, 90, -45, -90]);
    const base = pick(r, [0, 45, 90]);
    const at = (n) => norm(base + step * n);
    const f = (n) => fig(`${KIND_EN[kind]} pointing ${dir(at(n))}`, [S('square', 50, 50, 90), S(kind, 50, 50, 50, at(n))]);
    const o = options(r, f(3), [4, 5, 6].map((n) => fig(`${KIND_EN[kind]} pointing ${dir(at(n))}`, [S('square', 50, 50, 90), S(kind, 50, 50, 50, at(n))])),
      (L) => `The ${KIND_EN[kind]} turns ${Math.abs(step)}° ${step > 0 ? 'clockwise' : 'anticlockwise'} in each figure, so the fourth figure points ${dir(at(3))}: figure ${L}.`);
    return build('series', 'Figure series', 'MEDIUM', [f(0), f(1), f(2)], true, o, (L) => `${kind === 'arrow' ? 'तीर' : kind === 'triangle' ? 'त्रिभुज' : 'रेखा'} हर आकृति में ${Math.abs(step)}° ${step > 0 ? 'दक्षिणावर्त' : 'वामावर्त'} घूमता है, इसलिए चौथी आकृति में वही अगली दिशा होगी: आकृति ${L}।`);
  }
  if (rule === 'dots') {
    const frame = pick(r, ['square', 'circle']);
    const dots = (n) => fig(`${frame} with ${n} dots`, [S(frame, 50, 50, 90), ...Array.from({ length: n }, (_, j) => S('dot', 50 + (j - (n - 1) / 2) * 14, 50, 8, 0, true))]);
    const start = int(r, 1, 2);
    const o = options(r, dots(start + 3), [dots(start + 2), dots(start + 4), dots(start + 5)], (L) => `One dot is added in each figure: ${start}, ${start + 1}, ${start + 2}, so the fourth has ${start + 3} dots: figure ${L}.`);
    return build('series', 'Figure series', 'EASY', [dots(start), dots(start + 1), dots(start + 2)], true, o, (L) => `हर आकृति में एक बिंदु जुड़ता है: ${start}, ${start + 1}, ${start + 2}, इसलिए चौथी में ${start + 3} बिंदु होंगे: आकृति ${L}।`);
  }
  if (rule === 'fillrotate') {
    const kind = pick(r, ['triangle', 'arrow']);
    const step = pick(r, [90, -90]);
    const f = (n, filledOverride) => fig(`${filledOverride ?? n % 2 === 0 ? 'filled' : 'unfilled'} ${KIND_EN[kind]} pointing ${dir(step * n)}`, [S(kind, 50, 50, 56, norm(step * n), filledOverride ?? n % 2 === 0)]);
    const o = options(r, f(3), [f(3, true), fig(`filled ${KIND_EN[kind]} pointing ${dir(step * 2)}`, [S(kind, 50, 50, 56, norm(step * 2), false)]), f(4)],
      (L) => `Two things change together: the ${KIND_EN[kind]} turns ${Math.abs(step)}° each time and is filled, unfilled, filled… so the fourth is unfilled and points ${dir(step * 3)}: figure ${L}.`);
    return build('series', 'Figure series', 'HARD', [f(0), f(1), f(2)], true, o, (L) => `दो बातें साथ बदलती हैं: ${kind === 'triangle' ? 'त्रिभुज' : 'तीर'} हर बार ${Math.abs(step)}° घूमता है और भरा, खाली, भरा… होता है, इसलिए चौथी आकृति खाली होगी और अगली दिशा में: आकृति ${L}।`);
  }
  if (rule === 'grow') {
    const kind = pick(r, ['circle', 'square', 'triangle']);
    const inner = pick(r, ['dot', 'square']);
    const sizes = [24, 38, 52, 66, 80];
    const f = (i) => fig(`${kind} of size ${sizes[i]} with a small ${inner} inside`, [S(kind, 50, 50, sizes[i]), S(inner, 50, 50, 8, 0, true)]);
    const o = options(r, f(3), [f(2), f(4), fig(`${kind} of size ${sizes[3]} without the ${inner}`, [S(kind, 50, 50, sizes[3])])],
      (L) => `The outer ${kind} grows by the same amount each time while the small ${inner} stays; the fourth figure is the next size with the ${inner}: figure ${L}.`);
    return build('series', 'Figure series', 'EASY', [f(0), f(1), f(2)], true, o, (L) => `बाहरी ${kind === 'circle' ? 'वृत्त' : kind === 'square' ? 'वर्ग' : 'त्रिभुज'} हर बार उतना ही बड़ा होता है और भीतर की छोटी आकृति वैसी ही रहती है; चौथी आकृति अगले आकार की होगी: आकृति ${L}।`);
  }
  // corner: a dot moves round the corners of a square, clockwise or anticlockwise
  const corners = [[25, 25], [75, 25], [75, 75], [25, 75]];
  const names = ['top-left', 'top-right', 'bottom-right', 'bottom-left'];
  const cw = r() < 0.5, start = int(r, 0, 3);
  const at = (n) => (((start + (cw ? n : -n)) % 4) + 4) % 4;
  const f = (c) => fig(`square with a dot in the ${names[c]} corner`, [S('square', 50, 50, 84), S('dot', corners[c][0], corners[c][1], 10, 0, true)]);
  const o = options(r, f(at(3)), [f(at(2)), f(at(1)), fig('square with a dot in the centre', [S('square', 50, 50, 84), S('dot', 50, 50, 10, 0, true)])],
    (L) => `The dot moves one corner ${cw ? 'clockwise' : 'anticlockwise'} each time, so in the fourth figure it is in the ${names[at(3)]} corner: figure ${L}.`);
  return build('series', 'Figure series', 'EASY', [f(at(0)), f(at(1)), f(at(2))], true, o, (L) => `बिंदु हर बार एक कोना ${cw ? 'दक्षिणावर्त' : 'वामावर्त'} खिसकता है, इसलिए चौथी आकृति में वह अगले कोने में होगा: आकृति ${L}।`);
}

// ── Part III: geometrical figure completion (square or triangle drawn as line segments; which piece completes it) ──
const SQ = { top: S('line', 50, 20, 60, 0), bottom: S('line', 50, 80, 60, 0), left: S('line', 20, 50, 60, 90), right: S('line', 80, 50, 60, 90) };
const TRI = { base: S('line', 50, 80, 60, 0), left: S('line', 35, 50, 67, -63.4), right: S('line', 65, 50, 67, 63.4) };
const shifted = (s, dx, dy) => ({ ...s, x: round(s.x + dx), y: round(s.y + dy) });

function completeQuestion(r) {
  const shape = pick(r, ['square', 'triangle']);
  if (shape === 'square') {
    const names = ['top', 'right', 'bottom', 'left'];
    const k = int(r, 0, 3);
    const two = r() < 0.5; // two adjacent sides missing, or one side
    const missing = two ? [names[k], names[(k + 1) % 4]] : [names[k]];
    const kept = names.filter((n) => !missing.includes(n));
    const extra = pick(r, [[S('line', 50, 50, 85, 45)], [S('line', 50, 50, 85, -45)], [S('dot', 50, 50, 10, 0, true)], [S('circle', 50, 50, 30)], [S('square', 50, 50, 20, 45)]]);
    const problem = fig(`${kept.length} sides of a square (${kept.join(', ')}) with a ${extra[0].kind} inside`, [...kept.map((n) => SQ[n]), ...extra]);
    const correct = fig(`${missing.join(' and ')} side${two ? 's' : ''} of the square`, missing.map((n) => SQ[n]));
    const side = (list, alt) => fig(alt, list.map((n) => SQ[n]));
    const wrong = two
      ? [side([names[(k + 2) % 4], names[(k + 3) % 4]], 'the two opposite sides'), side([missing[0]], `${missing[0]} side only`),
        side([missing[0], names[(k + 2) % 4]], 'two sides, one of them already there')]
      : [side([names[(k + 2) % 4]], `${names[(k + 2) % 4]} side`), side([names[(k + 1) % 4]], `${names[(k + 1) % 4]} side`),
        side([names[k], names[(k + 1) % 4]], `${names[k]} and ${names[(k + 1) % 4]} sides`)];
    const o = options(r, correct, wrong, (L) => `The problem figure shows the ${kept.join(', ')} side${kept.length > 1 ? 's' : ''} of a square. Exactly the missing ${missing.join(' and ')} side${two ? 's' : ''}, in place and with nothing extra, complete${two ? '' : 's'} it: figure ${L}.`);
    return build('complete', 'Geometrical figure completion', two ? 'MEDIUM' : 'EASY', [problem], false, o, (L) => `समस्या आकृति में वर्ग की ${kept.length} भुजाएँ दी हैं। ठीक लुप्त भुजा${two ? 'एँ' : ''}, अपनी जगह पर और बिना किसी अतिरिक्त रेखा के, वर्ग को पूरा करती${two ? ' हैं' : ' है'}: आकृति ${L}।`);
  }
  const names = ['base', 'left', 'right'];
  const keep = pick(r, names), missing = names.filter((n) => n !== keep);
  const extra = pick(r, [[S('dot', 50, 62, 9, 0, true)], [S('line', 50, 62, 30, 0)], [S('circle', 50, 62, 18)], [S('square', 50, 64, 14, 0)], [S('dot', 42, 66, 7, 0, true), S('dot', 58, 66, 7, 0, true)]]);
  const problem = fig(`the ${keep} side of a triangle with a ${extra[0].kind} inside`, [TRI[keep], ...extra]);
  const correct = fig(`${missing.join(' and ')} sides of the triangle`, missing.map((n) => TRI[n]));
  // Every wrong option is visibly different: the pair flipped upside down, one side only, or the given side again
  // with one missing side (so the triangle would have a doubled side and a gap).
  const wrong = [fig(`${missing.join(' and ')} sides, flipped upside down`, missing.map((n) => water(TRI[n]))),
    fig(`${missing[0]} side only`, [TRI[missing[0]]]),
    fig(`${keep} and ${missing[1]} sides`, [TRI[keep], TRI[missing[1]]])];
  const o = options(r, correct, wrong, (L) => `The problem figure has the ${keep} side of a triangle. Figure ${L} adds exactly the two missing sides, in place, so the three sides close the triangle. The others are upside down, have only one side, or repeat the side already there.`);
  return build('complete', 'Geometrical figure completion', 'MEDIUM', [problem], false, o, (L) => `समस्या आकृति में त्रिभुज की एक भुजा है। आकृति ${L} ठीक दोनों लुप्त भुजाएँ उनकी जगह पर जोड़ती है, जिससे त्रिभुज बंद हो जाता है। बाकी उलटी हैं, उनमें एक ही भुजा है, या पहले से मौजूद भुजा दोहराई गई है।`);
}

// ── Part IV: mirror and water images ─────────────────────────────────────────────────────────────────────────────
function mirrorQuestion(r) {
  const isWater = r() < 0.4;
  const main = pick(r, ['arrow', 'triangle']);
  const angle = pick(r, [30, 45, 60, 120, 135, 150, -30, -60]);
  const corner = pick(r, [[22, 22], [78, 22], [22, 78], [78, 78]]);
  const shapes = [S(main, 44, 52, 46, angle), S('dot', corner[0], corner[1], 10, 0, true), S('line', 74, 68, 26, pick(r, [0, 90, 45]))];
  const problem = fig(`a ${main} pointing ${dir(angle)}, a dot near one corner and a short line`, shapes);
  const apply = (fn, alt) => fig(alt, shapes.map(fn));
  const correct = apply(isWater ? water : mirror, isWater ? 'the figure flipped top to bottom' : 'the figure flipped left to right');
  const wrong = [apply((s) => s, 'the figure unchanged'), apply(isWater ? mirror : water, isWater ? 'the figure flipped left to right' : 'the figure flipped top to bottom'), apply(turn, 'the figure turned upside down (rotated 180°)')];
  const o = options(r, correct, wrong, (L) => (isWater
    ? `A water image flips the figure top to bottom: what was at the top goes to the bottom and left stays left. Only figure ${L} does this; the others are unchanged, mirrored sideways or rotated.`
    : `A mirror on the right flips the figure left to right: what was on the left goes to the right and the top stays at the top. Only figure ${L} does this; the others are unchanged, flipped vertically or rotated.`));
  return build(isWater ? 'water' : 'mirror', isWater ? 'Water image' : 'Mirror image', 'MEDIUM', [problem], false, o, (L) => (isWater
    ? `जल प्रतिबिंब में आकृति ऊपर-नीचे उलट जाती है: ऊपर का भाग नीचे जाता है और बायाँ बायाँ ही रहता है। केवल आकृति ${L} ऐसी है।`
    : `दाईं ओर रखे दर्पण में आकृति बाएँ-दाएँ उलट जाती है: बाएँ का भाग दाएँ जाता है और ऊपर का ऊपर ही रहता है। केवल आकृति ${L} ऐसी है।`));
}

// ── Part V: embedded figures ─────────────────────────────────────────────────────────────────────────────────────
// Only lopsided small figures are used, so a mirrored or turned copy is a different figure. The wrong options hide a
// mirrored copy, a copy turned 90°, or the figure with one of its pieces missing; the extra lines and shapes drawn
// around it never touch it and never rebuild a missing piece.
const turn90 = (s) => ({ ...s, x: round(100 - s.y), y: round(s.x), rotate: norm(s.rotate + 90) });
const EMBED_BASES = [
  { alt: 'a triangle with a short line sticking out up and to the right of its top', shapes: [S('triangle', 50, 56, 38, 0), S('line', 62, 34, 22, -45)] },
  { alt: 'a square with a dot outside its top-right corner', shapes: [S('square', 46, 54, 32, 0), S('dot', 70, 30, 9, 0, true)] },
  { alt: 'an arrow pointing right with a small square at its tail', shapes: [S('arrow', 54, 50, 40, 90), S('square', 28, 50, 12, 0)] },
  { alt: 'a triangle with a dot inside near its lower-left corner', shapes: [S('triangle', 50, 52, 46, 0), S('dot', 40, 62, 8, 0, true)] },
  { alt: 'a circle with a short line leaving it towards the lower right', shapes: [S('circle', 44, 46, 28), S('line', 64, 66, 22, 45)] },
  { alt: 'an arrow pointing up with a dot to its left', shapes: [S('arrow', 54, 50, 42, 0), S('dot', 34, 40, 9, 0, true)] },
];
const EMBED_EXTRAS = [
  [S('square', 50, 50, 92)],
  [S('square', 50, 50, 92), S('circle', 18, 82, 14)],
  [S('circle', 50, 50, 94), S('square', 82, 82, 10, 0)],
  [S('square', 50, 50, 92), S('line', 50, 88, 70, 0)],
];

function embeddedQuestion(r) {
  const pickedBase = pick(r, EMBED_BASES), extras = pick(r, EMBED_EXTRAS);
  const quarter = int(r, 0, 3);
  let shapes = pickedBase.shapes;
  for (let i = 0; i < quarter; i++) shapes = shapes.map(turn90);
  const base = { alt: quarter ? `${pickedBase.alt}, turned ${quarter * 90}° clockwise` : pickedBase.alt, shapes };
  const problem = fig(base.alt, base.shapes);
  const big = (shapes, alt) => fig(alt, [...shapes, ...extras]);
  const correct = big(base.shapes, `a frame that contains ${base.alt}, unchanged`);
  const wrong = [
    big(base.shapes.map(mirror), 'a frame that contains the small figure mirrored left to right'),
    big(base.shapes.map(turn90), 'a frame that contains the small figure turned a quarter turn'),
    big(base.shapes.slice(0, 1), 'a frame that contains the small figure with one piece missing'),
  ];
  const o = options(r, correct, wrong, (L) => `Look for the whole problem figure, the same size and the same way up. Only figure ${L} contains it unchanged; in the others it is mirrored, turned or missing a piece.`);
  return build('embedded', 'Embedded figure', 'MEDIUM', [problem], false, o, (L) => `पूरी समस्या आकृति को उसी आकार में और उसी दिशा में खोजिए। केवल आकृति ${L} में वह बिना बदले मौजूद है; बाकी में वह उलटी, घूमी हुई या अधूरी है।`);
}

const PARTS = [patternQuestion, seriesQuestion, completeQuestion, mirrorQuestion, embeddedQuestion];

/** 20 questions in the official order: four from each of the five parts, each new to the bank (by its figures). */
export function matSet(r, seen, prefix = 'm') {
  const out = [];
  let n = 0;
  for (const make of PARTS) {
    for (let i = 0; i < 4; i++) {
      let q;
      for (let tries = 0; tries < 60; tries++) {
        q = make(r);
        const k = key(q);
        if (!seen.has(k)) { seen.add(k); break; }
        q = null;
      }
      if (!q) throw new Error(`mat: could not make a new question for part ${PARTS.indexOf(make) + 1}`);
      out.push({ id: `${prefix}${++n}`, ...q });
    }
  }
  return out;
}

export const MAT_TOPICS = ['Pattern completion', 'Figure series', 'Geometrical figure completion', 'Mirror image', 'Water image', 'Embedded figure'];
