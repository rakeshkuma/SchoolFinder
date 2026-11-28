# Netarhat question bank builder

Builds the 25 Netarhat Paper 1 practice quizzes (500 original questions: Mental Ability, Hindi, Mathematics, Science and
Social Studies, 100 each, at Class 5 level) and two full Paper 1 mock tests (`netarhat-paper1-mock-1`, `-2`: 100 new
questions each, 20 per subject in paper order, 150 minutes, 1 mark, no negative marking), and writes them into
`backend/src/main/resources/seed/practice.json`. They power the dashboard at `/exams/netarhat`
(`frontend/src/content/netarhatPrep.ts`).

```
node tools/practice/netarhat/build.mjs backend/src/main/resources/seed/practice.json
```

- `maths.mjs` and `mental.mjs` generate questions from rules and compute every answer; the generator is seeded, so the
  output is the same on every run.
- `hindi.mjs`, `science.mjs` and `social.mjs` hold hand-written questions. Edit them there and re-run the build;
  re-running replaces the `netarhat-*` sets in place and never duplicates them.
- `mock.mjs` holds the hand-written Hindi, Science and Social Studies questions used only in the mocks. They are kept
  apart because the quizzes draw distractors from whole tables: adding rows to `hindi.mjs` would change live quizzes.
  The mocks use their own seed and skip every question already in a quiz, so the quizzes do not change.
- All questions are written by SchoolDhundo. They follow the pattern in the school's advertisement no. 262
  (13.08.2026) but are not official or previous-year questions. Past papers (marked "copyright reserved") were used
  only to understand the style and level; nothing is copied from them. Only the sample papers the school publishes on
  its own website are linked, from `/exams/netarhat` and its guide.
- Load into a running server with the admin practice import (`POST /api/v1/admin/practice-sets/import`) or
  `LocalPracticeImport`.
