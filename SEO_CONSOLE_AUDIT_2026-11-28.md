# Search Console, Bing and GA4: what was wrong and what was fixed (28 Nov 2026)

For the site owner. Read in Chrome (your sign-ins) with Ubersuggest and Windsor.ai alongside. Labels: VERIFIED (checked
today against the source), IMPLEMENTED, TESTED, DEPLOYED, RECOMMENDED. Nothing here is estimated.

## 1. Summary

1. **Google has 705 pages indexed and 13,520 not indexed, for 9 reasons.** Most of the 13,520 are by design (noindex
   pages, form pages blocked in robots.txt, copies pointing to their canonical). Two problems are real.
2. **Problem 1: Google spends its crawling on the wrong things.** In the last 90 days, 74% of Googlebot's 55,500 requests
   were page resources and 66% were JSON: mostly the six API calls every school profile makes while it renders. The form
   and tab copies of each profile (claim, suggest, contact, ?tab=) took thousands more. Meanwhile **2,011 real pages
   (profiles, district and city pages, practice sets) have been discovered but never crawled.** FIXED and DEPLOYED on
   28 Nov (§4).
3. **Problem 2: 31 of the 41 school profiles Google showed 20 or more times in 28 days are noindex** (about 1,040
   impressions). This is the 16 Nov rule for bare listings, kept on 24 Nov with the plan to enrich those schools. Still
   open (§5).
4. **Bing:** 7 pages indexed, no errors, crawl rate at default; impressions are rising since IndexNow (71 in 18–26 Nov,
   against 3 in the month before). Its one recommendation is backlinks.
5. **GA4:** no warnings. Your own visits still inflate Google traffic to the homepage until the internal-traffic filter is
   switched from Testing to Active.

## 2. Search Console: why pages are not indexed (VERIFIED, 28 Nov)

| Reason | Pages | What Google's examples are | Verdict |
|---|---:|---|---|
| Excluded by 'noindex' tag | 5,597 | Of 1,000 examples: 787 old profile-section addresses (/schools/x?tab=…), 193 bare school listings, 19 thin city pages, 1 Olympiad class without questions | By design. The ?tab= addresses are no longer linked but still re-crawled: now blocked (§4.2) |
| Blocked by robots.txt | 3,108 | 998 of 1,000: the update form, /suggest?school=… (two links on every profile) | By design. Links now nofollow (§4.3) |
| Discovered – currently not indexed | 2,011 | Never crawled. Of 1,000 examples: 413 school profiles, 289 district pages, 206 city pages, 48 practice sets, exam, ranking and job pages, blog categories | Crawling spent elsewhere (§3), plus low authority |
| Alternate page with proper canonical tag | 1,991 | Of 1,000 examples: 691 /claim-school?school=…, 239 /contact?topic=…, 55 page-2+ of place lists | Correct; the claim copies are now blocked (§4.2) |
| Duplicate, Google chose different canonical than user | 739 | 622 profiles, 92 state, district and city pages, 25 exam pages (23 practice sets); all crawled 11–15 Nov | Stale. Today each has its own canonical; Google's own inspection of jnvst-mat-1 shows "same as user-declared". Validation was already running |
| Page with redirect | 37 | Redirecting addresses | By design |
| Crawled – currently not indexed | 26 | Address variants with correct canonicals, two pages now noindex, and /rankings/states, /exams/jnv-class-9, two job pages, three place pages | No technical fault; authority |
| Duplicate without user-selected canonical | 10 | 4 claim-form copies, 1 ?tab=, blog ?tag, a rankings ?state, 3 profiles crawled 17 Nov | Covered by the fixes |
| Not found (404) | 1 | /exams/practice/class10-maths-1, retired on 17 Nov (answers "410 Gone") | By design |
| Indexed, though blocked by robots.txt | 6 | /suggest?… | Links now nofollow |

## 3. Search Console: crawl stats (VERIFIED, last 90 days, updated 26 Nov)

| Measure | Value |
|---|---|
| Crawl requests | 55,500 |
| Average response time | 349 ms; "Host had no problems in the last 90 days" |
| Responses | 200 OK 100%; 404 under 1%; server errors under 1% |
| Purpose | Refresh 80%, discovery 20% |
| File type | **JSON 66%**, HTML 22%, JavaScript 10% |
| Googlebot type | **Page resource load 74%**, smartphone 18% |

The JSON examples Google lists (985) are almost all one school profile's calls: admissions 144, fees 141, images 138,
ranking 137, questions 136, the school itself 127. On the live site a profile's first view makes 9 API requests, 6 of
them for the profile (measured in Chrome today). Google's crawl-budget guidance counts every such request.

## 4. Fixes (IMPLEMENTED, TESTED, DEPLOYED 28 Nov 2026 as 695d94a)

### 4.1 One request per profile instead of six

`GET /api/v1/schools/slug/{slug}/page` returns the school with its photos, fees, admissions, questions and ranking; each
part is exactly what its own endpoint returns (an integration test compares them). The profile asks for it once; the
sections that ask for those parts get them from a one-minute cache in the browser. Visitors get a faster profile too.
Measured on the live site in Chrome: a profile's first view made 9 API requests before the deploy and makes 4 after it
(the three site-wide ones and the new page call); the profile shows as before.

### 4.2 robots.txt

```
Disallow: /claim-school?
Disallow: /schools/*?tab=
```

The claim form's per-school copies and the old profile-section addresses are not crawled any more. The plain /claim-school
page, every profile and the contact page stay open (tested). The contact form's few addresses are left open on purpose:
they are linked from every page, and blocking an address that many pages link to can get it indexed without content, as
happened to six /suggest addresses.

### 4.3 nofollow on the profile's form links

The two claim links and two suggest links on each profile carry rel="nofollow".

