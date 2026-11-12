// JNVST Class VI Arithmetic: original questions generated from rules over the nine topics the NVS prospectus lists
// for the Arithmetic Test (numbers, four operations, factors and multiples, like fractions, measurement, simplification,
// perimeter and area, angles and directions, data handling). Each generator computes its own answer, so every key is
// correct by construction; distractors are the usual slips. English and Hindi are written together for every question.
import { inr, int, mcq, pick, unique } from '../netarhat/core.mjs';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((d) => n % d);
const factorsOf = (n) => [...Array(n).keys()].map((i) => i + 1).filter((d) => n % d === 0);
const primeFactors = (n) => { const out = []; for (let d = 2; n > 1; d++) while (n % d === 0) { out.push(d); n /= d; } return out; };
const shuffleDigits = (r, digits) => { const a = [...digits]; for (let i = a.length - 1; i > 0; i--) { const j = int(r, 0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; };

const NAMES = [['Asha', 'आशा'], ['Ravi', 'रवि'], ['Meera', 'मीरा'], ['Kabir', 'कबीर'], ['Nisha', 'निशा'], ['Arjun', 'अर्जुन'], ['Pooja', 'पूजा'], ['Imran', 'इमरान'], ['Lata', 'लता'], ['Dev', 'देव']];
const PLACES = ['ones', 'tens', 'hundreds', 'thousands', 'ten thousands', 'lakhs'];
const PLACES_HI = ['इकाई', 'दहाई', 'सैकड़ा', 'हज़ार', 'दस हज़ार', 'लाख'];
const E = 'EASY', M = 'MEDIUM', H = 'HARD';

/** Indian number names up to 9,99,999 (for the "number names" topic). */
const ONES = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const below100 = (n) => (n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : ''));
const below1000 = (n) => (n >= 100 ? ONES[Math.floor(n / 100)] + ' hundred' + (n % 100 ? ' ' + below100(n % 100) : '') : below100(n));
export function words(n) {
  const parts = [];
  if (n >= 100000) { parts.push(below100(Math.floor(n / 100000)) + ' lakh'); n %= 100000; }
  if (n >= 1000) { parts.push(below100(Math.floor(n / 1000)) + ' thousand'); n %= 1000; }
  if (n > 0) parts.push(below1000(n));
  return parts.join(' ');
}
const HI_ONES = ['', 'एक', 'दो', 'तीन', 'चार', 'पाँच', 'छह', 'सात', 'आठ', 'नौ', 'दस', 'ग्यारह', 'बारह', 'तेरह', 'चौदह', 'पंद्रह', 'सोलह', 'सत्रह', 'अठारह', 'उन्नीस', 'बीस', 'इक्कीस', 'बाईस', 'तेईस', 'चौबीस', 'पच्चीस', 'छब्बीस', 'सत्ताईस', 'अट्ठाईस', 'उनतीस', 'तीस', 'इकतीस', 'बत्तीस', 'तैंतीस', 'चौंतीस', 'पैंतीस', 'छत्तीस', 'सैंतीस', 'अड़तीस', 'उनतालीस', 'चालीस', 'इकतालीस', 'बयालीस', 'तैंतालीस', 'चवालीस', 'पैंतालीस', 'छियालीस', 'सैंतालीस', 'अड़तालीस', 'उनचास', 'पचास', 'इक्यावन', 'बावन', 'तिरपन', 'चौवन', 'पचपन', 'छप्पन', 'सत्तावन', 'अट्ठावन', 'उनसठ', 'साठ', 'इकसठ', 'बासठ', 'तिरसठ', 'चौंसठ', 'पैंसठ', 'छियासठ', 'सड़सठ', 'अड़सठ', 'उनहत्तर', 'सत्तर', 'इकहत्तर', 'बहत्तर', 'तिहत्तर', 'चौहत्तर', 'पचहत्तर', 'छिहत्तर', 'सतहत्तर', 'अठहत्तर', 'उनासी', 'अस्सी', 'इक्यासी', 'बयासी', 'तिरासी', 'चौरासी', 'पचासी', 'छियासी', 'सत्तासी', 'अट्ठासी', 'नवासी', 'नब्बे', 'इक्यानवे', 'बानवे', 'तिरानवे', 'चौरानवे', 'पचानवे', 'छियानवे', 'सत्तानवे', 'अट्ठानवे', 'निन्यानवे'];
const hiBelow1000 = (n) => (n >= 100 ? HI_ONES[Math.floor(n / 100)] + ' सौ' + (n % 100 ? ' ' + HI_ONES[n % 100] : '') : HI_ONES[n]);
export function wordsHi(n) {
  const parts = [];
  if (n >= 100000) { parts.push(HI_ONES[Math.floor(n / 100000)] + ' लाख'); n %= 100000; }
  if (n >= 1000) { parts.push(HI_ONES[Math.floor(n / 1000)] + ' हज़ार'); n %= 1000; }
  if (n > 0) parts.push(hiBelow1000(n));
  return parts.join(' ');
}

const roundTo = (n, p) => Math.round(n / p) * p;
const frac = (a, b) => `${a}/${b}`;
const hhmm = (h, m) => `${h}:${String(m).padStart(2, '0')}`;
const minsText = (t) => (t >= 60 ? `${Math.floor(t / 60)} h ${t % 60 ? `${t % 60} min` : ''}`.trim() : `${t} min`);
const minsTextHi = (t) => (t >= 60 ? `${Math.floor(t / 60)} घंटे ${t % 60 ? `${t % 60} मिनट` : ''}`.trim() : `${t} मिनट`);

const GENERATORS = [
  // ── 1. Number system ──────────────────────────────────────────────────────────────────────────────────────────
  // Place value of a digit
  (r) => {
    const n = int(r, 1_00_000, 9_99_999);
    const digits = String(n).split('').map(Number);
    let pos = int(r, 1, 5);
    while (digits[5 - pos] === 0) pos = (pos % 5) + 1;
    const d = digits[5 - pos], v = d * 10 ** pos;
    return { topic: 'Number system', difficulty: E, correct: v, wrong: [d * 10 ** (pos - 1), d * 10 ** (pos + 1), d, d * 10 ** (pos + 2)], fmt: inr,
      en: [`In the number ${inr(n)}, what is the place value of the digit ${d} in the ${PLACES[pos]} place?`, `The ${d} is in the ${PLACES[pos]} place, so its place value is ${d} × ${inr(10 ** pos)} = ${inr(v)}.`],
      hi: [`संख्या ${inr(n)} में ${PLACES_HI[pos]} के स्थान पर स्थित अंक ${d} का स्थानीय मान क्या है?`, `${d} ${PLACES_HI[pos]} के स्थान पर है, इसलिए उसका स्थानीय मान ${d} × ${inr(10 ** pos)} = ${inr(v)} है।`] };
  },
  // Number name → numeral
  (r) => {
    const n = int(r, 10_001, 9_99_999);
    const wrong = [n + 1000, n - 1000, n + 100, n * 10 <= 999999 ? n * 10 : n - 100];
    return { topic: 'Number system', difficulty: M, correct: n, wrong, fmt: inr,
      en: [`Write "${words(n)}" in figures.`, `Write each group from the left (lakhs, thousands, then the rest): ${inr(n)}.`],
      hi: [`"${wordsHi(n)}" को अंकों में लिखिए।`, `बाईं ओर से प्रत्येक समूह (लाख, हज़ार, फिर शेष) लिखिए: ${inr(n)}।`] };
  },
  // Rounding to the nearest 10 / 100 / 1000
  (r) => {
    const p = pick(r, [10, 100, 1000]);
    let n = int(r, 1_200, 98_999);
    if (n % p === p / 2) n += 1;
    const v = roundTo(n, p);
    return { topic: 'Number system', difficulty: E, correct: v, wrong: [v + p, v - p, roundTo(n, p / 10 || 10), Math.floor(n / p) * p === v ? v + 2 * p : Math.floor(n / p) * p], fmt: inr,
      en: [`Round ${inr(n)} to the nearest ${inr(p)}.`, `${inr(n)} lies between ${inr(Math.floor(n / p) * p)} and ${inr(Math.floor(n / p) * p + p)}; it is nearer to ${inr(v)}.`],
      hi: [`${inr(n)} को निकटतम ${inr(p)} तक पूर्णांकित कीजिए।`, `${inr(n)}, ${inr(Math.floor(n / p) * p)} और ${inr(Math.floor(n / p) * p + p)} के बीच है; यह ${inr(v)} के अधिक निकट है।`] };
  },
  // Greatest / smallest number from digits
  (r) => {
    const digits = new Set(); while (digits.size < 4) digits.add(int(r, 0, 9));
    const d = [...digits];
    const desc = [...d].sort((a, b) => b - a), asc = [...d].sort((a, b) => a - b);
    if (asc[0] === 0) [asc[0], asc[1]] = [asc[1], asc[0]];
    const big = Number(desc.join('')), small = Number(asc.join(''));
    const greatest = r() < 0.5;
    const correct = greatest ? big : small;
    const wrongBig = [Number([...desc].reverse().join('')), big - 9, small, Number([desc[1], desc[0], desc[2], desc[3]].join(''))];
    const wrongSmall = [Number([...d].sort((a, b) => a - b).join('')) || small + 9, big, small + 9, Number([asc[0], asc[2], asc[1], asc[3]].join(''))];
    return { topic: 'Number system', difficulty: M, correct, wrong: greatest ? wrongBig : wrongSmall, fmt: inr,
      en: [`Using each of the digits ${shuffleDigits(r, d).join(', ')} exactly once, what is the ${greatest ? 'greatest' : 'smallest'} 4-digit number you can make?`,
        greatest ? `Put the digits in descending order: ${inr(big)}.` : `Put the digits in ascending order, but a number cannot start with 0: ${inr(small)}.`],
      hi: [`अंकों ${shuffleDigits(r, d).join(', ')} में से प्रत्येक का ठीक एक बार प्रयोग करके बनने वाली ${greatest ? 'सबसे बड़ी' : 'सबसे छोटी'} 4 अंकों की संख्या कौन-सी है?`,
        greatest ? `अंकों को घटते क्रम में रखिए: ${inr(big)}।` : `अंकों को बढ़ते क्रम में रखिए, पर संख्या 0 से शुरू नहीं हो सकती: ${inr(small)}।`] };
  },
  // Ascending / descending order
  (r) => {
    const base = int(r, 2_000, 60_000);
    const nums = [base, base + int(r, 1, 9) * 100, base - int(r, 1, 9) * 10, base + int(r, 11, 99)];
    const asc = [...nums].sort((a, b) => a - b), desc = [...asc].reverse();
    const ascending = r() < 0.5;
    const line = (a) => a.map(inr).join(', ');
    const correct = line(ascending ? asc : desc);
    const wrong = [line(ascending ? desc : asc), line([asc[0], asc[2], asc[1], asc[3]]), line([desc[1], desc[0], desc[2], desc[3]])];
    return { topic: 'Number system', difficulty: M, correct, wrong,
      en: [`Arrange in ${ascending ? 'ascending' : 'descending'} order: ${line(shuffleDigits(r, nums))}`, `Compare the digits from the left. ${ascending ? 'Smallest first' : 'Greatest first'}: ${correct}.`],
      hi: [`${ascending ? 'बढ़ते' : 'घटते'} क्रम में लिखिए: ${line(shuffleDigits(r, nums))}`, `बाईं ओर के अंकों से तुलना कीजिए। ${ascending ? 'सबसे छोटी पहले' : 'सबसे बड़ी पहले'}: ${correct}।`] };
  },
  // Successor / predecessor and the number of digits
  (r) => {
    const n = pick(r, [int(r, 999, 9999) * 10 + 9, int(r, 9, 99) * 1000 + 999, 99_999, 9_999]);
    const succ = r() < 0.5;
    const v = succ ? n + 1 : n - 1;
    return { topic: 'Number system', difficulty: E, correct: v, wrong: [succ ? n - 1 : n + 1, v + 10, v - 10, n], fmt: inr,
      en: [`What is the ${succ ? 'successor' : 'predecessor'} of ${inr(n)}?`, `${succ ? 'Add 1' : 'Subtract 1'}: ${inr(n)} ${succ ? '+' : '−'} 1 = ${inr(v)}.`],
      hi: [`${inr(n)} का ${succ ? 'परवर्ती' : 'पूर्ववर्ती'} क्या है?`, `${succ ? '1 जोड़िए' : '1 घटाइए'}: ${inr(n)} ${succ ? '+' : '−'} 1 = ${inr(v)}।`] };
  },
  // ── 2. Four operations ────────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const a = int(r, 23_456, 78_999), b = int(r, 10_111, 29_999), s = a + b;
    return { topic: 'Four operations', difficulty: E, correct: s, wrong: [s - 1000, s + 100, s - 10, s + 1000], fmt: inr,
      en: [`${inr(a)} + ${inr(b)} = ?`, `Add column by column, carrying where needed: ${inr(a)} + ${inr(b)} = ${inr(s)}.`],
      hi: [`${inr(a)} + ${inr(b)} = ?`, `स्तंभ के अनुसार जोड़िए और हासिल आगे ले जाइए: ${inr(a)} + ${inr(b)} = ${inr(s)}।`] };
  },
  (r) => {
    const a = int(r, 40_001, 99_000), b = int(r, 10_000, 39_999), d = a - b;
    return { topic: 'Four operations', difficulty: E, correct: d, wrong: [d + 1000, d - 100, d + 10, a + b], fmt: inr,
      en: [`${inr(a)} − ${inr(b)} = ?`, `${inr(a)} − ${inr(b)} = ${inr(d)}. Check: ${inr(d)} + ${inr(b)} = ${inr(a)}.`],
      hi: [`${inr(a)} − ${inr(b)} = ?`, `${inr(a)} − ${inr(b)} = ${inr(d)}। जाँच: ${inr(d)} + ${inr(b)} = ${inr(a)}।`] };
  },
  (r) => {
    const a = int(r, 123, 698), b = int(r, 13, 48), p = a * b;
    const tens = Math.floor(b / 10) * 10, ones = b % 10;
    return { topic: 'Four operations', difficulty: M, correct: p, wrong: [a * (b + 1), a * (b - 1), a * ones + a * Math.floor(b / 10), p + 100], fmt: inr,
      en: [`${a} × ${b} = ?`, `${a} × ${b} = ${a} × ${tens} + ${a} × ${ones} = ${inr(a * tens)} + ${inr(a * ones)} = ${inr(p)}.`],
      hi: [`${a} × ${b} = ?`, `${a} × ${b} = ${a} × ${tens} + ${a} × ${ones} = ${inr(a * tens)} + ${inr(a * ones)} = ${inr(p)}।`] };
  },
  // Division: quotient and remainder
  (r) => {
    const d = int(r, 7, 24), q = int(r, 31, 148), rem = int(r, 1, d - 1), n = d * q + rem;
    return { topic: 'Four operations', difficulty: M, correct: `Quotient ${q}, remainder ${rem}`, wrong: [`Quotient ${q + 1}, remainder ${rem}`, `Quotient ${q}, remainder ${rem + 1 === d ? rem - 1 : rem + 1}`, `Quotient ${rem}, remainder ${q}`, `Quotient ${q - 1}, remainder ${rem}`],
      en: [`When ${inr(n)} is divided by ${d}, what are the quotient and the remainder?`, `${d} × ${q} = ${inr(d * q)} and ${inr(n)} − ${inr(d * q)} = ${rem}, so the quotient is ${q} and the remainder is ${rem}.`],
      hi: [`${inr(n)} को ${d} से भाग देने पर भागफल और शेषफल क्या होंगे?`, `${d} × ${q} = ${inr(d * q)} और ${inr(n)} − ${inr(d * q)} = ${rem}, इसलिए भागफल ${q} और शेषफल ${rem} है।`],
      hiFmt: (s) => s.replace('Quotient', 'भागफल').replace('remainder', 'शेषफल') };
  },
  // Dividend from divisor, quotient and remainder
  (r) => {
    const d = int(r, 12, 59), q = int(r, 14, 48), rem = int(r, 1, d - 1), n = d * q + rem;
    return { topic: 'Four operations', difficulty: M, correct: n, wrong: [d * q - rem, d * q, d + q + rem, d * rem + q], fmt: inr,
      en: [`In a division, the divisor is ${d}, the quotient is ${q} and the remainder is ${rem}. What is the dividend?`, `Dividend = divisor × quotient + remainder = ${d} × ${q} + ${rem} = ${inr(d * q)} + ${rem} = ${inr(n)}.`],
      hi: [`एक भाग में भाजक ${d}, भागफल ${q} और शेषफल ${rem} है। भाज्य क्या है?`, `भाज्य = भाजक × भागफल + शेषफल = ${d} × ${q} + ${rem} = ${inr(d * q)} + ${rem} = ${inr(n)}।`] };
  },
  // Two-step word problem
  (r) => {
    const [en, hi] = pick(r, NAMES);
    const boxes = int(r, 12, 36), per = int(r, 24, 48), gave = int(r, 50, 200), total = boxes * per, left = total - gave;
    return { topic: 'Four operations', difficulty: H, correct: left, wrong: [total, total + gave, left + 100, boxes * per - 2 * gave], fmt: inr,
      en: [`${en} packed ${boxes} boxes with ${per} mangoes in each box and then gave away ${gave} mangoes. How many mangoes were left?`, `Total mangoes = ${boxes} × ${per} = ${inr(total)}. Left = ${inr(total)} − ${gave} = ${inr(left)}.`],
      hi: [`${hi} ने ${boxes} डिब्बों में ${per}-${per} आम रखे और फिर ${gave} आम बाँट दिए। कितने आम बचे?`, `कुल आम = ${boxes} × ${per} = ${inr(total)}। बचे = ${inr(total)} − ${gave} = ${inr(left)}।`] };
  },
  // Average (the prospectus example)
  (r) => {
    const k = int(r, 3, 5);
    const nums = Array.from({ length: k }, () => int(r, 11, 59));
    const sum = nums.reduce((a, b) => a + b, 0);
    if (sum % k) nums[0] += k - (sum % k);
    const total = nums.reduce((a, b) => a + b, 0), avg = total / k;
    return { topic: 'Four operations', difficulty: M, correct: avg, wrong: [total, avg + 1, avg - 1, Math.max(...nums)],
      en: [`What is the average of ${nums.join(', ')}?`, `Average = sum ÷ count = ${total} ÷ ${k} = ${avg}.`],
      hi: [`${nums.join(', ')} का औसत क्या है?`, `औसत = योग ÷ संख्याओं की गिनती = ${total} ÷ ${k} = ${avg}।`] };
  },
  // ── 3. Factors and multiples ──────────────────────────────────────────────────────────────────────────────────
  (r) => {
    let a, b; do { a = int(r, 4, 15); b = int(r, 4, 15); } while (gcd(a, b) !== 1 || a === b);
    const v = lcm(a, b);
    return { topic: 'Factors and multiples', difficulty: M, correct: v, wrong: [a + b, 2 * v, gcd(a, b), v / 2 % 1 ? v + a : v / 2],
      en: [`What is the smallest number that is a multiple of both ${a} and ${b}?`, `${a} and ${b} have no common factor except 1, so the LCM is ${a} × ${b} = ${v}.`],
      hi: [`वह सबसे छोटी संख्या कौन-सी है जो ${a} और ${b} दोनों का गुणज है?`, `${a} और ${b} में 1 के अलावा कोई उभयनिष्ठ गुणनखंड नहीं है, इसलिए ल.स. = ${a} × ${b} = ${v}।`] };
  },
  (r) => {
    const g = pick(r, [6, 8, 9, 12, 14, 15, 18]), a = g * int(r, 2, 5), b = g * int(r, 6, 9);
    const h = gcd(a, b);
    return { topic: 'Factors and multiples', difficulty: M, correct: h, wrong: [lcm(a, b), h * 2, Math.min(a, b), h / 2 % 1 ? h + 1 : h / 2],
      en: [`What is the HCF (greatest common factor) of ${a} and ${b}?`, `Factors of ${a}: ${factorsOf(a).join(', ')}. Factors of ${b}: ${factorsOf(b).join(', ')}. The greatest common one is ${h}.`],
      hi: [`${a} और ${b} का म.स. (महत्तम समापवर्तक) क्या है?`, `${a} के गुणनखंड: ${factorsOf(a).join(', ')}। ${b} के गुणनखंड: ${factorsOf(b).join(', ')}। सबसे बड़ा उभयनिष्ठ गुणनखंड ${h} है।`] };
  },
  (r) => {
    const n = pick(r, [72, 84, 90, 96, 100, 108, 120, 126, 132, 140, 150, 180, 200, 210, 216, 225, 240, 250, 300]);
    const pf = primeFactors(n), correct = pf.join(' × ');
    const wrongs = [[...pf.slice(0, -1), pf[pf.length - 1] * 2].join(' × '), [...pf.slice(0, -2), pf[pf.length - 2] * pf[pf.length - 1]].join(' × '), `${pf[0]} × ${n / pf[0]}`, [...pf, 1].join(' × ')];
    return { topic: 'Factors and multiples', difficulty: M, correct, wrong: wrongs,
      en: [`What is the prime factorisation of ${n}?`, `Divide by the smallest prime again and again: ${n} = ${correct}. Every factor is prime and the product is ${n}.`],
      hi: [`${n} का अभाज्य गुणनखंडन क्या है?`, `सबसे छोटे अभाज्य से बार-बार भाग दीजिए: ${n} = ${correct}। प्रत्येक गुणनखंड अभाज्य है और गुणनफल ${n} है।`] };
  },
  (r) => {
    const primes = [23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97];
    const p = pick(r, primes);
    const comps = [p + 2, p + 4, p - 2, p + 6, p - 4, p + 8].filter((x) => x > 1 && !isPrime(x));
    return { topic: 'Factors and multiples', difficulty: E, correct: p, wrong: comps,
      en: ['Which of these is a prime number?', `${p} has only two factors, 1 and ${p}. The others have more: for example ${comps[0]} = ${primeFactors(comps[0]).join(' × ')}.`],
      hi: ['इनमें से कौन-सी संख्या अभाज्य है?', `${p} के केवल दो गुणनखंड हैं, 1 और ${p}। बाकी के अधिक हैं: जैसे ${comps[0]} = ${primeFactors(comps[0]).join(' × ')}।`] };
  },
  // Divisibility
  (r) => {
    const d = pick(r, [3, 4, 6, 9]);
    const good = d * int(r, 120, 980);
    const bad = [good + 1, good + 2, good + d - 1].filter((x) => x % d);
    const rule = { 3: 'the sum of its digits is divisible by 3', 4: 'the number formed by its last two digits is divisible by 4', 6: 'it is even and the sum of its digits is divisible by 3', 9: 'the sum of its digits is divisible by 9' }[d];
    const ruleHi = { 3: 'उसके अंकों का योग 3 से विभाज्य हो', 4: 'उसके अंतिम दो अंकों से बनी संख्या 4 से विभाज्य हो', 6: 'वह सम हो और अंकों का योग 3 से विभाज्य हो', 9: 'उसके अंकों का योग 9 से विभाज्य हो' }[d];
    return { topic: 'Factors and multiples', difficulty: M, correct: good, wrong: bad, fmt: inr,
      en: [`Which of these numbers is divisible by ${d}?`, `A number is divisible by ${d} when ${rule}. Only ${inr(good)} passes: ${inr(good)} ÷ ${d} = ${inr(good / d)}.`],
      hi: [`इनमें से कौन-सी संख्या ${d} से विभाज्य है?`, `कोई संख्या ${d} से विभाज्य होती है जब ${ruleHi}। केवल ${inr(good)} ऐसी है: ${inr(good)} ÷ ${d} = ${inr(good / d)}।`] };
  },
  // ── 4. Fractions ──────────────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const d = pick(r, [5, 7, 8, 9, 10, 11, 12, 15]);
    const a = int(r, 1, d - 2), b = int(r, 1, d - 1 - a), s = a + b;
    const red = gcd(s, d), correct = frac(s / red, d / red);
    return { topic: 'Fractions', difficulty: E, correct, wrong: [frac(s, 2 * d), frac(a * b, d), frac(s + 1, d), frac(Math.abs(a - b) || s + 2, d)],
      en: [`${frac(a, d)} + ${frac(b, d)} = ?`, `Like fractions: add the numerators and keep the denominator. ${frac(a, d)} + ${frac(b, d)} = ${frac(s, d)}${red > 1 ? ` = ${correct} in lowest terms` : ''}.`],
      hi: [`${frac(a, d)} + ${frac(b, d)} = ?`, `समान भिन्नें: अंश जोड़िए, हर वही रखिए। ${frac(a, d)} + ${frac(b, d)} = ${frac(s, d)}${red > 1 ? ` = ${correct} (न्यूनतम रूप में)` : ''}।`] };
  },
  (r) => {
    const d = pick(r, [6, 7, 8, 9, 10, 12, 15, 20]);
    const a = int(r, 3, d - 1), b = int(r, 1, a - 1), s = a - b;
    const red = gcd(s, d), correct = frac(s / red, d / red);
    return { topic: 'Fractions', difficulty: E, correct, wrong: [frac(a + b, d), frac(s, 2 * d), frac(s + 1, d), frac(a, d - b)],
      en: [`${frac(a, d)} − ${frac(b, d)} = ?`, `Like fractions: subtract the numerators. ${frac(a, d)} − ${frac(b, d)} = ${frac(s, d)}${red > 1 ? ` = ${correct}` : ''}.`],
      hi: [`${frac(a, d)} − ${frac(b, d)} = ?`, `समान भिन्नें: अंश घटाइए। ${frac(a, d)} − ${frac(b, d)} = ${frac(s, d)}${red > 1 ? ` = ${correct}` : ''}।`] };
  },
  (r) => {
    const a = int(r, 1, 5), b = pick(r, [6, 7, 8, 9]), c = int(r, 1, 4), e = pick(r, [5, 7, 9, 11]);
    const num = a * c, den = b * e, g = gcd(num, den), correct = frac(num / g, den / g);
    return { topic: 'Fractions', difficulty: M, correct, wrong: [frac(a + c, b + e), frac(a * e + c * b, b * e), frac(a * c, b + e), frac(num, den + 1)],
      en: [`${frac(a, b)} × ${frac(c, e)} = ?`, `Multiply numerators and denominators: ${frac(a, b)} × ${frac(c, e)} = ${frac(num, den)}${g > 1 ? ` = ${correct}` : ''}.`],
      hi: [`${frac(a, b)} × ${frac(c, e)} = ?`, `अंशों और हरों का गुणा कीजिए: ${frac(a, b)} × ${frac(c, e)} = ${frac(num, den)}${g > 1 ? ` = ${correct}` : ''}।`] };
  },
  (r) => {
    const d = pick(r, [3, 4, 5, 6, 8]), n = int(r, 1, d - 1), q = d * int(r, 12, 60);
    const v = (q * n) / d;
    const thing = pick(r, [['students', 'विद्यार्थी'], ['pages', 'पृष्ठ'], ['marbles', 'कंचे'], ['rupees', 'रुपये']]);
    return { topic: 'Fractions', difficulty: M, correct: v, wrong: [q / d, q - v, v + d, (q * (d - n)) / d], fmt: inr,
      en: [`What is ${frac(n, d)} of ${inr(q)} ${thing[0]}?`, `${frac(n, d)} of ${inr(q)} = ${inr(q)} ÷ ${d} × ${n} = ${inr(q / d)} × ${n} = ${inr(v)}.`],
      hi: [`${inr(q)} ${thing[1]} का ${frac(n, d)} कितना है?`, `${inr(q)} का ${frac(n, d)} = ${inr(q)} ÷ ${d} × ${n} = ${inr(q / d)} × ${n} = ${inr(v)}।`] };
  },
  (r) => {
    const d = pick(r, [7, 9, 11, 13]);
    const ns = new Set(); while (ns.size < 4) ns.add(int(r, 1, d - 1));
    const arr = [...ns], big = Math.max(...arr);
    return { topic: 'Fractions', difficulty: E, correct: frac(big, d), wrong: arr.filter((x) => x !== big).map((x) => frac(x, d)),
      en: ['Which of these fractions is the greatest?', `All have the same denominator ${d}, so the one with the greatest numerator, ${frac(big, d)}, is the greatest.`],
      hi: ['इनमें से कौन-सी भिन्न सबसे बड़ी है?', `सभी का हर ${d} समान है, इसलिए सबसे बड़े अंश वाली भिन्न ${frac(big, d)} सबसे बड़ी है।`] };
  },
  (r) => {
    const a = int(r, 1, 4), b = pick(r, [5, 6, 7, 8, 9]), k = int(r, 2, 6);
    return { topic: 'Fractions', difficulty: E, correct: frac(a * k, b * k), wrong: [frac(a + k, b + k), frac(a * k, b), frac(a, b * k), frac(a * k + 1, b * k)],
      en: [`Which fraction is equivalent to ${frac(a, b)}?`, `Multiply the numerator and the denominator by the same number, ${k}: ${frac(a, b)} = ${frac(a * k, b * k)}.`],
      hi: [`कौन-सी भिन्न ${frac(a, b)} के तुल्य है?`, `अंश और हर दोनों को समान संख्या ${k} से गुणा कीजिए: ${frac(a, b)} = ${frac(a * k, b * k)}।`] };
  },
  // ── 5. Measurement ────────────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const km = int(r, 2, 9), m = int(r, 1, 9) * 50, total = km * 1000 + m;
    return { topic: 'Measurement', difficulty: E, correct: total, wrong: [km * 100 + m, km * 1000 + m * 10, km * 1000 - m, (km + 1) * 1000 + m], fmt: inr,
      en: [`${km} km ${m} m = ? m`, `1 km = 1000 m, so ${km} km ${m} m = ${inr(km * 1000)} + ${m} = ${inr(total)} m.`],
      hi: [`${km} किमी ${m} मी = ? मी`, `1 किमी = 1000 मी, इसलिए ${km} किमी ${m} मी = ${inr(km * 1000)} + ${m} = ${inr(total)} मी।`] };
  },
  (r) => {
    const kg = int(r, 3, 24), g = int(r, 1, 19) * 50, total = kg * 1000 + g;
    const fmt = (x) => `${Math.floor(x / 1000)} kg ${x % 1000} g`;
    const sub = int(r, 1, kg - 1) * 1000 + int(r, 1, 9) * 50, left = total - sub;
    return { topic: 'Measurement', difficulty: M, correct: left, wrong: [total + sub, left + 1000, left - 50, total - sub + 100], fmt, hiFmt: (x) => `${Math.floor(x / 1000)} किग्रा ${x % 1000} ग्राम`,
      en: [`A sack holds ${fmt(total)} of rice. If ${fmt(sub)} is taken out, how much rice is left?`, `Change to grams: ${inr(total)} g − ${inr(sub)} g = ${inr(left)} g = ${fmt(left)}.`],
      hi: [`एक बोरी में ${Math.floor(total / 1000)} किग्रा ${total % 1000} ग्राम चावल है। यदि ${Math.floor(sub / 1000)} किग्रा ${sub % 1000} ग्राम निकाल लिया जाए, तो कितना चावल बचेगा?`, `ग्राम में बदलिए: ${inr(total)} ग्राम − ${inr(sub)} ग्राम = ${inr(left)} ग्राम = ${Math.floor(left / 1000)} किग्रा ${left % 1000} ग्राम।`] };
  },
  (r) => {
    const ml = int(r, 1, 9) * 50, n = int(r, 12, 40), total = ml * n;
    const fmt = (x) => (x % 1000 ? `${Math.floor(x / 1000)} L ${x % 1000} mL` : `${x / 1000} L`);
    return { topic: 'Measurement', difficulty: M, correct: total, wrong: [total + 1000, ml * (n + 1), total - 500, ml * n * 10], fmt, hiFmt: (x) => (x % 1000 ? `${Math.floor(x / 1000)} लीटर ${x % 1000} मिली` : `${x / 1000} लीटर`),
      en: [`A glass holds ${ml} mL of juice. How much juice is needed to fill ${n} such glasses?`, `${ml} × ${n} = ${inr(total)} mL. Since 1 L = 1000 mL, that is ${fmt(total)}.`],
      hi: [`एक गिलास में ${ml} मिली जूस आता है। ऐसे ${n} गिलास भरने के लिए कितना जूस चाहिए?`, `${ml} × ${n} = ${inr(total)} मिली। 1 लीटर = 1000 मिली, अतः यह ${total % 1000 ? `${Math.floor(total / 1000)} लीटर ${total % 1000} मिली` : `${total / 1000} लीटर`} है।`] };
  },
  // Time: duration between two clock times
  (r) => {
    const h1 = int(r, 7, 11), m1 = pick(r, [0, 15, 20, 30, 40, 45]), dur = int(r, 1, 3) * 60 + pick(r, [5, 10, 25, 35, 50]);
    const end = h1 * 60 + m1 + dur, h2 = Math.floor(end / 60), m2 = end % 60;
    const ampm = (h) => (h >= 12 ? `${h === 12 ? 12 : h - 12}:` : `${h}:`);
    const t1 = `${hhmm(h1, m1)} a.m.`, t2 = `${ampm(h2)}${String(m2).padStart(2, '0')} ${h2 >= 12 ? 'p.m.' : 'a.m.'}`;
    return { topic: 'Measurement', difficulty: M, correct: dur, wrong: [dur + 60, dur - 10, dur + 10, Math.abs(dur - 30)], fmt: minsText, hiFmt: minsTextHi,
      en: [`A train leaves at ${t1} and reaches its destination at ${t2}. How long is the journey?`, `From ${t1} to ${t2} is ${minsText(dur)}.`],
      hi: [`एक रेलगाड़ी ${t1.replace('a.m.', 'पूर्वाह्न')} पर चलती है और ${t2.replace('p.m.', 'अपराह्न').replace('a.m.', 'पूर्वाह्न')} पर गंतव्य पर पहुँचती है। यात्रा में कितना समय लगा?`, `${t1.replace('a.m.', 'पूर्वाह्न')} से ${t2.replace('p.m.', 'अपराह्न').replace('a.m.', 'पूर्वाह्न')} तक ${minsTextHi(dur)} है।`] };
  },
  // Money: change
  (r) => {
    const [en, hi] = pick(r, NAMES);
    const price = int(r, 7, 43) * 5, n = int(r, 2, 6), paid = pick(r, [500, 1000, 2000]);
    const cost = price * n;
    if (cost >= paid) return null;
    const change = paid - cost;
    return { topic: 'Measurement', difficulty: M, correct: change, wrong: [paid - price, cost, change + 50, change - 10], fmt: (x) => `₹${inr(x)}`,
      en: [`${en} buys ${n} notebooks at ₹${price} each and pays with a ₹${inr(paid)} note. How much change should ${en} get?`, `Cost = ${n} × ₹${price} = ₹${inr(cost)}. Change = ₹${inr(paid)} − ₹${inr(cost)} = ₹${inr(change)}.`],
      hi: [`${hi} ₹${price} प्रति कॉपी के हिसाब से ${n} कॉपियाँ खरीदता/खरीदती है और ₹${inr(paid)} का नोट देता/देती है। उसे कितने रुपये वापस मिलने चाहिए?`, `मूल्य = ${n} × ₹${price} = ₹${inr(cost)}। वापसी = ₹${inr(paid)} − ₹${inr(cost)} = ₹${inr(change)}।`] };
  },
  // Unit conversion: cm to m, minutes to hours
  (r) => {
    const kind = pick(r, ['cm', 'min', 'paise']);
    if (kind === 'cm') {
      const m = int(r, 2, 19), cm = int(r, 1, 99), total = m * 100 + cm;
      return { topic: 'Measurement', difficulty: E, correct: `${m} m ${cm} cm`, wrong: [`${m} m ${cm * 10 > 99 ? cm + 1 : cm * 10} cm`, `${Math.floor(total / 10)} m ${total % 10} cm`, `${m + 1} m ${cm} cm`, `${cm} m ${m} cm`], hiFmt: (s) => s.replace(' m ', ' मी ').replace(' cm', ' सेमी'),
        en: [`${inr(total)} cm = ? m ? cm`, `100 cm = 1 m, so ${inr(total)} cm = ${m} m ${cm} cm.`],
        hi: [`${inr(total)} सेमी = ? मी ? सेमी`, `100 सेमी = 1 मी, इसलिए ${inr(total)} सेमी = ${m} मी ${cm} सेमी।`] };
    }
    if (kind === 'min') {
      const h = int(r, 2, 7), m = int(r, 1, 59), total = h * 60 + m;
      return { topic: 'Measurement', difficulty: E, correct: `${h} h ${m} min`, wrong: [`${h} h ${m + 1 > 59 ? m - 1 : m + 1} min`, `${Math.floor(total / 100)} h ${total % 100} min`, `${h + 1} h ${m} min`, `${h - 1} h ${m} min`], hiFmt: (s) => s.replace(' h ', ' घंटे ').replace(' min', ' मिनट'),
        en: [`${total} minutes = ? hours ? minutes`, `60 minutes = 1 hour. ${total} ÷ 60 gives ${h} with remainder ${m}, so ${h} h ${m} min.`],
        hi: [`${total} मिनट = ? घंटे ? मिनट`, `60 मिनट = 1 घंटा। ${total} ÷ 60 से भागफल ${h} और शेष ${m}, अतः ${h} घंटे ${m} मिनट।`] };
    }
    const rs = int(r, 12, 99), p = pick(r, [5, 25, 50, 75]), total = rs * 100 + p;
    return { topic: 'Measurement', difficulty: E, correct: inr(total), wrong: [inr(rs * 10 + p), inr(rs * 100 + p * 10), inr(rs * 100 - p), inr(total + 100)],
      en: [`₹${rs}.${String(p).padStart(2, '0')} = ? paise`, `₹1 = 100 paise, so ₹${rs} = ${inr(rs * 100)} paise; add ${p} paise: ${inr(total)} paise.`],
      hi: [`₹${rs}.${String(p).padStart(2, '0')} = ? पैसे`, `₹1 = 100 पैसे, इसलिए ₹${rs} = ${inr(rs * 100)} पैसे; ${p} पैसे जोड़िए: ${inr(total)} पैसे।`] };
  },
  // ── 6. Simplification ─────────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const a = int(r, 12, 48), b = int(r, 3, 9), c = int(r, 2, 9), d = int(r, 11, 30);
    const v = a + b * c - d;
    if (v <= 0) return null;
    return { topic: 'Simplification', difficulty: M, correct: v, wrong: [(a + b) * c - d, a + b * (c - d), a + b * c + d, a - b * c + d],
      en: [`Simplify: ${a} + ${b} × ${c} − ${d}`, `Multiply first: ${b} × ${c} = ${b * c}. Then ${a} + ${b * c} − ${d} = ${v}.`],
      hi: [`सरल कीजिए: ${a} + ${b} × ${c} − ${d}`, `पहले गुणा: ${b} × ${c} = ${b * c}। फिर ${a} + ${b * c} − ${d} = ${v}।`] };
  },
  (r) => {
    const b = int(r, 4, 12), c = int(r, 2, 9), q = int(r, 3, 12), e = int(r, 2, 9);
    const a = q * e, v = (b + c) * q - a / e;
    return { topic: 'Simplification', difficulty: H, correct: v, wrong: [b + c * q - a / e, (b + c) * q + a / e, (b + c) * (q - a / e), b + c * (q - a / e)],
      en: [`Simplify: (${b} + ${c}) × ${q} − ${a} ÷ ${e}`, `Brackets first: ${b} + ${c} = ${b + c}. Then ${b + c} × ${q} = ${(b + c) * q} and ${a} ÷ ${e} = ${a / e}. Finally ${(b + c) * q} − ${a / e} = ${v}.`],
      hi: [`सरल कीजिए: (${b} + ${c}) × ${q} − ${a} ÷ ${e}`, `पहले कोष्ठक: ${b} + ${c} = ${b + c}। फिर ${b + c} × ${q} = ${(b + c) * q} और ${a} ÷ ${e} = ${a / e}। अंत में ${(b + c) * q} − ${a / e} = ${v}।`] };
  },
  (r) => {
    const inner = int(r, 2, 6), m = int(r, 7, 15), big = int(r, 20, 40), c = int(r, 2, 5);
    const v = big - (m - inner) * c;
    if (v <= 0) return null;
    return { topic: 'Simplification', difficulty: H, correct: v, wrong: [big - m - inner * c, (big - m + inner) * c, big - (m + inner) * c, big - m * c + inner],
      en: [`Simplify: ${big} − [(${m} − ${inner}) × ${c}]`, `Innermost first: ${m} − ${inner} = ${m - inner}; then × ${c} = ${(m - inner) * c}; then ${big} − ${(m - inner) * c} = ${v}.`],
      hi: [`सरल कीजिए: ${big} − [(${m} − ${inner}) × ${c}]`, `सबसे भीतर का कोष्ठक पहले: ${m} − ${inner} = ${m - inner}; फिर × ${c} = ${(m - inner) * c}; फिर ${big} − ${(m - inner) * c} = ${v}।`] };
  },
  // ── 7. Perimeter and area ─────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const l = int(r, 12, 45), b = int(r, 5, l - 1), p = 2 * (l + b);
    return { topic: 'Perimeter and area', difficulty: E, correct: p, wrong: [l + b, l * b, 2 * l + b, 4 * l], fmt: (x) => `${x} m`, hiFmt: (x) => `${x} मी`,
      en: [`A rectangular garden is ${l} m long and ${b} m wide. What is its perimeter?`, `Perimeter = 2 × (length + breadth) = 2 × (${l} + ${b}) = 2 × ${l + b} = ${p} m.`],
      hi: [`एक आयताकार बगीचा ${l} मी लंबा और ${b} मी चौड़ा है। उसका परिमाप क्या है?`, `परिमाप = 2 × (लंबाई + चौड़ाई) = 2 × (${l} + ${b}) = 2 × ${l + b} = ${p} मी।`] };
  },
  (r) => {
    const l = int(r, 8, 30), b = int(r, 4, l - 1), a = l * b;
    return { topic: 'Perimeter and area', difficulty: E, correct: a, wrong: [2 * (l + b), l + b, a + l, 2 * a], fmt: (x) => `${inr(x)} sq cm`, hiFmt: (x) => `${inr(x)} वर्ग सेमी`,
      en: [`What is the area of a rectangle of length ${l} cm and breadth ${b} cm?`, `Area = length × breadth = ${l} × ${b} = ${inr(a)} sq cm.`],
      hi: [`${l} सेमी लंबाई और ${b} सेमी चौड़ाई वाले आयत का क्षेत्रफल क्या है?`, `क्षेत्रफल = लंबाई × चौड़ाई = ${l} × ${b} = ${inr(a)} वर्ग सेमी।`] };
  },
  (r) => {
    const s = int(r, 6, 25), p = 4 * s;
    const area = r() < 0.5;
    return area
      ? { topic: 'Perimeter and area', difficulty: E, correct: s * s, wrong: [4 * s, 2 * s, s * s + s, s * 2 * 2], fmt: (x) => `${inr(x)} sq m`, hiFmt: (x) => `${inr(x)} वर्ग मी`,
        en: [`The perimeter of a square field is ${p} m. What is its area?`, `Side = ${p} ÷ 4 = ${s} m. Area = ${s} × ${s} = ${inr(s * s)} sq m.`],
        hi: [`एक वर्गाकार खेत का परिमाप ${p} मी है। उसका क्षेत्रफल क्या है?`, `भुजा = ${p} ÷ 4 = ${s} मी। क्षेत्रफल = ${s} × ${s} = ${inr(s * s)} वर्ग मी।`] }
      : { topic: 'Perimeter and area', difficulty: E, correct: p, wrong: [s * s, 2 * s, 3 * s, s + 4], fmt: (x) => `${x} cm`, hiFmt: (x) => `${x} सेमी`,
        en: [`Each side of a square is ${s} cm. What is its perimeter?`, `Perimeter of a square = 4 × side = 4 × ${s} = ${p} cm.`],
        hi: [`एक वर्ग की प्रत्येक भुजा ${s} सेमी है। उसका परिमाप क्या है?`, `वर्ग का परिमाप = 4 × भुजा = 4 × ${s} = ${p} सेमी।`] };
  },
  (r) => {
    const l = int(r, 6, 20) * 2, b = int(r, 3, 15) * 2, a = (l * b) / 2;
    return { topic: 'Perimeter and area', difficulty: M, correct: a, wrong: [l * b, l + b, a + l, 2 * (l + b)], fmt: (x) => `${inr(x)} sq cm`, hiFmt: (x) => `${inr(x)} वर्ग सेमी`,
      en: [`A rectangle of length ${l} cm and breadth ${b} cm is cut along a diagonal into two equal triangles. What is the area of one triangle?`, `Area of the rectangle = ${l} × ${b} = ${inr(l * b)} sq cm. Each triangle is half of it: ${inr(a)} sq cm.`],
      hi: [`${l} सेमी लंबाई और ${b} सेमी चौड़ाई वाले आयत को एक विकर्ण के अनुदिश दो बराबर त्रिभुजों में काटा गया। एक त्रिभुज का क्षेत्रफल क्या है?`, `आयत का क्षेत्रफल = ${l} × ${b} = ${inr(l * b)} वर्ग सेमी। प्रत्येक त्रिभुज उसका आधा है: ${inr(a)} वर्ग सेमी।`] };
  },
  (r) => {
    const l = int(r, 10, 40), b = int(r, 6, l - 1), rate = pick(r, [8, 10, 12, 15, 20]), cost = 2 * (l + b) * rate;
    return { topic: 'Perimeter and area', difficulty: H, correct: cost, wrong: [l * b * rate, (l + b) * rate, 2 * (l + b), cost + rate * 10], fmt: (x) => `₹${inr(x)}`,
      en: [`A rectangular plot is ${l} m by ${b} m. What is the cost of fencing it at ₹${rate} per metre?`, `Fencing goes round the perimeter: 2 × (${l} + ${b}) = ${2 * (l + b)} m. Cost = ${2 * (l + b)} × ₹${rate} = ₹${inr(cost)}.`],
      hi: [`एक आयताकार भूखंड ${l} मी × ${b} मी है। ₹${rate} प्रति मीटर की दर से उसकी बाड़ लगाने का खर्च क्या होगा?`, `बाड़ परिमाप पर लगती है: 2 × (${l} + ${b}) = ${2 * (l + b)} मी। खर्च = ${2 * (l + b)} × ₹${rate} = ₹${inr(cost)}।`] };
  },
  // ── 8. Angles and directions ──────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const deg = pick(r, [35, 48, 62, 75, 90, 105, 120, 138, 155, 180, 200, 270]);
    const type = deg < 90 ? 'Acute angle' : deg === 90 ? 'Right angle' : deg < 180 ? 'Obtuse angle' : deg === 180 ? 'Straight angle' : 'Reflex angle';
    const all = ['Acute angle', 'Right angle', 'Obtuse angle', 'Straight angle', 'Reflex angle'];
    const hiOf = { 'Acute angle': 'न्यून कोण', 'Right angle': 'समकोण', 'Obtuse angle': 'अधिक कोण', 'Straight angle': 'ऋजु (सरल) कोण', 'Reflex angle': 'प्रतिवर्ती कोण' };
    return { topic: 'Angles and directions', difficulty: E, correct: type, wrong: all.filter((t) => t !== type), hiFmt: (t) => hiOf[t],
      en: [`What type of angle measures ${deg}°?`, `Less than 90° is acute, exactly 90° is right, between 90° and 180° is obtuse, exactly 180° is straight and more than 180° is reflex. ${deg}° is ${type.toLowerCase().replace(' angle', '')}.`],
      hi: [`${deg}° का कोण किस प्रकार का कोण है?`, `90° से कम न्यून, ठीक 90° समकोण, 90° और 180° के बीच अधिक, ठीक 180° ऋजु और 180° से अधिक प्रतिवर्ती कोण होता है। ${deg}° ${hiOf[type]} है।`] };
  },
  (r) => {
    const h = pick(r, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    const deg = Math.min(h, 12 - h) * 30;
    return { topic: 'Angles and directions', difficulty: M, correct: deg, wrong: [deg + 30, deg - 30 || 15, h * 10, Math.abs(360 - deg * 2)], fmt: (x) => `${x}°`,
      en: [`What is the smaller angle between the hour hand and the minute hand of a clock at ${h}:00?`, `Each hour mark is 360° ÷ 12 = 30° apart. At ${h}:00 the hands are ${Math.min(h, 12 - h)} hour marks apart: ${Math.min(h, 12 - h)} × 30° = ${deg}°.`],
      hi: [`घड़ी में ${h}:00 बजे घंटे और मिनट की सुइयों के बीच छोटा कोण कितना है?`, `घंटे के दो निशानों के बीच 360° ÷ 12 = 30° होता है। ${h}:00 बजे सुइयाँ ${Math.min(h, 12 - h)} निशान दूर हैं: ${Math.min(h, 12 - h)} × 30° = ${deg}°।`] };
  },
  (r) => {
    const DIRS = ['north', 'east', 'south', 'west'], DIRS_HI = ['उत्तर', 'पूर्व', 'दक्षिण', 'पश्चिम'];
    const start = int(r, 0, 3), turns = int(r, 1, 3), right = r() < 0.5;
    const end = (start + (right ? turns : 4 - turns)) % 4;
    const [en, hi] = pick(r, NAMES);
    return { topic: 'Angles and directions', difficulty: M, correct: DIRS[end], wrong: DIRS.filter((d) => d !== DIRS[end]), hiFmt: (d) => DIRS_HI[DIRS.indexOf(d)],
      en: [`${en} is facing ${DIRS[start]}. ${en} turns ${right ? 'right' : 'left'} ${turns === 1 ? 'once' : `${turns} times`}, 90° each time. Which direction is ${en} facing now?`, `Each 90° turn moves ${right ? 'clockwise (N → E → S → W)' : 'anticlockwise (N → W → S → E)'}. From ${DIRS[start]}, ${turns} such turn${turns > 1 ? 's' : ''} ends facing ${DIRS[end]}.`],
      hi: [`${hi} का मुख ${DIRS_HI[start]} की ओर है। वह ${turns === 1 ? 'एक बार' : `${turns} बार`} ${right ? 'दाएँ' : 'बाएँ'} मुड़ता/मुड़ती है, हर बार 90°। अब उसका मुख किस दिशा में है?`, `हर 90° मोड़ ${right ? 'दक्षिणावर्त (उ → पू → द → प)' : 'वामावर्त (उ → प → द → पू)'} ले जाता है। ${DIRS_HI[start]} से ${turns} मोड़ के बाद मुख ${DIRS_HI[end]} की ओर होगा।`] };
  },
  (r) => {
    const a = int(r, 20, 70), b = int(r, 20, 160 - a), c = 180 - a - b;
    return { topic: 'Angles and directions', difficulty: M, correct: c, wrong: [180 - a, 360 - a - b, c + 10, 90 - a > 0 ? 90 - a : c - 10], fmt: (x) => `${x}°`,
      en: [`Two angles of a triangle measure ${a}° and ${b}°. What is the third angle?`, `The three angles of a triangle add up to 180°. Third angle = 180° − ${a}° − ${b}° = ${c}°.`],
      hi: [`एक त्रिभुज के दो कोण ${a}° और ${b}° हैं। तीसरा कोण कितना है?`, `त्रिभुज के तीनों कोणों का योग 180° होता है। तीसरा कोण = 180° − ${a}° − ${b}° = ${c}°।`] };
  },
  // ── 9. Data handling ──────────────────────────────────────────────────────────────────────────────────────────
  (r) => {
    const days = [['Monday', 'सोमवार'], ['Tuesday', 'मंगलवार'], ['Wednesday', 'बुधवार'], ['Thursday', 'गुरुवार'], ['Friday', 'शुक्रवार']];
    const unit = pick(r, [5, 10, 20]);
    const counts = days.map(() => int(r, 1, 6));
    const i = int(r, 0, 4), j = (i + int(r, 1, 4)) % 5;
    const rows = days.map((d, k) => `${d[0]}: ${'■'.repeat(counts[k])}`).join('; ');
    const rowsHi = days.map((d, k) => `${d[1]}: ${'■'.repeat(counts[k])}`).join('; ');
    const diff = Math.abs(counts[i] - counts[j]) * unit, total = counts.reduce((a, b) => a + b, 0) * unit;
    const ask = r() < 0.5;
    return ask
      ? { topic: 'Data handling', difficulty: M, correct: diff, wrong: [Math.abs(counts[i] - counts[j]), diff + unit, (counts[i] + counts[j]) * unit, total], fmt: inr,
        en: [`In a pictograph of books sold, each ■ stands for ${unit} books. ${rows}. How many more books were sold on ${days[counts[i] >= counts[j] ? i : j][0]} than on ${days[counts[i] >= counts[j] ? j : i][0]}?`, `${days[i][0]}: ${counts[i]} × ${unit} = ${counts[i] * unit}; ${days[j][0]}: ${counts[j]} × ${unit} = ${counts[j] * unit}. Difference = ${diff}.`],
        hi: [`बेची गई पुस्तकों के चित्रालेख में प्रत्येक ■ ${unit} पुस्तकों को दर्शाता है। ${rowsHi}। ${days[counts[i] >= counts[j] ? i : j][1]} को ${days[counts[i] >= counts[j] ? j : i][1]} की तुलना में कितनी अधिक पुस्तकें बिकीं?`, `${days[i][1]}: ${counts[i]} × ${unit} = ${counts[i] * unit}; ${days[j][1]}: ${counts[j]} × ${unit} = ${counts[j] * unit}। अंतर = ${diff}।`] }
      : { topic: 'Data handling', difficulty: M, correct: total, wrong: [total / unit, total + unit, total - unit, Math.max(...counts) * unit], fmt: inr,
        en: [`In a pictograph of books sold, each ■ stands for ${unit} books. ${rows}. How many books were sold in all?`, `Total symbols = ${counts.join(' + ')} = ${total / unit}; ${total / unit} × ${unit} = ${total} books.`],
        hi: [`बेची गई पुस्तकों के चित्रालेख में प्रत्येक ■ ${unit} पुस्तकों को दर्शाता है। ${rowsHi}। कुल कितनी पुस्तकें बिकीं?`, `कुल चिह्न = ${counts.join(' + ')} = ${total / unit}; ${total / unit} × ${unit} = ${total} पुस्तकें।`] };
  },
  (r) => {
    const subjects = [['English', 'अंग्रेज़ी'], ['Hindi', 'हिंदी'], ['Maths', 'गणित'], ['EVS', 'पर्यावरण अध्ययन']];
    const marks = subjects.map(() => int(r, 5, 19) * 5);
    const [en, hi] = pick(r, NAMES);
    const table = subjects.map((s, k) => `${s[0]} ${marks[k]}`).join(', ');
    const tableHi = subjects.map((s, k) => `${s[1]} ${marks[k]}`).join(', ');
    const hiIdx = marks.indexOf(Math.max(...marks)), loIdx = marks.indexOf(Math.min(...marks));
    const kind = pick(r, ['diff', 'total', 'avg']);
    if (kind === 'diff') {
      const d = marks[hiIdx] - marks[loIdx];
      return { topic: 'Data handling', difficulty: E, correct: d, wrong: [marks[hiIdx] + marks[loIdx], d + 5, d - 5 || 10, marks[hiIdx]],
        en: [`${en}'s marks out of 100 are: ${table}. By how many marks is the highest score more than the lowest?`, `Highest ${marks[hiIdx]} (${subjects[hiIdx][0]}), lowest ${marks[loIdx]} (${subjects[loIdx][0]}); difference ${d}.`],
        hi: [`${hi} के 100 में से अंक हैं: ${tableHi}। सबसे अधिक अंक, सबसे कम अंक से कितने अधिक हैं?`, `सबसे अधिक ${marks[hiIdx]} (${subjects[hiIdx][1]}), सबसे कम ${marks[loIdx]} (${subjects[loIdx][1]}); अंतर ${d}।`] };
    }
    const total = marks.reduce((a, b) => a + b, 0);
    if (kind === 'total') {
      return { topic: 'Data handling', difficulty: E, correct: total, wrong: [total + 5, total - 10, total + 10, 400 - total], fmt: inr,
        en: [`${en}'s marks out of 100 are: ${table}. What is the total?`, `${marks.join(' + ')} = ${total}.`],
        hi: [`${hi} के 100 में से अंक हैं: ${tableHi}। कुल योग क्या है?`, `${marks.join(' + ')} = ${total}।`] };
    }
    if (total % 4) return null;
    return { topic: 'Data handling', difficulty: M, correct: total / 4, wrong: [total, total / 4 + 5, total / 2, total / 4 - 5],
      en: [`${en}'s marks out of 100 are: ${table}. What is the average mark?`, `Average = total ÷ 4 = ${total} ÷ 4 = ${total / 4}.`],
      hi: [`${hi} के 100 में से अंक हैं: ${tableHi}। औसत अंक क्या है?`, `औसत = योग ÷ 4 = ${total} ÷ 4 = ${total / 4}।`] };
  },
  (r) => {
    const items = [['Mango', 'आम'], ['Apple', 'सेब'], ['Banana', 'केला'], ['Guava', 'अमरूद'], ['Orange', 'संतरा']];
    const votes = items.map(() => int(r, 2, 15) * 2);
    const bars = items.map((it, k) => `${it[0]} ${votes[k]}`).join(', ');
    const barsHi = items.map((it, k) => `${it[1]} ${votes[k]}`).join(', ');
    const maxI = votes.indexOf(Math.max(...votes)), total = votes.reduce((a, b) => a + b, 0);
    const ask = r() < 0.5;
    return ask
      ? { topic: 'Data handling', difficulty: E, correct: items[maxI][0], wrong: items.filter((_, k) => k !== maxI).map((it) => it[0]), hiFmt: (x) => items.find((it) => it[0] === x)[1],
        en: [`A bar graph shows the favourite fruit of a class (number of students): ${bars}. Which fruit has the tallest bar?`, `The tallest bar is the largest number: ${items[maxI][0]} with ${votes[maxI]} students.`],
        hi: [`एक दंड आलेख कक्षा के पसंदीदा फल (विद्यार्थियों की संख्या) दिखाता है: ${barsHi}। किस फल का दंड सबसे ऊँचा है?`, `सबसे ऊँचा दंड सबसे बड़ी संख्या का है: ${items[maxI][1]}, ${votes[maxI]} विद्यार्थी।`] }
      : { topic: 'Data handling', difficulty: M, correct: total, wrong: [total - votes[maxI], total + 2, Math.max(...votes), total - 2], fmt: inr,
        en: [`A bar graph shows the favourite fruit of a class (number of students): ${bars}. How many students are there in the class?`, `Add all the bars: ${votes.join(' + ')} = ${total}.`],
        hi: [`एक दंड आलेख कक्षा के पसंदीदा फल (विद्यार्थियों की संख्या) दिखाता है: ${barsHi}। कक्षा में कुल कितने विद्यार्थी हैं?`, `सभी दंड जोड़िए: ${votes.join(' + ')} = ${total}।`] };
  },
];

