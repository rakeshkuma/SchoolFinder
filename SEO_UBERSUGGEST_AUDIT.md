# SchoolDhundo: Ubersuggest SEO audit and fixes (16 Nov 2026)

All figures below come from Ubersuggest (free plan, India, location 2356), pulled on 16 Nov 2026. Nothing is
estimated or invented. The free plan allows 3 reports a day, and this audit used all 3:

1. a site audit (150-page crawl);
2. keyword research for JNVST, AISSEE and Netarhat;
3. the keywords a competitor (ezyschooling.com) ranks for.

Google autocomplete phrases were also collected; they are free but come without figures. On the free plan, only the
top 10 affected URLs are shown for each issue, and only the top ~17 keyword rows carry volume and difficulty.

Not checked with Ubersuggest:
- school-fee and admission keyword volumes (no report left today);
- a domain overview of schooldhundo.in (the site is ten days old and has no ranking history yet).

These can be run on later days.

## 1. Site audit (crawl of 150 pages)

**Health score: 63/100.** 150 pages were crawled: all 150 returned 200, none was blocked, broken or redirected.

| Check | Result |
|---|---|
| Sitemap, valid SSL, robots access | OK |
| Duplicate titles or descriptions, empty titles, slow pages | None |
| 4xx pages, broken links, missing H1, missing description, compression | None |
| **Low word count** (error) | **150 pages**, e.g. `/about` 22 words, `/admissions` 17, `/boarding` 20, `/admissions/guide` 36, home 154 |
| **Title too long** (warning) | **46 pages**: "Best Schools in {place}: Rankings and School Lists" (66–68 characters), the home page (72), `/exams/practice` (84), `/admissions/guide` (73) |
| **Title too short** (warning) | 3 pages: `/disclaimer`, `/privacy`, `/terms` |
| "Non-friendly" URL (warning) | 9 pages: the upper-case `/boards/CBSE`, `/boards/IB`, … and the one-word `/schools`, `/fees`, `/states`, `/cities`, `/nearby` |

Notes on the audit:
- **Word counts** come from the HTML the server sends, before the app runs. Most fixed pages send only a heading and
  one sentence there. The app adds the rest in the browser.
- **Pages crawled:** the crawl followed links in order and stopped at 150 pages. It reached the policy, boarding,
  rankings and first state pages, but not school profiles, exam pages or the blog.
- **URLs left as they are:** the flagged URLs are live and indexed. Changing them would mean redirects for no real
  gain.

### Found while checking the audit in the code (not reported by Ubersuggest, but more serious)

Google reads a page *after* its JavaScript has run. Once the app loaded, it overwrote the server's page head:

- **Titles:** every page's title became a shorter one. For example, "Sainik Schools in India | SchoolDhundo" became
  "Sainik Schools · SchoolDhundo".
- **School profiles:** the title "DPS Bokaro: Fees, Admissions & Details" lost everything after the school's name. The
  app also replaced the description with one that mentioned "official fees" even for schools that have none.
- **Structured data on profiles:** the app deleted the server's School, BreadcrumbList and FAQPage data and added back
  School only. Google's rendered profiles therefore had no FAQ or breadcrumb data.
- **Blog posts:** the app used the card title and excerpt instead of the post's own meta title and description.

## 2. Keyword research (India)

### Entrance exams (JNVST, AISSEE, Netarhat)

