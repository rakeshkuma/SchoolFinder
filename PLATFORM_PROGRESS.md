# SchoolDhundo platform: progress record

The "world-class platform" brief (13 November 2026) and the audit before it (12 November 2026). Each item is marked
**Done**, **Done earlier** (built in an earlier round and checked again), **Prepared** (built but switched off, or
waiting for an outside step) or **Planned** (not started). Continue from the first item that is not done.

## 1. Reliability and design

| Item | Status |
| --- | --- |
| Homepage sections never show error blocks: nginx keeps the last good copy of public API answers (`proxy_cache sd_api`, stale on error); the browser remembers the homepage lists (`useApi(..., cacheKey)`); fallback quick links | Done (live 0ac64dd) |
| Five-pillar navigation (Find Schools, Boarding Schools, Compare, Admissions & Fees, Exam Prep), no duplicate destinations | Replaced by the new header (section 8) |
| Unfinished items hidden ("Not available yet", empty ranking card) | Done (live 0ac64dd) |
| Personal email and admin link removed from public pages; contact form instead (`CONTACT_EMAIL` in `frontend/src/content/site.ts`) | Done (live 0ac64dd) |
| Crest-style covers for schools without photos; trust badges ("Official notice · updated …", "Verified …"); shortlist counter; hero polish | Done (live 0ac64dd) |
| Homepage "Latest guides" section (three newest articles) | Done |

## 2. School discovery and enquiries

| Item | Status |
| --- | --- |
| Directory filters: four in the bar (State/City, Board, Class, Annual fee), the rest under More filters, Clear all | Done earlier |
| Duplicate filters removed: separate PIN box (the search box finds PINs) and Stage (Class covers it); both still appear if an old link uses them | Done |
| **Admission enquiry system**: "Enquire about admission" on every school profile (sticky bar and Admissions tab); name, mobile, optional email, class, year, question; explicit consent to share with that one school; honeypot; 10 per hour per address; saved first, inbox email as a bonus | Done |
| Admin › Admission enquiries: New → Forwarded (with a note) → Closed; closing deletes the parent's contact details | Done |
| Nothing is sent to schools automatically: staff forward each enquiry by hand | By design |
| Claim your school (`/claim-school`, link on every profile) and Advertise with us (`/advertise`), both through the contact form (topics CLAIM and ADVERTISING) | Done |
| Similar schools ("Schools in the same place"), comparison, saved schools | Done earlier |
| School owner accounts that edit their own profile directly | Planned (today claims are handled by editors) |

## 3. Rankings, exams and blog

| Item | Status |
| --- | --- |
| Rankings with methodology, sources, dates and limitations; sponsored placements labelled; positions never sold | Done earlier |
| JNVST and AISSEE Class 6 dashboards (mock tests, practice, progress, section marks), Netarhat guide, daily quiz, leaderboard, bookmarks | Done earlier |
| Blog: categories, contents list, author box, updated date, related articles, breadcrumbs, share links, Article schema | Done earlier |

## 4. SEO

| Item | Status |
| --- | --- |
| Server-rendered page content (headings, facts, links) for home, school, state, district and city pages, via SSI (`SeoBodyService`) | Done (live 0ac64dd) |
| School + BreadcrumbList + FAQPage (same questions as shown on the page) | Done (live 0ac64dd) |
| WebSite (with search) + Organization on the homepage | Done |
| Sitemap, robots.txt, canonical URLs, noindex for private/thin pages, Article schema | Done earlier |
| Titles, descriptions and sitemap entries for /advertise and /claim-school | Done |
| "Best schools in <place>" pages only where enough schools exist (`MIN_SCHOOLS_TO_INDEX`) | Done earlier |

## 5. Monetization

| Item | Status |
| --- | --- |
| Admission enquiries (the main lead product) | Done |
| Advertise and Claim pages stating what is paid, how it is labelled and what is never for sale | Done |
| Ad slots on blog posts and school profiles (`AdSlot`, `AD_SLOTS`), shown only with consent | Prepared: turn on in AdSense, add the CSP entries in `GOOGLE_SEO_ADSENSE_DEPLOYMENT_GUIDE.md` |
| Featured school listing as a paid product (today "Featured" means "has a licensed photo") | Planned: needs a `featured_until` field per school, a "Featured" label on cards, and an admin switch |
| Premium mock tests / subscriptions | Planned: needs the owner's choice of payment provider; no payments are taken today |
| Affiliate books on exam pages, disclosed | Planned |

