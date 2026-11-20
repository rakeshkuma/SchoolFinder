# Daily official-notification check

SchoolDhundo checks approved official websites once a day for new school and exam notices. It stores what it finds in
the existing `site_update` table. The home page's Live Updates ticker, the "Latest School & Exam Updates" cards and
`/updates` read that table.

The browser never triggers a check. The page refreshes every 15 minutes, but that only reads what the daily check
stored. New notices therefore appear without a deploy, and no visitor ever causes a request to an official site.

## How it works

```
06:00 IST  NotificationSyncScheduler (@Scheduled, cron app.notifications.cron, zone app.timezone)
             └─ NotificationSyncService.run()
                  ├─ run lock: in-JVM flag + PostgreSQL advisory lock (one run across all servers)
                  ├─ notification_sync_run row (RUNNING)
                  ├─ for each enabled source, separately:
                  │     FetchSession (https only, host allowlist, public IPs only, robots.txt,
                  │                   1.5 s between requests per host, timeouts, 3 attempts with backoff,
                  │                   6 MB size cap, 401/403 = BLOCKED, never worked around)
                  │     adapter.fetch()  → titles, links, dates exactly as the site gives them
                  │     NotificationIngestService.apply()  (one transaction per source)
                  ├─ expiry pass: PUBLISHED / PENDING_REVIEW past expires_on → EXPIRED
                  └─ run row: SUCCEEDED / PARTIAL / FAILED / ABANDONED, with each source's result (JSON)
Browser    GET /api/v1/updates (every 15 min)          → reads site_update, no outside requests
           GET /api/v1/updates/sync-status              → "checked daily at 6:00 AM IST · last checked …"
```

### Publishing rules (two levels)

A notice found by the check is **published automatically** only when all of these hold:

1. The source is approved for automatic publishing.
2. The source printed the notice's date.
3. The notice's link is on the source's own hosts.

Anything else is stored as **PENDING_REVIEW**, with the reason in `review_note`, and waits under "Waiting for review" in
the admin area (Admin → School & exam updates).

Other guarantees:

- **Dates.** A notice the source gives no date for is stored with the day it was found and `date_confirmed = false`. It
  cannot be published until an editor saves it with the real date. The publication date is never moved later.
