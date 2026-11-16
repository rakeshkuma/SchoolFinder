# Olympiad question bank builder (Classes I–X)

Builds the class-wise Olympiad practice sets shown at `/exams/practice?category=OLYMPIAD` and writes them into
`backend/src/main/resources/seed/practice.json`.

```
node tools/practice/olympiad/build.mjs backend/src/main/resources/seed/practice.json [--import-file olympiad-sets.json]
```

`--import-file` also writes just these sets, in the admin import format, for loading into a running server. Every run
writes `REPORT.md` (counts by class, subject, difficulty and topic, and anything left out as a duplicate).

## What it builds

One set per class and subject, slugs `olympiad-class{N}-{subject}-1`:

| Subject | Classes | Notes |
|---|---|---|
| `maths-1` | I–X | Mathematical reasoning and everyday mathematics |
| `science-1` | I–X | Classes IX–X split into Physics, Chemistry and Biology chapters |
| `english-1` | I–X | English only (a translation would give the answers away); a reading passage from Class III |
| `reasoning-1` | I–X | Includes generated figure questions (series, mirror images, pattern completion) in Classes III–VI |
| `ioqm-style-1` | VIII–X | Subject `IOQM-style Mathematics`, kept apart from school Mathematics so it is always optional; Class VIII is an introduction |

The class priorities of the brief were followed: about 43% of the questions are for Classes III–V, 31% for VI–VIII,
16% for IX–X and 10% for I–II. Classes XI–XII have no sets yet.

Mocks are not separate sets (that would repeat questions in the bank). The Olympiad page draws them from a class's
questions in the order and balance of the SOF Level 1 paper (Logical Reasoning first, harder questions last) and opens
them through the ordinary practice session.

## Question files

`maths.mjs`, `science.mjs`, `english.mjs` and `reasoning.mjs` hold hand-written rows. In every row the **first option is
the correct one**; the builder moves it to a balanced position (A–D equally often in each set). Rows with a `verify`
function have their answer recomputed by the builder, which stops if it does not match the keyed option.

The builder refuses a question that breaks an import rule (four distinct options, Hindi options one-to-one, lengths),
has no real explanation, topic, chapter or difficulty, or repeats a question already in practice.json — the same text,
the same question with other numbers, heavy word overlap with a similar answer, or the same figures. Anything flagged is
left out and listed in REPORT.md; replace it in the question file rather than forcing it in.

Re-running is idempotent: it replaces only the sets whose slug starts with `olympiad-class` and checks that every other
set, including the older `olympiad-maths-class5-1`, is byte-for-byte unchanged.

## Sources and originality

Topics follow the class-wise syllabus that the Science Olympiad Foundation publishes for IMO, ISO and IEO
(sofworld.org syllabus pages, checked 16 Nov 2026). The IOQM-style problems follow the format printed on HBCSE's IOQM 2025
paper (30 questions, one- or two-digit answers, 2/3/5 marks, 3 hours, no negative marks) and the IOQM 2026 eligibility
notice (Classes VIII–XII). SOF material is marked "All Rights Reserved", so its sample papers were not copied or adapted;
HBCSE's past papers were used only for the instruction block. Every question, passage and explanation is written by
SchoolDhundo. They are not official, sample or previous-year questions and must never be labelled as such.

## Loading

The seed loader fills only an empty table. To add the sets to an existing database, use the admin import
(`POST /api/v1/admin/practice-sets/import` with the `--import-file` output) or, locally, `LocalPracticeImport` with that
file. Import replaces sets by slug, so loading the file again is safe and touches no other set, attempt or score.
