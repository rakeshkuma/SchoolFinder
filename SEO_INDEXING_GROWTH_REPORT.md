# SchoolDhundo: indexing and organic growth report (17 Nov 2026)

Three earlier SEO rounds built the base this report builds on:
- [SEO_AUDIT_AND_PLAN.md](SEO_AUDIT_AND_PLAN.md) (25th round): robots, CLS, server-rendered blog and exams, split sitemaps.
- 26th round: bare CBSE listings set to noindex.
- [SEO_UBERSUGGEST_AUDIT.md](SEO_UBERSUGGEST_AUDIT.md) (27th round): server head kept, 60-character titles.

This round audited the live site again and fixed what it found in the code. Nothing has been deployed, pushed or
committed. No school record, database schema, question, answer, timer, score or ranking was changed.

**Sources used**
- Live site: public URLs only, fetched on 17 Nov 2026.
- Repository code.
- Ubersuggest (free plan, India, location 2356): 3 reports today, all used.
- Lighthouse 12.6.0 (mobile lab run against the live site).

**Not available**
- Google Search Console and Analytics. No connector was available, so every Search Console figure below says "Not
  available".
- Live database. It is reachable only over SSH, so the school data figures come from the public API, which lists every
  active school.

## 1. Scorecard

| Metric | Result |
|---|---|
| Active school profiles | **33,609** (public API, all 337 pages read) |
| Profiles offered for indexing (in sitemap, no noindex) | **985** (2.9%) |
| Indexed / unindexed school profiles | Not available (needs Search Console). Last owner export, 16 Nov: 96 indexed, about 20,000 "Discovered – currently not indexed" (before the 26th fix went live). |
| Sitemap coverage | **2,619 URLs** in 5 files: 116 pages, 1,368 places, 137 exams, 13 blog, 985 schools. All valid XML and absolute https URLs, with no duplicates and no localhost or staging URLs. |
| Sitemap URL validation | 2,619 fetched with 4 parallel requests. **2,595 were fine.** 23 intermittently went out without their head and content (timeout, fixed below). 1 is a real noindex page listed in the sitemap (Bhuj, fixed below). |
| Critical (P0) errors | **0 blockers on the live site**: robots.txt, canonicals, redirects, 404 handling and private pages are all correct (§2). |
| Organic clicks, impressions, average position | Not available (needs Search Console) |
| Organic keywords (Ubersuggest) | Not measured today: the 3 daily reports went on the site audit and keyword research |
| Core Web Vitals (lab, mobile) | Home: LCP 1.7 s, CLS 0. School profile: LCP 5.5 s, **CLS 0.228** (fixed below). Details in §5. |
| Ubersuggest site health | 63/100. The cached crawl dated 16 Nov returned no new errors. The low-word-count warning applies to server HTML, which this round enlarged. |
| Tests run | Backend: 374/374 (full suite, after the second set of changes). Frontend: 209/209, typecheck, production build. |

## 2. What is already right (checked, no change needed)

- **robots.txt:** only private areas are disallowed (admin, account, sign-in, saved, practice progress, attempts,
  sessions, leaderboard, achievements, challenges). The public API is allowed. The sitemap index is declared.
- **Host and redirects:** http, `www` and http-`www` all redirect to `https://schooldhundo.in/` in one hop (301/308).
- **Canonicals:**
  - Query strings and trailing slashes canonicalise to the clean URL (`/schools/?x=1` → `/schools`).
  - Every sitemap URL tested is self-canonical when served normally.
- **Missing schools and unknown paths:** these return the app's not-found page with `noindex` and no canonical. Google's
  JavaScript SEO guidance accepts noindex for single-page apps, so they will not be indexed as soft 404s.
- **Private practice progress:** `/exams/practice/progress` is disallowed in robots.txt and served with `noindex`. It
  exposes nothing to crawlers.
- **Structured data:**
  - School profiles carry School, BreadcrumbList and FAQPage.
  - Blog posts carry BlogPosting and BreadcrumbList; practice sets carry Quiz.
  - Exam and ranking pages carry BreadcrumbList.
  - There are no ratings, reviews or fees that the data does not hold.
- **Indexing API:** not used, and must not be. It supports only job postings and livestreams.

