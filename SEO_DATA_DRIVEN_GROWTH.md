# SchoolDhundo: data-driven SEO, AEO and GEO round

Prepared 23 November 2026. Every number below comes from Google Search Console or Bing Webmaster Tools through the Windsor.ai connector (`searchconsole`, property `sc-domain:schooldhundo.in`; `bing_webmaster`, `https://schooldhundo.in`), or from the live site fetched as Googlebot on the same day. Nothing is estimated. Status: **committed as d75f3c6 and live on schooldhundo.in since 23 November 2026.**

## 1. Baseline: what Google showed (before these changes)

Window: Windsor's `last_28d` (as of 23 Nov 2026). Google has rows only from **9 Nov** (0 impressions that day) **to 21 Nov 2026**: the property starts collecting on 9 Nov, so "28 days" is really 12 days of data. 22 and 23 Nov were not final yet.

| Metric | Value |
| --- | --- |
| Clicks | **58** |
| Impressions | **2,598** |
| CTR | **2.23%** |
| Average position | **18.7** |
| Provisional, not final: 22 Nov | 8 clicks, 769 impressions |

Daily impressions rose from 9 (10 Nov) to 650 (21 Nov); the average position improved from about 37 (14 Nov) to 14.0 (21 Nov). Clicks stayed between 1 and 13 a day.

| Device | Clicks | Impressions | CTR | Avg position |
| --- | --- | --- | --- | --- |
| Mobile | 41 | 1,574 | 2.6% | 9.7 |
| Desktop | 16 | 1,002 | 1.6% | 33.3 |
| Tablet | 1 | 22 | 4.5% | 8.3 |

Why desktop ranks so much lower: desktop impressions come mostly from broad list pages shown deep in the results: the IB, Faridabad and Cambridge ranking pages (90, 51 and 39 desktop impressions at positions 44 to 65), `/boards/CAMBRIDGE` (all 38 of its impressions) and the JNV network page (31 at 63). Mobile impressions are mostly school profiles and exam pages at positions 7 to 14.

Countries: India had all 58 clicks and 2,477 impressions (position 17.9). The other 121 impressions are spread over 41 countries, with no clicks.

Queries: Google showed **334 queries**, but they account for only **1 of the 58 clicks** and 710 of the 2,598 impressions. The rest come from queries Google hides for privacy. That hidden traffic is real: it is not zero traffic, and it cannot be broken down by query. No query containing "schooldhundo" appeared.

Bing: **3 impressions and 0 clicks** in the same window (all on 19 Nov). Bing is not yet a meaningful source.

### Site sections (page-level data)

Page-level sums (73 clicks, 2,755 impressions) are higher than the site totals, because Google counts page data once per URL shown. The site totals above are the true figures.

| Section | Pages | Clicks | Impressions | Weighted position |
| --- | --- | --- | --- | --- |
| School profiles | 277 | 9 | 1,268 | 13.5 |
| City pages | 117 | 3 | 357 | 15.6 |
| Rankings | 15 | 1 | 309 | 49.1 |
| Exams | 13 | 17 | 257 | 10.0 |
| District pages | 46 | 0 | 111 | 13.6 |
| Blog | 6 | 0 | 102 | 13.9 |
| Home page | 1 | 32 | 66 | 3.8 |

### The priority pages

