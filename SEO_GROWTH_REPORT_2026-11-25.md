# SchoolDhundo growth round, 25 November 2026: data, fixes and plan

For the site owner. It covers what Ubersuggest, Windsor.ai (Search Console, GA4, Bing) and the official exam documents
showed on 25 Nov 2026, what was changed in the code, how it was tested, and what needs you.

Status: **committed as 0ed6637 and DEPLOYED on 25 Nov 2026; 15 of 15 live checks passed** (§16). The two articles go
live when you publish them.

Status labels: **VERIFIED** (checked against data or the live site), **IMPLEMENTED** (in the code), **TESTED** (tests or
browser checks pass), **DEPLOYED** (live and checked), **RECOMMENDED** (not done), **BLOCKED** (needs you or access this
session does not have). Ubersuggest volumes, difficulty and authority are third-party estimates.
Nothing here claims a traffic increase: that can only be measured after a deploy.

---

## 1. Executive summary

1. **Google is showing the site far more often; clicks have not followed yet.** Impressions went from 360 (10–16 Nov) to
   4,106 (17–23 Nov), and the daily average position improved from 37.7 (14 Nov) to 11.7 (24 Nov). There were 89 clicks
   in 17 days (CTR 1.5%); 36 of them were on the homepage, mostly your own visits.
2. **Exams are the strongest section.** Exam pages get 4.0% CTR at position 9.9, against 0.7% for school profiles.
   ChatGPT is the largest source of new visitors (26 users, 22 new); 20 of them landed on `/exams/jnvst`.
3. **The exam season is now.** JNVST is on **28 Nov 2026**, AISSEE-2027 applications close on **2 Dec 2026** (late fee
   until 6 Dec; exam 31 Jan 2027), and the Netarhat exam is on **6 Dec 2026**. Result searches are the largest in this
   niche ("navodaya result 2026": 135,000 a month, Ubersuggest).
4. **Found and fixed (IMPLEMENTED, TESTED):**
   - The live AISSEE guide still gave the AISSEE-2026 age limits and said "the AISSEE-2027 dates have not been announced",
     while showing the 3 Nov notice and an open application window. Corrected from the AISSEE-2027 bulletin.
   - All three exam preparation pages lost their date from the Google snippet (161–164 characters, over the 160 limit).
     The AISSEE snippet now leads with "apply by 2 Dec 2026; exam on 31 Jan 2027".
   - All 115 practice-set snippets were cut mid-sentence with "…". None are now.
   - Nothing answered what happens after the JNVST test: result, answer key, wait-list, documents. Added from the
     JNVST-2027 prospectus.
   - Bing showed the site 3 times in 30 days, and the site had no IndexNow. Added.
   - The About, Editorial and Corrections pages sent about 30 words to crawlers that do not run scripts. They now carry
     their full text.
5. **Why traffic is low:** the property is 17 days old, has domain authority 1 and no referring domains, and most of its
   impressions are people searching for a school by name, who want that school's own website. The site is technically
   sound (sitemap 2,657 URLs, 0 errors).
6. **Deployed on 25 Nov 2026** and checked live. **What needs you now:** publish two updated articles, start the one-time
   IndexNow submission, and a few settings in Google and Bing tools (§16).

---

## 2. Tools, connections and limits

| Tool | Status | Account | Used today | Limits |
|---|---|---|---|---|
| **Ubersuggest** | **VERIFIED** connected (free tier) | Project `schooldhundo.in`: 25 of 25 tracked keywords, competitors edustoke.com and schoolmykids.com, 10 AI prompts | Paid reports (3 of 3 a day): keyword research for "jnvst, navodaya" and "sainik school, aissee" (India), backlink opportunities. Free: site audit (crawl of 19 Nov), rank tracking (19 Nov), SEO opportunities, AI visibility, backlink summary, 9 search-result pages | A custom competitor list is refused on the free tier; the automatic competitor report has no data for this domain in India; no tool can remove a tracked keyword |
| **Windsor.ai** | **VERIFIED** connected (Trial) | Search Console `sc-domain:schooldhundo.in`; GA4 `563979286` "SchoolDhundo Website"; Bing `https://schooldhundo.in` | 13 pulls: Search Console 6 (one refused), GA4 5, Bing 2 | Trial: 30 days of history; the trial end date is not shown |
| Search Console, GA4, Bing (native) | Read through Windsor | | | No direct sign-in in this session: no URL Inspection, Core Web Vitals or Pages report |
| Google Tag Manager | **VERIFIED** `GTM-PZ7WSXBS` live, Consent Mode default "denied" | | | GA4 `G-ESGRNYGQHQ` sits inside the container and could not be read; property 563979286 does receive data |
| PageSpeed Insights | **BLOCKED** | | | The API refuses requests without a key (previous round); Ubersuggest's would cost a report |
| Google Trends, Microsoft Clarity, Ahrefs, Semrush, Keyword Planner | Not connected | | | Shown as unavailable, never as zero |
| Official sources | **VERIFIED**, read in full where used | | JNVST-2027 prospectus (NVS); AISSEE-2027 information bulletin and public notice of 3 Nov 2026 (NTA) | |