/** Hindi options for a generated question: a Hindi formatter when the English values are words or units, else the same values. */
function build(r, g, id) {
  const spec = g(r);
  if (!spec) return null;
  const fmt = spec.fmt ?? String;
  try {
    return mcq(r, {
      id, section: 'Arithmetic', topic: spec.topic, difficulty: spec.difficulty, prompt: spec.en[0], correct: spec.correct, wrong: spec.wrong,
      explanation: spec.en[1], fmt, hi: { prompt: spec.hi[0], explanation: spec.hi[1], fmt: spec.hiFmt ?? fmt },
    });
  } catch {
    return null; // distractors collided for these numbers: draw again
  }
}

/** 20 questions walking through the generators in order (so every set covers all nine topics), each new to the bank. */
export function arithmeticSet(r, setNo, seen, prefix = 'a') {
  const out = [];
  let g = (setNo * 7) % GENERATORS.length;
  for (let i = 1; i <= 20; i++) {
    const gen = GENERATORS[g % GENERATORS.length];
    out.push(unique(seen, () => { let q = null; while (!q) q = build(r, gen, `${prefix}${i}`); return q; }));
    g += 1;
  }
  return out;
}

export const ARITHMETIC_TOPICS = ['Number system', 'Four operations', 'Factors and multiples', 'Fractions', 'Measurement', 'Simplification', 'Perimeter and area', 'Angles and directions', 'Data handling'];
