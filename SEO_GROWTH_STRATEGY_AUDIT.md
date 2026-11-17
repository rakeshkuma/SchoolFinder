# SchoolDhundo.in: SEO audit and growth strategy (17 Nov 2026)

**Update, 17 Nov 2026:** on the owner's "yes", four backlog items were built in the code and tested: F5 (district
titles), F6 (profile titles), F7 (Olympiad address) and the cache warm-up part of F9. They are **not deployed and not
committed**. See [§J](#j-fixes-built-after-the-audit-17-nov-2026-not-deployed).

The audit itself changed nothing on the live site, in the database or in the code. It builds on three earlier rounds,
whose fixes are live:
- [SEO_AUDIT_AND_PLAN.md](SEO_AUDIT_AND_PLAN.md) (25th round)
- [SEO_UBERSUGGEST_AUDIT.md](SEO_UBERSUGGEST_AUDIT.md) (27th round)
- [SEO_INDEXING_GROWTH_REPORT.md](SEO_INDEXING_GROWTH_REPORT.md) (32nd round, deployed this morning)

## Evidence used, and what was not available

| Source | What was done | Status |
|---|---|---|
| **Live crawl (own script)** | All **2,615 sitemap URLs** and 50 more sample URLs fetched as Googlebot smartphone. Recorded per page: status, response time, title, description, canonical, robots, H1/H2, word count, images, alt text, internal links and JSON-LD. Done 17 Nov 2026, after this morning's deploy. | Measured |
| **Ubersuggest backlinks** (free plan) | Backlink summary for schooldhundo.in and the 5 named competitors | Measured today |
| **Ubersuggest keywords** | Volumes and difficulty from the 16 and 17 Nov reports (earlier rounds) | Measured, 1 day old |
| **Ubersuggest autocomplete** | 4,808 Google autocomplete phrases for 10 seed terms | Measured (phrases only, no volumes) |
| **Ubersuggest domain overview** | Returned **no data** for schooldhundo.in. The site is too new to have Ubersuggest ranking history. | Empty |
| **Competitor sitemaps** | Read the public robots.txt and sitemap index of each competitor to see how their sites are built | Measured today |
| **Lighthouse 12.6.0 (mobile)** | Reused the post-deploy run from this morning (32nd round) | Measured today |
| **Repository code** | Routes, SEO head and body services, nginx cache rules | Read |
| **Google Search Console** | No access from this session | **Not available** |
| **Google Analytics 4** | No access from this session | **Not available** |
| **Live database** | Reachable only over SSH; the public API was used instead | Partial |

The Ubersuggest daily quota (3 reports) ran out during this audit. Competitor organic traffic, competitor top pages,
the backlink-opportunity list and volumes for the 26 new candidate keywords in §C2 still need running, on a later day
or a paid plan (see §I).

**No page is described as "indexed" in this report.** Only Search Console can confirm that. A web search for
`site:schooldhundo.in` was tried, but the search tool used here is not Google, so its result proves nothing either way.

---

## A. Executive scorecard

Grades are this audit's judgement. Every grade rests on the measurement shown beside it.

| Area | Grade | Evidence |
|---|---|---|
| **Technical SEO** | **Strong** | 2,615 of 2,615 sitemap URLs return 200. Every one has exactly one H1 and a self-referencing canonical, and none is noindex. Wrong paths return noindex. Query strings canonicalise to the clean URL. robots.txt blocks only private areas. Lighthouse SEO is 100 on all 5 pages tested. |
| **Indexing readiness** | **Adequate, with one large fault** | The sitemap holds 985 of 33,609 profiles (2.9%), chosen by a quality rule, which is correct. But **434 city pages copy the title and H1 of their district page** (868 URLs, a third of the sitemap). |
| **Authority (backlinks)** | **Critical** | **Domain authority 1, 0 backlinks, 0 referring domains** (Ubersuggest, today). The five competitors have 1,570 to 19,066 referring domains each. |
| **Mobile performance** | **Adequate** | Lab LCP: home 1.7 s, profile 4.8 s, best-in-Delhi 3.8 s. CLS is 0 on all three. Home TBT 890 ms. Pages served from cache answer in 0.1–0.3 s, but **first (uncached) visits to best-in pages take a median 4.3 s and up to 6.2 s.** Field (CrUX) data is not available. |
| **Content quality** | **Mixed** | Strong: Delhi best-in (1,336 words), network pages (about 1,000 words), state pages (median 924 words), blog posts and prep dashboards. Weak: **29 sitemap pages send Google 48–73 words of server HTML.** Bengaluru, Mumbai and Chennai best-in pages have about 290 words. Famous premier schools such as The Doon School have fewer than 150 words and no board. |
| **On-page metadata** | **Needs work** | **715 of 985 profile titles are over 60 characters** (median 71, top 10% at 96+). Most are Navodaya names starting "PM SHRI School…". 769 profile descriptions are over 160 characters. |
| **Internal linking** | **Good on hubs, thin on tools** | State pages link a median 74 URLs, `/cities` 643 and network pages about 107. Tool and policy pages carry only the 6 header links in their server HTML. |
| **Structured data** | **Strong** | School, BreadcrumbList and FAQPage on profiles; BlogPosting on posts; Quiz on practice sets; WebSite, SearchAction and Organization on home. No ratings or fees beyond what the data holds. |

**What is holding the site back, in order:**
1. **No external links at all.** For a 17-day-old site this is the main reason Google crawls slowly and leaves most URLs as
   "Discovered – currently not indexed". It is not a code problem.
2. **Pages that look like duplicates.** The 434 district/city pairs and the long, cut-off Navodaya titles make Google's
   choices harder on the URLs that matter most.
3. **Thin server HTML on content pages that could carry content.** Google renders JavaScript, but a low-authority site gets
   rendered later and less often. Pages that send their text in the first response get indexed sooner.

---

## B. Critical problems (verified)

| # | Severity | Problem | Affected URLs | Evidence | Probable cause | Fix |
|---|---|---|---|---|---|---|
| B1 | **P0** | **No backlinks** | Whole site | Ubersuggest: DA 1, 0 backlinks, 0 referring domains. Competitors: 1,570–19,066 referring domains. | The site is new and has had no outreach. | Link-earning programme, §F items 2–4. No paid links. |
| B2 | **P0** | **District and city pages share title and H1** | 434 pairs, e.g. `/states/bihar/patna` and `/states/bihar/city/patna` | Both pages: title "Schools in Patna, Bihar \| SchoolDhundo", H1 "Schools in Patna, Bihar". The descriptions differ only in the count ("249 schools in Patna district" vs "158 schools in Patna"). School links overlap: 25 of 40 in Patna, 29 of 40 in Mysuru, and all 21 of Howrah's city schools also appear on the district page. | The district and city templates use the same "Schools in {name}, {state}" pattern, and most district headquarters share the district's name. | Name the district page "Schools in Patna District, Bihar" in its title and H1. Keep "Schools in Patna, Bihar" for the city page, because that is what people type. Link each page to the other. No URL changes. |
| B3 | **P1** | **Olympiad page has no clean address** | `/exams/practice?category=OLYMPIAD` (the real page); `/exams/olympiad` returns the noindex not-found page | Menu link at [MainNav.tsx:158](frontend/src/components/layout/MainNav.tsx#L158). The class is chosen through `?class=` ([OlympiadPractice.tsx:109](frontend/src/pages/OlympiadPractice.tsx#L109)), so there is no address per class. | Built as a filter of the practice centre | `/exams/olympiad`, plus `/exams/olympiad/class-{n}` for classes that have 2 or more real sets. Keep the old query address working, with a canonical to the new one. "olympiad exam" has 40,500 searches a month and "olympiad math" 18,100. Autocomplete shows "olympiad for class 1" through "class 11". |
| B4 | **P1** | **Profile titles too long** | 715 of 985 profiles; 599 of the 641 Navodaya profiles | "PM SHRI School Jawahar Navodaya Vidyalaya, Pilla Salki Dam Site Tudipaju. Phulbani, Kandhamal: Admissions & Details" (115 characters). Google cuts titles at about 60 characters, so the district name, which is what people search, gets cut off. | `SeoHeadService.schoolTitleTopic` ([SeoHeadService.java:583](backend/src/main/java/com/indiaschoolfinder/service/SeoHeadService.java#L583)) appends a topic to the full official name. `fitTitle` only drops the " \| SchoolDhundo" suffix. | **A display title for search results only** (the record and the H1 keep the official name): "JNV Kandhamal, Odisha: Admission & JNVST Details" and "KV Andrews Ganj, Delhi: KVS Admission & Details". For other schools, drop the topic when the title would pass 60 characters. |
| B5 | **P1** | **Content pages send almost no text to Google** | 29 sitemap URLs: `/admissions/guide`, `/admissions/notifications`, `/admissions`, `/exams/calendar`, `/exams/syllabus`, `/exams/resources`, `/exams/finder`, `/exams/practice`, `/rankings/methodology`, `/rankings/schools-by-state`, `/rankings/schools-by-city`, `/rankings/government-boarding`, `/rankings/boards`, `/rankings/score`, `/about`, `/advertise`, `/claim-school`, `/reviews`, `/find`, `/fees`, `/compare`, `/nearby`, `/contact` and 6 policy pages | 48–73 words and 6 internal links each (the header only). By comparison, `/exams/practice?category=OLYMPIAD` sends 399 words and 51 links. | `SeoBodyService` has no body for these paths. The 32nd round left the interactive tools out on purpose. | Add server bodies for the 13 **content** pages (`/admissions`, the guide, notifications, calendar, syllabus, resources, methodology, the four `/rankings/*` regroupings, about and `/exams/practice`). The tools (fees, compare, nearby, find, score) only need a 2-sentence intro and links. Policy pages can stay as they are. |
| B6 | **P1** | **Slow first response on uncached pages** | 50 best-in pages (median 4.3 s, max 6.2 s), 4 `/boards/*` pages (about 3.6 s), state, district and city pages (about 1.2 s, up to 3.3 s) | Measured during the full crawl on a cold cache. Served from cache, the same pages answer in 0.12–0.15 s. | The nginx SEO head and body cache keeps a page for 10 minutes ([nginx.conf:126](frontend/nginx.conf#L126), [:145](frontend/nginx.conf#L145)) and is emptied on every deploy. Googlebot often makes the first visit to a URL, and Google slows its crawling of sites that answer slowly. | (a) After each deploy, warm the cache by fetching every sitemap URL two at a time. (b) Keep SEO heads and bodies for 6 hours; the existing stale-while-updating setting refreshes them in the background. (c) Profile the `bestPlace` query on the backend. |
| B7 | **P1** | **Some of the most famous schools have the thinnest profiles** | 13 sitemap profiles under 150 words, including `/schools/the-doon-school`, `/schools/mussoorie-international-school`, `/schools/mody-school` and `/schools/kodaikanal-international-school`. Other premier-directory records (62 in all) are likely similar; check each. | The Doon School: no board, website, photo or admission details. `verificationStatus` is UNVERIFIED, and the only source is SchoolDhundo's own `/rankings` page. The server sends fewer than 150 words, and the title is "The Doon School, Dehradun \| SchoolDhundo". | The 12th round created these records from a PDF list, not from official sources. | An editor adds the board, official website, admissions page and a sourced description from each school's own website. That is 62 records, about 10 minutes each. The titles then gain the board and "Admissions" automatically. Existing fields only: no schema change. |
| B8 | **P1** | **Big-city best-in pages are thin** | Bengaluru, Mumbai, Chennai, New Delhi, Ooty, Darjeeling, Dehradun, and Hyderabad (391 words) | About 290 words and 10 links each, against 1,336 words and 80 links for Delhi. These target 8,100–12,100 searches a month. | Few published ranks or lists are recorded for these cities | Needs more **sourced** lists (with the publisher's permission) or verified profiles. No code change, and no invented ranks. |
| B9 | **P2** | Two-hop redirect | `http://www.schooldhundo.in/*` | http://www → https://www → https://schooldhundo.in (2 hops). The earlier report recorded 1 hop. | Caddy upgrades to https before it drops `www` | One Caddy rule that sends `www` straight to the https apex |
| B10 | **P2** | Descriptions cut off in results | 769 profiles, 113 of 115 practice sets, 40 of 50 best-in pages | Over 160 characters | The templates add sentences without a length check | Trim to 155 characters, keeping the facts first |
| B11 | **P2** | Thin category and class pages | 6 blog categories (130–139 words), `/exams/class/8` and `/exams/class/11` (about 133 words), `/boards/CAMBRIDGE` (101) and `/boards/IB` (129) | Crawl | Few items in each | Add a sourced 80–120 word intro to each, or leave the page out of the sitemap until it has 3 or more items |
| B12 | **P3** | Sitemap index has no `lastmod` | `/sitemap.xml` | The child sitemaps have it; the index does not | – | Add the newest child `lastmod` to each index entry |

**Checked and found correct:** status codes, canonicals, the noindex not-found page, robots.txt, sitemap XML, JSON-LD
types, decorative-logo alt text (`alt=""` is right) and pagination. `/schools?page=2` canonicalises to `/schools`, which is
acceptable because the indexable profiles are all in the sitemap and linked from place pages.

---

## C. Keyword opportunities

Volumes are Ubersuggest's estimates of monthly Google searches in India. SD is SEO difficulty (0–100). Ubersuggest's paid
"competition" figure is not available on the free plan. **Intent, priority and opportunity are this audit's judgement,
not Ubersuggest data.** With a domain authority of 1, even low-difficulty terms need some links before page 1 is
realistic.

### C1. Measured keywords (Ubersuggest, 16–17 Nov 2026)

| # | Keyword | Volume | SD | Intent | Landing page | Priority | Realistic opportunity |
|---|---|---:|---:|---|---|---|---|
| 1 | admission kvs | 165,000 | 14 | Navigational/transactional | `/network/kendriya-vidyalaya`, `/exams/kvs-admission` | P1 | Medium: the official KVS portal takes #1, so aim for a guide spot in the top 10 |
| 2 | sainik schools | 90,500 | 10 | Informational | `/network/sainik-school` | P0 | **High**: Ezyschooling ranks #2 with a thin city page |
| 3 | cbse schools near me | 110,000 | 34–38* | Local | `/nearby` | P3 | Low: Google Maps results dominate |
| 4 | schools close to me / schools near me | 673,000 | 19 / 46 | Local | `/nearby` | P3 | Low, same reason |
| 5 | olympiad exam | 40,500 | 34 | Informational | `/exams/olympiad` (B3) | P1 | Medium, after the clean URL exists |
| 6 | olympiad math | 18,100 | 27 | Informational | `/exams/olympiad` | P1 | Medium |
| 7 | jnvst | 33,100 | 40 | Navigational | `/exams/jnvst` | P2 | Low to medium: navodaya.gov.in leads |
| 8 | best schools in india | 14,800 | 10 | Informational | `/rankings` | P1 | High |
| 9 | 10 best schools in india | 9,900 | 11 | Informational | `/rankings` | P1 | High |
| 10 | best schools in hyderabad | 12,100 | 18 | Commercial | `/rankings/best-schools-in-hyderabad` | P1 | Medium, needs B8 |
| 11 | best schools in bangalore | 12,100 | 15 | Commercial | `/rankings/best-schools-in-bengaluru` | P1 | Medium, needs B8 |
| 12 | best schools in delhi | 8,100 | 13 | Commercial | `/rankings/best-schools-in-delhi` | P0 | **High**: this is the strongest best-in page |
| 13 | best schools in chennai city | 8,100 | 14 | Commercial | `/rankings/best-schools-in-chennai` | P1 | Medium, needs B8 |
| 14 | best schools in cbe | 8,100 | 11 | Commercial | none yet | Later | Only once real Coimbatore data exists |
| 15 | cbse schools in kolkata | 8,100 | 17 | Commercial | `/states/west-bengal/city/kolkata` | P1 | Medium, after B2 |
| 16 | school admission | 5,400 | 32 | Informational | `/admissions/guide` | P1 | Medium, after B5 |
| 17 | jnvst class 6 | 5,400 | 11 | Informational | `/exams/jnvst` | P0 | **High** |
| 18 | jnvst 2026 | 4,400 | 13 | Informational | `/exams/jnvst/guide` | P1 | High (roll over to "2027") |
| 19 | aissee 2026 | 9,900 | 17 | Informational | `/exams/aissee` | P1 | High (roll over to "2027") |
| 20 | aissee 2025 result sainik schools | 9,900 | 21 | Navigational | `/updates` | P2 | Seasonal; the official NTA page leads |
| 21 | jnvst selection list class 6 2025 | 8,100 | 19 | Navigational | `/updates` | P2 | Seasonal |
| 22 | aissee result 2026 | 8,100 | 36 | Navigational | `/updates` | P2 | Seasonal |
| 23 | jnvst class 6 result 2026 | 8,100 | 30 | Navigational | `/updates` | P2 | Seasonal |
| 24 | aissee 2026 admit card | 6,600 | 19 | Navigational | `/exams/aissee/guide` | P2 | Seasonal |
| 25 | nta aissee | 6,600 | 19 | Navigational | `/exams/aissee/guide` | P2 | Medium |
| 26 | jnvst result 2026 | 5,400 | 23 | Navigational | `/updates` | P2 | Seasonal |
| 27 | aissee 2026 counselling | 3,600 | 18 | Informational | `/exams/aissee/guide` | P1 | High: few strong answers exist |
| 28 | mayo ajmer | 33,100 | 20 | Navigational (brand) | `/schools/mayo-college` | P2 | Only after B7 adds sourced facts |
| 29 | bokaro dps | 27,100 | 24 | Navigational (brand) | the school's profile | P2 | Same |
| 30 | 6 class science question paper 2018 | 49,500 | 42 | Informational | `/exams/aissee/guide` (links to official papers) | P3 | Low; never host papers without permission |

\* Measured as 38 on 16 Nov and 34 on 17 Nov.
Netarhat tourism searches ("netarhat india" 9,900, "netarhat sunrise point" 8,100) were measured and **left out on
purpose**: they are not this site's audience.

### C2. Candidate keywords from Google autocomplete (real searches, volume not yet measured)

These phrases appear in Google autocomplete for India, which shows that people search them. **They have no Ubersuggest
volume or difficulty yet.** Measure them on the next Ubersuggest days (§I).

| # | Keyword | Intent | Landing page | Priority |
|---|---|---|---|---|
| 31 | sainik school admission 2027 / online application 2027-28 | Transactional | `/exams/aissee/guide`, `/updates` | P1 |
| 32 | sainik school admission age limit for class 6 | Informational | `/exams/aissee/guide` (FAQ) | P1 |
| 33 | sainik school admission and fees | Informational | `/network/sainik-school` | P1 |
| 34 | aissee 2027 application form / exam date | Informational | `/exams/aissee` | P1 |
| 35 | aissee class 9 syllabus | Informational | `/exams/aissee/guide` | P1 |
| 36 | aissee previous year question papers | Informational | guide, linking to the official NTA papers only | P2 |
| 37 | kv admission 2027-28 | Transactional | `/exams/kvs-admission` | P1 |
| 38 | kv admission age for class 1 / balvatika / age calculator | Informational | KVS guide + age checker | P1 |
| 39 | navodaya vidyalaya admission 2027 | Transactional | `/exams/jnvst/guide` | P1 |
| 40 | navodaya vidyalaya age limit for class 6 | Informational | `/exams/jnvst/guide` (FAQ) | P1 |
| 41 | jnvst class 6 syllabus | Informational | `/exams/jnvst/guide` | P1 |
| 42 | jnvst mock test | Transactional | `/exams/jnvst` | P0 |
| 43 | netarhat admission 2027 / application form | Transactional | `/exams/netarhat` | P1 |
| 44 | netarhat awasiya vidyalaya fees | Informational | `/exams/netarhat`, school profile | P2 |
| 45 | netarhat vs navodaya vidyalaya | Informational | blog article | P2 |
| 46 | olympiad for class 1 … class 11 (each class) | Informational | `/exams/olympiad/class-{n}` (B3) | P1 |
| 47 | olympiad questions for class 6 maths with answers | Informational | Olympiad class 6 maths sets | P1 |
| 48 | english olympiad for class 3 worksheets | Informational | Olympiad English sets | P2 |
| 49 | boarding schools in india | Commercial | `/boarding/india` | P1 |
| 50 | boarding schools in dehradun / mussoorie / ooty | Commercial | `/boarding/*` with a place filter, only where 5 or more schools exist | P2 |
| 51 | best cbse schools in bangalore / hyderabad / delhi | Commercial | `/boards/CBSE` + best-in pages | P2 |
| 52 | best cbse schools in pune | Commercial | none yet: real data needed first | Later |
| 53 | school admission 2027-28 | Informational | `/admissions` (calendar) | P1 |
| 54 | army school admission 2027 | Transactional | blog, plus a link to the official AWES notice | P2 |
| 55 | kendriya vidyalaya admission age criteria for class 6 | Informational | KVS guide | P2 |
| 56 | school fees structure | Informational | `/fees` plus profiles with sourced fees | P3 |

**Not targeted on purpose:** "navodaya vidyalaya recruitment 2026", "school fees payment", "school fees in dubai", and
brand searches for Olympiad bodies (SOF, Hindustan Olympiad). Each is the wrong audience, or would make SchoolDhundo
look like an official source.

---

## D. Competitor gap analysis

### D1. Measured authority (Ubersuggest backlinks, 17 Nov 2026)

| Site | Domain authority | Backlinks | Referring domains | Follow share | Sitemap files |
|---|---:|---:|---:|---:|---:|
| **schooldhundo.in** | **1** | **0** | **0** | – | 5 |
| careers360.com | 53 | 57,095,993 | 19,066 | 99% | 7 for the school subdomain |
| educationworld.in | 40 | 302,647 | 4,790 | 93% | none declared in robots.txt |
| ezyschooling.com | 30 | 118,718 | 2,193 | 95% | 177 |
| edustoke.com | 25 | 36,896 | 2,499 | 23% | 35 |
| uniapply.com | 22 | 60,714 | 1,570 | 90% | 91 |

None of them has links from .gov or .edu domains (refDomainsGovEdu = 0 for all), so Ubersuggest shows no government links
to compete against.

### D2. How their sites are built (from their public sitemaps, today)

- **Ezyschooling:** five sitemaps per city (schools, city, regions, boards, localities), across about 35 cities. It
  ranks through **locality** pages and "/fees-structure" pages for named schools. On 16 Nov, Ubersuggest put it at #2
  for "sainik schools" with a thin city page.
- **Edustoke:** city × category sitemaps (day schools, pre-schools, residential, "top schools" lists), the deepest for
  Dehradun and Pune.
- **Careers360 (school subdomain):** English and **Hindi** articles, exams, school details, school listings and
  e-books. It wins on volume of news and exam articles.
- **UniApply:** 91 numbered sitemaps; its business is admission applications.
- **EducationWorld:** a magazine with its own annual school rankings, which draw links.

Their business models (public knowledge, not re-checked today): Edustoke, Ezyschooling and UniApply earn from private
schools through admission enquiries and applications. Careers360 earns from advertising, leads and paid tools.
EducationWorld earns from its magazine, rankings and events.

### D3. Where they beat SchoolDhundo, and what is realistic

| They win on | Realistic answer for SchoolDhundo |
|---|---|
| **Links (2,000–19,000 domains)** | You cannot match this soon. 20–50 genuine links in 90 days is enough to get crawled and indexed properly (§F2–4). |
| Locality pages for metros | **Don't copy.** It would mean thousands of thin pages. Build city pages only where real data exists (B2, B8). |
| Fee-structure pages for famous schools | Sourced fees on the 62 premier profiles (B7), with dates and links to the school's own fee notice |
| Hindi content (Careers360) | 4–6 Hindi guides for JNVST, Sainik and Netarhat, whose audience is largely Hindi-speaking. The 500 JNVST questions are already bilingual. |

**Gaps SchoolDhundo can take legitimately:**
1. **Government and residential schools.** The private directories earn from private schools, so they cover
   JNV, KV, Sainik, RMS, EMRS and Netarhat thinly. SchoolDhundo already has all 651 JNVs, 33 Sainik Schools and full
   prep dashboards.
2. **Free, original mock tests** for JNVST (500 questions), AISSEE (575) and Netarhat (2 full Paper 1 mocks), plus
   class-wise Olympiad sets. None of the four competitor sitemap indexes checked today has a mock-test or practice
   section. That supports
   "jnvst mock test"-type searches and gives teachers and parents a reason to link.
3. **Every fact linked to its official source,** and rankings cited from publishers rather than invented. That is a
   trust signal you can say out loud in outreach.

---

## E. Page-level recommendations

| Page | Today (measured) | Recommendation |
|---|---|---|
| **Home** `/` | 60-character title, 309 words, 50 links, WebSite, SearchAction and Organization JSON-LD; LCP 1.7 s, TBT 890 ms | Add `sameAs` to the Organization once real social profiles exist. Load non-critical scripts later to bring TBT down. Link to the 6 strongest landing pages (Sainik, JNVST, AISSEE, best schools in Delhi, boarding, Olympiad) by name. |
| **Directory and listings** `/schools`, state, district, city | `/schools` has 549 words and 90 links; state pages a median of 924 words; city pages 488 | Fix B2 first. Keep listing filters out of the index, as now (they canonicalise to the clean URL). |
| **School profiles** (985 indexable) | Median 298 words, 13 links, School, FAQPage and Breadcrumb JSON-LD | B4 titles, B7 premier data, B10 descriptions. Template rules are in §E1. |
| **Rankings** `/rankings`, best-in | Delhi strong; 7 big cities thin | B8 (sourced data). Add a "how this list was made" line linking to `/rankings/methodology`, once that page has a server body (B5). |
| **Exams** JNVST, AISSEE, Netarhat | 417–531 words, Breadcrumb JSON-LD, guides with 680+ words | Add FAQ sections built from the official notices (age limits, dates, documents), roll the year to 2027, and add a dated "official notice" block that links to `/updates`. |
| **Olympiad** | Query URL only | B3 |
| **Practice sets** (115) | Median 230 words, Quiz JSON-LD | Trim descriptions (B10). Keep questions out of the server HTML, as now. |
| **Blog** | 13 URLs: 6 posts and 7 category pages | More posts (§G). Category intros or sitemap exclusion (B11). |

### E1. A school-profile template that scales without thin pages

1. **One rule decides indexing** (the existing `SchoolRepository.INDEXABLE`). Widen it one segment at a time, and only
   after Search Console shows about 60% of the current 985 indexed.
2. **Title:** "{short name}, {town}: {what the page really has}", at 60 characters or fewer. Short names: "JNV {district}",
   "KV {place}", "Sainik School {place}". The official name stays in the H1 and the School JSON-LD.
3. **Description:** board, classes, type, and one fact this school has that others don't (rank, list, boarding, fee
   year). 155 characters or fewer.
4. **Body:** only recorded facts, each with its source and date. Network schools get network text written once (JNV
   admission through JNVST, KV through the KVS portal). This text is shared but useful, and its share of each page
   shrinks as school facts grow.
5. **Links:** 6–10 nearby schools from the indexable set, the city page, the network page, and the exam guide for
   network schools.
6. **Storage:** no new columns or tables. All of this is generated at request time from existing fields.

---

## F. Prioritised implementation backlog

Risk means the risk to existing features. Every code item is a change to the generated head or body, or to a route,
with no schema change and no school data touched unless it says so.

| # | P | Item | Benefit | Effort | Risk | How to validate |
|---|---|---|---|---|---|---|
| 1 | **P0** | Owner exports from Search Console: the **Pages** report (indexed and not indexed, by reason) and the **Performance** report (queries, pages; last 28 days). Confirm the sitemap is submitted. | It is the only way to verify indexing. | 15 min (owner) | None | The files are shared |
| 2 | **P0** | **Verified-school badge:** invite the 985 indexable schools (about 98% have an official website) to claim their profile; verified schools may add a "View us on SchoolDhundo" link. Voluntary links only, never paid. | Referring domains; the claim flow already exists (17th round). | 2–3 days of code plus outreach | Low | Ubersuggest referring domains every week |
| 3 | **P0** | **One linkable data asset:** "India's schools by district: 33,609 CBSE and CISCE schools mapped", with counts by state and district, credited to CBSE SARAS and CISCE. Send it to education journalists and bloggers. | Natural links from news and blogs | 2 days | None | Referring domains; mentions |
| 4 | **P0** | Real profiles on YouTube, Facebook, X and LinkedIn; Bing Webmaster Tools (it can import from Search Console); genuine answers on Quora and Reddit where a SchoolDhundo page actually answers the question | Discovery, brand searches, Bing traffic | 1 day | None | Bing indexed count; referral sessions in GA4 |
| 5 | **P0** | **B2:** district titles and H1s say "District"; city and district pages link to each other | Removes 434 duplicate-title pairs | 0.5 day | Low | Crawl script: 0 duplicate titles |
| 6 | P1 | **B4:** short display titles for JNV, KV and Sainik schools; other schools drop the topic when the title passes 60 characters | Readable titles for 715 profiles | 0.5 day | Low | Crawl: titles of 60 characters or fewer; Search Console CTR |
| 7 | P1 | **B3:** `/exams/olympiad` and `/exams/olympiad/class-{n}` (only classes with 2 or more sets), with server bodies; the old URL canonicalises to the new one | A real target for 40,500 + 18,100 searches and the class long tail | 1.5 days | Medium: practice routing. Keep the old URL working and test the session start. | Crawl, plus existing Olympiad tests |
| 8 | P1 | **B5:** server bodies for the 13 content pages | Indexable text on hub pages | 1.5 days | Low | Crawl: 300+ words on each |
| 9 | P1 | **B6:** warm the cache after deploy, cache SEO output for 6 hours, profile `bestPlace` | Fast first responses, so Google crawls more | 0.5 day | Low: content may be up to 6 hours old (the daily sync runs at 6:00 IST) | Cold crawl: median response time under 1 s |
| 10 | P1 | **B7:** sourced facts for the 62 premier schools (editor work in the admin) | Famous-school searches; trust | About 10 hours of editing | None (data entry with sources) | Profile word count; title gains the board |
| 11 | P1 | Exam FAQs and the 2027 roll-over on the JNVST, AISSEE, Netarhat and KVS guides, from official notices only | Seasonal searches (C2 #31–43) | 1 day + editing | Low | Search Console queries containing "2027" |
| 12 | P1 | **B8:** sourced lists for Bengaluru, Mumbai, Chennai and Hyderabad (publisher permission first) | 4 pages worth 8,100–12,100 searches a month each | Editorial | None | Page word count, rankings |
| 13 | P2 | B10: descriptions at 155 characters or fewer | Fewer cut-off snippets | 0.5 day | Low | Crawl |
| 14 | P2 | B9: one-hop `www` redirect in Caddy | Cleaner crawl | 15 min | Low (keep the old Caddyfile for rollback) | `curl -L` hop count = 1 |
| 15 | P2 | B11: category, class and board intros, or sitemap exclusion | Fewer thin URLs | 0.5 day | Low | Crawl |
| 16 | P2 | 4–6 Hindi guides (JNVST, Sainik, Netarhat) | Hindi-speaking audience; Careers360 gap | Editorial | None | Search Console queries in Hindi |
| 17 | P2 | Widen `INDEXABLE` to Kendriya Vidyalayas (1,248) — **only after item 1 shows about 60% of the 985 indexed** | "admission kvs" demand | One line | Medium (crawl budget) | Indexed share stays at or above 50% |
| 18 | P2 | Bring home TBT under 400 ms (load the consent and GTM scripts later, split code) | Better INP and TBT | 1 day | Low | Lighthouse |
| 19 | P3 | B12: `lastmod` in the sitemap index | Minor | 15 min | None | XML check |
| 20 | P3 | `/nearby` and "near me" searches | Maps results dominate | – | – | Revisit only if Search Console shows impressions |

**Safety for every code item:** build on a branch, run the backend suite (374 tests), the frontend suite (209 tests) and
the crawl script; deploy only on the owner's word; clear the nginx cache; re-crawl. Rollback is the previous jar and dist,
already kept by the deploy script.

**Not recommended:**
- Indexing all 33,609 profiles.
- Locality pages for every pin code.
- Copying competitors' rankings or fee tables.
- Hosting official question papers without permission.
- Buying links, link exchanges, or directory spam.
- Fake reviews or ratings in schema.
- The Google Indexing API (it is only for job postings and livestreams).

---

## G. 30/60/90-day roadmap

| Window | Indexing | Rankings and content | Authority | Conversion and revenue |
|---|---|---|---|---|
| **Days 1–30** (to 17 Dec) | Search Console exports (F1). B2, B4, B6 shipped. Resubmit the sitemap. | B3 Olympiad URL. B5 hub bodies. Exam guides rolled to 2027. Articles 1–3 below. | Social profiles and Bing (F4). Badge outreach to the first 200 schools (F2). | Add a visible "Ask this school" enquiry button on profiles with a working contact. |
| **Days 31–60** | Check the share of the 985 that is indexed. Fix whatever reasons the Pages report shows. | B7 premier data. Articles 4–6. 2–3 Hindi guides. | Data asset (F3) sent to 30 journalists and bloggers. The next 400 schools for badges. | Apply for AdSense if traffic is steady (§H). |
| **Days 61–90** | If about 60% of the 985 is indexed, widen to KVs (F17). | B8 city lists. Articles 7–9. | Follow up the outreach. Aim for 20–50 referring domains. | First sponsored-listing pilot with 3–5 schools, clearly labelled. |

**Editorial calendar (based on typical recent cycles; confirm every date against the official notice before publishing):**

| # | Month | Article | Keywords it serves | Season |
|---|---|---|---|---|
| 1 | Nov | Sainik School admission 2027-28: AISSEE form, age, dates | C2 #31–34 | The AISSEE form window usually falls around Nov–Dec |
| 2 | Nov | Sainik School vs Navodaya Vidyalaya | sainik schools, jnvst | All year |
| 3 | Dec | Olympiad exams for school students, by class | olympiad exam, olympiad for class N | The Olympiad exam season usually runs Nov–Feb |
| 4 | Dec | JNVST Class 6 last-month revision plan | jnvst class 6, jnvst mock test | The JNVST exam usually falls in winter or spring |
| 5 | Jan | AISSEE exam day: what to carry, the pattern, after the exam | aissee 2027 | The exam usually falls in Jan–Feb |
| 6 | Feb | KV admission 2027-28: Balvatika and Class 1 age rules | admission kvs, kv admission age | KVS usually notifies in Feb–Mar |
| 7 | Feb | School admission calendar 2027-28 for parents | school admission, school admission 2027-28 | Most private admissions close by March |
| 8 | Mar | Netarhat Vidyalaya admission: Paper 1 and 2, and the selection stages | netarhat admission 2027 | Check the Jharkhand notice |
| 9 | Apr | How to read school rankings and lists (city edition: Hyderabad first) | best schools in hyderabad | After results, before new-session decisions |

---

## H. Monetisation (trust first)

**Assumptions, all stated, none measured.** Real figures arrive only once AdSense and GA4 have run for 30 days or more.
- 2 pages per session.
- AdSense page RPM of ₹30–₹100 per 1,000 pageviews for Indian education traffic.
- 0.3% of sessions send an admission enquiry.
- A school pays ₹150–₹400 per genuine enquiry.
- Sponsored or premium listings at ₹1,500–₹5,000 per school per month.

| Monthly organic sessions | AdSense | Enquiries (if schools pay) | Sponsored listings |
|---:|---:|---:|---:|
| 10,000 | ₹600–₹2,000 | 30 → ₹4,500–₹12,000 | 5 schools → ₹7,500–₹25,000 |
| 50,000 | ₹3,000–₹10,000 | 150 → ₹22,500–₹60,000 | 20 schools → ₹30,000–₹1,00,000 |
| 200,000 | ₹12,000–₹40,000 | 600 → ₹90,000–₹2,40,000 | 60 schools → ₹90,000–₹3,00,000 |

Today's organic traffic is **not known** (needs GA4 or Search Console). On a 17-day-old site with no links it is very
likely near the bottom of this table.

**Order to try them:**
1. **Admission enquiries.** They already exist (17th round), serve parents, and each school's willingness to pay can be
   tested by asking 5–10 schools.
2. **Clearly labelled sponsored listings.** Mark them "Sponsored", use `rel="sponsored"` on paid links, and never let
   them change a rank. Ranks come from publishers.
3. **AdSense,** below the main content and never inside practice tests. Watch CLS: reserve the ad space.
4. **Premium prep packs** only after the free bank has an audience. Keep the current free tests free.

Do not sell ranks, "featured" badges that look like awards, or parents' contact details without their clear consent
(DPDP Act).

---

## I. Measurement dashboard

| KPI | Source | Baseline (17 Nov) | 90-day goal (a goal, not a forecast) | Check |
|---|---|---|---|---|
| Indexed URLs (of 2,615 in the sitemap) | Search Console Pages | Not available (16 Nov export: 96 indexed, before the 26th fix) | 60% of the 985 profiles; 80% of hub pages | Weekly |
| Not-indexed reasons | Search Console Pages | Not available | "Duplicate" reasons down after B2 | Weekly |
| Impressions, clicks, CTR, average position | Search Console Performance | Not available | A rising 28-day trend; CTR at or above 2% on best-in and exam pages | Weekly |
| Organic sessions, enquiries | GA4 (GTM-PZ7WSXBS, G-ESGRNYGQHQ) | Not available | Track monthly | Monthly |
| Referring domains | Ubersuggest backlinks (free) | **0** | 20–50 | Weekly |
| Duplicate titles in the sitemap | Crawl script | **434 groups** | 0 | After each deploy |
| Profile titles over 60 characters | Crawl script | **715 / 985** | Under 50 | After each deploy |
| Cold first response, best-in pages | Crawl script | **Median 4.3 s** | Under 1 s | After each deploy |
| Lab CWV (profile) | Lighthouse | LCP 4.8 s, CLS 0 | LCP under 3.0 s, CLS at or below 0.1 | Monthly |
| Field CWV | Search Console CWV / CrUX | Not available (probably too little traffic yet) | "Good" on at least 75% of URLs | Monthly |
| Revenue | AdSense, enquiry invoices | ₹0 | First pilot income | Monthly |

**The next Ubersuggest days (3 reports each):**
- **Day 1:** `match_keywords` for Olympiad class seeds, "kv admission 2027" and "sainik school admission 2027". These
  give volumes for §C2.
- **Day 2:** `backlink_opportunity` (domains that link to Ezyschooling, Edustoke and UniApply but not to SchoolDhundo,
  which becomes the outreach list), plus `domain_top_pages` for Ezyschooling and Edustoke.
- **Day 3:** a site audit recrawl after B2, B4 and B5 ship.

Don't spend a report on `domain_overview` for schooldhundo.in until Search Console shows clicks. Today it cost one
report and returned nothing.

**Access that would let the next audit verify more:**
- Search Console: Owner or Full user, or the two exports in F1.
- GA4: viewer access.
- One read-only database query session to count indexable schools by segment.
- A paid Ubersuggest plan for one month, or 3 more free days, for competitor traffic and the keyword volumes.

**How the crawl figures were produced:** a Node script (fetch as Googlebot smartphone, 4 at a time) over every
`<loc>` in the 5 sitemaps on 17 Nov 2026 after this morning's deploy: 2,615 URLs, 0 fetch errors, all 200.

---

## J. Fixes built after the audit (17 Nov 2026, not deployed)

Built on the owner's "yes" to the first four fixes. Nothing is deployed or committed. No school record, database schema,
question, answer, score or ranking was changed, and no URL that exists today was removed.

| Backlog item | What changed | Files |
|---|---|---|
| **F5 (B2) District titles** | District pages are now "Schools in Patna District, Bihar" in the title, the server heading and the app heading. Town pages keep "Schools in Patna, Bihar". When the two share a name, each links to the other: "Just the city: 158 schools in Patna" and "The whole district: 249 schools in Patna District". The link appears only when the other page has 3 or more schools, the rule that already decides which place pages are indexed. | `SeoHeadService` (`districtName`), `SeoBodyService` (state and city bodies), `DirectoryPages.tsx` |
| **F6 (B4) Profile titles** | A profile title over 60 characters first drops the "PM SHRI (School)" prefix, then the ": Admissions & Details" topic. Only if it is still too long does it shorten "Jawahar Navodaya Vidyalaya" to "JNV" and "Kendriya Vidyalaya" to "KV". The heading and School data keep the full official name. Names are never swapped for a district ("JNV Kannur"), because 45 districts have more than one JNV in the directory and that would mislabel schools. On the 985 indexable profiles, titles over 60 characters fall **from 715 to 7**, with no duplicate titles. | `SeoHeadService.schoolTitle` |
| **F7 (B3) Olympiad address** | New pages: `/exams/olympiad`, plus `/exams/olympiad/class-1` to `/class-10`. Each class has 4–5 published sets and 24–87 questions. Class pages are titled the way people search, for example "Class 5 Olympiad Preparation: Maths, Science & English". Their server HTML lists the class's sets, its mock tests and the other classes, **never questions or answers**. The old address `/exams/practice?category=OLYMPIAD` (and `&class=5`) carries the new page's canonical link, and the app redirects visitors there, keeping the chosen class and subject. Menu, prep cards, exam hub and practice-set pages all link to the new address. The 11 new URLs are in the sitemaps and the old one is out. Any other address under `/exams/olympiad/` is noindex. | `OlympiadPages` (new), `SeoHeadService`, `SeoBodyService`, `SeoController`, `SitemapController`, `App.tsx`, `OlympiadPractice.tsx`, `PracticePages.tsx`, `content/olympiad.ts`, `MainNav.tsx`, `PrepCards.tsx` |
| **F9 (B6) Cache warm-up** | Measured first: nginx already serves an expired copy at once and refreshes it in the background (0.17–0.38 s). The slow responses are pages that were never cached, or dropped out after 7 days unvisited. So now: (1) after each deploy, `deploy/warm-seo-cache.sh` requests every sitemap page, one a second, starting 10 minutes after the backend is up. It deletes nothing, so visitors keep the old copy until each page refreshes. (2) It runs again daily at 06:45 IST (systemd timer `schooldhundo-warm`). (3) Unused copies are kept for 30 days instead of 7. A warm-up failure never stops a deploy. The `bestPlace` query was **not** profiled. | `deploy/warm-seo-cache.sh` (new), `deploy/oracle-micro-web.sh`, `deploy/oracle-micro-deploy.ps1`, `frontend/nginx.conf` |

**Tests**
- Backend: **379 of 379 pass** (full suite; there were 374 before). The 5 new tests cover the title rules, district
  names, Olympiad addresses and pages, old-address canonicals, sitemap entries and the district/city cross-links. The
  SEO integration tests were re-run after the last edit: 19 of 19 pass.
- Frontend: 211 of 211 pass (2 new tests for the old-address redirect and the class addresses; the Olympiad page test
  now follows a class to its own page and back). `tsc` is clean and the production build succeeds.
- Warm-up script: `bash -n` is clean, and a limited run against the live site (`LIMIT=8`) read the sitemaps and
  fetched 8 pages with 0 failures.
- **Not run:** `nginx -t` and the systemd units, because neither exists on this PC. The deploy runs `nginx -t` before
  reloading.

**After deploying, check:**
1. `curl -s https://schooldhundo.in/exams/olympiad/class-5 | grep -o '<title>[^<]*'` shows the class title.
   `/exams/practice?category=OLYMPIAD` shows a canonical link to `/exams/olympiad`.
2. `/sitemaps/exams.xml` lists `/exams/olympiad/class-1` to `class-10`, and `/sitemaps/pages.xml` lists `/exams/olympiad`.
3. `/states/bihar/patna` is titled "Schools in Patna District, Bihar" and links to `/states/bihar/city/patna`.
4. On the server, `systemctl list-timers schooldhundo-warm.timer` shows the next run. About an hour after the deploy,
   `journalctl -u schooldhundo-warm` reports "Warmed … pages … 0 failed".
5. Re-run the audit crawl: duplicate titles should be **0** (were 434 groups), and profile titles over 60 characters
   **7** (were 715).
6. Search Console: resubmit `sitemap.xml`, and inspect `/exams/olympiad` and `/exams/olympiad/class-5`.

**Rollback:** redeploy the previous build. No data or schema was touched. The warm-up is removed with
`sudo systemctl disable --now schooldhundo-warm.timer`.
