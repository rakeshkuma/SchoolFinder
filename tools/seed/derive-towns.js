// Finds, for each wanted town (towns-wanted.json), the PIN codes that belong to it, using the CBSE SARAS records
// themselves: a PIN is accepted for a town when at least two schools with that PIN name the town in their postal
// address, or one school does and SARAS also lists the town as the school's district. One address alone, with its
// own PIN, is not enough: a mistyped address would otherwise label a whole PIN. build-town-facts.js then assigns a
// town only where the PIN and the address agree.
// Usage: node derive-towns.js <saras.jsonl[,more.jsonl]> <out.json>
const fs = require('fs');
const path = require('path');
const [input, out] = process.argv.slice(2);
const WANTED = JSON.parse(fs.readFileSync(path.join(__dirname, 'towns-wanted.json'), 'utf8'));

/** SARAS state names for each code; two former union territories are one state code today. */
const STATE_NAMES = {
  AN: ['ANDAMAN & NICOBAR'], AP: ['ANDHRA PRADESH'], AR: ['ARUNACHAL PRADESH'], AS: ['ASSAM'], BR: ['BIHAR'], CH: ['CHANDIGARH'],
  CG: ['CHATTISGARH', 'CHHATTISGARH'], DH: ['DADAR & NAGAR HAVELI', 'DADRA & NAGAR HAVELI', 'DAMAN & DIU'], DL: ['DELHI'], GA: ['GOA'],
  GJ: ['GUJARAT'], HR: ['HARYANA'], HP: ['HIMACHAL PRADESH'], JK: ['JAMMU & KASHMIR'], JH: ['JHARKHAND'], KA: ['KARNATAKA'],
  KL: ['KERALA'], LA: ['LADAKH'], LD: ['LAKSHADWEEP'], MP: ['MADHYA PRADESH'], MH: ['MAHARASHTRA'], MN: ['MANIPUR'], ML: ['MEGHALAYA'],
  MZ: ['MIZORAM'], NL: ['NAGALAND'], OD: ['ODISHA', 'ORISSA'], PY: ['PUDUCHERRY', 'PONDICHERRY'], PB: ['PUNJAB'], RJ: ['RAJASTHAN'],
  SK: ['SIKKIM'], TN: ['TAMILNADU', 'TAMIL NADU'], TS: ['TELANGANA'], TR: ['TRIPURA'], UP: ['UTTAR PRADESH'], UK: ['UTTARAKHAND'],
  WB: ['WEST BENGAL'],
};

/**
 * Words an address may use for a town besides its current name: former names, other spellings, and for the largest
 * cities the municipal areas that addresses give instead of the city. Keyed by town name as in towns-wanted.json.
 */
