// Lists files and subcategories under Wikimedia Commons school categories for Delhi (polite, with backoff).
// Usage: node commons-category.js <out.json> "Category:Schools in Delhi" [...more categories]
const fs = require('fs');
const [outPath, ...roots] = process.argv.slice(2);
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; local development)' };
const API = 'https://commons.wikimedia.org/w/api.php';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const res = await fetch(`${API}?${new URLSearchParams({ format: 'json', ...params })}`, { headers: UA });
    const text = await res.text();
    if (text.startsWith('{')) return JSON.parse(text);
    await sleep(5000 * (attempt + 1)); // rate limited
  }
  throw new Error('Commons API kept rate limiting');
}

(async () => {
  const seen = new Set();
  const queue = roots.map((c) => [c, 0]);
  const result = {};
  while (queue.length) {
    const [cat, depth] = queue.shift();
    if (seen.has(cat) || depth > 2) continue;
    seen.add(cat);
    const data = await api({ action: 'query', list: 'categorymembers', cmtitle: cat, cmlimit: '200', cmtype: 'file|subcat' });
    const members = data.query?.categorymembers ?? [];
    result[cat] = members.filter((m) => m.ns === 6).map((m) => m.title);
    console.log(`${'  '.repeat(depth)}${cat}: ${result[cat].length} files`);
    for (const m of members.filter((m) => m.ns === 14)) queue.push([m.title, depth + 1]);
    await sleep(1500);
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
})();