## 6. Analytics (GTM GTM-PZ7WSXBS → GA4 G-ESGRNYGQHQ, Consent Mode)

Events: `school_search`, `school_profile_view`, `school_comparison`, `generate_lead` (admission enquiry sent),
`school_claim` (claim started), `exam_page_view`, `quiz_start`, `quiz_complete`, `google_sign_in`,
`user_registration`. Personal details are stripped by `cleanParams`. In GA4, mark `generate_lead` as a key event.

## 7. Outside steps for the owner

1. Deploy: `powershell -ExecutionPolicy Bypass -File .\deploy\oracle-micro-deploy.ps1` (migrations V41 and V42 run on start).
2. Create a domain address (e.g. contact@schooldhundo.in via Cloudflare Email Routing or Zoho Mail) and set
   `CONTACT_EMAIL` in `frontend/src/content/site.ts`.
3. Make sure the server can send email (SMTP settings in `/etc/schooldhundo/backend.env`) so new enquiries reach the
   inbox at once; without it they still appear under Admin › Admission enquiries.
4. In GA4, mark `generate_lead` as a key event.
5. AdSense: apply, then switch on the prepared slots.

## 8. Homepage redesign from the reference image (live 14 November 2026 as c925e9a)

| Item | Status |
| --- | --- |
| Header: book logo ("School" navy, "Dhundo" orange), menus Schools ▾ Rankings ▾ Admissions ▾ Exam Prep ▾, links Notifications (`/updates`), Compare, Blog; "List Your School" (`/claim-school`); Sign in with Google kept; shortlist heart (on phones its count sits on the menu button) | Done |
| Hero: "Find the Right School for Your Child", search with suggestions (to `/schools?q=…#directory`), stats from the API (schools listed, practice sets) and plain links where there is no real number | Done |
| Live updates ticker: pauses on hover/focus and with a button, still with reduced motion, refreshes every 5 minutes, honest message if the feed fails | Done |
| Updates feed `GET /api/v1/updates` (`UpdateFeedService`): exam notices and dates, open admissions grouped by notice, new practice sets, and editorial notices; badges worked out from dates (Closing soon ≤14 days, New ≤7 days, Open, Updated, Upcoming); nginx-cached | Done |
| Editorial notices (job alerts etc.): table `site_update` (V42), Admin › School & exam updates (draft → publish → archive, expiry date), official source required except for practice | Done |
| `/updates` page with tabs, pagination and an explanation of sources and badges | Done |
| Sections: Latest School & Exam Updates (tabs All/Admissions/Exams/Prep/Jobs, no scholarship/result card), Explore by Category, Top Rankings (IIRF ranks as published, directory lists A to Z, best places) + Trending Now (exam dates and newest guides, not a popularity claim), Popular Exam Preparation (real set and question counts; New/Updated only from the feed) + Claim promo, Featured Schools (fee only when official; no "Featured" badge because no paid placement exists yet), Grow with SchoolDhundo | Done |
| Photos: 18 licensed images (Wikimedia Commons CC BY/BY-SA/public domain, Unsplash License) as WebP in `frontend/public/images/home`, credited under "Photo credits" | Done |
| Footer: navy, Schools/Rankings/Exams/Resources/Contact; no invented email, phone or social accounts (contact form links instead) | Done |
| Phones: categories two per row; rankings, exam prep and featured schools in swipeable rows; no horizontal overflow at 360/390/768/1024/1440 | Done |
| Removed with the old homepage: fee chart component, `useInView`, the single-box search mode | Done |

## 9. Homepage refinement (live 14 November 2026 as 283ae12)

