# SEO audit and review with Ubersuggest and Windsor.ai — 24 Nov 2026

For the site owner. It covers what Search Console, GA4, Bing and Ubersuggest show for schooldhundo.in, what a full
crawl of the live site found, what was changed in the code (local, not committed, not deployed), and what needs you.

## 1. Summary

1. **Google is showing the site far more, but clicks are flat.** Impressions went from 360 (10–16 Nov) to 3,183
   (17–23 Nov), and the average position improved from about 37 to 14. Clicks went from 40 to 28, and the earlier week's
   clicks were mostly your own visits to the homepage.
2. **None of the site's own events have ever reached GA4.** The app sends 10 events (mock test started and finished,
   admission enquiry, school search, profile view…) as plain Tag Manager pushes, and the container has no tag that
   forwards them. This was tested on the live container. **Fixed** (F1): the same events now reach GA4.
3. **37% of impressions are on school profiles that are now noindex.** 253 bare listings that Google indexed just
   before the 16 Nov noindex still get about 100 impressions a day. As Google recrawls them, total impressions will
   drop by about a third. That is expected, not a penalty. The list is saved for editors to enrich first.
4. **Exam pages are the strongest section; rankings pages are the weakest.** Exam pages get 20 clicks from 369
   impressions at position 10 (Netarhat: 10% click rate). Rankings pages get 1 click from 376 impressions at position 49.
5. **ChatGPT is the biggest source of new visitors.** 17 users (14 new), mostly to /exams/jnvst. Ubersuggest's AI
   tracker found the site in none of its 5 answers so far, because its prompts are not the questions that bring people.
6. **Bing barely knows the site:** 3 impressions in two weeks.
7. **The site is technically clean.** All 2,658 sitemap pages return 200, none is noindex, every canonical matches,
   no title or description is missing, and the JSON-LD is valid. The main remaining issue is thin server HTML on 48 pages.
8. **Built** (F2–F4): count-led titles for 1,405 place pages, exam guide titles with the year, and distinct
   descriptions for job notices that shared one.

## 2. Sources and their limits

| Source | What it gave | Limits |
|---|---|---|
| Search Console (Windsor, `searchconsole`) | Clicks, impressions, position by day, page, query, device and country, 9–24 Nov | Data starts 9 Nov; the last 1–2 days are provisional. Most queries are hidden by Google. Page sums (84 clicks) exceed the site total (68). |
| GA4 (Windsor, `googleanalytics4`) | Sessions by channel, source and landing page; events, 12–24 Nov | Only visitors who accept cookies are counted. |
| Bing Webmaster (Windsor) | Clicks and impressions by day | One row in two weeks. |
| Ubersuggest project (free plan) | Weekly site audit (19 Nov, 150 pages), rank tracking for 25 keywords, AI visibility, backlinks, saved SERPs | No paid report was used today (0 of 3). A recrawl was not requested: on 19 Nov it cost a report and returned the cached crawl. |
| Own crawl, 24 Nov | Every sitemap URL (2,658) and every page with impressions (574), as Googlebot sees them without JavaScript | Read-only, three requests at a time. |

Windsor is on a trial plan. 13 pulls were used: 8 Search Console, 4 GA4, 1 Bing.

## 3. Search Console (9–24 Nov)

**By week**

| Week | Clicks | Impressions | Note |
|---|---:|---:|---|
| 10–16 Nov | 40 | 360 | Most clicks were to the homepage (GA4: one mobile visitor made 36 sessions there, most likely you) |
| 17–23 Nov | 28 | 3,183 | 23 Nov is provisional (fresh data) |

The daily position improved from 37.7 (14 Nov) to 13.9 (22 Nov). Mobile ranks far better than desktop in India
(position 9.3 against 29.4; 51 of the 70 clicks).

**By section** (page-level figures)

| Section | Pages | Clicks | Impressions | Position |
|---|---:|---:|---:|---:|
| School profiles | 292 | 13 | 1,630 | 12.7 |
| States, districts, towns | 211 | 4 | 780 | 13.4 |
| Rankings | 15 | 1 | 376 | 48.6 |
| Exams | 15 | 20 | 369 | 10.3 |
| Blog | 6 | 1 | 170 | 12.8 |
| Network pages | 2 | 0 | 80 | 41.9 |
| Boarding | 6 | 0 | 78 | 30.6 |
| Homepage | 1 | 34 | 75 | 3.8 |
| Boards | 5 | 1 | 47 | 57.8 |