Date ranges: Search Console 9–25 Nov 2026 (its data starts on 9 Nov, so "last 28/90 days, 6 or 12 months" all collapse to
these 17 days; 24–25 Nov are provisional). GA4 27 Oct–25 Nov (data starts 12 Nov). Bing 27 Oct–25 Nov.

---

## 3. Traffic baseline

### Search Console

| Period | Clicks | Impressions | CTR |
|---|---:|---:|---:|
| 10–16 Nov | 40 | 360 | 11.1% |
| 17–23 Nov | 35 | 4,106 | 0.9% |
| 24 Nov (provisional) | 13 | 1,240 | 1.0% |
| **9–25 Nov** | **89** | **5,860** | **1.5%** |

| Device (India) | Clicks | Impressions | Position |
|---|---:|---:|---:|
| Mobile | 66 | 3,889 | 9.0 |
| Desktop | 22 | 1,701 | 26.6 |
| Tablet | 1 | 57 | 8.1 |

Other countries: 0 clicks, 213 impressions. Sitemap index: 2,657 URLs submitted, 0 errors, 0 warnings, read by Google on
24 Nov.

| Section (page-level) | Pages | Clicks | Impressions | CTR | Position |
|---|---:|---:|---:|---:|---:|
| School profiles | 298 | 18 | 2,417 | 0.7% | 11.7 |
| City pages | 192 | 7 | 1,137 | 0.6% | 12.9 |
| Exams | 15 | 22 | 553 | 4.0% | 9.9 |
| Rankings | 13 | 1 | 503 | 0.2% | 47.3 |
| Articles | 6 | 4 | 375 | 1.1% | 11.7 |
| States and districts | 61 | 1 | 332 | 0.3% | 11.0 |
| Jobs | 11 | 6 | 143 | 4.2% | 5.1 |
| Homepage | 1 | 36 | 82 | 43.9% | 3.9 |

### GA4 (12–25 Nov)

189 sessions from about 75 users: 60 new, and 15 returning users who made 126 sessions.

| Channel | Sessions | Users | New users | Engaged | Engagement time |
|---|---:|---:|---:|---:|---:|
| Google organic | 64 | 12 | 10 | 56 | 4.3 h (46 sessions are 4 users on "/") |
| Direct | 41 | 19 | 18 | 34 | 2.3 h |
| accounts.google.com (sign-in return, not a referral) | 40 | 5 | 4 | 30 | 2.9 h |
| **ChatGPT** | **39** | **26** | **22** | **35** | **4.0 h** |
| Unassigned | 5 | 4 | 0 | 0 | |
| Google paid (cpc) | 2 | 2 | 2 | 0 | |
| Bing organic, msn.com | 2 | 2 | 2 | 2 | |

- ChatGPT visitors land on `/exams/jnvst` (22 sessions, 20 users, about 5 minutes each).
- Google visitors to `/exams/netarhat` stay about 22 minutes a session (6 sessions): they take the mock tests.
- The event fix of 24 Nov is **VERIFIED** working: `quiz_start` 44, `quiz_complete` 36, `school_profile_view` 22 and
  `google_sign_in` 6 arrived on 24–25 Nov.
- "google / cpc" (2 sessions): if you are not running Google Ads, check what sends that tag.

### Bing

3 impressions and 0 clicks in 30 days (all on 19 Nov). Bing's weekly page report lists two pages: `/rankings/best-schools-in-delhi`
(2 impressions, position 4) and `/states/bihar` (1, position 10).

---

## 4. Checks on the data

- **Repeatable:** today's pull for 10–21 Nov gives exactly 58 clicks and 2,598 impressions, the same as the 23 Nov pull.
  Days that were provisional then have since grown (22 Nov: 769 → 800 impressions).
- **Page sums exceed site totals** (106 clicks and 6,076 impressions against 89 and 5,860): Search Console counts page data
  once per URL shown. Use the site totals.
- **Hidden queries:** the 629 visible queries account for 5 of the 89 clicks and 1,469 of the 5,860 impressions. The rest
  are hidden by Google for privacy; that traffic is real.
- **Search Console against GA4:** 89 clicks against 64 Google-organic sessions from 12 users. Leaving out the homepage
  (your own visits), Search Console has 53 clicks and GA4 18 sessions. GA4 counts only visitors who press Accept, as the
  site's consent design intends, so it sees about a third of organic visits. This is not a tracking fault: use Search
  Console for search demand and GA4 for what consenting visitors do.

---

## 5. Why traffic is low