const ALIASES = {
  // Andhra Pradesh and Telangana
  Visakhapatnam: ['VISHAKHAPATNAM', 'VIZAG', 'VISAKHAPATANAM'], Vijayawada: ['BEZAWADA'], Kadapa: ['CUDDAPAH'],
  Rajahmundry: ['RAJAMAHENDRAVARAM', 'RAJAHMUNDHRY'], Anantapur: ['ANANTHAPUR', 'ANANTAPURAM', 'ANANTHAPURAMU'],
  Hyderabad: ['SECUNDERABAD'], Warangal: ['HANAMKONDA', 'HANUMAKONDA', 'KAZIPET'], Mahbubnagar: ['MAHABUBNAGAR'],
  Bhongir: ['BHUVANAGIRI'], Kothagudem: ['KOTHAGUDEM', 'BHADRACHALAM KOTHAGUDEM'],
  // Arunachal Pradesh, Assam and the north-east
  Aalo: ['ALONG'], Guwahati: ['GAUHATI'], Sivasagar: ['SIBSAGAR'], Nagaon: ['NOWGONG'], Gyalshing: ['GEYZING', 'GYALSHING'],
  // Chhattisgarh
  'Jashpur Nagar': ['JASHPUR'], Kawardha: ['KABIRDHAM'], 'Baloda Bazar': ['BALODABAZAR'], Bhilai: ['BHILAI NAGAR', 'BHILAINAGAR'],
  // Goa and Gujarat
  Panaji: ['PANJIM'], Margao: ['MADGAON', 'MARGAON'], 'Vasco da Gama': ['VASCO'], Vadodara: ['BARODA'], Mehsana: ['MAHESANA'],
  Morbi: ['MORVI'], Himmatnagar: ['HIMATNAGAR'], Deesa: ['DISA'], Bharuch: ['BROACH'],
  // Haryana, Himachal, Punjab, Uttarakhand, J&K
  Gurugram: ['GURGAON'], Yamunanagar: ['YAMUNA NAGAR'], Hisar: ['HISSAR'], Sonipat: ['SONEPAT'], Dharamshala: ['DHARAMSALA'],
  'Paonta Sahib': ['PAONTA', 'PONTA SAHIB'], 'Reckong Peo': ['RECKONGPEO', 'REKONG PEO'], Mohali: ['SAS NAGAR', 'S.A.S. NAGAR', 'SAHIBZADA AJIT SINGH NAGAR'],
  Rupnagar: ['ROPAR'], Firozpur: ['FEROZEPUR', 'FEROZPUR'], Nawanshahr: ['NAWAN SHAHR', 'SBS NAGAR', 'SHAHEED BHAGAT SINGH NAGAR'],
  Muktsar: ['SRI MUKTSAR SAHIB'], Dehradun: ['DEHRA DUN'], Kotdwar: ['KOTDWARA'], Kashipur: ['KASHIPUR'], Srinagar: ['SRI NAGAR'],
  // Jharkhand, Bihar, Odisha, West Bengal
  Medininagar: ['DALTONGANJ'], Bokaro: ['BOKARO STEEL CITY'], 'Bihar Sharif': ['BIHARSHARIF'], Ara: ['ARRAH'], Purnia: ['PURNEA'],
  Chhapra: ['CHAPRA'], Dehri: ['DEHRI-ON-SONE', 'DEHRI ON SONE', 'DALMIANAGAR'], 'Phulwari Sharif': ['PHULWARISHARIF', 'PHULWARI'],
  Bhubaneswar: ['BHUBANESHWAR'], Berhampur: ['BRAHMAPUR'], Balasore: ['BALESHWAR'], Balangir: ['BOLANGIR'], Keonjhar: ['KENDUJHAR'],
  Sonepur: ['SUBARNAPUR'], Paralakhemundi: ['PARLAKHEMUNDI'], Kolkata: ['CALCUTTA'], Berhampore: ['BAHARAMPUR', 'BEHRAMPORE'],
  Bardhaman: ['BURDWAN'], Midnapore: ['MEDINIPUR', 'MIDNAPUR'], 'Cooch Behar': ['COOCHBEHAR', 'KOCH BIHAR'], Contai: ['KANTHI'],
  Serampore: ['SERAMPUR', 'SRIRAMPUR', 'SHRIRAMPUR'], Chandannagar: ['CHANDERNAGORE'],
  // Karnataka and Kerala
  Bengaluru: ['BANGALORE', 'BANGLORE'], Mysuru: ['MYSORE'], Mangaluru: ['MANGALORE'], Hubballi: ['HUBLI'], Belagavi: ['BELGAUM'],
  Kalaburagi: ['GULBARGA'], Ballari: ['BELLARY'], Vijayapura: ['BIJAPUR'], Shivamogga: ['SHIMOGA'], Tumakuru: ['TUMKUR'],
  Chikkamagaluru: ['CHIKMAGALUR', 'CHICKMAGALUR'], Davanagere: ['DAVANGERE'], Doddaballapura: ['DODDABALLAPUR', 'DODDABALLAPURA'],
  Thiruvananthapuram: ['TRIVANDRUM'], Kochi: ['COCHIN', 'ERNAKULAM'], Kozhikode: ['CALICUT'], Thrissur: ['TRICHUR'], Kollam: ['QUILON'],
  Kannur: ['CANNANORE'], Palakkad: ['PALGHAT'], Alappuzha: ['ALLEPPEY'], Thalassery: ['TELLICHERRY'], Vatakara: ['VADAKARA', 'BADAGARA'],
  // Madhya Pradesh and Maharashtra
  Narmadapuram: ['HOSHANGABAD'], Neemuch: ['NIMACH'], 'Chhatrapati Sambhajinagar': ['AURANGABAD', 'SAMBHAJINAGAR', 'SAMBHAJI NAGAR'],
  Dharashiv: ['OSMANABAD'], Ahmednagar: ['AHILYANAGAR', 'AHMED NAGAR'], Mumbai: ['BOMBAY'],
  'Navi Mumbai': ['NEW MUMBAI', 'VASHI', 'NERUL', 'KHARGHAR', 'AIROLI', 'BELAPUR', 'KOPARKHAIRANE', 'KOPAR KHAIRANE', 'SANPADA', 'SEAWOODS', 'ULWE', 'KAMOTHE', 'GHANSOLI'],
  Dombivli: ['DOMBIVALI'], 'Vasai-Virar': ['VASAI', 'VIRAR', 'NALASOPARA', 'NALLASOPARA'], 'Mira-Bhayandar': ['MIRA ROAD', 'BHAYANDAR', 'BHAYANDER', 'MIRA BHAYANDAR'],
  // Rajasthan
  'Sri Ganganagar': ['GANGANAGAR'], Jhunjhunu: ['JHUNJHUNUN'],
  // Tamil Nadu and Puducherry
  Chennai: ['MADRAS'], Tiruchirappalli: ['TRICHY', 'TIRUCHIRAPALLI', 'TIRUCHIRAPPALLI', 'TIRUCHI'], Thoothukudi: ['TUTICORIN'],
  Ooty: ['OOTACAMUND', 'UDHAGAMANDALAM', 'OOTACAMUND'], Tiruppur: ['TIRUPUR'], Villupuram: ['VILUPPURAM'], Puducherry: ['PONDICHERRY'],
  // Uttar Pradesh
  Prayagraj: ['ALLAHABAD'], Varanasi: ['BANARAS', 'BENARES'], Ayodhya: ['AYODHYA'], Robertsganj: ['ROBERTS GANJ', 'SONBHADRA'],
  'Rae Bareli': ['RAEBARELI', 'RAI BAREILLY', 'RAEBARELY'], 'Ambedkar Nagar': ['AMBEDKARNAGAR', 'AKBARPUR'], Lakhimpur: ['LAKHIMPUR KHERI', 'KHERI'],
  'Greater Noida': ['GREATER NOIDA', 'GR. NOIDA', 'GR NOIDA'],
  // Union territories
  'Sri Vijaya Puram': ['PORT BLAIR', 'PORTBLAIR'],
};

