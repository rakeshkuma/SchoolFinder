# SchoolDhundo rankings platform: implementation guide

Live site: <https://schooldhundo.in> · Prepared: 11 November 2026

How the rankings, boarding and government-school pages work, where their data comes from, what was added in this
round, and how to add rankings in future without breaking trust. Nothing on the site invents a rank, a fee or a fact.

---

## 1. Principles (apply to every change)

1. **Every rank belongs to its publisher.** It is shown exactly as published, with the publisher's name, year and
   category. Ranks from different publishers are never merged into an overall rank.
2. **No rank is invented.** A category without a verified published ranking says "No published ranking yet".
   Filtering a national list never renumbers it, and the page says so.
3. **Three kinds of source, never confused:**

   | Kind | Examples | Used for |
   |---|---|---|
   | Official information | CBSE SARAS, Navodaya Vidyalaya Samiti, Sainik Schools Society, EMRS (Ministry of Tribal Affairs), KVS | That a school exists, its affiliation, location, residential status, official contacts and admission notices |
   | Independent published rankings | IIRF, EducationWorld, Green Schools Programme (CSE) | Published rank, year, category, publisher's methodology |
   | Discovery directories | Edustoke, Boarding Schools of India, Careers360 | Finding schools to check; never copied, never shown as a rank |

4. **Respect publishers.** Private rankings and directories are not scraped or copied. An administrator enters short
   facts (school, rank, year, link) only for publishers who have given permission (section 6).
5. **Paid content is labelled and separate.** Sponsored or featured entries never appear as ranks and never change a
   rank, score or fact.

---

## 2. What exists after this round

| Page | Address | What it does |
|---|---|---|
| Rankings menu | header | Ten items in three groups (Rankings · Boarding & residential · By board); a mega-menu on desktop, an accordion on phones |
| India's Top Schools | `/rankings` | Hero search (school, state, city, board, type) · nine category cards with honest counts · national table with Top 10/20/100/All, filters (state, city, board, government/private, boarding/day, boys/girls/co-ed, year, publisher), sorting (rank, name, state, city), pagination, phone cards · compiled A-to-Z list · environmental ratings kept separate |
| State & City Rankings | `/rankings/states` | Every state and city with ranked or listed schools · Top 10/20/50/100 · board, government/private and boarding filters · links to the "best schools in" pages |
| Best schools in a place | `/rankings/best-schools-in-{state-or-city}` | Ranked, listed and directory counts · intro written from those facts · ranked table · the place's A-to-Z list (cities narrowed to their town) · methodology note · four FAQs answered from the data · related places |
| Board-wise Rankings | `/rankings/boards?board=CBSE|CISCE|IB|CAMBRIDGE|STATE` | One page with a tab per board that has data; affiliation (official) kept apart from rank (publisher) |
| Government & Boarding | `/rankings/government-boarding` (`?tab=boarding&group=BOYS|GIRLS|CO_ED`) | Ranked government and boarding schools · a section of government networks, each labelled Residential or Day schools, with the official site |
| Network directories | `/network/jawahar-navodaya-vidyalaya`, `/sainik-school`, `/eklavya-model-residential-school`, `/rashtriya-military-school`, `/kendriya-vidyalaya` | Every school of the network with filters; official description and link |
| Boarding directory | `/boarding` and `/boarding/{india,government,private,boys,girls,co-ed,affordable}` | Unchanged; `/boarding-schools/...` now redirects here (301) |
| Compare | `/compare` | Up to four schools · share link · **print** · classes ("Up to Class XII" where only the CBSE level is known) · fees, admissions, facilities · published rank, source and year · "Not available" never counted as zero |

### Files changed

- Frontend: `components/layout/MainNav.tsx` (menu), `pages/RankingHubPage.tsx` (all ranking pages, best-in pages,
  networks section), `content/networks.ts`, `pages/DirectoryPages.tsx` (network pages), `pages/ComparePage.tsx`,
  `components/school/SchoolListSection.tsx` (town filter), `components/common/Badges.tsx` (`PaidLabel`),
  `pages/admin/AdminExternalRankingsPage.tsx` (permission), `index.css` (print), `nginx.conf` (redirects), `App.tsx`.
- Backend: `RankingCatalogService` (sort), `BestPlacesService` (new), `ExternalRankingController` (`/rankings/best`,
  `/rankings/best/{slug}`, `sort`), `SeoHeadService` (titles for best-in and network pages), `SitemapController`,
  `ExternalRankingServiceImpl` and `RankingPublisher` (permission), migration **V38** (`ranking_publisher.permission_status`,
  `permission_updated_on`).