- **Summaries.** The summary is a short sentence written by the checker ("NTA published this notice on 3 Nov 2026. Open
  the official notice for dates, eligibility and how to apply."). It is never text copied from the notice. Automatic
  items are marked `verified = false`: no editor has checked them.
- **Duplicates.** A notice is identified by `(source_key, source_item_id)`: the source's id, or the notice's canonical
  address.
  - A second run with the same listing changes nothing except `last_seen_at`; `updated_at` is untouched.
  - A notice whose address another update already cites is not added again.
  - In the feed, a notice the exam catalogue already cites is shown once, as the exam item.
- **Corrections.** When the source changes a notice's title, link or dates, the update is changed and `last_changed_at`
  is set, which shows the "Updated" badge for 7 days.
  - If staff edited the update, their wording is kept and the change is written in the review note.
  - A later closing date reopens an expired notice.
- **Withdrawals.** On sources whose listing is complete (NTA's archive, Navodaya's API), a notice missing for 20 hours or
  more is archived as withdrawn. If it comes back, it returns to the review queue.
- **Superseded notices.** An editor can mark a notice as replaced by a later one ("Replaced by…"); it is then archived.
- **Expiry.** A notice stays up until the end date the source gives. Without one, it stays up 45 days after publication
  (`app.notifications.lifetime-days`). After that it is EXPIRED and listed under `/updates?view=past` for 90 days.
  Notices already past that age when first found are not added.
- **Badges** are computed on every request: NEW, UPDATED, CLOSING_SOON, UPCOMING and OPEN, plus EXPIRED in past
  updates. The categories are the existing four: ADMISSION, EXAM, PREP and JOB.

## Sources (inspected 14 November 2026)

| Key | Source | What is read | Publishing |
|---|---|---|---|
| `nta-aissee` | NTA, https://nta.ac.in/NoticeBoardArchive | The archive table (`table#tbl`, ~1,900 rows), filtered to AISSEE / Sainik Schools and to RIMCEE (NTA conducts the RIMC entrance exam too). There is no date column; NTA names each file by its upload time (`Notice_20261103151121.PDF`), and that is the date used. | Automatic; complete listing |
| `navodaya` | Navodaya Vidyalaya Samiti | The public JSON API its own site uses: `https://navodaya.gov.in/api/public/media?organization_id=100`. Each notice has a stable id and `start_date`. JNVST, LEST, admissions and recruitment are kept; tenders, contracts and circulars are dropped. The same notice posted twice is merged. | Automatic; complete listing. Notices that link to another site (e.g. the admit-card portal) go to review |
| `netarhat` | Netarhat Residential School home page | Its Notices box entries in "24-09-2026 : title" form; the printed date is used. Undated notice links go to review. | Automatic when dated |
| `kvs` | KVS | `https://kvs.gov.in/en/recruitment/` is a static FAQ page, so the real lists are read instead: "Notifications/Recruitment" (`/en/interview-notice/`) and Admission (`/en/admission/`). These are government-platform tables with a "Published On" date and PDFs on `cdnbbsr.s3waas.gov.in`. | Automatic |
| `cbse-recruitment` | CBSE, https://www.cbse.gov.in/cbsenew/recruitment.html | The CDN in front of CBSE answers an honestly identified automated client with **403 Access Denied** (robots.txt too). The checker records BLOCKED every day and does not disguise itself. If the site ever answers, PDF links are collected for review only. | Review only |
| `rms` | Rashtriya Military Schools home page | "(CLICK HERE)" notice links to `/Attachments/…` and the admissions portal. The page has no dates. | Review only |

Sources investigated and not added:

- **RIMC** (https://rimc.gov.in/, www.rimc.gov.in): the connection fails from here, so the site cannot be read. RIMCEE
  notices are read from NTA's archive instead (above).
- **Sainik Schools Society** (https://sainikschoolsociety.in/): a JavaScript app that serves only "Loading…".
- **NTA's AISSEE portal** (https://exams.nta.nic.in/sainik-school-society/): answers 403 to automated clients.
- **State admissions** (for example Delhi DoE nursery): every state publishes differently and mostly in scanned PDFs.
  Admission cycles keep coming from the existing admission records.

The NTA archive already covers AISSEE and RIMCEE notices. Other RIMC, Sainik and state admission notices can still be
added by editors.

Requests identify themselves as `SchoolDhundoBot/1.0 (+https://schooldhundo.in/contact)` (`app.notifications.http.user-agent`).

## Source registry (`backend/src/main/resources/notifications/sources.json`)

Besides the six built-in adapters above, the check reads the official sources listed in a reviewed registry file. Each
entry says what the source is (institution, government or private, boarding, state, city, our school profile), what it
publishes (ADMISSION and/or JOB), how it is read, and how its notices are dated. The file is code-reviewed like any
change, and an entry is added only after a person has looked at the site (`checked`).

How a registry source is read (`method`):

| Method | What it reads | Date (`date`) |
|---|---|---|
| `WP_MEDIA` | The site's public WordPress media API (`/wp-json/wp/v2/media?mime_type=application/pdf`): the PDFs the institution uploaded | `SOURCE`: the upload date the API gives |
| `S3WAAS_DOCS` | A government-platform (S3WaaS) document table: title, "Published On", file | `SOURCE`: the "Published On" cell |
| `HTML_ITEMS` | Entries of a page picked by CSS selectors (`item`, and within it `title`, `link`, `dateSelector`) | `TEXT` (a date the entry prints), `FILENAME_STAMP` (an upload time in the file name), `FILENAME_EPOCH` (a Unix time in the file name) or `NONE` (every entry waits for an editor) |
| `JOB_POSTINGS` | The openings a careers page states for search engines: schema.org `JobPosting` in its JSON-LD (title, `datePosted`, `validThrough`, each opening's address). Raw line breaks inside the JSON strings are accepted, as search engines accept them | `SOURCE`: `datePosted`; `validThrough` is the last date |

Other settings: `assume` (every entry is a JOB or ADMISSION, e.g. a careers page), `schoolPostsOnly` (keep only teaching
and school-leadership posts, or posts that name a school or the DoE: for commissions and selection boards),
`reviewGeneric` (with `schoolPostsOnly`: an advertisement that names no post waits for review instead of being left out),
`include` / `exclude` / `linkPattern` (regular expressions), `titlesCutAt` (the site cuts titles at N characters; such
titles are marked "…"), `mayBeEmpty`, `prefixTitles` (start displayed titles with the institution's name; the default for
a school's own site), `readDocuments` (the titles seldom give dates: each new job notice's own page is read for the
official PDF it links, and the PDF's text for the interview or last date; see *Dates from the notice's document*), and
`enabled` with a `disabledReason`.

Every entry is checked when the application starts (key, hosts, https addresses on those hosts, categories, selectors,
regular expressions). An entry with a mistake is **left out and reported** (in the log, and in red in Admin → School &
exam updates); it never stops the application or the other sources. `RegistrySourceAdapterTest` fails the build if the
file has any problem.

### Site families: the Kendriya Vidyalaya websites (20 November 2026)

Some official websites are built the same way by the hundred. A **family** in the registry file is one reviewed
`template` (any source fields, with `{host}` where the site's host goes) and a list of sites in a CSV file beside the
registry (`notifications/sites/<name>.csv`: `id,host,name,state,city,school`). Each site becomes a source of its own,
`<family>-<id>` (`kv-mankhurd`), checked like any entry; a site with a mistake is left out and reported (at most ten
lines per family). `school` may be `cbse:<affiliation number>`, which links the school's profile by its CBSE number.

The `kv` family is every Kendriya Vidyalaya's own website (`<school>.kvs.ac.in`, the government S3WaaS platform). Its
**Latest News** table (`/en/latest-news/`: date, title, link to the notice's page) carries the walk-in interviews and
contractual-teacher notices; the notice's page links its PDF on `cdnbbsr.s3waas.gov.in`. How the list was made: the
1,217 KV website addresses in the CBSE (SARAS) school records were each read once on 20 Nov 2026 (six at a time); the
1,117 sites with the table, less 10 whose addresses do not exist, are listed (1,107), with the name each site prints in its header (`span.site_name_english`; spelling
slips, Hindi-only and all-capital names tidied), state and town from the CBSE record; 93 sites with another layout and 7
without the page are left out. robots.txt on these sites disallows only `/wp-admin/`; the document host has none.

Rules of the family: only JOB notices (a single Vidyalaya's admission lists stay with the KVS admission item); bio-data
and application forms, selection panels, results, merit and provisional lists and "panel inspections" are left out;
titles start with the Vidyalaya's name; nothing is withdrawn (the table keeps its history); `readDocuments`. On the
survey day 36 Vidyalayas listed 44 job notices from the previous 45 days; contractual hiring peaks in February-April.

How a family is run and shown: its sites are read **side by side** (`parallel-fetches`, default 6; each site still at
most once per `per-host-interval`) ahead of the loop, and applied one at a time. A run record keeps a family's sites that
found something or failed as rows of their own and the rest as one line ("Kendriya Vidyalaya websites: 1,090 site(s)
read with nothing new"). Admin → Sources shows the family as one line with the failing sites named; it counts as failing
only when more than a quarter of its sites fail. `only-sources` and `disabled-sources` accept `kv-*`.

### Dates from the notice's document

A Vidyalaya's title is often only "Walk-in interview 2026-27". For a source with `readDocuments`, each new job notice
(up to `pdf.documents-per-source` a run) is followed to its page, the first PDF in the page's main content on the source's
document hosts is read (`pdf.document-pages`, `pdf.document-chars`), and its text is searched for the dates: after each
cue ("walk-in", "interview on", "scheduled to be held on", "last date"), every date within reach is looked at, and the
first one **after the notice's publication and within 120 days of it** is taken; the letter's own date and dates of
birth do not count. The notice then gets that date as its interview or last date (card: "Walk-in interview" /
"Interview" / "Last date"), stays current until it, and its summary says the date comes from the official notice. Posts
and the kind of notice still come from the title. A scanned PDF without text, or one without such a date, changes
nothing; an editor's notice is never changed. An interview for a contractual or part-time post is treated like a
walk-in (its day is when to come), in titles too.

### Registry sources (inspected 19 November 2026)

| Key | Source | How | Notes |
|---|---|---|---|
| `sainik-school-rewari` | Sainik School Rewari, HR | WP_MEDIA | Recruitment adverts and admission PDFs with upload dates |
| `sainik-school-goalpara` | Sainik School Goalpara, AS | WP_MEDIA | Recruitment adverts among ration tenders (tenders left out) |
| `sainik-school-korukonda` | Sainik School Korukonda, AP | WP_MEDIA | TGT recruitment steps (application, shortlist, final result) |
| `sainik-school-nalanda` | Sainik School Nalanda, BR | WP_MEDIA | Nothing current on 19 Nov 2026 (last advert Dec 2025) |
| `sainik-school-east-siang` | Sainik School East Siang, AR | WP_MEDIA | AISSEE 2027 details |
| `bpsc` | Bihar Public Service Commission | WP_MEDIA | School posts only (teachers, head teachers, TRE); uploads titled by file name wait for review |
| `dsssb` | Delhi Subordinate Services Selection Board | HTML_ITEMS (`TEXT` date) | School posts only; "various posts" adverts wait for review |
| `oav-odisha` | Odisha Adarsha Vidyalaya Sangathan | HTML_ITEMS (`FILENAME_STAMP`) | Home-page cards; titles cut at 100 characters by the site; promotion lists and HRA orders left out |
| `nests-emrs` | NESTS (Eklavya Model Residential Schools) | HTML_ITEMS (`NONE`) | No dates on the site: **review only** |
| `mayo-college` | Mayo College, Ajmer (private boarding) | HTML_ITEMS (`FILENAME_EPOCH`) | Careers page; each opening's advert is `/uploads/jobs/<Unix time>` |
| `assam-valley-school` | The Assam Valley School (private boarding) | WP_MEDIA | |
| `vidya-devi-jindal-school` | Vidya Devi Jindal School, Hisar (girls' boarding) | WP_MEDIA | |
| `good-shepherd-ooty` | Good Shepherd International School, Ooty (boarding) | WP_MEDIA | Its "AP Registration" PDFs (Advanced Placement) go to review, not to admissions |
| `dps-rk-puram` | Delhi Public School R. K. Puram | WP_MEDIA | No recent PDFs on 19 Nov 2026 (`mayBeEmpty`) |
| `doon-international-bbsr` | Doon International School, Bhubaneswar (private) | JOB_POSTINGS | 28 openings on 20 Nov 2026 (posted 21 Sep, open until 26 Jan 2027); complete listing: an opening taken off the page is withdrawn |
| `kv-*` | 1,107 Kendriya Vidyalaya websites | HTML_ITEMS family (`TEXT`, `readDocuments`) | See *Site families* above |

Investigated on 19 November 2026 and **not** added:

- **The Doon School**: a Cloudflare challenge answers automated clients (403). Not worked around.
- **HPSC** (Haryana): robots.txt disallows everything.
- **UPPSC**, **RPSC**, **MP ESB**, **TGSWREIS**, **AWES (Army Public Schools)**: script-built pages, errors, TLS failures or
  timeouts for our client.
- **KV school websites**: added on 20 Nov 2026 as the `kv` family (their HTML news pages; the REST API needs a login and is
  not used). Their "Teacher vacancy" page is a staffing table (sanctioned and vacant posts), not an advertisement: not read.
- **Navodaya per-school notices**: the public API returns the headquarters' notices for every JNV id, so it adds nothing.
- **Welham Girls, Welham Boys, Lawrence School Sanawar, Scindia, Modern School, Daly College, DPS Society**: their
  careers pages show only an application form, "No Vacancy Available", or general text, with no list of openings to read.
- **OAV recruitment page**: loaded by script; the home-page cards are read instead.
- **Sainik School Bhubaneswar**: its WordPress posts feed has been taken over by gambling spam; not used.
- **Private schools looked at on 20 Nov 2026**: VIBGYOR (403), Podar, Modern School, Sanskriti, Chinmaya, Kalorex (no
  careers page at the address), Ryan, Shiv Nadar, Pathways, Heritage, DPS Gurgaon, Amity, Euroschool (no list of openings),
  Orchids (openings without any dates: each would wait for an editor), Welham Girls (says "no vacancies"), Lawrence School
  Sanawar (one advert, closed 31 Oct 2026); 26 private boarding and day schools' WordPress media APIs searched for vacancy
  PDFs: none answered with any. Schools whose careers page states `JobPosting` data can be added with `JOB_POSTINGS`.

### Source health

Every run writes each source's definition and health to the `notification_source` table: last attempt, last success,
outcome (OK, FAILED, BLOCKED), error, and failures in a row. Staff see it under Admin → School & exam updates → Sources
("N failing"). A failing source never stops the others; the public "last checked" time is the finish of the last run
that read at least one source successfully. Run records older than 180 days are deleted (they are operational data;
notices themselves are never deleted).

## Admissions and school jobs (V47)

### What each notice gets

Admission and job notices (found by the check or written by editors) get facts of their own, each **only as the
official source states it** (`OpportunityClassifier`, from the official title, in English, Hindi or Odia, with Indian
digits read as digits):

- **Kind of notice**: OPENING, EXTENSION (of a last date), CORRIGENDUM, SCHEDULE (tests, interviews), ADMIT_CARD,
  RESULT (results, shortlists, lists), OTHER.
- **Posts** (codes: PRT, TGT, PGT, NTT, ASSISTANT_MASTER (RMS and Sainik Schools), SPECIAL_EDUCATOR, PET, PRINCIPAL,
  VICE_PRINCIPAL, HEADMASTER, COORDINATOR, LIBRARIAN, COUNSELLOR, LAB_ASSISTANT, WARDEN; and the kinds of staff
  IT_SUPPORT, ADMIN_STAFF, SUPPORT_STAFF, TEACHER, which are filters only and never shown as a post's name), **subjects**,
  teaching or non-teaching, regular / contract / part-time / temporary, number of posts. An entry of a careers page
  (`assume: JOB`) is an opening unless its words say otherwise.
- **Admissions**: classes ("VI, IX", "Nursery/KG") and session ("2027-28").
- **Dates**: application opening, last date, exam or walk-in date: each only when a cue word ("last date", "closing
  date", "walk-in", "अंतिम तिथि", "ଶେଷ ତାରିଖ"…) is followed by a real date that is plausible for the notice. A
  publication date is never used as a last date.
- From the source registry: institution, government or private, boarding, state, city, our school profile.
- **Posts of a recruitment notice** (`site_update_position`): "PGT English, PGT Hindi and PGT Maths" become three posts.
  An editor's list (Admin → edit → "Posts") replaces those read from the title, and later checks keep it.
- A **page address** (`slug`), made once and never changed: `/jobs/{slug}` or `/admissions/{slug}`.

Notices stored before V47 get their facts and address in batches of 200: 30 seconds after start-up and in each run.
Their wording, dates and expiry are left as they were.

### Rules added for admissions and jobs

- **Application status** is worked out on every request from the official dates: Applications open / Apply now,
  Closing soon (last date within 14 days), Opening soon / Upcoming, Closed, and **Last date not announced** when the
  source gives none (never assumed open or closed). Results, admit cards and schedules have no status.
- **School posts only.** A notice from a school system or commission (KVS, NVS…) for a post that is not school
  employment (engineers, project associates, consultants…) waits for an editor. Sources marked `schoolPostsOnly` (BPSC,
  DSSSB) keep only school posts.
- **Expiry follows the last date.** An opening with an official last date stays current until that date (or its exam
  or walk-in, if later) and then moves to past updates; an opening found after its last date is not added. Others keep
  the 45-day lifetime.
- **Ordering** in the Admissions and Jobs tabs (home page and /updates) and on /jobs: editor-pinned first, then open or
  opening notices (nearest last date first), then those without a last date, then results and other later steps,
  closed last; editor-verified first within each. The All, Exams and Prep tabs keep their order.
- **Duplicates**: the same notice from the same source is one row (source id or address). Several openings on one
  careers page share its address and are not mistaken for copies.

### Pages, search engines and the sitemap

- **`/jobs`**: current school job notices with filters (state, government/private/boarding, teaching or not, post,
  subject, status) built from what is listed; filters live in the address, but the canonical address is always `/jobs`,
  so filter combinations are never indexed separately.
- **`/jobs/{slug}` and `/admissions/{slug}`**: the notice's status, key facts (with "Not given in the official
  listing" for a missing last date), posts, questions answered from the facts only, official notice and application
  links, the school's profile, related notices. Closed notices stay readable, marked "no longer current".
- **Head** (SeoHeadService): title, description, BreadcrumbList and WebPage (publication and change dates, `isBasedOn`
  the official notice). **JobPosting** only for a current job opening that may be indexed, with only what the page shows:
  no `baseSalary` (pay is free text as published), no `directApply`; `validThrough` is the last date at 23:59 IST.
- **Indexable** (else `noindex`, no canonical link, out of the sitemap): published, dated by the source, current, an
  opening or extension, not closed, not a post outside school employment (an engineer of a school system), and at
  least one fact beyond its title (last date, posts, classes, staff kind, number of posts or eligibility). Results,
  admit cards, closed and title-only notices are noindex.
- **Sitemap**: `/sitemaps/notices.xml` (in `/sitemap.xml`) lists the indexable notice pages with their last change;
  `/jobs` is in `/sitemaps/pages.xml`. Server-rendered bodies (SeoBodyService) give crawlers the same facts and answers.

### Endpoints added

| Endpoint | Who | What |
|---|---|---|
| `GET /api/v1/notices?category=JOB\|ADMISSION&state=&sector=&staff=&post=&subject=&status=&classes=&session=&q=&past=&page=&size=` | public | Filtered list (feed items) with the filter choices and counts |
| `GET /api/v1/notices/{slug}` | public | One notice's page data; 404 unless published or expired |
| `PUT /api/v1/admin/updates/{id}/positions` | ADMIN, EDITOR | Set a recruitment notice's posts from the official notice |

`/api/v1/updates` items gain `applicationStatus` and `noticeType` (null for other items); `PUT /api/v1/admin/updates/{id}`
accepts an optional `details` object with the facts (left out, the stored facts are kept).

## Settings (`application.properties`, prefix `app.notifications`)

| Property | Default | Meaning |
|---|---|---|
| `enabled` (`NOTIFICATIONS_SYNC_ENABLED`) | `true` | Master switch (also blocks "check now" and start-up catch-up) |
| `cron` (`NOTIFICATIONS_SYNC_CRON`) | `0 0 6 * * *` | Spring cron (sec min hour day month weekday) in `app.timezone` (Asia/Kolkata); `-` switches the schedule off |
| `schedule-label` | `Daily at 6:00 AM IST` | Shown on the site; keep it in step with `cron` |
| `catch-up-on-startup`, `catch-up-after`, `catch-up-delay` | `true`, `24h`, `2m` | After a restart, run once if the last successful run is older than a day |
| `manual-cooldown` | `10m` | "Check now" is refused (HTTP 429) this soon after the last run |
| `disabled-sources` (`NOTIFICATIONS_DISABLED_SOURCES`) | empty | e.g. `cbse-recruitment,rms`; `kv-*` for a whole family |
| `only-sources` | empty | Read only these (same form); for local checks |
| `parallel-fetches` | `6` | Sites of a family read at the same time |
| `lifetime-days` | `45` | How long a notice without an end date stays up |
| `withdraw-after` | `20h` | How long a notice must be missing from a complete listing |
| `http.*` | 10 s connect, 30 s request, 6 MB, 3 attempts, 3 s backoff, 1.5 s per host, 3 redirects, robots on | Fetch limits |
| `pdf.*` | excerpts on, 5 MB, 2 pages, 400 chars, 3 per source | Opening text of new review items' PDFs, added to the review note (staff only) |
| `pdf.documents-per-source`, `pdf.document-pages`, `pdf.document-chars` | `6`, `3`, `8000` | Sources with `readDocuments`: new job notices' documents read per run for their dates |

`spring.task.scheduling.pool.size=2` stops the check from delaying the nightly data jobs. On shutdown a run stops
between sources and is recorded as ABANDONED. A run left RUNNING by a crash is marked ABANDONED on the next start.

## Endpoints

| Endpoint | Who | What |
|---|---|---|
| `GET /api/v1/updates?category=&page=&size=` | public | The feed (unchanged path); official items have `origin: OFFICIAL_SOURCE` |
| `GET /api/v1/updates/past` | public | Expired in the last 90 days, badge EXPIRED |
| `GET /api/v1/updates/sync-status` | public | `lastCheckedAt`, `nextCheckAt`, `schedule`, `sources`; no errors or internals |
| `GET /api/v1/admin/updates?status=PENDING_REVIEW` (also `EXPIRED`, …) | ADMIN, EDITOR | Review queue and lists |
| `POST /api/v1/admin/updates/{id}/supersede?by={id}` | ADMIN, EDITOR | Mark replaced |
| `GET /api/v1/admin/updates/sync-status`, `GET /api/v1/admin/updates/sync-runs` | ADMIN, EDITOR | Schedule, sources, run history with per-source results |
| `POST /api/v1/admin/updates/sync` | **ADMIN only** | Start a check in the background: 202, 409 while running, 429 within the cool-down |

There is no public or anonymous way to start a check.

## Adding a source

1. Look at the site first: robots.txt, and whether it has an API or feed (prefer those). Find the notice listing, the
   date it prints, and the hosts its links use. If the site refuses automated clients (401/403, a challenge page),
   stop: do not work around it.
2. Save a small excerpt of the real page under `backend/src/test/resources/notifications/`.
3. Write `@Component class XyzAdapter implements OfficialSourceAdapter` in `notifications/source/`:
   - `key()`: stable and short; it is stored with every notice and must never change.
   - `name()`, `listingUrl()`, `hosts()` (exact hostnames requested) and `documentHosts()` (hosts whose links may be
     published without review).
   - `autoPublish()`: true only if the site prints a reliable date per notice. `completeListing()`: true only for a
     full archive or an API.
   - `fetch()`: use `http.get(url).html()` or `.body()`. Keep the parsing in a static `parse(...)` method so it can be
     tested.
     - Return `FoundNotice`s with the title and link exactly as the site gives them, and the date only if the site
       prints it (never guess one).
     - Set a category from plain keyword rules; drop irrelevant entries (count them in `ignored`).
     - Throw `SourceLayoutException` if the listing has no rows at all, so a page redesign is reported, not hidden.
4. Add a parser test like `OfficialSourceAdaptersTest`. Run it, then check the real site once from a local server
   (below) and read the run in Admin → School & exam updates.
5. Add the source to the table above.

## Running and checking it

- **Tests** never contact real websites: `application-test.properties` sets `app.notifications.only-sources=test-only`.
  - `NotificationSyncIT` uses fake sources against PostgreSQL. It covers two consecutive daily runs, corrections,
    revised dates, expiry, withdrawal, a failing source, the lock, crash recovery and the endpoints.
  - `FetchSessionTest` and `UrlPolicyAndRobotsTest` cover the fetch rules. `OfficialSourceAdaptersTest` covers each
    parser against real-page excerpts, and `NotificationScheduleTest` covers 6:00 IST.
  - `OpportunityClassifierTest` and `OpportunityRulesTest` cover reading facts from real official titles, dates, status
    and page addresses; `RegistrySourceAdapterTest` covers the registry file and each method against saved excerpts of
    the real pages (19 Nov 2026); `OpportunityNoticesIT` covers admissions and jobs end to end (facts, posts, the
    school-post rule, closed and later-step notices, source health, the fill-in of older notices, the Jobs list and its
    filters, page heads with JobPosting, server-rendered bodies and the sitemap).
  - Command: `./mvnw -o test -Dtest='Notification*,Opportunity*,RegistrySourceAdapterTest,FetchSessionTest,UrlPolicyAndRobotsTest,OfficialSourceAdaptersTest'`
- **Locally.** Start the backend (`LocalDevApplication`). Sign in to the admin area as an ADMIN, then press "Check now"
  in Admin → School & exam updates, or `POST /api/v1/admin/updates/sync`. Each source's result appears in the panel.

## Deployment and scheduling

- **No separate scheduler is needed.** The live backend is the always-on systemd service `schooldhundo` on the Oracle
  web server (`Restart=always`), so Spring's `@Scheduled` fires daily inside it. The cron is read in Asia/Kolkata
  whatever the server clock's zone, so 06:00 IST is 00:30 UTC.
- If more than one backend ever runs against the same database, the advisory lock still allows only one run. No cron
  job, Kubernetes CronJob or external trigger is needed. Do not add one that calls the admin endpoint on a timer.
- **Deploying** this change is the usual `deploy/oracle-micro-deploy.ps1`. Flyway applies `V43__official_notification_sync.sql`
  on start: it adds columns and indexes to `site_update` and creates `notification_sync_run`. Shortly after the restart,
  the start-up catch-up runs the first check (no successful run yet). Watch it with
  `journalctl -u schooldhundo | grep "Notification sync"` or in the admin panel.
- **Admissions and jobs (V47)** deploy the same way: Flyway applies `V47__admissions_jobs_intelligence.sql` on start
  (new nullable columns on `site_update`, and the new tables `site_update_position` and `notification_source`; nothing is
  dropped or rewritten). About 30 seconds after start, notices stored earlier get their facts and page addresses; the
  next check (06:00 IST, or the start-up catch-up) reads the registry sources too. `frontend/nginx.conf` adds
  `/api/v1/notices` to the short public cache and is uploaded by the deploy script. **Rollback:** deploy the previous jar
  and site; V47 only adds columns and tables, which the previous version ignores (no down-migration is needed; drop them
  later only if the feature is abandoned). To pause only the new sources, list their keys in
  `NOTIFICATIONS_DISABLED_SOURCES`.
- **Switching off:** `NOTIFICATIONS_SYNC_ENABLED=false` (or `NOTIFICATIONS_SYNC_CRON=-`) in `/etc/schooldhundo/backend.env`,
  then restart the service. To skip one site: `NOTIFICATIONS_DISABLED_SOURCES=cbse-recruitment`.
- The server needs outbound https to the source hosts. Oracle's default egress rules allow it.