| # | Cause | Evidence | Severity | Action | Status |
|---|---|---|---|---|---|
| 1 | Very new property | Search Console data begins 9 Nov 2026; impressions up 11× in a week, position 37.7 → 11.7 | High (time) | Keep publishing accurate, useful pages | — |
| 2 | No authority | Domain authority 1, 0 referring domains; 0 of 25 tracked head terms in the top 100; rankings pages at position 47 | High | Ethical link earning (§15) | RECOMMENDED |
| 3 | Most impressions are school-name searches | Profiles: about 40% of page impressions (2,417 of 6,076), 0.7% CTR; 21 "<school> (education) fee payment" queries (49 impressions) | Medium, built in | Enrich profiles with official facts; do not chase these clicks | RECOMMENDED |
| 4 | Snippets that lost their best facts | Prep pages lost the date (161–164 characters); 115 of 115 practice sets cut with "…" | Medium | New description rules | **IMPLEMENTED, TESTED** |
| 5 | Out-of-date exam facts | AISSEE guide: 2026 age limits and "dates not announced" during the 2027 application window | High (trust) | Corrected from the 2027 bulletin | **IMPLEMENTED, TESTED** |
| 6 | Bing hardly knows the site | 3 impressions in 30 days; no IndexNow | High for Bing, Copilot and ChatGPT search | IndexNow | **IMPLEMENTED, TESTED** |
| 7 | Thin HTML for script-less crawlers | `/about` about 30 words; Ubersuggest: 50 low-word-count pages | Medium | Full text for About, Editorial, Corrections | **IMPLEMENTED, TESTED** (about 45 pages remain) |
| 8 | Partial measurement | GA4 sees about a third of organic visits (consent) | Medium | Read Search Console for search; filter your own visits | RECOMMENDED |

Not causes: indexing (sitemap clean, no stray noindex), rendering (exam pages send 650–820 words of server HTML), mobile
(mobile ranks at 9.0 and brings 74% of clicks).

---

## 6. Top pages and searches

| Page | Clicks | Impressions | Position | Note |
|---|---:|---:|---:|---|
| `/` | 36 | 82 | 3.9 | Mostly your own visits |
| `/exams/netarhat` | 13 | 143 | 8.1 | 9.1% CTR, the best |
| `/exams/jnvst` | 6 | 181 | 9.3 | "jnv mock test class 6 2027": 21 impressions, position 8.5, 1 click |
| `/jobs/doon-international-school-bhubaneswar-higher-secondary-teacher-biology` | 5 | 60 | 3.4 | "school vacancy in bhubaneswar" at 1.2; "teaching jobs" at 3 |
| `/blog/jnv-admission-guide-jnvst-class-6` | 4 | **336** | 9.1 | The most impressions: "navodaya vidyalaya admission", "jnvst", "how to get admission in navodaya" |
| `/rankings/ib-schools` | 0 | 158 | 53.0 | "top ib schools in india" at 57.7 |
| `/network/jawahar-navodaya-vidyalaya` | 0 | 92 | 38.4 | "jnv <district>" searches |
| `/rankings/best-schools-in-faridabad` | 0 | 92 | 45.5 | |
| `/exams/jnv-class-11` | 0 | 84 | 7.1 | No click yet; its title with the year went live on 24 Nov |
| `/exams/aissee` | 1 | 67 | 10.6 | |

Position buckets (query and page pairs): 1–3: 30 pairs, 53 impressions; 4–10: 172 pairs, 374; 11–20: 151 pairs, 315;
21–50: 105 pairs, 223; beyond 50: 200 pairs, 504.

---

## 7. Ubersuggest: audit, keywords, competitors, gaps

### Site audit (crawl of 19 Nov, 150 pages; the weekly update is due about 26 Nov)

Health **77** (was 63). All 150 pages return 200. Errors: 50 pages with a low word count, 1 slow page. Warnings: 8 upper-case
addresses (`/boards/CBSE` and similar), which already point to their lower-case canonical. No duplicate titles or
descriptions, no missing H1, no 4xx. Checked against the live site: the low-word-count pages are the policy and tool pages;
this round fixed three of them.

### Keyword research (India, monthly searches / SEO difficulty)

| JNVST and Navodaya | | Sainik School and AISSEE | |
|---|---|---|---|
| navodaya result 2026 | 135,000 / 30 | aissee 2026 (last cycle) | 9,900 / 17 |
| navodaya admit card | 74,000 / 35 | aissee result 2026 | 8,100 / 28 |
| result of navodaya | 49,500 / 19 | aissee 2026 admit card | 6,600 / 19 |
| navodaya gov in result class 6 | 40,500 / 17 | nta aissee | 6,600 / 19 |
| jnvst | 33,100 / 40 | aissee 2026 counselling | 3,600 / 18 |
| **navodaya mental ability question paper** | **22,200 / 12** | aissee 2026 exam date | 2,400 / 15 |
| **navodaya results class 6** | **18,100 / 10** | aissee counselling | 1,900 / 19 |
| navodaya admission | 18,100 / 24 | aissee 2027 (tracked) | 390 / 19, rising |
| navodaya vidyalaya form | 18,100 / 18 | sainik schools (tracked) | 90,500 / 16 |
| jnvst class 6 (tracked) | 5,400 / 11 | | |

The cycle year moves the demand: last cycle's "aissee 2026" reached 9,900 a month while "aissee 2027" is at 390 now.

