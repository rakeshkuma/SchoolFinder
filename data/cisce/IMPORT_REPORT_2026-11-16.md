# School database expansion: CISCE schools with verified websites (16 Nov 2026)

This was a database-only change. No frontend, API, ranking, filter, SEO or design code was changed. Every new school
went in through the site's own admin import with `updateExisting=false`, so a row matching an existing school is
refused, never merged.

## Results (from PostgreSQL queries)

| | Before | After |
|---|---:|---:|
| School rows | 33,072 | **33,634** |
| Active schools | 33,047 | **33,609** |
| CISCE (ICSE/ISC) schools | 36 | **598** |
| New rows (id > 33137) | — | **562**; all CISCE, active, with a website and a district |
| Existing rows changed by the import | — | **0** (none updated between 14:30 and 14:31 UTC, the import window) |
| Duplicate CISCE codes | — | 0 |
| New districts created | — | 0 (every school uses a district already on the site) |
| Import errors | — | 0 (validation run: 562 valid; import: 562 created, 0 updated) |

62 existing rows had changed earlier the same day, 13:02–13:31 UTC, before the import:
- the Sainik School network correction (49 rows);
- the photo work, which recalculates a school's profile score.

**Backup taken before the import:** `/var/backups/schooldhundo/india_school_finder-pre-cisce-2026-11-16.dump` on the
database server. A nightly dump also exists.

## Where the schools came from and what happened to them

The source is CISCE's official school locator, https://locate.cisce.org/. It was read page by page with an honest
User-Agent, one page every 1.5 seconds. Its robots.txt allows all clients ("User-agent: * Allow: /").

| Step | Schools |
|---|---:|
| Listed by CISCE (336 pages) | 3,359 |
| Outside India | −7 |
| No website listed by CISCE (not eligible) | −2,032 |
| Address not readable (no PIN 4, town 24) or district not confirmed (2) | −30 |
| Already on the site: likely duplicates, skipped (`run-2026-11-16/duplicates.json`) | −126 |
| **Candidates whose website was checked** | **1,164** |
| Website not verified (`run-2026-11-16/unverified.json`) | −600 |
| Passed the checks but rejected on manual review (`manual-rejections.json`) | −2 |
| **Inserted** (`run-2026-11-16/inserted-schools.csv`) | **562** |

Altogether, 2,634 schools were rejected because they had no website or one that could not be verified (2,032 + 600 + 2).

### How a website was verified

All four conditions had to hold:
1. **robots.txt:** the site's robots.txt allows the page.
2. **A real page:** it answers HTTP 200 with HTML after at most 5 redirects. It is not a parked, suspended, directory,
   aggregator or social-media page.
3. **Names the school:** the page shows every distinctive word of the school's name. If it redirects to another domain,
   that page's title must name the school.
4. **Names the place:** the page shows the school's town, district or PIN code.

Obvious typing slips in CISCE's list were corrected mechanically before checking, for example
`https://https://…` or `www,school,com`. The corrected address still had to pass all four checks.

Why the 600 failed:

| Reason | Schools |
|---|---:|
| Domain no longer exists | 219 |
| Page does not name the school | 84 |
| Page does not name the town, district or PIN | 73 |
| Broken or invalid security certificate | 64 |
| No readable content (JavaScript-only or empty) | 56 |
| Site returned an error page | 41 |
| Site did not answer | 34 |
| Not the school's own site (directory, or a redirect elsewhere) | 15 |
| robots.txt disallows | 7 |
| Parked or suspended domain | 4 |
| Site says the school is aided (school type cannot be set without checking) | 3 |

Two schools passed the automatic checks but were rejected on review:
- **Holy Path Convent School, Ballia:** the site is a computer institute.
- **Boys and Girls School and College, Pratapgarh:** the site is a study-abroad consultancy.

### What each new record holds

