// Assigns a town ("city") to CBSE schools from their SARAS postal address, only when two independent signals agree:
// the PIN code belongs to that town's post office AND the address names the town. Village schools and anything
// ambiguous are left without a town. Output is a school-facts file (see LocalFactsImport / import-to-server.js).
// Usage: node build-town-facts.js <saras.jsonl[,more.jsonl]> <apiBase> <out.json> [stateCode=BR]
// (only records of that state are used; apiBase resolves affiliation numbers to slugs)
const fs = require('fs');
const [input, apiBase, out, stateCode = 'BR'] = process.argv.slice(2);
const STATE_NAMES = { BR: 'BIHAR', JH: 'JHARKHAND', UP: 'UTTAR PRADESH', DL: 'DELHI', HR: 'HARYANA' };

// Town → PIN codes of its post offices and the words its addresses use. Checked against India Post PINs in the data
// (2026-10-30); extend with care, one town at a time.
const TOWNS_BY_STATE = { BR: [
  { name: 'Buxar', pins: ['802101', '802103'], words: [/\bBUXAR\b/] },
  { name: 'Dumraon', pins: ['802119'], words: [/\bDUMRAON\b/] },
  { name: 'Dhansoi', pins: ['802117'], words: [/\bDHANSOI\b/] },
  { name: 'Itarhi', pins: ['802123'], words: [/\bITARHI\b/] },
  { name: 'Ara', pins: ['802301', '802302'], words: [/\bARA\b/, /\bARRAH\b/] },
  { name: 'Sasaram', pins: ['821113', '821115'], words: [/\bSASARAM\b/, /\bSASSARAM\b/] },
  { name: 'Dehri-on-Sone', pins: ['821305', '821307', '821308'], words: [/\bDEHRI\b/] },
  { name: 'Dinara', pins: ['802213'], words: [/\bDINARA\b/] },
  { name: 'Sitamarhi', pins: ['843302'], words: [/\bSITAMARHI\b/, /\bSITA MARHI\b/] },
  { name: 'Dumra', pins: ['843301'], words: [/\bDUMRA\b/] },
  { name: 'Pupri', pins: ['843320'], words: [/\bPUPRI\b/] },
  { name: 'Runnisaidpur', pins: ['843328'], words: [/\bRUNNI ?SAIDPUR\b/, /\bRUNISAIDPUR\b/] },
  { name: 'Nokha', pins: ['802215', '802217'], words: [/\bNOKHA\b/] },
  { name: 'Kochas', pins: ['821112'], words: [/\bKOCHAS\b/] },
  // Phase 3 (2026-10-31): district headquarters and large towns. Cities with many post offices use their PIN range.
  { name: 'Patna', pins: [/^8000[0-3]\d$/], words: [/\bPATNA\b/] },
  { name: 'Danapur', pins: ['801503'], words: [/\bDANAPUR\b/] },
  { name: 'Gaya', pins: [/^82300[1-4]$/], words: [/\bGAYA\b/] },
  { name: 'Bodh Gaya', pins: ['824231'], words: [/\bBODH ?GAYA\b/, /\bBODHGAYA\b/] },
  { name: 'Muzaffarpur', pins: [/^84200[1-5]$/], words: [/\bMUZAFFARPUR\b/] },
  { name: 'Darbhanga', pins: [/^84600[1-9]$/], words: [/\bDARBHANGA\b/] },
  { name: 'Siwan', pins: ['841226'], words: [/\bSIWAN\b/] },
  { name: 'Chhapra', pins: ['841301'], words: [/\bCHHAPRA\b/, /\bCHAPRA\b/] },
  { name: 'Motihari', pins: ['845401'], words: [/\bMOTIHARI\b/] },
  { name: 'Bettiah', pins: ['845438'], words: [/\bBETTIAH\b/, /\bBETIAH\b/] },
  { name: 'Begusarai', pins: ['851101'], words: [/\bBEGUSARAI\b/] },
  { name: 'Bhagalpur', pins: [/^81200[1-7]$/], words: [/\bBHAGALPUR\b/] },
  { name: 'Purnia', pins: ['854301'], words: [/\bPURNIA\b/, /\bPURNEA\b/] },
  { name: 'Bihar Sharif', pins: ['803101'], words: [/\bBIHAR ?SHARIF\b/, /\bBIHARSHARIF\b/] },
  { name: 'Rajgir', pins: ['803116'], words: [/\bRAJGIR\b/] },
  { name: 'Aurangabad', pins: ['824101'], words: [/\bAURANGABAD\b/] },
  { name: 'Hajipur', pins: ['844101'], words: [/\bHAJIPUR\b/] },
  { name: 'Samastipur', pins: ['848101'], words: [/\bSAMASTIPUR\b/] },
  { name: 'Madhubani', pins: ['847211'], words: [/\bMADHUBANI\b/] },
  { name: 'Katihar', pins: ['854105'], words: [/\bKATIHAR\b/] },
  { name: 'Munger', pins: ['811201'], words: [/\bMUNGER\b/] },
  { name: 'Nawada', pins: ['805110'], words: [/\bNAWADA\b/] },
  { name: 'Jehanabad', pins: ['804408'], words: [/\bJEHANABAD\b/] },
  { name: 'Gopalganj', pins: ['841428'], words: [/\bGOPALGANJ\b/] },
  { name: 'Kishanganj', pins: ['855107'], words: [/\bKISHANGANJ\b/] },
  { name: 'Saharsa', pins: ['852201'], words: [/\bSAHARSA\b/] },
  { name: 'Bhabua', pins: ['821101'], words: [/\bBHABUA\b/] },
], JH: [
  // Phase 4 (2026-10-31). Jamshedpur addresses often give only the neighbourhood, so those count with a Jamshedpur PIN;
  // Jugsalai and Mango are separate municipalities and are left out.
  { name: 'Ranchi', pins: [/^8340(0\d|1[0-2])$/], words: [/\bRANCHI\b/] },
  { name: 'Jamshedpur', pins: [/^8310(0\d|1[0-9])$/],
    words: [/\bJAMSHEDPUR\b/, /\bSAKCHI\b/, /\bBISTUPUR\b/, /\bKADMA\b/, /\bSONARI\b/, /\bTELCO\b/, /\bGOLMURI\b/, /\bBARIDIH\b/,
      /\bSIDHGORA\b/, /\bPARSUDIH\b/] },
  { name: 'Dhanbad', pins: [/^82600[1-5]$/], words: [/\bDHANBAD\b/] },
  { name: 'Jharia', pins: ['828111'], words: [/\bJHARIA\b/] },
  { name: 'Sindri', pins: ['828122'], words: [/\bSINDRI\b/] },
  { name: 'Bokaro Steel City', pins: [/^8270(0\d|1[0-2])$/], words: [/\bBOKARO\b/] },
  { name: 'Chas', pins: ['827013'], words: [/\bCHAS\b/] },
  { name: 'Hazaribagh', pins: ['825301'], words: [/\bHAZARIBAGH?\b/] },
  { name: 'Ramgarh', pins: ['829122'], words: [/\bRAMGARH\b/] },
  { name: 'Deoghar', pins: ['814112'], words: [/\bDEOGHAR\b/] },
  { name: 'Dumka', pins: ['814101'], words: [/\bDUMKA\b/] },
  { name: 'Giridih', pins: ['815301'], words: [/\bGIRIDIH\b/] },
  { name: 'Jhumri Telaiya', pins: ['825409'], words: [/\bJHUMRI ?TELAIYA\b/, /\bTELAIYA\b/] },
  { name: 'Koderma', pins: ['825410'], words: [/\bKODERMA\b/] },
  { name: 'Medininagar', pins: ['822101'], words: [/\bMEDININAGAR\b/, /\bDALTONGANJ\b/] },
  { name: 'Chaibasa', pins: ['833201'], words: [/\bCHAIBASA\b/] },
  { name: 'Latehar', pins: ['829206'], words: [/\bLATEHAR\b/] },
  { name: 'Gumla', pins: ['835207'], words: [/\bGUMLA\b/] },
  { name: 'Lohardaga', pins: ['835302'], words: [/\bLOHARDAGA\b/] },
  { name: 'Simdega', pins: ['835223'], words: [/\bSIMDEGA\b/] },
  { name: 'Pakur', pins: ['816107'], words: [/\bPAKUR\b/] },
  { name: 'Godda', pins: ['814133'], words: [/\bGODDA\b/] },
  { name: 'Sahibganj', pins: ['816109'], words: [/\bSAHIBGANJ\b/, /\bSAHEBGANJ\b/] },
  { name: 'Garhwa', pins: ['822114'], words: [/\bGARHWA\b/] },
  { name: 'Chatra', pins: ['825401'], words: [/\bCHATRA\b/] },
  { name: 'Khunti', pins: ['835210'], words: [/\bKHUNTI\b/] },
  { name: 'Jamtara', pins: ['815351'], words: [/\bJAMTARA\b/] },
], UP: [
  // Phase 5 (2026-10-31). Greater Noida comes before Noida: both share a district, and an address saying "Greater
  // Noida" also contains "Noida". Ayodhya includes the former Faizabad city (one municipal corporation).
  { name: 'Greater Noida', pins: ['201306', '201308', '201310', '201318', '203207', '201009'],
    words: [/\bGREATER NOIDA\b/, /\bGR\.? ?NOIDA\b/] },
  { name: 'Noida', pins: ['201301', '201303', '201304', '201305', '201307', '201309', '201313', '201316', '201317'], words: [/\bNOIDA\b/] },
  { name: 'Ghaziabad', pins: [/^2010(0[1-9]|1[0-7])$/], words: [/\bGHAZIABAD\b/] },
  { name: 'Lucknow', pins: [/^2260([0-2]\d|30)$/], words: [/\bLUCKNOW\b/] },
  { name: 'Meerut', pins: [/^25000[1-6]$/], words: [/\bMEERUT\b/] },
  { name: 'Agra', pins: [/^2820(0[1-9]|10)$/], words: [/\bAGRA\b/] },
  { name: 'Varanasi', pins: [/^2210(0\d|1[01])$/], words: [/\bVARANASI\b/, /\bBANARAS\b/] },
  { name: 'Gorakhpur', pins: [/^2730(0\d|1[0-6])$/], words: [/\bGORAKHPUR\b/] },
  { name: 'Prayagraj', pins: [/^2110(0\d|1\d)$/], words: [/\bPRAYAGRAJ\b/, /\bALLAHABAD\b/] },
  { name: 'Vrindavan', pins: ['281121'], words: [/\bVRINDAVAN\b/, /\bVRINDABAN\b/] },
  { name: 'Mathura', pins: [/^28100[1-8]$/], words: [/\bMATHURA\b/] },
  { name: 'Kanpur', pins: [/^2080([01]\d|2[0-7])$/], words: [/\bKANPUR\b/] },
  { name: 'Bareilly', pins: [/^24300[1-6]$/], words: [/\bBAREILLY\b/] },
  { name: 'Aligarh', pins: ['202001', '202002'], words: [/\bALIGARH\b/] },
  { name: 'Moradabad', pins: ['244001'], words: [/\bMORADABAD\b/] },
  { name: 'Jhansi', pins: [/^28400[1-3]$/], words: [/\bJHANSI\b/] },
  { name: 'Ayodhya', pins: ['224001'], words: [/\bAYODHYA\b/, /\bFAIZABAD\b/] },
  { name: 'Saharanpur', pins: ['247001'], words: [/\bSAHARANPUR\b/] },
  { name: 'Muzaffarnagar', pins: [/^25100[1-3]$/], words: [/\bMUZAFFARNAGAR\b/] },
  { name: 'Firozabad', pins: ['283203'], words: [/\bFIROZABAD\b/] },
  { name: 'Bulandshahr', pins: ['203001'], words: [/\bBULANDSHAHA?R\b/] },
  { name: 'Jaunpur', pins: ['222001', '222002'], words: [/\bJAUNPUR\b/] },
  { name: 'Azamgarh', pins: ['276001'], words: [/\bAZAMGARH\b/] },
  { name: 'Ghazipur', pins: ['233001'], words: [/\bGHAZIPUR\b/] },
  { name: 'Ballia', pins: ['277001'], words: [/\bBALLIA\b/] },
  { name: 'Deoria', pins: ['274001'], words: [/\bDEORIA\b/] },
  { name: 'Hapur', pins: ['245101'], words: [/\bHAPUR\b/] },
  { name: 'Shahjahanpur', pins: ['242001'], words: [/\bSHAHJAHANPUR\b/] },
  { name: 'Rampur', pins: ['244901'], words: [/\bRAMPUR\b/] },
], HR: [
  // Phase 6 (2026-10-31): the Haryana part of Delhi-NCR.
  // A town named after "Teh." (its tehsil) or "Near" is not where the school is, so those mentions do not count.
  // Ballabgarh comes before Faridabad: its addresses usually name both, and Ballabgarh is the more exact place.
  { name: 'Gurugram', pins: [/^1220\d\d$/], words: [/\bGURUGRAM\b/, /\bGURGAON\b/, /\bGURGOAN\b/] },
  { name: 'Sohna', pins: ['122103'], words: [/(?<!(TEH|NEAR)\W{0,3})\bSOHNA\b/] },
  { name: 'Pataudi', pins: ['122503'], words: [/(?<!(TEH|NEAR)\W{0,3})\bPATAUDI\b/] },
  { name: 'Farrukhnagar', pins: ['122506'], words: [/(?<!(TEH|NEAR)\W{0,3})\bFARRUKH ?NAGAR\b/] },
  { name: 'Ballabgarh', pins: ['121004'], words: [/(?<!(TEH|NEAR)\W{0,3})\bBALLABH?GARH\b/] },
  { name: 'Faridabad', pins: [/^1210\d\d$/], words: [/\bFARIDABAD\b/] },
] };
const TOWNS = TOWNS_BY_STATE[stateCode] ?? [];

