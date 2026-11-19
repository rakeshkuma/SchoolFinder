# Zero new users in GA4, and SEO health: investigation of 19 Nov 2026

All findings were checked on the live site, https://schooldhundo.in, on 19 Nov 2026. Fixes are in the local workspace
only: nothing was committed, pushed or deployed.

This report was written in two sessions on the same day. The morning session found the GA4 problem (section A). The
afternoon session, with Ubersuggest connected, added section B and the rows marked **(afternoon)**.

**What could not be checked, and why:**
- **Google Analytics, Search Console and Bing:** no access from either session. No traffic, click or ranking numbers
  appear below.
- **Server access logs:** the request to log in to the web server, even read-only, was refused by the permission
  system. The script for reading them is now in `deploy/visitor-report.sh`.
- **A fresh Ubersuggest crawl:** see section B.1.

---

## A. Why GA4 shows no new users

### Confirmed (tested on the live site)

| Check | Result |
|---|---|
| Tag on the page | Google Tag Manager `GTM-PZ7WSXBS` on every page tested; the container holds GA4 `G-ESGRNYGQHQ` with automatic page views |
| Content Security Policy | Both inline scripts match the allowed sha256 values; the GA4 hit to `www.google-analytics.com` is allowed |
| Page views | One `page_view` per page, both on first load and on in-app navigation (home → /rankings → /exams/jnvst); no duplicates |
| New-user and session flags | `_fv=1` (first visit) and `_ss=1` (session start) on the first hit |
| Visitor who accepted cookies | Full hit, `gcs=G101`: counted as a user |
| Visitor who has not accepted | Cookieless ping only, `gcs=G100`: **not shown as a user** in GA4's reports |

All test hits were intercepted and blocked in the browser, so none reached your GA4 property.

**1. GA4 counts only visitors who click Accept.** This is how the site was designed (Consent Mode, default
"denied"). Visitors who ignore or decline the banner send cookieless pings, and GA4 does not report them as users.
Google can estimate them through behavioural modelling, but only on properties with far more traffic than this one.
So "users" in GA4 means "people who clicked Accept", which on a new site may be close to zero on a given day.

**2. Defect: on slow page loads the cookie banner never appears (live since 15 Nov, commit 6d9c666).**
- `index.html` adds the Tag Manager script only after the page's `load` event.
- The banner, the footer's "Cookie settings" link and the site's own events all checked for that script when the page
  first drew. If `load` came later, as on a slow mobile connection or with a slow image, they decided there was no
  Tag Manager and did not check again until the visitor moved to another page.
- A visitor who read one page and left was never asked, so was never counted.

Measured on the live site, with page load delayed by one slow image:

| Page | Banner at 2 s | at 12 s | at 25 s (load finished) |
|---|---|---|---|
| `/` | no | no | **no** |
| `/schools/erudite-academy` | no | no | **no** |
| `/exams/jnvst` | no | no | **no** |

- With simulated slow 4G and no other delay, `/exams/jnvst` also never showed the banner.
- On a fast connection the banner did appear, so the problem depends on the visitor's connection.
- The same fault dropped `school_profile_view`, `quiz_start` and the other site events when they fired before load.

**Fixed locally** (section E). With the same delay, the fixed build shows the banner at 2 s on all three pages.

**3. Not a cause: one blocked extra request.** On every page Google's tag also tries `www.google.com/g/collect`,
which the security policy blocks. That request serves Google signals and advertising features, not the GA4 hit that
counts users. I have not unblocked it: doing so would send more data to Google, including for visitors who declined.
That is your decision.

### Probable

- **Very few real visitors yet.** The site has been live since 10 Nov. On 17 Nov Ubersuggest found 0 backlinks and
  domain authority 1. Few visitors, times the share who click Accept, times the banner defect, can easily make zero
  on some days.
- **The timing doesn't fully match.** The banner defect began on 15 Nov, but you saw zero from about 17 Nov. If GA4 did
  show new users on 15–16 Nov, there may be a second cause that only Search Console or the server logs can show.

### Unknown (needs your access)

1. **GA4 → Reports → Realtime.** Open the site on your phone in a private window, click Accept, and check you appear
   within a minute.
