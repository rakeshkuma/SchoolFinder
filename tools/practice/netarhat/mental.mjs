// Mental Ability (मानसिक योग्यता): text-based reasoning at Class 5 level. Rule-based items compute their answers;
// word items (odd one out, analogies, relations) come from tables whose keys were checked by hand.
import { int, mcq, pick, unique } from './core.mjs';

const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DAYS = [['Sunday', 'रविवार'], ['Monday', 'सोमवार'], ['Tuesday', 'मंगलवार'], ['Wednesday', 'बुधवार'], ['Thursday', 'गुरुवार'], ['Friday', 'शुक्रवार'], ['Saturday', 'शनिवार']];
const DIRS = [['North', 'उत्तर'], ['East', 'पूर्व'], ['South', 'दक्षिण'], ['West', 'पश्चिम']];
const WORDS = ['GOLD', 'TREE', 'BOOK', 'LAMP', 'FISH', 'MILK', 'SALT', 'RAIN', 'DESK', 'KITE', 'ROSE', 'SHIP'];

// [English options (odd one first), Hindi options, reason EN, reason HI]
const ODD = [
  [['Sparrow', 'Crow', 'Parrot', 'Bat'], ['गौरैया', 'कौआ', 'तोता', 'चमगादड़'], 'Sparrow, crow and parrot are birds; the bat is a mammal.', 'गौरैया, कौआ और तोता पक्षी हैं; चमगादड़ स्तनधारी है।', 3],
  [['Mango', 'Banana', 'Guava', 'Potato'], ['आम', 'केला', 'अमरूद', 'आलू'], 'Mango, banana and guava are fruits; the potato is a vegetable (a stem tuber).', 'आम, केला और अमरूद फल हैं; आलू सब्ज़ी (भूमिगत तना) है।', 3],
  [['Mars', 'Venus', 'Moon', 'Jupiter'], ['मंगल', 'शुक्र', 'चंद्रमा', 'बृहस्पति'], 'Mars, Venus and Jupiter are planets; the Moon is Earth\'s satellite.', 'मंगल, शुक्र और बृहस्पति ग्रह हैं; चंद्रमा पृथ्वी का उपग्रह है।', 2],
  [['Ganga', 'Godavari', 'Narmada', 'Himalaya'], ['गंगा', 'गोदावरी', 'नर्मदा', 'हिमालय'], 'Ganga, Godavari and Narmada are rivers; the Himalaya is a mountain range.', 'गंगा, गोदावरी और नर्मदा नदियाँ हैं; हिमालय पर्वत श्रृंखला है।', 3],
  [['Square', 'Triangle', 'Circle', 'Rectangle'], ['वर्ग', 'त्रिभुज', 'वृत्त', 'आयत'], 'Square, triangle and rectangle have straight sides; a circle has none.', 'वर्ग, त्रिभुज और आयत की भुजाएँ सीधी होती हैं; वृत्त की कोई सीधी भुजा नहीं होती।', 2],
  [['Wheat', 'Rice', 'Maize', 'Cotton'], ['गेहूँ', 'धान', 'मक्का', 'कपास'], 'Wheat, rice and maize are food grains; cotton is a fibre crop.', 'गेहूँ, धान और मक्का खाद्यान्न हैं; कपास रेशे वाली फसल है।', 3],
  [['Iron', 'Copper', 'Wood', 'Silver'], ['लोहा', 'ताँबा', 'लकड़ी', 'चाँदी'], 'Iron, copper and silver are metals; wood is not.', 'लोहा, ताँबा और चाँदी धातुएँ हैं; लकड़ी धातु नहीं है।', 2],
  [['Eye', 'Ear', 'Nose', 'Heart'], ['आँख', 'कान', 'नाक', 'हृदय'], 'Eye, ear and nose are sense organs; the heart pumps blood.', 'आँख, कान और नाक ज्ञानेंद्रियाँ हैं; हृदय रक्त पंप करता है।', 3],
  [['Pen', 'Pencil', 'Chalk', 'Eraser'], ['कलम', 'पेंसिल', 'चॉक', 'रबड़'], 'Pen, pencil and chalk are used to write; an eraser removes writing.', 'कलम, पेंसिल और चॉक से लिखा जाता है; रबड़ से मिटाया जाता है।', 3],
  [['Frog', 'Snake', 'Lizard', 'Crocodile'], ['मेंढक', 'साँप', 'छिपकली', 'मगरमच्छ'], 'Snake, lizard and crocodile are reptiles; the frog is an amphibian.', 'साँप, छिपकली और मगरमच्छ सरीसृप हैं; मेंढक उभयचर है।', 0],
  [['Tabla', 'Sitar', 'Veena', 'Sarangi'], ['तबला', 'सितार', 'वीणा', 'सारंगी'], 'Sitar, veena and sarangi are string instruments; the tabla is a drum.', 'सितार, वीणा और सारंगी तार वाले वाद्य हैं; तबला ताल वाद्य है।', 0],
  [['Bus', 'Train', 'Aeroplane', 'Truck'], ['बस', 'रेलगाड़ी', 'हवाई जहाज़', 'ट्रक'], 'Bus, train and truck travel on land; the aeroplane flies.', 'बस, रेलगाड़ी और ट्रक ज़मीन पर चलते हैं; हवाई जहाज़ उड़ता है।', 2],
];

