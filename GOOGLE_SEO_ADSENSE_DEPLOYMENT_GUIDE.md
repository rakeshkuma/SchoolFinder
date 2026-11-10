# SchoolDhundo: Google sign-in, Search Console, SEO, Analytics and AdSense guide

Live site: <https://schooldhundo.in> · Prepared: 10 November 2026

This guide records what the code does, what was already in place before this round of work, and every step that has
to be done by hand in Google Cloud Console, Search Console, Google Analytics and AdSense. Nothing here is complete on
Google's side until you have done the manual steps and seen the confirmation yourself.

Secrets (Google client secret, database password, JWT secret) never go into this file, the code or GitHub. They live in
the gitignored `.env` on your PC and in `/etc/schooldhundo/backend.env` on the web server.

---

## 1. What was already in place, and what this round added

| Area | Already in place | Added now |
|---|---|---|
| Google sign-in | OpenID Connect code flow through Spring Security (state, nonce, signed ID-token checks done by Spring); only Google-verified emails accepted; an existing email/password account is linked (with a notice email), not duplicated; admins are a separate table, so Google sign-in can never create an admin; client ID/secret from environment variables; Google access tokens never stored | Google profile photo (V37 migration, `picture_url`; only `https://*.googleusercontent.com` accepted) shown in the account menu and profile; one-time welcome message for new Google users |
| Accounts | Register, sign in, forgot/reset password, change password, profile, sign out, delete account (password or recent Google sign-in required) | `/data-deletion` page describing exactly what deletion removes |
| Sitemap / robots | Dynamic `sitemap.xml` (index), `pages.xml` and `schools-N.xml` from the live database with last-modified dates; `robots.txt` blocking admin, API, account and private exam pages | New policy pages added to the sitemap |
| Page metadata | Server-side title, description, canonical, Open Graph and JSON-LD (School, BreadcrumbList, WebSite + SearchAction, Organization, BlogPosting, Quiz) for every page type; thin places noindexed | Addresses outside the app (`/anything-unknown`) now get `noindex` instead of a copy of the home page's metadata (soft 404 fix); the in-app "Page not found" page adds `noindex` too |
| Policy pages | About, Contact, Privacy, Terms, Disclaimer | Editorial policy, Corrections policy, Account and data deletion; Privacy policy extended (Google photo, cookies and analytics, advertising, processors, retention, backups); `/privacy-policy`, `/terms-of-service`, `/terms-and-conditions` redirect (301) to the real pages; footer links |
| School pages | Facts with sources, related schools (within 5 km, or same town/PIN/district) | "Questions about this school" FAQ built only from the school's own record (board, classes, address, management, hostel, how to apply, contact) |
| Analytics | none | GA4 behind a consent banner, off until a measurement ID is configured (section 5) |
| Advertising | none | `<AdSlot>` placeholders that render nothing until AdSense is approved and configured (section 6) |

FAQ structured data (`FAQPage`) was deliberately **not** added: since 2023 Google shows FAQ rich results only for
well-known government and health sites, so the markup would bring nothing. The visible FAQ still helps visitors and
long-tail searches.

---

## 2. Google sign-in: Google Cloud Console (manual)

Console: <https://console.cloud.google.com/> → project **india-school-finder** (shown as "India school finder") →
**Google Auth Platform**.

### 2.1 Branding

| Field | Value |
|---|---|
| App name | `SchoolDhundo` |
| User support email | your own Gmail address (the one that owns the project) |
| App logo | optional. Adding a logo makes Google review the app's branding before the logo is shown; you can publish without one and add it later |
| Application home page | `https://schooldhundo.in/` |
| Application privacy policy link | `https://schooldhundo.in/privacy` |
| Application terms of service link | `https://schooldhundo.in/terms` |
| Authorised domains | `schooldhundo.in` |
| Developer contact email | your own email |

(`/privacy-policy` also works, it redirects to `/privacy`.)

### 2.2 Data access (scopes)

Only these three, all "non-sensitive", so no Google security review is needed:

- `openid`
- `.../auth/userinfo.email`
- `.../auth/userinfo.profile`

### 2.3 Clients → your Web application client

| Setting | Value |
|---|---|
| Authorised JavaScript origins | none needed (the flow runs on the server) |
| Authorised redirect URIs | `https://schooldhundo.in/api/v1/account/oauth2/code/google` (live) and `http://localhost:5173/api/v1/account/oauth2/code/google` (development) |

