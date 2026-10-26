# India School Finder

**Discover Schools. Compare Fees. Prepare for Success.**

A full-stack school discovery platform for all 28 states and 8 union territories of India: search, compare and
evaluate schools with **source-linked** fees, admissions, facilities, locations and a transparent, evidence-based
ranking. (Formerly *Delhi School Finder*; the code, packages, artifacts and default database names now use
India School Finder too. The first migration's header comment keeps the old name because applied migrations must not
change.)

## Roadmap status

| Phase | Scope | Status |
|---|---|---|
| 1 — Foundation | India-wide states/UTs & districts, UDISE/affiliation/management/network fields, search & filters (state, district, city, management, network, day/boarding, transport), autocomplete, saved & recently viewed schools, search history controls, shareable URLs, list/map split view, state & district directories, rebrand | **Done** |
| 2 — Core education | Fee sorting, fee calculator & comparison upgrades (4+ schools, print/share), admissions calendar alerts, data-source tracking per field (verified / school-submitted / third-party / estimated), correction-request queue, import jobs & review queue | Next |
| 3 — Exam preparation | Exam catalog with sourced dates, derived statuses, search/filters, notices, SEO and editor workflow, exam finder, month-by-month calendar with .ics export, saved exams, practice quizzes and timed mock tests with server-side scoring (**done**, see "Entrance exams" below); larger question bank, analytics (planned) | In progress |
| 4 — Accounts & monetization | User accounts & roles, synced favourites, school claims, subscriptions, Razorpay (after verifying current integration requirements), labelled sponsored listings, consent-based enquiries | Started: member accounts (sign-up, email verification, sign-in/out, optional Google sign-in, password reset/change, profile, deletion). Synced favourites and the rest planned |
| 5 — Production readiness | Deployment guide, production compose, CI, data import to a server, backups (**done**, see DEPLOYMENT.md); prerendering/SSR, sitemaps, E2E & load tests (planned) | Partly done |

- **Backend:** Java 25, Spring Boot 3.5.16 (Web MVC, Data JPA/Hibernate, Validation, Security + JWT, Actuator),
  PostgreSQL, Flyway, springdoc-openapi (Swagger UI), Maven
- **Frontend:** React 18 + TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hook Form, Recharts, Leaflet/OpenStreetMap
- **Infra:** Docker + Docker Compose, Cloudinary (optional) for image uploads

```
india-school-finder/
├── backend/            Spring Boot API (Controller → Service → Repository → PostgreSQL)
│   ├── src/main/java/com/indiaschoolfinder/{config,security,controller,service,service/impl,
│   │                     repository,entity,dto,mapper,exception,validation,specification,enums,scheduler,util}
│   ├── src/main/resources/application*.properties, db/migration (Flyway), seed/delhi-schools.csv
│   ├── src/test/java   unit + integration tests (real PostgreSQL)
│   ├── pom.xml, mvnw, Dockerfile
├── frontend/           React app (components, pages, services, types, hooks, utils), nginx.conf, Dockerfile
├── data/saras/         raw CBSE SARAS records (source data for the CBSE import)
├── tools/seed/         fetch, build and import scripts; curated private-school files
├── docker-compose.yml, docker-compose.prod.yml
├── DEPLOYMENT.md
└── .env.example
```

## Data integrity rules (enforced in code)

- **Nothing is invented.** Unknown values are stored as `NULL` and shown as “Not available” — never `0` or placeholder text.
  The fee calculator refuses to total a schedule with an unknown component and lists what is missing.
- **Every record has a source URL** (DB `NOT NULL` + validation), a verification status and a last-verified date.
  New or edited data is `UNVERIFIED` until an administrator records a verification that cites a source
  (`POST /api/v1/admin/schools/{id}/verify`), which is stored in an append-only verification history.
- **Images** are stored as URL + metadata only; a licence/permission and source page are mandatory.
  Each image also records `permissionStatus` (PUBLIC_DOMAIN, OPEN_LICENCE, WRITTEN_PERMISSION, PURCHASED_LICENCE,
  OWN_WORK, PENDING, REVOKED), `attributionText` (required for open licences), `permissionNote` (required for written
  permission), `thumbnailUrl` and `illustrative`. PENDING/REVOKED images are kept for admins
  (`GET /api/v1/admin/schools/{id}/images`) but never served publicly; illustrations are labelled "Illustration, not a
  photo of this school" and can never be a logo. Editing a copyrighted image does not make it usable.
- **Imports never overwrite a VERIFIED school**: with `updateExisting=true` such rows are reported as errors and
  skipped (VALID_ROWS_ONLY) so verified data is changed only through the admin editor.