**What people searched** (the visible part: 416 queries)
- **Names of individual schools**, usually at positions 6–12 ("moga devi minda memorial school" 20 impressions at 6.9,
  "kk cambridge international school" 13 at 11.2). They almost never click: they want the school's own website.
- **"<school> education fee payment"** (about 25 queries): people looking to pay fees online. The site cannot help them.
- **Small towns, where the site ranks on page 1:** "schools in naharlagun" (8.7), "naharlagun school list" (5),
  "singtam school" (9), "daman school list" (10), "top 10 schools in gandhidham" (7). Place-page searches often say
  "list" or "school list".
- **Exam searches carry the year:** "jnv mock test class 6 2027" (21 impressions, position 8.5, the only visible
  non-brand click), "navodaya mock test for class 6 free 2027" (9), "navodaya vidyalaya age limit for class 6 2027".
- **Competitive lists, on page 5–7:** "top ib schools in india" (28 impressions, 62.7), "ib schools in india" (56.9),
  "best schools in faridabad" (54.2), "top 10 cambridge schools in india" (61). IB *boarding* searches do better
  (17.8–22).

**Duplicate addresses.** 28 URLs with query strings appear (`?tab=`, `?page=1`, `?state=`, `?topic=`, `?tag=`). Every
one has the right canonical. The `?tab=` ones predate the 23 Nov fix. `?page=1` is the *second* page of a district list
(the app counts from 0), so its content differs from page 1 and Google indexes it separately: 2 lists, 9 impressions
(left as a decision, §8).

**Two pages compete for Cambridge searches.** /boards/CAMBRIDGE (3 schools, 75 words of server HTML) and
/rankings/cambridge-schools (29 schools) both appear for "cambridge schools in india", "cambridge board in india" and
"top 10 cambridge schools in india", at positions 50–78.

## 4. The noindex profiles still in Google

| Profiles shown in search, 9–24 Nov | Pages | Impressions | Clicks |
|---|---:|---:|---:|
| Indexable | 20 | 152 | 3 |
| **Noindex** (bare listings, since 16 Nov) | **253** | **1,369** | **10** |

Daily, the noindex profiles went from 75 impressions (16 Nov) to 224–250 (20–22 Nov). Google first showed them in the
same days the noindex went out, and has not recrawled them yet (they are no longer in the sitemap). They are thin
(median about 260 words), but 154 of them rank at position 10 or better for their own name.

**What it means:** when Google drops them, total impressions will fall by roughly a third, and profile clicks will
fall by a few a week. That is the noindex working, not a ranking problem.
**Recommendation:** keep the rule. It protects the whole site's quality signals. Enrich these schools first (official
website, description, photo, fees or admission dates), which makes them indexable under the existing rule. The list
is in `tools/seo/data/noindex-profiles-in-search-2026-11-24.csv`, sorted by impressions.

## 5. GA4 (12–24 Nov)

| Channel | Sessions | Users | New users | Note |
|---|---:|---:|---:|---|
| AI assistants (chatgpt.com) | 24 | 17 | 14 | 16 sessions on /exams/jnvst (mobile), about 3½ minutes engaged |
| Google organic | 55 | 9 | 7 | 36 sessions from one mobile visitor on "/" |
| Referral: accounts.google.com | 39 | 4 | 3 | The Google sign-in return, not a referral |
| Direct | 37 | 17 | 16 | |
| Bing, msn.com, paid, unassigned | 7 | 7 | 4 | |

Netarhat visitors from Google stay about 22 minutes per session: they take the mock tests.

**The measurement gap.** GA4 recorded only its automatic events: page_view 1,970, scroll 186, form_start 47,
click 34, file_download 8 and view_search_results 6, from 47 users. None of the site's 10 events arrived. A test on the
live container, with every analytics request blocked before it left the browser, showed the cause:
`dataLayer.push({event: 'quiz_start'})` sends nothing, while `gtag('event', 'quiz_complete', …)` sends it at once.
The container has only the Google tag, with no Custom Event trigger and no GA4 event tag. Fixed in F1.