| Keyword | Monthly searches | SEO difficulty (0–100) | Page that answers it |
|---|---:|---:|---|
| jnvst | 33,100 | 40 | `/exams/jnvst` |
| aissee 2026 | 9,900 | 17 | `/exams/aissee`, `/exams/aissee/guide` |
| aissee 2025 result sainik schools | 9,900 | 21 | `/exams/aissee/guide`, `/updates` |
| jnvst selection list class 6 2025 | 8,100 | 19 | `/updates` (result notices) |
| aissee result 2026 | 8,100 | 36 | `/updates` |
| jnvst class 6 result 2026 | 8,100 | 30 | `/updates` |
| aissee 2026 admit card | 6,600 | 19 | `/updates`, `/exams/aissee/guide` |
| nta aissee | 6,600 | 19 | `/exams/aissee/guide` |
| **jnvst class 6** | **5,400** | **11** | `/exams/jnvst` |
| jnvst result 2026 | 5,400 | 23 | `/updates` |
| **jnvst 2026** | **4,400** | **13** | `/exams/jnvst`, `/exams/jnvst/guide` |
| aissee 2026 counselling | 3,600 | 18 | `/exams/aissee/guide` |

- **Netarhat:** the highest-volume Netarhat searches are about tourism (for example "netarhat india" 9,900, "netarhat
  sunrise point" 8,100). They are not this site's audience. The school searches ("netarhat vidyalaya class 6
  admission", "netarhat vidyalaya admission 2026", "netarhat result 2025 class 6") came back without figures on the
  free plan.
- **Autocomplete demand:** Google autocomplete shows steady demand for "jnvst class 6 syllabus", "jnvst mock test",
  "aissee class 6 mock test", "aissee previous year question papers", "aissee syllabus for class 9", "is netarhat
  school cbse or icse", "netarhat vidyalaya fee structure" and "netarhat vs navodaya vidyalaya".

### Competitor gap (ezyschooling.com, India)

| Keyword | Monthly searches | Difficulty | Ezyschooling's position (page) | SchoolDhundo page |
|---|---:|---:|---:|---|
| schools close to me / schools near me | 673,000 | 19 / 46 | 11 / 29 (city admission pages) | `/nearby` (retitled, see below) |
| admission kvs | 165,000 | 14 | 41 (KV admission article) | `/network/kendriya-vidyalaya` |
| cbse schools near me | 110,000 | 38 | 18 | `/boards/CBSE`, state and town pages |
| **sainik schools** | **90,500** | **10** | **2** (`/sainik-schools-in-mumbai`, about 19,400 visits/month) | `/network/sainik-school` |
| mayo ajmer | 33,100 | 20 | 41 (`/school/mayo-college-ajmer/fees-structure`) | the school's profile |
| bokaro dps | 27,100 | 24 | 16 (`…/delhi-public-school-bokaro…/fees-structure`) | the school's profile |
| 6 class science question paper 2018 | 49,500 | 42 | 31 (Sainik School question papers article) | `/exams/aissee/guide` (official papers) |

**The gap that matters:** "sainik schools" has 90,500 searches a month at difficulty 10, and Ezyschooling sits at #2 with
a thin city page. SchoolDhundo's Sainik School page sent Google a heading and one sentence.

The second gap is **fee-structure pages for famous schools**. Ezyschooling ranks for school names through
"/fees-structure" pages. This needs real, sourced fees, not a code change; see section 4.

## 3. What was changed (built and tested; not deployed)

| # | Change | Why (data) |
|---|---|---|
| 1 | **The server's title, description and school structured data are kept on the page first loaded.** The app sets its own titles only after the visitor moves to another page, and on pages the server marks noindex. Files: `frontend/src/hooks/useDocumentTitle.ts`, `SchoolDetailSections.tsx` | Google indexes the rendered page; until now it saw the app's shorter titles and lost FAQPage and BreadcrumbList data on every profile |
| 2 | **Titles over 60 characters drop the " \| SchoolDhundo" suffix.** Google shows the site name above each result anyway. Applied in one place (`SeoHeadService.fitTitle`) | 46 "title too long" warnings; Ubersuggest flagged 66+ characters and passed 62 |
| 3 | **Shorter keyword-led titles:** the home page is now "SchoolDhundo: Find Schools, Rankings, Admissions & Exam Prep"; the three prep pages are "JNVST Class 6 Preparation 2027: Free Mock Tests", "AISSEE 2027 Class 6 Preparation: Free Mock Tests" and "Netarhat Vidyalaya Entrance Exam 2026-27: Free Mock Tests"; `/exams/practice` and "Best Schools in {place}: Rankings & School Lists" were shortened too | Titles were 72–100 characters; "jnvst class 6" has 5,400 searches at difficulty 11 |
| 4 | **Network pages target the searches people make:** "Sainik Schools in India: list and admission", "Kendriya Vidyalaya list and KVS admission", "Jawahar Navodaya Vidyalaya list and admission", "Rashtriya Military Schools and RMS CET". Their descriptions start with the real number of schools listed | "sainik schools" 90,500 (difficulty 10); "admission kvs" 165,000 (difficulty 14) |
| 5 | **Network pages now carry content in the server HTML:** the official introduction (the same text the app shows), the official site, links to the exam preparation and guide pages, and up to 100 of the network's schools, linked | Low word count; these were heading-plus-one-sentence pages |
| 6 | **Unknown `/network/…` addresses are noindex** (they show "page not found") | Prevents soft-404 pages from being indexed |
| 7 | **Policy page titles** are longer: "Privacy policy: what we store and why", and similar for terms and disclaimer | 3 "title too short" warnings |
| 8 | **`/nearby` is titled "Schools near me: find schools on a map"** | "schools near me" has 673,000 searches a month |

Unchanged:
- every URL and redirect;
- database records, school listings, filters and the page designs;
- the sitemap (Ubersuggest found it valid);
- canonical addresses (already correct on every crawled page).

This change also ships with the indexing fix of 16 Nov (noindex for bare CBSE listings, place summaries). That fix is
still uncommitted in the same working tree.

## 4. Recommended next steps (in order of impact)

1. **Deploy, then clear the nginx cache:** `sudo find /var/cache/schooldhundo-api -type f -delete`. Check with
   URL Inspection → "View crawled page" for `/network/sainik-school` and one school profile. The rendered title should
   be the server's, and the HTML should contain `FAQPage`.
2. **Re-run the Ubersuggest site audit a day after deploying,** with a recrawl. The long-title warnings and the network
   pages' word counts should drop. Note that the crawl reaches only 150 pages.
3. **Fee pages for famous schools, only with sourced fees.** Ezyschooling ranks for "mayo ajmer" (33,100) and
   "bokaro dps" (27,100) with fee-structure pages. Add official fees to the premier schools' profiles (claim-school or
   editor entry); the profile title then says "Fees" by itself.
