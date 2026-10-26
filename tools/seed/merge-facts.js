// Merges facts files (see school-facts.json) by slug; for the same fact of the same school, the later file wins.
// Usage: node merge-facts.js <out.json> "<comment>" <in1.json> <in2.json> ...
const fs = require('fs');

const [outPath, comment, ...inputs] = process.argv.slice(2);
if (!outPath || inputs.length === 0) {
  console.error('usage: node merge-facts.js <out.json> "<comment>" <in1.json> [in2.json ...]');
  process.exit(2);
}
const merged = new Map();
for (const file of inputs) {
  for (const s of JSON.parse(fs.readFileSync(file, 'utf8').replace(/^﻿/, '')).schools) {
    merged.set(s.slug, { ...(merged.get(s.slug) ?? {}), ...s.facts });
  }
}
const schools = [...merged].map(([slug, facts]) => ({ slug, facts }));
fs.writeFileSync(outPath, JSON.stringify({ _comment: comment, schools }, null, 1));
const count = (k) => schools.filter((s) => s.facts[k]).length;
console.log(`wrote ${schools.length} schools: classes=${count('classes')} location=${count('location')} city=${count('city')}`);