// SARAS escapes some characters as HTML entities (&#x2B; for "+"); decode them as the site does when it stores a name.
const decode = (s) => s.replace(/&#xD;&#xA;/g, ' ')
  .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16))).replace(/&amp;/g, '&');

(async () => {
  const seen = new Set();
  const recs = input.split(',').flatMap((f) => fs.readFileSync(f, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)))
    .filter((r) => (r.State ?? '').trim().toUpperCase() === STATE_NAMES[stateCode])
    .filter((r) => !seen.has(r['Affiliation Number']) && seen.add(r['Affiliation Number']));
  const schools = [];
  const skipped = { noTown: 0, notFound: 0 };
  for (const r of recs) {
    const address = decode(r['Postal Address'] ?? '').toUpperCase();
    // A pin is an exact PIN code or a pattern for towns with many post offices (Patna: /^8000\d\d$/).
    const pinMatches = (t) => t.pins.some((p) => (p instanceof RegExp ? p.test(r['Pin Code'] ?? '') : p === r['Pin Code']));
    const town = TOWNS.find((t) => pinMatches(t) && t.words.some((w) => w.test(address)));
    if (!town) { skipped.noTown++; continue; }
    const res = await fetch(`${apiBase}/schools/search?q=${encodeURIComponent(`${decode(r['Name of Institution'])} ${r['Pin Code'] ?? ''}`.trim())}&state=${stateCode}&size=50`);
    const page = await res.json();
    let slug = null;
    for (const s of page.content ?? []) {
      const d = await (await fetch(`${apiBase}/schools/${s.id}`)).json();
      if (d.affiliationNumber === r['Affiliation Number']) { slug = d.slug; break; }
    }
    if (!slug) { skipped.notFound++; continue; }
    schools.push({ slug, facts: { city: { name: town.name, source: {
      url: `https://saras.cbse.gov.in/SARAS/AffiliatedList/AfflicationDetails/${r['Affiliation Number']}`,
      retrievedDate: new Date().toISOString().slice(0, 10),
      note: `CBSE postal address "${decode(r['Postal Address']).replace(/\s+/g, ' ').trim()}", PIN ${r['Pin Code']}.`,
    } } } });
  }
  fs.writeFileSync(out, JSON.stringify({ _comment: 'Towns of CBSE schools, from the SARAS postal address and PIN code (both must agree). Built by build-town-facts.js.', schools }, null, 1) + '\n');
  const byTown = {};
  schools.forEach((s) => { byTown[s.facts.city.name] = (byTown[s.facts.city.name] ?? 0) + 1; });
  console.log(`${schools.length} schools with a town; skipped ${JSON.stringify(skipped)}`, byTown);
})();
