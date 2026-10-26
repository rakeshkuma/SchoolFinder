// Builds backend/src/main/resources/seed/images.json (ImageRequest payloads keyed by school name) from
// Wikimedia Commons metadata fetched by commons-info.js. Only hand-checked, freely licensed files are listed.
// Usage: node build-images.js <commons-info.json> <out images.json>
const fs = require('fs');
const [infoPath, outPath] = process.argv.slice(2);
const info = Object.fromEntries(JSON.parse(fs.readFileSync(infoPath, 'utf8')).map((i) => [i.title, i]));

// school name -> [Commons file, image type, caption]
const SELECTED = {
  'Modern School Barakhamba Road': [
    ['File:Ig-building-pic2.jpg', 'CAMPUS', 'Platinum Jubilee Block, Modern School, Barakhamba Road'],
    ['File:Modern school Barakhamba road.jpg', 'SPORTS', 'Basketball court, Modern School, Barakhamba Road'],
  ],
  'Sanskriti School': [['File:Sanskriti School.jpg', 'CAMPUS', 'Sanskriti School campus amphitheatre']],
  'Springdales School Pusa Road': [['File:Going2.JPG', 'CAMPUS', 'School building, Springdales School, Pusa Road']],
  'PM SHRI Kendriya Vidyalaya NFC Vigyan Vihar': [
    ['File:PM SHRI KENDRIYA VIDYALAYA.jpg', 'CAMPUS', 'School signboard, PM SHRI Kendriya Vidyalaya, New Friends Centre, Vigyan Vihar'],
    ['File:Kv vigyan vihar main entry gate.jpg', 'CAMPUS', 'Main entry gate'],
    ['File:Kv NFC vigyan vihar inside.jpg', 'CAMPUS', 'Inside the school campus'],
  ],
  'Dr. Rajendra Prasad Kendriya Vidyalaya, President Estate': [
    ['File:The main entrance gate of Dr. Rajendra Prasad Kendriya Vidyalaya.jpg', 'CAMPUS', 'Main entrance gate, President’s Estate'],
    ['File:AI Lab at Dr. Rajendra Prasad Kendriya Vidyalaya.jpg', 'LABORATORY', 'Artificial Intelligence lab'],
  ],
};

const out = { _comment: 'Freely licensed photos from Wikimedia Commons, checked by hand. Each entry is an ImageRequest for POST /api/v1/admin/schools/{id}/images (JSON).', schools: [] };
for (const [school, files] of Object.entries(SELECTED)) {
  const images = files.map(([title, type, caption], i) => {
    const m = info[title];
    if (!m) throw new Error('no metadata for ' + title);
    return {
      imageType: type,
      url: m.url.split('?')[0],
      caption,
      altText: `${caption} (${school})`.slice(0, 300),
      credit: `${m.artist || 'Unknown'} / Wikimedia Commons`.slice(0, 200),
      license: m.license,
      sourceUrl: m.page,
      sortOrder: i,
    };
  });
  out.schools.push({ schoolName: school, images });
}
fs.writeFileSync(outPath, JSON.stringify(out, null, 2) + '\n');
console.log('images', out.schools.reduce((n, s) => n + s.images.length, 0));
