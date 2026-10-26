// Dumps readable text of a school's homepage plus its contact / about / mandatory-disclosure / facilities pages,
// so facts can be extracted by hand with the page URL as the source.
// Usage: node site-dump.js <outDir> "<School name>|<website>" ...
const fs = require('fs');
const path = require('path');
const [outDir, ...specs] = process.argv.slice(2);
fs.mkdirSync(outDir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const WANT = /(contact|disclos|appendix|about|facilit|infra|fee|admission|transport|timing)/i;

async function get(url) {
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, redirect: 'follow', signal: AbortSignal.timeout(45000) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('html')) return null;
    return { html: await res.text(), url: res.url };
  } catch {
    return null;
  }
}
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<(br|\/p|\/div|\/li|\/tr|\/h\d)[^>]*>/gi, '\n').replace(/<\/t[dh]>/gi, ' | ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

(async () => {
  for (const spec of specs) {
    const [name, site] = spec.split('|');
    const home = await get(site);
    let dump = `# ${name}\n# ${site}\n`;
    if (!home) {
      fs.writeFileSync(path.join(outDir, `${name.replace(/[^\w]+/g, '_')}.txt`), dump + 'HOMEPAGE NOT REACHABLE\n');
      console.log(`${name}: homepage not reachable`);
      continue;
    }
    dump += `\n===== ${home.url}\n${text(home.html).slice(0, 6000)}\n`;
    const links = [...home.html.matchAll(/<a[^>]+href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)]
      .map((m) => ({ href: m[1], label: m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() }))
      .filter((l) => WANT.test(l.label) || WANT.test(l.href))
      .map((l) => { try { return { ...l, href: new URL(l.href, home.url).href }; } catch { return null; } })
      .filter((l) => l && /^https?:/.test(l.href) && new URL(l.href).hostname === new URL(home.url).hostname && !/\.(pdf|jpe?g|png|docx?)$/i.test(l.href));
    const unique = [...new Map(links.map((l) => [l.href, l])).values()].slice(0, 8);
    const pdfs = [...home.html.matchAll(/href="([^"]+\.pdf)"/gi)].map((m) => { try { return new URL(m[1], home.url).href; } catch { return null; } })
      .filter((u) => u && /(disclos|appendix|fee|mpd)/i.test(u));
    for (const l of unique) {
      const page = await get(l.href);
      if (page) dump += `\n===== ${page.url}  [${l.label}]\n${text(page.html).slice(0, 7000)}\n`;
      await sleep(300);
    }
    if (pdfs.length) dump += `\n===== PDF links\n${[...new Set(pdfs)].join('\n')}\n`;
    fs.writeFileSync(path.join(outDir, `${name.replace(/[^\w]+/g, '_')}.txt`), dump);
    console.log(`${name}: ${unique.length} pages, ${pdfs.length} pdfs`);
  }
})();