// [A, B, C, answer, wrong×3] in English and Hindi, reason
const ANALOGY = [
  [['Bird', 'Nest', 'Lion', 'Den', 'Mane', 'Roar', 'Cub'], ['पक्षी', 'घोंसला', 'शेर', 'माँद', 'अयाल', 'दहाड़', 'शावक'], 'A bird lives in a nest; a lion lives in a den.', 'पक्षी घोंसले में रहता है; शेर माँद में रहता है।'],
  [['Doctor', 'Hospital', 'Teacher', 'School', 'Book', 'Student', 'Chalk'], ['डॉक्टर', 'अस्पताल', 'शिक्षक', 'विद्यालय', 'पुस्तक', 'छात्र', 'चॉक'], 'A doctor works in a hospital; a teacher works in a school.', 'डॉक्टर अस्पताल में काम करता है; शिक्षक विद्यालय में।'],
  [['Cow', 'Calf', 'Dog', 'Puppy', 'Kitten', 'Kennel', 'Bark'], ['गाय', 'बछड़ा', 'कुत्ता', 'पिल्ला', 'बिल्ली का बच्चा', 'कुत्ताघर', 'भौंकना'], 'The young of a cow is a calf; the young of a dog is a puppy.', 'गाय का बच्चा बछड़ा; कुत्ते का बच्चा पिल्ला।'],
  [['Pen', 'Write', 'Knife', 'Cut', 'Sharp', 'Kitchen', 'Iron'], ['कलम', 'लिखना', 'चाकू', 'काटना', 'तेज़', 'रसोई', 'लोहा'], 'A pen is used to write; a knife is used to cut.', 'कलम से लिखते हैं; चाकू से काटते हैं।'],
  [['Day', 'Sun', 'Night', 'Moon', 'Dark', 'Sleep', 'Sky'], ['दिन', 'सूर्य', 'रात', 'चंद्रमा', 'अँधेरा', 'नींद', 'आकाश'], 'The Sun shines by day; the Moon is seen at night.', 'दिन में सूर्य; रात में चंद्रमा।'],
  [['Eye', 'See', 'Ear', 'Hear', 'Sound', 'Nose', 'Music'], ['आँख', 'देखना', 'कान', 'सुनना', 'ध्वनि', 'नाक', 'संगीत'], 'We see with the eyes and hear with the ears.', 'आँख से देखते हैं; कान से सुनते हैं।'],
  [['Water', 'Thirst', 'Food', 'Hunger', 'Plate', 'Cook', 'Taste'], ['पानी', 'प्यास', 'भोजन', 'भूख', 'थाली', 'पकाना', 'स्वाद'], 'Water satisfies thirst; food satisfies hunger.', 'पानी प्यास बुझाता है; भोजन भूख मिटाता है।'],
  [['Tailor', 'Needle', 'Farmer', 'Plough', 'Field', 'Crop', 'Rain'], ['दर्ज़ी', 'सुई', 'किसान', 'हल', 'खेत', 'फसल', 'वर्षा'], 'A tailor\'s tool is a needle; a farmer\'s tool is a plough.', 'दर्ज़ी का औज़ार सुई; किसान का औज़ार हल।'],
  [['Fish', 'Water', 'Camel', 'Desert', 'Hump', 'Saddle', 'Milk'], ['मछली', 'पानी', 'ऊँट', 'रेगिस्तान', 'कूबड़', 'काठी', 'दूध'], 'Fish are suited to water; camels are suited to the desert.', 'मछली पानी में रहती है; ऊँट रेगिस्तान में।'],
  [['Hand', 'Glove', 'Foot', 'Shoe', 'Toe', 'Walk', 'Leg'], ['हाथ', 'दस्ताना', 'पैर', 'जूता', 'अँगूठा', 'चलना', 'टाँग'], 'A glove is worn on the hand; a shoe on the foot.', 'दस्ताना हाथ में; जूता पैर में पहनते हैं।'],
];