**From CISCE's locator:**
- name and CISCE school code (stored as the affiliation number);
- address, town, PIN code and state;
- principal;
- co-ed, boys or girls;
- day school, or boarding available ("Residential", "Day/Residential", "Day/Boarding");
- the source link, which is the locator page that lists the school.

**From the website check:** the verified website address.

**District:** taken from the address when it names a known district. Otherwise it is the district that every other
school on the site with the same PIN code is filed under, as given by CBSE's records. A few old spellings are mapped to
the current name, for example Belgaum to Belagavi and Shimoga to Shivamogga.

**Classes:** left unknown. CISCE gives only the exams: ICSE for Class X, ISC for Class XII.

**School type:** the database requires one, and CISCE does not state it. Schools are PRIVATE with management left
unknown, matching the 36 CISCE schools already listed. A school whose name says "Government" would be GOVERNMENT; there
were none. Schools whose own site says they are aided were not imported.

**Search visibility:** by the site's own indexing rule (`SchoolRepository.INDEXABLE`), these profiles carry noindex and
stay out of the sitemap until they hold more than board-list facts, such as a description, fees, admissions, a photo or
facilities. They are visible on the site, in search and in every filter.

## New schools by state

| State | New | State | New | State | New |
|---|---:|---|---:|---|---:|
| West Bengal | 89 | Kerala | 16 | Gujarat | 7 |
| Uttar Pradesh | 81 | Madhya Pradesh | 16 | Himachal Pradesh | 6 |
| Karnataka | 69 | Odisha | 14 | Chhattisgarh | 4 |
| Maharashtra | 66 | Haryana | 10 | Sikkim | 4 |
| Punjab | 42 | Andhra Pradesh | 8 | Chandigarh | 3 |
| Tamil Nadu | 35 | Telangana | 8 | Goa | 3 |
| Jharkhand | 29 | Rajasthan | 8 | Puducherry | 2 |
| Uttarakhand | 23 | Bihar | 17 | Assam, Tripura | 1 each |

**Districts:** 194 districts gained schools. The most were:

| District | New schools |
|---|---:|
| Bengaluru Urban | 45 |
| Kolkata | 34 |
| Mumbai | 28 |
| Dehradun | 17 |
| Lucknow | 13 |
| Darjeeling | 12 |
| Mumbai Suburban | 11 |
| Ranchi | 10 |
| Pune | 10 |

The full list is in `inserted-schools.csv`.

## Sources not used, and why

- **CBSE (incl. KV, JNV, Sainik, Army Public Schools):** already complete. All CBSE schools were imported from SARAS on
  13–14 Nov 2026.
- **IB (ibo.org):** answers HTTP 403 to automated clients, even for robots.txt. It was not worked around.
- **Cambridge (cambridgeinternational.org):** the site showed "Website unavailable – maintenance in progress" on 16 Nov.
  Try again later.
- **State boards and UDISE+:** no official directory lists school websites. UDISE+ needs JavaScript, and data.gov.in
  refused automated access earlier. Lakhs of state-board schools exist, but without a verifiable website they are not
  eligible under this brief.
- **Wikidata:** its "schools" with websites are mostly colleges and medical colleges, and almost none state a board or
  management type, so school type could not be set honestly.

## Possible duplicates to review

`run-2026-11-16/duplicates.json` lists the 126 CISCE schools that were **not** inserted, each with the existing school
it seems to match. Some may be different schools with a similar name in the same town, for example:
- Gitanjali School, Begumpet;
- Gitanjali High School, a CBSE school at another PIN in Hyderabad.

They can be added one by one after checking.

## Re-running

The tools are in `tools/cisce/`:
1. `fetch-locate.mjs`
2. `build-candidates.mjs`
3. `verify-websites.mjs`
4. `build-batches.mjs`
5. `import_batches.py`, which runs on the web server and reads the admin password from the server's own file.

A re-run cannot duplicate: the import matches a school by board plus CISCE code, and with `updateExisting=false` it
refuses that row.
