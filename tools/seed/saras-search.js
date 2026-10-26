// Keyword search on CBSE SARAS. Usage: node saras-search.js "<keyword>" [stateFilter]
const [keyword, state = 'DELHI'] = process.argv.slice(2);
const URL_ = 'https://saras.cbse.gov.in/SARAS/AffiliatedList/ListOfSchdirReport';
const clean = (s) => s.replace(/<[^>]+>/g, '|').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '|');

(async () => {
  const first = await fetch(URL_, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  const cookies = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const html = await first.text();
  const token = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/)[1];
  const body = new URLSearchParams({ MainRadioValue: 'Keyword_wise', InstName_orAddress: keyword, RegiAffNo: '0', __RequestVerificationToken: token });
  const res = await fetch(URL_, { method: 'POST', body, headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookies, 'Content-Type': 'application/x-www-form-urlencoded' } });
  const page = await res.text();
  for (const m of page.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const t = clean(m[1]);
    const g = (label) => (t.match(new RegExp(label + '\\s*:\\s*\\|([^|]*)')) || [])[1]?.trim();
    if (!g('Aff. No.') || g('State') !== state) continue;
    console.log([g('Aff. No.'), g('Sch. Code'), g('District'), g('Name'), g('Address')].join(' | '));
  }
})();
