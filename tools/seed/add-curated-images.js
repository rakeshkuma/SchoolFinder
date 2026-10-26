// Adds hand-selected Wikimedia Commons photos to curated-images.json, building each ImageRequest from the licence,
// author and description the Commons API returned (commons-info.js output). Files already listed are skipped.
// Usage: node add-curated-images.js <commons-info.json[,more.json]> <selection.json> [curated-images.json]
//   selection.json: [{ "slug": "...", "title": "File:...", "imageType": "CAMPUS", "caption": "...", "altText": "..." }]
// Only freely licensed files (public domain, CC0, CC BY, CC BY-SA, GODL-India) are accepted.
const fs = require('fs');
const path = require('path');
const [infoArg, selectionPath, curatedArg] = process.argv.slice(2);
const curatedPath = curatedArg ?? path.join(__dirname, 'curated-images.json');
const read = (p) => JSON.parse(fs.readFileSync(p, 'utf8').replace(/^﻿/, ''));

const info = Object.fromEntries(infoArg.split(',').flatMap((p) => read(p)).map((i) => [i.title, i]));
const selection = read(selectionPath);
const curated = read(curatedPath);
const FREE = /^(public domain|cc0|cc by(-sa)? [\d.]+|godl-india)$/i;
const clean = (u) => u.split('?')[0];

let added = 0;
for (const s of selection) {
  const i = info[s.title];
  if (!i) throw new Error(`no Commons metadata for ${s.title}`);
  if (!FREE.test(i.license)) throw new Error(`${s.title}: licence "${i.license}" is not on the accepted list`);
  const url = clean(i.url);
  // 1200px renditions live under /thumb/; a 640px rendition of the same file serves cards.
  const thumbnailUrl = /\/thumb\//.test(url) ? url.replace(/\/\d+px-/, '/640px-') : url;
  const pd = /^(public domain|cc0)$/i.test(i.license);
  const artist = i.artist.replace(/\s+/g, ' ').trim();
  const image = {
    imageType: s.imageType ?? 'CAMPUS', url, thumbnailUrl, caption: s.caption, altText: s.altText,
    credit: `${artist} / Wikimedia Commons`, license: i.license,
    attributionText: pd ? null : `${artist}, ${i.license}, via Wikimedia Commons`,
    permissionStatus: pd ? 'PUBLIC_DOMAIN' : 'OPEN_LICENCE', sourceUrl: i.page, sortOrder: s.sortOrder ?? 0,
  };
  let entry = curated.schools.find((e) => e.slug === s.slug);
  if (!entry) curated.schools.push(entry = { slug: s.slug, images: [] });
  if (entry.images.some((x) => x.sourceUrl === image.sourceUrl)) continue;
  entry.images.push(image);
  added++;
}
fs.writeFileSync(curatedPath, JSON.stringify(curated, null, 2) + '\n', 'utf8');
console.log(`added ${added} image(s); ${curated.schools.length} schools in ${path.basename(curatedPath)}`);
