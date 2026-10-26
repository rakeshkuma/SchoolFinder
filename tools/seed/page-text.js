// Saves the visible text of official web pages (one request at a time) for fact extraction.
// Usage: node page-text.js <urls.txt> <outDir> [delayMs=1500]
const fs = require('fs');
const path = require('path');
const [list, outDir, delayArg] = process.argv.slice(2);
const delay = Number(delayArg ?? 1500);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|li|h\d|tr|td)>/gi, '\n').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/&#8217;/g, "'").replace(/&#038;/g, '&')
  .replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n').trim();

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  for (const url of fs.readFileSync(list, 'utf8').split(/\s+/).filter(Boolean)) {
    const file = path.join(outDir, url.replace(/^https?:\/\//, '').replace(/[^a-z0-9]+/gi, '_') + '.txt');
    if (fs.existsSync(file)) continue;
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      fs.writeFileSync(file, `URL: ${url}\nHTTP: ${res.status}\n\n${text(await res.text())}`);
      console.log(res.status, url);
    } catch (e) {
      console.log('ERR', url, e.message);
    }
    await sleep(delay);
  }
})();