| Item | Status |
| --- | --- |
| Header: Schools, Rankings, Admissions, Exam Prep, Notifications only; Compare moved into the Schools menu and the blog into Admissions ("Guides for parents"); List Your School removed; Google sign-in unchanged; smaller dropdowns | Done |
| Hero: one licensed photograph (Unsplash, Akshar Dave) in the curved panel instead of two overlapping pictures; 480–1600 px WebP; also in the pre-rendered HTML; preloaded on wide screens | Done |
| Updates: equal-height cards, title and summary two lines each, date and source in one footer, no picture repeated in a grid, four cards on phones; one school's same-date notices for different classes merged into one update | Done |
| Explore by Category: Find Schools, Boarding Schools, Schools by City (`/cities`), Admissions & Fees; one photo ratio; Compare removed | Done |
| Top Rankings: larger photos with the title on them, readable rank numbers, publisher chips (IIRF 2026, Listed A–Z) instead of paragraphs; Trending Now with larger thumbnails | Done |
| Exam preparation: four equal cards with photos; Claim Your School banner removed | Done |
| Grow with SchoolDhundo: Sponsored Listings, Lead Generation, Advertise With Us only (enquiry form and Advertise page); Advertise page now says paid placements are labelled "Sponsored" | Done |
| Footer: Blog & Articles and Add / List Your School removed; shorter | Done |
| Photos added (Unsplash License): two classrooms by Swastik Arora, one by CIMT HOOGHLY; JNV photo re-cropped to remove a camera date stamp; two unused Sainik School photos removed | Done |
| Measured on a production build (cold cache): layout shift 0.34 → 0.001 (loading placeholder now a full screen; sign-in slot keeps its width); phone LCP (4× CPU, 4G) about 3.9 s → 1.6 s; desktop LCP about 1.4 s | Done |
| Signed-out visitors get 401 from `/api/v1/account/me`; that is how the app learns nobody is signed in, not an error | Checked, unchanged |

## 10. Daily official-notification check (live 14 November 2026 as 3940405)

Details, sources and operations: [NOTIFICATION_SYNC_GUIDE.md](NOTIFICATION_SYNC_GUIDE.md).

