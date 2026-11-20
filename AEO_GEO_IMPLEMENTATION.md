# SchoolDhundo: answer-engine (AEO) and generative-engine (GEO) visibility, 17 Nov 2026

**Status:** built and tested in the code. **Not committed and not deployed**, together with the four SEO fixes in
[SEO_GROWTH_STRATEGY_AUDIT.md §J](SEO_GROWTH_STRATEGY_AUDIT.md#j-fixes-built-after-the-audit-17-nov-2026-not-deployed).
No URL, database table, school record, navigation item or page design was changed. No fee, review, ranking or claim was
added.

**Why the server's HTML matters most here:** most AI search and answer crawlers (OAI-SearchBot, ChatGPT-User,
PerplexityBot and others) read the HTML the server sends and do not run JavaScript. Googlebot and Bingbot run it later,
and less often for a new site. So everything below goes into the server-rendered head and content (`SeoHeadService`,
`SeoBodyService`), which the React app then replaces for visitors, using the same words the app shows.

## 1. Audit: what was already in place (verified on the live site)

| Check | Result |
|---|---|
| **Crawler access** | `/`, a school profile and the JNVST guide were fetched as Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot, GPTBot and ClaudeBot. All returned **200 with identical bytes** (no bot is blocked or served differently), each with its title and structured data. No `X-Robots-Tag` on pages; the CSP does not affect crawlers. |
| **robots.txt** | One group (`User-agent: *`) allowing everything except private areas. Search crawlers and AI-training crawlers are **not separately controllable**. |
| **Sitemaps and canonicals** | Sound (full crawl in the SEO audit: 2,615 URLs, all 200, self-canonical, one H1 each). |
| **Structured data** | Home: WebSite (SearchAction) and Organization, but no `@id` links between them, no alternate names, no editorial policy. Profiles: School, BreadcrumbList, FAQPage, but no identifier or `@id`. Blog: BlogPosting with author "Rakesh Kumar, Editor" as one name. Exam guides: **BreadcrumbList only**. Network pages (e.g. Sainik Schools): **none**. Practice sets: Quiz. |
| **Answer-first content in server HTML** | Exam guides: strong (conducting body, dates, pattern, eligibility, syllabus, FAQ), but **no "last checked" date**. Place pages: a count-based summary first. Blog: excerpt first, plus sources with dates. School profiles: facts and "Quick answers", but the opening sentence was the meta description ("…See admission dates… on SchoolDhundo"), not a factual answer, and there was **no source or freshness information**. `/admissions`: **about 50 words** and no admission cycles, although the database holds hundreds. |
| **Existing Q&A** | Profiles: "Quick answers", built from each record. Exam guides and blog posts: FAQs. Place pages: "Questions about schools in …". These were kept and are now reflected in markup where missing. **No new FAQ blocks were written.** |
| **Entity naming** | The name "SchoolDhundo" is close to other portals' ("SchoolDekho"); a non-Google web search for the site turned up mostly SchoolDekho pages. Nothing on the site told engines that "School Dhundo" means this site. |

## 2. What was implemented

