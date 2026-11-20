-- Correct the name and category of the IIRF 2026 list. No rank changes.
--
-- The 2026 list recorded in V34 (91 directory schools, positions 1 to 128) is IIRF's main "Top (10+2) Schools in
-- India Ranking 2026" table. IIRF's own page (https://iirfranking.com/ranking/top-schools-india, checked on
-- 14 Nov 2026) begins that ranking with Army Public School, Dhaula Kuan; Johnson Grammar School, Hyderabad; Army Public
-- School, Hisar; Delhi Public School, Bangalore North; then Bal Bharati Public School, Gangaram and St. Xavier's Senior
-- Secondary School, Raj Niwas Marg (tied), exactly the order stored here.
--
-- It was labelled "Best Schools in Academic Performance", which is a different, separate top-10 table on the same
-- page (led by Delhi Public School, Bengaluru North). That table is not recorded here: IIRF's terms require written
-- permission to reproduce its lists.
--
-- Only the list's name and category change. Ranks, schools, sources and verification dates are untouched, and the
-- change is written to the audit log.

INSERT INTO ranking_category (code, name, family, display_order)
VALUES ('OVERALL', 'Top (10+2) Schools in India', 'OVERALL', 5)
ON CONFLICT (code) DO NOTHING;

WITH changed AS (
    UPDATE ranking_edition e
    SET name = 'Top (10+2) Schools in India',
        category_id = (SELECT id FROM ranking_category WHERE code = 'OVERALL')
    FROM ranking_publisher p
    WHERE p.id = e.publisher_id AND p.code = 'IIRF' AND e.ranking_year = '2026'
      AND e.name = 'Top (10+2) Schools in India: Best Schools in Academic Performance'
    RETURNING e.id
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'RANKING_LIST_RELABELLED', 'RANKING_EDITION', id,
       'IIRF 2026: "Top (10+2) Schools in India: Best Schools in Academic Performance" (category Academic performance) '
           || 'renamed "Top (10+2) Schools in India" (category overall). IIRF''s page shows these positions under its main '
           || '"Top (10+2) Schools in India Ranking 2026"; "Best Schools In Academic Performance" is a separate top-10 table. '
           || 'No rank changed. Migration V44.',
       now()
FROM changed;

UPDATE ranking_source r
SET ranking_name = 'Top (10+2) Schools in India'
FROM ranking_publisher p
WHERE p.id = r.publisher_id AND p.code = 'IIRF' AND r.ranking_year = '2026'
  AND r.ranking_name = 'Top (10+2) Schools in India: Best Schools in Academic Performance';
