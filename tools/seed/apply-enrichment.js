// Applies hand-checked facts (enrichment JSON keyed by school name) to the seed CSV.
// Each entry: { source, note?, <csv column>: value, ... }. Columns are overwritten only when given;
// the note and its source URL are appended to the description so every added fact stays traceable.
// Usage: node apply-enrichment.js <seed.csv> <enrichment.json> [more.json ...]
const fs = require('fs');
const [csvPath, ...jsonPaths] = process.argv.slice(2);

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') quoted = false; else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ',') { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out;
}
const csv = (v) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
const header = parseCsvLine(lines[0]);
const rows = lines.slice(1).map(parseCsvLine);
const col = (name) => {
  const i = header.indexOf(name);
  if (i < 0) throw new Error('unknown column ' + name);
  return i;
};

let changed = 0;
for (const jsonPath of jsonPaths) {
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  for (const [name, facts] of Object.entries(data)) {
    if (name.startsWith('_')) continue;
    const row = rows.find((r) => r[0] === name);
    if (!row) throw new Error(`school not in CSV: ${name}`);
    const { source, note, ...columns } = facts;
    for (const [key, value] of Object.entries(columns)) row[col(key)] = String(value);
    const desc = col('description');
    const addition = `${note ? note + ' ' : ''}Contact and other details from the school's website: ${source}`;
    if (!row[desc].includes(source)) row[desc] = `${row[desc]} ${addition}`.trim();
    changed++;
  }
}
fs.writeFileSync(csvPath, [header.map(csv).join(','), ...rows.map((r) => r.map(csv).join(','))].join('\n') + '\n');
console.log(`updated ${changed} schools`);