| # | Change | Where it shows | Why it helps answer engines |
|---|---|---|---|
| 1 | **Answer-first school profiles.** Each profile's server HTML now opens with the same factual sentence the app opens with, from the record only (type, gender, boarding, place, network, board, classes, founding year, medium). For example: "Netarhat Awasiya Vidyalaya is a government boys' boarding school in Netarhat, Latehar district, Jharkhand. It is affiliated to the CBSE, with classes from Class VI to Class XII…". The school's own description follows when it has one, then the affiliation number among the facts. | All 33,609 profiles (indexable or not) | A short, quotable, verifiable answer to "what is X school", ahead of the details |
| 2 | **Sources and freshness on profiles.** "School information & sources", as the app's card says it: where the profile comes from and the retrieval date, a link to the source, whether an editor has checked it (with the date), and when the record last changed. Real dates only; a missing date is left out. | All profiles | Engines weigh pages that show where facts come from and how recent they are |
| 3 | **"Last checked" on exam guides.** "Checked against these sources on {date}", as the app shows under the official links. | Every exam guide, including JNVST, AISSEE and Netarhat | Freshness and attribution for dates and eligibility |
| 4 | **Admissions calendar in server HTML.** `/admissions` now opens with the answer, e.g. "N upcoming or open admission cycles are recorded. The soonest last date to apply is {date}, for {class} at {school}". It then lists the first 20 cycles as the app does (school, class, year, status, last date, official notice link). The description starts with the real count. | `/admissions` | "School admission 2027-28" questions get a dated, sourced answer instead of 50 words |
| 5 | **Site entity.** Organization and WebSite are linked by `@id`, with `alternateName` ("School Dhundo", "schooldhundo.in"), `inLanguage` en-IN, `publisher` and `publishingPrinciples` (the editorial policy). Every page's publisher now refers to the same Organization. | Home; every page with a publisher | Engines know which site and organisation a page belongs to; Google uses WebSite `alternateName` for site names |
| 6 | **School entity.** `@id`, `description` (the same sentence as #1) and `identifier` (the board affiliation number shown on the page). The UDISE code is not marked up, because the page does not clearly show it. | Profiles | Disambiguates schools with similar names |
| 7 | **Exam guides as Articles.** `Article` by SchoolDhundo, with `dateModified` = the date the facts were last checked, `about` the exam, and `citation` the official site. `FAQPage` for the questions the guide already shows. No publication date is claimed, because none is recorded. | Exam guides | Attribution, freshness and the guide's Q&A in machine-readable form |
| 8 | **Blog author as a person.** "Rakesh Kumar, Editor" is now `name` "Rakesh Kumar" with `jobTitle` "Editor", linked to the About page (which introduces the site's creator) and to the Organization. | Blog posts | Clear author attribution |
| 9 | **Network pages get breadcrumbs.** Schools › Sainik Schools (and the four other networks). | 5 network pages | They had no structured data at all |
| 10 | **Separate control for AI-training crawlers.** robots.txt is **unchanged by default** (everyone follows the general rules). Setting `APP_AI_TRAINING_CRAWLERS=false` in `/etc/schooldhundo/backend.env` adds `Disallow: /` for GPTBot, ClaudeBot, CCBot, Applebot-Extended, meta-externalagent and Bytespider only. Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, PerplexityBot and Applebot are never named, so they keep the general rules. Google-Extended is deliberately not in the list: it also decides whether Gemini apps may ground answers in these pages. | `/robots.txt` | Training can be refused without losing search or answer-engine visibility. Whether to refuse is the owner's decision. |
| 11 | **Crawler visibility report.** `sudo schooldhundo-crawler-report` on the web server counts requests, page views and errors per search, AI-search and AI-training crawler from nginx's log, and lists the pages each fetched most. | Server tool (installed by the deploy) | The only AI-visibility measure available without outside accounts |

**Deliberately not done**
- **llms.txt:** no search or answer engine has said it uses the file (Google says it does not), so it would be
  maintenance without a validated benefit.
- **New FAQ blocks, AI-targeted text or extra schema:** no visible content was added just for markup, and no markup
  says anything the page does not show.
- **ItemList on rankings:** it could be read as SchoolDhundo's own ranking. The ranks stay in the HTML exactly as
  publishers printed them.
- **IndexNow:** it would speed up Bing, and with it Copilot and ChatGPT search, but it sends URLs to an outside service.
  It is ready to add as a deploy step once you approve it (§6).

## 3. Files changed (this round)

| File | Change |
|---|---|
| `backend/.../util/SchoolAboutText.java` (new) | The profile's factual introduction, word for word as `frontend/src/utils/schoolProfile.ts` (`aboutSummary`, `locationSummary`) writes it; network names; own-description rule |
| `backend/.../service/SeoHeadService.java` | Organization and WebSite entity, `publisher()`, `author()`, School `@id`/`description`/`identifier`, exam guide Article and FAQPage (`examArticle`), network breadcrumbs, `/admissions` count in the description |
| `backend/.../service/SeoBodyService.java` | Profile: answer-first introduction, own description, affiliation number, "School information & sources". Exam guides: "Checked against these sources on …". `/admissions`: calendar body (`admissionsHome`) |
| `backend/.../controller/SitemapController.java` | `robotsTxt(base, allowTraining)` and the training-crawler list |
| `backend/.../config/AppProperties.java` | `app.ai-training-crawlers` (default `true`) |
| `deploy/crawler-report.sh` (new), `deploy/oracle-micro-web.sh`, `deploy/oracle-micro-deploy.ps1` | The crawler report, uploaded and installed by the deploy |
| Tests | New `RobotsTxtTest`. Additions to `SeoHeadTitleTest` (author), `SeoBodyIT` (profile answer-first, sources and School entity; home entity; network breadcrumb), `SeoHeadIT` (exam Article, FAQPage, `dateModified`, "checked" line) and `AdmissionApiIT` (admissions calendar body and description) |

The frontend was not changed in this round: the app already shows every sentence the server now sends.

## 4. Schema validation

Sample page heads were generated from the code (home, school profile, exam guide, Olympiad class page, network page,
practice set) and checked with a local validator against the **official schema.org vocabulary (current release,
downloaded 17 Nov 2026)**. For every node it checks that the type exists and that each property exists and is allowed on
that type or one of its parent types. It also checks Google's required fields for the features used (BreadcrumbList and
ListItem, FAQPage, Question and Answer, Article, Organization, WebSite, School, Quiz).

| Page | Types | Result |
|---|---|---|
| Home | WebSite (SearchAction), Organization (ContactPoint) | OK |
| School profile | School (PostalAddress, PropertyValue), BreadcrumbList, FAQPage | OK |
| Exam guide | Article, BreadcrumbList, FAQPage | OK |
| Olympiad class page | BreadcrumbList | OK |
| Network page | BreadcrumbList | OK |
| Practice set | Quiz | OK |

**48 typed nodes, 0 problems.** To show the validator really catches mistakes, a deliberately broken School node was fed
to it, and it reported all three planted problems. Google's own Rich Results Test can only fetch deployed pages, so
after deploying, run `https://search.google.com/test/rich-results` on `/`, one profile and `/exams/jnvst/guide`.

## 5. Tests

- **Backend:** **383 of 383 pass** (full suite, 17 Nov 2026; 379 before this round, plus 4 new tests). This includes the
  existing search, filter, ranking, admissions, comparison, sign-in, exam, practice and progress suites.
- **Frontend:** unchanged this round; 211 of 211 pass, `tsc` is clean and the production build succeeds (from the
  previous round, on the same code).
- **Scripts:** `bash -n` is clean for all deploy scripts, and the crawler report was run against a sample log.
- **Not run:** Lighthouse (mobile and desktop) and accessibility audits of the changed pages, because they need the
  deployed site. Only server HTML changed this round, and the app replaces it on load, so visitors' layout and
  performance are unchanged by design. Re-measure after deploying.

## 6. After deploying, and next priorities

**Checks**
1. Run the Rich Results Test and the schema.org validator (`https://validator.schema.org`) on `/`, a profile,
   `/exams/jnvst/guide` and a blog post.
2. `curl -s -A "OAI-SearchBot/1.0" https://schooldhundo.in/schools/the-doon-school` shows the factual first sentence
   and "School information & sources".
3. `curl -s https://schooldhundo.in/robots.txt` is unchanged (unless you set `APP_AI_TRAINING_CRAWLERS=false`).
4. A week later, run `sudo schooldhundo-crawler-report` to see which AI crawlers came and what they read.

**Owner steps: analytics, which need your accounts**
- **Bing Webmaster Tools:** sign in, import the site from Search Console (one click), submit `sitemap.xml`. Bing's
  index feeds Copilot, and ChatGPT search uses Bing among its sources. Its report also shows Bing's AI (Copilot)
  traffic once there is some.
- **Search Console:** AI Overviews and AI Mode clicks are counted inside the normal Performance report (Web); keep the
  monthly export from the SEO audit's dashboard.
- **GA4:** add a custom channel group "AI assistants" whose session source matches
  `chatgpt\.com|chat\.openai\.com|perplexity\.ai|copilot\.microsoft\.com|gemini\.google\.com|claude\.ai`. It costs
  nothing and needs no code: AI referrals are then counted separately from Google and Bing.

**Next priorities**
1. **IndexNow (with your approval):** a key file, plus one submission of changed URLs after each deploy, so Bing and
   Copilot pick up changes within days.
2. **Server HTML for the remaining thin content pages** (SEO audit B5): `/admissions/guide`, `/exams/calendar`,
   `/exams/syllabus`, `/exams/resources`, `/rankings/methodology`, `/about`. These are what answer engines would cite
   for "how does school admission work in India".
3. **An answer-first line on "best schools in" pages:** the publisher's top ranks for the place, attributed and as
   printed.
4. **Sourced facts for the premier schools** (SEO audit B7): their profiles are what people ask AI about by name.
5. **Real social profiles,** then `sameAs` on the Organization.

No placement in AI answers or Google rankings is promised by any of this. These changes make the pages easier to read,
attribute and quote. Whether an engine cites them depends on the engine.
