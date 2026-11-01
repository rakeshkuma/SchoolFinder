# CBSE SARAS affiliation records

Raw school records from the CBSE affiliation directory (SARAS), <https://saras.cbse.gov.in/>, fetched one request at a
time by `tools/seed/saras-details-bulk.js` on 2026-10-24/25. Each line of a `.jsonl` file is one school exactly as SARAS
publishes it; `*-affs.txt` are the affiliation numbers that were requested.

| File | Contents |
|---|---|
| `central.jsonl` | Kendriya Vidyalayas, JNVs and the first Uttar Pradesh batch |
| `up-b.jsonl` | The second half of Uttar Pradesh (complete) |
| `others.jsonl` | The remaining states; **partial** (snapshot while fetching continued) |
| `uttar-pradesh.jsonl` | The three Uttar Pradesh schools added to SARAS since `central.jsonl`/`up-b.jsonl` were fetched (2026-10-31) |
| `jharkhand.jsonl` | The one Jharkhand school missing from the files above (Jharkhand is otherwise in `others.jsonl` and `central.jsonl`) |
| `bihar.jsonl` | Bihar, complete with `central.jsonl` (fetched 2026-10-30/31 from the Bihar state list, SARAS state id 3) |
| `delhi.jsonl` | Delhi, all 2,255 schools on the Delhi state list (SARAS state id 27, fetched 2026-10-31) |
| `haryana-ncr.jsonl` | Haryana's Delhi-NCR districts, Gurugram and Faridabad: 499 schools (from state id 5, 2026-10-31) |

Convert to import files (split into files of at most 4,500 rows):

```bash
node tools/seed/build-saras-csv.js data/saras/central.jsonl,data/saras/up-b.jsonl,data/saras/others.jsonl data/saras/import/schools.csv 2026-10-24
```

To continue fetching, re-run `saras-details-bulk.js` with `others-affs.txt` and `others.jsonl`: it skips numbers already
fetched. Keep the source attribution (`source_url` points at each school's SARAS page).

Towns (the `city` of each school) are assigned separately by `tools/seed/build-town-facts.js`, only where the PIN code and the
postal address agree; see `tools/seed/bihar-towns.json` , `tools/seed/jharkhand-towns.json`, `tools/seed/uttar-pradesh-towns.json`
and `tools/seed/haryana-ncr-towns.json`. Delhi rows get their city and neighbourhood (`locality`) from the address in
`build-saras-csv.js` itself.

A school already in the database is matched by its board and affiliation number, so a curated record must carry its
`affiliation_number` (the Delhi seed does) or the import creates a second copy. An update keeps the stored name: a board
list's spelling never renames a school. Two copies made before a curated record had its number can be folded together
locally with `LocalMergeDuplicates` (backend test sources), which checks the number, state and PIN of every pair first.

Names: a school whose name repeats within its state (ignoring punctuation, judged against every `.jsonl` here so the
result does not depend on the batch) gets a place from its postal address, skipping plot, lane and landmark parts, or
else its district; where two still match, both also get the district, and the builder prints any pair left for a
person to tell apart. Because updates never rename, a change to these rules reaches existing records through
`LocalRenameSchools` (backend test sources), which renames only schools still carrying their old list name.