### Who ranks (Ubersuggest search-result pages, India)

- **Exam searches are held by weak sites:** "jnvst class 6": thesuperc.com (authority 4) at #2, gyanbharat.live (13) at #3.
  "aissee 2026 admit card": bharatresult.com.es (1) at #2. "aissee 2026 exam date": sainikschool360.in (2) at #10.
  "navodaya mental ability question paper": navodayacoaching.in (3) at #7, vedaacademy.in (15) at #2, beside Scribd PDFs.
  "jnv mock test class 6": selfstudys (44), freetesthub (8), brinto (5), easetolearn (12).
- **Official sites hold the result and admission searches:** navodaya.gov.in, cbseit.in, cbseitms.rcil.gov.in and
  exams.nta.nic.in, under an AI Overview and "People also ask".
- **What the winners do:** the year in the title ("2027", "(Out)"), the date in the snippet, PDFs and videos.
- **Directories** (17 Nov audit): careers360 19,066 referring domains, educationworld 4,790, edustoke 2,499, ezyschooling
  2,193, uniapply 1,570; SchoolDhundo 0. Other practice sites found by search: AglaSem, Toppersexam, myCBSEguide,
  SelfStudys, EaseToLearn, EduRev.

### Keyword-to-page map (one page per intent, so pages do not compete)

| Searches | Page |
|---|---|
| jnvst class 6, jnv mock test class 6 2027, navodaya mock test | `/exams/jnvst` |
| jnvst 2027 eligibility, age limit, syllabus, result date, answer key | `/exams/jnvst/guide` |
| navodaya admission, how to get admission in navodaya | `/blog/jnv-admission-guide-jnvst-class-6` |
| navodaya mental ability test or questions | Not decided: one landing (§9, item 3) |
| aissee 2027, last date, exam date, age limit | `/exams/aissee/guide` |
| aissee mock test, sainik school preparation | `/exams/aissee` |
| how to prepare for sainik school | `/blog/sainik-school-entrance-exam-aissee-preparation` |
| netarhat entrance exam date, admit card | `/exams/netarhat/guide` |
| netarhat mock test, previous year questions | `/exams/netarhat` |
| schools in <town>, <town> school list | `/states/{state}/city/{town}` |
| best schools in <city> | `/rankings/best-schools-in-{city}` |
| school jobs in <city> | `/jobs`, `/jobs/{notice}` |
| <school name> | `/schools/{slug}` |

### Rank tracking and AI visibility

- 0 of 25 tracked keywords in the top 100 (desktop, 19 Nov). They are head terms ("kvs admission", "sainik schools") a new
  site cannot reach yet.
- AI visibility: SchoolDhundo appears in 0 of the 5 ChatGPT answers collected so far. The prompts are generic and are not
  the questions that bring visitors.

---

## 8. What the combined data says

- **Exam pages bring the engaged visitors:** the highest CTR (Netarhat 9.1%), the longest sessions (22 minutes), most of
  the site's own events (`quiz_start`, `quiz_complete`), and the ChatGPT referrals.
- **AI assistants already send more new visitors than Google** (22 against 10 new users). ChatGPT's search draws on Bing's
  index, among others, so Bing coverage matters beyond Bing's own share.
- **Mobile is the audience:** 74% of clicks, and mobile ranks at 9.0 against 26.6 on desktop.
- **School profiles bring impressions, not visits:** people searching for a school by name click the school's site.
- **Job pages rank well** for local teacher-job searches (positions 1–6), so they can grow with more official sources.

---

## 9. Highest-potential opportunities, in order

1. **The exam season (now to March 2027):** JNVST result questions after 28 Nov, the AISSEE deadline and exam, Netarhat.
   This round's main work.
2. **Bing and AI assistants:** IndexNow (built), plus checking the sitemap in Bing Webmaster Tools (you).
3. **"navodaya mental ability question paper"** (22,200 a month, difficulty 12; page 1 held by sites with authority 3–16).
   The site already has five 20-question Mental Ability sets and 150 bank questions.
4. **Town pages:** count-led titles have been live since 24 Nov; measure first.
5. **Job pages:** add official sources state by state where searches show demand.
6. **Profiles that already rank:** add official facts (fees, admission dates) to the listed schools.
7. **Authority:** links from schools, communities and data stories (§15).

---

## 10. Page priority matrix

`tools/seo/data/page-priority-matrix-2026-11-25.csv`: 89 pages with clicks, impressions, CTR, position, GA4 organic and
AI-assistant sessions, Ubersuggest estimates, search intent, issue, action, evidence confidence, priority and status.
4 P0, 11 P1, 41 P2, 33 P3.