- **Rankings** use only verified evidence. Missing criteria are not scored as zero; results below 70 % data coverage are
  *provisional* and get no rank position. The site states everywhere that this is not an official government ranking.

### What data is actually included

The seed is **real, source-linked data — not sample data — but it is unverified** and it covers **Delhi only**
(80 schools). No other state has schools yet; state pages say so plainly rather than showing filler.

- `seed/delhi-schools.csv` — 80 Delhi schools (including 46 Kendriya Vidyalayas and 2 Jawahar Navodaya Vidyalayas),
  each with a `source_url` to the official page it was read from. Coordinates come from OpenStreetMap Nominatim only
  where a confident match existed. `management`/`network` are set only for KVs and JNVs, because their official names
  state it; every other school's management is left unknown. Districts and UDISE codes are not yet recorded.
- `seed/fees-and-admissions.json` — fee schedules and admission cycles read from official school pages on 2026-10-24.
  Components a page does not itemise are `null` (never 0) and the page's own wording is kept in `notes`.
- `seed/images.json` — image URLs with licence and source page.

All seeded records are `UNVERIFIED` until an administrator records a verification against the cited source.
Test fixtures (names like "Test Public School") exist only in the test suite and never reach a real database.

### CBSE schools across India (from CBSE SARAS)

`tools/seed/` contains a repeatable pipeline that reads the **CBSE SARAS affiliation directory**
(<https://saras.cbse.gov.in/>, the board's public register) and turns it into the import CSV:

```bash
node tools/seed/saras-state.js <sarasStateId> state.json          # 1 request per state: affiliation numbers
node tools/seed/saras-details-bulk.js affs.txt details.jsonl 1000  # 1 request at a time, resumable
node tools/seed/build-saras-csv.js details.jsonl schools.csv 2026-10-24
# More than 4,500 rows are written as schools-1.csv, schools-2.csv, ... (one import accepts at most 5,000 rows);
# import each file in turn. tools/seed/saras-import-loop.ps1 does this automatically.
cd backend && ./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalCsvImport \
  -Dspring-boot.run.arguments="../schools.csv VALIDATE_ONLY"           # then VALID_ROWS_ONLY
```

What is taken from SARAS: official name, affiliation number, school type (KV, JNV, government, aided, independent),
state, district, postal address, PIN, website, year of foundation, affiliation level and period. Each profile's
`source_url` is its SARAS affiliation page. Mapping rules: KV/JNV → government, central-government management and the
matching network; `GOVT` → government (management left unknown: central vs state is not stated); aided → government-aided;
independent → private unaided. Generic official names ("GOVT. SR. SEC. SCHOOL") get the place from the official
postal address appended so profiles are distinguishable; the exact CBSE name is kept in the description.
**Not inferred:** classes offered (the affiliation level gives only the highest class), city, map coordinates, phone,
e-mail and fees — these show "Not available" until another official source provides them.
Display names are tidied mechanically (`SchoolNames.tidy`, applied on every import and to existing SARAS rows by the
V14 migration): stray punctuation (`, & Phugana`, `Chendayad .`), district markers (`Dt-`) and a place read twice from
the address (`Bagrakot Bagrakot`, only after the first comma, so names like "Ess Ess Convent School" are kept). Words
and spellings are never changed; the exact CBSE name stays in the description. Social-media pages are not
used as sources. Every imported school stays `UNVERIFIED` until an administrator checks it.

`LocalCsvImport` (dev-only, in `src/test`) imports through the same validated service as Admin → CSV import, against the
database started by `LocalDevApplication`. Delhi's CBSE schools are not imported this way yet, because the 80 existing
Delhi profiles have no affiliation numbers to match on and would be duplicated.

### Curated private schools (official school websites)

`tools/seed/up-private-schools.csv` holds Uttar Pradesh private schools that are **not** CBSE-affiliated (so absent from
SARAS), read from each school's own website on 2026-10-24: the 22 City Montessori School campuses (Lucknow), St. Francis'
College (Lucknow), St. Joseph's College and Boys' High School and College (Prayagraj). Each row cites the exact page its
facts came from. Values a page did not state are blank — e.g. CMS pages never say "unaided", so management is unknown;
principal is blank where a page names two people; classes are filled only where a page states the range. La Martinière
College was left out because its official site could not be read. Import with Admin → CSV import or `LocalCsvImport`.

`tools/seed/curated-private-schools.json` does the same for Bihar, Jharkhand and Haryana (read 2026-10-25), in the JSON
import format: Bishop Westcott Boys' School (Namkum), Loreto Convent (Doranda) and Loyola School (Jamshedpur), St. Xavier's
High School (Patna; board left blank because its site links to both ICSE and BSEB), The Shri Ram School Aravali and Pathways
World School (Gurugram). Don Bosco Academy Patna (site returned an error) and St. Joseph's Convent Patna (no official site
found) were left out. `LocalCsvImport` accepts `.json` files as well as `.csv`.

