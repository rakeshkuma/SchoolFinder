// Mathematics at Class 5 level (the level the Netarhat advertisement sets). Each generator works out its own answer,
// so every key is correct by construction; distractors are the usual slips (wrong operation, place value, carry).
import { int, inr, mcq, pick, unique } from './core.mjs';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((d) => n % d);
const roman = (n) => [[100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  .reduce((s, [v, l]) => { while (n >= v) { s += l; n -= v; } return s; }, '');

const NAMES = [['Ravi', 'रवि'], ['Sita', 'सीता'], ['Aman', 'अमन'], ['Priya', 'प्रिया'], ['Birsa', 'बिरसा'], ['Meena', 'मीना'], ['Salim', 'सलीम'], ['Anita', 'अनिता']];

const GENERATORS = [
  // 1. Place value
  (r) => {
    const n = int(r, 1_00_000, 9_99_999);
    const digits = String(n).split('').map(Number);
    let pos = int(r, 1, 4);
    while (digits[digits.length - 1 - pos] === 0) pos = (pos % 4) + 1;
    const d = digits[digits.length - 1 - pos];
    const v = d * 10 ** pos;
    return {
      topic: 'Place value', difficulty: 'EASY', correct: v, wrong: [d * 10 ** (pos - 1), d * 10 ** (pos + 1), d, d * 10 ** (pos + 2)], fmt: inr,
      en: [`What is the place value of the digit ${d} in ${inr(n)}? (Take the ${d} in the ${['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'][pos]} place.)`,
        `The ${d} is in the ${['ones', 'tens', 'hundreds', 'thousands', 'ten-thousands'][pos]} place, so its value is ${d} × ${inr(10 ** pos)} = ${inr(v)}.`],
      hi: [`${inr(n)} में ${['इकाई', 'दहाई', 'सैकड़ा', 'हज़ार', 'दस हज़ार'][pos]} के स्थान पर स्थित अंक ${d} का स्थानीय मान क्या है?`,
        `${d} ${['इकाई', 'दहाई', 'सैकड़ा', 'हज़ार', 'दस हज़ार'][pos]} के स्थान पर है, इसलिए उसका स्थानीय मान ${d} × ${inr(10 ** pos)} = ${inr(v)} है।`],
    };
  },
  // 2. Addition with carrying
  (r) => {
    const a = int(r, 12_000, 58_999), b = int(r, 11_000, 39_999), s = a + b;
    return {
      topic: 'Addition', difficulty: 'EASY', correct: s, wrong: [s - 1000, s + 10, s - 100, s + 1000], fmt: inr,
      en: [`${inr(a)} + ${inr(b)} = ?`, `Add place by place, carrying where needed: ${inr(a)} + ${inr(b)} = ${inr(s)}.`],
      hi: [`${inr(a)} + ${inr(b)} = ?`, `स्थान के अनुसार जोड़ें और हासिल आगे ले जाएँ: ${inr(a)} + ${inr(b)} = ${inr(s)}।`],
    };
  },
  // 3. Subtraction with borrowing
  (r) => {
    const a = int(r, 50_001, 99_000), b = int(r, 10_000, 49_999), d = a - b;
    return {
      topic: 'Subtraction', difficulty: 'MEDIUM', correct: d, wrong: [d + 1000, d - 10, d + 100, d + 10], fmt: inr,
      en: [`${inr(a)} − ${inr(b)} = ?`, `${inr(a)} − ${inr(b)} = ${inr(d)}. Check: ${inr(d)} + ${inr(b)} = ${inr(a)}.`],
      hi: [`${inr(a)} − ${inr(b)} = ?`, `${inr(a)} − ${inr(b)} = ${inr(d)}। जाँच: ${inr(d)} + ${inr(b)} = ${inr(a)}।`],
    };
  },
  // 4. Multiplication
  (r) => {
    const a = int(r, 112, 489), b = int(r, 12, 39), p = a * b;
    const tens = Math.floor(b / 10) * 10, ones = b % 10;
    return {
      topic: 'Multiplication', difficulty: 'MEDIUM', correct: p, wrong: [a * (b + 1), a * (b - 1), a * ones + a * Math.floor(b / 10), p + 100], fmt: inr,
      en: [`${a} × ${b} = ?`, `${a} × ${b} = ${a} × ${tens} + ${a} × ${ones} = ${inr(a * tens)} + ${inr(a * ones)} = ${inr(p)}.`],
      hi: [`${a} × ${b} = ?`, `${a} × ${b} = ${a} × ${tens} + ${a} × ${ones} = ${inr(a * tens)} + ${inr(a * ones)} = ${inr(p)}।`],
    };
  },
  // 5. Division with remainder
  (r) => {
    const d = int(r, 6, 19), q = int(r, 24, 96), rem = int(r, 1, d - 1), n = d * q + rem;
    return {
      topic: 'Division', difficulty: 'MEDIUM', correct: `${q}, ${rem}`, wrong: [`${q + 1}, ${rem}`, `${q}, ${rem + 1 === d ? rem - 1 : rem + 1}`, `${q - 1}, ${rem + d > 0 ? rem : 0}`, `${rem}, ${q}`],
      en: [`When ${inr(n)} is divided by ${d}, what are the quotient and the remainder?`, `${d} × ${q} = ${inr(d * q)}, and ${inr(n)} − ${inr(d * q)} = ${rem}. Quotient ${q}, remainder ${rem}.`],
      hi: [`${inr(n)} को ${d} से भाग देने पर भागफल और शेषफल क्या होंगे?`, `${d} × ${q} = ${inr(d * q)}, और ${inr(n)} − ${inr(d * q)} = ${rem}। भागफल ${q}, शेषफल ${rem}।`],
      optionsNote: 'quotient, remainder',
    };
  },
  // 6. LCM
  (r) => {
    let a, b;
    do { a = int(r, 4, 18); b = int(r, 6, 24); } while (a === b || gcd(a, b) === 1 && a * b > 200 || gcd(a, b) === Math.min(a, b));
    const l = lcm(a, b);
    return {
      topic: 'LCM', difficulty: 'MEDIUM', correct: l, wrong: [a * b, gcd(a, b), l * 2, l / 2 === Math.floor(l / 2) ? l / 2 : l + a],
      en: [`What is the LCM (lowest common multiple) of ${a} and ${b}?`, `The smallest number that both ${a} and ${b} divide exactly is ${l}.`],
      hi: [`${a} और ${b} का ल.स. (लघुत्तम समापवर्त्य) क्या है?`, `वह सबसे छोटी संख्या जिसे ${a} और ${b} दोनों पूरा-पूरा विभाजित करते हैं, ${l} है।`],
    };
  },
  // 7. HCF
  (r) => {
    const g = pick(r, [4, 6, 8, 9, 12, 14, 15]);
    let m, n;
    do { m = int(r, 2, 7); n = int(r, 2, 9); } while (m === n || gcd(m, n) !== 1);
    const a = g * m, b = g * n;
    return {
      topic: 'HCF', difficulty: 'MEDIUM', correct: g, wrong: [g * 2, g / 2 === Math.floor(g / 2) ? g / 2 : g + 1, lcm(a, b), Math.min(a, b)],
      en: [`What is the HCF (highest common factor) of ${a} and ${b}?`, `${a} = ${g} × ${m} and ${b} = ${g} × ${n}; ${m} and ${n} have no common factor except 1, so the HCF is ${g}.`],
      hi: [`${a} और ${b} का म.स. (महत्तम समापवर्तक) क्या है?`, `${a} = ${g} × ${m} और ${b} = ${g} × ${n}; ${m} और ${n} का 1 के अलावा कोई उभयनिष्ठ गुणनखंड नहीं है, इसलिए म.स. ${g} है।`],
    };
  },
  // 8. Fraction of a quantity
  (r) => {
    const den = pick(r, [3, 4, 5, 6, 8]), num = int(r, 1, den - 1), unit = int(r, 6, 40), total = den * unit, v = num * unit;
    return {
      topic: 'Fractions', difficulty: 'EASY', correct: v, wrong: [unit, v + unit, total - v === v ? v + 2 : total - v, num * den],
      en: [`What is ${num}/${den} of ${total}?`, `1/${den} of ${total} is ${unit}, so ${num}/${den} of ${total} is ${num} × ${unit} = ${v}.`],
      hi: [`${total} का ${num}/${den} कितना है?`, `${total} का 1/${den} = ${unit}, इसलिए ${num}/${den} = ${num} × ${unit} = ${v}।`],
    };
  },
  // 9. Adding fractions with the same denominator
  (r) => {
    const den = pick(r, [7, 9, 11, 13]), a = int(r, 1, 4), b = int(r, 1, den - a - 1);
    const s = `${a + b}/${den}`;
    return {
      topic: 'Fractions', difficulty: 'EASY', correct: s, wrong: [`${a + b}/${den * 2}`, `${a * b}/${den}`, `${a + b + 1}/${den}`, `${Math.abs(a - b) || 1}/${den}`],
      en: [`${a}/${den} + ${b}/${den} = ?`, `The denominators are the same, so add the numerators: (${a} + ${b})/${den} = ${s}.`],
      hi: [`${a}/${den} + ${b}/${den} = ?`, `हर समान हैं, इसलिए अंश जोड़ें: (${a} + ${b})/${den} = ${s}।`],
    };
  },
  // 10. Decimals
  (r) => {
    const a = int(r, 105, 899) / 100, b = int(r, 12, 95) / 10, s = Math.round((a + b) * 100) / 100;
    const f = (x) => x.toFixed(2);
    return {
      topic: 'Decimals', difficulty: 'MEDIUM', correct: s, wrong: [Math.round((a + b / 10) * 100) / 100, s + 1, Math.round((s - 0.1) * 100) / 100, Math.round((a * 10 + b) * 100) / 100 / 10], fmt: f,
      en: [`${a.toFixed(2)} + ${b.toFixed(1)} = ?`, `Line up the decimal points: ${a.toFixed(2)} + ${b.toFixed(2)} = ${f(s)}.`],
      hi: [`${a.toFixed(2)} + ${b.toFixed(1)} = ?`, `दशमलव बिंदु एक सीध में रखें: ${a.toFixed(2)} + ${b.toFixed(2)} = ${f(s)}।`],
    };
  },
  // 11. Perimeter
  (r) => {
    const l = int(r, 12, 45), b = int(r, 5, l - 2), p = 2 * (l + b);
    return {
      topic: 'Perimeter', difficulty: 'EASY', correct: `${p} m`, wrong: [`${l + b} m`, `${l * b} m`, `${p + 2} m`, `${4 * l} m`],
      en: [`A rectangular garden is ${l} m long and ${b} m wide. How much fencing is needed to go round it once?`, `Perimeter = 2 × (length + breadth) = 2 × (${l} + ${b}) = ${p} m.`],
      hi: [`एक आयताकार बगीचा ${l} मी लंबा और ${b} मी चौड़ा है। इसके चारों ओर एक बार बाड़ लगाने के लिए कितनी बाड़ चाहिए?`, `परिमाप = 2 × (लंबाई + चौड़ाई) = 2 × (${l} + ${b}) = ${p} मी।`],
      hiFmt: (x) => x.replace(' m', ' मी'),
    };
  },
  // 12. Area
  (r) => {
    const s = int(r, 6, 25), a = s * s;
    return {
      topic: 'Area', difficulty: 'EASY', correct: `${a} sq cm`, wrong: [`${4 * s} sq cm`, `${2 * s} sq cm`, `${a + s} sq cm`, `${(s + 1) * (s + 1)} sq cm`],
      en: [`What is the area of a square of side ${s} cm?`, `Area of a square = side × side = ${s} × ${s} = ${a} sq cm. (${4 * s} cm would be its perimeter.)`],
      hi: [`${s} सेमी भुजा वाले वर्ग का क्षेत्रफल क्या है?`, `वर्ग का क्षेत्रफल = भुजा × भुजा = ${s} × ${s} = ${a} वर्ग सेमी। (${4 * s} सेमी उसका परिमाप होगा।)`],
      hiFmt: (x) => x.replace(' sq cm', ' वर्ग सेमी'),
    };
  },
  // 13. Time duration
  (r) => {
    const sh = int(r, 7, 11), sm = pick(r, [0, 10, 15, 20, 30, 40, 45]), dur = int(r, 75, 230);
    const end = sh * 60 + sm + dur, eh = Math.floor(end / 60), em = end % 60;
    const t = (h, m) => `${h > 12 ? h - 12 : h}:${String(m).padStart(2, '0')} ${h >= 12 ? 'p.m.' : 'a.m.'}`;
    const answer = t(eh, em);
    const [name, nameHi] = pick(r, NAMES);
    return {
      topic: 'Time', difficulty: 'MEDIUM', correct: answer, wrong: [t(eh + 1, em), t(eh, (em + 30) % 60), t(eh - 1, em), t(eh, (em + 10) % 60)],
      en: [`${name}'s train left at ${t(sh, sm)} and the journey took ${Math.floor(dur / 60)} hour${Math.floor(dur / 60) === 1 ? '' : 's'} ${dur % 60} minutes. When did it arrive?`, `${t(sh, sm)} + ${Math.floor(dur / 60)} h ${dur % 60} min = ${answer}.`],
      hi: [`${nameHi} की रेलगाड़ी ${t(sh, sm)} पर चली और यात्रा में ${Math.floor(dur / 60)} घंटे ${dur % 60} मिनट लगे। वह कब पहुँची?`, `${t(sh, sm)} + ${Math.floor(dur / 60)} घंटे ${dur % 60} मिनट = ${answer}।`],
      hiFmt: (x) => x.replace('a.m.', 'पूर्वाह्न').replace('p.m.', 'अपराह्न'),
    };
  },
  // 14. Money: cost and change
  (r) => {
    const n = int(r, 3, 9), price = int(r, 12, 48), cost = n * price, paid = Math.ceil((cost + 1) / 100) * 100, change = paid - cost;
    const [name, nameHi] = pick(r, NAMES);
    return {
      topic: 'Money', difficulty: 'MEDIUM', correct: change, wrong: [cost, change + price, Math.abs(change - 10) || 5, paid - price], fmt: (x) => `₹${inr(x)}`,
      en: [`${name} buys ${n} notebooks at ₹${price} each and pays with ₹${paid}. How much change should ${name} get?`, `Cost = ${n} × ₹${price} = ₹${cost}. Change = ₹${paid} − ₹${cost} = ₹${change}.`],
      hi: [`${nameHi} ने ₹${price} प्रति कॉपी की दर से ${n} कॉपियाँ खरीदीं और दुकानदार को ₹${paid} दिए। उसे कितने रुपये वापस मिलने चाहिए?`, `कुल मूल्य = ${n} × ₹${price} = ₹${cost}। वापसी = ₹${paid} − ₹${cost} = ₹${change}।`],
    };
  },
  // 15. Units
  (r) => {
    const kind = pick(r, ['km', 'kg', 'l']);
    const whole = int(r, 2, 9), part = pick(r, [125, 250, 350, 450, 600, 750]);
    const total = whole * 1000 + part;
    const big = { km: ['km', 'm', 'किमी', 'मी'], kg: ['kg', 'g', 'किग्रा', 'ग्रा'], l: ['l', 'ml', 'ली', 'मिली'] }[kind];
    return {
      topic: 'Measurement', difficulty: 'EASY', correct: total, wrong: [whole * 100 + part, whole + part, whole * 1000 + part * 10, whole * 10_000 + part],
      fmt: (x) => `${inr(x)} ${big[1]}`,
      en: [`${whole} ${big[0]} ${part} ${big[1]} = how many ${big[1]}?`, `1 ${big[0]} = 1,000 ${big[1]}, so ${whole} ${big[0]} = ${inr(whole * 1000)} ${big[1]}; add ${part}: ${inr(total)} ${big[1]}.`],
      hi: [`${whole} ${big[2]} ${part} ${big[3]} = कितने ${big[3]}?`, `1 ${big[2]} = 1,000 ${big[3]}, इसलिए ${whole} ${big[2]} = ${inr(whole * 1000)} ${big[3]}; ${part} जोड़ने पर ${inr(total)} ${big[3]}।`],
      hiFmt: (x) => `${inr(x)} ${big[3]}`,
    };
  },
  // 16. Roman numerals
  (r) => {
    const n = int(r, 14, 99);
    return {
      topic: 'Roman numerals', difficulty: 'EASY', correct: n, wrong: [n + 10, n - 1, n + 4, n - 9],
      en: [`What number does ${roman(n)} stand for?`, `${roman(n)} = ${n}. (X = 10, V = 5, I = 1, L = 50, and a smaller numeral before a larger one is subtracted.)`],
      hi: [`रोमन संख्या ${roman(n)} किस संख्या को दर्शाती है?`, `${roman(n)} = ${n}। (X = 10, V = 5, I = 1, L = 50; बड़े अंक से पहले लिखा छोटा अंक घटाया जाता है।)`],
    };
  },
  // 17. Average
  (r) => {
    const avg = int(r, 20, 60), xs = [avg - int(r, 3, 9), avg + int(r, 1, 8), 0];
    xs[2] = 3 * avg - xs[0] - xs[1];
    return {
      topic: 'Average', difficulty: 'MEDIUM', correct: avg, wrong: [xs[0] + xs[1] + xs[2], avg + 1, Math.round((xs[0] + xs[1]) / 2) === avg ? avg - 2 : Math.round((xs[0] + xs[1]) / 2), avg + 3],
      en: [`What is the average of ${xs.join(', ')}?`, `Sum = ${xs[0] + xs[1] + xs[2]}; divide by 3 numbers: ${xs[0] + xs[1] + xs[2]} ÷ 3 = ${avg}.`],
      hi: [`${xs.join(', ')} का औसत क्या है?`, `योग = ${xs[0] + xs[1] + xs[2]}; 3 संख्याओं से भाग देने पर ${xs[0] + xs[1] + xs[2]} ÷ 3 = ${avg}।`],
    };
  },
  // 18. Equal sharing word problem
  (r) => {
    const children = int(r, 6, 15), each = int(r, 8, 24), mangoes = children * each;
    return {
      topic: 'Word problems', difficulty: 'EASY', correct: each, wrong: [each + 1, mangoes - children, children, each - 2],
      en: [`${inr(mangoes)} mangoes are shared equally among ${children} children. How many mangoes does each child get?`, `${inr(mangoes)} ÷ ${children} = ${each}.`],
      hi: [`${inr(mangoes)} आम ${children} बच्चों में बराबर-बराबर बाँटे जाते हैं। प्रत्येक बच्चे को कितने आम मिलेंगे?`, `${inr(mangoes)} ÷ ${children} = ${each}।`],
    };
  },
  // 19. Primes
  (r) => {
    const lo = pick(r, [10, 20, 30, 40, 50, 60, 70, 80]), hi = lo + 10;
    const primes = [];
    for (let k = lo + 1; k < hi; k++) if (isPrime(k)) primes.push(k);
    return {
      topic: 'Prime numbers', difficulty: 'MEDIUM', correct: primes.length, wrong: [primes.length + 1, primes.length + 2, Math.max(0, primes.length - 1) === primes.length ? 5 : Math.max(0, primes.length - 1), 4, 5, 6],
      en: [`How many prime numbers are there between ${lo} and ${hi}?`, `The primes between ${lo} and ${hi} are ${primes.join(', ') || 'none'}: ${primes.length} in all.`],
      hi: [`${lo} और ${hi} के बीच कितनी अभाज्य संख्याएँ हैं?`, `${lo} और ${hi} के बीच की अभाज्य संख्याएँ ${primes.join(', ') || 'कोई नहीं'} हैं: कुल ${primes.length}।`],
    };
  },
  // 20. Rounding
  (r) => {
    let n = int(r, 1_001, 9_999);
    if (n % 100 === 50) n += 1;
    const round = Math.round(n / 100) * 100;
    return {
      topic: 'Rounding', difficulty: 'EASY', correct: round, wrong: [Math.floor(n / 100) * 100 === round ? round + 100 : Math.floor(n / 100) * 100, Math.round(n / 10) * 10, Math.round(n / 1000) * 1000, round - 100, round + 200, round - 200], fmt: inr,
      en: [`Round ${inr(n)} to the nearest hundred.`, `Look at the tens digit (${Math.floor(n / 10) % 10}): ${Math.floor(n / 10) % 10 >= 5 ? '5 or more, so round up' : 'less than 5, so round down'}. ${inr(n)} → ${inr(round)}.`],
      hi: [`${inr(n)} को निकटतम सैकड़े तक पूर्णांकित करें।`, `दहाई का अंक (${Math.floor(n / 10) % 10}) ${Math.floor(n / 10) % 10 >= 5 ? '5 या अधिक है, इसलिए ऊपर' : '5 से कम है, इसलिए नीचे'} पूर्णांकित करें: ${inr(n)} → ${inr(round)}।`],
    };
  },
];

/** One question per skill: 20 questions, matching the 20 Mathematics questions of Paper 1. */
export function mathsSet(r, setNo, seen) {
  return GENERATORS.map((g, i) => unique(seen, () => {
    const x = g(r);
    return mcq(r, {
      id: `m${setNo}-${String(i + 1).padStart(2, '0')}`, section: 'Mathematics', topic: x.topic, difficulty: x.difficulty,
      prompt: x.en[0], correct: x.correct, wrong: x.wrong, explanation: x.en[1], fmt: x.fmt,
      hi: { prompt: x.hi[0], explanation: x.hi[1], fmt: x.hiFmt ?? x.fmt },
    });
  }));
}
