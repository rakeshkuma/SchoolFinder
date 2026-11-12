// AISSEE Class VI Intelligence: original reasoning questions generated from rules over the existing AISSEE syllabus
// on SchoolDhundo (analogies, patterns, classification, visual & logical reasoning, series, critical thinking and
// problem solving, familial relations). Figure questions reuse the JNVST figure generators. English and Hindi together.
import { int, mcq, pick, unique } from '../netarhat/core.mjs';
import { mirrorQuestion, patternQuestion, seriesQuestion } from '../jnvst/mat.mjs';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const L = (i) => A[((i % 26) + 26) % 26];
const shift = (w, k) => [...w].map((c) => L(A.indexOf(c) + k)).join('');
const E = 'EASY', M = 'MEDIUM', H = 'HARD';
const isPrime = (n) => n > 1 && [...Array(Math.floor(Math.sqrt(n)) + 1).keys()].slice(2).every((d) => n % d);

const G = [
  // Series and sequences
  (r) => { const a = int(r, 2, 9), d = int(r, 3, 9), dd = int(r, 1, 3); const s = [a]; let step = d; for (let i = 0; i < 5; i++) { s.push(s[i] + step); step += dd; }
    return { topic: 'Series and sequences', difficulty: M, correct: s[5], wrong: [s[5] + dd, s[5] - dd, s[4] + d], en: [`What comes next? ${s.slice(0, 5).join(', ')}, ?`, `The gaps grow by ${dd}: ${s.slice(1, 6).map((x, i) => x - s[i]).join(', ')}. Next = ${s[4]} + ${s[5] - s[4]} = ${s[5]}.`],
      hi: [`आगे क्या आएगा? ${s.slice(0, 5).join(', ')}, ?`, `अंतर हर बार ${dd} बढ़ता है: ${s.slice(1, 6).map((x, i) => x - s[i]).join(', ')}। अगला = ${s[4]} + ${s[5] - s[4]} = ${s[5]}।`] }; },
  (r) => { const k = pick(r, [2, 3]), a = int(r, 1, 5); const s = [a]; for (let i = 0; i < 5; i++) s.push(s[i] * k + 1);
    return { topic: 'Series and sequences', difficulty: H, correct: s[5], wrong: [s[5] - 1, s[4] * k, s[5] + k], en: [`Find the next number: ${s.slice(0, 5).join(', ')}, ?`, `Each number is ×${k} then +1: ${s[4]} × ${k} + 1 = ${s[5]}.`],
      hi: [`अगली संख्या ज्ञात कीजिए: ${s.slice(0, 5).join(', ')}, ?`, `हर संख्या को ${k} से गुणा करके 1 जोड़ा जाता है: ${s[4]} × ${k} + 1 = ${s[5]}।`] }; },
  (r) => { const st = int(r, 1, 6); const s = [0, 1, 2, 3, 4, 5].map((i) => (st + i) ** 2);
    return { topic: 'Series and sequences', difficulty: E, correct: s[5], wrong: [s[5] + 1, s[4] + 10, s[5] - 2], en: [`What comes next? ${s.slice(0, 5).join(', ')}, ?`, `These are squares: ${st}², ${st + 1}², … so next is ${st + 5}² = ${s[5]}.`],
      hi: [`आगे क्या आएगा? ${s.slice(0, 5).join(', ')}, ?`, `ये वर्ग संख्याएँ हैं: ${st}², ${st + 1}², … इसलिए अगली ${st + 5}² = ${s[5]}।`] }; },
  (r) => { const a = int(r, 0, 8), g1 = int(r, 2, 5), g2 = int(r, 3, 7); const s = [a]; for (let i = 0; i < 6; i++) s.push(s[i] + (i % 2 ? g2 : g1));
    return { topic: 'Series and sequences', difficulty: M, correct: s[6], wrong: [s[6] + 1, s[5] + g2, s[6] - 1].filter((x) => x !== s[6]), en: [`Complete the series: ${s.slice(0, 6).join(', ')}, ?`, `Add ${g1} and ${g2} in turn: ${s[5]} + ${s[6] - s[5]} = ${s[6]}.`],
      hi: [`श्रेणी पूरी कीजिए: ${s.slice(0, 6).join(', ')}, ?`, `बारी-बारी से ${g1} और ${g2} जोड़ें: ${s[5]} + ${s[6] - s[5]} = ${s[6]}।`] }; },
  (r) => { const st = int(r, 0, 14), k = pick(r, [2, 3, 4]); const s = [0, 1, 2, 3, 4].map((i) => L(st + i * k)); const ans = L(st + 5 * k);
    return { topic: 'Series and sequences', difficulty: E, correct: ans, wrong: [L(st + 5 * k + 1), L(st + 5 * k - 1), L(st + 4 * k + 1)], en: [`Which letter comes next? ${s.join(', ')}, ?`, `Each letter is ${k} places after the one before: ${s[4]} + ${k} = ${ans}.`],
      hi: [`आगे कौन-सा अक्षर आएगा? ${s.join(', ')}, ?`, `हर अक्षर पिछले से ${k} स्थान आगे है: ${s[4]} + ${k} = ${ans}।`] }; },
  (r) => { const st = int(r, 0, 10), g = int(r, 1, 3); const t = [0, 1, 2, 3].map((i) => L(st + i * 3 * g) + L(st + i * 3 * g + g)); const ans = L(st + 12 * g) + L(st + 12 * g + g);
    return { topic: 'Series and sequences', difficulty: H, correct: ans, wrong: [L(st + 12 * g + 1) + L(st + 12 * g + g + 1), L(st + 12 * g) + L(st + 12 * g + g + 1), L(st + 11 * g) + L(st + 11 * g + g)].filter((x) => x !== ans),
      en: [`Find the next term: ${t.join(', ')}, ?`, `Each term starts ${3 * g} letters after the previous one, and its second letter is ${g} after its first: ${ans}.`],
      hi: [`अगला पद ज्ञात कीजिए: ${t.join(', ')}, ?`, `हर पद पिछले से ${3 * g} अक्षर आगे शुरू होता है और उसका दूसरा अक्षर पहले से ${g} आगे है: ${ans}।`] }; },
  // Analogies (mathematical and verbal)
  (r) => { const f = pick(r, [['sq', (x) => x * x, 'its square', 'उसका वर्ग'], ['cube', (x) => x ** 3, 'its cube', 'उसका घन'], ['sq1', (x) => x * x + 1, 'its square plus 1', 'उसका वर्ग जोड़ 1']]);
    const a = int(r, 3, 9), b = int(r, 4, 12); if (a === b) return null; const v = f[1](b);
    return { topic: 'Analogies', difficulty: M, correct: v, wrong: [v + 1, v - b, f[1](b + 1), b * 3].filter((x) => x !== v), en: [`${a} : ${f[1](a)} :: ${b} : ?`, `The second number is ${f[2]} of the first: ${b} → ${v}.`],
      hi: [`${a} : ${f[1](a)} :: ${b} : ?`, `दूसरी संख्या पहली संख्या का ${f[3]} है: ${b} → ${v}।`] }; },
  (r) => { const k = int(r, 1, 4); const w1 = pick(r, ['CAT', 'SUN', 'PEN', 'MAP', 'BOX', 'HEN']), w2 = pick(r, ['DOG', 'CUP', 'BAG', 'TOP', 'NET', 'JAR']); const ans = shift(w2, k);
    return { topic: 'Analogies', difficulty: M, correct: ans, wrong: [shift(w2, k + 1), shift(w2, -k), shift(w2, k - 1 || k + 2)].filter((x) => x !== ans), en: [`${w1} : ${shift(w1, k)} :: ${w2} : ?`, `Every letter moves ${k} place${k > 1 ? 's' : ''} forward: ${w2} → ${ans}.`],
      hi: [`${w1} : ${shift(w1, k)} :: ${w2} : ?`, `हर अक्षर ${k} स्थान आगे बढ़ता है: ${w2} → ${ans}।`] }; },
  (r) => { const P = [['Bird', 'Nest', 'Bee', 'Hive', 'पक्षी', 'घोंसला', 'मधुमक्खी', 'छत्ता', ['Burrow', 'Den', 'Stable'], ['बिल', 'माँद', 'अस्तबल']], ['Doctor', 'Hospital', 'Teacher', 'School', 'डॉक्टर', 'अस्पताल', 'शिक्षक', 'विद्यालय', ['Court', 'Office', 'Farm'], ['न्यायालय', 'दफ़्तर', 'खेत']],
      ['Pen', 'Write', 'Knife', 'Cut', 'कलम', 'लिखना', 'चाकू', 'काटना', ['Cook', 'Draw', 'Sew'], ['पकाना', 'चित्र बनाना', 'सिलना']], ['Eye', 'See', 'Ear', 'Hear', 'आँख', 'देखना', 'कान', 'सुनना', ['Smell', 'Taste', 'Touch'], ['सूँघना', 'चखना', 'छूना']],
      ['Cow', 'Calf', 'Dog', 'Puppy', 'गाय', 'बछड़ा', 'कुत्ता', 'पिल्ला', ['Kitten', 'Cub', 'Foal'], ['बिल्ली का बच्चा', 'शावक', 'बछेड़ा']], ['Water', 'Thirst', 'Food', 'Hunger', 'पानी', 'प्यास', 'भोजन', 'भूख', ['Sleep', 'Taste', 'Plate'], ['नींद', 'स्वाद', 'थाली']],
      ['Carpenter', 'Wood', 'Tailor', 'Cloth', 'बढ़ई', 'लकड़ी', 'दर्ज़ी', 'कपड़ा', ['Needle', 'Iron', 'Scissors'], ['सुई', 'इस्त्री', 'कैंची']], ['Day', 'Sun', 'Night', 'Moon', 'दिन', 'सूरज', 'रात', 'चाँद', ['Rain', 'Dark', 'Sky'], ['बारिश', 'अँधेरा', 'आकाश']]];
    const p = pick(r, P); const opts = [p[3], ...p[8]], hiOpts = [p[7], ...p[9]];
    return { topic: 'Analogies', difficulty: E, correct: p[3], wrong: p[8], hiFmt: (x) => hiOpts[opts.indexOf(x)], en: [`${p[0]} : ${p[1]} :: ${p[2]} : ?`, `${p[0]} is to ${p[1]} as ${p[2]} is to ${p[3]}.`],
      hi: [`${p[4]} : ${p[5]} :: ${p[6]} : ?`, `जो संबंध ${p[4]} का ${p[5]} से है, वही ${p[6]} का ${p[7]} से है।`] }; },
  // Classification
  (r) => { const kind = pick(r, ['prime', 'even', 'square']); let odd, rest = [];
    if (kind === 'prime') { const ps = [11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47]; while (rest.length < 3) { const p = pick(r, ps); if (!rest.includes(p)) rest.push(p); } odd = pick(r, [21, 27, 33, 39, 49, 51, 57]); }
    else if (kind === 'even') { while (rest.length < 3) { const x = int(r, 6, 49) * 2; if (!rest.includes(x)) rest.push(x); } odd = int(r, 10, 49) * 2 + 1; }
    else { while (rest.length < 3) { const x = int(r, 4, 15) ** 2; if (!rest.includes(x)) rest.push(x); } odd = int(r, 4, 15) ** 2 + 1; }
    const why = { prime: ['the others are prime numbers', 'बाकी अभाज्य संख्याएँ हैं'], even: ['the others are even numbers', 'बाकी सम संख्याएँ हैं'], square: ['the others are perfect squares', 'बाकी पूर्ण वर्ग हैं'] }[kind];
    return { topic: 'Classification', difficulty: M, correct: odd, wrong: rest, en: ['Which number is the odd one out?', `${odd} does not belong: ${why[0]}.`], hi: ['इनमें से कौन-सी संख्या बाकी से अलग है?', `${odd} अलग है: ${why[1]}।`] }; },
  (r) => { const C = [['Rose', 'गुलाब', ['Lotus', 'Lily', 'Jasmine'], ['कमल', 'कुमुदिनी', 'चमेली'], 'Mango', 'आम', 'flowers', 'फूल', 'fruit', 'फल'], ['Hockey', 'हॉकी', ['Cricket', 'Football', 'Kabaddi'], ['क्रिकेट', 'फ़ुटबॉल', 'कबड्डी'], 'Chess', 'शतरंज', 'outdoor team games', 'मैदान में खेले जाने वाले टीम खेल', 'board game', 'बोर्ड खेल'],
      ['Mercury', 'बुध', ['Venus', 'Mars', 'Jupiter'], ['शुक्र', 'मंगल', 'बृहस्पति'], 'Moon', 'चंद्रमा', 'planets', 'ग्रह', 'satellite', 'उपग्रह'], ['Delhi', 'दिल्ली', ['Mumbai', 'Kolkata', 'Chennai'], ['मुंबई', 'कोलकाता', 'चेन्नई'], 'Nepal', 'नेपाल', 'cities', 'शहर', 'country', 'देश'],
      ['Ganga', 'गंगा', ['Yamuna', 'Godavari', 'Narmada'], ['यमुना', 'गोदावरी', 'नर्मदा'], 'Himalaya', 'हिमालय', 'rivers', 'नदियाँ', 'mountain range', 'पर्वत श्रेणी'], ['Eagle', 'गरुड़', ['Sparrow', 'Parrot', 'Crow'], ['गौरैया', 'तोता', 'कौआ'], 'Bat', 'चमगादड़', 'birds', 'पक्षी', 'mammal', 'स्तनधारी'],
      ['Square', 'वर्ग', ['Triangle', 'Rectangle', 'Pentagon'], ['त्रिभुज', 'आयत', 'पंचभुज'], 'Circle', 'वृत्त', 'figures with straight sides', 'सीधी भुजाओं वाली आकृतियाँ', 'figure with no straight side', 'बिना सीधी भुजा की आकृति'],
      ['Potato', 'आलू', ['Onion', 'Ginger', 'Turmeric'], ['प्याज़', 'अदरक', 'हल्दी'], 'Tomato', 'टमाटर', 'parts that grow under the ground', 'ज़मीन के नीचे उगने वाले भाग', 'fruit that grows above the ground', 'ज़मीन के ऊपर उगने वाला फल']];
    const c = pick(r, C); const enOpts = [c[4], c[0], ...c[2]], hiOpts = [c[5], c[1], ...c[3]];
    return { topic: 'Classification', difficulty: E, correct: c[4], wrong: [c[0], ...c[2]], hiFmt: (x) => hiOpts[enOpts.indexOf(x)],
      en: ['Which word is the odd one out?', `${[c[0], ...c[2]].join(', ')} are ${c[6]}; ${c[4]} is a ${c[8]}.`], hi: ['इनमें से कौन-सा शब्द बाकी से अलग है?', `${[c[1], ...c[3]].join(', ')} ${c[7]} हैं; ${c[5]} ${c[9]} है।`] }; },
  // Coding (critical thinking)
  (r) => { const words = ['GARDEN', 'PLANET', 'SCHOOL', 'FRIEND', 'MARKET', 'BRIDGE', 'CANDLE', 'WINTER', 'FOREST', 'ROCKET']; const w1 = pick(r, words), w2 = pick(r, words); if (w1 === w2) return null;
    const k = pick(r, [1, 2, -1]); const rev = r() < 0.4; const code = (w) => { const s = shift(w, k); return rev ? [...s].reverse().join('') : s; }; const ans = code(w2);
    const w = [shift(w2, k + 1), rev ? shift(w2, k) : [...shift(w2, k)].reverse().join(''), shift(w2, -k)].filter((x) => x !== ans);
    const rule = `each letter moves ${Math.abs(k)} place ${k > 0 ? 'forward' : 'back'}${rev ? ' and the word is then written backwards' : ''}`;
    const ruleHi = `हर अक्षर ${Math.abs(k)} स्थान ${k > 0 ? 'आगे' : 'पीछे'} जाता है${rev ? ' और फिर शब्द उल्टा लिखा जाता है' : ''}`;
    return { topic: 'Coding and decoding', difficulty: rev ? H : M, correct: ans, wrong: w, en: [`If ${w1} is written as ${code(w1)}, how is ${w2} written in that code?`, `In this code ${rule}: ${w2} → ${ans}.`],
      hi: [`यदि किसी कूट भाषा में ${w1} को ${code(w1)} लिखा जाता है, तो ${w2} को कैसे लिखा जाएगा?`, `इस कूट में ${ruleHi}: ${w2} → ${ans}।`] }; },
  (r) => { const ops = ['+', '−', '×', '÷']; const swap = pick(r, [['+', '×'], ['−', '+'], ['×', '−'], ['÷', '+']]); const map = { [swap[0]]: swap[1], [swap[1]]: swap[0] };
    const a = int(r, 2, 9), b = int(r, 2, 9), c = int(r, 2, 6), d = int(r, 2, 9); const shown = [pick(r, ops), pick(r, ops), pick(r, ops)]; const real = shown.map((o) => map[o] ?? o);
    if (real.includes('÷') || shown.includes('÷')) return null; const toJs = (o) => ({ '+': '+', '−': '-', '×': '*' }[o]);
    const v = Function(`return ${a}${toJs(real[0])}${b}${toJs(real[1])}${c}${toJs(real[2])}${d}`)(); const plain = Function(`return ${a}${toJs(shown[0])}${b}${toJs(shown[1])}${c}${toJs(shown[2])}${d}`)();
    if (v === plain) return null;
    return { topic: 'Mathematical operations', difficulty: H, correct: v, wrong: [plain, v + 2, v - 3].filter((x) => x !== v), en: [`If '${swap[0]}' means '${swap[1]}' and '${swap[1]}' means '${swap[0]}', find the value of ${a} ${shown[0]} ${b} ${shown[1]} ${c} ${shown[2]} ${d}.`, `Swap the signs: ${a} ${real[0]} ${b} ${real[1]} ${c} ${real[2]} ${d} = ${v} (× before + and −).`],
      hi: [`यदि '${swap[0]}' का अर्थ '${swap[1]}' और '${swap[1]}' का अर्थ '${swap[0]}' हो, तो ${a} ${shown[0]} ${b} ${shown[1]} ${c} ${shown[2]} ${d} का मान ज्ञात कीजिए।`, `चिह्न बदलिए: ${a} ${real[0]} ${b} ${real[1]} ${c} ${real[2]} ${d} = ${v} (+ और − से पहले ×)।`] }; },
  // Familial relations
  (r) => { const T = [['your father\'s sister', 'आपके पिता की बहन', 'Aunt', 'बुआ', ['Sister', 'Mother', 'Cousin'], ['बहन', 'माँ', 'चचेरी बहन']],
      ['your mother\'s father', 'आपकी माँ के पिता', 'Grandfather', 'नाना', ['Uncle', 'Father', 'Brother'], ['मामा', 'पिता', 'भाई']],
      ['your father\'s only son\'s daughter (you are a boy)', 'आपके पिता के इकलौते बेटे की बेटी (आप लड़के हैं)', 'Daughter', 'बेटी', ['Sister', 'Niece', 'Cousin'], ['बहन', 'भतीजी', 'चचेरी बहन']],
      ['your brother\'s son', 'आपके भाई का बेटा', 'Nephew', 'भतीजा', ['Son', 'Cousin', 'Grandson'], ['बेटा', 'चचेरा भाई', 'पोता']],
      ['your mother\'s brother', 'आपकी माँ का भाई', 'Uncle', 'मामा', ['Brother', 'Grandfather', 'Cousin'], ['भाई', 'नाना', 'ममेरा भाई']],
      ['your son\'s son', 'आपके बेटे का बेटा', 'Grandson', 'पोता', ['Nephew', 'Son', 'Brother'], ['भतीजा', 'बेटा', 'भाई']]];
    const t = pick(r, T); const enOpts = [t[2], ...t[4]], hiOpts = [t[3], ...t[5]];
    return { topic: 'Familial relations', difficulty: E, correct: t[2], wrong: t[4], hiFmt: (x) => hiOpts[enOpts.indexOf(x)], en: [`How is ${t[0]} related to you?`, `${t[0][0].toUpperCase() + t[0].slice(1)} is your ${t[2].toLowerCase()}.`], hi: [`${t[1]} आपकी/आपके क्या लगते हैं?`, `${t[1]} आपकी/आपके ${t[3]} हैं।`] }; },
  (r) => { const [en, hi] = pick(r, [['Ravi', 'रवि'], ['Arun', 'अरुण'], ['Sohan', 'सोहन']]); const [en2, hi2] = pick(r, [['Meena', 'मीना'], ['Gita', 'गीता'], ['Lata', 'लता']]);
    return { topic: 'Familial relations', difficulty: M, correct: 'Sister', wrong: ['Mother', 'Aunt', 'Daughter'], hiFmt: (x) => ({ Sister: 'बहन', Mother: 'माँ', Aunt: 'चाची', Daughter: 'बेटी' })[x],
      en: [`Pointing to ${en2}, ${en} says, "She is the only daughter of my mother." How is ${en2} related to ${en}?`, `The only daughter of ${en}'s mother is ${en}'s sister.`],
      hi: [`${hi2} की ओर इशारा करते हुए ${hi} कहता है, "यह मेरी माँ की इकलौती बेटी है।" ${hi2} का ${hi} से क्या संबंध है?`, `${hi} की माँ की इकलौती बेटी ${hi} की बहन है।`] }; },
  // Visual and logical reasoning: ranking, directions, clocks, order
  (r) => { const top = int(r, 5, 25), bottom = int(r, 5, 25), n = top + bottom - 1;
    return { topic: 'Logical reasoning', difficulty: M, correct: n, wrong: [n + 1, n - 1, top + bottom], en: [`In a row of students, Kiran is ${top}th from the left and ${bottom}th from the right. How many students are in the row?`, `Kiran is counted twice: ${top} + ${bottom} − 1 = ${n}.`],
      hi: [`विद्यार्थियों की एक पंक्ति में किरण बाएँ से ${top}वीं और दाएँ से ${bottom}वीं है। पंक्ति में कितने विद्यार्थी हैं?`, `किरण दो बार गिनी गई है: ${top} + ${bottom} − 1 = ${n}।`] }; },
  (r) => { const n = int(r, 25, 60), top = int(r, 5, n - 5), v = n - top + 1;
    return { topic: 'Logical reasoning', difficulty: M, correct: v, wrong: [v + 1, v - 1, n - top], en: [`In a class of ${n} pupils, Ankit's rank is ${top} from the top. What is his rank from the bottom?`, `From the bottom: ${n} − ${top} + 1 = ${v}.`],
      hi: [`${n} विद्यार्थियों की कक्षा में अंकित का स्थान ऊपर से ${top}वाँ है। नीचे से उसका स्थान क्या है?`, `नीचे से: ${n} − ${top} + 1 = ${v}।`] }; },
  (r) => { const a = int(r, 3, 9), b = int(r, 3, 9), dirs = pick(r, [['north', 'east', 'उत्तर', 'पूर्व', 'north-east', 'उत्तर-पूर्व'], ['south', 'west', 'दक्षिण', 'पश्चिम', 'south-west', 'दक्षिण-पश्चिम'], ['east', 'south', 'पूर्व', 'दक्षिण', 'south-east', 'दक्षिण-पूर्व'], ['west', 'north', 'पश्चिम', 'उत्तर', 'north-west', 'उत्तर-पश्चिम']]);
    const all = ['north-east', 'south-west', 'south-east', 'north-west']; const allHi = ['उत्तर-पूर्व', 'दक्षिण-पश्चिम', 'दक्षिण-पूर्व', 'उत्तर-पश्चिम'];
    return { topic: 'Logical reasoning', difficulty: M, correct: dirs[4], wrong: all.filter((d) => d !== dirs[4]), hiFmt: (x) => allHi[all.indexOf(x)],
      en: [`Asha walks ${a} km ${dirs[0]}, then turns and walks ${b} km ${dirs[1]}. In which direction is she now from her starting point?`, `She is ${dirs[0]} and ${dirs[1]} of the start, that is ${dirs[4]}.`],
      hi: [`आशा ${a} किमी ${dirs[2]} की ओर चलती है, फिर मुड़कर ${b} किमी ${dirs[3]} की ओर चलती है। अब वह आरंभ-बिंदु से किस दिशा में है?`, `वह आरंभ-बिंदु से ${dirs[2]} और ${dirs[3]} में है, यानी ${dirs[5]}।`] }; },
  (r) => { const words = pick(r, [['BRAVE', 'BREAD', 'BRICK', 'BROOM'], ['PLANT', 'PLATE', 'PLAIN', 'PLACE'], ['STONE', 'STORM', 'STOVE', 'STOOL'], ['CHAIR', 'CHALK', 'CHART', 'CHAIN'], ['GRAPE', 'GRASS', 'GRADE', 'GRAIN']]);
    const sorted = [...words].sort(); const shuffled = [...words].sort(() => r() - 0.5); const idx = (w) => 'abcd'[shuffled.indexOf(w)]; const ans = sorted.map(idx).join(', ');
    const w = [[...sorted].reverse().map(idx).join(', '), shuffled.map(idx).join(', '), [sorted[1], sorted[0], sorted[2], sorted[3]].map(idx).join(', ')].filter((x) => x !== ans);
    return { topic: 'Logical reasoning', difficulty: H, correct: ans, wrong: w, en: [`Arrange these words as they would appear in a dictionary: (a) ${shuffled[0]} (b) ${shuffled[1]} (c) ${shuffled[2]} (d) ${shuffled[3]}`, `Compare letter by letter: ${sorted.join(', ')} → ${ans}.`],
      hi: [`इन शब्दों को अंग्रेज़ी शब्दकोश के क्रम में लगाइए: (a) ${shuffled[0]} (b) ${shuffled[1]} (c) ${shuffled[2]} (d) ${shuffled[3]}`, `अक्षर-दर-अक्षर तुलना कीजिए: ${sorted.join(', ')} → ${ans}।`] }; },
  (r) => { const n = int(r, 3, 9), fromRight = r() < 0.5; const v = fromRight ? A[26 - n] : A[n - 1];
    return { topic: 'Logical reasoning', difficulty: E, correct: v, wrong: [L(A.indexOf(v) + 1), L(A.indexOf(v) - 1), fromRight ? A[n - 1] : A[26 - n]].filter((x) => x !== v), en: [`Which is the ${n}th letter from the ${fromRight ? 'right' : 'left'} end of the English alphabet?`, `Counting ${n} from the ${fromRight ? 'right (Z = 1st)' : 'left (A = 1st)'} gives ${v}.`],
      hi: [`अंग्रेज़ी वर्णमाला में ${fromRight ? 'दाएँ' : 'बाएँ'} सिरे से ${n}वाँ अक्षर कौन-सा है?`, `${fromRight ? 'दाएँ (Z = पहला)' : 'बाएँ (A = पहला)'} से ${n} गिनने पर ${v} आता है।`] }; },
  (r) => { const k = int(r, 2, 6), x = int(r, 3, 9), y = int(r, 3, 9), z = int(r, 3, 9); if (new Set([x, y, z]).size < 3) return null; const v = (z * z) + k;
    return { topic: 'Patterns', difficulty: H, correct: v, wrong: [v - k, z * 2 + k, v + 1], en: [`In each pair the second number is found the same way: ${x} → ${x * x + k}, ${y} → ${y * y + k}, ${z} → ?`, `Square the number and add ${k}: ${z}² + ${k} = ${v}.`],
      hi: [`हर जोड़े में दूसरी संख्या एक ही नियम से बनती है: ${x} → ${x * x + k}, ${y} → ${y * y + k}, ${z} → ?`, `संख्या का वर्ग करके ${k} जोड़िए: ${z}² + ${k} = ${v}।`] }; },
];

