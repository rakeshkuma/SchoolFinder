# SchoolDhundo blog: implementation guide and editorial calendar

Live: <https://schooldhundo.in/blog> · Prepared: 11 November 2026

Only the blog module was changed. The homepage, rankings, menus, school directory and profiles, comparison, exam
preparation, login and Google sign-in were not touched (one exception: the site-wide list of app addresses that are not
"page not found" already included `blog`, so nothing changed there either).

---

## 1. Audit (before this work)

| Area | State |
|---|---|
| Live content | **0 articles** |
| Working | `/blog` list with search, category and pagination; `/blog/{slug}` with breadcrumbs, cover, author, reading time, table of contents, share, related; safe text format (no HTML); `BlogPosting` metadata; sitemap; one ad slot (off); admin create/edit/publish/delete with audit log |
| Missing | Five categories only; no tags, featured, sponsored, sources, FAQ, scheduling, workflow, tables, notes; no updated date, references, prev/next, disclaimer, breadcrumb data, Twitter tags, category pages |

## 2. What changed

### Database (migration V39, backward-compatible)

- `blog_post` gains `status` (DRAFT, FACT_CHECK, REVIEW, APPROVED, PUBLISHED), `featured`, `sponsored`, `tags`,
  `last_reviewed_on`. Existing published posts become PUBLISHED; others DRAFT.
- Categories: the five existing codes are kept (they are in links and the API) and four are added:
  BOARDING_SCHOOLS, GOVERNMENT_SCHOOLS, ENTRANCE_EXAMS, EDUCATION_NEWS.
- New tables `blog_post_source` (title, url, checked_on) and `blog_post_faq` (question, answer), deleted with their post.

| Code | Shown as | Page |
|---|---|---|
| ADMISSIONS | School Admissions | `/blog/category/school-admissions` |
| BOARDING_SCHOOLS | Boarding Schools | `/blog/category/boarding-schools` |
| GOVERNMENT_SCHOOLS | Government Schools | `/blog/category/government-schools` |
| ENTRANCE_EXAMS | Entrance Examinations | `/blog/category/entrance-exams` |
| EDUCATION_NEWS | Education News and Updates | `/blog/category/education-news` |
| PARENTING_TIPS | Parenting and Child Development | `/blog/category/parenting` |
| BOARD_COMPARISON | Academic Guidance | `/blog/category/academic-guidance` |
| SCHOOL_REVIEWS | School Reviews and Comparisons | `/blog/category/school-comparisons` |
| FEES_SCHOLARSHIPS | Fees and Scholarships | `/blog/category/fees-and-scholarships` |

### Rules

- **Public** = status PUBLISHED **and** publication time reached. A later time schedules the post.
- Publishing through the workflow needs **at least one source**.
- A **live article cannot be deleted** in one step: unpublish it first.
- Addresses `topics`, `categories` and `category` are reserved for the blog itself.

### APIs

| Method | Path | Change |
|---|---|---|
| GET | `/api/v1/blog/posts?q=&category=&tag=&featured=&page=&size=` | `tag` and `featured` added; search also matches topics |
| GET | `/api/v1/blog/posts/{slug}` | Adds `sources`, `faqs`, `previous`, `next`; cards add `tags`, `featured`, `sponsored`, `lastReviewedOn` |
| GET | `/api/v1/blog/posts/topics` | New: topics of published articles, most used first |
| GET | `/api/v1/blog/posts/categories` | New: published articles per category |
| POST/PUT | `/api/v1/admin/blog/posts` | Accept `status`, `publishAt`, `featured`, `sponsored`, `tags`, `lastReviewedOn`, `sources`, `faqs` (old `published` still works) |

### Pages