## 3. School-profile data quality and indexing strategy

All 33,609 active schools were read from the live public API.

| Field present | Schools | Share |
|---|---:|---:|
| Official website | 32,855 | 97.8% |
| City recorded | 19,687 | 58.6% |
| Classes offered | 1,738 | 5.2% |
| Gender (boys/girls/co-ed) | 1,332 | 4.0% |
| Map position | 1,158 | 3.4% |
| Boarding type | 663 | 2.0% |
| Real (non-illustrative) photo | 59 | 0.2% |
| Admission dates | 41 | 0.1% |
| Facilities | 18 | 0.1% |
| Published fees | 6 | <0.1% |

**Tiers**
- **Rich, indexable (985):** these have a description of 300+ characters, fees, admissions, facilities, a photo, a
  rank, a list entry, premier-directory data, boarding data or an approved review. By network: all 651 Jawahar Navodaya
  Vidyalayas, 21 of 33 Sainik Schools, all 5 Rashtriya Military Schools, 48 of 1,248 Kendriya Vidyalayas and 0 of 464
  Eklavya schools.
- **Partial (about 1,550):** these have 4 to 5 of the basic fields above (classes, gender, map, city, website, board)
  but nothing beyond them.
- **Sparse (about 31,000):** board listing, address and website only. These are the same CBSE affiliation facts that
  many other directories repeat word for word.
