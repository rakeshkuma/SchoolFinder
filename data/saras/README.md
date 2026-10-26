# CBSE SARAS affiliation records

Raw school records from the CBSE affiliation directory (SARAS), <https://saras.cbse.gov.in/>, fetched one request at a
time by `tools/seed/saras-details-bulk.js` on 2026-10-24/25. Each line of a `.jsonl` file is one school exactly as SARAS
publishes it; `*-affs.txt` are the affiliation numbers that were requested.

| File | Contents |
|---|---|
| `central.jsonl` | Kendriya Vidyalayas, JNVs and the first Uttar Pradesh batch |
| `up-b.jsonl` | The second half of Uttar Pradesh (complete) |
| `others.jsonl` | The remaining states; **partial** (snapshot while fetching continued) |

Convert to import files (split into files of at most 4,500 rows):

```bash
node tools/seed/build-saras-csv.js data/saras/central.jsonl,data/saras/up-b.jsonl,data/saras/others.jsonl data/saras/import/schools.csv 2026-10-24
```

To continue fetching, re-run `saras-details-bulk.js` with `others-affs.txt` and `others.jsonl`: it skips numbers already
fetched. Keep the source attribution (`source_url` points at each school's SARAS page).