| Address | What it shows |
|---|---|
| `/blog` | Hero "Education Insights That Help You Make Better Decisions" with search; topics; featured article; latest articles; categories that have articles. Search, topic and old `?category=` links show results. With no articles: an honest "being fact-checked" message with useful links |
| `/blog/category/{slug}` | A category's articles; a category with no published article is "page not found" (no empty pages) |
| `/blog/{slug}` | Breadcrumbs (Home › Blog › Category › Article), category, title, introduction, author, published, updated, "facts checked" date, reading time, cover, time-sensitive reminder, table of contents, article (now with tables and notes), official references with checked dates, FAQ, topics, share (WhatsApp, Facebook, X, LinkedIn), author box with links to the editorial and corrections policies, ad slot (off), previous/next, related |
| Admin › Blog | Workflow step, publish time (schedule), featured, sponsored, topics, facts-checked date, sources editor, FAQ editor, live preview; list shows step, Scheduled, Featured, Sponsored and source count |

### SEO

- `/blog/{slug}`: title, description, canonical, `og:type article` with published/modified time and section, Twitter/X
  card, and structured data: `BlogPosting` (headline, dates, section, keywords, author with profile link, publisher,
  image) plus `BreadcrumbList`.
- `/blog/category/{slug}`: own title and description; noindex until it has an article.
- Sitemap: published articles (with last-modified) and category pages that have articles. Drafts, reviews, approved and
  scheduled posts are never in the sitemap and return 404 to visitors.
- Pages are given their head on the server (nginx SSI), so Google sees titles and data without running JavaScript.

### Files

- Backend: `entity/BlogPost.java`, `repository/BlogPostRepository.java`, `service/BlogService.java`,
  `dto/common/BlogDtos.java`, `controller/BlogController.java`, `service/SeoHeadService.java` (blog parts only),
  `controller/SitemapController.java` (blog lines only), `db/migration/V39__blog_editorial.sql`, `BlogIT.java`.
- Frontend: `pages/BlogPages.tsx`, `pages/admin/AdminBlogPage.tsx`, `services/blogApi.ts`, `utils/blogBody.ts` (+test),
  `App.tsx` (one route: `/blog/category/:slug`).
- Content: `content/blog/*.md` (six drafts) and `tools/blog/load-drafts.js`.

## 3. Admin instructions

1. **Admin › Blog › New post.** The byline defaults to *Rakesh Kumar, Editor* with the editor's real background.
2. Write in the text box; the preview on the right shows exactly what readers will see. Formatting:
   `## Heading`, `### Subheading`, `- list`, `1. numbered`, `**bold**`, `[text](https://…)`, tables
   (`| A | B |` rows, first row is the header) and notes (`> text`, a highlighted box for warnings and dates).
3. Add **sources**, official notices first, each with the day you checked it, and set **Facts checked on**.
4. Move the article through **Draft → Fact check → Editorial review → Approved → Published**. Choose a later
   **Publish at** time to schedule it.
5. **Featured** puts it at the top of the blog home. **Sponsored** labels it "Sponsored" everywhere (paid content only).
6. To remove a live article, set it back to Draft first, then delete.

### Editorial standard (every article)

- Solves a real parent or student problem, in original words; no copied or lightly rewritten text.
- Every date, fee, age limit or rule links to its **official** source with the day it was checked, and names the
  academic session.
- Facts and SchoolDhundo's advice are kept visibly separate ("This is SchoolDhundo's guidance").
- Rankings: name the publisher, year and category, and say that methods differ.
- Child-related topics: calm, evidence-based, age-appropriate language.
- News: publish only after reading the original announcement, and give its date.
- No invented reviews, statistics or authors.

## 4. The first six articles (drafts for your approval)

Saved as **Editorial review**; none is public until you approve and publish it in the admin.