| Priority | Page | Impressions | Position | Status |
|---|---|---:|---:|---|
| P0 | `/blog/jnv-admission-guide-jnvst-class-6` | 336 | 9.1 | IMPLEMENTED (you publish) |
| P0 | `/exams/jnvst` | 181 | 9.3 | IMPLEMENTED |
| P0 | `/exams/netarhat` | 143 | 8.1 | IMPLEMENTED |
| P0 | `/exams/aissee` | 67 | 10.6 | IMPLEMENTED |
| P1 | `/network/jawahar-navodaya-vidyalaya` | 92 | 38.4 | RECOMMENDED |
| P1 | `/exams/jnv-class-11` | 84 | 7.1 | Measure the 24 Nov title first |
| P1 | Seven town and district pages (Gandhidham, Naharlagun, Singtam, North East Delhi, Paonta Sahib, Daman, Haldwani) | 29–42 each | 7–13 | Measure the 24 Nov titles first |
| P1 | `/blog/sainik-school-entrance-exam-aissee-preparation` | 26 | 46.8 | IMPLEMENTED (you publish) |
| P1 | `/about` | 25 | 13.4 | IMPLEMENTED |

---

## 11. Exam preparation

| Exam | Now | Done this round | Next |
|---|---|---|---|
| JNVST Class 6 | Test 28 Nov 2026; result expected by end of March 2027 | Result, answer-key, wait-list and document answers (guide, article); snippet and hero say when the result is expected | Add official NVS result notices when they appear (the daily sync reads NVS) |
| AISSEE-2027 | Applications until 2 Dec (late fee 3–6 Dec); exam 31 Jan 2027 | Guide and article on the 2027 bulletin; snippet and hero lead with the deadline | After 6 Dec: admit card (25 Jan), provisional keys |
| Netarhat | Exam 6 Dec 2026 | Snippet keeps the date | Result notice when published |
| JNV Class IX and XI | Exam 10 Apr 2027 | — | Measure the Class XI title |
| Olympiad | Weak positions (34–85) | Practice-set snippets fixed | Class pages need links before content |

Returning users already exist (15 users, 126 sessions) and the progress page and local attempt history work; no new
engagement feature is justified by the data yet.

---

## 12. What changed

All **IMPLEMENTED**, **TESTED** and **DEPLOYED** (25 Nov 2026, commit 0ed6637), except the two articles, which go live
when you publish them.

### SEO

- **Preparation page descriptions** (`SeoHeadService.prepDescription`): the most useful wording that fits 160 characters,
  by season. While applications are open: "AISSEE 2027: apply by 2 Dec 2026; exam on 31 Jan 2027. Free AISSEE (Sainik School)
  Class 6 mock tests in the 125-question pattern, in English and Hindi." (152). Then the exam date. After the exam:
  "Selection test held on 28 Nov 2026; result expected by end of March 2027." An expected date that has gone by is dropped.
- **Practice-set descriptions** (`practiceDescription`, `practiceFacts`): the first sentence if it fits; else up to a
  clause break; else the set's own facts ("20 JNVST Arithmetic questions for Class V with explained answers, 30 minutes,
  in English and Hindi."). The exam and class keep sets apart: a first version would have given 32 sets 14 shared
  descriptions, found by running the rule over the live data before release.

### AEO (answers)

- **JNVST guide**, 4 new questions from the prospectus (§2.3, §3.1–3.8): when and where the result is announced, why
  there is no answer key or re-evaluation, why there is no wait-list, which documents are checked. They appear on the
  page, in the server HTML and in its FAQPage data.
- **AISSEE guide:** the 2027 age windows, fee and qualifying rule (including no minimum for SC/ST in existing Sainik
  Schools), and 6 questions: dates, age limit, girls, negative marking, qualifying marks, answer key.
- **Articles** (`content/blog`): the JNV article gets "After the test: result and admission" and 3 questions; the AISSEE
  article is rewritten on the 2027 bulletin with a key-dates table.

### GEO and trust

- **About, Editorial policy and Corrections policy** carry their full text in the server HTML (`SeoBodyService.trustPage`):
  who made the site, how facts are sourced and labelled, that it is independent, the primary sources, and how corrections
  work.
- Every exam fact is cited to its official document, with the date it was checked (25 Nov 2026).

### Technical

- **IndexNow** (`seo/IndexNowService`, `IndexNowScheduler`, `AdminSeoController`):
  - At 7:30 a.m. IST (well after the 6:00 a.m. official-source check) it submits the sitemap addresses changed in the
    last 2 days; an admin can also submit every address once.
  - It reads only the site's own sitemaps (on the server, from nginx at `127.0.0.1:8081`, as the cache warm-up does) and
    sends nothing unless the key file `/1d69358d6e265f485ec60722cd51fb81.txt` serves the key. It submits only the public
    `https://schooldhundo.in/…` addresses the sitemaps list.
  - It is off by default and on in production, and never throws into other jobs. The admin endpoint is ADMIN-only and
    audited.
- **Preparation page hero** (`ExamPrepPage`, `prepMilestones`): a "Last date to apply" card with a countdown and the
  official application link while applications are open; after the exam, the expected result.

### Database

`V48__aissee_2027_bulletin_and_jnvst_result_faq.sql` replaces only the corrected content keys of the two exams (`jsonb ||`),
so dates, notices and other fields stay as the daily sync left them. The same text is in `seed/exams.json`, and
`ExamSeedMigrationTest` keeps the two equal. Nothing is deleted. To undo, edit the guide in the admin.