/** Where the site already uses another name for a wanted town (build-town-facts.js's hand-checked lists), keep that one. */
const STORED_NAME = { JH: { Bokaro: 'Bokaro Steel City' }, BR: { Dehri: 'Dehri-on-Sone' } };

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s*').replace(/-/g, '[\\s-]*');
const wordsFor = (town) => [town.toUpperCase(), ...(ALIASES[town] ?? [])].map((w) => `\\b${escape(w)}\\b`);
const decode = (s) => (s ?? '').replace(/&#xD;&#xA;/g, ' ').replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&amp;/g, '&');

const records = input.split(',').flatMap((f) => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)));
const result = {};
const report = [];
for (const [code, towns] of Object.entries(WANTED)) {
  if (code.startsWith('_')) continue;
  if (code === 'DL') continue; // Delhi is one city; build-saras-csv.js sets it
  const names = STATE_NAMES[code] ?? [];
  const recs = records.filter((r) => names.includes((r.State ?? '').trim().toUpperCase()));
  const seen = new Set();
  const entries = towns.map((name) => ({ name, words: wordsFor(name), regexes: wordsFor(name).map((w) => new RegExp(w)) }));
  // Longer names first, so "Greater Noida" and "Navi Mumbai" are tried before "Noida" and "Mumbai".
  const ordered = [...entries].sort((a, b) => b.name.length - a.name.length);
  const counts = new Map(); // town -> pin -> {n, district}
  // The SARAS district of every school at each PIN, and the district names of the state: a town that is itself a
  // district name (Anand, Dhar) may claim a PIN only where that PIN's schools are mostly in its district, so an
  // address in Ahmedabad that mentions "Anand Nagar" cannot hand an Ahmedabad PIN to Anand.
  const districtsAtPin = new Map();
  const districtNames = new Set(recs.map((r) => (r.District ?? '').trim().toUpperCase()).filter(Boolean));
  for (const r of recs) {
    const pin = (r['Pin Code'] ?? '').trim();
    const d = (r.District ?? '').trim().toUpperCase();
    if (!/^\d{6}$/.test(pin) || !d) continue;
    const m = districtsAtPin.get(pin) ?? new Map();
    m.set(d, (m.get(d) ?? 0) + 1);
    districtsAtPin.set(pin, m);
  }
  // Districts were renamed in some states (Andhra Pradesh, 2022), so older and newer records at one PIN name different
  // districts; the town's district only has to appear among them.
  const districtAgrees = (t, pin) => [...(districtsAtPin.get(pin) ?? [])].some(([d]) => t.regexes.some((re) => re.test(d)));
  const isDistrictName = (t) => [...districtNames].some((d) => t.regexes.some((re) => re.test(d)));
  for (const r of recs) {
    const aff = r['Affiliation Number'];
    if (seen.has(aff)) continue;
    seen.add(aff);
    const address = decode(r['Postal Address']).toUpperCase();
    const pin = (r['Pin Code'] ?? '').trim();
    if (!/^\d{6}$/.test(pin)) continue;
    const town = ordered.find((t) => t.regexes.some((re) => re.test(address)));
    if (!town) continue;
    const district = (r.District ?? '').toUpperCase();
    const districtSaysSo = town.regexes.some((re) => re.test(district));
    const byPin = counts.get(town.name) ?? new Map();
    const cell = byPin.get(pin) ?? { n: 0, district: 0 };
    cell.n++;
    if (districtSaysSo) cell.district++;
    byPin.set(pin, cell);
    counts.set(town.name, byPin);
  }
  // Mistyped PINs are common in SARAS addresses (a Dhanbad PIN on a Patna school). Three checks keep them out:
  // the PIN's sorting prefix (first three digits) must be common in the state; it must sit at or next to the prefixes
  // most of the town's confirmed schools use; and a PIN only one school vouches for must share a prefix with a confirmed one.
  const prefixCount = new Map();
  for (const r of recs) {
    const pin = (r['Pin Code'] ?? '').trim();
    if (/^\d{6}$/.test(pin)) prefixCount.set(pin.slice(0, 3), (prefixCount.get(pin.slice(0, 3)) ?? 0) + 1);
  }
  const commonPrefix = (pin) => (prefixCount.get(pin.slice(0, 3)) ?? 0) >= 3;
  // A PIN claimed by two towns goes to the one more schools name; the other loses it.
  const claims = new Map();
  for (const [town, byPin] of counts) {
    const t = ordered.find((x) => x.name === town);
    const strong = [...byPin].filter(([pin, cell]) => cell.n >= 2 && commonPrefix(pin)
      && !(isDistrictName(t) && !districtAgrees(t, pin)));
    const strongTotal = strong.reduce((s, [, cell]) => s + cell.n, 0);
    const byPrefix = new Map();
    for (const [pin, cell] of strong) byPrefix.set(pin.slice(0, 3), (byPrefix.get(pin.slice(0, 3)) ?? 0) + cell.n);
    const core = [...byPrefix].filter(([, n]) => n >= strongTotal / 10).map(([p]) => Number(p));
    const nearCore = (pin) => core.length === 0 || core.some((p) => Math.abs(p - Number(pin.slice(0, 3))) <= 1);
    const strongPrefixes = new Set(strong.map(([pin]) => pin.slice(0, 3)));
    for (const [pin, cell] of byPin) {
      if (!commonPrefix(pin) || !nearCore(pin)) continue;
      if (isDistrictName(t) && !districtAgrees(t, pin)) continue;
      const confirmed = cell.n >= 2;
      // One school is enough when SARAS also lists the town as its district, or when the town already has confirmed
      // PINs in the same postal prefix (the school names the town; its neighbours with that prefix are confirmed).
      const vouched = cell.n === 1 && (cell.district >= 1 || strongPrefixes.has(pin.slice(0, 3)));
      if (confirmed || vouched) {
        const prev = claims.get(pin);
        if (!prev || prev.n < cell.n) claims.set(pin, { town, n: cell.n });
      }
    }
  }
  const list = [];
  for (const t of ordered) {
    const pins = [...claims].filter(([, c]) => c.town === t.name).map(([pin]) => pin).sort();
    if (pins.length === 0) { report.push(`${code} ${t.name}: no PIN found`); continue; }
    const n = pins.reduce((s, p) => s + counts.get(t.name).get(p).n, 0);
    list.push({ name: STORED_NAME[code]?.[t.name] ?? t.name, pins, words: t.words, schools: n });
  }
  result[code] = list;
}
fs.writeFileSync(out, JSON.stringify({
  _comment: 'Town → PIN codes, derived by derive-towns.js from CBSE SARAS postal addresses (a PIN counts for a town when at least two schools with that PIN name it, or one does and it is also the SARAS district). Words are the address spellings. Used by build-town-facts.js; rebuild rather than edit.',
  generatedOn: new Date().toISOString().slice(0, 10),
  states: result,
}, null, 1) + '\n');
for (const [code, list] of Object.entries(result)) {
  console.log(`${code}: ${list.length}/${WANTED[code].length} towns, ${list.reduce((s, t) => s + t.schools, 0)} schools`);
}
console.log(report.join('\n'));