| Item | Status |
| --- | --- |
| Daily check at 6:00 AM IST (`@Scheduled`, `app.notifications.cron`, zone Asia/Kolkata) inside the always-on backend; one run at a time across servers (PostgreSQL advisory lock); unfinished runs marked ABANDONED on restart; catch-up run after a restart if the last success is over a day old | Done |
| Safe fetching: https only, per-source host allowlist, private and reserved addresses refused (also after redirects), robots.txt obeyed, honest user agent, timeouts, 3 attempts with backoff, size cap, refusals reported as BLOCKED and never worked around | Done |
| Sources: NTA (AISSEE and RIMCEE, archive table, date from NTA's upload-stamped file names), Navodaya (public JSON API), Netarhat (dated home-page notices), KVS (Notifications/Recruitment and Admission tables), CBSE (blocked: 403 to automated clients; review only), Rashtriya Military Schools (undated; review only). RIMC, Sainik Schools Society portal and state admissions investigated and documented | Done |
| Stored in the existing `site_update` table (V43: new columns, indexes, `notification_sync_run` for run history); PENDING_REVIEW and EXPIRED statuses; dedupe by source id or canonical address; corrections recorded without moving the publication date; withdrawn and superseded notices tracked; every change audited | Done |
| Published automatically only from an approved source with a date printed by the source and a link on its own hosts; otherwise waits for review with the reason; undated notices cannot be published until an editor confirms the date; summaries are one templated sentence, never copied text | Done |
| Public: `/api/v1/updates` (unchanged), `/api/v1/updates/past` (expired, badge EXPIRED), `/api/v1/updates/sync-status` (last and next check only). Staff: review queue, sync status, run history with per-source results; "Check now" for ADMIN only, with a 10-minute cool-down | Done |
| Home page refreshes the feed every 15 minutes (also the open tab) and keeps the last cards on failure; says "Official sources checked daily at 6:00 AM IST · last checked …"; `/updates` gains "Past updates" | Done |
| First live check (start-up catch-up, 14 Nov 2026, 9:36 pm IST): 39 new notices, 14 published and 25 waiting for review (22 of them from Rashtriya Military Schools, which prints no dates); CBSE blocked (403); next scheduled check 6:00 AM IST | Checked |

## 11. Rankings page redesign and IIRF audit (live 14 November 2026 as 55c9b10)

| Item | Status |
| --- | --- |
| /rankings rebuilt as its own page (`pages/RankingsHome.tsx`); other ranking pages, routes and redirects unchanged | Done |
| Compact navy hero "Discover India's Best Schools" with four separately labelled counts (schools with a published rank, schools in the premier directory, states and boarding schools in the directory) and the published list's highest-placed schools | Done |
| Four primary categories (National, Boarding, State & City, Board-wise) linking to the existing pages; Compare hidden on this page only | Done |
| Published ranking first: "IIRF 2026 — Top (10+2) Schools in India", links to IIRF's page and methodology, disclosure; Top 10/20/100/All by published rank (`?top=`), ties labelled, filters (school, state, board; city and school type under More filters) never renumber; premium table on desktop, cards on phones | Done |
| Explore by category: six cards plus "Explore more categories"; each card marked "Published ranks" or "Directory · A to Z" | Done |
| Explore Premier Schools: photo-first preview (new `sort=photo` on the directory API), branded fallback instead of coloured initials, credits shown on photos, unconfirmed details marked | Done |
| IIRF audit: our 91 entries match IIRF's main "Top (10+2) Schools in India Ranking 2026" (IIRF's own page lists the same leaders in the same order); the "Best Schools in Academic Performance" label belonged to a separate top-10 table. V44 corrects the name and category with an audit-log entry; no rank changed | Done |
| Wikimedia Commons now refuses 640px thumbnails: four stored photos (Lawrence School Lovedale, RIMC, Sherwood, Woodstock) fail wherever they are shown with their stored address; the rankings page requests standard widths | Found; fixed on /rankings only |
| 15 freely licensed Commons photos checked by eye for premier schools that had none (`data/images/premier-school-photos-2026-11.json`, `tools/apply-school-photos.mjs`); applied locally, not on the live site | Ready to apply |
| Server-rendered /rankings now carries the published top 20 with links, the source line and the category links; new title and description | Done |

## 12. UDISE+ links on school profiles (built 15 November 2026; not deployed)

Details: [UDISE_INTEGRATION_GUIDE.md](UDISE_INTEGRATION_GUIDE.md).

| Item | Status |
| --- | --- |
| Read-only live audit: 33,072 schools (33,060 active), 0 with a UDISE+ code, 0 official UDISE+ addresses; codes are not in CBSE's SARAS records | Done |
| Portal checked: its links are `/#/schooldetail/{its school id}/{year id}` from its own search (captcha), so direct links are never built from a code | Done |
| "Official UDISE+ School Information" card in each profile's Overview: checked link → "View Official UDISE+ Details" (new tab, code, date); otherwise "Find This School on UDISE+" with the code to copy, or the school's name and place | Done |
| V45: three nullable columns on `school` (profile link, checked date, match status) with a CHECK allowing only https kys.udiseplus.gov.in school-detail pages; no row changed, no index added | Done |
| Admin: per-school panel to save a checked code and link (`PUT /admin/schools/{id}/udise`); ADMIN-only dry-run/apply matcher for an official list (`POST /admin/import/udise`), same state + PIN + names, unambiguous only, batched and repeatable | Done |
| Bulk codes: no lawful bulk source reachable (Data Sharing Portal needs a formal request; secondary sources say the 11-digit code is no longer shared; OpenCity refuses automated access) | Owner to obtain a list |

## 13. Admissions and school jobs from official sources (live 20 November 2026 as ce64eac)

Details, sources and operations: [NOTIFICATION_SYNC_GUIDE.md](NOTIFICATION_SYNC_GUIDE.md) ("Source registry" and "Admissions and school jobs").

