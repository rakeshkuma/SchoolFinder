# Deploying India School Finder

This guide takes the site from a fresh server to production: PostgreSQL, the Spring Boot API and the React site behind
nginx, with HTTPS in front. Local development is covered in [README.md](README.md).

```
Browser ──HTTPS──▶ TLS proxy (Caddy / nginx / cloud LB)
                         │ HTTP
                         ▼
                  frontend container (nginx :80)
                    ├── /            static React build (index.html never cached, /assets cached 1 year)
                    └── /api/ ──────▶ backend container (Spring Boot :8080, profile "prod")
                                            │ JDBC
                                            ▼
                                     db container (PostgreSQL 16, volume pgdata)
```

Only the frontend container publishes a port. The API and the database are reachable only inside the Docker network,
and the browser calls the API on the same origin (`/api/v1/...`), so no CORS is involved in normal use.

## 1. Requirements

- A Linux server with 2 GB RAM or more, Docker Engine and Docker Compose **v2.24 or newer** (the production override
  uses `!reset` / `!override`).
- A domain name pointing at the server.
- Outbound HTTPS for the browser-side extras: OpenStreetMap tiles and licensed photos are loaded by visitors' browsers.

## 2. Configure

```bash
git clone <your repository> india-school-finder && cd india-school-finder
cp .env.example .env
chmod 600 .env
```

Fill in `.env`. Every secret comes from here; nothing secret is in the code or the images.

| Variable | Required | Notes |
|---|---|---|
| `POSTGRES_PASSWORD` | yes | `openssl rand -base64 24` |
| `POSTGRES_DB`, `POSTGRES_USER` | no | defaults `india_school_finder`, `isf_app` |
| `JWT_SECRET` | yes | at least 32 bytes: `openssl rand -base64 48`. Changing it signs every admin out. |
| `PUBLIC_SITE_URL` | yes | e.g. `https://schools.example.in`; the only allowed CORS origin and the base of sitemap URLs |
| `ADMIN_BOOTSTRAP_USERNAME`, `ADMIN_BOOTSTRAP_PASSWORD` | first start | creates the first administrator only if none exists; 12+ characters. **Remove the password after the first start.** |
| `JWT_ACCESS_TOKEN_TTL` | no | admin session length, default `PT15M` |
| `SWAGGER_ENABLED` | no | `false` by default in production |
| `FRONTEND_PORT` | no | host port of nginx, default `80` |
| `VITE_CONTACT_EMAIL` | no | shown on the contact page (build-time) |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | no | enables photo uploads; without them admins register image URLs |
| `COVERAGE_PRIORITY_STATES` | no | states listed first on the coverage dashboard, default `DL,BR,UP,JH,HR` |
| `DB_POOL_SIZE` | no | default 10 |
| `MAIL_FROM`, `SPRING_MAIL_HOST`, `SPRING_MAIL_PORT`, `SPRING_MAIL_USERNAME`, `SPRING_MAIL_PASSWORD` | for member accounts | SMTP of a transactional email provider (port 587 with STARTTLS). Needed for email verification and password reset; without it parents can create accounts but cannot verify them, and the pages say so. `MAIL_FROM` must be an address the provider allows you to send from (set up SPF/DKIM for the domain). |
| `SESSION_TIMEOUT` | no | member session inactivity limit, default `2h`; "keep me signed in" lasts 30 days |
| `ACCOUNT_LINK_BASE_URL` | no | base of links in account emails and of the Google redirect URI, default `PUBLIC_SITE_URL` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | no | enables "Continue with Google" (see 4a). Without both, the option is not shown. |

## 3. Start

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps        # backend should become "healthy"
curl -s http://localhost/api/v1/states | head -c 200
```

On first start the backend applies every Flyway migration to the empty database and creates the bootstrap
administrator. Check the log, then remove `ADMIN_BOOTSTRAP_PASSWORD` from `.env` and restart the backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend | grep -E "migrations|bootstrap"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d backend
```

## 4. HTTPS

Terminate TLS in front of the frontend container. With [Caddy](https://caddyserver.com/) on the same host (set
`FRONTEND_PORT=8081` so Caddy can own 80/443), a complete `Caddyfile` is:

```
schools.example.in {
    reverse_proxy 127.0.0.1:8081
    header Strict-Transport-Security "max-age=31536000; includeSubDomains"
}
```