| Page | Clicks | Impressions | CTR | Position | Visible queries |
| --- | --- | --- | --- | --- | --- |
| `/exams/jnvst` | 5 | 103 | 4.9% | 10.5 | "jnv mock test class 6 2027" (21 impressions, position 8.5, 1 click); "navodaya mock test for class 6 free 2027" |
| `/blog/jnv-admission-guide-jnvst-class-6` | 0 | 79 | 0% | 10.9 | navodaya vidyalaya admission, jnvst class 6 admission, navodaya exam is for which class (position 4), nvs admission class 6, navodaya vidyalaya age limit for class 6 2027 |
| `/exams/netarhat` | 11 | 79 | 13.9% | 9.1 | netarhat previous year question (position 11) |
| `/schools/moga-devi-minda-memorial-school` | 0 | 29 | 0% | 7.5 | the school's name, with and without "hisar" (navigational) |
| `/rankings/ib-schools` | 0 | 96 | 0% | 57.4 | top ib schools in india (22), ib schools in india (16), good / best ib schools in india (9 each) |
| `/rankings/cambridge-schools` | 0 | 46 | 0% | 57.2 | best cambridge school, top 10 cambridge schools in india, cambridge curriculum schools in india |
| `/rankings/best-schools-in-faridabad` | 0 | 61 | 0% | 45.3 | best / top schools in faridabad, top 10 schools in faridabad |
| `/boards/CAMBRIDGE` | 0 | 38 | 0% | 64.0 | (hidden) |
| `/exams/aissee` | 0 | 24 | 0% | 16.5 | aissee mock test (position 73.5) |
| `/blog/sainik-school-entrance-exam-aissee-preparation` | 0 | 15 | 0% | 31.2 | aissee, total marks of sainik school entrance exam |
| `/network/jawahar-navodaya-vidyalaya` | 0 | 66 | 0% | 48.1 | top 10 navodaya vidyalaya in india |

Queries at positions 4 to 20 (123 query-page pairs) are almost all a school's or town's name, landing on its profile or city page at positions 6 to 13.

## 2. Technical problems found (with evidence)

1. **Google indexed school profiles at `?tab=` addresses (fixed).** Search Console reported **18 profile URLs with `?tab=boarding` or `?tab=ranking`** (87 impressions). For 11 of them (listed in §5), such as JNV Budaun (19 impressions), JNV Gulbarga (11) and Navy Children School Chanakyapuri (`?tab=ranking`, 8), Google had **no data at all for the plain profile address**. That means Google chose the tab copy as the main page, even though the server's canonical tag pointed to the plain address. Cause: boarding cards, ranking cards, the rankings pages, the home page rail, the reviews and admissions lists, and the profile's own "Ranking details" link all linked to `/schools/{slug}?tab=…`. The profile shows only the chosen section, so once Google runs the app, each tab address looks like a different page.
2. **Exam guide descriptions lost their useful part (fixed).** Each guide's description opened with the exam's full official name and conducting body. That alone filled the 160-character limit, so the exam date and "eligibility, pattern, syllabus" were always dropped. The AISSEE guide's description was 167 characters and ended in "…".
3. **Board pages titled by code (fixed).** "CAMBRIDGE schools in India" (38 impressions, position 64) and "STATE schools in India". `/boards/STATE` lists 0 schools, yet could be indexed (it is not in the sitemap).
4. **Thin IB and Cambridge list pages (fixed).** Each had about 280 words and a description of about 80 characters, because its second sentence (about 110 characters) was always dropped. `/boards/CAMBRIDGE` lists 3 schools and `/rankings/cambridge-schools` lists 29, and the two did not link to each other.
5. **Doubled place name in profile snippets (fixed).** The Moga Devi Minda profile's description read "Hisar, Hissar, Haryana" (city and district spelled differently). The same happens wherever a town and its district differ only in spelling.
6. **The feed linked to `?tab=admissions` (fixed in the app and the server HTML).** The API still sends the old path, for compatibility.
7. **Not changed (trade-off kept):** page 2 and later of district lists (`?page=1` …) point their canonical to page 1. Google's guidance is to give each page its own canonical; only 2 such URLs had impressions (2 each). The current rule was chosen to keep thin list pages out of the index, so this is left as a decision for later.
8. **Not changed:** exam guide `?tab=pattern` / `?tab=prep` links (2 URLs, 3 impressions; Google kept the plain address for the main JNV Class 11 guide: 14 impressions there against 2).