### APIs

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/rankings/table?edition=&state=&city=&board=&schoolType=&gender=&residence=&government=&boarding=&maxRank=&q=&sort=RANK|NAME|STATE|CITY&page=&size=` | Sorting changes order only |
| GET | `/api/v1/rankings/best` | States and cities with ranked or listed schools |
| GET | `/api/v1/rankings/best/{slug}` | One place; 404 when unknown |
| PUT | `/api/v1/admin/ranking-publishers/{code}` | Now accepts `permissionStatus`: NOT_REQUESTED, REQUESTED, GRANTED, NOT_NEEDED |

All other ranking APIs are unchanged.

---

## 3. Data model (existing, extended)

- `ranking_publisher`: who publishes (code, name, kind, website, methodology, **permission status and date**).
- `ranking_category`, `ranking_edition`: a publisher's list for one year and category, its scope (national, state,
  city), methodology summary and source URL.
- `ranking_parameter`: the publisher's own criteria and weights, where published.
- `ranking_source`: one school's entry in one edition, with national, state and city rank kept in separate columns,
  score or rating, source URL, retrieved date, verification status, last verified date, sponsored flag.
- `ranking_import_job`: each CSV import, published only after an administrator approves it.
- `school_list`, `school_list_item`: SchoolDhundo's compiled A-to-Z lists (not ranks).
- `school_ranking`: SchoolDhundo's own evidence score, kept separate and labelled.
- History: each year is its own edition, so past years stay as published. A current rank is never copied into an
  earlier year.

---

## 4. Data today (10 November 2026)

| Data | Count |
|---|---|
| Published ranks shown | IIRF 2026: 91 (written permission still awaited) · Green Schools ratings: 65 |
| A-to-Z listed schools | 781 in 14 lists |
| Boards | CBSE 19,316 · CISCE 19 · IB 3 · Cambridge 0 |
| Boys / girls / co-ed known | 749 schools |
| Boarding known | 672 schools |
| Networks | KV 1,239 · JNV 648 · EMRS 322 · Sainik 10 · Rashtriya Military 5 |
| "Best schools in" pages | 37 places; indexed when at least 3 schools are ranked or listed |

**Gaps to fill (in this order):** EducationWorld and other publishers' ranks (with permission) · the remaining Sainik
Schools from the AISSEE bulletin's official list · ICSE, IB and Cambridge schools from cisce.org, ibo.org and
cambridgeinternational.org school finders (affiliation only) · boys/girls/co-ed and boarding status for more schools ·
verified fees.

---

## 5. SEO

- Every ranking page has its own title, description, canonical URL, Open Graph tags and breadcrumbs, rendered on the
  server (nginx SSI), so Google sees them without JavaScript.
- Best-in pages: title "Best Schools in {Place} {year}: Rankings and School Lists", the year appearing only when a
  published ranking covers the place; description states the real counts. Places with fewer than 3 ranked or listed
  schools are `noindex` and left out of the sitemap.
- Network pages and best-in pages are in `sitemap.xml`. Unknown addresses are `noindex`.
- No claim such as "India's No. 1" appears unless a named publisher's rank says so for a named list and year.

---

## 6. Admin: adding a ranking

1. **Admin → Published rankings → Publishers**: create or edit the publisher. Set **Permission**:
   - *Permission granted*: the publisher agreed in writing (keep the email).
   - *Permission requested*: asked, waiting.
   - *Official source*: government or board data, no permission needed.
   The badge on each publisher shows the status and the date it changed. Adding an entry for a publisher without
   permission shows a warning.
2. **Add one entry**: pick the school, publisher, ranking name, edition (year), category, scope (India, state, city),
   rank, the publisher's page and the date you read it. It is saved **unverified**.
3. **Or import a CSV** (template on the page): rows are validated, duplicates refused, and nothing is public until an
   administrator approves the import and writes what was checked.
4. **Verify** each entry against the publisher's page. Only verified, non-sponsored entries appear publicly.
5. Paid or featured placements: tick "Paid / featured listing". They are never shown as ranks.

Every change is in **Admin → Audit log**.

---

## 7. Monetization foundation

| Product | Status | Rule |
|---|---|---|
| Google AdSense | Slots ready (`AdSlot`), off until approval; see `GOOGLE_SEO_ADSENSE_DEPLOYMENT_GUIDE.md` | Labelled "Advertisement" (`PaidLabel`), after consent, never inside rankings, facts or tests |
| Sponsored school listings / featured boarding school | Data flag exists (`sponsored`); display component `PaidLabel kind="Sponsored"` | Clearly labelled; never a rank; separate from editorial lists |
| Premium school profiles (gallery, verified contacts, admission updates, virtual tour) | Not built | Facts still need an official source; mark school-provided content |
| Parent enquiry / lead form | **Deferred by the owner** | Needs explicit consent per school, a purpose statement, retention limits and legal advice under the DPDP Act before any personal data is shared with schools. Proposed fields: parent name, phone or email, preferred area, class, schools of interest, consent checkbox per school |
| Premium exam material | Not built | Free practice stays free |

Never sell ranks, never promise admission, never present paid content as editorial.

---

## 8. Testing (11 November 2026)

| Check | Result |
|---|---|
| Backend tests (`mvnw test`, embedded PostgreSQL) | 292 passed, 0 failed (new: sorting, best-in pages and their SEO, publisher permission) |
| Frontend type check, unit tests, production build | 0 type errors · 143 passed, 0 failed (new: category cards) · build passed |
| Browser (1280 px and 390 px) | Menu (10 links, all working), `/rankings` hero search and filters, best-in pages (Bihar, Patna, Gurugram, unknown place → not found), state Top 10, government networks, network pages, compare (print, classes, ranks), `/boarding-schools/girls` redirect: no overflow, no script errors |

---

## 9. Deploying and rolling back

Deploy with `.\deploy\oracle-micro-deploy.ps1` after approval. Migration V38 adds two columns with defaults, so older
code keeps working; rolling back the code needs no database change. nginx gains the `/boarding-schools` redirects (the
deploy script installs `nginx.conf`).