### Adding classes, map locations and cities to existing profiles

Profiles imported from SARAS lack classes, coordinates and often a city. `PATCH /api/v1/admin/schools/{id}/facts` adds
any of these **without touching other fields**, and each fact records its own source (`school_fact_source`), shown on the
profile's Sources tab and at `GET /api/v1/schools/{id}/fact-sources`. A change makes the profile unverified again.
`tools/seed/school-facts.json` holds such facts for 20 schools outside Delhi (read 2026-10-25): classes quoted from each
school's site, locations from OpenStreetMap objects whose name and address matched (mismatches were rejected and are
listed in the file's comment). Load with `LocalFactsImport` (same arguments as `LocalImageImport`) or
`import-to-server.js`. `node tools/seed/geocode-any.js "School name, City"` prints OSM candidates with their URLs.

`tools/seed/jnv-facts.json` does the same for all 646 Jawahar Navodaya Vidyalayas with a CBSE affiliation level:
classes VI–XII (VI–X for the 20 affiliated only to Secondary), citing the Government of India statement that Navodaya
Vidyalayas teach "from Class VI to XII" with admission at Class VI (PIB, 6 Dec 2024), and map locations for the 70
JNVs that `tools/seed/match-osm.js` matched to OpenStreetMap. The matcher accepts a match only on an equal PIN, or when
the OSM school is the only one in the profile's district and the directory holds one JNV there; the other 576 are listed
in `tools/seed/jnv-location-review.csv` for manual review (most simply are not mapped on OSM). Rebuild with
`node tools/seed/build-jnv-facts.js <jnvs.json> jnv-facts.json <locations.json>`.

`tools/seed/kv-facts.json` covers Kendriya Vidyalayas outside Delhi: classes for 1,030 of 1,192, read by
`tools/seed/kv-classes.js` from the "Class & social category wise enrolment position" table each Vidyalaya publishes
on its own `*.kvs.ac.in` site (robots.txt permits it). A class counts when its row lists a section; a table is used only
if every label is recognised and the classes form a continuous range of at least four starting at Balvatika or Class I.
The 162 others (gaps such as a missing Class V, unreadable labels, sites off kvs.ac.in or unreachable) are in
`kv-classes-review.csv` with the reason. Locations for 133 KVs come from `match-osm.js` (`kv-location-review.csv`), and
for 922 more from the map each Vidyalaya embeds on its own Contact Us page (`tools/seed/kv-locations.js`): only the
coordinates are used, citing that page, and only when the embedded place is named as a KV, the map view is at most
40 km wide, no other school's page embeds the same point and an OSM reverse lookup puts it in the profile's state
(`kv-contact-location-review.csv` lists the 183 rejected). Measured against the 116 KVs that have both sources, they
agree within 0.5 km for 83% and within 2 km for 91%; the 11 larger disagreements are in `kv-location-conflicts.csv`
and keep their OSM location until reviewed. The state check also found profiles whose state is out of date (KVs in
Secunderabad listed under Andhra Pradesh by CBSE); those need a correction, not a location.
Features named after a school but not the school (`"KV ground"`, `"JNV Office building"`) are excluded.

`tools/seed/network-images.json` adds openly licensed Wikimedia Commons campus photos for 13 Navodaya and Kendriya
Vidyalayas (from the Commons categories "Jawahar Navodaya Vidyalaya" and "Kendriya Vidyalaya"). Each was looked at
before use: buildings, gate or campus only (no event or people photos), matched to one profile by the place in its
description or a signboard in the photo, with a real named author (a file credited to "school photo" was left out).
`tools/seed/build-commons-images.js` builds such files from the Commons API; it stores the original and a standard
960 px thumbnail (Wikimedia serves only standard thumbnail widths) without tracking parameters. 32 more matched files
await the same visual review in `tools/seed/network-images-pending-review.json` (Commons rate-limited the downloads).

`tools/seed/jnv-admissions.json` gives every JNV its Class VI admission cycle for 2027-28 from the official JNVST 2027
prospectus on the NVS admission portal (`tools/seed/build-jnv-admissions.js` quotes it): selection test on 28 November
2026, last date to apply 31 July 2026 (no opening date is given, so none is recorded), eligibility by district, class
and date of birth, result expected by end of March 2027. Load with `LocalAdmissionsImport` or `import-to-server.js`;
loading again updates the same cycle. Because the cycle is identical for every JNV, `GET /admissions` takes
`excludeNetwork=JAWAHAR_NAVODAYA_VIDYALAYA` and the notifications page summarises them once instead of listing 648 copies.