Checked and found sound: robots.txt (allows all public pages, blocks private ones, lists the sitemap); the sitemap index (6 files: 117 pages, 1,368 places, 143 exam URLs, 13 blog URLs, 32 notices, 985 schools); `http` and `www` redirect to `https://schooldhundo.in` in one hop; unknown addresses return a noindex page; every priority page answered in under 0.35 s as Googlebot, with its own title, canonical and server-rendered content.

## 3. Changes made

### Duplicate profile addresses
- New `frontend/src/utils/profileLink.ts` (with a test). Every link to a profile section is now the plain profile URL, and the section travels in the navigation state. The profile opens that section and then writes `?tab=` into its own address, so the page can still be shared at that section. The address crawlers find stays plain.
- Links switched in `BoardingCard`, `RankingCard`, `HomeSections` (rankings rail and feed rail), `HomeUpdates`, `UpdateCard`, `RankingHubPage`, `RankingsHome`, `RankingsPage`, `BoardingDirectoryPage`, `ReviewsPage`, `AdmissionsPages` and `SchoolDetailPage`. On the profile, the "Ranking details and sources" link is now a button, like its other section links. `AdmissionsPages` no longer links to `/schools/null` when a slug is missing.
- `SeoBodyService.plainProfilePath`: the server's HTML for the feed links to the plain profile address.

### Snippets and titles (`SeoHeadService`)
- `examGuideDescription`: "JNVST 2027 (Class VI): eligibility, age limit, exam pattern and syllabus from the official notice. Exam date: 28 Nov 2026." It leads with the short name and the cycle year ("JNV Class IX 2027", "Netarhat 2026-27"). "Age limit" is included only when the eligibility rules set one, and the Kendriya Vidyalaya admission guide (no test) promises "dates and admission steps" instead of a pattern and syllabus. `examDateSentence` says "held on" once the exam date has passed, so a snippet never offers a past date as the next one. This applies to the guides and to the three Class 6 preparation pages.
- JNVST preparation title: **"JNVST Class 6 Mock Test 2027: Free Navodaya (JNV) Practice"** (was "JNVST Class 6 Preparation 2027: Free Mock Tests"). It matches the page's two visible queries and keeps "JNVST Class 6". The app's copy is in `frontend/src/content/jnvstPrep.ts`.
- `boardLabel`: "Cambridge (CAIE)", "State board", "ICSE/ISC (CISCE)". A board with no schools is noindex, the same rule the sitemap uses. The app's `BoardPage` uses the same names; the IB and Cambridge board pages link to the fuller directory lists, in the app and in the server HTML.
- `directoryDescription`: the IB and Cambridge descriptions now keep their second sentence ("31 schools with board, boarding, approximate fees and how to verify each.").
- `schoolPlace`: one name per place on profile snippets ("Hisar, Haryana").

### IB and Cambridge explainers (AEO and GEO)
- New `backend/.../service/DirectoryGuides.java`: one text per view, served at `GET /api/v1/rankings/directory/guide/{view}`. The app (`DirectoryGuidePanel` in `RankingDirectory.tsx`), the server HTML (`SeoBodyService.directoryGuide`) and the page's FAQPage data all read it, so they cannot drift apart. Each explainer covers what the curriculum is, its stages and ages, university admission in India, how to check a school, the questions parents ask, and official sources with the date they were checked.
- Facts were checked on 23 Nov 2026 against ibo.org and cambridgeinternational.org, among them the programme ages, AIU recognition of the IB Diploma since 1983, and AIU equivalence for IGCSE / O Level / A Level. One correction during checking: Cambridge's March series is offered in India **and Romania**, and only for selected syllabuses. ibo.org refuses automated requests (HTTP 403), so its three links were confirmed through search results rather than by fetching them.
- Nothing in the explainers ranks a school or states a fee figure; a test checks this.