Both are already added (confirmed on 10 November 2026). The redirect URI is built from `ACCOUNT_LINK_BASE_URL` or
`PUBLIC_SITE_URL` on the server, so it must match exactly: https, no `www`, no trailing slash.

### 2.4 Publish: Testing → In production

1. Google Auth Platform → **Audience**.
2. Under "Publishing status", click **Publish app** and confirm.
3. Status becomes **In production**. Because only non-sensitive scopes are used, no verification is required; if you
   uploaded a logo, Google may ask for brand verification first (follow the Verification Center steps).

Until it is published, only the test users listed on that page can sign in with Google; everyone else sees
"Access blocked".

### 2.5 Keys on the server

The client ID and secret live in `/etc/schooldhundo/backend.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`). To
change them, put the new values in your local `.env`, then from Git Bash in the repository folder:

```bash
K=/c/Users/rakes/Documents/oracle-keys/ssh-key-2026-11-10.key
scp -i $K deploy/set-env.sh ubuntu@152.67.7.170:/tmp/
grep -E '^GOOGLE_CLIENT_(ID|SECRET)=' .env | ssh -i $K ubuntu@152.67.7.170 'sudo bash /tmp/set-env.sh'
```

It prints only the names of the settings and restarts the backend. **Rotate the client secret** (Clients → your client
→ Add secret → install with the commands above → disable the old secret), because the old one appeared once in a work
session log.

---

## 3. Environment variables (backend)

`application.properties` reads everything secret from the environment; production values are in
`/etc/schooldhundo/backend.env`. Names only:

```properties
# application-prod.properties (already in the repository)
spring.datasource.url=${DB_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}
app.jwt.secret=${JWT_SECRET}
app.cors.allowed-origins=${CORS_ALLOWED_ORIGINS}
app.account.link-base-url=${ACCOUNT_LINK_BASE_URL:${PUBLIC_SITE_URL}}
# application.properties
app.account.google.client-id=${GOOGLE_CLIENT_ID:}
app.account.google.client-secret=${GOOGLE_CLIENT_SECRET:}
app.mail.from=${MAIL_FROM:}
```

Frontend build-time settings (not secret; put them in `frontend/.env.production`, which is read by `npm run build`):

```properties
VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX      # section 5; empty = no analytics, no banner
VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX  # section 6; empty = no ads
```

---

## 4. Google Search Console (manual)

### 4.1 Verify the domain

1. Open <https://search.google.com/search-console> → **Add property** → **Domain** → enter `schooldhundo.in` → Continue.
2. Copy the TXT value Google shows (`google-site-verification=...`).
3. GoDaddy → My Products → schooldhundo.in → **DNS** → **Add New Record**: Type **TXT**, Name **@**, Value: paste it,
   TTL 1 hour → Save. Do not change or delete any other record (the A record, the www CNAME, the NS records and the
   `_dmarc` TXT must stay).
4. Back in Search Console click **Verify**. If it fails, wait 15-60 minutes and try again.

### 4.2 Submit the sitemap

Search Console → **Sitemaps** → enter `sitemap.xml` → Submit. It lists `pages.xml` (about 800 pages) and
`schools-1.xml` (19,353 school pages). Each school file holds up to 40,000 URLs; new files appear by themselves as the
directory grows. Last-modified dates come from each school's `updated_at`.

### 4.3 Indexing checklist

| Check | How | Expected |
|---|---|---|
| Home page | URL Inspection → `https://schooldhundo.in/` → Test live URL | "URL is available to Google"; canonical `https://schooldhundo.in/` |
| A school page | URL Inspection → `https://schooldhundo.in/schools/delhi-public-school-r-k-puram` | Indexable; School + BreadcrumbList detected |
| Rankings | URL Inspection → `/rankings` | Indexable |
| Exam pages | URL Inspection → `/exams/jnvst` | Indexable |
| Private pages | URL Inspection → `/account` | "Blocked by robots.txt" (correct) |
| Unknown address | URL Inspection → `/no-such-page` | "Excluded by noindex" (correct) |
| Structured data | <https://search.google.com/test/rich-results> → a school URL | School and BreadcrumbList valid |
| Mobile | Lighthouse in Chrome DevTools (mobile) | No layout overflow |
| HTTPS | `http://schooldhundo.in` and `https://www.schooldhundo.in` | Both redirect to `https://schooldhundo.in/` |
| Core Web Vitals | Search Console → Experience → Core Web Vitals (fills in after a few weeks of real visits) | "Good" |