Caddy obtains and renews the certificate itself. The frontend nginx forwards `X-Forwarded-Proto` from the proxy, and the
backend honours forwarded headers (`server.forward-headers-strategy=framework`).

HTTPS is required for member accounts: under the `prod` profile the session cookie is marked `Secure`, so browsers
only send it over HTTPS. The site and its API must be served from the **same origin** (the default nginx setup):
the session and CSRF cookies are `SameSite=Lax` and the API does not accept cross-origin credentials.

### 4a. Google sign-in (optional)

1. In the [Google Cloud console](https://console.cloud.google.com/), create or pick a project, then **Google Auth
   Platform → Branding**: app name "India School Finder", support email, your domain under authorised domains, and
   links to `https://<your domain>/privacy` and `https://<your domain>/terms`. Audience: **External**.
2. **Data access**: only the non-sensitive scopes `openid`, `.../auth/userinfo.email` and `.../auth/userinfo.profile`
   (no Google verification review is needed for these).
3. **Clients → Create client → Web application**. Authorised redirect URI, exactly:
   `https://<your domain>/api/v1/account/oauth2/code/google` (built from `PUBLIC_SITE_URL`, or
   `ACCOUNT_LINK_BASE_URL` if set). No JavaScript origins are needed: the flow runs on the server.
4. Put the client id and secret in `.env` as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (never in the code or the
   repository) and restart the backend. The sign-in and sign-up pages then show "Continue with Google".
5. Publish the app (**Audience → Publish app**); while it is in "Testing" only the test users you list can sign in.

For local development, create a separate client with the redirect URI
`http://localhost:5173/api/v1/account/oauth2/code/google` and set the two variables before starting the backend.

## 5. Load the school data

The production database starts empty. Data is loaded through the admin import API, so every row passes the same
validation, duplicate detection and "never overwrite a verified school" rules as an import from the admin page.
Run this from any machine with Node 18+ and a copy of the repository:

```bash
# Build the CBSE import files from the raw SARAS records in data/saras (split into files of at most 4,500 rows).
node tools/seed/build-saras-csv.js data/saras/central.jsonl,data/saras/up-b.jsonl,data/saras/others.jsonl data/saras/import/schools.csv 2026-10-24

export ADMIN_USERNAME=admin
read -rs ADMIN_PASSWORD && export ADMIN_PASSWORD     # typed, not stored in shell history
API=https://schools.example.in/api/v1

# 1) Check everything first: nothing is saved.
node tools/seed/import-to-server.js $API --mode VALIDATE_ONLY \
  backend/src/main/resources/seed/delhi-schools.csv tools/seed/up-private-schools.csv \
  tools/seed/curated-private-schools.json data/saras/import/schools-*.csv

# 2) Import. Re-running later with --update refreshes schools that are not yet verified.
node tools/seed/import-to-server.js $API --mode VALID_ROWS_ONLY \
  backend/src/main/resources/seed/delhi-schools.csv tools/seed/up-private-schools.csv \
  tools/seed/curated-private-schools.json data/saras/import/schools-*.csv

# 3) Openly licensed photos (after the schools exist; images already registered are skipped).
node tools/seed/import-to-server.js $API --mode VALID_ROWS_ONLY tools/seed/curated-images.json
```

Files are sent in chunks of 300 rows (`--chunk` to change), each a short request; the script renews its login token
as needed and reports rejected rows by their position in the original file. Measured on a fresh database: 4,500 CBSE
schools in about 45 seconds.

Photos and the Delhi fee and admission records are not part of the CSV files; add them in the admin editor
(Schools → a school → Photos / Fees / Admissions), each with its source. Afterwards, **Admin → State coverage** shows
per state how many schools have photos, fees, admissions, contacts and coordinates.

### Search engines

The backend generates `robots.txt`, `/sitemap.xml` (an index) and `/sitemaps/pages.xml` + `/sitemaps/schools-N.xml`
(40,000 school pages per file) from the live database; nginx forwards these paths to it. Absolute URLs use
`PUBLIC_SITE_URL`. After going live, submit `https://<your domain>/sitemap.xml` in Google Search Console and Bing
Webmaster Tools. Admin pages, the API, `/saved` and the account pages (sign-in, registration, password reset) are disallowed in `robots.txt`; inactive schools are left out.

## 6. Backups and restore

```bash
# Nightly logical backup (keep copies off the server).
docker compose exec -T db pg_dump -U isf_app -d india_school_finder -Fc > backup-$(date +%F).dump

# Restore into an empty database (stop the backend first).
docker compose stop backend
docker compose exec -T db pg_restore -U isf_app -d india_school_finder --clean --if-exists < backup-2026-10-25.dump
docker compose start backend
```

Test a restore occasionally. The `pgdata` volume holds the live data; never run `docker compose down -v` in production.

## 7. Upgrades

```bash
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Schema changes ship as new Flyway migrations (`backend/src/main/resources/db/migration/V8__...sql`). They run on
startup; Hibernate only validates (`ddl-auto=validate`) and Flyway `clean` is disabled in production. Never edit a
migration that has already run anywhere; add a new one. Back up before upgrading.

## 8. Monitoring

- Health: `GET /actuator/health` inside the network (used by the container health check). Details are never exposed.
- Logs: `docker compose logs -f backend`. Admin actions are also recorded in the audit log (**Admin → Audit log**).
- Watch for: failed logins (rate limited), import reports with many rejected rows, and stale verifications on the
  data-quality page.

## 9. Without Docker

- **Database:** any PostgreSQL 14+ (managed is fine). Create a database and a user that owns it. The `pg_trgm`
  extension is created by migration V4, so the user needs permission to create it (or create it once as a superuser).
- **Backend:** `cd backend && ./mvnw -DskipTests package`, then run
  `java -jar target/india-school-finder-backend-1.0.0.jar` with `SPRING_PROFILES_ACTIVE=prod`,
  `DB_URL=jdbc:postgresql://host:5432/db`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`
  (and the bootstrap admin variables on first start) under a service manager such as systemd.
- **Frontend:** `cd frontend && npm ci && npm run build`, then serve `dist/` with any static host that falls back to
  `index.html` for unknown paths and proxies `/api/` to the backend (see `frontend/nginx.conf`). If the API is on another
  origin, build with `VITE_API_BASE_URL=https://api.example.in/api/v1` and add the site origin to
  `CORS_ALLOWED_ORIGINS`.

## 10. Go-live checklist

- [ ] `.env` filled, `chmod 600`, not committed; `POSTGRES_PASSWORD` and `JWT_SECRET` freshly generated.
- [ ] HTTPS works and HTTP redirects to HTTPS; HSTS header present.
- [ ] `ADMIN_BOOTSTRAP_PASSWORD` removed after the first start; admin password stored in a password manager.
- [ ] `/swagger-ui.html` returns 404 (unless deliberately enabled); `/api/v1/admin/...` returns 401 without a token.
- [ ] Data imported with `VALIDATE_ONLY` first; the State coverage page shows the expected counts.
- [ ] Nightly `pg_dump` scheduled and one restore tested.
- [ ] Contact e-mail (`VITE_CONTACT_EMAIL`) set so schools can request corrections.
- [ ] Account email: SMTP variables set, then create a test account and confirm the verification and password-reset
      emails arrive and their links open the live site. Until then the sign-up pages report that email is unavailable.
- [ ] Signed in on the live site, the `ISF_SESSION` cookie is `HttpOnly`, `Secure` and `SameSite=Lax`.
- [ ] If Google sign-in is enabled: sign in with a Google account that has no account yet, then with one whose email
      already has an account (a "Google sign-in was added" email should arrive), and cancel once at Google.
- [ ] Terms of use and privacy policy (`/terms`, `/privacy`) reviewed by someone qualified for your jurisdiction
      (they were written for this project, not by a lawyer).
- [ ] `https://<domain>/sitemap.xml` lists your domain (not localhost) and is submitted to search engines.

## Verified for this release

On 2026-10-25 the production jar (`SPRING_PROFILES_ACTIVE=prod`) was started against a brand-new PostgreSQL database:
all 7 migrations applied, the bootstrap administrator was created, `/actuator/health` reported `UP`, Swagger returned 404,
admin and actuator endpoints returned 401 without a token, and `import-to-server.js` loaded the curated files
(31 schools) and 4,499 CBSE schools with no errors (one bad website address, since fixed in the builder). The frontend
production build, its 8 unit tests and the 99 backend tests passed. The Docker images and compose files were not built
on that machine (no Docker installed); the CI workflow builds both images on every push.