### JNV admission article
- `content/blog/jnv-admission-guide.md`:
  - New "At a glance" section: Class 6 only, with the separate Class 9 and Class 11 tests linked to their guides; who can apply; the test date; the free registration.
  - New "Key dates for JNVST-2027" table: applications closed 31 Jul 2026; test on 28 Nov 2026, 11:30 a.m. to 1:30 p.m.; result expected by the end of March 2027; admission process closes 31 Aug 2027. All dates are from the prospectus the article cites.
  - Two new questions: "which class" and "age limit 2027-28".
  - New meta title "JNV Admission 2027-28: Navodaya Class 6 Eligibility & Dates" (59 characters) and a description of 150 characters.
- `tools/blog/load-drafts.js --update <slug>` rewrites one existing article from its file. It keeps the article's status, publication date, cover, flags and byline. **The live article changes only when you run it** (see §6).

## 4. Validation

- Backend: full suite (`./mvnw test`) **450 tests**: 449 passed. The 1 failure was `ExamApiIT` still expecting the old "(official notice)" wording; after the assertion was updated to the new wording, `ExamApiIT` and `SeoSnippetTest` were re-run: 16 tests, 0 failures. New tests: `SeoSnippetTest` (exam descriptions, the passed-date wording, board names, directory descriptions, explainer sources and no-fee rule, place names, feed paths); `PremierDirectoryIT` (explainer endpoint, FAQPage, server HTML, 404 for views without one); `SeoHeadIT` (Cambridge title, STATE board noindex rule, new JNVST title).
- Frontend: type check clean; **55 test files, 235 tests pass** (new: `profileLink.test.ts`, `RankingDirectoryGuide.test.tsx`; updated: the RankingCard and BoardingCard link tests); the production build succeeds.
- In a real browser (headless Chrome, the local app with its API calls going to the live site, Google Analytics blocked), 12 behaviours were checked:
  - The boarding page's 72 profile links and the rankings page's 103 have no `?tab=`.
  - A card click opens the Boarding or Ranking section, and the address then shows `?tab=…`.
  - Loading that address fresh opens the same section; the plain address opens the Overview.
  - The profile's overview links to no `?tab=` address.
  - The Cambridge board page shows the new heading and links to the fuller list.
- After the deploy (23 Nov 2026), 28 checks on the live site passed. Every page answers with HTTP 200, and the new titles, descriptions, board names, FAQPage data, explainers, guide API (200, and 404 for a view without one) and profile place names are live. The `?tab=` copies still point their canonical to the plain profile. The same browser checks run against the live site matched the local run.
- Not measured this round: Core Web Vitals. The PageSpeed Insights API refused requests without a key (daily quota), and the local Lighthouse run was refused by this session's permission check. Earlier rounds fixed profile CLS and measured pages; Search Console's Core Web Vitals report will show field data once there are enough Chrome visitors.

## 5. Remaining issues that need your access

1. **Deploy: done** on 23 Nov 2026. The nginx cache refreshes every sitemap page by itself over the first hour (the warm-up timer).
2. **Update the live JNV article:** `ADMIN_USERNAME=… ADMIN_PASSWORD=… node tools/blog/load-drafts.js https://schooldhundo.in/api/v1 --update jnv-admission-guide-jnvst-class-6`. Or paste the new text into the admin blog editor.
3. **Search Console checks** (URL Inspection is not available through Windsor):
   - Inspect each of the 11 profiles Google had only at a `?tab=` address, check "Google-selected canonical", and request indexing (most impressions first):
     1. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-budaun-up` (19)
     2. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-2-kwartq-chittarur-gulbarga` (11)
     3. `https://schooldhundo.in/schools/navy-children-school-chanakyapuri-delhi` (8)
     4. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-bemetara-cg` (7)
     5. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-chhotaudepur` (7)
     6. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-balod-c-g` (6)
     7. `https://schooldhundo.in/schools/jnv-pulwama` (5)
     8. `https://schooldhundo.in/schools/jawahar-navodaya-vidyalaya-bandipora` (4)
     9. `https://schooldhundo.in/schools/jnv-sepahijala` (4)
     10. `https://schooldhundo.in/schools/birla-balika-vidyapeeth` (1)
     11. `https://schooldhundo.in/schools/rashtriya-military-school-belagavi` (1)
   - Request indexing for `/rankings/ib-schools`, `/rankings/cambridge-schools`, `/exams/jnvst` and the JNV article.
   - Check Pages > "Alternate page with proper canonical tag" over the following weeks: the `?tab=` copies should move there.