A wrong fact is retracted with `"clear": ["LOCATION"]` (or `CLASSES`, `CITY`) in the same PATCH body, which removes the
value and its source; dated files such as `tools/seed/corrections-2026-10-25.json` record such retractions so every
database that loaded the earlier data can apply them.

### Adding schools from other states

Import a CSV through **Admin → CSV import** (validate first). Required columns: `name`, `school_type`, `source_url` and
`state_code` (ISO 3166-2:IN code such as `UP`, or the full name; a `state` column also works). Optional India-wide
columns: `district`, `city`, `management` (`CENTRAL_GOVERNMENT`, `STATE_GOVERNMENT`, `LOCAL_BODY`, `GOVERNMENT_AIDED`,
`PRIVATE_UNAIDED`, `OTHER`), `network` (`KENDRIYA_VIDYALAYA`, `JAWAHAR_NAVODAYA_VIDYALAYA`, `SAINIK_SCHOOL`,
`EKLAVYA_MODEL_RESIDENTIAL_SCHOOL`), `udise_code` (11 digits) and `affiliation_number`. Download the full template from
the import page.

- **Duplicates:** a row matches an existing school by UDISE code; otherwise by name + PIN within the same state, so a
  later import can attach a UDISE code to an existing profile (`updateExisting=true`). Generic names like "Government
  Primary School" may repeat across states, and within a state when they have distinct UDISE codes.
- **Districts** are not pre-seeded (no list was available to verify); the first record naming a district creates it and
  writes a `DISTRICT_CREATED` audit entry. Check spelling in the validation report before committing.
- Only import datasets you are permitted to use (e.g. published government data under its licence terms, school-supplied
  data, licensed provider feeds) and keep their source URL. Do not scrape sites against their terms.

## Run locally

### Option A — Docker Compose (PostgreSQL + API + web)

```bash
cp .env.example .env      # set POSTGRES_PASSWORD, JWT_SECRET (≥32 bytes), ADMIN_BOOTSTRAP_USERNAME/PASSWORD
docker compose up --build
```

Web: http://localhost:3000 · API: http://localhost:8080 · Swagger UI: http://localhost:8080/swagger-ui.html

### Option B — without Docker (embedded PostgreSQL)

Requires only Java 25 and Node 18+.

```bash
cd backend
./mvnw spring-boot:test-run -Dspring-boot.run.main-class=com.indiaschoolfinder.LocalDevApplication
```

This starts real PostgreSQL binaries on port 54329 (data in `backend/target/local-pg`, which `mvn clean` keeps), applies the Flyway migrations,
loads the seed CSV, and — if `ADMIN_BOOTSTRAP_PASSWORD` is not set — creates an `admin` user with a random password
printed in the console. Then, in another terminal:

```bash
cd frontend
npm install
npm run dev               # http://localhost:5173 (proxies /api to :8080)
```

### Option C — your own PostgreSQL