### Files

| Area | Files |
|---|---|
| Backend | `service/SeoHeadService.java`, `service/SeoBodyService.java`, `security/SecurityConfig.java`, new `seo/IndexNowService.java`, `seo/IndexNowProperties.java`, `seo/IndexNowConfig.java`, `scheduler/IndexNowScheduler.java`, `controller/admin/AdminSeoController.java` |
| Data | `resources/seed/exams.json`, new `resources/db/migration/V48__aissee_2027_bulletin_and_jnvst_result_faq.sql`, `application.properties`, `application-prod.properties` |
| Frontend | `pages/ExamPrepPage.tsx`, `utils/exams.ts`, new `public/1d69358d6e265f485ec60722cd51fb81.txt` |
| Content | `content/blog/jnv-admission-guide.md`, `content/blog/sainik-school-aissee-preparation.md` |
| Tests | new `PrepAndPracticeSnippetTest`, `ExamSeedMigrationTest`, `ExamContentMigrationIT`, `IndexNowServiceTest`, `AdminSeoIT`; updated `SeoHeadTitleTest`, `SeoHeadIT`, `SeoBodyIT`, `utils/exams.test.ts` |
| Tools and data | new `tools/seo/indexnow-submit.mjs` (one-command submission for the owner), `tools/seo/data/page-priority-matrix-2026-11-25.csv` |

---

## 13. Tests

| Check | Result |
|---|---|
| Backend, full suite (`mvnw test`) on the final code | 474 tests, 0 failures, 0 errors (457 before this round) |
| Backend, tests added after that run | `ExamContentMigrationIT` (V48's own SQL on real PostgreSQL rows: only the named keys change; other keys and the exam's dates stay) and the IndexNow local-read test pass; 476 tests in all |
| Frontend type check (`tsc -b`) | Clean |
| Frontend tests (`vitest`) | 242 passed (239 before) |
| Production build (`vite build`) | Passes; the key file is in `dist/` |
| Browser (headless Chrome, local app reading the live API, analytics blocked) | AISSEE hero shows "Last date to apply · 2 Dec 2026 · in 7 days · Apply on the official website" above "31 Jan 2027 · in 67 days"; Netarhat and JNVST heroes unchanged (deadlines passed). No horizontal scroll from the new card at 320 or 360 px |
| Practice rule over all 115 live sets | 0 cut, 0 over 160 characters, 0 duplicates |

Noticed, not changed: at 360 px with a classic desktop scrollbar the header's right-hand buttons stick out 9 px. Phones use
overlay scrollbars, so phones are not affected.

---

## 14. Before and after

| Measure | Before (live, 25 Nov) | After (this code) | Verified by |
|---|---|---|---|
| Preparation snippets with a date | 0 of 3 | 3 of 3 | Unit and integration tests |
| AISSEE snippet mentions the deadline | No | Yes | Unit test |
| Practice snippets cut with "…" | 115 of 115 | 0 of 115 (8 whole sentence, 26 clause, 81 facts) | Rule run on live data; tests |
| AISSEE guide eligibility | 2026 cycle; "dates not announced" | AISSEE-2027 bulletin | Migration test, integration test |
| JNVST guide questions | 3 | 7 | Integration test (page and FAQPage) |
| `/about` server HTML | About 30 words | More than 300 words | Integration test |
| IndexNow | None | Daily and on request | Unit and integration tests |

After the deploy, the "after" column was confirmed on the live site for every row (§16). Its effect on clicks and
impressions can only be measured once Google and Bing recrawl: re-check with the same Windsor pulls on 9 and 23 Dec.

---

## 15. Backlinks

**Measured:** domain authority 1, 0 backlinks, 0 referring domains (Ubersuggest, today).

**Ubersuggest's gap report** (domains linking to edustoke, uniapply and ezyschooling but not to SchoolDhundo; 40 rows
read): mostly comment spam, cloned `web.app`, `pages.dev` and `bitbucket.io` pages, tag pages, and Wikipedia articles
citing directories. None of those is a link to pursue. The legitimate patterns are company profiles (Crunchbase,
Wellfound), schools' own blogs linking to their listings, and media stories.

**Opportunities** (no payment, no link required for anything, nothing posted without you):