- **Duplicates:** 17 groups (38 schools) share a name, town and state. Spot checks (Calcutta Public School, St. Joseph's
  College Lucknow, Presidency School Bengaluru, St. Xavier's Ranchi) show different CISCE affiliation numbers and PIN
  codes. They are **separate branches, not duplicates**, so no record should be merged. Their page titles are now told
  apart by PIN code (§4).
- **Invalid or unavailable:** the API lists only active schools; inactive ones already have no public page.

**Recommendation: keep the current rule for now, and widen it in stages once Search Console shows the current set
being indexed.** The rule came from the owner's 16 Nov Search Console export, and Google has not yet recrawled since it
went live. Changing it now would hide whether it works. Sparse profiles are not deleted or hidden: visitors can still
reach them, and they keep their server-rendered content.

Suggested order for widening, each step only after the previous one reaches about 60% "Indexed" in Search Console:
1. Kendriya Vidyalaya and Eklavya profiles: high search demand ("admission kvs" 165,000 a month, Ubersuggest
   16 Nov), and the KV and EMRS admission rules make useful, network-specific content.
2. The partial tier (classes, gender and map present).
3. The rest, once editors or the UDISE+ import add facts.

Each step is a one-line change to `SchoolRepository.INDEXABLE`.

## 4. Changes made (in the repository, not deployed)

| # | Severity | Problem found (evidence) | Fix | Files |
|---|---|---|---|---|
| 1 | P1 | The server HTML of the ~55 "best schools in {place}" pages had about 80 words and **no school links**. These pages target the largest low-difficulty searches ("best schools in delhi" 8,100 a month, difficulty 13). | The server now sends the page's content: the publisher's ranks for the place as printed (never renumbered), the A-to-Z lists that name its schools (marked "not a ranking"), the methodology note, the questions and related places. It mirrors the app's page. | `SeoBodyService.bestPlace` |
| 2 | P1 | Hub pages had no links in server HTML: `/blog` and `/blog/category/*` (0 article links), `/exams` (0 exam links), `/exams/class/*`, `/exams/state/*`, `/boards/*` (0 schools), `/schools` (0 links) and 120 practice-set pages (72 words each). | Server bodies now list what each page lists in the app: published articles with excerpts; every exam, linked to its guide; the exams for a class or state; a board's best-documented schools; states and networks for the directory. Practice sets get their description, level, length and related sets, **without the questions or answers**. | `SeoBodyService` |
| 3 | P1 | 23 of 2,619 sitemap URLs (0.9%) went out with the generic head (no canonical, no H1) under 4 parallel requests. Rechecked one at a time, all were fine. Cause: nginx gives the SEO subrequests 3 s, and the burstable micro server misses that under parallel load. | The timeout is raised to 8 s. A cache lock makes simultaneous requests for one page wait for a single backend answer. Stale-on-error caching is kept, so a backend that is down still fails fast (2 s connect). | `frontend/nginx.conf` |
| 4 | P2 | **School-profile CLS 0.228** (Lighthouse mobile, Baldwin Academy; "good" is ≤ 0.1). On phones no space was kept for the photo while it loaded, so everything below jumped when it arrived. | When the server's head names a photo (`og:image`, set only for real photos), the phone layout keeps the 16:10 frame and the caption line while photos load. Profiles without a photo are unchanged. | `SchoolDetailPage.tsx`, `useDocumentTitle.ts` |
| 5 | P2 | `/states/gujarat/city/bhuj` was in the sitemap but served noindex. Two spellings ("Bhuj" 13 schools, "BHUJ" 1) share one slug, and the page picked the 1-school one. It is the only such case among 754 cities. | Pages now use the spelling with more schools, as the sitemap already does. School records are untouched. | `SeoHeadService.city`, `SeoBodyService.city` |
| 6 | P2 | Branches with one name in one town would get identical titles. | When such a namesake exists, the title adds the PIN code, e.g. "Calcutta Public School, Kolkata (700159): ICSE/ISC School Details". | `SeoHeadService.school`, `SchoolRepository.hasNamesake` |
| 7 | P2 | People search old city names: "best schools in bangalore" gets 12,100 a month at difficulty 15 (Ubersuggest, today), while the page says "Bengaluru". | "Best schools in" titles and descriptions add the well-known older name, for example "Best Schools in Bengaluru (Bangalore) 2026: Rankings". This applies to Bengaluru, Gurugram, Prayagraj, Mysuru, Vadodara, Puducherry, Thiruvananthapuram, Kochi and Ooty. | `SeoHeadService.PLACE_ALIASES` |
| 8 | P3 | The `/schools` title, "School directory", said nothing searchable. | It is now "Find Schools in India: CBSE & ICSE School Directory". | `SeoHeadService.PAGES` |
| 9 | P2 | More hub pages had no links in server HTML: `/boarding` and its 7 landing pages (0 schools), `/states` and `/cities` (no place links), `/rankings/states` (no best-schools links). | `/boarding/*` now lists up to 100 schools, A to Z, with the same filter and rule sentence as each app page. `/states` lists states and union territories with counts. `/cities` links every town that has its own page (3 or more schools). `/rankings/states` links every "best schools in" page. | `SeoBodyService` (second commit) |
| 10 | P2 | Profile LCP was 5.5 s on a phone: the photo request started only after the app had loaded the school and its photos. | The profile head now preloads the hero photo. It uses the same file and 1x/2x choice as the app (first non-logo photo, thumbnail with full size as 2x), so the browser downloads it once. | `SeoHeadService.heroPreload` (second commit) |

None of these changes adds noindex to any page, changes a slug or a URL, or adds a redirect. Every server-rendered body
shows only facts the app shows on the same page, so the content Google sees is the content visitors see.

## 5. Core Web Vitals (Lighthouse 12.6.0, mobile, live site, before this round's changes)

| Page | Performance | LCP | CLS | TBT |
|---|---:|---:|---:|---:|
| Home | 79 | 1.7 s | 0 | 890 ms |
| /states/bihar (long server list) | 83 | 2.6 s | 0 | 510 ms |
| School profile (Baldwin Academy) | 56 | 5.5 s | 0.228 | 420 ms |
| /rankings/best-schools-in-delhi | 72 | 4.1 s | 0.003 | 490 ms |
| /exams/jnvst | 61 | 4.8 s | 0.084 | 810 ms |

All five pages scored 100 for SEO.

- **Long server lists are safe.** The Bihar page already carries a 40-school, 90-link server list and shows no layout
  shift, so the larger bodies in change 1 and 2 should not shift either.
- **Profile LCP.** The largest element is the Wikimedia photo, loaded from upload.wikimedia.org after the app starts.
  It is now preloaded from the server head (change 10), the way the home page preloads its hero.
- **JNVST CLS (0.084).** This comes from web fonts swapping in. It is within the "good" limit.
- **After deploying (17 Nov 2026, c37dd45 + eb072dd, nginx cache cleared):**

  | Page | Performance | LCP | CLS | TBT |
  |---|---:|---:|---:|---:|
  | School profile (Baldwin Academy) | 56 → **77** | 5.5 → 4.8 s | 0.228 → **0** | 420 → 280 ms |
  | /rankings/best-schools-in-delhi | 72 → **82** | 4.1 → 3.8 s | 0.003 → 0 | 490 → 260 ms |
  | /boarding | **86** | 2.9 s | 0 | 360 ms |

  The sitemap check was re-run on a cold cache with 4 parallel requests: **2,615 URLs, 0 issues**. The 4 retired
  practice sets are out of the sitemap and return 410. Profile LCP is still bound by the photo download from
  Wikimedia's servers.

## 6. Keyword research (Ubersuggest, India, 17 Nov 2026)

Figures are Ubersuggest's estimates of monthly Google searches in India. SD is SEO difficulty (0–100). Rows marked
"16 Nov" come from the previous audit.

| Keyword | Volume | SD | Intent | SchoolDhundo page | Action | Priority |
|---|---:|---:|---|---|---|---|
| best schools in india | 14,800 | 10 | Informational | `/rankings` | Title already "India's Best Schools: Published School Rankings"; server list of ranks in place | High |
| 10 best schools in india | 9,900 | 11 | Informational | `/rankings` | Same page; top 20 ranks are in the server HTML | High |
| best schools in hyderabad | 12,100 | 18 | Commercial | `/rankings/best-schools-in-hyderabad` | Server content added (change 1) | High |
| best schools in bangalore | 12,100 | 15 | Informational | `/rankings/best-schools-in-bengaluru` | "(Bangalore)" added (change 7) | High |
| best schools in delhi | 8,100 | 13 | Commercial | `/rankings/best-schools-in-delhi` | Server content added | High |
| best schools in chennai city | 8,100 | 14 | – | `/rankings/best-schools-in-chennai` | Server content added | High |
| best schools in cbe (Coimbatore) | 8,100 | 11 | – | none: no ranked or listed school there yet | Needs real data first; no thin page | Later |
| cbse schools in kolkata | 8,100 | 17 | Informational | `/states/west-bengal/city/kolkata` | Directory page exists | Medium |
| cbse schools near me | 110,000 | 34 | Navigational | `/nearby` | Map search; local "near me" results favour Google Maps | Low |
| olympiad exam | 40,500 | 34 | – | `/exams/practice?category=OLYMPIAD` | Page exists; brief A below | Medium |
| olympiad math | 18,100 | 27 | – | same | Class-wise maths sets exist | Medium |
| school admission | 5,400 | 32 | Informational | `/admissions/guide` | Brief B below | Medium |
| sainik schools (16 Nov) | 90,500 | 10 | – | `/network/sainik-school` | Server-rendered list of 33 schools | High |
| admission kvs (16 Nov) | 165,000 | 14 | – | `/network/kendriya-vidyalaya`, `/exams/kvs-admission` | See §3 step 1 | High |
| jnvst class 6 (16 Nov) | 5,400 | 11 | – | `/exams/jnvst` | Title already targets it | High |

**Not targeted on purpose:** "hindustan olympiad question paper", "science olympiad foundation" and "SOF results" are
brand or official-paper searches. SchoolDhundo has no official papers and is not connected with those bodies, so
targeting them would mislead.

## 7. Content briefs (for the editor; nothing published)

**A. "Olympiad exams for school students in India: which to take, by class"**
- Keywords: olympiad exam (40,500), olympiad math (18,100), olympiad for class 5.
- Audience: parents of Classes 1–10.
- Outline:
  1. What school Olympiads are.
  2. The main ones (SOF IMO, NSO, IEO; HBCSE's IOQM path), each with its official site.
  3. Who can take which, by class.
  4. How registration works (through the school).
  5. How to practise, with a link to the class-wise sets.
- Sources: official SOF and HBCSE pages, with dates checked.
- Internal links: `/exams/practice?category=OLYMPIAD` and its class sets.
- Note: say clearly that SchoolDhundo's questions are original practice, not official papers.

**B. "School admission in India: a month-by-month calendar for parents"**
- Keywords: school admission (5,400), nursery admission, class 1 admission.
- Outline:
  1. Typical cycles (private nursery, Class 1, KVS, JNVST, AISSEE), each linked to its official notice.
  2. The documents needed.
  3. Age rules by state, only where a published source exists.
- Internal links: `/admissions`, `/admissions/guide`, `/updates`, the exam guides.
- Publish dates only from official notices; say "not announced yet" otherwise.

**C. "Best schools in Hyderabad: how to read rankings and lists"**
- Keyword: best schools in hyderabad (12,100).
- Outline:
  1. What the published ranking covers.
  2. How the A-to-Z lists differ.
  3. Board mix in Hyderabad (from directory counts).
  4. Questions to ask on a school visit.
- Internal links: the best-schools page and the city directory.
- No invented ranks.

**D. "Kendriya Vidyalaya admission: Balvatika, Class 1 and Class 2 onwards"**
- Keyword: admission kvs (165,000).
- Outline:
  1. The KVS online portal.
  2. Priority categories.
  3. Age limits from the current KVS guidelines.
  4. Lottery and waiting lists.
- Internal links: `/exams/kvs-admission`, `/network/kendriya-vidyalaya`.
- The 2027-28 notice is not out yet; the brief must wait for it.

**E. "Sainik School vs Navodaya Vidyalaya: entrance, fees, life"**
- Keywords: sainik schools (90,500), jnvst.
- Internal links: both prep dashboards and both network pages.

## 8. Tests run

- **Backend, targeted ITs:** SeoBodyIT, SeoHeadIT, BlogIT, RankingCatalogIT, SitemapIT, PracticeAdminIT,
  MemberPracticeIT and SeoHeadTitleTest. All pass after the changes. The new assertions cover:
  - the best-schools page, with a three-school Delhi fixture;
  - the blog index and category;
  - the exam hub and class pages;
  - board, directory and practice-set bodies, including that **no question or explanation is sent**;
  - PIN codes in namesake titles;
  - a town with two spellings.
- **Backend, full suite:** 374 tests, 0 failures, BUILD SUCCESS (17 Nov 2026, after changes 9 and 10; 371 after changes 1 to 8).
- **Frontend:** 209/209 Vitest tests (one new), `tsc --noEmit` clean, `npm run build` succeeds. index.html and its
  inline scripts are unchanged, so the CSP hashes still match.
- **Not run:** the nginx config check (`nginx -t`). There is no nginx on this PC; the deploy script runs it before
  switching. The directives added are standard (`proxy_read_timeout`, `proxy_cache_lock`, `proxy_cache_lock_timeout`).

## 9. After deploying (owner)

1. Deploy, then clear the SEO cache: `sudo find /var/cache/schooldhundo-api -type f -delete`.
2. Re-run the sitemap check. Expect 0 pages without a head, and Bhuj no longer noindex.
3. Re-measure with Lighthouse: the profile CLS should be ≤ 0.1.
4. In Search Console:
   1. Resubmit `sitemap.xml`.
   2. Use URL Inspection on a few key URLs only: home, `/rankings`, `/rankings/best-schools-in-delhi`,
      `/exams/jnvst`, `/network/sainik-school`.
   3. Export the Pages report (indexed and not indexed by reason) and the Performance report (queries, clicks,
      impressions, CTR, position).
   4. Repeat at 30, 60 and 90 days.
5. Once Search Console shows about 60% of the 985 profiles indexed, take step 1 of §3.

Checks that need signed-in Search Console access (not done):
- the Pages report by reason;
- crawl stats;
- Google-chosen canonicals;
- mobile and HTTPS reports;
- Performance queries;
- URL Inspection's rendered HTML.

## 10. Still open

- **Competitors, backlinks and AI search visibility:** no Ubersuggest report was left today on the free plan (3 a
  day). Run `competitors`, `backlinks_overview` and `brand_visibility_overview` on another day. The 16 Nov audit's
  ezyschooling.com gap is in SEO_UBERSUGGEST_AUDIT.md.
- **Data still to come:** Coimbatore, Pune and Chandigarh have search demand but no ranked or listed schools yet. They
  should get pages only when real data exists.
- **Remaining hub pages:** `/rankings/schools-by-state` and `/rankings/schools-by-city` (premier directory regrouped; its
  schools are already linked from the server-rendered category pages), and the admissions, fees, compare and nearby
  tools, which are interactive and have no fixed list to render.
