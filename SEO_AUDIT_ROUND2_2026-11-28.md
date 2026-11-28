# SEO, AEO and GEO audit, second pass (28 Nov 2026, evening)

For the site owner. Data from Ubersuggest and Windsor.ai (Search Console, GA4, Bing), and Search Console, Bing Webmaster
Tools and GA4 read in Chrome with your sign-ins. Labels: VERIFIED (checked today at the source), IMPLEMENTED, TESTED,
DEPLOYED, RECOMMENDED, BLOCKED. Nothing here is estimated, and no page is called indexed unless Search Console said so.

## 1. Summary

1. **Google traffic keeps climbing.** 13–28 Nov: 134 clicks and 9,779 impressions on 692 pages. Daily impressions went
   from 9 (10 Nov) to 2,194 (26 Nov), average position from 37 to 9.6 (VERIFIED, Windsor).
2. **ChatGPT is now the second traffic source.** 14–28 Nov: 69 sessions from 42 users (Google organic: 112 sessions from
   29 users), 87% engaged. 37 of the 69 sessions land on /exams/jnvst (VERIFIED, GA4 through Windsor).
3. **Nothing is broken in the consoles.** Sitemaps all "Success", no manual actions, no security issues, job-posting fixes
   passed validation, the AISSEE guide is now indexed (§2).
4. **One real issue found and fixed in code: old `?tab=` section addresses.** 24 of them were shown in Google between
   13 and 28 Nov (172 impressions), several still on 26 Nov, as copies of school profiles and exam guides. This morning's robots.txt rule would
   have frozen them in the index. They now get a permanent redirect to the page itself (§4.1). IMPLEMENTED, TESTED,
   **not yet DEPLOYED** (§6).
5. **The admission guide was nearly empty for crawlers that run no script** (55 words of about 700). Fixed (§4.2).

## 2. Consoles (VERIFIED in Chrome, 28 Nov evening)

### Search Console

