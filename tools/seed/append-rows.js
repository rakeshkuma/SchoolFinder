// Appends rows produced by a generator script to the seed CSV and reports duplicate school names.
// Usage: node append.js <generator.js> <details.json> <seed.csv>
const fs = require('fs');
const { execFileSync } = require('child_process');
const [gen, details, csvPath] = process.argv.slice(2);
const rows = execFileSync('node', [gen, details]).toString();
let current = fs.readFileSync(csvPath, 'utf8');
if (!current.endsWith('\n')) current += '\n';
const next = current + rows;
fs.writeFileSync(csvPath, next);
const lines = next.trim().split('\n');
const names = lines.slice(1).map((l) => (l.startsWith('"') ? l.slice(1, l.indexOf('",')) : l.split(',')[0]));
console.log('rows', names.length, 'duplicates', names.filter((n, i) => names.indexOf(n) !== i));
