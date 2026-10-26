-- Ranking methodology 2.0: documented facts (facility checklists, published student-teacher ratio) can score
-- criteria, but only verified evidence counts toward the coverage needed for a definitive rank.
ALTER TABLE school_ranking ADD COLUMN verified_coverage_percent NUMERIC(5, 2) NOT NULL DEFAULT 0;

UPDATE ranking_criterion SET description = 'Student-teacher ratio when officially published (20:1 or better = 100, 40:1 or worse = 0), or a verified score for teacher qualifications and inspection findings.'
WHERE code = 'TEACHING_QUALITY';
UPDATE ranking_criterion SET description = 'Share of a fixed checklist (library, science laboratory, computer lab) documented by a cited source, or a verified inspection score.'
WHERE code = 'INFRASTRUCTURE';
UPDATE ranking_criterion SET description = 'Share of a fixed checklist (sports facilities, co-curricular programmes, arts) documented by a cited source, or a verified score.'
WHERE code = 'SPORTS_EXTRACURRICULAR';
UPDATE ranking_criterion SET description = 'Share of a fixed checklist (school transport, barrier-free access / CWSN support) documented by a cited source, or a verified score.'
WHERE code = 'ACCESSIBILITY_TRANSPORT';