| # | Target | Why | Verified |
|---|---|---|---|
| 1–19 | Schools whose profiles already appear in Google: Velammal Bodhi Campus (66 impressions), Swami Vivekananda Vidya Peedam (44), Baba Banda Bahadur Public School Hansi (44), K K Cambridge International School (43), Moga Devi Minda Memorial School (41), Hidaya Public School (37), Edify School Amravati (36), Sambhota Tibetan School Mundgod (35), Little Flower EMS Chelavoor (32), Sri Chaitanya Techno School Nagavara (31), Alphonsa EMS Thamarassery (30), Koottalumoodu Bhadreswari Devasthanam School (30), Cambridge Public School Sadalpur (28), DAV Centenary Public School Bahadurgarh (28), G D Goenka School Delhi (24), Kamalavati HSS (24), St Xavier's Cathedral School Amravati (23), Gamyam EMS (23), Rainbow's EMS Chittoor (22) | Ask them to check their facts and send official fee and admission pages; a link to their profile is welcome but optional | Profiles and impressions verified (Search Console); each school's contact to be checked before writing |
| 20–22 | Schools that blog on Medium and link to directories: Cambridge School Noida, Cambridge School Indirapuram, Prince Public School | Same pattern, already linking to competitors | Seen in Ubersuggest's gap report |
| 23 | Crunchbase company profile | Competitors have one; helps the brand be recognised as an entity | Pattern verified |
| 24 | Wellfound company page | As above | Pattern verified |
| 25 | LinkedIn company page | Entity and sharing | Standard |
| 26 | IIIT Allahabad alumni network or newsletter | The creator is an alumnus (About page) | To check |
| 27 | Teachers and coaching centres preparing JNVST, AISSEE and Netarhat (YouTube, Telegram) | Free bilingual mock tests for their students | Pattern |
| 28 | Parent questions on Quora about JNVST and Sainik admission | Genuine answers citing the official notice and the guide | Pattern |
| 29 | Education reporters: a data story from the AISSEE-2027 bulletin's school-wise girls' seats | Original, official, newsworthy | The analysis must be done first |
| 30 | School and parent blogs: the Class 6 entrance comparison (`/exams/class/6`) as a resource | A useful page to cite | Page live |

**Draft to a school** (adapt the numbers per school):