Then use **Request indexing** for the home page and a few important pages. Do not request hundreds by hand; the sitemap
does that.

---

## 5. Google Analytics 4 (manual + one build setting)

### 5.1 Create the property

1. <https://analytics.google.com/> → Admin → **Create** → Property → name `SchoolDhundo`, time zone India, currency INR.
2. Data stream → **Web** → URL `https://schooldhundo.in`, name `SchoolDhundo web`.
3. Copy the **Measurement ID** (`G-XXXXXXXXXX`).
4. In the data stream's **Enhanced measurement**, turn **off** "Page changes based on browser history events" (the site
   sends its own page views; leaving it on would count them twice).

### 5.2 Switch it on

1. Create `frontend/.env.production` with `VITE_GA_MEASUREMENT_ID=G-XXXXXXXXXX` (the ID is public; this file may be
   committed).
2. Deploy (section 9).
3. Visit the site: a banner asks "Accept / Decline". Accept, then check **Reports → Realtime** in GA.

### 5.3 What is tracked

Only after the visitor accepts. IP anonymised; Google signals and ad personalisation off.

| Event | When | Parameters |
|---|---|---|
| `page_view` | every page | path, title |
| `school_search` | search on the Schools page | state, city, board, `has_query` (true/false). The typed text is **not** sent |
| `school_profile_view` | a school profile opens | school slug, state, board |
| `school_comparison` | two or more schools compared | number of schools |
| `exam_page_view` | an exam guide opens | exam slug |
| `quiz_start` / `quiz_complete` | a practice test starts / is submitted | mode, set slug, exam slug, (questions, seconds) |
| `google_sign_in` | "Continue with Google" clicked | step |
| `user_registration` | account created (email form, or first Google sign-in) | method |

`utils/analytics.ts` drops any parameter whose name looks personal (email, name, phone, mobile, password, token).
Mark `user_registration` as a **Key event** in GA (Admin → Events) to see sign-ups as conversions.

---

## 6. AdSense readiness

### 6.1 Checklist before applying

- [x] HTTPS, mobile-friendly, working navigation, no broken pages
- [x] About, Contact, Privacy (with cookies/ads), Terms, Disclaimer, Editorial policy, Corrections policy, Data deletion
- [x] Original content: school profiles from official sources, original practice questions, admission and exam guides
- [x] Clear contact email on Contact and in the footer
- [x] Consent banner (needed for ads too)
- [ ] Search Console verified and pages indexed (section 4)
- [ ] Some regular visitors and more original articles in the Blog. Google rejects "low-value content" sites; a few
      genuinely useful guides (admission process by state, JNVST preparation, choosing a board) help a lot
- [ ] The domain and site have been live for a while. Google may ask for more history before approving

### 6.2 Apply

1. <https://adsense.google.com/> → sign up with your Google account → site `schooldhundo.in`.
2. AdSense gives a publisher ID `ca-pub-XXXXXXXXXXXXXXXX` and asks you to prove ownership. Choose the **ads.txt** method
   (or the meta tag; tell your developer which).
3. Create `frontend/public/ads.txt` containing exactly the line AdSense shows, typically
   `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0`, and deploy. Check `https://schooldhundo.in/ads.txt`.
4. Request review. It can take days to weeks.

### 6.3 After approval: switch ads on

1. AdSense → Ads → **By ad unit** → create two **Display** units: "School profile" and "Blog article". Copy each unit's
   numeric slot ID.
2. In `frontend/src/components/common/AdSlot.tsx` fill `AD_SLOTS.schoolProfile` and `AD_SLOTS.blogPost`.
3. In `frontend/.env.production` add `VITE_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX`.
4. In `frontend/security-headers.conf`, extend the Content-Security-Policy:
   - `script-src`: add `https://pagead2.googlesyndication.com https://*.adtrafficquality.google`
   - `connect-src`: add `https://pagead2.googlesyndication.com https://*.adtrafficquality.google`
   - add `frame-src https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://www.google.com;`
5. Update the "Advertising" paragraph of the Privacy Policy (InfoPages.tsx) from "shows no advertisements today" to
   describe Google AdSense, then deploy.

Ads appear only after a visitor accepts cookies, are labelled "Advertisement", sit between content sections with space
around them, and never inside school facts, rankings or practice questions. Do **not** turn on AdSense "Auto ads"
(they ignore these rules).

