# Daily official-notification check

SchoolDhundo checks approved official websites once a day for new school and exam notices. It stores what it finds in
the existing `site_update` table. The home page's Live Updates ticker, the "Latest School & Exam Updates" cards and
`/updates` read that table.

The browser never triggers a check. The page refreshes every 15 minutes, but that only reads what the daily check
stored. New notices therefore appear without a deploy, and no visitor ever causes a request to an official site.

## How it works

```
06:00 IST  NotificationSyncScheduler (@Scheduled, cron app.notifications.cron, zone app.timezone)
             └─ NotificationSyncService.run()
                  ├─ run lock: in-JVM flag + PostgreSQL advisory lock (one run across all servers)
                  ├─ notification_sync_run row (RUNNING)
                  ├─ for each enabled source, separately:
                  │     FetchSession (https only, host allowlist, public IPs only, robots.txt,
                  │                   1.5 s between requests per host, timeouts, 3 attempts with backoff,
                  │                   6 MB size cap, 401/403 = BLOCKED, never worked around)
                  │     adapter.fetch()  → titles, links, dates exactly as the site gives them
                  │     NotificationIngestService.apply()  (one transaction per source)
                  ├─ expiry pass: PUBLISHED / PENDING_REVIEW past expires_on → EXPIRED
                  └─ run row: SUCCEEDED / PARTIAL / FAILED / ABANDONED, with each source's result (JSON)
Browser    GET /api/v1/updates (every 15 min)          → reads site_update, no outside requests
           GET /api/v1/updates/sync-status              → "checked daily at 6:00 AM IST · last checked …"
```

### Publishing rules (two levels)

A notice found by the check is **published automatically** only when all of these hold:

1. The source is approved for automatic publishing.
2. The source printed the notice's date.
3. The notice's link is on the source's own hosts.

Anything else is stored as **PENDING_REVIEW**, with the reason in `review_note`, and waits under "Waiting for review" in
the admin area (Admin → School & exam updates).

Other guarantees:

- **Dates.** A notice the source gives no date for is stored with the day it was found and `date_confirmed = false`. It
  cannot be published until an editor saves it with the real date. The publication date is never moved later.
