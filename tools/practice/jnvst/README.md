# JNVST Class VI question bank builder

Builds the JNVST (Jawahar Navodaya Vidyalaya Selection Test, Class VI) practice sets — original, bilingual questions in
the structure of the official 2027 test — and writes them into `backend/src/main/resources/seed/practice.json`.

```
node tools/practice/jnvst/build.mjs backend/src/main/resources/seed/practice.json
```

## What it builds

| Sets | Content |
|---|---|
| `jnvst-mock-1`, `jnvst-mock-2` | Full papers: 80 questions, 100 marks, 120 minutes, in the official order — Mental Ability 1–20, EVS 21–40 (15 MCQs + a passage), Arithmetic 41–60, Language 61–80 (four passages) |
| `jnvst-mat-1..5` | 20 figure questions each, four per official part (pattern completion, figure series, geometrical figure completion, mirror/water image, embedded figure) |
| `jnvst-evs-1..4` | 15 MCQs + one passage with 5 questions, over the four EVS areas in the prospectus |
| `jnvst-arithmetic-1..5` | 20 questions over the nine official Arithmetic topics, answers worked out |
| `jnvst-language-1..3` | Four passages × five questions |

Marks: 1.25 per correct answer, no negative marking (prospectus section 6).

## How the questions are made

- `arithmetic.mjs` and `mat.mjs` generate questions from rules with a seeded random generator, so the bank is the same on
  every run and every answer is computed, never typed. MAT questions are figure data (shapes on a 100 × 100 grid) drawn
  by the site as SVG.
- `evs.mjs` and `language.mjs` hold hand-written questions and passages. Edit them there and re-run the build.
- Every question has an English and a Hindi version with the options in the same order, so one answer key serves both.
- Re-running replaces every set whose `examSlug` is `jnvst`. If a slug is no longer produced, the build prints it; on a
  live server unpublish it from the admin practice page, since the admin import only adds and updates.

## Source and originality

The structure follows the NVS *Prospectus cum Notification* for JNVST 2027 (Class VI), sections 5–7
(https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf). All questions are written by SchoolDhundo; they
are not official, previous-year or coaching-institute questions and must never be labelled as such. Official previous
papers are linked from the exam guide, not reproduced.

## Loading

Load into a running server with the admin practice import (`POST /api/v1/admin/practice-sets/import`, used by
`tools/seed/import-to-server.js`-style tooling or the admin page) or, locally, with `LocalPracticeImport`.
