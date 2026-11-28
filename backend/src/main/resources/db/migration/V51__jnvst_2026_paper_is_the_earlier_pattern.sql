-- The JNVST guide links the JNVST 2026 question paper (PYQ_English_2026.pdf on the NVS admission portal). Read on 27 Nov 2026:
-- its Mental Ability Test has 40 questions in ten parts and the paper has no EVS section, the pattern before JNVST 2027, which
-- has 20 Mental Ability questions in five parts and 20 EVS questions. The note now says so, and which of its questions are the
-- five types of the JNVST 2027 prospectus (as /exams/jnvst/mental-ability shows), so nobody practises it as the current test.
-- Only the "papers" key is replaced (jsonb ||); seed/exams.json holds the same value (ExamSeedMigrationTest).

UPDATE exam
SET content = content || '{"papers":[{"year":"2026","title":"JNVST 2026 question paper (English)","kind":"Question paper","url":"https://cbseitms.rcil.gov.in/nvs/assets/pdf/PYQ_English_2026.pdf","note":"Published on the NVS admission portal. Set in the earlier pattern: 40 Mental Ability questions in ten parts and no EVS section. Its Mental Ability questions 9–16, 21–28 and 37–40 are the five types in the JNVST 2027 test."},{"year":"2027 prospectus","title":"Solved sample questions for every section, with answers","kind":"Sample questions","url":"https://cbseitms.rcil.gov.in/nvs/assets/pdf/Final_Prospectus_2027.pdf","note":"Prospectus pages 19–29"}]}'::jsonb,
    updated_at = now()
WHERE slug = 'jnvst';