### 4.4 Done in Search Console today

- Indexing requested: /exams/practice/jnvst-mat-1, /exams/practice/jnvst-mock-2, /exams/practice/aissee-class6-mock-1
  (all three listed as "Google chose different canonical" from a 13 Nov crawl), after the five pages and the JNV article
  earlier today.
- robots.txt recrawl requested after the deploy (Settings → robots.txt; Google's last fetch was 15 Nov).
- Not repeated: the "Crawled – currently not indexed" validation (it failed because Google chose not to index those
  pages; nothing technical has changed for them).

**How to tell it worked** (not claimed yet): in Settings → Crawl stats, the JSON and page-resource shares fall and HTML
rises; in Pages, "Discovered – currently not indexed" shrinks and indexed pages grow. Google updates both over weeks.

## 5. The noindex profiles Google was showing (RECOMMENDED: your decision)

On 16 Nov bare CBSE listings were set to noindex. On 24 Nov the review found they held 37% of impressions and decided:
keep the rule (it protects the whole site's quality) and enrich those schools first. Today 31 of the 41 profiles with 20+
impressions in 28 days are noindex, the top ten being Velammal Bodhi Campus (76), Hidaya Public School (54), Swami
Vivekananda Vidya Peedam (51), K K Cambridge International School (51), Moga Devi Minda Memorial School (48), Baba Banda
Bahadur Public School (47), Edify School Amravati (46), Little Flower EMS Chelavoor (46), Kamalavati HSS (38) and Sambhota
Tibetan School Mundgod (36). They will drop out of Google as it recrawls them.

**DONE 28 Nov (DEPLOYED as 8683da9):** descriptions and facilities for seven of the ten, from each school's own website
(migration V52; `tools/seo/data/profile-description-drafts-2026-11-28.md`). Live: all seven indexable and in the sitemap;
indexing requested for K K Cambridge, Swami Vivekananda Vidya Peedam and Moga Devi Minda. Not possible for Velammal,
Hidaya and Baba Banda Bahadur (no working official website).

A profile becomes indexable again under the same rule with any of: a description of 300+ characters, fees, admission
dates, facilities, a cleared photo, a ranking, a list entry, boarding details or an approved review. The five outreach
drafts in Gmail ask four of these schools for exactly that. I can also draft descriptions and facility lists for the top
ten from each school's own website, with sources, for you to approve in the admin.

## 6. Bing Webmaster Tools (VERIFIED)

| Check | Result |
|---|---|
| Site Explorer | Indexed 7, errors 0, warnings 0, excluded 1 |
| Search performance, 18–26 Nov | 71 impressions, 1 click (3 impressions in the month before IndexNow) |
| Recommendations | One: "Your site does not have enough inbound links from high quality domains" |
| Crawl control | Default rate, not throttled |
| Sitemap and IndexNow | Success, about 2,700 addresses (checked this morning) |

Nothing on Bing's side is broken; it indexes a new, unlinked site slowly. The fixes in §4 help Bingbot too.

## 7. GA4 (VERIFIED, Windsor and the GA4 home page)

- No warnings on the property. Last 7 days: 72 active users (+177%), 65 new (+206%), page views down 39%.
- Google search into the homepage: 54 sessions from 5 users in 30 days, which is mostly you. **The internal-traffic filter
  was switched from Testing to Active on 28 Nov** (rule: the owner's current IPv4 address and home IPv6 network, kept in GA4 only). The test dimension
  showed no tagged session in Windsor's cached data for 26–28 Nov, so the match could not be confirmed first; the rule
  covers only your own connection, so it cannot exclude other visitors.
- About 18 sessions have no landing page ("(not set)" or empty): normal for sessions without a page view under consent mode.
- GA4 suggests counting views of /contact as "generate_lead". Not done: viewing the contact page is not a lead; the site
  already sends generate_lead when an enquiry is submitted.

## 8. What needs you

Done on 28 Nov at the owner's instruction ("you take decision and do it now"): the seven descriptions (§5), the five
outreach e-mails (sent), the GA4 internal-traffic filter (Active). Left: the four superseded Gmail drafts of the school
e-mails (delete them; the sent versions are in Sent), and replies from the schools.

## 9. Checks

| Check | Result |
|---|---|
| Backend, full suite (`mvnw test`) on the final code | 496 tests, 0 failures, 0 errors |
| New backend checks | `SchoolApiIT`: the page endpoint's six parts equal the six endpoints' answers, unknown school 404; `RobotsTxtTest`: the two new rules, and the claim page, profiles and contact page stay open |
| Frontend type check (`tsc -b`) | Clean |
| Frontend tests (`vitest`) | 255 tests in 59 files, 0 failures (new `schoolPage.test.ts`: one request answers all five parts; another school or a part older than a minute is fetched again) |
| Production build | Passes |
| Live baseline before deploy (Chrome) | A profile's first view: 9 API requests, 6 of them for the profile |
| Live after deploy (curl and Chrome) | robots.txt has both rules; /api/v1/schools/slug/…/page answers 200 with its six parts; a profile's first view makes 4 API requests and shows as before; the printable paper's head has its own title and the set's canonical, no noindex |

## 10. Files

| Area | Files |
|---|---|
| Backend | `controller/SchoolController.java` (profile page endpoint), `controller/SitemapController.java` (robots.txt) |
| Backend tests | `controller/SchoolApiIT.java` (the page equals the six calls), `controller/RobotsTxtTest.java` |
| Frontend | `services/publicApi.ts` (page call and cache), `types/api.ts` (`SchoolPage`), `pages/SchoolDetailPage.tsx` (one request; nofollow form links) |
| Frontend tests | `services/schoolPage.test.ts` |
| Report | this file |
