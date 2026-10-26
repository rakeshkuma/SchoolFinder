// Fetches web (HTML) or PDF mandatory disclosures for named schools and prints the ranking-relevant lines for review.
// Usage: PDFJS=<file url of pdf.mjs> node mpd-web.mjs "<name>|<url>" ...
const { getDocument } = await import(process.env.PDFJS ?? 'pdfjs-dist/legacy/build/pdf.mjs');

async function linesOf(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const type = res.headers.get('content-type') ?? '';
  if (type.includes('pdf') || url.endsWith('.pdf')) {
    const doc = await getDocument({ data: new Uint8Array(await res.arrayBuffer()), useSystemFonts: true }).promise;
    const out = [];
    for (let p = 1; p <= Math.min(doc.numPages, 8); p++) {
      let line = ''; let lastY = null;
      for (const it of (await (await doc.getPage(p)).getTextContent()).items) {
        const y = Math.round(it.transform[5]);
        if (lastY !== null && Math.abs(y - lastY) > 3) { out.push(line); line = ''; }
        line += it.str + ' '; lastY = y;
      }
      out.push(line);
    }
    return out;
  }
  const html = await res.text();
  return html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<\/t[dh]>/gi, ' | ').replace(/<(br|\/p|\/tr|\/li|\/div|\/h\d)[^>]*>/gi, '\n').replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').split('\n');
}

const KEY = /(RESULT|PASS|20(1|2)\d|TEACHERS|RATIO|SPECIAL EDUCATOR|COUNSELLOR|CAMPUS|LABORATOR|CWSN|BUILDING SAFETY|FIRE|WATER)/i;
for (const spec of process.argv.slice(2)) {
  const [name, url] = spec.split('|');
  console.log(`\n##### ${name}  (${url})`);
  try {
    const lines = (await linesOf(url)).map((l) => l.replace(/\s+/g, ' ').trim()).filter(Boolean);
    const hits = [];
    lines.forEach((l, i) => { if (KEY.test(l)) hits.push(i); });
    const keep = new Set();
    hits.forEach((i) => { for (let k = i; k < Math.min(i + 3, lines.length); k++) keep.add(k); });
    console.log([...keep].sort((a, b) => a - b).slice(0, 90).map((i) => '  ' + lines[i].slice(0, 200)).join('\n'));
  } catch (e) {
    console.log('  ERR ' + e.message);
  }
}
