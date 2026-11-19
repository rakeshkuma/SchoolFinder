# UDISE+ (Know Your School) on school profiles

Every school profile has a small card, "Official UDISE+ School Information", in the Overview tab under the school's
facts. Nothing is fetched from the government site, so profiles work the same when the portal is down.

- **Checked link.** An editor has confirmed a Know Your School page for this school. The card shows the UDISE+ code
  and a "View Official UDISE+ Details" button that opens that page in a new tab, with the date it was checked.
- **Confirmed code, no checked link.** "Find This School on UDISE+" opens the school's own portal page,
  `https://kys.udiseplus.gov.in/#/schooldetail/{code}/1` (see "Links built from a confirmed code" below).
- **No checked link or confirmed code.** The card shows "Find This School on UDISE+", which opens https://kys.udiseplus.gov.in/.
  - If the code is known, it is shown with a "Copy code" button.
  - Otherwise the card names the school and its place, to help search the portal.

The card never says "verified by the government" and states that SchoolDhundo is not endorsed by the Ministry of
Education.

## Audit (live database, read-only, 14 Nov 2026)

| | Schools |
|---|---|
| All school records | 33,072 (33,060 active) |
| With a UDISE+ code | 0 |
| Valid / malformed / duplicate codes | 0 / 0 / 0 (the column has allowed only 11 digits, unique, since V4) |
| With an official UDISE+ address stored | 0 |
| With a board affiliation number (CBSE etc.) | 32,978 |

The directory was built from CBSE's SARAS affiliation records, which do not include UDISE+ codes. So on day one every
profile offers the portal's search.

## Links built from a confirmed code (19 Nov 2026)

The portal is a JavaScript app. Its search results link to `/#/schooldetail/{school id}/{year id}` with its internal
school id. But its school-detail page also accepts the 11-digit UDISE+ code in that place: when the id is 11
characters, every data call on the page asks for `udiseSchCode` instead of `schoolId`. The year segment is not used to
choose the school or the year (the page loads the latest year). This was checked in the portal's code on 19 Nov 2026.

So the button goes to `https://kys.udiseplus.gov.in/#/schooldetail/{code}/1` when:
- the code is exactly 11 digits (kept as text, so leading zeros stay), and
- the school's match status is `VERIFIED_MATCH`, meaning an editor confirmed it or an official list matched it
  without doubt.

A code with no status, `PENDING_REVIEW` or `NOT_MATCHED` never makes a link. In order, the button opens:
1. a checked page address, if there is one;
2. the page for a confirmed code;
3. otherwise the portal's search.

The button text is the same for 2 and 3. If the portal changes how it reads ids, change `udiseCodeUrl` in
`frontend/src/components/school/UdiseCard.tsx`.

## Database (migration V45, additive)

| Column | Type | Meaning |
|---|---|---|
| `udise_code` (existing, V4) | VARCHAR(11), 11 digits, unique | The code |
| `udise_profile_url` | VARCHAR(120) | A checked Know Your School page. A CHECK constraint allows only `https://kys.udiseplus.gov.in/#/schooldetail[1]/{digits}/{digits}` |
| `udise_verified_on` | DATE | When an editor (or an applied import) confirmed it |
| `udise_match_status` | VARCHAR(16) | `VERIFIED_MATCH`, `PENDING_REVIEW` or `NOT_MATCHED`; null if never checked |

- **Effect on existing data.** No row was changed and no index was added (the existing unique index on
  `udise_code` serves search by code).
- **Storage.** A null column takes no space (adding nullable columns does not rewrite the table). A school with all
  four values filled uses about 90 bytes, so even all 33,000 schools would add under 3 MB.
- **Rollback.** The SQL is at the end of `V45__udise_link.sql`.

## Adding a checked link for one school (admin area)

1. Admin → Schools → the school.
2. Open the "UDISE+ (Know Your School)" panel and follow the link to the portal.
3. Find the school by state, district and name. Check that the name, district and address agree.
4. Copy the 11-digit code and the page address from the browser, and tick "I opened this page…".
5. Save. The change is written to the audit log. Remove clears both values.

The server refuses:
- non-11-digit codes;
- any address that is not an https school-detail page on kys.udiseplus.gov.in (no other hosts, parameters,
  `javascript:` or `http:`);
- a code that already belongs to another school (409);
- a save without the "checked" tick.

API: `PUT /api/v1/admin/schools/{id}/udise` with `{"udiseCode", "profileUrl", "checked"}` (ADMIN or EDITOR).

## Matching an official list (codes in bulk)

Use this only with a list you are allowed to use: for example a state's school list obtained through the UDISE+
**Data Sharing Portal** (https://microdata.udiseplus.gov.in/, which needs a formal request), or a state department's
published list. Third-party copies may have their own terms; read them first.

The file is a CSV with a header row:
- **Required columns:** UDISE code, school name, state (name or two-letter code) and PIN code.
- **Optional column:** district.
- **Accepted header names:** `udise_code`/`udise`/`udise_sch_code`, `school_name`/`name`, `state`/`state_name`,
  `pincode`/`pin_code`, `district`.
- **Size:** at most 15 MB and 200,000 rows per upload. Split a national file by state.

```bash
# On the web server (the admin token is read and used without printing it), dry run first:
curl -s -H "Authorization: Bearer $T" -F file=@karnataka.csv "http://127.0.0.1:8080/api/v1/admin/import/udise" > report.json
# Read report.json: verified (to be written) and pending (for a person), with the candidate rows and scores.
# Then, only if the report looks right:
curl -s -H "Authorization: Bearer $T" -F file=@karnataka.csv "http://127.0.0.1:8080/api/v1/admin/import/udise?apply=true"
```

**Matching rules (no school is matched on its name alone):**
- **Candidates.** Only directory schools in the **same state with the same PIN code** are considered.
- **Name comparison.** Names are compared word by word after spelling out abbreviations (Pub → Public, Sr Sec →
  Senior Secondary, KV → Kendriya Vidyalaya, St → Saint). Filler words such as "School" and "Public" are ignored.
- **When a code is written.** Only when **exactly one** directory school matches strongly (75% of words in common),
  that school is matched by exactly one row, and no other school at that PIN even partly resembles the row.
- **What is never written.** A code already held by another school, or a school that already has a different code.
  Both go to review.
- **Everything else.** Two schools with the same name at one PIN, two official rows for one school, or partly
  similar names are marked `PENDING_REVIEW` and listed in the report for a person. No code is written for them.
- **Writing.** Rows are written in batches of 500, each in its own transaction, and only to schools without a code,
  so a run can be repeated safely. Imports never create schools and never store links.

The upload endpoint is ADMIN only (`/api/v1/admin/import/**`).

## Deploying

1. Deploy as usual (`deploy/oracle-micro-deploy.ps1`). Flyway applies V45 on start. It is metadata-only and fast.
2. Check one profile: the card should show "Find This School on UDISE+".
3. Add checked links one school at a time, or run a dry-run import with a lawfully obtained list and apply after
   reading the report.