## 6. Bing

There were 3 impressions (19 Nov) and no clicks in two weeks. GA4 shows 1 Bing visit. Bing matters beyond its own
share: Copilot, DuckDuckGo and Ecosia use its index, and AI assistants use it too. See §8.

## 7. Ubersuggest

- **Site audit** (project crawl of 19 Nov, 150 pages): health **77** (was 63).
  - All 150 pages are OK.
  - Errors: low word count on 50 pages; one slow page, /rankings/best-schools-in-kolkata at 4.8 s from a US crawler
    (0.24 s today).
  - Warnings: 8 "non-friendly URLs". These are /boards/CBSE, /boards/IB and the other upper-case board codes, plus
    /cities, /fees, /nearby and /states. The lower-case board addresses already work and point to the canonical, so
    no URL change is needed.
  - The weekly update is due about 26 Nov.
- **Rank tracking** (25 keywords, desktop, India, 19 Nov): none in the top 100. They are head terms ("sainik
  schools", "kvs admission", "best schools in delhi") that a site with Domain Authority 1 cannot reach yet. Search
  Console shows where the site is close.
- **AI visibility:** 5 of the 10 prompts answered so far (ChatGPT). SchoolDhundo appears in none; the brands named are
  Sainik Schools, JNV and NTA.
- **Backlinks:** Domain Authority 1, 0 backlinks, 0 referring domains (unchanged; see the Backlink Growth Plan).
- **Saved search results:**
  - "jnv mock test class 6" is held mostly by weak sites (Domain Authority 3–15), the one opening the site's exam
    pages can win.
  - "top ib schools in india" and "best schools in faridabad" open with an AI overview, then school blogs and the big
    directories. Their titles carry the year, fees and a count ("12 Best IB Schools in India 2027-28: Fees, Reviews").

## 8. Findings and actions, in priority order

| # | Finding | Evidence | Action | Status |
|---|---|---|---|---|
| 1 | No custom events reach GA4 | §5; live-container test | F1: send events as `gtag('event')` | **Built, tested** |
| 2 | Place pages get 0.5% clicks at position 13 | 4 clicks / 780 impressions; "school list" searches | F2: "List of 14 Schools in Gandhidham, Gujarat" | **Built, tested** |
| 3 | Exam guide titles lack the year; the KV title promised a syllabus | JNV Class XI: 31 impressions at 8.1, no click | F3: "JNV Class XI 2027: eligibility, dates, pattern and syllabus"; "KV admission 2027-28: eligibility, dates and admission steps" | **Built, tested** |
| 4 | 14 job notices share one description | Crawl: Doon International School, Bhubaneswar | F4: the post leads the description when the summary names none | **Built, tested** |
| 5 | Noindex profiles hold 37% of impressions | §4 | Keep the rule; enrich the listed schools first | **Editors** |
| 6 | Bing has almost no data | §6 | In Bing Webmaster Tools, confirm the sitemap is submitted and read; add IndexNow (I can build it) | **You** |
| 7 | Ubersuggest tracks unreachable keywords and the wrong AI prompts | §7 | Swap some keywords for near-page-1 ones ("jnv mock test class 6 2027", "best ib boarding schools in india", "schools in naharlagun") and add the JNVST mock-test question ChatGPT sends people for | **Your OK** (it changes your Ubersuggest setup; 1 of 100 brand operations used) |
| 8 | 48 indexable pages have under 150 words of server HTML | Crawl (§9) | Server bodies for the rankings tool pages (/rankings/government-boarding ranks at 8–11 for government-boarding searches with 30 words), then /about, /editorial-policy and /corrections-policy | Next round |
| 9 | Cambridge board page competes with Cambridge rankings | §3 | Option: noindex board pages with fewer than 10 schools (Cambridge 3, IB 7) so the fuller page wins | **Your decision** |
| 10 | `?page=1` lists are indexed on their own | §3 | Option: self-canonical numbered pages (Google's advice) or noindex,follow; 9 impressions, low impact | **Your decision** |
| 11 | accounts.google.com counts as a referral | 39 sessions | GA4 → Data streams → Configure tag settings → List unwanted referrals | **You** |
| 12 | Two school names in the wrong case | "Jawahar Navodaya Vidyalaya Budaun Up", "… Bemetara Cg" | Correct the two records in the admin | **Editors** |

## 9. The live crawl (24 Nov)

- **2,658 sitemap URLs**, all HTTP 200: pages 117, places 1,368, exams 143, blog 13, notices 32, schools 985.
  - None is noindex.
  - No canonical points elsewhere.
  - Every page has exactly one title, one canonical and one H1.
  - No description is missing or over 160 characters.
  - No JSON-LD is invalid.
- **Titles:** 14 are over 60 characters. They are six bilingual AISSEE practice sets, four JNV names that are really
  addresses, one blog category and one blog post. There is one group of duplicates (six Doon International jobs, fixed
  in the local 39th round).
- **Thin server HTML** (indexable, under 150 words):
  - 48 pages. Most are policy and tool pages (/about 30, /contact 23, /privacy 24, /fees 25).
  - Nine rankings tool pages: /rankings/government-boarding 30, /rankings/methodology 30, /rankings/schools-by-city 31,
    /rankings/boards 34, and others.
  - /admissions/guide 42, /admissions/notifications 28, /boards/CAMBRIDGE 75, /boards/IB 109, and the blog category
    pages at about 105.
  - Three of the 48 (/exams/calendar, /exams/resources, /exams/practice) are already fixed in the local 39th round.
- **Speed:**
  - One request at a time, an uncached page renders in 0.13–0.6 s; a cached page takes about 0.11 s.
  - At three requests at once: median 434 ms, 90th percentile 1.0 s, 99th 2.9 s, slowest 6.4 s (the Olympiad class
    pages and the "best schools in" pages, the slowest to render).
  - nginx's cache works.

## 10. What was changed (local, uncommitted)

| | Files |
|---|---|
| F1 events | `frontend/src/utils/analytics.ts` (`track()` sends `gtag('event', …)` after Accept), `analytics.test.ts` |
| F2 place titles | `SeoHeadService.placeTitle(count, place, state)`: "List of N Schools in …"; the state is dropped first, then the count, when over 60. `SeoBodyService.state/city`: the server heading stays the app's "Schools in …" |
| F3 exam titles | `SeoHeadService.examGuideTitle`, `examName` (the cycle year, shared with the description) |
| F4 job descriptions | `SeoHeadService.noticeDescription` |
| Tests | `SeoSnippetTest` (+2), `SeoHeadTitleTest`, `SeoHeadIT`, `SeoBodyIT`, `ExamApiIT` |
| Data | `tools/seo/data/noindex-profiles-in-search-2026-11-24.csv` (253 profiles) |

Several of these files also carry the 39th round's uncommitted changes, so the two rounds go out together.

**Verified**
- **Backend:** full suite, 457 tests, 0 failures (24 Nov, with the 39th round's changes in place).
- **Frontend:** no type errors, 239 tests pass, production build OK.
- **Live Tag Manager test:** a plain push sent nothing; `gtag('event')` sent the event with consent granted. Every
  request was blocked before it left the browser.
- **App test in Chrome** (local dev server reading the live site's data, analytics blocked):
  - before Accept, none of the site's events is sent;
  - after Accept, `school_profile_view` (school, state, board) and `exam_page_view` (exam) are sent.

## 11. After a deploy: checks and measurement

1. **GA4:** open Realtime on a phone, accept cookies and start a mock test; `quiz_start` should appear. Then, in Admin →
   Events, mark `generate_lead` and `quiz_complete` as key events. To see parameters in reports, register `exam_slug`,
   `set_slug` and `school_slug` as custom dimensions (optional).
2. **Titles:** view the source of /states/gujarat/city/gandhidham (title "List of N Schools in Gandhidham, Gujarat") and
   /exams/jnv-class-11 ("JNV Class XI 2027: …").
3. **Re-check through Windsor around 8 Dec and 22 Dec:**
   - CTR of place pages (baseline 0.5% at position 13.4) and of exam guides (baseline JNV Class XI: 0 of 31).
   - Impressions of the noindex profiles (expected to fall).
   - GA4 key events.
   - Bing impressions (baseline 3).
4. **Ubersuggest:** the rank update on 26 Nov and the next weekly audit; AI visibility monthly.