2. **GA4 → Admin → Data settings → Data filters.** Check whether an "Internal traffic" or "Developer traffic" filter
   is set to *Active* rather than *Testing*.
3. **The report's date range.** GA4 is in Pacific time by default unless the property's time zone is India, and the
   most recent 24–48 hours are still being processed.
4. **Search Console → Performance.** Compare clicks and impressions for 10–16 Nov with 17–19 Nov. If impressions
   exist but clicks are 0, nobody is arriving from Google yet, and GA4 is not the problem.
5. **Server logs:** run `ssh -i <key> ubuntu@152.67.7.170 "sudo bash -s" < deploy/visitor-report.sh`. It prints daily
   page views, visits from Google and Googlebot fetches, without any IP addresses. nginx logs Caddy's address for
   everyone, so "visitors" there means distinct browsers, a lower bound.

---

## B. Ubersuggest (afternoon, connector attached)

The account is on the **free plan: 3 reports a day**. All 3 were used today. All figures are for India, in English.

### B.1 Site audit: no fresh crawl was possible

I asked for a new 150-page crawl. Ubersuggest used a report but returned its **cached crawl of 16 Nov**, and checking
again later still showed that crawl. Its figures were:

| Metric | 16 Nov crawl | Still true today? |
|---|---|---|
| Health score | 63 | Unknown: not re-measured |
| Pages crawled, all status 200 | 150 | Yes (my own crawl, section C) |
| "Low word count" | 150 of 150 | Partly: server HTML now carries more text (17 Nov), but not re-measured |
| Titles over 60 characters | 46 | **No**: fixed on 17 Nov. Today 14 of 2,625 sitemap titles are over 60 |
| Short titles | 3 | Not re-measured |
| Missing titles, missing descriptions, duplicates, broken links, 4xx | 0 | Yes |

**To get a fresh score:** start a recrawl from the Ubersuggest web app (Site Audit, then Recrawl) after the next deploy.
The connector's recrawl did not start one.

### B.2 Backlinks (no report needed)

| Domain authority | Backlinks | Referring domains | .gov/.edu domains |
|---|---|---|---|
| 1 | 0 | 0 | 0 |

These are unchanged since 17 Nov. **Links from other sites are still the biggest gap.**

### B.3 Keyword demand (1 report: seeds "best schools in", "boarding schools in", "cbse schools in")

Ubersuggest found 12,063 matching keywords and gave figures for the top 17. Here they are next to the page that serves
each one today:

| Keyword | Searches a month | Difficulty (0–100) | SchoolDhundo page today |
|---|---|---|---|
| cbse schools in near me | 110,000 | 34 | `/nearby` (map search) |
| best schools in near me | 22,200 | 24 | `/nearby` |
| best schools in india | 14,800 (+8,100 for a second variant) | 10–13 | `/rankings`: **title changed to lead with this phrase** (section E) |
| best schools in delhi india / best schools in delhi | 12,100 / 8,100 | 10 / 13 | `/rankings/best-schools-in-delhi` (40 ranked, 113 listed) |
| best schools in hyderabad (two variants) | 12,100 / 8,100 | 18 / 10 | `/rankings/best-schools-in-hyderabad`: only 3 ranked and 4 listed, so the page is thin |
| best schools in bangalore india / best schools in bangalore | 12,100 / 8,100 | 15 / 17 | `/rankings/best-schools-in-bengaluru` (14 listed; the title already says "Bangalore") |
| 10 best schools in india | 9,900 | 11 | `/rankings` |
| best boarding schools in india | 9,900 | 13 | `/rankings/boarding-schools` ("India's Top Boarding Schools: 62 Schools") and `/boarding/india` |
| best schools in chennai city | 8,100 | 14 | `/rankings/best-schools-in-chennai`: only 3 listed |
| best schools in cbe (Coimbatore) | 8,100 | 11 | No "best" page (no ranked or listed school); `/states/tamil-nadu/city/coimbatore` lists 83 schools |
| cbse schools in kolkata | 8,100 | 17 | `/states/west-bengal/city/kolkata` (65 schools); "CBSE" is not in its title |
| best schools in hyderabad for cbse | 6,600 | 19 | `/rankings/best-schools-in-hyderabad` |