const FIG = [seriesQuestion, mirrorQuestion, patternQuestion];
const TOPIC_OF = { 'Figure series': 'Patterns', 'Mirror image': 'Visual reasoning', 'Water image': 'Visual reasoning', 'Pattern completion': 'Patterns' };

function build(r, g, id) {
  const spec = g(r);
  if (!spec) return null;
  const fmt = spec.fmt ?? String;
  try {
    return mcq(r, { id, section: 'Intelligence', topic: spec.topic, difficulty: spec.difficulty, prompt: spec.en[0], correct: spec.correct, wrong: spec.wrong,
      explanation: spec.en[1], fmt, hi: { prompt: spec.hi[0], explanation: spec.hi[1], fmt: spec.hiFmt ?? fmt } });
  } catch {
    return null;
  }
}

/** `count` questions: mostly reasoning generators in rotation, about one in five a figure question. */
export function intelligenceSet(r, setNo, seen, count, prefix = 'i') {
  const out = [];
  let g = (setNo * 7) % G.length, f = setNo % FIG.length;
  for (let i = 1; i <= count; i++) {
    let q = null;
    for (let tries = 0; !q && tries < 200; tries++) {
      if (i % 5 === 0) {
        const fq = FIG[f++ % FIG.length](r);
        const k = JSON.stringify([fq.figure, fq.optionFigures.map((x) => JSON.stringify(x.shapes)).sort()]);
        if (!seen.has(k)) { seen.add(k); q = { id: `${prefix}${i}`, ...fq, section: 'Intelligence', topic: TOPIC_OF[fq.topic] ?? 'Visual reasoning' }; }
      } else {
        const gen = G[g++ % G.length];
        try { q = unique(seen, () => { let x = null; for (let t = 0; !x && t < 40; t++) x = build(r, gen, `${prefix}${i}`); if (!x) throw new Error('none'); return x; }, 8); } catch { q = null; }
      }
    }
    if (!q) throw new Error('intelligence: could not make a new question');
    out.push(q);
  }
  return out;
}
