# Netarhat question bank builder

Builds the 25 Netarhat Paper 1 practice sets (500 original questions: Mental Ability, Hindi, Mathematics, Science and
Social Studies, 100 each, at Class 5 level) and writes them into `backend/src/main/resources/seed/practice.json`.

```
node tools/practice/netarhat/build.mjs backend/src/main/resources/seed/practice.json
```

- `maths.mjs` and `mental.mjs` generate questions from rules and compute every answer; the generator is seeded, so the
  output is the same on every run.
- `hindi.mjs`, `science.mjs` and `social.mjs` hold hand-written questions. Edit them there and re-run the build;
  re-running replaces the `netarhat-*` sets and never duplicates them.
- All questions are written by India School Finder. They follow the pattern in the school's advertisement no. 262
  (13.08.2026) but are not official or previous-year questions. Official sample papers are linked from `/exams/netarhat`.
- Load into a running server with the admin practice import (`POST /api/v1/admin/practice-sets/import`) or
  `LocalPracticeImport`.
