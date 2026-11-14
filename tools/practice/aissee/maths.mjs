// AISSEE Class VI Mathematics: original questions generated from rules, one generator family per topic in the
// existing AISSEE syllabus on SchoolDhundo (natural numbers, LCM & HCF, unitary method, fractions, ratio & proportion,
// profit & loss, simplification, average, percentage, simple interest, area & perimeter, lines & angles, circle,
// conversion of units, Roman numerals, volume, prime & composite numbers, plane figures, decimals, speed & time,
// temperature, arranging fractions). Every answer is computed; English and Hindi are written together.
import { inr, int, mcq, pick, unique } from '../netarhat/core.mjs';

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const lcm = (a, b) => (a / gcd(a, b)) * b;
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((d) => n % d);
const pf = (n) => { const o = []; for (let d = 2; n > 1; d++) while (n % d === 0) { o.push(d); n /= d; } return o; };
const roman = (n) => [[1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'], [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  .reduce((s, [v, l]) => { while (n >= v) { s += l; n -= v; } return s; }, '');
const fr = (a, b) => { const g = gcd(a, b); return b / g === 1 ? `${a / g}` : `${a / g}/${b / g}`; };
const rs = (n) => `₹${inr(n)}`;
const NAMES = [['Aditya', 'आदित्य'], ['Kavya', 'काव्या'], ['Rohan', 'रोहन'], ['Sana', 'सना'], ['Vikram', 'विक्रम'], ['Neha', 'नेहा'], ['Harsh', 'हर्ष'], ['Tara', 'तारा']];
const E = 'EASY', M = 'MEDIUM', H = 'HARD';

const G = [
  // Natural numbers and operations
  (r) => { const a = int(r, 2345, 9876), b = int(r, 12, 39); const d = a * b, w = Math.abs(int(r, 10, 99) - 0); void w;
    const right = int(r, 21, 49), wrong = right - 9 > 9 ? right - 9 : right + 9; const diff = a * Math.abs(right - wrong);
    return { topic: 'Natural numbers', difficulty: M, correct: diff, wrong: [a * 9 + 10, diff + a, diff - a, d], fmt: inr,
      en: [`A student multiplied ${inr(a)} by ${wrong} instead of ${right}. By how much did the answer differ from the correct one?`, `The difference is ${inr(a)} × (${Math.max(right, wrong)} − ${Math.min(right, wrong)}) = ${inr(a)} × ${Math.abs(right - wrong)} = ${inr(diff)}.`],
      hi: [`एक विद्यार्थी ने ${inr(a)} को ${right} के बजाय ${wrong} से गुणा किया। उसका उत्तर सही उत्तर से कितना भिन्न था?`, `अंतर = ${inr(a)} × (${Math.max(right, wrong)} − ${Math.min(right, wrong)}) = ${inr(a)} × ${Math.abs(right - wrong)} = ${inr(diff)}।`] }; },
  (r) => { const digits = new Set(); while (digits.size < 5) digits.add(int(r, 0, 9)); const d = [...digits];
    const big = Number([...d].sort((a, b) => b - a).join('')); const asc = [...d].sort((a, b) => a - b); if (asc[0] === 0) [asc[0], asc[1]] = [asc[1], asc[0]];
    const small = Number(asc.join('')), v = big - small;
    return { topic: 'Natural numbers', difficulty: M, correct: v, wrong: [v + 9, v - 90, big + small, v + 1000], fmt: inr,
      en: [`Using each of the digits ${d.join(', ')} once, what is the difference between the greatest and the smallest 5-digit numbers?`, `Greatest ${inr(big)}, smallest ${inr(small)} (a number cannot start with 0). Difference ${inr(v)}.`],
      hi: [`अंकों ${d.join(', ')} का एक-एक बार प्रयोग करके बनी सबसे बड़ी और सबसे छोटी 5 अंकों की संख्याओं का अंतर क्या है?`, `सबसे बड़ी ${inr(big)}, सबसे छोटी ${inr(small)} (संख्या 0 से शुरू नहीं होती)। अंतर ${inr(v)}।`] }; },
  (r) => { const d = int(r, 23, 68), q = int(r, 15, 45), rem = int(r, 1, d - 1), n = d * q + rem;
    return { topic: 'Natural numbers', difficulty: E, correct: n, wrong: [d * q - rem, d * q, d * rem + q, n + d], fmt: inr,
      en: [`In a division, the divisor is ${d}, the quotient is ${q} and the remainder is ${rem}. Find the dividend.`, `Dividend = divisor × quotient + remainder = ${d} × ${q} + ${rem} = ${inr(n)}.`],
      hi: [`एक भाग में भाजक ${d}, भागफल ${q} और शेषफल ${rem} है। भाज्य ज्ञात कीजिए।`, `भाज्य = भाजक × भागफल + शेषफल = ${d} × ${q} + ${rem} = ${inr(n)}।`] }; },
  // LCM & HCF
  (r) => { const a = pick(r, [6, 8, 9, 10, 12, 15]), b = pick(r, [14, 16, 18, 20, 24, 25]), c = pick(r, [21, 27, 30, 32, 36]);
    const l = lcm(lcm(a, b), c), rem = int(r, 2, Math.min(a, b, c) - 1), v = l + rem;
    return { topic: 'LCM and HCF', difficulty: H, correct: v, wrong: [l, l - rem, a * b * c + rem, l * 2 + rem],
      en: [`What is the smallest number that leaves a remainder of ${rem} when divided by ${a}, ${b} and ${c}?`, `LCM of ${a}, ${b}, ${c} is ${l}; add the remainder: ${l} + ${rem} = ${v}.`],
      hi: [`वह सबसे छोटी संख्या कौन-सी है जिसे ${a}, ${b} और ${c} से भाग देने पर हर बार ${rem} शेष बचे?`, `${a}, ${b}, ${c} का ल.स. ${l} है; शेष जोड़िए: ${l} + ${rem} = ${v}।`] }; },
  (r) => { const g = pick(r, [6, 8, 9, 12, 14, 15, 18]), a = g * pick(r, [5, 7, 11]), b = g * pick(r, [8, 9, 13]);
    return { topic: 'LCM and HCF', difficulty: M, correct: gcd(a, b), wrong: [g / 2 % 1 ? g * 2 : g / 2, g * 3, lcm(a, b), g + 1], fmt: (x) => `${x} m`, hiFmt: (x) => `${x} मीटर`,
      en: [`Two ropes are ${a} m and ${b} m long. They must be cut into pieces of equal length with nothing left over. What is the longest possible piece?`, `The longest piece is the HCF of ${a} and ${b}, which is ${gcd(a, b)} m.`],
      hi: [`दो रस्सियाँ ${a} मी और ${b} मी लंबी हैं। इन्हें बिना कुछ बचाए बराबर लंबाई के टुकड़ों में काटना है। सबसे लंबा टुकड़ा कितना हो सकता है?`, `सबसे लंबा टुकड़ा ${a} और ${b} का म.स. यानी ${gcd(a, b)} मी है।`] }; },
  (r) => { const h = pick(r, [4, 6, 8, 12]), x = pick(r, [3, 5, 7]), y = pick(r, [4, 9, 11]); if (gcd(x, y) !== 1) return null;
    const a = h * x, b = h * y, l = lcm(a, b);
    return { topic: 'LCM and HCF', difficulty: M, correct: b, wrong: [b + h, l / h, a, b - h],
      en: [`The HCF of two numbers is ${h} and their LCM is ${l}. If one number is ${a}, what is the other?`, `HCF × LCM = product of the numbers, so the other = ${h} × ${l} ÷ ${a} = ${b}.`],
      hi: [`दो संख्याओं का म.स. ${h} और ल.स. ${l} है। यदि एक संख्या ${a} है, तो दूसरी क्या है?`, `म.स. × ल.स. = संख्याओं का गुणनफल, अतः दूसरी = ${h} × ${l} ÷ ${a} = ${b}।`] }; },
  (r) => { const t = [pick(r, [4, 6, 8]), pick(r, [10, 12, 15]), pick(r, [9, 18, 20])]; const l = t.reduce(lcm);
    const h0 = int(r, 7, 9), m0 = pick(r, [0, 10, 15, 30]); const total = h0 * 60 + m0 + l; const hh = Math.floor(total / 60), mm = total % 60;
    if (total >= 12 * 60) return null; const ans = `${hh}:${String(mm).padStart(2, '0')}`;
    return { topic: 'LCM and HCF', difficulty: H, correct: ans, wrong: [`${hh}:${String((mm + 5) % 60).padStart(2, '0')}`, `${h0}:${String(m0).padStart(2, '0')}`, `${hh + 1}:${String(mm).padStart(2, '0')}`],
      en: [`Three lights blink every ${t[0]}, ${t[1]} and ${t[2]} minutes. They blink together at ${h0}:${String(m0).padStart(2, '0')} a.m. When will they next blink together?`, `They blink together every LCM(${t.join(', ')}) = ${l} minutes, so next at ${ans} a.m.`],
      hi: [`तीन बत्तियाँ हर ${t[0]}, ${t[1]} और ${t[2]} मिनट पर जलती हैं। वे सुबह ${h0}:${String(m0).padStart(2, '0')} पर एक साथ जलीं। अगली बार एक साथ कब जलेंगी?`, `वे हर ल.स.(${t.join(', ')}) = ${l} मिनट पर एक साथ जलती हैं, अतः अगली बार ${ans} बजे।`] }; },
  // Unitary method
  (r) => { const n1 = int(r, 6, 18), p = int(r, 12, 75), n2 = int(r, 7, 25); if (n1 === n2) return null; const c1 = n1 * p, c2 = n2 * p;
    const item = pick(r, [['notebooks', 'कॉपियों'], ['pens', 'पेनों'], ['kg of rice', 'किलो चावल'], ['mangoes', 'आमों']]);
    return { topic: 'Unitary method', difficulty: E, correct: c2, wrong: [c2 + p, c2 - p, c1 + n2, c1], fmt: rs,
      en: [`If ${n1} ${item[0]} cost ${rs(c1)}, how much do ${n2} cost?`, `One costs ${rs(c1)} ÷ ${n1} = ${rs(p)}; ${n2} cost ${n2} × ${p} = ${rs(c2)}.`],
      hi: [`यदि ${n1} ${item[1]} का मूल्य ${rs(c1)} है, तो ${n2} का मूल्य कितना होगा?`, `एक का मूल्य ${rs(c1)} ÷ ${n1} = ${rs(p)}; ${n2} का ${n2} × ${p} = ${rs(c2)}।`] }; },
  (r) => { const m1 = pick(r, [6, 8, 10, 12, 15, 18, 20]), d1 = pick(r, [8, 10, 12, 15, 16, 24]), m2 = pick(r, [4, 5, 6, 8, 9, 10, 12, 16, 24, 30]);
    const work = m1 * d1; if (work % m2 || m1 === m2) return null; const d2 = work / m2;
    return { topic: 'Unitary method', difficulty: M, correct: d2, wrong: [d2 + 2, Math.round((d1 * m2) / m1) || d2 + 4, d1, d2 - 1].filter((x) => x > 0), fmt: (x) => `${x} days`, hiFmt: (x) => `${x} दिन`,
      en: [`${m1} workers can build a wall in ${d1} days. How many days will ${m2} workers take to build the same wall?`, `Total work = ${m1} × ${d1} = ${work} worker-days. ${work} ÷ ${m2} = ${d2} days. Fewer workers take more days.`],
      hi: [`${m1} मज़दूर एक दीवार ${d1} दिनों में बनाते हैं। ${m2} मज़दूर वही दीवार कितने दिनों में बनाएँगे?`, `कुल काम = ${m1} × ${d1} = ${work} मज़दूर-दिन। ${work} ÷ ${m2} = ${d2} दिन। कम मज़दूर अधिक दिन लेते हैं।`] }; },
  // Fractions and arranging fractions
  (r) => { const a = int(r, 1, 3), b = pick(r, [4, 5, 6]), c = int(r, 1, 3), d = pick(r, [7, 8, 9, 10]); if (a >= b || c >= d) return null;
    const rest = d * b - a * d - c * b; if (rest <= 0) return null; const ans = fr(rest, b * d);
    return { topic: 'Fractions', difficulty: M, correct: ans, wrong: [fr(a + c, b + d), fr(a * d + c * b, b * d), fr(rest + 1, b * d), fr(b * d - rest, b * d)].filter((x) => x !== ans),
      en: [`A wall is painted: ${a}/${b} of it blue and ${c}/${d} of it yellow. The rest is white. What part is white?`, `1 − ${a}/${b} − ${c}/${d} = (${b * d} − ${a * d} − ${c * b})/${b * d} = ${ans}.`],
      hi: [`एक दीवार का ${a}/${b} भाग नीला और ${c}/${d} भाग पीला रंगा गया। बाकी सफ़ेद है। कितना भाग सफ़ेद है?`, `1 − ${a}/${b} − ${c}/${d} = (${b * d} − ${a * d} − ${c * b})/${b * d} = ${ans}।`] }; },
  (r) => { const fs = []; while (fs.length < 4) { const n = int(r, 1, 8), d = int(r, n + 1, 12); if (!fs.some(([a, b]) => a * d === n * b)) fs.push([n, d]); }
    const desc = [...fs].sort((x, y) => y[0] / y[1] - x[0] / x[1]); const asStr = (l) => l.map(([n, d]) => `${n}/${d}`).join(', ');
    const correct = asStr(desc); const w1 = asStr([...desc].reverse()), w2 = asStr([desc[1], desc[0], desc[2], desc[3]]), w3 = asStr([desc[0], desc[2], desc[1], desc[3]]);
    return { topic: 'Arranging fractions', difficulty: M, correct, wrong: [w1, w2, w3],
      en: [`Arrange in descending order: ${asStr(fs)}`, `As decimals: ${desc.map(([n, d]) => `${n}/${d} ≈ ${(n / d).toFixed(2)}`).join(', ')}. Greatest first: ${correct}.`],
      hi: [`घटते क्रम में लिखिए: ${asStr(fs)}`, `दशमलव में: ${desc.map(([n, d]) => `${n}/${d} ≈ ${(n / d).toFixed(2)}`).join(', ')}। सबसे बड़ी पहले: ${correct}।`] }; },
  (r) => { const w = int(r, 2, 6), n = int(r, 1, 4), d = pick(r, [5, 6, 7, 8]); if (n >= d) return null; const imp = w * d + n;
    return { topic: 'Fractions', difficulty: E, correct: `${imp}/${d}`, wrong: [`${w * n + d}/${d}`, `${w + n}/${d}`, `${imp}/${d + 1}`],
      en: [`Write ${w} ${n}/${d} as an improper fraction.`, `${w} × ${d} + ${n} = ${imp}, so ${w} ${n}/${d} = ${imp}/${d}.`],
      hi: [`${w} ${n}/${d} को विषम भिन्न के रूप में लिखिए।`, `${w} × ${d} + ${n} = ${imp}, अतः ${w} ${n}/${d} = ${imp}/${d}।`] }; },
  // Ratio and proportion
  (r) => { const a = int(r, 2, 7), b = int(r, 3, 9); if (gcd(a, b) !== 1) return null; const k = int(r, 40, 150) * 5; const total = (a + b) * k;
    const [en, hi] = pick(r, NAMES);
    return { topic: 'Ratio and proportion', difficulty: M, correct: b * k, wrong: [a * k, total / 2, b * k + k, (b - a) * k || k * 2], fmt: rs,
      en: [`${rs(total)} is divided between ${en} and a friend in the ratio ${a} : ${b}. What is the friend's share?`, `Total parts ${a + b}; one part = ${rs(total)} ÷ ${a + b} = ${rs(k)}; friend's share = ${b} × ${rs(k)} = ${rs(b * k)}.`],
      hi: [`${rs(total)} को ${hi} और उसके मित्र में ${a} : ${b} के अनुपात में बाँटा गया। मित्र का हिस्सा कितना है?`, `कुल भाग ${a + b}; एक भाग = ${rs(total)} ÷ ${a + b} = ${rs(k)}; मित्र का हिस्सा = ${b} × ${rs(k)} = ${rs(b * k)}।`] }; },
  (r) => { const a = int(r, 2, 9), b = int(r, 3, 12), c = int(r, 4, 15); const d = (b * c) / a; if (!Number.isInteger(d) || d === c) return null;
    return { topic: 'Ratio and proportion', difficulty: E, correct: d, wrong: [d + 1, a * b / c % 1 ? d + 2 : a * b / c, c, d * 2],
      en: [`If ${a} : ${b} = ${c} : x, find x.`, `In a proportion the product of the extremes equals the product of the means: ${a} × x = ${b} × ${c}, so x = ${b * c} ÷ ${a} = ${d}.`],
      hi: [`यदि ${a} : ${b} = ${c} : x हो, तो x ज्ञात कीजिए।`, `समानुपात में बाह्य पदों का गुणनफल = मध्य पदों का गुणनफल: ${a} × x = ${b} × ${c}, अतः x = ${b * c} ÷ ${a} = ${d}।`] }; },
  // Profit and loss
  (r) => { const cp = int(r, 8, 60) * 25, pct = pick(r, [10, 12, 15, 20, 25]), gain = r() < 0.6; const sp = gain ? cp * (100 + pct) / 100 : cp * (100 - pct) / 100;
    if (!Number.isInteger(sp)) return null;
    return { topic: 'Profit and loss', difficulty: E, correct: sp, wrong: [gain ? cp - cp * pct / 100 : cp + cp * pct / 100, cp, sp + pct, cp * pct / 100], fmt: rs,
      en: [`A shopkeeper buys a toy for ${rs(cp)} and sells it at a ${gain ? 'profit' : 'loss'} of ${pct}%. What is the selling price?`, `${pct}% of ${rs(cp)} = ${rs(cp * pct / 100)}. SP = ${rs(cp)} ${gain ? '+' : '−'} ${rs(cp * pct / 100)} = ${rs(sp)}.`],
      hi: [`एक दुकानदार एक खिलौना ${rs(cp)} में खरीदकर ${pct}% ${gain ? 'लाभ' : 'हानि'} पर बेचता है। विक्रय मूल्य क्या है?`, `${rs(cp)} का ${pct}% = ${rs(cp * pct / 100)}। विक्रय मूल्य = ${rs(cp)} ${gain ? '+' : '−'} ${rs(cp * pct / 100)} = ${rs(sp)}।`] }; },
  (r) => { const cp = int(r, 8, 40) * 50, pct = pick(r, [5, 10, 20, 25]); const sp = cp * (100 - pct) / 100;
    return { topic: 'Profit and loss', difficulty: H, correct: cp, wrong: [sp + sp * pct / 100, sp - cp * pct / 100 + 2 * (cp * pct / 100) + 10, cp + 50, sp], fmt: rs,
      en: [`A bicycle was sold for ${rs(sp)} at a loss of ${pct}%. What was its cost price?`, `SP is ${100 - pct}% of CP, so CP = ${rs(sp)} × 100 ÷ ${100 - pct} = ${rs(cp)}.`],
      hi: [`एक साइकिल ${pct}% हानि पर ${rs(sp)} में बेची गई। उसका क्रय मूल्य क्या था?`, `विक्रय मूल्य, क्रय मूल्य का ${100 - pct}% है, अतः क्रय मूल्य = ${rs(sp)} × 100 ÷ ${100 - pct} = ${rs(cp)}।`] }; },
  (r) => { const cp = int(r, 10, 60) * 20, extra = int(r, 1, 5) * 20, sp = cp + extra, p = (extra / cp) * 100; if (!Number.isInteger(p)) return null;
    return { topic: 'Profit and loss', difficulty: M, correct: `${p}%`, wrong: [`${(extra / sp * 100).toFixed(1).replace(/\.0$/, '')}%`, `${p + 5}%`, `${extra}%`].filter((x) => x !== `${p}%`),
      en: [`An article bought for ${rs(cp)} is sold for ${rs(sp)}. What is the profit per cent?`, `Profit = ${rs(extra)}. Profit % = ${extra} ÷ ${cp} × 100 = ${p}% (always on the cost price).`],
      hi: [`${rs(cp)} में खरीदी गई वस्तु ${rs(sp)} में बेची गई। लाभ प्रतिशत क्या है?`, `लाभ = ${rs(extra)}। लाभ % = ${extra} ÷ ${cp} × 100 = ${p}% (हमेशा क्रय मूल्य पर)।`] }; },
  // Simplification
  (r) => { const a = int(r, 120, 480), b = pick(r, [4, 6, 8, 12]), c = int(r, 3, 9), d = int(r, 10, 40); if (a % b) return null; const v = a / b * c - d;
    return { topic: 'Simplification', difficulty: M, correct: v, wrong: [a / (b * c) % 1 ? v + 10 : a / (b * c) - d, a / b * (c - d), v + d * 2, a - b * c - d],
      en: [`Simplify: ${a} ÷ ${b} × ${c} − ${d}`, `Division and multiplication from left to right: ${a} ÷ ${b} = ${a / b}; × ${c} = ${a / b * c}; then − ${d} = ${v}.`],
      hi: [`सरल कीजिए: ${a} ÷ ${b} × ${c} − ${d}`, `भाग और गुणा बाएँ से दाएँ: ${a} ÷ ${b} = ${a / b}; × ${c} = ${a / b * c}; फिर − ${d} = ${v}।`] }; },
  (r) => { const x = int(r, 11, 25), y = int(r, 5, 15), z = int(r, 2, 9); const sq = x * x, s2 = y * y, v = x + y - z;
    return { topic: 'Simplification', difficulty: E, correct: v, wrong: [x + y + z, x - y + z, v + 2, x * y - z],
      en: [`Simplify: √${sq} + √${s2} − ${z}`, `√${sq} = ${x} and √${s2} = ${y}; ${x} + ${y} − ${z} = ${v}.`],
      hi: [`सरल कीजिए: √${sq} + √${s2} − ${z}`, `√${sq} = ${x} और √${s2} = ${y}; ${x} + ${y} − ${z} = ${v}।`] }; },
  // Average
  (r) => { const n = int(r, 4, 6), avg = int(r, 25, 60); const nums = Array.from({ length: n - 1 }, () => int(r, avg - 15, avg + 15)); const last = avg * n - nums.reduce((a, b) => a + b, 0); if (last <= 0) return null;
    return { topic: 'Average', difficulty: M, correct: last, wrong: [avg, last + n, last - 2, avg * n],
      en: [`The average of ${n} numbers is ${avg}. ${n - 1} of them are ${nums.join(', ')}. Find the remaining number.`, `Total = ${n} × ${avg} = ${n * avg}. Sum of the others = ${nums.reduce((a, b) => a + b, 0)}. Last = ${last}.`],
      hi: [`${n} संख्याओं का औसत ${avg} है। उनमें से ${n - 1} संख्याएँ ${nums.join(', ')} हैं। अंतिम संख्या ज्ञात कीजिए।`, `कुल योग = ${n} × ${avg} = ${n * avg}। बाकी का योग = ${nums.reduce((a, b) => a + b, 0)}। अंतिम = ${last}।`] }; },
  (r) => { const n = int(r, 20, 40), a1 = int(r, 10, 14), t = int(r, 25, 45); const newAvg = a1 + 1; const teacher = newAvg * (n + 1) - a1 * n;
    return { topic: 'Average', difficulty: H, correct: teacher, wrong: [teacher - n, teacher + 1, a1 + n, teacher - 10], fmt: (x) => `${x} years`, hiFmt: (x) => `${x} वर्ष`, _t: t,
      en: [`The average age of ${n} students is ${a1} years. When the teacher's age is included, the average rises by 1 year. How old is the teacher?`, `New total = ${n + 1} × ${newAvg} = ${newAvg * (n + 1)}; old total = ${n} × ${a1} = ${a1 * n}. Teacher = ${teacher} years.`],
      hi: [`${n} विद्यार्थियों की औसत आयु ${a1} वर्ष है। शिक्षक की आयु जोड़ने पर औसत 1 वर्ष बढ़ जाता है। शिक्षक की आयु कितनी है?`, `नया योग = ${n + 1} × ${newAvg} = ${newAvg * (n + 1)}; पुराना योग = ${n} × ${a1} = ${a1 * n}। शिक्षक = ${teacher} वर्ष।`] }; },
  // Percentage
  (r) => { const total = int(r, 12, 60) * 50, pct = pick(r, [12, 15, 24, 35, 45, 64, 75]); const v = total * pct / 100;
    return { topic: 'Percentage', difficulty: E, correct: v, wrong: [total - v, v + pct, total / pct % 1 ? v * 2 : total / pct, v / 2], fmt: inr,
      en: [`A school has ${inr(total)} students, and ${pct}% of them come by bus. How many come by bus?`, `${pct}% of ${inr(total)} = ${inr(total)} × ${pct} ÷ 100 = ${inr(v)}.`],
      hi: [`एक स्कूल में ${inr(total)} विद्यार्थी हैं, जिनमें से ${pct}% बस से आते हैं। कितने विद्यार्थी बस से आते हैं?`, `${inr(total)} का ${pct}% = ${inr(total)} × ${pct} ÷ 100 = ${inr(v)}।`] }; },
  (r) => { const earn = int(r, 20, 80) * 500, savePct = pick(r, [10, 15, 20, 25, 30]); const spend = earn * (100 - savePct) / 100;
    return { topic: 'Percentage', difficulty: M, correct: `${savePct}%`, wrong: [`${100 - savePct}%`, `${savePct + 5}%`, `${savePct / 2}%`],
      en: [`A family earns ${rs(earn)} a month and spends ${rs(spend)}. What percentage of the income is saved?`, `Saved = ${rs(earn - spend)}. ${earn - spend} ÷ ${earn} × 100 = ${savePct}%.`],
      hi: [`एक परिवार महीने में ${rs(earn)} कमाता है और ${rs(spend)} ख़र्च करता है। आय का कितना प्रतिशत बचता है?`, `बचत = ${rs(earn - spend)}। ${earn - spend} ÷ ${earn} × 100 = ${savePct}%।`] }; },
  // Simple interest
  (r) => { const p = int(r, 4, 40) * 500, rate = pick(r, [4, 5, 6, 8, 10, 12]), t = int(r, 2, 5); const si = p * rate * t / 100;
    return { topic: 'Simple interest', difficulty: E, correct: si, wrong: [p * rate / 100, si + p * rate / 100, p + si, si / 2], fmt: rs,
      en: [`Find the simple interest on ${rs(p)} at ${rate}% per year for ${t} years.`, `SI = P × R × T ÷ 100 = ${inr(p)} × ${rate} × ${t} ÷ 100 = ${rs(si)}.`],
      hi: [`${rs(p)} पर ${rate}% वार्षिक दर से ${t} वर्ष का साधारण ब्याज ज्ञात कीजिए।`, `साधारण ब्याज = मूलधन × दर × समय ÷ 100 = ${inr(p)} × ${rate} × ${t} ÷ 100 = ${rs(si)}।`] }; },
  (r) => { const rate = pick(r, [4, 5, 8, 10, 12.5, 20]), t = 100 / rate;
    return { topic: 'Simple interest', difficulty: M, correct: t, wrong: [t + 2, t / 2, rate, t * 2].filter((x) => x !== t), fmt: (x) => `${x} years`, hiFmt: (x) => `${x} वर्ष`,
      en: [`In how many years will a sum double itself at ${rate}% simple interest per year?`, `Doubling means the interest equals the principal: 100% ÷ ${rate}% per year = ${t} years.`],
      hi: [`कोई धनराशि ${rate}% वार्षिक साधारण ब्याज पर कितने वर्षों में दुगुनी हो जाएगी?`, `दुगुनी होने का अर्थ है ब्याज = मूलधन: 100% ÷ ${rate}% प्रति वर्ष = ${t} वर्ष।`] }; },
  // Area and perimeter
  (r) => { const ratio = pick(r, [[3, 2], [5, 3], [4, 3], [7, 4]]), k = int(r, 3, 12), l = ratio[0] * k, b = ratio[1] * k, p = 2 * (l + b);
    return { topic: 'Area and perimeter', difficulty: M, correct: l * b, wrong: [p, l * b + k, (l + b) * k, 2 * l * b], fmt: (x) => `${inr(x)} sq m`, hiFmt: (x) => `${inr(x)} वर्ग मी`,
      en: [`The perimeter of a rectangular field is ${p} m and its length and breadth are in the ratio ${ratio[0]} : ${ratio[1]}. Find its area.`, `l + b = ${p} ÷ 2 = ${l + b}; one part = ${(l + b)} ÷ ${ratio[0] + ratio[1]} = ${k}; l = ${l}, b = ${b}; area = ${inr(l * b)} sq m.`],
      hi: [`एक आयताकार खेत का परिमाप ${p} मी है और उसकी लंबाई और चौड़ाई ${ratio[0]} : ${ratio[1]} के अनुपात में हैं। क्षेत्रफल ज्ञात कीजिए।`, `ल + चौ = ${p} ÷ 2 = ${l + b}; एक भाग = ${l + b} ÷ ${ratio[0] + ratio[1]} = ${k}; ल = ${l}, चौ = ${b}; क्षेत्रफल = ${inr(l * b)} वर्ग मी।`] }; },
  (r) => { const L = int(r, 6, 12), B = int(r, 4, L - 1), s = pick(r, [20, 25, 50]); const n = (L * 100 / s) * (B * 100 / s);
    return { topic: 'Area and perimeter', difficulty: M, correct: n, wrong: [n / 2, n * 4, L * B * s, n + 100], fmt: inr,
      en: [`How many square tiles of side ${s} cm are needed to cover a floor ${L} m long and ${B} m wide?`, `Tiles along the length: ${L * 100} ÷ ${s} = ${L * 100 / s}; along the breadth: ${B * 100} ÷ ${s} = ${B * 100 / s}; total ${inr(n)}.`],
      hi: [`${L} मी लंबे और ${B} मी चौड़े फ़र्श को ढकने के लिए ${s} सेमी भुजा वाली कितनी वर्गाकार टाइलें चाहिए?`, `लंबाई में: ${L * 100} ÷ ${s} = ${L * 100 / s}; चौड़ाई में: ${B * 100} ÷ ${s} = ${B * 100 / s}; कुल ${inr(n)}।`] }; },
  (r) => { const s = int(r, 15, 60), rounds = int(r, 2, 3), rate = pick(r, [2, 3, 5]), cost = 4 * s * rounds * rate;
    return { topic: 'Area and perimeter', difficulty: M, correct: cost, wrong: [4 * s * rate, s * s * rate, cost * 2, 2 * s * rounds * rate], fmt: rs,
      en: [`A square garden of side ${s} m is fenced with ${rounds} rounds of wire costing ${rs(rate)} per metre. What is the cost?`, `One round = 4 × ${s} = ${4 * s} m; ${rounds} rounds = ${4 * s * rounds} m; cost = ${4 * s * rounds} × ${rate} = ${rs(cost)}.`],
      hi: [`${s} मी भुजा वाले एक वर्गाकार बगीचे के चारों ओर तार के ${rounds} चक्कर लगाने हैं, तार ${rs(rate)} प्रति मीटर है। ख़र्च कितना होगा?`, `एक चक्कर = 4 × ${s} = ${4 * s} मी; ${rounds} चक्कर = ${4 * s * rounds} मी; ख़र्च = ${4 * s * rounds} × ${rate} = ${rs(cost)}।`] }; },
  // Lines and angles
  (r) => { const a = int(r, 10, 80); const comp = r() < 0.5; const v = comp ? 90 - a : 180 - a;
    return { topic: 'Lines and angles', difficulty: E, correct: v, wrong: [comp ? 180 - a : 90 - a, 360 - a, v + 10, a], fmt: (x) => `${x}°`,
      en: [`What is the ${comp ? 'complement' : 'supplement'} of ${a}°?`, `${comp ? 'Complementary angles add up to 90°' : 'Supplementary angles add up to 180°'}: ${comp ? 90 : 180}° − ${a}° = ${v}°.`],
      hi: [`${a}° का ${comp ? 'पूरक' : 'संपूरक'} कोण क्या है?`, `${comp ? 'पूरक कोणों का योग 90°' : 'संपूरक कोणों का योग 180°'} होता है: ${comp ? 90 : 180}° − ${a}° = ${v}°।`] }; },
  (r) => { const x = int(r, 25, 75), y = int(r, 30, 100); if (x + y >= 175) return null; const z = 180 - x - y;
    return { topic: 'Lines and angles', difficulty: M, correct: z, wrong: [x + y, 180 - x, 90 - (x % 90), z + 5], fmt: (v) => `${v}°`,
      en: [`Three angles lie on a straight line at a point. Two of them are ${x}° and ${y}°. What is the third?`, `Angles on a straight line add up to 180°: 180° − ${x}° − ${y}° = ${z}°.`],
      hi: [`एक बिंदु पर एक सरल रेखा पर तीन कोण बने हैं। दो कोण ${x}° और ${y}° हैं। तीसरा कोण कितना है?`, `सरल रेखा पर कोणों का योग 180° होता है: 180° − ${x}° − ${y}° = ${z}°।`] }; },
  (r) => { const k = int(r, 2, 4); const parts = [1, k, k + 1]; const sum = parts.reduce((a, b) => a + b, 0); if (180 % sum) return null; const u = 180 / sum; const ans = parts.map((p) => p * u).join('°, ') + '°';
    return { topic: 'Plane figures', difficulty: M, correct: ans, wrong: [parts.map((p) => p * u + 5).join('°, ') + '°', '60°, 60°, 60°', parts.map((p) => p * (u - 5)).join('°, ') + '°'],
      en: [`The angles of a triangle are in the ratio 1 : ${k} : ${k + 1}. Find them.`, `The angles add up to 180°; 1 + ${k} + ${k + 1} = ${sum} parts, one part = ${u}°, so ${ans}.`],
      hi: [`एक त्रिभुज के कोण 1 : ${k} : ${k + 1} के अनुपात में हैं। कोण ज्ञात कीजिए।`, `कोणों का योग 180° है; 1 + ${k} + ${k + 1} = ${sum} भाग, एक भाग = ${u}°, अतः ${ans}।`] }; },
  (r) => { const h = int(r, 1, 11), m = pick(r, [0, 30]); const hand = (h % 12) * 30 + m * 0.5, minute = m * 6; let a = Math.abs(hand - minute); if (a > 180) a = 360 - a; if (!Number.isInteger(a)) return null;
    const type = a < 90 ? 'acute' : a === 90 ? 'a right angle' : a < 180 ? 'obtuse' : 'a straight angle'; const typeHi = a < 90 ? 'न्यून' : a === 90 ? 'समकोण' : a < 180 ? 'अधिक' : 'ऋजु';
    return { topic: 'Lines and angles', difficulty: H, correct: a, wrong: [a + 15, Math.abs(a - 30) || 45, 360 - a, a + 30].filter((x) => x !== a), fmt: (x) => `${x}°`,
      en: [`What is the smaller angle between the hands of a clock at ${h}:${String(m).padStart(2, '0')}?`, `Hour hand: ${h} × 30° + ${m} × ½° = ${hand}°; minute hand: ${m} × 6° = ${minute}°. Difference ${a}° (${type}).`],
      hi: [`${h}:${String(m).padStart(2, '0')} बजे घड़ी की सुइयों के बीच छोटा कोण कितना है?`, `घंटे की सुई: ${h} × 30° + ${m} × ½° = ${hand}°; मिनट की सुई: ${m} × 6° = ${minute}°। अंतर ${a}° (${typeHi} कोण)।`] }; },
  // Circle
  (r) => { const rad = pick(r, [7, 14, 21, 28, 35]); const c = 2 * 22 * rad / 7;
    return { topic: 'Circle', difficulty: M, correct: c, wrong: [22 * rad * rad / 7, c / 2, 2 * rad, c + 22], fmt: (x) => `${inr(x)} cm`, hiFmt: (x) => `${inr(x)} सेमी`,
      en: [`Find the circumference of a circle of radius ${rad} cm. (Take π = 22/7.)`, `C = 2πr = 2 × 22/7 × ${rad} = ${inr(c)} cm.`],
      hi: [`${rad} सेमी त्रिज्या वाले वृत्त की परिधि ज्ञात कीजिए। (π = 22/7 लीजिए।)`, `परिधि = 2πr = 2 × 22/7 × ${rad} = ${inr(c)} सेमी।`] }; },
  (r) => { const d = int(r, 4, 30) * 2; const rr = d / 2;
    return { topic: 'Circle', difficulty: E, correct: rr, wrong: [d * 2, d, rr + 2], fmt: (x) => `${x} cm`, hiFmt: (x) => `${x} सेमी`,
      en: [`The diameter of a circle is ${d} cm. What is its radius?`, `The radius is half the diameter: ${d} ÷ 2 = ${rr} cm.`],
      hi: [`एक वृत्त का व्यास ${d} सेमी है। उसकी त्रिज्या कितनी है?`, `त्रिज्या व्यास की आधी होती है: ${d} ÷ 2 = ${rr} सेमी।`] }; },
  // Conversion of units
  (r) => { const kg = int(r, 2, 9), g = pick(r, [5, 50, 75, 250, 500, 705]); const v = kg + g / 1000;
    return { topic: 'Conversion of units', difficulty: E, correct: v.toFixed(3), wrong: [(kg + g / 100).toFixed(3), (kg + g / 10000).toFixed(4), `${kg}.${g}`].filter((x) => x !== v.toFixed(3)), fmt: (x) => `${x} kg`, hiFmt: (x) => `${x} किग्रा`,
      en: [`Write ${kg} kg ${g} g in kilograms.`, `1 kg = 1000 g, so ${g} g = ${g / 1000} kg; ${kg} kg ${g} g = ${v.toFixed(3)} kg.`],
      hi: [`${kg} किग्रा ${g} ग्राम को किलोग्राम में लिखिए।`, `1 किग्रा = 1000 ग्राम, अतः ${g} ग्राम = ${g / 1000} किग्रा; ${kg} किग्रा ${g} ग्राम = ${v.toFixed(3)} किग्रा।`] }; },
  (r) => { const kmh = pick(r, [18, 36, 54, 72, 90, 108]); const ms = kmh * 5 / 18;
    return { topic: 'Conversion of units', difficulty: M, correct: ms, wrong: [kmh * 18 / 5, ms + 5, kmh / 6].filter((x) => x !== ms), fmt: (x) => `${x} m/s`, hiFmt: (x) => `${x} मी/से`,
      en: [`Convert ${kmh} km/h into metres per second.`, `1 km/h = 1000 m ÷ 3600 s = 5/18 m/s, so ${kmh} × 5/18 = ${ms} m/s.`],
      hi: [`${kmh} किमी/घंटा को मीटर प्रति सेकंड में बदलिए।`, `1 किमी/घंटा = 1000 मी ÷ 3600 से = 5/18 मी/से, अतः ${kmh} × 5/18 = ${ms} मी/से।`] }; },
  // Roman numerals
  (r) => { const a = int(r, 14, 99), b = int(r, 11, 99); const s = a + b; if (s > 199) return null;
    return { topic: 'Roman numerals', difficulty: M, correct: roman(s), wrong: [roman(s + 10), roman(s - 1), roman(s + 1)],
      en: [`What is ${roman(a)} + ${roman(b)} in Roman numerals?`, `${roman(a)} = ${a} and ${roman(b)} = ${b}; ${a} + ${b} = ${s} = ${roman(s)}.`],
      hi: [`रोमन संख्याओं में ${roman(a)} + ${roman(b)} क्या है?`, `${roman(a)} = ${a} और ${roman(b)} = ${b}; ${a} + ${b} = ${s} = ${roman(s)}।`] }; },
  (r) => { const n = int(r, 140, 990); const rn = roman(n);
    return { topic: 'Roman numerals', difficulty: E, correct: n, wrong: [n + 10, n - 100 > 0 ? n - 100 : n + 100, n + 1], fmt: inr,
      en: [`Write the Roman numeral ${rn} as an ordinary number.`, `Read it in groups from the left: ${rn} = ${n}.`],
      hi: [`रोमन संख्या ${rn} को साधारण संख्या में लिखिए।`, `बाएँ से समूहों में पढ़िए: ${rn} = ${n}।`] }; },
  // Volume of cube and cuboid
  (r) => { const big = pick(r, [6, 8, 9, 10, 12]), small = pick(r, [2, 3, 4]); if (big % small) return null; const n = (big / small) ** 3;
    return { topic: 'Volume of cube and cuboid', difficulty: H, correct: n, wrong: [big / small, (big / small) ** 2, n * 2, big * small],
      en: [`A cube of side ${big} cm is cut into small cubes of side ${small} cm. How many small cubes are made?`, `Volume ratio: (${big} ÷ ${small})³ = ${big / small}³ = ${n}.`],
      hi: [`${big} सेमी भुजा वाले घन को ${small} सेमी भुजा वाले छोटे घनों में काटा गया। कितने छोटे घन बने?`, `आयतन का अनुपात: (${big} ÷ ${small})³ = ${big / small}³ = ${n}।`] }; },
  (r) => { const l = int(r, 5, 15), b = int(r, 3, 10), h = int(r, 2, 8), v = l * b * h;
    return { topic: 'Volume of cube and cuboid', difficulty: E, correct: v, wrong: [2 * (l * b + b * h + h * l), l + b + h, v + l * b, l * b], fmt: (x) => `${inr(x)} cubic cm`, hiFmt: (x) => `${inr(x)} घन सेमी`,
      en: [`Find the volume of a cuboid ${l} cm long, ${b} cm wide and ${h} cm high.`, `Volume = l × b × h = ${l} × ${b} × ${h} = ${inr(v)} cubic cm.`],
      hi: [`${l} सेमी लंबे, ${b} सेमी चौड़े और ${h} सेमी ऊँचे घनाभ का आयतन ज्ञात कीजिए।`, `आयतन = ल × चौ × ऊ = ${l} × ${b} × ${h} = ${inr(v)} घन सेमी।`] }; },
  // Prime and composite numbers
  (r) => { const lo = pick(r, [10, 20, 30, 40, 50, 60, 70]), hi = lo + 20; const ps = []; for (let n = lo + 1; n < hi; n++) if (isPrime(n)) ps.push(n);
    return { topic: 'Prime and composite numbers', difficulty: M, correct: ps.length, wrong: [ps.length + 1, ps.length - 1 || ps.length + 2, ps.length + 3],
      en: [`How many prime numbers are there between ${lo} and ${hi}?`, `They are ${ps.join(', ')}: ${ps.length} in all.`],
      hi: [`${lo} और ${hi} के बीच कितनी अभाज्य संख्याएँ हैं?`, `वे हैं ${ps.join(', ')}: कुल ${ps.length}।`] }; },
  (r) => { const n = pick(r, [180, 252, 300, 360, 420, 450, 504, 540, 600, 756]); const f = pf(n); const ans = f.join(' × ');
    return { topic: 'Prime and composite numbers', difficulty: M, correct: ans, wrong: [[...f.slice(0, -2), f[f.length - 2] * f[f.length - 1]].join(' × '), [...f, 1].join(' × '), `${f[0]} × ${n / f[0]}`],
      en: [`Which is the prime factorisation of ${n}?`, `Divide by primes repeatedly: ${n} = ${ans}; every factor is prime.`],
      hi: [`${n} का अभाज्य गुणनखंडन कौन-सा है?`, `बार-बार अभाज्य संख्याओं से भाग दीजिए: ${n} = ${ans}; हर गुणनखंड अभाज्य है।`] }; },
  // Decimals
  (r) => { const a = int(r, 100, 900) / 100, b = int(r, 100, 900) / 100, c = int(r, 10, 99) / 100; const v = +(a + b - c).toFixed(2);
    return { topic: 'Decimals', difficulty: E, correct: v.toFixed(2), wrong: [(a + b + c).toFixed(2), (v + 0.1).toFixed(2), (v - 1).toFixed(2)],
      en: [`${a.toFixed(2)} + ${b.toFixed(2)} − ${c.toFixed(2)} = ?`, `Line up the decimal points: ${a.toFixed(2)} + ${b.toFixed(2)} = ${(a + b).toFixed(2)}; − ${c.toFixed(2)} = ${v.toFixed(2)}.`],
      hi: [`${a.toFixed(2)} + ${b.toFixed(2)} − ${c.toFixed(2)} = ?`, `दशमलव बिंदु एक सीध में रखिए: ${a.toFixed(2)} + ${b.toFixed(2)} = ${(a + b).toFixed(2)}; − ${c.toFixed(2)} = ${v.toFixed(2)}।`] }; },
  (r) => { const q = int(r, 1001, 9999) / 1000, d = pick(r, [3, 4, 5, 6, 8, 12, 15]); const n = +(q * d).toFixed(3);
    return { topic: 'Decimals', difficulty: M, correct: q.toFixed(3), wrong: [(q * 10).toFixed(2), (q / 10).toFixed(4), (q + 0.01).toFixed(3)],
      en: [`${n} ÷ ${d} = ?`, `${n} ÷ ${d} = ${q.toFixed(3)}. Check: ${q.toFixed(3)} × ${d} = ${n}.`],
      hi: [`${n} ÷ ${d} = ?`, `${n} ÷ ${d} = ${q.toFixed(3)}। जाँच: ${q.toFixed(3)} × ${d} = ${n}।`] }; },
  // Speed and time
  (r) => { const len = int(r, 8, 30) * 10, plat = int(r, 5, 25) * 10, kmh = pick(r, [36, 54, 72, 90]); const ms = kmh * 5 / 18, t = (len + plat) / ms; if (!Number.isInteger(t)) return null;
    return { topic: 'Speed and time', difficulty: H, correct: t, wrong: [len / ms % 1 ? t + 4 : len / ms, t + 5, (len + plat) / kmh % 1 ? t * 2 : (len + plat) / kmh].filter((x) => x !== t), fmt: (x) => `${x} seconds`, hiFmt: (x) => `${x} सेकंड`,
      en: [`A train ${len} m long runs at ${kmh} km/h. How long does it take to cross a platform ${plat} m long?`, `It must cover ${len} + ${plat} = ${len + plat} m at ${kmh} × 5/18 = ${ms} m/s: ${len + plat} ÷ ${ms} = ${t} s.`],
      hi: [`${len} मी लंबी रेलगाड़ी ${kmh} किमी/घंटा से चलती है। ${plat} मी लंबे प्लेटफ़ॉर्म को पार करने में कितना समय लेगी?`, `उसे ${len} + ${plat} = ${len + plat} मी तय करना है, ${kmh} × 5/18 = ${ms} मी/से की गति से: ${len + plat} ÷ ${ms} = ${t} सेकंड।`] }; },
  (r) => { const s1 = int(r, 3, 8), t = int(r, 2, 6), s2 = s1 + int(r, 2, 6), d = s1 * t, t2 = d / s2; if (!Number.isInteger(t2 * 10)) return null; const d2 = s2 * t;
    return { topic: 'Speed and time', difficulty: M, correct: d2, wrong: [d, d2 + s1, s2 + t, d * 2], fmt: (x) => `${x} km`, hiFmt: (x) => `${x} किमी`,
      en: [`A girl walks ${d} km at ${s1} km/h. How far would she go in the same time at ${s2} km/h?`, `Time = ${d} ÷ ${s1} = ${t} h; at ${s2} km/h she covers ${s2} × ${t} = ${d2} km.`],
      hi: [`एक लड़की ${s1} किमी/घंटा की चाल से ${d} किमी चलती है। उतने ही समय में ${s2} किमी/घंटा से वह कितनी दूरी तय करेगी?`, `समय = ${d} ÷ ${s1} = ${t} घंटे; ${s2} किमी/घंटा से ${s2} × ${t} = ${d2} किमी।`] }; },
  // Temperature
  (r) => { const c = pick(r, [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 100]); const f = c * 9 / 5 + 32;
    return { topic: 'Temperature', difficulty: M, correct: f, wrong: [c + 32, c * 9 / 5, f + 10, (c - 32) * 5 / 9 > 0 ? Math.round((c - 32) * 5 / 9) : f - 18].filter((x) => x !== f), fmt: (x) => `${x}°F`,
      en: [`Convert ${c}°C into Fahrenheit.`, `F = C × 9/5 + 32 = ${c} × 9/5 + 32 = ${c * 9 / 5} + 32 = ${f}°F.`],
      hi: [`${c}°C को फ़ारेनहाइट में बदलिए।`, `F = C × 9/5 + 32 = ${c} × 9/5 + 32 = ${c * 9 / 5} + 32 = ${f}°F।`] }; },
];

function build(r, g, id) {
  const spec = g(r);
  if (!spec) return null;
  const fmt = spec.fmt ?? String;
  try {
    return mcq(r, { id, section: 'Mathematics', topic: spec.topic, difficulty: spec.difficulty, prompt: spec.en[0], correct: spec.correct, wrong: spec.wrong,
      explanation: spec.en[1], fmt, hi: { prompt: spec.hi[0], explanation: spec.hi[1], fmt: spec.hiFmt ?? fmt } });
  } catch {
    return null;
  }
}

/** `count` questions walking the generators in order from a set-specific start, each new to the bank. */
export function mathsSet(r, setNo, seen, count, prefix = 'm') {
  const out = [];
  let g = (setNo * 11) % G.length;
  for (let i = 1; i <= count; i++) {
    let q = null;
    // A topic with few possible variants can run out of new questions; then the next topic is used instead.
    for (let skip = 0; !q && skip < G.length; skip++) {
      const gen = G[g % G.length];
      g += 1;
      try {
        q = unique(seen, () => { let x = null; for (let t = 0; !x && t < 50; t++) x = build(r, gen, `${prefix}${i}`); if (!x) throw new Error('no question'); return x; });
      } catch {
        q = null;
      }
    }
    if (!q) throw new Error('maths: every generator is exhausted');
    out.push(q);
  }
  return out;
}
