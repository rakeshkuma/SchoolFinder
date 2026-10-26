// State-wise list of CBSE-affiliated schools from CBSE SARAS (the board's public affiliation directory).
// Usage: node saras-state.js <sarasStateId> <out.json>      e.g. node saras-state.js 18 sikkim.json
// One search request per state; the list page already carries the fields we need, so no per-school requests.
const fs = require('fs');
const [stateId, out] = process.argv.slice(2);
const URL_ = 'https://saras.cbse.gov.in/SARAS/AffiliatedList/ListOfSchdirReport';
const clean = (s) => s.replace(/<[^>]+>/g, '|').replace(/&#x27;/g, "'").replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
  .replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '|');

(async () => {
  const first = await fetch(URL_, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(90000) });
  const cookies = (first.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
  const html = await first.text();
  const token = html.match(/name="__RequestVerificationToken" type="hidden" value="([^"]+)"/)[1];
  const body = new URLSearchParams({ MainRadioValue: 'State_wise', State: stateId, District: '', RegiAffNo: '0',
    __RequestVerificationToken: token });
  const res = await fetch(URL_, { method: 'POST', body, signal: AbortSignal.timeout(300000),
    headers: { 'User-Agent': 'Mozilla/5.0', Cookie: cookies, 'Content-Type': 'application/x-www-form-urlencoded' } });
  const page = await res.text();
  if (process.env.DUMP) fs.writeFileSync(process.env.DUMP, page);
  const rows = [];
  for (const m of page.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)) {
    const t = clean(m[1]);
    const g = (label) => (t.match(new RegExp(label.replace(/[.()]/g, '\\$&') + '\\s*:\\s*\\|([^|]*)')) || [])[1]?.trim() || null;
    if (!g('Aff. No.')) continue;
    rows.push({ raw: t });
  }
  fs.writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`state ${stateId}: ${rows.length} rows, http ${res.status}`);
})();