| Check | Result |
|---|---|
| Page indexing | 705 indexed, 13,520 not indexed, same 9 reasons as this morning (Google has not refreshed the report since) |
| Sitemaps | Index read 28 Nov, "Success", 2,655 pages. All six child sitemaps "Success": blog 13, exams 143 (read 25 Nov), notices 29, pages 117, places 1,368 (read 24 Nov), schools 985 |
| /exams/aissee/guide | **"URL is on Google", page is indexed.** Crawled 28 Nov 00:32 after this morning's request; Google's canonical is ours. (It was "Duplicate, Google chose different canonical" this morning.) Breadcrumbs valid |
| Job postings | Valid 1, invalid 0. streetAddress, postalCode and employmentType: **validation passed** (0 items). baseSalary missing on 1 item: deliberate, the notice publishes no pay |
| Breadcrumbs | 81 valid, 0 invalid |
| HTTPS | 152 pages HTTPS, 0 not |
| Core Web Vitals | No data (too few Chrome visits for field data) |
| Manual actions / Security issues | None / none |
| Messages (17) | Newest: three "Job Postings issues successfully fixed" (28 Nov). 26 Nov: "New reasons prevent pages from being indexed": page with redirect, indexed though blocked by robots.txt, not found (404). All three are known and by design (redirects, six /suggest addresses, one retired practice set) |
| Overview recommendation | /blog/jnv-admission-guide-jnvst-class-6 "got 3,308% more impressions than usual" |
| The seven profiles enriched today (V52) | Indexing requested for the four not yet requested: Edify School Amravati, Little Flower EMS Chelavoor, Kamalavati HSS (each indexed from a 16 Nov crawl of the old bare listing), Sambhota Tibetan School Mundgod ("Excluded by 'noindex' tag", crawled 26 Nov). All seven are now requested |
| Live test, Sambhota profile | **"URL is available to Google, page can be indexed"**; Breadcrumbs valid. Googlebot's smartphone render shows the whole profile. Resources: **2 of 29 not loaded**, both the sign-in checks `/api/v1/account/config` and `/api/v1/account/me`, blocked in robots.txt on purpose (the app then shows the signed-out page, with one console warning). For comparison, Google's stored 16 Nov crawl of the Edify profile lists 17 of 41 not loaded (made before this morning's one-request profile change; which resources those were was not checked) |

### Bing Webmaster Tools

| Check | Result |
|---|---|
| Site Explorer | **11 indexed** (7 this morning), 0 errors, 0 warnings, 1 excluded |
| AI Performance (new, beta) | 0 citations in Copilot and partners, 18–26 Nov |
| Recommendations | None listed |
| IndexNow | Daily 07:30 runs working (4 URLs today, more yesterday) |
| Search performance (Windsor) | 31 impressions, 0 clicks, 19–26 Nov |

### GA4

| Check | Result |
|---|---|
| Home | 72 active users and 65 new users in 7 days; average engagement 13 min 03 s. No warnings |
| Recommendation | Count /contact page views as generate_lead: **not done**, a page view is not a lead (the enquiry form already sends generate_lead) |
| Key events | quiz_complete 160 in November; generate_lead has still never fired, so it cannot be starred yet |
| Sources, 14–28 Nov | google/organic 112 sessions (29 users), **chatgpt.com 69 (42 users)**, direct 50, accounts.google.com 33 (4 users: your own sign-ins), bing 3, Google Jobs 3 |

## 3. Data that shaped the work (VERIFIED)

- **Parameter addresses in Google** (Windsor, Search Console, 13–28 Nov): 19 profile `?tab=` addresses (mostly
  `?tab=boarding` of Navodaya profiles, one `?tab=ranking`) with 158 impressions, 5 exam `?tab=` addresses with 14, still
  shown on 26 Nov. Every one of them already declared the plain page as canonical; Google chose the copy anyway, because
  each showed a different section. Google's guidance is not to use robots.txt for canonicalization: a blocked address
  cannot show the crawler its canonical or a redirect.
- **How Google found the exam copies:** the app's resources page linked `/exams/jnv-class-9?tab=prep` and similar
  (the paths came from the API), and five exam pages linked `?tab=pattern` or `?tab=dates`.
- **Low click-through on the JNV guide (800 impressions, 0.75%) and JNV Class XI (156, 0.6%)** is mostly Google's AI Mode:
  their visible queries include "ha please batao", "kab hoga paper?", "check next steps", "in hindi", "fees", at positions
  1–4 with no clicks. Google is citing these pages inside AI answers. Their titles were **not** changed: the JNV guide is
  climbing (3,308% more impressions) and nothing in the data points at the title.
- **Rich results** (Windsor, Search Console search appearance, 13–28 Nov): Google for Jobs listings 327 impressions and
  11 clicks, job details 11 impressions and 3 clicks, translated results 3 impressions. The JobPosting markup fixed this
  week brings about a tenth of all Google clicks (14 of 134).
- **Server-rendered HTML** (443 sitemap pages fetched as a crawler that runs no script: every non-school page, 80 place and
  60 school pages): all answer 200, carry their own canonical, an H1 and no noindex. Median words: profiles 395, places 598,
  notices 573, exam pages 231, blog 372. /exams/jnvst, ChatGPT's main landing page, sends 422 words with its dates, pattern
  and marking. The one content page far below what visitors see was /admissions/guide (55 words).
- **Ubersuggest** (cached 26 Nov crawl of 150 pages): health 78 (77 before), every page 200; 42 low-word-count pages (most
  are tools and policy pages; /admissions/guide among them), 8 "non-friendly" addresses (/boards/CBSE and other short or
  upper-case paths: left alone, changing them would cost their current rankings). Rank tracker: 0 of 25 keywords in the
  top 100 (next update 3 Dec). Backlinks 0, authority 1. AI visibility: 0 of 6 ChatGPT answers name SchoolDhundo.
  0 of 3 paid reports used.

## 4. Fixes (IMPLEMENTED and TESTED, not yet DEPLOYED)

### 4.1 One address per page: sections in the #fragment, old ?tab= addresses redirected

- **The app** keeps a profile's or exam guide's open section in the address's fragment: `/schools/x#fees`,
  `/exams/rimc#dates` (`frontend/src/utils/sectionAddress.ts`). Search engines treat a fragment as the same page, so a
  section is never a second copy. Old `?tab=` values and card links' sections are moved into the fragment; other query
  parameters and the "back to the exam list" state are kept. Nothing on screen changes.
- **nginx** answers an address whose query is exactly `tab=<letters>` on a profile or exam page with a 301 to the page,
  the section in the fragment: `/schools/jnv-pulwama?tab=boarding` → `/schools/jnv-pulwama#boarding`,
  `/exams/jnvst?tab=faq` → `/exams/jnvst/guide#faq`. Anything else (more parameters, ranking filters, place pagination,
  the API) is served as before.
- **robots.txt:** `Disallow: /schools/*?tab=` (added this morning) is removed, so crawlers can see the redirects. A 301 is a
  single small response with no page to render, so it does not bring back the crawl cost the rule was meant to cut.
- **Links:** the resources API, the exam hub, syllabus comparison, exam calendar, finder, practice results and the
  Netarhat plan now link `…#section` instead of `?tab=…`.

### 4.2 The admission guide's full text for crawlers that run no script

`/admissions/guide` now sends the same ~700 words the app shows (process, eligibility, dates, documents, hostel), with the
same section anchors (`SeoBodyService.admissionGuide`, kept in step with `AdmissionGuidePage`).

### 4.3 Safer deployment of nginx settings

`deploy/oracle-micro-web.sh` keeps the running nginx configuration until the new one passes `nginx -t`. Before, a rejected
file stayed on disk, where the next restart or reboot would have loaded it.

## 5. Checks

| Check | Result |
|---|---|
| Frontend type check (`tsc -b`) | Clean |
| Frontend tests (`vitest`) | 267 tests in 61 files, 0 failures (run on its own; one earlier run beside the backend suite timed out once in `OlympiadPractice.test.tsx`, which passes alone and in this run) |
| Production build (`npm run build`) | Passes |
| The app in a browser (local dev server reading the live public API, Chrome) | `/schools/jnv-pulwama?tab=boarding` becomes `#boarding` with the Boarding tab open; clicking Fees gives `#fees`, Overview the plain address; opening `…#fees` opens Fees without a jump; `/exams/jnvst?tab=faq` lands on `/exams/jnvst/guide#faq`; on the RIMC guide "Dates & notices" gives `#dates` and the breadcrumb still returns to the class-filtered exam list; the calendar and syllabus comparison link `…#dates` / `…#pattern` (0 `?tab=` links). No console errors. The resources page still listed 36 `?tab=` links because its paths come from the live API, which changes with the backend deploy |
| New frontend tests | `sectionAddress.test.tsx`: fragment parsing, guide links, old ?tab= and card-link state moved into the fragment, other parameters and state kept. `sectionAddress.nginx.test.ts`: the redirect rules read from `nginx.conf` itself, 8 addresses redirected as intended and 12 left alone |
| Backend tests (`mvnw test`) | 495 tests, 0 failures, 0 errors, BUILD SUCCESS: all 86 test classes, every test method in the source |
| New or changed backend checks | `RobotsTxtTest` (no ?tab= rule; the claim-form rule stays), `ExamApiIT` (resources link `/exams/jnvst/guide#pattern`), `SeoBodyIT` (the guide's sections, over 600 words) |
| nginx syntax on the server | **BLOCKED**: SSH to the server was refused by this session's permission settings, so the config could not be tried on a spare port there. The rules are covered by the test above, and the deploy script now rolls back if `nginx -t` rejects the file |

## 6. What needs you

1. **Deploy** (BLOCKED for me: SSH to the server was not permitted in this session). From the repository root in
   PowerShell: `.\deploy\oracle-micro-deploy.ps1`. If nginx rejects the new settings, the script now stops and keeps the
   old ones; the app and robots.txt would still be correct without the redirects.
2. **After the deploy** (I can do these in Chrome when you ask):
   - check `curl -sI "https://schooldhundo.in/schools/jnv-pulwama?tab=boarding"` gives `301` and `Location: /schools/jnv-pulwama#boarding`;
   - Search Console → Settings → robots.txt → request a recrawl; inspect one `?tab=` address (should become "Page with
     redirect" once recrawled); request indexing for /admissions/guide.
3. **How to tell it worked** (not claimed yet): over 1–3 weeks the `?tab=` addresses leave the Performance report and
   their plain profiles gain the impressions; the `?tab=` addresses in "Excluded by 'noindex' tag" (787 of its 1,000
   examples on 28 Nov) move to "Page with redirect".

## 7. Remaining opportunities (RECOMMENDED)

- **Authority is the limit.** 0 backlinks (Ubersuggest), Bing indexes 11 pages and cites none in Copilot. The five outreach
  e-mails sent today are the right lever; watch Gmail for replies with fee or admission links.
- **JNVST was held today (28 Nov).** The /exams/jnvst description switches to the result timing by itself after the test.
  When NVS publishes the result notice, add its official link and date the same day: "navodaya results class 6" is
  searched about 18,100 times a month (Ubersuggest).
- **ChatGPT already sends more users than Google.** Keep /exams/jnvst's server text complete and current; it is the page
  ChatGPT links.
- **Practice mock titles** for AISSEE run to 112–114 characters and are cut in results; the distinguishing words
  (English- or Hindi-medium) sit in the middle. Low priority.
- **Pagination** (`?page=` on place lists) points its canonical at page 1, which Google sometimes overrides
  (/states/tamil-nadu/chengalpattu?page=1, 18 impressions). Profiles are all in the sitemap, so nothing is lost; leave as is
  unless those pages start drawing traffic.
- Re-check on 9 Dec: Search Console crawl stats (JSON share), "Discovered – currently not indexed" (2,011 on 28 Nov), the
  `?tab=` addresses in Performance, and Bing's indexed count.

## 8. Files

| Area | Files |
|---|---|
| Frontend | `utils/sectionAddress.ts` (new), `pages/SchoolDetailPage.tsx`, `pages/ExamPages.tsx`, `pages/ExamPrepPage.tsx`, `pages/ExamHubPages.tsx`, `pages/ExamToolsPages.tsx`, `pages/PracticePages.tsx`, `content/netarhatPrep.ts`, `utils/profileLink.ts`, `components/school/SchoolProfileNav.tsx`, `pages/AdmissionsPages.tsx` (comment) |
| Frontend tests | `utils/sectionAddress.test.tsx`, `utils/sectionAddress.nginx.test.ts` (new) |
| Server settings | `frontend/nginx.conf` (redirect map), `deploy/oracle-micro-web.sh` (rollback) |
| Backend | `controller/SitemapController.java` (robots.txt), `service/ExamService.java` (resource links), `service/SeoBodyService.java` (admission guide) |
| Backend tests | `RobotsTxtTest.java`, `ExamApiIT.java`, `SeoBodyIT.java` |
