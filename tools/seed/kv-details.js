// Reads official facts from each Kendriya Vidyalaya's own kvs.ac.in site (standard NIC template):
//   /en/contact-us/                                   phone, e-mail
//   /en/class-social-category-wise-enrolment-position/ classes running and students enrolled
//   /en/kvs-vision-and-mission/                        KVS statement: co-educational, bilingual medium
// Usage: node kv-details.js <seed.csv> <out.json>
const fs = require('fs');
const [csvPath, outPath] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<[^>]+>/g, '|').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&#8211;/g, '-').replace(/\s+/g, ' ').replace(/(\|\s*)+/g, '|');

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(60000) });
      if (res.ok) return await res.text();
      if (res.status === 404) return null;
    } catch {
      /* retry */
    }
    await sleep(3000);
  }
  return null;
}

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

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

(async () => {
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n');
  const header = parseCsvLine(lines[0]);
  const schools = lines.slice(1).map((l) => Object.fromEntries(parseCsvLine(l).map((v, i) => [header[i], v])))
    .filter((s) => /kvs\.ac\.in/.test(s.website_url));
  const result = {};
  for (const s of schools) {
    const base = new URL(s.website_url).origin;
    const contact = await get(`${base}/en/contact-us/`);
    const enrol = await get(`${base}/en/class-social-category-wise-enrolment-position/`);
    const mission = null; // KVS policy statement is the same for every KV; read once from a reference KV site
    const r = { base };
    if (contact) {
      const t = text(contact);
      const email = t.match(/E-?mail[^|]*\|[:\s-]*([^|]+)/i)?.[1]?.replace(/\[at\]/gi, '@').replace(/\[dot\]/gi, '.').replace(/\s+/g, '').trim();
      const phone = t.match(/Phone[^|]*\|[:\s-]*([^|]+)/i)?.[1]?.trim();
      if (email && /@/.test(email)) r.email = email.split(/[,;]/)[0];
      if (phone && /\d{6,}/.test(phone.replace(/\D/g, ''))) r.phone = phone.replace(/^[:\s-]+/, '');
      r.contactUrl = `${base}/en/contact-us/`;
    }
    if (enrol) {
      const t = text(enrol);
      const classes = new Set();
      let students = 0;
      const rows = [...t.matchAll(/\|\s*((?:Bal ?vatika|Balvatika)[^|]*|[IVX]{1,4}(?:\s*[-–(]?\s*[A-Za-z. ]+\)?)?)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|/gi)];
      for (const m of rows) {
        const cls = m[1].trim().match(/^[IVX]{1,4}/i)?.[0]?.toUpperCase() ?? '';
        if (ROMAN.includes(cls)) classes.add(cls);
        students += Number(m[4]);
      }
      if (classes.size) {
        r.classCodes = ROMAN.filter((c) => classes.has(c));
        r.studentsEnrolled = students;
        r.balvatika = rows.some((m) => /vatika/i.test(m[1]));
        r.enrolmentUrl = `${base}/en/class-social-category-wise-enrolment-position/`;
        r.enrolmentUpdated = t.match(/(\d{2}\/\d{2}\/\d{4})\|(?:Feedback|$)/)?.[1] ?? null;
      }
    }
    if (mission) {
      const t = text(mission);
      r.coEd = /co-educational/i.test(t);
      r.bilingual = /bilingual medium/i.test(t);
      r.missionUrl = `${base}/en/kvs-vision-and-mission/`;
    }
    result[s.name] = r;
    console.log(`${s.name} | ${r.phone ?? '-'} | ${r.email ?? '-'} | ${(r.classCodes ?? []).join(',') || '-'} | ${r.studentsEnrolled ?? '-'} | coEd=${r.coEd} bi=${r.bilingual}`);
    await sleep(300);
  }
  fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
})();