4. **GA4 is not connected to Windsor.ai**, so Search Console and GA4 cannot be compared yet. Connect it at the link Windsor gives (googleanalytics4). Log in to the same Windsor account, pick the Google account that owns the GA4 property, tick the Analytics permission and select the property.
5. The Windsor.ai account is on a **Trial plan**; reporting through it stops if the trial ends.
6. Facts for the Moga Devi Minda profile: its record has no description, fees or admission dates. Searchers want the school itself, and its own website ranks above ours. Only official facts (fees, admission dates from the school's site) would give the profile a reason to be clicked; adding them is an editorial job on live data.

## 6. Roadmap (forecasts are marked as such)

### Next 30 days
- Deploy this round, update the JNV article, run the Search Console checks above.
- Weekly Windsor pull: clicks, impressions, CTR and position for the priority pages in §1, plus the count of `?tab=` URLs (target: falling to 0 as Google recrawls).
- JNVST test day is **28 Nov 2026**: searches about the answer key and result follow. Add a short, sourced "after the test" note to the JNVST guide only when NVS publishes something official.
- AISSEE-2027 is on **31 Jan 2027**, with applications open now: give `/exams/aissee` the same snippet review as JNVST (visible query so far: "aissee mock test", position 73.5).
- Add official fee and admission facts to the profiles that rank at positions 7 to 10 without clicks: 29 profile URLs had 8 or more impressions there (3 of them `?tab=` copies), led by Moga Devi Minda Memorial School (29), JNV Budaun (19), Baba Banda Bahadur Public School Hansi (18) and Koottalumoodu Arulmigu Bhadreswari Devasthanam School (18).

### 60 days
- City pages (117 with impressions, 3 clicks): an answer-first summary from the counts already shown, as district pages have.
- `/rankings/best-schools-in-faridabad` (61 impressions, position 45): add a sourced local section (for example, how Haryana fee regulation works, with the official link), as done for IB and Cambridge.
- Decide on the pagination canonical rule (§2, item 7) once Search Console shows how many list pages are indexed.

### 90 days
- Backlinks remain the main gap (0 backlinks in the 17 Nov audit). Approach school associations and coaching portals with the free JNVST, AISSEE and Netarhat mock tests: they are the pages people already click (17 of the 58 clicks).
- Forecast, not a measurement: if the `?tab=` copies consolidate and the explainers lift the IB and Cambridge pages from position 57 towards the second results page, those two pages could start earning clicks. Today they earn none at 142 impressions.

### Monetisation without losing trust
- **AdSense**: wait until steady daily clicks (today 1 to 13 a day); ads on thin traffic add little revenue and slow pages. When enabled, keep ads off school profiles' fact sections and the mock tests.
- **School enquiries** (already built): the profiles that rank at positions 7 to 10 are the best place for them once their facts are filled in.
- **Premium or claimed listings**: label them as paid, as the site already does, and never let payment change a list's order or the "A to Z" rule.
- **Exam preparation** is the strongest asset (highest CTR: Netarhat 13.9%). Keep the free mock tests free; a paid extra (printed papers, a study plan) should come after demand shows.

## 7. Before and after

The "before" is §1. The "after" can only be measured after the deploy, when Google has recrawled. Compare the same Windsor pulls (site totals by date, device, and the page table in §1) for the 28 days starting a week after the deploy. Nothing here claims an improvement yet.