- **Summaries.** The summary is a short sentence written by the checker ("NTA published this notice on 3 Nov 2026. Open
  the official notice for dates, eligibility and how to apply."). It is never text copied from the notice. Automatic
  items are marked `verified = false`: no editor has checked them.
- **Duplicates.** A notice is identified by `(source_key, source_item_id)`: the source's id, or the notice's canonical
  address.
  - A second run with the same listing changes nothing except `last_seen_at`; `updated_at` is untouched.
  - A notice whose address another update already cites is not added again.
  - In the feed, a notice the exam catalogue already cites is shown once, as the exam item.
- **Corrections.** When the source changes a notice's title, link or dates, the update is changed and `last_changed_at`
  is set, which shows the "Updated" badge for 7 days.
  - If staff edited the update, their wording is kept and the change is written in the review note.
  - A later closing date reopens an expired notice.
- **Withdrawals.** On sources whose listing is complete (NTA's archive, Navodaya's API), a notice missing for 20 hours or
  more is archived as withdrawn. If it comes back, it returns to the review queue.
- **Superseded notices.** An editor can mark a notice as replaced by a later one ("Replaced by…"); it is then archived.
- **Expiry.** A notice stays up until the end date the source gives. Without one, it stays up 45 days after publication
  (`app.notifications.lifetime-days`). After that it is EXPIRED and listed under `/updates?view=past` for 90 days.
  Notices already past that age when first found are not added.
- **Badges** are computed on every request: NEW, UPDATED, CLOSING_SOON, UPCOMING and OPEN, plus EXPIRED in past
  updates. The categories are the existing four: ADMISSION, EXAM, PREP and JOB.

## Sources (inspected 14 November 2026)

| Key | Source | What is read | Publishing |
|---|---|---|---|
| `nta-aissee` | NTA, https://nta.ac.in/NoticeBoardArchive | The archive table (`table#tbl`, ~1,900 rows), filtered to AISSEE / Sainik Schools and to RIMCEE (NTA conducts the RIMC entrance exam too). There is no date column; NTA names each file by its upload time (`Notice_20261103151121.PDF`), and that is the date used. | Automatic; complete listing |
| `navodaya` | Navodaya Vidyalaya Samiti | The public JSON API its own site uses: `https://navodaya.gov.in/api/public/media?organization_id=100`. Each notice has a stable id and `start_date`. JNVST, LEST, admissions and recruitment are kept; tenders, contracts and circulars are dropped. The same notice posted twice is merged. | Automatic; complete listing. Notices that link to another site (e.g. the admit-card portal) go to review |
| `netarhat` | Netarhat Residential School home page | Its Notices box entries in "24-09-2026 : title" form; the printed date is used. Undated notice links go to review. | Automatic when dated |
| `kvs` | KVS | `https://kvs.gov.in/en/recruitment/` is a static FAQ page, so the real lists are read instead: "Notifications/Recruitment" (`/en/interview-notice/`) and Admission (`/en/admission/`). These are government-platform tables with a "Published On" date and PDFs on `cdnbbsr.s3waas.gov.in`. | Automatic |
| `cbse-recruitment` | CBSE, https://www.cbse.gov.in/cbsenew/recruitment.html | The CDN in front of CBSE answers an honestly identified automated client with **403 Access Denied** (robots.txt too). The checker records BLOCKED every day and does not disguise itself. If the site ever answers, PDF links are collected for review only. | Review only |
| `rms` | Rashtriya Military Schools home page | "(CLICK HERE)" notice links to `/Attachments/…` and the admissions portal. The page has no dates. | Review only |

Sources investigated and not added:

- **RIMC** (https://rimc.gov.in/, www.rimc.gov.in): the connection fails from here, so the site cannot be read. RIMCEE
  notices are read from NTA's archive instead (above).
- **Sainik Schools Society** (https://sainikschoolsociety.in/): a JavaScript app that serves only "Loading…".
- **NTA's AISSEE portal** (https://exams.nta.nic.in/sainik-school-society/): answers 403 to automated clients.
- **State admissions** (for example Delhi DoE nursery): every state publishes differently and mostly in scanned PDFs.
  Admission cycles keep coming from the existing admission records.

The NTA archive already covers AISSEE and RIMCEE notices. Other RIMC, Sainik and state admission notices can still be
added by editors.

Requests identify themselves as `SchoolDhundoBot/1.0 (+https://schooldhundo.in/contact)` (`app.notifications.http.user-agent`).

## Settings (`application.properties`, prefix `app.notifications`)

| Property | Default | Meaning |
|---|---|---|
| `enabled` (`NOTIFICATIONS_SYNC_ENABLED`) | `true` | Master switch (also blocks "check now" and start-up catch-up) |
| `cron` (`NOTIFICATIONS_SYNC_CRON`) | `0 0 6 * * *` | Spring cron (sec min hour day month weekday) in `app.timezone` (Asia/Kolkata); `-` switches the schedule off |
| `schedule-label` | `Daily at 6:00 AM IST` | Shown on the site; keep it in step with `cron` |
| `catch-up-on-startup`, `catch-up-after`, `catch-up-delay` | `true`, `24h`, `2m` | After a restart, run once if the last successful run is older than a day |
| `manual-cooldown` | `10m` | "Check now" is refused (HTTP 429) this soon after the last run |
| `disabled-sources` (`NOTIFICATIONS_DISABLED_SOURCES`) | empty | e.g. `cbse-recruitment,rms` |
| `lifetime-days` | `45` | How long a notice without an end date stays up |
| `withdraw-after` | `20h` | How long a notice must be missing from a complete listing |
| `http.*` | 10 s connect, 30 s request, 6 MB, 3 attempts, 3 s backoff, 1.5 s per host, 3 redirects, robots on | Fetch limits |
| `pdf.*` | excerpts on, 5 MB, 2 pages, 400 chars, 3 per source | Opening text of new review items' PDFs, added to the review note (staff only) |

`spring.task.scheduling.pool.size=2` stops the check from delaying the nightly data jobs. On shutdown a run stops
between sources and is recorded as ABANDONED. A run left RUNNING by a crash is marked ABANDONED on the next start.

## Endpoints

| Endpoint | Who | What |
|---|---|---|
| `GET /api/v1/updates?category=&page=&size=` | public | The feed (unchanged path); official items have `origin: OFFICIAL_SOURCE` |
| `GET /api/v1/updates/past` | public | Expired in the last 90 days, badge EXPIRED |
| `GET /api/v1/updates/sync-status` | public | `lastCheckedAt`, `nextCheckAt`, `schedule`, `sources`; no errors or internals |
| `GET /api/v1/admin/updates?status=PENDING_REVIEW` (also `EXPIRED`, …) | ADMIN, EDITOR | Review queue and lists |
| `POST /api/v1/admin/updates/{id}/supersede?by={id}` | ADMIN, EDITOR | Mark replaced |
| `GET /api/v1/admin/updates/sync-status`, `GET /api/v1/admin/updates/sync-runs` | ADMIN, EDITOR | Schedule, sources, run history with per-source results |
| `POST /api/v1/admin/updates/sync` | **ADMIN only** | Start a check in the background: 202, 409 while running, 429 within the cool-down |

There is no public or anonymous way to start a check.

## Adding a source

1. Look at the site first: robots.txt, and whether it has an API or feed (prefer those). Find the notice listing, the
   date it prints, and the hosts its links use. If the site refuses automated clients (401/403, a challenge page),
   stop: do not work around it.
2. Save a small excerpt of the real page under `backend/src/test/resources/notifications/`.
3. Write `@Component class XyzAdapter implements OfficialSourceAdapter` in `notifications/source/`:
   - `key()`: stable and short; it is stored with every notice and must never change.
   - `name()`, `listingUrl()`, `hosts()` (exact hostnames requested) and `documentHosts()` (hosts whose links may be
     published without review).
   - `autoPublish()`: true only if the site prints a reliable date per notice. `completeListing()`: true only for a
     full archive or an API.
   - `fetch()`: use `http.get(url).html()` or `.body()`. Keep the parsing in a static `parse(...)` method so it can be
     tested.
     - Return `FoundNotice`s with the title and link exactly as the site gives them, and the date only if the site
       prints it (never guess one).
     - Set a category from plain keyword rules; drop irrelevant entries (count them in `ignored`).
     - Throw `SourceLayoutException` if the listing has no rows at all, so a page redesign is reported, not hidden.
4. Add a parser test like `OfficialSourceAdaptersTest`. Run it, then check the real site once from a local server
   (below) and read the run in Admin → School & exam updates.
5. Add the source to the table above.

## Running and checking it

- **Tests** never contact real websites: `application-test.properties` sets `app.notifications.only-sources=test-only`.
  - `NotificationSyncIT` uses fake sources against PostgreSQL. It covers two consecutive daily runs, corrections,
    revised dates, expiry, withdrawal, a failing source, the lock, crash recovery and the endpoints.
  - `FetchSessionTest` and `UrlPolicyAndRobotsTest` cover the fetch rules. `OfficialSourceAdaptersTest` covers each
    parser against real-page excerpts, and `NotificationScheduleTest` covers 6:00 IST.
  - Command: `./mvnw -o test -Dtest='Notification*,FetchSessionTest,UrlPolicyAndRobotsTest,OfficialSourceAdaptersTest'`
- **Locally.** Start the backend (`LocalDevApplication`). Sign in to the admin area as an ADMIN, then press "Check now"
  in Admin → School & exam updates, or `POST /api/v1/admin/updates/sync`. Each source's result appears in the panel.

## Deployment and scheduling

- **No separate scheduler is needed.** The live backend is the always-on systemd service `schooldhundo` on the Oracle
  web server (`Restart=always`), so Spring's `@Scheduled` fires daily inside it. The cron is read in Asia/Kolkata
  whatever the server clock's zone, so 06:00 IST is 00:30 UTC.
- If more than one backend ever runs against the same database, the advisory lock still allows only one run. No cron
  job, Kubernetes CronJob or external trigger is needed. Do not add one that calls the admin endpoint on a timer.
- **Deploying** this change is the usual `deploy/oracle-micro-deploy.ps1`. Flyway applies `V43__official_notification_sync.sql`
  on start: it adds columns and indexes to `site_update` and creates `notification_sync_run`. Shortly after the restart,
  the start-up catch-up runs the first check (no successful run yet). Watch it with
  `journalctl -u schooldhundo | grep "Notification sync"` or in the admin panel.
- **Switching off:** `NOTIFICATIONS_SYNC_ENABLED=false` (or `NOTIFICATIONS_SYNC_CRON=-`) in `/etc/schooldhundo/backend.env`,
  then restart the service. To skip one site: `NOTIFICATIONS_DISABLED_SOURCES=cbse-recruitment`.
- The server needs outbound https to the source hosts. Oracle's default egress rules allow it.
