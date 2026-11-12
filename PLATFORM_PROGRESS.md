# SchoolDhundo platform: progress record

The "world-class platform" brief (13 November 2026) and the audit before it (12 November 2026). Each item is marked
**Done**, **Done earlier** (built in an earlier round and checked again), **Prepared** (built but switched off, or
waiting for an outside step) or **Planned** (not started). Continue from the first item that is not done.

## 1. Reliability and design

| Item | Status |
| --- | --- |
| Homepage sections never show error blocks: nginx keeps the last good copy of public API answers (`proxy_cache sd_api`, stale on error); the browser remembers the homepage lists (`useApi(..., cacheKey)`); fallback quick links | Done (live 0ac64dd) |
| Five-pillar navigation (Find Schools, Boarding Schools, Compare, Admissions & Fees, Exam Prep), no duplicate destinations | Done (live 0ac64dd) |
| Unfinished items hidden ("Not available yet", empty ranking card) | Done (live 0ac64dd) |
| Personal email and admin link removed from public pages; contact form instead (`CONTACT_EMAIL` in `frontend/src/content/site.ts`) | Done (live 0ac64dd) |
| Crest-style covers for schools without photos; trust badges ("Official notice · updated …", "Verified …"); shortlist counter; hero polish | Done (live 0ac64dd) |
| Homepage "Latest guides" section (three newest articles) | Done |

## 2. School discovery and enquiries

| Item | Status |
| --- | --- |
| Directory filters: four in the bar (State/City, Board, Class, Annual fee), the rest under More filters, Clear all | Done earlier |
| Duplicate filters removed: separate PIN box (the search box finds PINs) and Stage (Class covers it); both still appear if an old link uses them | Done |
| **Admission enquiry system**: "Enquire about admission" on every school profile (sticky bar and Admissions tab); name, mobile, optional email, class, year, question; explicit consent to share with that one school; honeypot; 10 per hour per address; saved first, inbox email as a bonus | Done |
| Admin › Admission enquiries: New → Forwarded (with a note) → Closed; closing deletes the parent's contact details | Done |
| Nothing is sent to schools automatically: staff forward each enquiry by hand | By design |
| Claim your school (`/claim-school`, link on every profile) and Advertise with us (`/advertise`), both through the contact form (topics CLAIM and ADVERTISING) | Done |
| Similar schools ("Schools in the same place"), comparison, saved schools | Done earlier |
| School owner accounts that edit their own profile directly | Planned (today claims are handled by editors) |

## 3. Rankings, exams and blog

| Item | Status |
| --- | --- |
| Rankings with methodology, sources, dates and limitations; sponsored placements labelled; positions never sold | Done earlier |
| JNVST and AISSEE Class 6 dashboards (mock tests, practice, progress, section marks), Netarhat guide, daily quiz, leaderboard, bookmarks | Done earlier |
| Blog: categories, contents list, author box, updated date, related articles, breadcrumbs, share links, Article schema | Done earlier |

## 4. SEO

| Item | Status |
| --- | --- |
| Server-rendered page content (headings, facts, links) for home, school, state, district and city pages, via SSI (`SeoBodyService`) | Done (live 0ac64dd) |
| School + BreadcrumbList + FAQPage (same questions as shown on the page) | Done (live 0ac64dd) |
| WebSite (with search) + Organization on the homepage | Done |
| Sitemap, robots.txt, canonical URLs, noindex for private/thin pages, Article schema | Done earlier |
| Titles, descriptions and sitemap entries for /advertise and /claim-school | Done |
| "Best schools in <place>" pages only where enough schools exist (`MIN_SCHOOLS_TO_INDEX`) | Done earlier |

## 5. Monetization

| Item | Status |
| --- | --- |
| Admission enquiries (the main lead product) | Done |
| Advertise and Claim pages stating what is paid, how it is labelled and what is never for sale | Done |
| Ad slots on blog posts and school profiles (`AdSlot`, `AD_SLOTS`), shown only with consent | Prepared: turn on in AdSense, add the CSP entries in `GOOGLE_SEO_ADSENSE_DEPLOYMENT_GUIDE.md` |
| Featured school listing as a paid product (today "Featured" means "has a licensed photo") | Planned: needs a `featured_until` field per school, a "Featured" label on cards, and an admin switch |
| Premium mock tests / subscriptions | Planned: needs the owner's choice of payment provider; no payments are taken today |
| Affiliate books on exam pages, disclosed | Planned |

## 6. Analytics (GTM GTM-PZ7WSXBS → GA4 G-ESGRNYGQHQ, Consent Mode)

Events: `school_search`, `school_profile_view`, `school_comparison`, `generate_lead` (admission enquiry sent),
`school_claim` (claim started), `exam_page_view`, `quiz_start`, `quiz_complete`, `google_sign_in`,
`user_registration`. Personal details are stripped by `cleanParams`. In GA4, mark `generate_lead` as a key event.

## 7. Outside steps for the owner

1. Deploy: `powershell -ExecutionPolicy Bypass -File .\deploy\oracle-micro-deploy.ps1` (migration V41 runs on start).
2. Create a domain address (e.g. contact@schooldhundo.in via Cloudflare Email Routing or Zoho Mail) and set
   `CONTACT_EMAIL` in `frontend/src/content/site.ts`.
3. Make sure the server can send email (SMTP settings in `/etc/schooldhundo/backend.env`) so new enquiries reach the
   inbox at once; without it they still appear under Admin › Admission enquiries.
4. In GA4, mark `generate_lead` as a key event.
5. AdSense: apply, then switch on the prepared slots.
