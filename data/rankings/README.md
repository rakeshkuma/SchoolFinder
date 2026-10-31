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

## Green Schools Programme, "Is Your School Green?" 2025-26

| File | Contents |
|---|---|
| `gsp-2025-26-import.csv` | The 65 schools matched to a directory school, in the admin import format, with their rating |

The programme's page lists 7,405 rated schools. A row was matched only when its name, state and district agreed with exactly one directory
school, so most government schools with differently written names are left out. Coordinators' names are never recorded. A rating is not a rank.
The site's terms page was empty when read on 2026-10-31 and its footer reads "Copyright 2026 Centre for Science and Environment".

Import under Admin → Published rankings, then approve the import after checking it. Nothing is public before approval.

## Sources not imported

EducationWorld and Cfore lists are not recorded here: EducationWorld's disclaimer page forbids reproduction on another website, and Cfore
reserves all rights. IIRF's terms also require written permission for reproduction. Load them through the admin import once the publisher agrees.