4. **Exam-season notices on `/updates`:** "aissee result 2026", "jnvst class 6 result 2026", "aissee 2026 admit card"
   and "jnvst selection list" together get about 36,000 searches a month at difficulty 19–36. Each notice should be
   posted when the official one appears, with the official link. The daily sync already picks up NTA's AISSEE notices
   and Navodaya's JNVST notices. Navodaya notices that link to another site, such as the admit-card portal, wait in
   Admin → School & exam updates for review, so check that queue during result and admit-card weeks.
5. **Articles from the autocomplete questions,** written with sources: "Netarhat vs Navodaya Vidyalaya", "Is Netarhat
   school CBSE?", "Netarhat Vidyalaya fee structure", "AISSEE Class 9 syllabus", "How many Sainik Schools are there in
   India". These fit the editorial calendar in `SEO_AUDIT_AND_PLAN.md`.
6. **Other server-HTML pages:** `/boarding/*`, `/boards/*`, `/type/*` and `/stages/*` still send only a heading and a
   sentence before the app runs. Giving them a school list, as the network pages now have, is the next content fix.
7. **Ubersuggest on later days (3 reports a day):**
   - keyword research for "school fees", "school admission 2027" and "cbse schools in";
   - a domain overview of schooldhundo.in once Search Console shows impressions;
   - a project to track 25 keywords weekly. Suggested keywords: the entrance-exam terms above, plus "sainik schools",
     "kendriya vidyalaya admission", "boarding schools in india" and the top city searches.
