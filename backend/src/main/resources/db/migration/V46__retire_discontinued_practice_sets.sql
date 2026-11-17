-- Retires the practice sets of three discontinued features (2026-11-17): Class 10 preparation (class10-maths-1),
-- Class 12 preparation (class12-maths-1, class12-physics-1) and government & competitive exams
-- (competitive-aptitude-1, the only COMPETITIVE set).
--
-- They are unpublished, not deleted: published = false takes them out of the question bank, the practice centre,
-- new sessions, the daily quiz, the sitemap and their own pages, through the same switch as the admin page. The rows
-- stay because members' past attempts and leaderboard points refer to their questions by id (no foreign key, but
-- history); those attempts, points, bookmarks and reports are not touched. An editor can publish a set again from the
-- admin practice page. Nothing else changes: the rows are chosen by slug, and only those still published.
WITH retired AS (
    UPDATE practice_set
    SET published = FALSE, updated_at = now()
    WHERE slug IN ('class10-maths-1', 'class12-maths-1', 'class12-physics-1', 'competitive-aptitude-1')
      AND published
    RETURNING id, slug, category, jsonb_array_length(content -> 'questions') AS questions
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'PRACTICE_SET_RETIRED', 'PRACTICE_SET', id,
       'Unpublished ' || slug || ' (' || category || ', ' || questions || ' questions): discontinued feature '
           || CASE slug WHEN 'class10-maths-1' THEN 'Class 10 preparation'
                        WHEN 'competitive-aptitude-1' THEN 'Government & competitive exams'
                        ELSE 'Class 12 preparation' END
           || '. Kept for members'' history; no attempt, point or bookmark changed. Migration V46.',
       now()
FROM retired;