// relation puzzles: [EN prompt, HI prompt, answer EN, answer HI, wrong EN×3, wrong HI×3, explanation EN, HI]
const RELATIONS = [
  ['Ramesh is the son of Mohan\'s father. How is Ramesh related to Mohan, if Ramesh is not Mohan?', 'रमेश, मोहन के पिता का पुत्र है। यदि रमेश स्वयं मोहन नहीं है, तो रमेश का मोहन से क्या संबंध है?', 'Brother', 'भाई', ['Father', 'Uncle', 'Son'], ['पिता', 'चाचा', 'पुत्र'], 'The son of Mohan\'s father, other than Mohan, is Mohan\'s brother.', 'मोहन के पिता का (मोहन के अलावा) पुत्र मोहन का भाई है।'],
  ['Geeta is the daughter of Ravi\'s mother\'s only son. Who is Geeta to Ravi, if Ravi has no brothers?', 'गीता, रवि की माँ के इकलौते पुत्र की बेटी है। यदि रवि का कोई भाई नहीं है, तो गीता रवि की कौन है?', 'Daughter', 'बेटी', ['Sister', 'Niece', 'Mother'], ['बहन', 'भतीजी', 'माँ'], 'Ravi has no brothers, so his mother\'s only son is Ravi himself; Geeta is his daughter.', 'रवि का कोई भाई नहीं है, अतः माँ का इकलौता पुत्र रवि ही है; गीता उसकी बेटी है।'],
  ['Amit\'s father is Sunil. Sunil\'s father is Harish. How is Harish related to Amit?', 'अमित के पिता सुनील हैं। सुनील के पिता हरीश हैं। हरीश का अमित से क्या संबंध है?', 'Grandfather', 'दादा', ['Father', 'Uncle', 'Brother'], ['पिता', 'चाचा', 'भाई'], 'The father\'s father is the grandfather.', 'पिता के पिता दादा होते हैं।'],
  ['Neha is the sister of Arun. Arun is the father of Kiran. How is Neha related to Kiran?', 'नेहा, अरुण की बहन है। अरुण, किरण के पिता हैं। नेहा का किरण से क्या संबंध है?', 'Aunt (father\'s sister)', 'बुआ', ['Mother', 'Sister', 'Grandmother'], ['माँ', 'बहन', 'दादी'], 'The father\'s sister is the aunt (बुआ).', 'पिता की बहन बुआ होती है।'],
  ['Pointing to a boy, Asha says, "He is the only son of my mother." How is the boy related to Asha?', 'एक लड़के की ओर इशारा करते हुए आशा कहती है, "यह मेरी माँ का इकलौता पुत्र है।" लड़के का आशा से क्या संबंध है?', 'Brother', 'भाई', ['Son', 'Father', 'Cousin'], ['पुत्र', 'पिता', 'चचेरा भाई'], 'Asha is a girl, so her mother\'s only son is her brother.', 'आशा लड़की है, इसलिए उसकी माँ का इकलौता पुत्र उसका भाई है।'],
];