> Subject: Your school's page on SchoolDhundo: please check the details
>
> Dear Principal / Admissions team,
>
> SchoolDhundo is a free, independent website that helps parents in India find and compare schools. Your school's page
> ([address]) was shown [N] times in Google searches in November 2026, mostly to people searching for your school by name.
>
> We publish only facts from official sources (UDISE+, your board's directory and your own website) and mark anything
> missing as "Not available". Could you check that the details are right? If your fees, admission dates or contact
> details are published on your website, send us the link and we will add them with the source.
>
> If parents would find the page useful, you are welcome to link to it from your admissions page. That is entirely
> optional and never changes how your school is shown.
>
> Regards, [Name], SchoolDhundo (https://schooldhundo.in)

**Draft to a teacher or parent-group admin:**

> Namaste [Name]. I run SchoolDhundo, a free site with original practice tests for JNVST, AISSEE and Netarhat in English
> and Hindi, with no sign-up needed: [link]. Every question has a worked explanation, and dates and rules link to the
> official NVS and NTA notices. If it helps your students, please feel free to share it. Corrections are welcome: [contact link].

---

## 16. Deployment and what needs you

**Deployment: DEPLOYED** on 25 Nov 2026 with `deploy/oracle-micro-deploy.ps1` (commit 0ed6637, pushed to
`origin/develop`). V48 ran on start. Live checks, all passed:

| Check | Live result |
|---|---|
| IndexNow key file | `/1d69358d6e265f485ec60722cd51fb81.txt` serves the key (HTTP 200) |
| AISSEE guide (API) | 2027 eligibility, 6 questions, checked 2026-11-25; its 11 dates and 8 notices unchanged |
| JNVST guide | 7 questions; the new ones in the page HTML and in its FAQPage data |
| `/exams/aissee` snippet | "AISSEE 2027: apply by 2 Dec 2026; exam on 31 Jan 2027. Free AISSEE (Sainik School) Class 6 mock tests…" (152) |
| `/exams/jnvst`, `/exams/netarhat` snippets | Date kept (113 and 124 characters) |
| `/exams/practice/jnvst-mat-1` snippet | Ends on a whole clause, no "…" (156) |
| `/about` server HTML | 474 words (was about 30) |
| AISSEE page in a browser | "Last date to apply · 2 Dec 2026 · in 7 days · Apply on the official website", then "31 Jan 2027 · in 67 days" |
| Homepage and sitemap index | HTTP 200 |

Right after a deploy, nginx can answer once from its old cache (API 30 s, page HTML 10 min) while it refreshes; the
second request was fresh. The cache warm-up refreshes every sitemap page within about an hour.

Still to do (you):

1. **Publish the two articles:**
   `ADMIN_USERNAME=… ADMIN_PASSWORD=… node tools/blog/load-drafts.js https://schooldhundo.in/api/v1 --update jnv-admission-guide-jnvst-class-6`,
   then the same with `--update sainik-school-entrance-exam-aissee-preparation`.
2. **Submit every address to IndexNow once:** first check that `https://schooldhundo.in/1d69358d6e265f485ec60722cd51fb81.txt`
   shows the key, then run
   `ADMIN_USERNAME=… ADMIN_PASSWORD=… node tools/seo/indexnow-submit.mjs https://schooldhundo.in/api/v1 --all`
   (an ADMIN account; it prints how many addresses were accepted). After that, the 7:30 a.m. run keeps it up to date.
3. **Bing Webmaster Tools:** confirm the sitemap is submitted and read; after step 2, check the IndexNow report.
4. **Search Console:** request indexing for `/exams/aissee`, `/exams/aissee/guide`, `/exams/jnvst/guide`, the JNV article
   and `/about`.
5. **GA4 (Admin):**
   - add accounts.google.com as an unwanted referral;
   - mark `quiz_complete` and `generate_lead` as key events;
   - define your own IP as internal traffic and filter it out (46 homepage "organic" sessions are 4 users).
6. **Ubersuggest (optional):**
   - swap some tracked head terms for near-page-1 ones: "jnv mock test class 6 2027", "navodaya mental ability question
     paper", "aissee 2027 last date", "schools in naharlagun", "schools in asansol";
   - replace the AI prompts with the questions people ask, such as "Is there a JNVST answer key?" or "AISSEE 2027 age
     limit for class 6".

---

## 17. Remaining blockers

- Steps 1–5 above, which need your sign-ins.
- No direct Search Console, GA4 or Tag Manager access in this session: no URL Inspection, Core Web Vitals or Pages
  report, and the GA4 tag inside Tag Manager could not be read.
- Windsor is a trial with 30 days of history; Ubersuggest's free tier gives 3 reports a day.
- PageSpeed Insights needs an API key.

---

## 18. Plan

Targets are checkpoints against the baseline in §3, not promises.

**Next 7 days (to 2 Dec)**
- Deployed on 25 Nov, before JNVST (28 Nov) and the AISSEE deadline (2 Dec). Now do §16 steps 1–5, the articles first.
- From 29 Nov, watch Search Console for answer-key and result searches; add official NVS notices to the guide only when
  NVS publishes them.

**30 days (to 25 Dec)**
- Re-measure on 9 and 23 Dec:
  - clicks and impressions a week (baseline 35 and 4,106);
  - CTR of the preparation pages (JNVST 3.3%, AISSEE 1.5%, Netarhat 9.1%);
  - practice-set impressions;
  - Bing impressions (baseline 3 a month) and IndexNow acceptance;
  - ChatGPT sessions (baseline 39 a month).
- Decide and build one landing for "navodaya mental ability" searches, from the existing sets, with no duplicate pages.
- Server HTML for the remaining thin pages (rankings tools, contact, privacy).
- First 10 school emails; company profiles (Crunchbase, LinkedIn, Wellfound).

**60 days (to 25 Jan)**
- AISSEE: admit cards (25 Jan) and exam (31 Jan); provisional keys when NTA publishes them.
- Enrich the top noindex profiles with official facts (list in `tools/seo/data/noindex-profiles-in-search-2026-11-24.csv`).
- Jobs: more official sources in the states where job searches already show the site.

**90 days (to 25 Feb)**
- JNVST results season (by the end of March): official result notices in the guide and article.
- Keep what moved the numbers; drop what did not.
- Advertising only once clicks are steady every day, never on fact sections or tests.

---

## 19. Evidence-to-action log

| Decision | Evidence (source, period) | Metric | Page | Action | Priority | How success is measured |
|---|---|---|---|---|---|---|
| Fix preparation snippets | Live head, 25 Nov; Search Console 9–25 Nov | Descriptions 161–164 characters, date dropped; 391 impressions on the 3 pages | `/exams/{jnvst,aissee,netarhat}` | Seasonal description that fits | P0 | CTR of the 3 pages, 9 and 23 Dec |
| Correct AISSEE guide | NTA notice and bulletin of 3 Nov 2026; live API, 25 Nov | 2026 age windows; FAQ contradicting the page | `/exams/aissee/guide` | V48 migration and seed | P0 | Guide live with 2027 facts |
| Post-test JNVST answers | Prospectus §2.3, §3.1–3.8; "navodaya result 2026" 135,000 a month | No result, answer-key or wait-list text on the site | Guide, article | 4 + 3 questions, article section | P0 | Result and answer-key searches in Search Console after 28 Nov |
| Practice snippets | Live heads, all 115 sets | 115 cut with "…" | `/exams/practice/*` | New rule | P1 | Practice-set impressions and CTR |
| IndexNow | Bing via Windsor, 30 days; GA4 | 3 Bing impressions; ChatGPT the top new-user source | Whole site | IndexNow job and endpoint | P1 | Bing impressions; IndexNow HTTP 200/202 |
| Trust pages in HTML | Ubersuggest audit (50 low-word pages); live HTML | `/about` about 30 words | 3 trust pages | Server text | P1 | Ubersuggest low-word-count count after the next crawl |
| Deadline in the hero | NTA notice; live page | Deadline 7 days away, not shown | AISSEE preparation page | Hero card | P0 | AISSEE page engagement in GA4 |
| No mental-ability page yet | Ubersuggest: 22,200 a month, difficulty 12; weak results page | Site has 5 sets, 150 questions | — | Next round, one landing | P1 | — |
| No link schemes | Ubersuggest gap rows mostly spam | — | — | Schools, profiles, data stories | P1 | Referring domains (0 now) |
