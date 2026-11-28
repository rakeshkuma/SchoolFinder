# SchoolDhundo: technical SEO audit and growth plan (15 Nov 2026)

Everything below was checked on the live site (https://schooldhundo.in) or in the code on 15 Nov 2026. Search Console
and GA4 were **not** accessible to this audit, so there are no indexing or traffic numbers here. Nothing in this
document is a promise of rankings.

## A. Audit: what was found

### What already works (no change needed)

| Check | Evidence |
|---|---|
| Every public page answers 200 with a unique `<title>`, description and one self-referencing canonical | 30 representative URLs fetched: home, directory, rankings, admissions, exams, JNVST, AISSEE, Netarhat, blog, states, districts, towns, school profiles |
| Content is in the first HTML response, not only after JavaScript | nginx includes server-rendered headings, facts and links (SeoBodyService) in `#root`; e.g. the Bihar page has 3,300 characters and 87 links before any script runs |
| Structured data | Home: WebSite + Organization. Schools: School + BreadcrumbList + FAQPage (questions shown on the page). Blog posts: BlogPosting + BreadcrumbList. Practice sets: Quiz. Exams: BreadcrumbList |
| Sitemaps | An index, 1,583 page URLs and 33,060 school URLs with real last-modified dates; only active schools; places below the noindex threshold are left out |
| Duplicates | `?utm=…`, filter parameters and trailing slashes all canonicalise to the clean URL; http → https (308); www → bare domain (301) |
| Unknown and private pages | `noindex` (unknown school slugs, unknown paths, account, admin, sessions) |
| Lighthouse SEO score (mobile, lab) | 100 on home, a school profile and JNVST |

### Problems found and what was done

| Priority | Problem | Evidence | Fix in this change |
|---|---|---|---|
| **P0** | robots.txt blocked `/api/`. The app replaces the server HTML as soon as it starts and then loads its data from `/api/`. Google renders pages with JavaScript and obeys robots.txt for those requests, so the page Google renders could show only loading or error states. | `Disallow: /api/` in the live robots.txt; `main.tsx` uses `createRoot().render`, which replaces `#root` | Public API is crawlable; only `/api/v1/admin/`, `/account`, `/auth/`, `/participants` and `/dev/` are disallowed. Every API answer now carries `X-Robots-Tag: noindex`, so the JSON itself is never indexed |
| **P0** (Core Web Vitals) | School profiles shift by **CLS 0.691** on phones (Google's "good" is under 0.1). This affects all 33,060 profiles | Lighthouse 12.6, mobile: the footer appears in the first screen while the profile loads, then jumps | `<main>` always keeps at least one screen of height, so the footer is never in the first screen during loading |
| P1 | School descriptions said "Official fees, admissions, facilities…" on every profile, but fees are stored for only **8** schools, admission dates for **740** and facilities for **18** | Live database counts (read-only) | Titles and descriptions now name only what the profile holds: "…: Fees, Admissions & Details", "…: CBSE School Details", "See affiliation number and contact details…" |
| P1 | Blog articles had only a heading and excerpt in the first HTML (about 275 characters) | Live fetch of the AISSEE article | The whole article (headings, lists, tables, notes, links), its questions and sources are now in the first HTML. A Java port of the app's own formatter, with every piece of text escaped |
| P1 | Exam guides and preparation pages had about 400 characters of first HTML | Live fetch of /exams/jnvst | Guides now carry dates, the pattern tables, eligibility, syllabus, selection, FAQ and official papers. Preparation pages carry dates, the pattern, every mock test and quiz as links, and official links: what each page shows |
| P1 | Profiles linked to few other profiles (8–10 links), so many of the 33,060 profiles are reachable only through long lists | Live fetch | The first HTML now has the same "Other schools within 5 km" or "Other schools in {town}" links that the profile shows (six) |
| P1 | Google Tag Manager blocked a phone's main thread for about 530 ms | Lighthouse third-party summary | Tag Manager starts after the page's `load` event. Consent Mode defaults are unchanged and still run first. CSP hash updated |
| P1 | The Google Fonts stylesheet blocked rendering (about 880 ms) | Lighthouse render-blocking audit | Inter and Plus Jakarta Sans are served from the site (`@fontsource`, the same weights). There are no more requests to Google Fonts, and the CSP no longer allows them |
| P2 | State, district and town pages had no breadcrumb data and promised "fees and admissions" for every place | Live fetch | BreadcrumbList added. Wording changed to "fees and admission dates where published" |
| P2 | One sitemap for all 33,060 schools; pages, places, exams and the blog mixed in one file | Live sitemap index | `/sitemaps/pages.xml`, `places.xml`, `exams.xml`, `blog.xml`, and `schools-1…4.xml` (10,000 each), so Search Console reports each part separately. The old `pages.xml` and `schools-1.xml` addresses still work |
| P2 | The sitemap loaded every practice set's questions to list their addresses | Code | It now reads only slug and date |
| P2 | `favicon.svg` and site photos had no cache lifetime, and a missing photo answered with the app (200) | Lighthouse cache audit, nginx.conf | One week in the browser; a missing file answers 404 |

### Left as they are (and why)

| Item | Why |
|---|---|
| Unknown URLs answer 200 with `noindex`, not 404 | Google treats this correctly. A real 404 needs nginx to ask the backend before serving the app, which adds a request to every page view |
| `http://www.` takes two redirects (to `https://www.`, then to the bare domain) | Set in Caddy on the server. Optional fix: one `redir` rule in the Caddyfile |
| On a phone's first visit the cookie banner's paragraph is the largest element (LCP 3.6 s in the lab) | Shortening it changes the consent wording; that is the owner's decision |
| `/api/v1/account/me` answers 401 for visitors who are not signed in (a console error in Lighthouse) | Changing it means changing how sign-in state is checked. It does not affect search |
| Profiles with little information stay indexed | Every one is a real CBSE-affiliated school with its own name, address, board, affiliation number and classes from the official record. Only 2 duplicate name-and-town pairs exist. Thin pages get better by adding facts (UDISE+ links, fees, admissions), not by hiding them |

## B. Files changed

Backend:
- `controller/SitemapController.java`: robots.txt and the split sitemaps.
- `config/ApiNoIndexFilter.java` (new): `X-Robots-Tag: noindex` on `/api/`.
- `service/SeoHeadService.java`: school titles and descriptions; place breadcrumbs; the Netarhat preparation page.
- `service/SeoBodyService.java`: blog articles, exam guides, preparation pages, other-schools links.
- `util/BlogBodyHtml.java` (new): the article formatter.
- `repository/PracticeSetRepository.java`: queries without the questions.

Frontend:
- `components/layout/Layout.tsx` (layout shift)
- `index.html` (Tag Manager start, fonts)
- `main.tsx` (fonts)
- `index.css` (styles for the new server-rendered content)
- `security-headers.conf` (CSP)
- `nginx.conf` (photo caching)
- `package.json` (`@fontsource/inter` 5.3.0, `@fontsource/plus-jakarta-sans` 5.3.0)

Tests: `SitemapIT`, `SeoHeadIT`, `SeoBodyIT` and `BlogIT` gained checks for every change above.

## C. Search Console: to do by the owner

1. **Property.** If there is no property yet, add a **Domain** property for `schooldhundo.in` at
   https://search.google.com/search-console. Verify it with the DNS TXT record (GoDaddy → DNS → add TXT on `@`). A
   Domain property covers http, https and www together. If a URL-prefix property already exists, keep it; do not
   create a second one.
2. **Sitemap.** After this change is live, submit `https://schooldhundo.in/sitemap.xml` once (Indexing → Sitemaps).
   The index lists every part.
3. **Check rendering.** URL Inspection → *Test live URL* → *View tested page* → Screenshot, for:
   - `/`
   - `/schools/delhi-public-school-r-k-puram`
   - `/states/bihar`
   - `/exams/jnvst`
   - `/exams/netarhat`
   - `/blog/cbse-vs-icse`

   The screenshot should show the real page, not a spinner. Then *Request indexing* for those six only.
4. **Read the reports weekly.**
   - Pages: "Discovered – currently not indexed" is normal for new sites; it falls as Google trusts the site.
   - "Crawled – currently not indexed": the profiles to enrich first.
   - Sitemaps: indexed count per file.
   - Performance: queries, CTR.
   - Core Web Vitals: field data appears once there is enough traffic.
5. **Do not use the Indexing API** for school pages; it is only for job postings and livestreams.

## D. School profiles

| | Profiles |
|---|---|
| Active, in the sitemap | 33,060 |
| With a stored fee | 8 |
| With admission dates | 740 |
| With facilities | 18 |
| With an approved photo | 44 |
| Without any place (town, district or PIN) | 0 |
| Same name in the same town (duplicate groups) | 2 (different schools; see the duplicate report) |

**Metadata strategy (now live in code):**
- Title: `{Name}, {Town}: {what the profile holds} | SchoolDhundo`.
- Description: `{Name}, {place}. {Board} school, {classes}. See {fees / admission dates / facilities / affiliation number / contact details, as recorded}, with official sources, on SchoolDhundo.`
- H1: the school's name.
- Canonical: `/schools/{slug}`, unchanged.

**What will lift the most profiles:**
1. UDISE+ links (the 23rd prompt).
2. Fee and admission data from schools that claim their profile.
3. Photos with permission.

Every added fact also changes the title and description automatically.

## E. Content plan

### Priority searches and the page that answers each

| Search intent | Page that answers it today |
|---|---|
| JNVST Class 6 preparation / mock test / syllabus / in Hindi | `/exams/jnvst`, `/exams/jnvst/guide`, `/blog/jnv-admission-guide-jnvst-class-6` |
| AISSEE / Sainik School Class 6 and 9 preparation | `/exams/aissee`, `/exams/aissee/guide`, `/blog/sainik-school-entrance-exam-aissee-preparation` |
| Netarhat entrance exam preparation, sample papers, mock test | `/exams/netarhat` (new dashboard, not yet live), `/exams/netarhat/guide` |
| CBSE schools in {city} / schools in {district} | 696 district pages and 635 town pages, `/boards/CBSE` |
| Boarding schools in India / government boarding | `/boarding`, `/boarding/*`, `/rankings/government-boarding` |
| Best schools in India (published rankings) | `/rankings` (publisher's own ranks, sourced) |
| Documents for school admission; day vs boarding; CBSE vs ICSE | The six published articles |

### Three-month editorial calendar (one well-sourced article a week; none published automatically)

| Week | Article | Why now |
|---|---|---|
| 1 | Netarhat Vidyalaya entrance exam: pattern, Paper 2 writing, last-week plan | Exam on 6 Dec 2026; links to the new dashboard |
| 2 | Netarhat after the exam: results, the physical and psychological test, what to keep ready | Searches move to the next stage |
| 3 | JNVST Class 6: a 10-week study plan with free mock tests | Ahead of the JNVST exam season |
| 4 | Sainik School Class 9 (AISSEE): pattern, age limits, preparation | Class 9 intent is not covered yet |
| 5 | How to check a school's UDISE+ code and what it tells you | Pairs with the UDISE+ card on profiles |
| 6 | Government boarding schools in India: JNV, Sainik, EMRS, RMS and state schools compared | Uses the site's own boarding data |
| 7 | CBSE vs ICSE vs IB vs Cambridge: which board for which child | Extends the CBSE vs ICSE article |
| 8 | Nursery admission in Delhi: the process and points system (publish only after the official notice) | Seasonal (Dec–Jan) |
| 9 | RTE 25% seats in private schools: who can apply and how | High intent; official sources per state |
| 10 | Kendriya Vidyalaya admission: Class 1 and Balvatika (after the KVS notice) | Seasonal (Mar–Apr) |
| 11 | School fees in India: what is in a fee and how to compare schools | Uses the fee calculator; no invented figures |
| 12 | Top questions parents ask before admission (with answers from official sources) | FAQ-style, links across the site |

Every article needs:
- the named author and real dates;
- official sources with the date they were checked;
- links to the relevant exam, place and school pages;
- a reviewed FAQ section.

## F. Tests and deployment

Tests run on 15 Nov 2026 (results in the report that comes with this change):
- Backend suite: `./mvnw -o test`.
- Frontend: `vitest`, `tsc` and the production build.
- Lighthouse on live pages, before the change.
- Built `dist/index.html`: both inline-script hashes match the CSP.

**Deployment checklist:**
1. Deploy as usual (`powershell -ExecutionPolicy Bypass -File .\deploy\oracle-micro-deploy.ps1`).
2. Check `https://schooldhundo.in/robots.txt`: no `Disallow: /api/`.
3. Run `curl -sI https://schooldhundo.in/api/v1/schools | grep -i x-robots` and expect `noindex`.
4. Check `https://schooldhundo.in/sitemap.xml`: it lists `pages`, `places`, `exams`, `blog` and `schools-1…4`. Each must open.
5. Check fonts: in a browser, open the Network tab; there should be no `fonts.googleapis.com` requests, and the
   headings should be in Plus Jakarta Sans.
6. Check analytics: in GA4 Realtime, accept cookies on the site and your visit appears. In the console, there should
   be no CSP errors.
7. Re-run Lighthouse (mobile) on a school profile. CLS should now be close to 0.
8. Submit the sitemap and run URL Inspection for the six URLs (section C).

## G. Measurement plan (targets to review, not promises)

| Measure | Where | Review at 4 weeks | Review at 12 weeks |
|---|---|---|---|
| Indexed URLs | Search Console → Pages | Home, exams, top places and blog indexed | A rising share of the school sitemaps indexed, read per file |
| Impressions / clicks / CTR | Search Console → Performance | A baseline | Growth on exam and place queries |
| Organic sessions | GA4 → Acquisition, organic search | A baseline | Trend by landing-page group (schools, places, exams, blog) |
| Exam-preparation use | GA4 events on `/exams/*` and practice attempts | A baseline | Mock tests started from search visits |
| School enquiries | Admission enquiries in the admin area (source page) | A baseline | Enquiries from profiles reached by search |
| Core Web Vitals | Search Console → Core Web Vitals (field data), Lighthouse (lab) | Lab: CLS < 0.1 on profiles | Field data "good" for most URLs |

Growth comes from:
- useful pages that are accurate and well linked;
- original articles;
- legitimate mentions: school-community and parent-group resources, education partners, and original data such as
  the school directory itself.

Never buy links or use link schemes.