const GENERATORS = [
  (r) => { // arithmetic series
    const a = int(r, 3, 30), d = int(r, 3, 13), xs = [0, 1, 2, 3, 4].map((k) => a + k * d), n = a + 5 * d;
    return { topic: 'Number series', difficulty: 'EASY', correct: n, wrong: [n + 1, n - d + 1, n + d, n - 2],
      en: [`What comes next? ${xs.join(', ')}, ?`, `Each number is ${d} more than the one before: ${xs[4]} + ${d} = ${n}.`],
      hi: [`आगे क्या आएगा? ${xs.join(', ')}, ?`, `हर संख्या पिछली से ${d} अधिक है: ${xs[4]} + ${d} = ${n}।`] };
  },
  (r) => { // geometric series
    const a = int(r, 2, 6), k = pick(r, [2, 3]), xs = [0, 1, 2, 3].map((i) => a * k ** i), n = a * k ** 4;
    return { topic: 'Number series', difficulty: 'EASY', correct: n, wrong: [n - a, xs[3] + k, n + k, xs[3] * (k + 1)],
      en: [`What comes next? ${xs.join(', ')}, ?`, `Each number is ${k} times the one before: ${xs[3]} × ${k} = ${n}.`],
      hi: [`आगे क्या आएगा? ${xs.join(', ')}, ?`, `हर संख्या पिछली की ${k} गुनी है: ${xs[3]} × ${k} = ${n}।`] };
  },
  (r) => { // growing differences
    const a = int(r, 1, 12), s = int(r, 1, 3), xs = [a];
    for (let i = 0; i < 4; i++) xs.push(xs[i] + s + i);
    const n = xs[4] + s + 4;
    return { topic: 'Number series', difficulty: 'MEDIUM', correct: n, wrong: [n - 1, n + 1, xs[4] + s + 3 === n ? n + 2 : xs[4] + s + 3, n + 3],
      en: [`What comes next? ${xs.join(', ')}, ?`, `The differences are ${[0, 1, 2, 3].map((i) => s + i).join(', ')}, growing by 1; the next difference is ${s + 4}: ${xs[4]} + ${s + 4} = ${n}.`],
      hi: [`आगे क्या आएगा? ${xs.join(', ')}, ?`, `अंतर ${[0, 1, 2, 3].map((i) => s + i).join(', ')} हैं, जो 1-1 बढ़ते हैं; अगला अंतर ${s + 4}: ${xs[4]} + ${s + 4} = ${n}।`] };
  },
  (r) => { // squares
    const s = int(r, 2, 6), xs = [0, 1, 2, 3].map((i) => (s + i) ** 2), n = (s + 4) ** 2;
    return { topic: 'Number series', difficulty: 'MEDIUM', correct: n, wrong: [n - 1, n + 2, xs[3] + (xs[3] - xs[2]), (s + 4) * 2],
      en: [`What comes next? ${xs.join(', ')}, ?`, `These are squares: ${xs.map((x, i) => `${s + i}²`).join(', ')}; next is ${s + 4}² = ${n}.`],
      hi: [`आगे क्या आएगा? ${xs.join(', ')}, ?`, `ये वर्ग संख्याएँ हैं: ${xs.map((x, i) => `${s + i}²`).join(', ')}; अगली ${s + 4}² = ${n}।`] };
  },
  (r) => { // letter series
    const k = int(r, 2, 4), st = int(r, 0, 25 - 5 * k), xs = [0, 1, 2, 3].map((i) => A[st + i * k]), n = A[st + 4 * k];
    return { topic: 'Letter series', difficulty: 'MEDIUM', correct: n, wrong: [A[st + 4 * k - 1], A[st + 4 * k + 1] ?? A[st], A[st + 3 * k + 1], A[st + 4 * k - 2]],
      en: [`What comes next? ${xs.join(', ')}, ?`, `Each letter is ${k} places after the one before (skip ${k - 1}): ${xs[3]} → ${n}.`],
      hi: [`आगे कौन-सा अक्षर आएगा? ${xs.join(', ')}, ?`, `हर अक्षर पिछले से ${k} स्थान आगे है (${k - 1} छोड़कर): ${xs[3]} → ${n}।`] };
  },
  (r) => { // letter-shift coding
    const k = pick(r, [1, 2, -1]);
    let w1, w2;
    do { w1 = pick(r, WORDS); w2 = pick(r, WORDS); } while (w1 === w2);
    const enc = (w, s) => w.split('').map((c) => A[(A.indexOf(c) + s + 26) % 26]).join('');
    const ans = enc(w2, k);
    return { topic: 'Coding-decoding', difficulty: 'MEDIUM', correct: ans, wrong: [enc(w2, -k), enc(w2, k * 2), enc(w2, k).split('').reverse().join(''), enc(w2, k + 1)],
      en: [`If ${w1} is written as ${enc(w1, k)}, how is ${w2} written in the same code?`, `Each letter moves ${Math.abs(k)} place${Math.abs(k) > 1 ? 's' : ''} ${k > 0 ? 'forward' : 'back'} in the alphabet, so ${w2} becomes ${ans}.`],
      hi: [`यदि किसी कूट भाषा में ${w1} को ${enc(w1, k)} लिखा जाता है, तो उसी कूट में ${w2} को कैसे लिखा जाएगा?`, `हर अक्षर वर्णमाला में ${Math.abs(k)} स्थान ${k > 0 ? 'आगे' : 'पीछे'} खिसकता है, इसलिए ${w2} = ${ans}।`] };
  },
  (r) => { // letter values
    const w = pick(r, ['CAT', 'BAG', 'DOG', 'HEN', 'BED', 'CUP', 'SUN', 'PEN']), v = w.split('').reduce((s, c) => s + A.indexOf(c) + 1, 0);
    return { topic: 'Coding-decoding', difficulty: 'MEDIUM', correct: v, wrong: [v + 1, v - 2, v + 3, v + 10],
      en: [`If A = 1, B = 2, C = 3 and so on up to Z = 26, what is the total value of the letters of ${w}?`, `${w.split('').map((c) => `${c} = ${A.indexOf(c) + 1}`).join(', ')}; total = ${v}.`],
      hi: [`यदि A = 1, B = 2, C = 3 … Z = 26 हो, तो ${w} के अक्षरों के मानों का योग क्या होगा?`, `${w.split('').map((c) => `${c} = ${A.indexOf(c) + 1}`).join(', ')}; योग = ${v}।`] };
  },
  (r) => { // odd number out
    const k = pick(r, [3, 4, 6, 7, 9]), base = [int(r, 2, 5), int(r, 6, 9), int(r, 10, 13)].map((m) => m * k);
    let odd = int(r, 2, 12) * k + int(r, 1, k - 1);
    return { topic: 'Odd one out', difficulty: 'MEDIUM', correct: odd, wrong: base,
      en: [`Which number is different from the others?`, `${base.join(', ')} are all multiples of ${k}; ${odd} is not.`],
      hi: [`कौन-सी संख्या बाक़ियों से भिन्न है?`, `${base.join(', ')} सभी ${k} के गुणज हैं; ${odd} नहीं है।`] };
  },
  (r, setNo) => { // odd word out
    const [en, hi, why, whyHi, oddIdx] = ODD[(setNo - 1) * 2 % ODD.length];
    const others = en.filter((_, i) => i !== oddIdx), othersHi = hi.filter((_, i) => i !== oddIdx);
    return { topic: 'Odd one out', difficulty: 'EASY', correct: en[oddIdx], wrong: others, hiMap: Object.fromEntries(en.map((e, i) => [e, hi[i]])),
      en: ['Which one is different from the others?', why], hi: ['इनमें से कौन-सा बाक़ियों से भिन्न है?', whyHi], othersHi };
  },
  (r, setNo) => { // word analogy
    const [en, hi, why, whyHi] = ANALOGY[(setNo - 1) * 2 % ANALOGY.length];
    return { topic: 'Analogy', difficulty: 'EASY', correct: en[3], wrong: en.slice(4), hiMap: Object.fromEntries(en.slice(3).map((e, i) => [e, hi[3 + i]])),
      en: [`${en[0]} is to ${en[1]} as ${en[2]} is to ?`, why], hi: [`${hi[0]} : ${hi[1]} :: ${hi[2]} : ?`, whyHi] };
  },
  (r) => { // number analogy
    const kind = pick(r, ['square', 'double', 'cube']), a = kind === 'cube' ? int(r, 2, 4) : int(r, 3, 9);
    let b; do { b = kind === 'cube' ? int(r, 5, 6) : int(r, 3, 12); } while (b === a);
    const f = { square: (x) => x * x, double: (x) => 2 * x + 1, cube: (x) => x * x * x }[kind];
    const rule = { square: ['the number multiplied by itself', 'संख्या का वर्ग'], double: ['double the number, plus 1', 'संख्या का दुगुना जमा 1'], cube: ['the number × itself × itself', 'संख्या का घन'] }[kind];
    return { topic: 'Analogy', difficulty: 'MEDIUM', correct: f(b), wrong: [f(b) + 1, f(b) - b, 2 * b, b * b + b],
      en: [`${a} : ${f(a)} :: ${b} : ?`, `The second number is ${rule[0]}: ${a} → ${f(a)}, so ${b} → ${f(b)}.`],
      hi: [`${a} : ${f(a)} :: ${b} : ?`, `दूसरी संख्या, पहली का ${rule[1]} है: ${a} → ${f(a)}, इसलिए ${b} → ${f(b)}।`] };
  },
  (r) => { // directions
    const start = int(r, 0, 3), turns = [pick(r, [1, -1]), pick(r, [1, -1])];
    const face = (start + turns[0] + turns[1] + 8) % 4;
    const t = (x) => (x === 1 ? ['right', 'दाएँ'] : ['left', 'बाएँ']);
    return { topic: 'Direction sense', difficulty: 'MEDIUM', correct: DIRS[face][0], wrong: DIRS.filter((_, i) => i !== face).map((d) => d[0]),
      hiMap: Object.fromEntries(DIRS),
      en: [`Raju faces ${DIRS[start][0]}. He turns ${t(turns[0])[0]}, walks a little, then turns ${t(turns[1])[0]}. Which direction is he facing now?`,
        `${DIRS[start][0]} → turn ${t(turns[0])[0]} → ${DIRS[(start + turns[0] + 4) % 4][0]} → turn ${t(turns[1])[0]} → ${DIRS[face][0]}.`],
      hi: [`राजू का मुँह ${DIRS[start][1]} की ओर है। वह ${t(turns[0])[1]} मुड़ता है, थोड़ा चलता है, फिर ${t(turns[1])[1]} मुड़ता है। अब उसका मुँह किस दिशा में है?`,
        `${DIRS[start][1]} → ${t(turns[0])[1]} मुड़ा → ${DIRS[(start + turns[0] + 4) % 4][1]} → ${t(turns[1])[1]} मुड़ा → ${DIRS[face][1]}।`] };
  },
  (r) => { // ranking
    const top = int(r, 5, 18), bottom = int(r, 6, 22), n = top + bottom - 1;
    return { topic: 'Ranking', difficulty: 'MEDIUM', correct: n, wrong: [top + bottom, n - 1, top + bottom + 1, Math.abs(bottom - top) + 10],
      en: [`In a row of children, Mohan is ${top}th from the front and ${bottom}th from the back. How many children are in the row?`, `${top} + ${bottom} − 1 = ${n} (Mohan is counted twice, so subtract 1).`],
      hi: [`बच्चों की एक पंक्ति में मोहन आगे से ${top}वाँ और पीछे से ${bottom}वाँ है। पंक्ति में कुल कितने बच्चे हैं?`, `${top} + ${bottom} − 1 = ${n} (मोहन दो बार गिना गया है, इसलिए 1 घटाएँ)।`] };
  },
  (r) => { // calendar
    const d = int(r, 0, 6), n = int(r, 9, 60), ans = (d + n) % 7;
    return { topic: 'Calendar', difficulty: 'MEDIUM', correct: DAYS[ans][0], wrong: [DAYS[(ans + 1) % 7][0], DAYS[(ans + 6) % 7][0], DAYS[(ans + 2) % 7][0]],
      hiMap: Object.fromEntries(DAYS),
      en: [`Today is ${DAYS[d][0]}. What day of the week will it be ${n} days from today?`, `Days repeat every 7. ${n} ÷ 7 leaves remainder ${n % 7}, so count ${n % 7} day${n % 7 === 1 ? '' : 's'} on from ${DAYS[d][0]}: ${DAYS[ans][0]}.`],
      hi: [`आज ${DAYS[d][1]} है। आज से ${n} दिन बाद सप्ताह का कौन-सा दिन होगा?`, `दिन हर 7 पर दोहराते हैं। ${n} ÷ 7 का शेषफल ${n % 7} है, इसलिए ${DAYS[d][1]} से ${n % 7} दिन आगे गिनें: ${DAYS[ans][1]}।`] };
  },
  (r) => { // ages
    const son = int(r, 8, 14), gap = int(r, 22, 32), now = son + gap, yrs = int(r, 3, 8);
    return { topic: 'Age problems', difficulty: 'MEDIUM', correct: now + yrs, wrong: [now, now + yrs + son, son + yrs, now - yrs],
      en: [`A father is ${gap} years older than his son. The son is ${son} years old now. How old will the father be after ${yrs} years?`, `Father now = ${son} + ${gap} = ${now}; after ${yrs} years: ${now} + ${yrs} = ${now + yrs}.`],
      hi: [`एक पिता अपने पुत्र से ${gap} वर्ष बड़े हैं। पुत्र अभी ${son} वर्ष का है। ${yrs} वर्ष बाद पिता की आयु कितनी होगी?`, `पिता की अभी की आयु = ${son} + ${gap} = ${now}; ${yrs} वर्ष बाद: ${now} + ${yrs} = ${now + yrs}।`] };
  },
  (r) => { // missing number pattern
    const rows = [0, 1, 2].map(() => [int(r, 2, 9), int(r, 2, 9)]);
    const op = pick(r, ['sum', 'product']);
    const f = op === 'sum' ? (a, b) => a + b : (a, b) => a * b;
    const ans = f(...rows[2]);
    return { topic: 'Missing number', difficulty: 'MEDIUM', correct: ans, wrong: [ans + 1, op === 'sum' ? rows[2][0] * rows[2][1] : rows[2][0] + rows[2][1], ans - 2, ans + 3],
      en: [`Find the missing number: (${rows[0][0]}, ${rows[0][1]}) → ${f(...rows[0])}; (${rows[1][0]}, ${rows[1][1]}) → ${f(...rows[1])}; (${rows[2][0]}, ${rows[2][1]}) → ?`, `The result is the ${op} of the two numbers: ${rows[2][0]} ${op === 'sum' ? '+' : '×'} ${rows[2][1]} = ${ans}.`],
      hi: [`लुप्त संख्या ज्ञात करें: (${rows[0][0]}, ${rows[0][1]}) → ${f(...rows[0])}; (${rows[1][0]}, ${rows[1][1]}) → ${f(...rows[1])}; (${rows[2][0]}, ${rows[2][1]}) → ?`, `परिणाम दोनों संख्याओं का ${op === 'sum' ? 'योग' : 'गुणनफल'} है: ${rows[2][0]} ${op === 'sum' ? '+' : '×'} ${rows[2][1]} = ${ans}।`] };
  },
  (r) => { // alphabet positions
    const p = int(r, 4, 14), k = int(r, 3, 8), ans = A[p - 1 + k];
    return { topic: 'Alphabet test', difficulty: 'MEDIUM', correct: ans, wrong: [A[p - 1 + k - 1], A[p - 1 + k + 1], A[p - 1 - k + 26] ?? A[p], A[p - 1]],
      en: [`In the English alphabet, which letter is ${k} places to the right of the ${p}th letter from the left?`, `The ${p}th letter is ${A[p - 1]}; ${k} places to its right is the ${p + k}th letter, ${ans}.`],
      hi: [`अंग्रेज़ी वर्णमाला में बाएँ से ${p}वें अक्षर के ${k} स्थान दाईं ओर कौन-सा अक्षर है?`, `${p}वाँ अक्षर ${A[p - 1]} है; उससे ${k} स्थान दाईं ओर ${p + k}वाँ अक्षर ${ans} है।`] };
  },
  (r, setNo) => { // relations
    const [en, hi, a, ah, w, wh, why, whyHi] = RELATIONS[(setNo - 1) % RELATIONS.length];
    return { topic: 'Blood relations', difficulty: 'MEDIUM', correct: a, wrong: w, hiMap: Object.fromEntries([[a, ah], ...w.map((x, i) => [x, wh[i]])]),
      en: [en, why], hi: [hi, whyHi] };
  },
  (r) => { // counting multiples
    const k = pick(r, [4, 6, 7, 8, 9]), n = pick(r, [50, 60, 75, 80, 100]), c = Math.floor(n / k);
    return { topic: 'Counting', difficulty: 'MEDIUM', correct: c, wrong: [c + 1, c - 1, Math.ceil(n / k) === c ? c + 2 : Math.ceil(n / k), c + 3],
      en: [`How many numbers from 1 to ${n} can be divided exactly by ${k}?`, `${n} ÷ ${k} = ${c} remainder ${n % k}, so there are ${c} multiples of ${k} (${k}, ${2 * k}, … ${c * k}).`],
      hi: [`1 से ${n} तक की कितनी संख्याएँ ${k} से पूरी-पूरी विभाजित होती हैं?`, `${n} ÷ ${k} = ${c}, शेष ${n % k}; अतः ${k} के ${c} गुणज हैं (${k}, ${2 * k}, … ${c * k})।`] };
  },
  (r) => { // dictionary order
    const groups = [['Mango', 'Market', 'Marble', 'Mask'], ['Train', 'Tree', 'Trace', 'Trick'], ['Plant', 'Planet', 'Plate', 'Place'], ['Stone', 'Store', 'Stool', 'Stop'], ['Bread', 'Break', 'Branch', 'Bridge']];
    const g = pick(r, groups), sorted = [...g].sort((x, y) => x.localeCompare(y));
    const pos = int(r, 1, 3), ans = sorted[pos - 1];
    return { topic: 'Dictionary order', difficulty: 'MEDIUM', correct: ans, wrong: g.filter((x) => x !== ans), sameInHindi: true,
      en: [`If these words are arranged in dictionary order, which word comes ${['first', 'second', 'third'][pos - 1]}? ${g.join(', ')}`, `In dictionary order: ${sorted.join(', ')}. The ${['first', 'second', 'third'][pos - 1]} word is ${ans}.`],
      hi: [`यदि इन अंग्रेज़ी शब्दों को शब्दकोश के क्रम में लगाया जाए, तो ${['पहला', 'दूसरा', 'तीसरा'][pos - 1]} शब्द कौन-सा होगा? ${g.join(', ')}`, `शब्दकोश क्रम: ${sorted.join(', ')}। ${['पहला', 'दूसरा', 'तीसरा'][pos - 1]} शब्द ${ans} है।`] };
  },
];

export function mentalSet(r, setNo, seen) {
  return GENERATORS.map((g, i) => unique(seen, () => {
    const x = g(r, setNo);
    const hiFmt = x.hiMap ? (v) => x.hiMap[v] ?? String(v) : undefined;
    return mcq(r, {
      id: `ma${setNo}-${String(i + 1).padStart(2, '0')}`, section: 'Mental Ability', topic: x.topic, difficulty: x.difficulty,
      prompt: x.en[0], correct: x.correct, wrong: x.wrong, explanation: x.en[1],
      hi: { prompt: x.hi[0], explanation: x.hi[1], fmt: hiFmt },
    });
  }));
}
