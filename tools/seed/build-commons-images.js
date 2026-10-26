// Builds an images file (see curated-images.json) from Wikimedia Commons files that a person has already reviewed:
// each must show the named school's buildings, gate or campus (no event or people photos) and be matched to exactly
// one profile, and name a real author (a file credited to e.g. "school photo" may not be the uploader's own work and is
// left out). Licence, author and description are read from the Commons API at build time.
//
// Usage: node build-commons-images.js <accepted.json> <out.json>
//   accepted.json: [{"slug": "...", "file": "File:Name.jpg", "school": "short name for alt text"}], or the same list
//   under "schools" (network-images-pending-review.json once its entries have been reviewed)
//
// Thumbnails use the standard 960 px width (Wikimedia serves only standard thumbnail sizes) when the original is
// wider; otherwise the original is used. Files under licences other than those mapped below are refused.
const fs = require('fs');

const [inPath, outPath] = process.argv.slice(2);
if (!inPath || !outPath) {
  console.error('usage: node build-commons-images.js <accepted.json> <out.json>');
  process.exit(2);
}
const UA = { 'User-Agent': 'IndiaSchoolFinder/0.1 (school directory; licensed campus photos)' };
const strip = (s) => (s || '').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = new Date().toISOString().slice(0, 10);
const PERMISSION = {
  'CC BY-SA 4.0': 'OPEN_LICENCE', 'CC BY-SA 3.0': 'OPEN_LICENCE', 'CC BY-SA 2.5': 'OPEN_LICENCE', 'CC BY-SA 2.0': 'OPEN_LICENCE',
  'CC BY 4.0': 'OPEN_LICENCE', 'CC BY 3.0': 'OPEN_LICENCE', 'CC BY 2.0': 'OPEN_LICENCE', FAL: 'OPEN_LICENCE',
  'GODL-India': 'OPEN_LICENCE', CC0: 'PUBLIC_DOMAIN', 'Public domain': 'PUBLIC_DOMAIN',
};

async function imageinfo(titles) {
  const params = new URLSearchParams({ action: 'query', format: 'json', titles: titles.join('|'), prop: 'imageinfo',
    iiprop: 'url|extmetadata|size', iiurlwidth: '960' });
  for (let attempt = 0; attempt < 6; attempt++) {
    const text = await (await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, { headers: UA })).text();
    if (text.startsWith('{')) return Object.values(JSON.parse(text).query.pages);
    await sleep(10000 * (attempt + 1)); // rate limited
  }
  throw new Error('Commons API kept rate limiting');
}

(async () => {
  const root = JSON.parse(fs.readFileSync(inPath, 'utf8').replace(/^﻿/, ''));
  const accepted = Array.isArray(root) ? root : root.schools; // a bare list, or {"schools": [...]} like the pending file
  const pages = [];
  for (let i = 0; i < accepted.length; i += 40) {
    pages.push(...await imageinfo(accepted.slice(i, i + 40).map((a) => a.file)));
    await sleep(3000);
  }
  const byTitle = new Map(pages.map((p) => [p.title, p]));
  const schools = [];
  for (const a of accepted) {
    const p = byTitle.get(a.file.replace(/_/g, ' '));
    const ii = p?.imageinfo?.[0];
    if (!ii) {
      console.log(`  ${a.file}: not found on Commons`);
      continue;
    }
    const m = ii.extmetadata ?? {};
    const license = strip(m.LicenseShortName?.value);
    const permissionStatus = PERMISSION[license];
    if (!permissionStatus) {
      console.log(`  ${a.file}: licence '${license}' is not on the accepted list, skipped`);
      continue;
    }
    const artist = strip(m.Artist?.value) || 'Unknown author';
    const description = strip(m.ImageDescription?.value).slice(0, 200);
    const year = (strip(m.DateTimeOriginal?.value).match(/\b(19|20)\d{2}\b/) ?? [])[0];
    const clean = (u) => u.split('?')[0]; // the API appends utm_* tracking parameters
    schools.push({ slug: a.slug, images: [{
      imageType: 'CAMPUS',
      url: clean(ii.url),
      thumbnailUrl: clean(ii.width > 960 ? ii.thumburl : ii.url),
      caption: `${description || a.school}${year ? ` (${year})` : ''}`.slice(0, 300),
      altText: `Campus of ${a.school}`.slice(0, 300),
      credit: `${artist} / Wikimedia Commons`.slice(0, 200),
      license,
      attributionText: permissionStatus === 'OPEN_LICENCE' ? `${artist}, ${license}, via Wikimedia Commons`.slice(0, 500) : null,
      permissionStatus,
      sourceUrl: ii.descriptionurl,
      sortOrder: 0,
    }] });
  }
  fs.writeFileSync(outPath, JSON.stringify({
    _comment: `Openly licensed campus photos from Wikimedia Commons, reviewed by eye on ${today}: each shows the named school's buildings, gate or campus and was matched to one profile by the place in its description or the signboard in the photo. Licence, author and description were read from the Commons API. Load with LocalImageImport or import-to-server.js.`,
    schools,
  }, null, 2));
  console.log(`wrote ${schools.length} of ${accepted.length}`);
})().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
