// Looks up OSM features for free-text queries (no bounding box) and prints candidates for manual review.
// Usage: node geocode-any.js "query 1" "query 2" ...
const UA = { 'User-Agent': 'IndiaSchoolFinder-dev/0.1 (local development)' };
(async () => {
  for (const q of process.argv.slice(2)) {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=4&countrycodes=in&q=${encodeURIComponent(q)}`;
    const data = await (await fetch(url, { headers: UA })).json();
    console.log(`== ${q}`);
    // The OSM object URL is the citable source for a confirmed match.
    for (const d of data) {
      console.log(`   ${d.lat},${d.lon} | ${d.category}/${d.type} | https://www.openstreetmap.org/${d.osm_type}/${d.osm_id} | ${d.display_name}`);
    }
    await new Promise((r) => setTimeout(r, 1300));
  }
})();