| Article | Category | Main sources |
|---|---|---|
| Complete Guide to Jawahar Navodaya Vidyalaya Admission (JNVST Class 6) | Government Schools | JNVST-2027 prospectus, NVS portal |
| How to Prepare for the Sainik School Entrance Exam (AISSEE) | Entrance Examinations | AISSEE-2026 NTA bulletin, NTA, Sainik Schools Society |
| CBSE vs ICSE: Which Board Should Parents Choose? | Academic Guidance | cbse.gov.in, cisce.org, NCERT, NEP 2020 |
| Documents Required for School Admission in India: A Checklist | School Admissions | RTE Act 2009, NEP 2020 |
| How to Choose the Best School for Your Child in India | School Reviews and Comparisons | RTE Act, NEP 2020, CBSE SARAS |
| Day School vs Boarding School: What Should Parents Choose? | Boarding Schools | NVS, Sainik Schools Society, EMRS |

**Before approving each one:** read it, open every source link, and check the dates still hold (the AISSEE article uses
the 2026 bulletin; update it when NTA publishes AISSEE-2027). The articles have no cover images: add only images you
have the right to use.

Load them into a server (they are skipped if already there):

```bash
ADMIN_USERNAME=admin ADMIN_PASSWORD=… node tools/blog/load-drafts.js https://schooldhundo.in/api/v1
```

## 5. Editorial calendar: 30 articles

Two articles a week, each published only after fact-checking and your approval. "Sources" are where facts must come
from; the outline is the minimum each article covers. Done = drafted in this round.

| # | Week | Title | Category | Sources to check | Outline |
|---|---|---|---|---|---|
| 1 | Done | How to Choose the Best School for Your Child in India | Comparisons | RTE Act, SARAS | Priorities; shortlist; compare; visit questions; rankings and reviews; checklist |
| 2 | Done | CBSE vs ICSE: Which Board Should Parents Choose? | Academic Guidance | cbse.gov.in, cisce.org | Who runs each; teaching; exams; what matters more; how to decide |
| 3 | Done | Complete Guide to Jawahar Navodaya Vidyalaya Admission | Government Schools | JNVST prospectus | Eligibility; seats; pattern; fees; apply; prepare |
| 4 | 1 | JNVST Class 6 Preparation Strategy | Entrance Exams | JNVST prospectus, 2026 paper | Section-wise plan; 8-week schedule; mock tests; qualifying marks |
| 5 | Done | How to Prepare for Sainik School Entrance Examination | Entrance Exams | AISSEE bulletin | Pattern 6 and 9; age; qualifying; plan |
| 6 | 1 | Complete Guide to Netarhat Vidyalaya Admission | Government Schools | Netarhat Awasiya Vidyalaya official notice | Eligibility; test stages; seats; dates |
| 7 | 2 | Government vs Private Schools in India | Comparisons | UDISE+ (facts only), RTE Act | Fees; teachers; facilities; RTE seats; how to judge |
| 8 | Done | Day School vs Boarding School | Boarding Schools | NVS, Sainik, EMRS | Trade-offs; readiness; government options; hostel checklist |
| 9 | 2 | How to Choose the Right Boarding School | Boarding Schools | School prospectuses | Shortlist; visits; safety; costs; contracts |
| 10 | 3 | Boys vs Girls vs Co-ed Boarding Schools | Boarding Schools | School policies | Research views (cited); practical differences; questions |
| 11 | Done | Documents Required for School Admission in India | Admissions | RTE Act, NEP | Checklists by class; RTE seats; tips |
| 12 | 3 | How to Compare School Fees Before Admission | Fees and Scholarships | State fee-regulation acts, school fee schedules | Fee heads; one-time vs annual; increases; refunds |
| 13 | 4 | What Parents Should Check During a School Visit | Comparisons | — (guidance) | Classrooms; library; labs; safety; questions |
| 14 | 4 | Understanding CBSE School Affiliation | Academic Guidance | CBSE affiliation bye-laws, SARAS | Levels; how to verify; provisional vs regular |
| 15 | 5 | What Is an IB School? | Academic Guidance | ibo.org | PYP/MYP/DP; assessment; cost; recognition in India |
| 16 | 5 | IB vs Cambridge Curriculum | Academic Guidance | ibo.org, cambridgeinternational.org | Structure; exams; who each suits |
| 17 | 6 | How to Prepare Children for School Entrance Exams | Entrance Exams | Exam notices | Age-appropriate practice; stress; mock tests |
| 18 | 6 | Best Study Habits for Class 5 and Class 6 Students | Parenting | NCERT guidance | Routine; reading; revision; breaks |
| 19 | 7 | How Parents Can Support Children's Learning | Parenting | NCERT, NEP | Home environment; reading together; homework role |
| 20 | 7 | Understanding School Hostel Facilities | Boarding Schools | School prospectuses | Supervision; food; health; rules; fees |
| 21 | 8 | What Is an Eklavya Model Residential School? | Government Schools | emrs.tribal.gov.in, NESTS | Who it is for; admission by state; facilities |
| 22 | 8 | Kendriya Vidyalaya Admission Guide | Government Schools | KVS admission guidelines (current year) | Priority categories; age; online process; dates |
| 23 | 9 | How to Select a School Based on Location and Distance | Admissions | State distance criteria where notified | Travel time; transport; neighbourhood criteria |
| 24 | 9 | School Safety Checklist for Parents | Comparisons | NCPCR / board safety guidelines | Campus; transport; staff checks; policies |
| 25 | 10 | How to Evaluate School Infrastructure | Comparisons | Board affiliation norms | Classrooms; labs; library; sports; accessibility |
| 26 | 10 | Affordable Boarding School Options in India | Boarding Schools | NVS, Sainik, state schemes, published fees | Government options; scholarships; what "affordable" covers |
| 27 | 11 | Understanding School Rankings and Their Methodologies | Comparisons | Publishers' methodology pages | Who ranks; what is measured; limits; how SchoolDhundo shows them |
| 28 | 11 | How to Prepare for School Interviews | Admissions | RTE Act (no screening at entry level) | Where interviews are allowed; preparing calmly |
| 29 | 12 | How to Build a Daily Study Routine | Parenting | — (guidance) | Age-wise routines; sleep; screen time |
| 30 | 12 | Important Questions Parents Should Ask Before School Admission | Admissions | — (guidance) | Teaching; fees; safety; communication; exit |