Earlier finds, still valid: "sainik schools" 90,500 a month at difficulty 10, "admission kvs" 165,000 at 14, and
"jnvst class 6" 5,400 at 11 (16 Nov). One more lookup today (1 report): **"aissee 2027" gets 390 searches in October,
peaking at 2,400 in September (application month), difficulty 19.** Exam searches are seasonal: plan updates for the
month before each application window.

**What this shows:**
- Difficulty is low (10–19) on every "best schools in {big city}" query, and the site already has a page for most of
  them. The limit is not the pages but the site's authority (0 backlinks) and, for Hyderabad and Chennai, thin lists.
- The site does not make a "best schools in {city}" page for a city with no ranked or listed school. That is
  deliberate, to avoid thin or invented rankings, so I did not add pages for Coimbatore or Pune.

### B.4 What people search for exams (free Google autocomplete, 1,826 phrases read)

Across "jnvst 2027", "aissee 2027", "netarhat vidyalaya", "rimc admission", "navodaya vidyalaya admission form" and
"sainik school admission", the same needs repeat:
- **dates:** exam date, application last date, registration date, admit card;
- **forms:** application form, "form pdf", "apply online";
- **rules:** age limit, eligibility, **Class 9 entry** (JNVST Class 9, AISSEE Class 9, RIMC Class 9);
- **content:** syllabus, exam pattern, books;
- **Netarhat:** fees and fee structure, cut off, "details in hindi";
- **Hindi phrasing:** "navodaya vidyalaya form kaise bhare", "form bharne ke liye kya kya document chahiye",
  "netarhat vidyalaya ka exam kab hoga", "rimc mein admission kaise hota hai".

These match what the guides already cover, except that **Class 9 entry, Hindi question headings and Netarhat fees** are
thin or missing. Those are content work for the roadmap (section G), not code fixes.

### B.5 Competitors