Create a database and user, set `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, and run
`./mvnw spring-boot:run` (profile `dev` by default).

## Tests

```bash
cd backend && ./mvnw test     # 209 tests: unit + integration against real PostgreSQL
cd frontend && npm test       # 60 tests: formatting, storage, finders, geo, exam dates, calendar files, study plans, cards, sign-in redirects
cd frontend && npm run build  # type-check + production build
```

Integration tests use **Testcontainers** (`postgres:16-alpine`) when Docker is available and fall back to embedded
PostgreSQL binaries otherwise (`-Disf.test.db=testcontainers|embedded` forces one). Coverage includes school
creation/update, duplicate prevention, search filters, pagination/sorting and the sort allow-list, haversine nearby
search, fee calculation (no double counting, deposits, estimates, unknown components), fee comparison, ranking
calculation/provisional rules/weights, admission status derivation and overrides, validation failures (missing source
URLs, invalid fees, bad PIN/coordinates), CSV import modes, review moderation, verification history, JWT expiry/tampering/
role escalation, 401/403 handling, rate limiting, CORS and the global error format. Member accounts (`AccountApiIT`,
`AccountCookieFlowIT`, `GoogleSignInIT`, `MailConfigTest`): registration and hashing, email verification and expired links, generic
sign-in errors and lockout, session fixation, sign-out invalidating the session, the real CSRF cookie/header flow,
"keep me signed in", single-use expiring reset links that end every session, password change signing out other
devices, account deletion, separation of member and staff credentials, and refusal of self-assigned roles; Google
sign-in (new account, return path, forged state, cancel, unverified email, linking, takeover attempts, deletion
without a password).

## API overview (`/api/v1`)

| Area | Endpoints |
|---|---|
| Schools | `GET /schools`, `/schools/search`, `/schools/featured?state=&limit=` (schools with a real photo cleared for publication, verified first; not a ranking), `/schools/suggest?q=` (autocomplete, rate limited), `/schools/nearby`, `/schools/{id}`, `/schools/slug/{slug}`, `/schools/{id}/fees`, `/admissions`, `/facilities`, `/images`, `/ranking`, `/reviews`; `POST /schools/{id}/reviews` |
| Suggested updates | `POST /schools/{id}/update-submissions` (public, rate limited: topic, message, required official `sourceUrl`, role, optional reply e-mail; honeypot field `website`); admin `GET /admin/update-submissions?status=NEW`, `/count`, `PATCH /admin/update-submissions/{id}` (ACCEPTED after applying the change with the sourced admin tools, or REJECTED; closing erases the reply e-mail). Nothing is published from a submission directly. Public form: `/suggest?school=<slug>&topic=FEES` |
| Locations | `GET /locations/states` (36, with school counts), `/locations/states/{code-or-slug}`, `/locations/districts?state=`, `/locations/cities?state=`, `/locations/localities?state=`. Shortcuts: `/states`, `/states/{code-or-slug}`, `/districts?state=`, `/cities?state=` |
| Filters | `q` (name, locality, city, address, PIN or an exact 11-digit UDISE code), `name, locality, state` (code or slug), `district` (slug), `city, pinCode, board, schoolType, management, network, className, stage, minAnnualFee, maxAnnualFee, feeAcademicYear, admissionStatus, minRating, hasHostel` (true = boarding, false = day; unknown matches neither), `hasTransport, medium` (contains, e.g. English), `genderType` (CO_ED, BOYS, GIRLS), `facility` (comma-separated categories, each stated as available), `latitude, longitude, radiusKm, sortBy (name, fee` = lowest published annual fee, schools without fees last`, locality, city, rating, reviews, newest, updated, verified, distance), sortDirection, page, size` |
| Fees | `GET /fees/compare?schoolIds=1,2&classCode=NURSERY[&academicYear=2026-27]`, `POST /fees/calculate` |
| Admissions | `GET /admissions`, `/admissions/upcoming`, `/admissions/{id}`, `/admissions/school/{schoolId}` |
| Rankings | `GET /rankings`, `/rankings/top-schools`, `/rankings/locality/{locality}`, `/rankings/board/{board}`, `/rankings/methodology` |
| Exams | `GET /exams?q=&entryClass=&state=&schoolType=&kind=&status=&boarding=&free=&mode=&session=&authority=&examMonth=&sort=relevance\|deadline\|exam_date\|updated\|name`, `/exams/{slug}` (guide, every dated step with its source, notices), `/exams/notices?limit=`; admin `GET /admin/exams` (records with review flags), `GET /admin/exams/{slug}`, `POST /admin/exams/import`, `PATCH /admin/exams/{slug}/verification`, `PATCH /admin/exams/{slug}/published?value=` |
| Practice | `GET /practice-sets?exam=`, `/practice-sets/{slug}` (questions without answers), `POST /practice-sets/{slug}/score` (`{"answers": {"q1": 2}}` → score, section totals, answers, explanations); admin `POST /admin/practice-sets/import` |
| Reference | `GET /boards`, `/classes`, `/localities`, `/data-sources`, `/stats` |
| Auth | `POST /auth/login` → 15-minute bearer token |
| Admin (ADMIN/EDITOR) | `POST /admin/schools`, `PUT /admin/schools/{id}` (If-Match optimistic locking), `PATCH /admin/schools/{id}/status` (ADMIN), `POST /admin/schools/{id}/fees`, `/admissions`, `/facilities`, `/images` (JSON URL or multipart upload), `/verify`, `/criterion-scores`, `/external-rankings`; `POST /admin/import/csv` (ADMIN); `GET /admin/data-quality`; `GET /admin/coverage` (per state: schools, private, verified, with photo, fees, admissions, contact, coordinates, classes; priority states from `app.data-quality.priority-states`, default DL,BR,UP,JH,HR); `GET /admin/schools/{id}/images` (incl. hidden); review moderation; `PUT /admin/ranking-criteria` (ADMIN); `GET /admin/audit-log` (ADMIN) |

Full, live documentation: `/swagger-ui.html`.

### Recommended order (default for `/schools`)

Schools are sorted by `profile_score` (the published rules in `ProfileScoreService`, served at
`/api/v1/directory/order-rules`). Among schools with equal scores, states take turns (`recommended_turn`: each state's
first school by name, then each state's second, …), so no state fills whole pages; within one state ties are by name.
Scores and turns are recomputed on startup, after imports, image changes and ranking recalculation, and nightly. This
measures documentation, not school quality.

### Entrance exams

Exam records live in the database (`exam`, `exam_date`, `exam_notice`; migration V16). The verified catalogue is
`backend/src/main/resources/seed/exams.json`; it is loaded once into an empty database (`app.exams.seed-on-empty`) and
every later change goes through **Admin → Entrance exams → Import exam JSON** (same format; each record replaces that
exam's dates and notices, and the import is written to the audit log). Rules enforced by the import:

- Every date carries the official `sourceUrl` it was read from and is `confirmed` (stated in an official notice) or
  tentative; `precision: MONTH` marks month-only dates ("results by March 2027").
- Statuses (applications open, deadline approaching, opening soon, exam date announced, closed, result announced,
  awaiting notification) are derived on every request from the **confirmed, day-precise** dates of the exam's
  `currentCycle` only. A missing or tentative date never makes an exam look open, and only firm dates get countdowns.
  Earlier cycles stay visible as reference, labelled as such.
- Records need `lastVerifiedOn` and a non-draft status to be published; state exams must list their states.
- The admin list flags records not re-checked for `app.exams.stale-after-days` (60), cycles whose confirmed dates have
  all passed, tentative dates that passed unconfirmed, and cycles still awaiting their notice.

Catalogue as of 26 Oct 2026 (9 records, each read from the conducting body's own document): JNVST (Class VI), JNV
lateral entry Class IX and Class XI (NVS prospectuses 2027-28), AISSEE, RIMC, Netarhat, RMS CET, the Odisha EMRS
selection test (OMTES guideline 2026-27), and Kendriya Vidyalaya admission (KVS Admission Guidelines, Schedule and
Notice 2026-27) — recorded as a `SELECTION_PROCESS`, since Class I is by draw of lots and only Class IX has a test.
Class hub pages are indexed only for classes reached through an entrance test. Known gaps: EMRS admission is run state by state — only Odisha is recorded
(Andhra Pradesh's 2026-27 notice was not available on its official portal; the NESTS Admission Guidelines of
08.12.2025 were not found online); AISSEE-2027 and RMS CET 2027-28 await their notices; the NVS lateral-entry
deadline extensions reported in news were not found on an NVS page, so only the prospectus date is recorded.

`/exams` filters by class, state, school type, boarding, fee, status, admission year, confirmed exam month, mode and
conducting authority (all kept in the URL), and its dashboard lists Class VI, Class IX and boarding exams and result /
counselling notices. Hub pages: `/exams/class/{n}` (only classes with an exam), `/exams/state/{slug}` (indexed only
for states with their own exam — others would repeat the national list) and `/exams/syllabus` (every exam's official
pattern side by side). Guides show "How to apply" and "On the exam day" (`applicationSteps`, `examDay`) only where
taken from the official notice.

Exam guide pages get server-side titles, descriptions, canonical URLs and BreadcrumbList data, and are listed in the
sitemap.

Visitor tools (no account, nothing sent to the server):

- `/exams/finder` — current class, state, school type and boarding preference (kept in the URL) are matched against
  each exam's recorded entry classes, states, school types and boarding; results explain why each exam may fit, list
  the eligibility rules to confirm in the official notice, and show exams for later years and why others were left
  out. Age limits and residence rules are never assumed.
- `/exams/calendar` — the current cycle's dates month by month, filterable by class, state and saved exams. Confirmed,
  day-precise dates can be downloaded as an `.ics` file with a reminder the day before; tentative and month-only dates
  are shown but never exported. Reminders are the visitor's own calendar app's, so they never come from unverified dates.
- Saved exams live in this browser's `localStorage` (`isf.savedExams`), like saved schools.
- Study planner (each exam's Preparation tab) — 30, 60 or 90 days, or until a confirmed exam date, and 45–120 minutes
  a day. Subjects and weights come from the official syllabus areas when they state marks or question counts,
  otherwise from the official section marks; exams that publish neither (RIMC, RMS CET) get no plan. Topics are
  spread over the learning weeks, followed by timed practice and mock/revision weeks; daily minutes are split by
  weight in 5-minute blocks that add up exactly. Labelled as guidance; printable (`utils/studyPlan.ts`, tested).
- `/exams/practice` — topic quizzes and timed mock tests (`practice_set`, migration V17, catalogue
  `seed/practice.json`, loaded into an empty database and updated through **Admin → Entrance exams → Import practice
  JSON**). Every question is original and labelled "India School Finder Practice Questions"; none is copied from
  official or commercial papers. Sets are served **without answers**; `POST /practice-sets/{slug}/score` checks an
  attempt on the server and returns answers and explanations (rate limited, nothing stored). The player has question
  navigation, mark-for-review, a timer that submits automatically at zero, section-wise results, a review filter and
  restart. `PracticeApiIT` answers every shipped question with its key and expects full marks.
  Non-verbal questions (figure series, odd one out, mirror/water images, analogies) carry figures as data: shapes
  (`circle`, `square`, `triangle`, `arrow`, `dot`, `line`) with centre, size, clockwise rotation and fill on a
  100 × 100 grid, plus an `alt` description — drawn as SVG by `FigureView`, so imported content never contains
  markup. `figure` is the problem row (`figureAsksNext` adds the "?" box); `optionFigures` has one figure per option.

### Fee formula

```
Recurring annual (official) = monthly tuition × tuition months + annual + development + other charges
First year (official)       = registration + admission + recurring annual
Optional                    = transport monthly × months (official), books & uniform (estimate)
Security deposit            = shown separately; added only to "first-year cash outlay" (marked refundable/non-refundable)
```

### Ranking formula

```
normalised_i = raw_i ÷ max_i × 100
score        = Σ(weight_i × normalised_i) ÷ Σ weight of criteria with verified evidence
coverage     = Σ weight with evidence ÷ Σ all active weights
provisional  = coverage < 70 %  (no rank position)
```
Default weights: academic 25, teaching 20, infrastructure 15, safety 15, sports 10, parent feedback 10 (from ≥5 approved
reviews), accessibility/transport 5. Recalculated on verification, review moderation, weight change and nightly.

## Security

- Stateless JWT (HS256, 15-minute TTL); accounts re-checked on every request so disabling a user takes effect immediately.
- BCrypt (cost 12); first admin created only from `ADMIN_BOOTSTRAP_*` env vars; no credentials in source control.
- Role rules: EDITOR can add/verify data; ADMIN additionally changes publication status, imports CSV, sets ranking weights, reads the audit log.
- Rate limits (per IP, in-memory): login 5/min, reviews 5/hour, fee calculator 60/min, autocomplete 120/min. For multiple instances, also rate-limit at the proxy.
- CORS restricted to `CORS_ALLOWED_ORIGINS`; request DTOs whitelist editable fields and unknown JSON properties are rejected (mass-assignment protection).
- HTML stripped from free text (jsoup); every administrative change written to `admin_audit_log`.
- Reviews collect no email/phone/IP/child data, require explicit consent, and are moderated before publication.
- Hibernate runs with `ddl-auto=validate`; Flyway `clean` is disabled.

### Member accounts (parents and students)

Optional accounts, separate from the staff accounts above. Staff keep the short-lived bearer token; members can never
reach admin operations, and the database only allows the `USER` role for them (unknown request fields such as a role
are rejected).

- **Sessions** are held on the server (Spring Session JDBC, tables from migration V18). The browser gets only an
  `HttpOnly`, `SameSite=Lax` cookie (`Secure` in production); nothing about the session is put in `localStorage` or
  `sessionStorage`. The session id changes at sign-in and on password change; sign-out deletes the session on the
  server. Inactivity limit `SESSION_TIMEOUT` (2 h); "keep me signed in" makes it 30 days.
- **CSRF**: every state-changing account request needs the token from the readable `XSRF-TOKEN` cookie in the
  `X-XSRF-TOKEN` header (axios sends it automatically on the same origin).
- **Passwords**: BCrypt cost 12; 10–64 characters, refused if common, based on the email address or too repetitive;
  never logged, emailed or returned.
- **Emailed links** (verification 24 h, reset 30 min) carry 256-bit random tokens; only their SHA-256 is stored, each
  works once, and asking for a new one retires the old. A reset ends every session of the account.
- **No account enumeration**: registration, resend and reset requests answer the same way whether or not the email is
  registered; unknown emails still cost a BCrypt check; "locked" or "not verified" is revealed only after the correct
  password.
- **Lockout and rate limits**: 5 wrong passwords lock the account for 15 minutes; per IP, sign-in 5/min and
  email-sending requests 10/hour.
- **Account deletion** needs the password (for accounts without one: the typed email address and a Google sign-in in
  the last 10 minutes), removes the account and its tokens, and ends all its sessions. Sign-out never deletes anything.
- **Email**: SMTP is used when `SPRING_MAIL_HOST` and `MAIL_FROM` are set (see `.env.example`, DEPLOYMENT.md).
  Otherwise nothing is sent and the sign-up pages say so. The `dev` profile keeps messages in an in-memory outbox for
  local testing instead; the `prod` profile refuses to start with it.
- **Continue with Google** (`GoogleSignIn`, `GoogleSignInHandler`, migration V19) is offered only when
  `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set; otherwise the button does not appear and its endpoints do not
  exist. It is the OpenID Connect authorization-code flow run by Spring Security on the server (state and nonce
  checked; ID token signature, issuer, audience and expiry verified against Google's keys); no Google script runs in
  the page. Scopes are `openid email profile` only, and Google's access/refresh tokens are discarded, never stored.
  Only emails Google reports as verified are accepted. An existing account with the same email is linked (and emailed
  about it); if that account's email had never been confirmed, its password is removed, since whoever set it never
  proved they own the mailbox. Accounts created with Google have no password until one is set through a reset email.
  The result is the same server-side member session as a password sign-in. Setup steps are in DEPLOYMENT.md.
  `GoogleSignInIT` runs the full flow against a local stand-in for Google that signs real ID tokens.
- Moving staff from bearer tokens to the same cookie sessions is a possible follow-up; the two are separate today.

## Production deployment

See **[DEPLOYMENT.md](DEPLOYMENT.md)**: Docker Compose with `docker-compose.prod.yml` (or jar + managed PostgreSQL +
static hosting), every environment variable, HTTPS with Caddy, the first administrator, loading school data with
`tools/seed/import-to-server.js`, backups/restore, upgrades and a go-live checklist. CI (`.github/workflows/ci.yml`)
runs the backend tests, the frontend type-check/tests/build and builds both Docker images on every push.

## Known limitations / not yet done

- Coverage is partial and never claimed complete: CBSE schools come from the SARAS directory (Uttar Pradesh complete;
  other states partly fetched, see `data/saras/README.md`), plus hand-curated ICSE/IB schools. **Admin → State
  coverage** shows the current counts.
- No school is administrator-verified yet. Fees and admission dates exist only for some Delhi schools: none of the
  curated schools elsewhere publishes a fee schedule on its own site, and aggregator figures are not used. Openly
  licensed Wikimedia Commons photos exist for 9 schools (14 images): 5 in Delhi (`seed/images.json`) and 4 in UP,
  Bihar and Jharkhand (`tools/seed/curated-images.json`; load with `LocalImageImport` locally or
  `import-to-server.js` on a server).
- Saved schools, saved exams, recently viewed schools and recent searches still live in the visitor's browser
  (`localStorage`); member accounts exist, but these lists are not yet stored with the account.
- Account email has been tested only with the development outbox. No SMTP provider is configured in this repository,
  so real delivery has to be checked on the deployed site (see the DEPLOYMENT.md checklist). The terms of use and
  privacy policy were written for the project and should be reviewed by someone qualified.
- Search uses PostgreSQL trigram (`pg_trgm`) indexes for substring matching; managed PostgreSQL services support this
  extension, but the database user must be allowed to `CREATE EXTENSION` (it is a trusted extension since PG 13).
- The site is a client-rendered SPA, but every page is served with its own `<head>`: nginx includes
  `/api/v1/seo/head/<path>` into `index.html` (server-side include, `frontend/nginx.conf`), which returns the title,
  description, canonical URL, Open Graph tags and, for schools, schema.org `School` data built from published facts
  (`SeoHeadService`). Unknown schools/states/boards and `/admin`, `/saved` get `noindex`. If the include fails, the
  default tags in `index.html` are used; `npm run dev` serves those defaults. Page bodies are still rendered in the
  browser. `robots.txt` and XML sitemaps (pages, states, districts, boards with schools, every school) come from the
  backend. **The nginx include was not run on this machine (nginx/Docker not installed)**: the backend endpoint, the
  built `index.html` and the dev fallback were verified; check a deployed page with `curl -s https://<host>/schools/<slug> | grep -i '<title>'`.
- Cloudinary upload is implemented (signed Upload API) but **not tested against a live Cloudinary account**; without
  credentials the API returns 503 and admins register official image URLs instead.
- The Docker images and Compose file were written but **not built on this machine** (Docker was not installed);
  the backend and frontend were verified with Maven/Node and embedded PostgreSQL instead.
- Rate limiting is per instance (in memory).
- Git is not installed on the build machine, so the repository has not been initialised; run `git init` before first commit
  (`.gitignore` excludes `.env`, build output and `node_modules`).