Education News articles are written as announcements happen (CBSE and CISCE circulars, NTA notices), only from the
original notice, with its date.

## 6. Monetization

- **Ads:** the blog uses the site's `AdSlot` (off until AdSense approval and consent): one after the article, labelled
  "Advertisement". More placements (after the introduction, between sections, desktop sidebar) can be added the same
  way after approval; never inside tables, FAQs or references, and never next to buttons.
- **Sponsored articles:** the `sponsored` flag shows a "Sponsored" label on cards, the featured slot and the article.
  Sponsored articles follow the same fact-checking rules and never recommend a school as editorial advice.

## 7. Deploying

Deploy with `.\deploy\oracle-micro-deploy.ps1` after approval; V39 runs on start. Then load the drafts (section 4) and
approve them in the admin. Rolling back the code needs no database change (new columns have defaults).

## 8. Testing

| Check | Result |
|---|---|
| Backend tests (`mvnw test`) | 293 passed, 0 failed. `BlogIT` covers drafts hidden, workflow, source required to publish, scheduling, topics, categories, FAQ, sources, article SEO (og:type article, Twitter card, BreadcrumbList), empty category noindex, reserved addresses, delete safeguard, sitemap |
| Frontend type check, unit tests, build | 0 errors · 145 passed (new: tables and notes in articles) · build passed |
| Draft loader | Six drafts loaded locally as Editorial review; a second run skipped all six |
| Browser, 1280 px and 390 px (articles published locally for the check, then returned to review) | `/blog` (featured, latest, categories, 12 topics), topic, search and old `?category=` links, category page, empty category → not found, two articles (tables, note, sources, FAQ, contents, previous/next, related), missing article message: no overflow, no script errors |
| Other modules | Shared breadcrumb unchanged (blog uses its own); no route outside `/blog` changed |