Ubersuggest's setup analysis suggested 16 competitor domains, among them Uniapply, Edustoke, Careers360, Shiksha,
SchoolMyKids, Ezyschooling, ParentCircle and AdmissionDekho. No competitor keyword report could be run, because all 3
reports were used. Tomorrow's best use of the 3 reports:
1. `domain_keywords` for schoolmykids.com (closest to the school directory);
2. `domain_keywords` for ezyschooling.com (ranks #2 for "sainik schools");
3. `match_keywords` for "navodaya", "sainik school", "kvs admission" with the domain filter on.

### B.6 AI search visibility: set up, waiting for your approval

Ubersuggest can track whether ChatGPT, Gemini and Google AI Overviews mention SchoolDhundo, for up to 10 questions
(free plan: 1 project, 1 brand, 10 prompts, 25 tracked keywords, 2 competitors). **Nothing has been created yet.** The
setup is held at its review step, and saving it uses one of the 100 monthly brand credits.

Its own suggested questions were mostly about buying coaching and books, which the site doesn't offer. I recommend these
10, which match what the site answers:
1. How do I apply for JNVST Class 6 2027?
2. What is the AISSEE 2027 eligibility for Class 6?
3. What is the Netarhat Vidyalaya entrance exam pattern?
4. How can I find a school's UDISE code?
5. Which are the best CBSE schools in Patna?
6. List of Sainik Schools in India and how to get admission
7. What is the difference between CBSE and ICSE?
8. Which schools are there in Buxar, Bihar?
9. Best boarding schools in Dehradun with fees
10. Free Class 5 Olympiad practice questions

Competitors: Edustoke and SchoolMyKids. 25 keywords for weekly ranking tracking: the B.3 keywords that have a page, plus
sainik schools, aissee 2027, jnvst class 6, navodaya vidyalaya entrance, netarhat vidyalaya entrance exam, rimc admission,
rashtriya military school admission, kvs admission, udise code, schools in buxar and class 5 olympiad questions.

---

## C. SEO findings from today's crawl

I fetched all 2,625 sitemap pages as Googlebot.

| | Result |
|---|---|
| Status | 2,625 × 200; no redirects or errors |
| noindex pages in the sitemap | 0 |
| Canonical tag is not the page's own address | 0 |
| Missing title, description or H1 | 0 / 0 / 0; no page has two H1s |
| Duplicate titles | 0 |
| Structured data | School + BreadcrumbList + FAQPage on profiles, BreadcrumbList on guides, Quiz on practice sets, BlogPosting on articles |
| Server HTML words (median) | profiles 350, place pages 536, exam pages 217, blog 342 |

| Priority | Finding | Status |
|---|---|---|
| **High** | Cookie banner and events lost on slow page loads (section A.2) | Fixed locally |
| **Medium (afternoon)** | **10 boarding pages the app links to look like copies of the home page to search engines.** `/boarding/sainik-schools`, `/boarding/rimc`, `/boarding/netarhat`, `/boarding/rashtriya-military-schools` and 6 more are linked from the exam guides. The server sent them the home page's title, description and heading, with no canonical. Google renders the JavaScript and sees the right heading, but crawlers that don't (most AI crawlers) see the home page. 7 of them repeat a school profile, and 2 repeat a network page already in the sitemap | Fixed locally: each has its own title and description, and a canonical to the matching profile or network page |
| **Medium (afternoon)** | **Unknown addresses inside a section were indexable copies of the home page** (soft 404s): `/boarding/uttarakhand`, `/type/private`, `/stages/anything`, `/admissions/anything`, `/rankings/lists`. The app shows "page not found" there, but the server sent the home page's head without `noindex` | Fixed locally: any address no page answers is now `noindex`, as unknown schools and states already were |
| Medium (afternoon) | `/rankings` is the page for "best schools in india" (14,800 a month, difficulty 10), but its title began "India's Best Schools", and its description was cut mid-sentence ("…") | Fixed locally |
| Low (afternoon) | 19 of 392 sampled sitemap pages have a description that is one long sentence, cut with "…" at 160 characters (static pages such as `/exams`, `/updates`, `/schools`, and place pages with long state names) | Not changed: Google cuts at about 155 characters anyway. Rewrite them as two sentences when next edited |
| Medium | 61 practice sets shared 17 descriptions: each was cut short before the words that tell sets apart, so all five "JNVST Arithmetic" sets looked identical in search results | Fixed locally |
| Medium | 9 district and city titles over 60 characters, because of long state names (e.g. "Schools in Diu District, Dadra and Nagar Haveli and Daman and Diu") | Fixed locally |
| Medium | 12 tool pages have under 70 words of server HTML: `/find`, `/fees`, `/compare`, `/nearby`, `/admissions/notifications`, `/admissions/guide`, `/exams/calendar`, `/rankings/methodology`, `/rankings/score` and others | Not changed: needs written content (backlog item B5 from 17 Nov) |
| Low | 14 titles still over 60 characters: AISSEE practice titles in Hindi and English, 5 long school names, 2 blog titles | Not changed: comes from content |
| Low | District names shown in odd case: "Dr. B.r. Ambedkar Konaseema", "Mcb", "North And Middle Andaman" | Not changed: data display |
| Low | 1,507 of 2,625 sitemap URLs have no `lastmod` | Acceptable: Google ignores lastmod unless it is reliable |
| Low | FAQPage data on profiles: Google shows FAQ results only for government and health sites | Harmless; not changed |

Response times: single fetches took 0.15–0.4 s. The 3–5 s seen during the crawl came from my own 4-at-a-time
fetching on the 1 GB server, not from Googlebot-like traffic.

---

## D. AEO and GEO

The work from 17 Nov (answer-first server HTML on profiles, entity data, exam Article data) is still there. One GEO
change this afternoon: the 10 featured boarding pages now give AI crawlers that don't run JavaScript their own heading
and summary instead of the home page's (section C).

No AI-search visibility has been measured yet. Ubersuggest's tracker is ready to start once you approve it (section B.6).
It tracks ChatGPT, Gemini and Google AI Overviews, but not Perplexity or Copilot. Until it starts, or alongside it, the
manual baseline is to ask these 10 questions monthly in each assistant and record whether schooldhundo.in is cited:
1. How to apply for JNVST Class 6 2027
2. AISSEE 2027 eligibility Class 6
3. Netarhat Vidyalaya entrance exam pattern
4. How to find a school's UDISE code
5. Best CBSE schools in Patna
6. Sainik schools list in India
7. Difference between CBSE and ICSE
8. Schools in Buxar
9. Boarding schools in Dehradun fees
10. Class 5 Olympiad practice questions

---

## E. Local code changes

| File | Change | Why |
|---|---|---|
| `frontend/src/utils/analytics.ts` | `tagManagerPresent()` also recognises Tag Manager's inline loader in `index.html`, which is on the page from the start | Fixes A.2: the banner, the "Cookie settings" link and early events no longer depend on when `load` fires. No change to `index.html`, so the security-policy hashes stay valid |
| `frontend/src/utils/analytics.test.ts` | New test: before load, consent is asked and an early event is queued for Tag Manager | Covers the fix |
| `backend/.../service/SeoHeadService.java` | New `placeTitle` for district and city titles (the state is left out only when the title would be over 60 characters without it); new `practiceDescription` (starts "Practice set N:", or "Mock test N:" for mocks, when the address ends in a number) | Section C, Medium |
| `backend/.../service/SeoHeadTitleTest.java` | Tests for both | |
| `deploy/visitor-report.sh` (new) | Read-only daily visitor count from the nginx logs, printing no IP addresses | Gives a count of real arrivals that doesn't depend on GA4 |
| `backend/.../service/SeoHeadService.java` **(afternoon)** | New `BOARDING_FEATURES`: title, description and canonical for the app's 10 featured boarding pages, using only facts those pages state. The final fallback is now `noindex`, and the unused `APP_SECTIONS` list is removed. The `/rankings` title and description are reworded | Section C, the three Medium rows from the afternoon |
| `frontend/src/pages/RankingsHome.tsx` **(afternoon)** | Same `/rankings` title and description as the server | So the title doesn't change on in-app navigation |
| `backend/.../controller/SeoHeadIT.java`, `SeoBodyIT.java`, `RankingsHomeIT.java`, `service/SeoHeadTitleTest.java` **(afternoon)** | Tests: unknown section addresses are noindex; featured boarding pages have their own head and server heading. A check fails if the app's list (`content/boarding.ts`) and the server's list drift apart. The `/rankings` title | Covers the changes. One old assertion (`/rankings/lists` indexable) was wrong: the app shows "page not found" there |
| `SEO_TRAFFIC_INVESTIGATION.md` (new) | This report | |

Nothing in UDISE+, sign-in, exam progress, comparison or rankings was touched. There are no new dependencies, no
database changes, and no changes to GA4 or Tag Manager settings.

---

## F. Test results

- **Frontend:** type check clean; all 52 test files and 220 tests pass; the production build succeeds.
- **Backend:** SeoHeadTitleTest (10 tests), SeoHeadIT (8) and SeoBodyIT (10) all pass.
  - **Full suite:** 385 of 386 pass. The one failure, in `NotificationSyncIT` (the daily official-notice check, not
    touched here), depends on test order: the test picks the first feed item whose title contains "AISSEE-2027", and
    the shared test database also holds the AISSEE-2027 exam notice. Run on its own it passes, both on the original
    code and with these changes.
- **Server heads from the local backend running the new code:**
  - all 1,368 place pages return 200, with 0 titles over 60 characters (9 before) and no duplicates; no title
    already within 60 changed;
  - every practice set in the local database has its own description. Three live sets (`jnvst-reading-1`,
    `jnvst-figures-1`, `jnvst-reasoning-1`) are not in the local copy, and already have distinct descriptions live.
- **Live behaviour, before and after:** measured in headless Chrome against the live site and a local production
  build, with all Google Analytics hits blocked. Results are in sections A.2 and H.
- **Title change:** applied to all 2,625 crawled titles, it produces no duplicates.
- **Afternoon re-run, with all changes from both sessions:**
  - frontend type check clean; 52 test files and 220 tests pass; production build succeeds;
  - the 6 SEO test classes pass: SeoHeadTitleTest 11, SeoHeadIT 8, SeoBodyIT 10, RankingsHomeIT 3, SeoHeroPreloadTest 2,
    SeoSamplesDumpIT 1;
  - full backend suite: 386 of 387 pass. The one failure is again `NotificationSyncIT` (same order-dependent test as
    above). Run on its own just afterwards, it passes all 12 tests.

---

## G. Roadmap

Until Search Console data is in hand, these are planning steps, not forecasts.

**First 7 days**
- Deploy the banner fix, then check GA4 Realtime with an Accept on a phone.
- Run `deploy/visitor-report.sh` and read Search Console's Performance report. Together they show whether anyone is
  arriving.
- After deploying, start an Ubersuggest recrawl from its web app (the connector can't), and approve or edit the AI
  visibility tracker (section B.6).
- Spend the next days' 3 reports on the competitor keyword runs in B.5.

**First 30 days**
- In Search Console, list the pages with impressions and positions 8–30. Improve those pages first (titles,
  answer-first opening, internal links) rather than adding new ones.
- Write server content for the 12 thin tool pages (backlog item B5).
- From B.4: add Class 9 entry (AISSEE Class 9, JNVST Class 9 lateral entry), Hindi question headings ("form kaise
  bhare", "kya kya document chahiye") and Netarhat's fee position to the existing exam guides, checked against the
  official notices. These are updates to existing pages, not new pages.
- From B.3: the Hyderabad (3 ranked, 4 listed) and Chennai (3 listed) "best schools" pages are thin for queries with
  8,000–12,000 searches a month. Add schools there only from published, verifiable rankings or lists.
- From B.3: "cbse schools in {city}" (Kolkata alone: 8,100 a month). Check what share of each city page's schools is
  CBSE before putting "CBSE" in city titles. It must be true of the list.
- Work on the keyword gaps already found: Sainik Schools (90,500 a month, difficulty 10) has a hub page with only
  22–33 real schools listed; KVS admission (165,000, difficulty 14) and JNVST Class 6 have existing pages.

**First 60 days**
- **Backlinks**, the largest gap (0 on 17 Nov):
  - ask schools whose profiles you have verified to link to their page;
  - list the free JNVST, AISSEE and Netarhat practice on teacher and parent forums where that is allowed;
  - offer the UDISE+ how-to as a resource.
  - No paid links.

**First 90 days**
- Compare 28-day periods in Search Console, with the same date boundaries each time.
- Growth milestones:
  - **100 organic visitors a day:** about 3,000 clicks a month, which at a 2–3% click rate needs roughly 100,000–150,000
    impressions a month, mostly from long-tail school and exam searches on page 1.
  - **500 a day:** needs several head terms (Sainik, JNVST, KVS) on page 1.
  - **1,000 a day:** needs the same, plus backlinks.

  These are planning figures, not promises.

---

## H. Before and after

**Measured after the deploy (7a44c20, 19 Nov afternoon)**, with the same slow-load test on the live site and all GA4 hits
blocked: the banner and the "Cookie settings" link were shown at 2 s on `/`, `/schools/erudite-academy` and
`/exams/jnvst` (3 of 3; it was 0 of 3 that morning). The AI visibility tracker (B.6) was saved the same day with the 10
questions listed, Edustoke and SchoolMyKids, and 25 keywords tracked weekly.

| Check | Live site before the deploy | Fixed local build |
|---|---|---|
| Banner shown when load is delayed (/, profile, /exams/jnvst) | 0 of 3 | 3 of 3, at 2 s |
| "Cookie settings" link in that case | 0 of 3 | 3 of 3 |
| `school_profile_view` and other events before load | dropped | queued for Tag Manager (unit test) |
| Practice sets sharing a description | 61 sets, 17 descriptions | 0 (local server) |
| District and city titles over 60 characters | 9 | 0 |
| All sitemap pages 200, indexable, self-canonical | yes | unchanged |
| Featured boarding pages with their own title (afternoon) | 0 of 10 (home page's head) | 10 of 10 (local tests) |
| Unknown section addresses marked noindex (afternoon) | 0 of 5 tested (`/boarding/…`, `/type/…`, `/stages/…`, `/admissions/…`, `/rankings/lists`) | 5 of 5 (local tests) |
| `/rankings` title starts with "Best Schools in India"; description not cut (afternoon) | no / cut | yes / whole |

No SEO score or traffic change is claimed: none was measured after the change, because nothing was deployed.