| Item | Status |
| --- | --- |
| Source registry: 14 reviewed official sources in `notifications/sources.json` (five Sainik Schools, BPSC, DSSSB, Odisha Adarsha Vidyalaya Sangathan, NESTS/EMRS, Mayo College, Assam Valley, Vidya Devi Jindal, Good Shepherd Ooty, DPS R. K. Puram), read by three configurable methods (WordPress media API, S3WaaS document tables, HTML selectors); each entry checked at start-up and left out (reported) if wrong; 20 sources in all with the six built-in ones | Done |
| Registry table `notification_source` (V47): each source's institution, type, place, method and reliability, and its last attempt, last success, outcome, error and failures in a row; shown to staff; run records pruned after 180 days | Done |
| Facts read from official titles (English, Hindi, Odia; Indian digits): kind of notice, posts (PRT/TGT/PGT/NTT, leadership, librarian, lab, warden, office and support staff), subjects, teaching or not, contract or regular, number of posts, classes, session, opening, last, exam and walk-in dates (only after a cue word, only if plausible); posts of a multi-post notice stored separately (`site_update_position`); nothing guessed | Done |
| Rules: application status from official dates only (open, closing soon, opening soon, closed, last date not announced); openings expire on their last date and closed ones are not added; non-school posts from school systems wait for review; commissions keep school posts only; editor facts and posts are never overwritten | Done |
| Existing Admissions and Jobs tabs (home page and /updates) show the new notices in the existing cards, ordered open-first with the nearest last date first; All, Exams and Prep unchanged; no home-page file changed | Done |
| New pages: `/jobs` (filters: state, post; more filters: school type, teaching, subject, status) and `/jobs/{slug}`, `/admissions/{slug}` (status, key facts, posts, questions answered from facts, official links); API `GET /api/v1/notices`, `GET /api/v1/notices/{slug}` | Done |
| SEO: page heads with BreadcrumbList, WebPage and (current job openings only) JobPosting without pay or direct-apply claims; noindex for results, closed and title-only notices; `/sitemaps/notices.xml`; server-rendered bodies; `/jobs` canonical for every filter combination | Done |
| Admin: facts and posts editing, public-page link, source health and registry problems in the sync panel | Done |
| Live check of the real official sites from a local server (20 Nov 2026, real fetcher, local database; nothing written to the live site): all 14 registry sources read OK, CBSE still blocked (403); 26 new notices: 8 published (Mayo College ×2 openings, Sainik School Korukonda TGT result and shortlist, Vidya Devi Jindal "TGT MATHS", Sainik School East Siang AISSEE 2027 details, OAV admission notices ×2) and 18 for review (14 undated NESTS/EMRS results, DSSSB "Advertisement 05/2026" naming no post, Goalpara's file-named advert, two Rewari adverts matched on weak words); 23 jobs, 3 admissions. 36 earlier notices filled in at start-up | Checked |
| Home page unchanged: no home-page or layout file changed; production builds before and after compared in Chrome against the same data: desktop pixel-identical; phone same height and layout, pixel variation only in the hero photo and smaller than the variation between two captures of the same build | Checked |
| Not done: PDF text reading for last dates (most notices give none in their titles), conditional requests (ETag), KV school websites (list of addresses needed), private careers pages without a list of openings | Open |
| Tests: backend full suite 425 tests, 0 failures (new: classifier, rules, registry against saved excerpts of the real pages, ingest rules, end-to-end admissions/jobs IT); frontend 53 files, 226 tests; type-check and production build pass. Existing tests changed only to truncate with CASCADE (new posts table) and, in NotificationSyncIT, to pick the official AISSEE item by its exact title (it failed when run after other suites that leave exam notices) | Done |
| Deployed 20 Nov 2026 (ce64eac): V47 applied on the live database in 0.22 s; 14 registry sources loaded; 35 earlier notices given their facts and page addresses at start-up. First live check (run #9, started with the admin "Check now" right after the deploy): all 14 registry sources OK from the server, CBSE blocked; 26 new (8 published, 18 for review; 23 jobs, 3 admissions), the same as the local check. Live checks: /jobs head and server-rendered body, notices API (16 current jobs, 3 admission notices), sitemap index with notices.xml (2 indexable pages), JobPosting absent without a last date, noindex for non-school posts, admin endpoints 401 without sign-in | Live |
