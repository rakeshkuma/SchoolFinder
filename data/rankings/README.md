# Published rankings by other organisations

Positions published by other organisations, recorded per school with a link to the publisher's page. They are shown
on the "Published rankings" page and on school profiles, apart from India School Finder's own score, and never count
towards it. An entry is shown only once an editor has marked it VERIFIED against the publisher's page.

## IIRF Top (10+2) Schools in India 2026

| File | Contents |
|---|---|
| `iirf-2026-top-schools.json` | The whole list as IIRF printed it on 2026-10-30: position, state position, name, place (220 schools sharing 128 positions) |
| `iirf-2026-import.csv` | The 91 entries matched to a directory school, in the admin import format (`school_slug`) |

Only positions and places are recorded, not IIRF's criterion scores (the page reserves reproduction). A school was
matched only when its name and place both agree with one directory record; entries naming a chain without a branch
("Ryan International School, Gurugram", "Ramjas School, New Delhi"), with a contradictory place ("DPS - Chandigarh"
placed in New Delhi) or for schools not in the directory were left out rather than guessed.

To load on a server (admin token in `$T`):

```bash
curl -X PUT "$API/admin/ranking-publishers/IIRF" -H "Authorization: Bearer $T" -H 'Content-Type: application/json' \
  -d '{"name":"IIRF (International Institutional Ranking Framework)","kind":"SURVEY","websiteUrl":"https://iirfranking.com/","active":true}'
curl -X POST "$API/admin/import/external-rankings?mode=ALL_OR_NOTHING" -H "Authorization: Bearer $T" \
  -F "file=@data/rankings/iirf-2026-import.csv"
```

Imported entries are UNVERIFIED; an editor verifies each one under Admin → Published rankings (or
`POST /admin/external-rankings/{id}/verify`) after checking it against the publisher's page.