### 6.4 Other revenue, later

The data model already separates editorial and paid content: published rankings carry a `sponsored` flag and the site
never shows sponsored entries as ranks. Future options:

| Idea | Rule |
|---|---|
| Sponsored or featured school listings | Always labelled "Sponsored"; never change rank, score or facts |
| Premium school profiles (school-managed photos, admissions info) | Facts still need an official source; profile marked as school-provided |
| School advertising subscriptions | Same labels and placement rules as AdSense |
| Premium exam material | Original material only; free practice stays free |

Never sell rankings, never promise admission, never present paid content as editorial.

---

## 7. Security review (10 November 2026)

| Item | Status |
|---|---|
| HTTPS enforced, HSTS | Caddy redirects http and www; HSTS one year |
| Cookies | Session cookie `ISF_SESSION` HttpOnly, Secure (prod), SameSite=Lax |
| CSRF | Cookie CSRF token for member actions; admin API uses bearer tokens |
| CORS | Only `https://schooldhundo.in` |
| Admin endpoints | 401 without a token (checked on the live site) |
| Rate limits | Logins, registrations, contact form and account emails are rate limited |
| Passwords | BCrypt; lockout after repeated failures |
| SQL injection | JPA / JdbcTemplate with bound parameters |
| XSS | React escapes output; strict Content-Security-Policy (`script-src 'self'` plus Google Tag Manager only) |
| Secrets | Environment only; `.env` gitignored; Swagger off in production |
| Database | Private network only; nightly backups kept 7 days |
| Logging | Tokens and passwords are not logged; Google failures log only the error code |
| Google profile photo | Only `https://*.googleusercontent.com` addresses stored; loaded with no referrer |

---

## 8. Testing results

| Check | Result |
|---|---|
| Frontend type check (`tsc`) | 0 errors |
| Frontend unit tests (`vitest`) | 138 passed (6 new: school FAQ, analytics privacy filter) |
| Backend tests (`mvnw verify`, embedded PostgreSQL) | 290 passed, 0 failed (new: photo storage and host check, welcome redirect, noindex for unknown addresses, policy pages in the sitemap). Two existing Google tests were updated to expect `?welcome=1` for new accounts |
| Migration V37 | applied cleanly to the local database |
| Production build | passed |
| Browser check (local, 1280 px and 390 px) | Editorial, Corrections, Data deletion and Privacy pages load with correct titles; `/no-such-page` shows "Page not found" with `noindex`; school profile shows the FAQ (6 questions for DPS R. K. Puram); footer links present; no horizontal overflow; no script errors; no consent banner and no ad code while IDs are unset |
| Not tested locally | the nginx 301 redirects (nginx does not run on the PC; check after deploying) and a real Google sign-in with photo (check on the live site after deploying) |

---

## 9. Deploying to the live site

Only after you approve. From PowerShell in the repository folder:

```powershell
.\deploy\oracle-micro-deploy.ps1
```

It builds the backend and frontend, uploads them, installs them, restarts the backend (migration V37 runs then) and
prints the HTTP status of the live site. About one minute of downtime.

Because nginx's own settings changed (redirects and the security policy), `oracle-micro-web.sh` copies the new
`nginx.conf` and `security-headers.conf` and reloads nginx; the deploy script runs it for you.

After deploying, check: home page, a school page (FAQ visible), `/editorial-policy`, `/data-deletion`,
`/privacy-policy` (redirects), `/no-such-page` (shows "Page not found"), Google sign-in, email sign-in, sign-out.

## 10. Rolling back

- **Code:** check out the previous commit (`git checkout 70f0b9c`), run the deploy script, return with
  `git checkout develop`.
- **Database:** V37 only adds one nullable column (`user_account.picture_url`). Older code ignores it, so rolling the
  code back needs no database change. Never delete the migration from the database history.
- **Full restore:** last night's backup, as described in the deployment guide (section 6.3 of the Word guide).

## 11. Your manual to-do list

1. Google Auth Platform: check Branding (section 2.1), then **Publish app** (2.4).
2. Rotate the Google client secret (2.5).
3. Search Console: TXT record at GoDaddy, Verify, submit `sitemap.xml` (section 4).
4. Google Analytics: create the property and send the `G-` ID (section 5).
5. Write a few original blog articles; apply to AdSense later (section 6).
