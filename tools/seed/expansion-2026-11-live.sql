-- Clean-ups for the 2026-11 SARAS expansion that the admin API cannot do: merges of a curated profile with the
-- board-list twin the import created (the twin's affiliation number moves to the curated record, the twin is deleted;
-- child rows cascade as in LocalMergeDuplicates), and renames of schools whose name repeated in their district
-- (the stored name is changed only while it still carries the list name, as LocalRenameSchools does).
-- Run on the live database AFTER data/saras/import/expansion-2026-11-*.csv has been imported, inside one transaction;
-- then re-import the seven merged schools' CSV rows so the curated records receive their CBSE details.
-- Keyed by affiliation number and current name, never by id. Applied locally on 2026-11-13 with the Java tools.
BEGIN;

-- Merges: curated record (no real affiliation number) absorbs the twin.
CREATE TEMP TABLE merge_pairs (keep_name text, affiliation text) ON COMMIT DROP;
INSERT INTO merge_pairs VALUES
  ('Scindia Kanya Vidyalaya', '1030005'),
  ('The Emerald Heights International School', '1030042'),
  ('Chettinad Vidyashram', '1930137'),
  ('Chinmaya International Residential School', '1930154'),
  ('Jain International Residential School', '830070'),
  ('Vidya Devi Jindal School', '530042'),
  ('Eklavya Model Residential School, Mathasoola', '1720266');

-- Each pair must resolve to exactly one curated record and one twin, or nothing happens for it.
CREATE TEMP TABLE merge_plan ON COMMIT DROP AS
SELECT p.affiliation,
       (SELECT s.id FROM school s WHERE s.name = p.keep_name AND s.state_code = t.state_code
          AND (s.affiliation_number IS NULL OR s.affiliation_number !~ '^[0-9]{6,8}$')) AS keep_id,
       t.id AS twin_id, t.pin_code, t.education_board_code
FROM merge_pairs p
JOIN school t ON t.affiliation_number = p.affiliation AND t.name = p.keep_name;

SELECT * FROM merge_plan;  -- review: every row needs a keep_id

UPDATE school s SET affiliation_number = m.affiliation,
                    education_board_code = coalesce(s.education_board_code, m.education_board_code),
                    pin_code = coalesce(s.pin_code, m.pin_code)
FROM merge_plan m WHERE s.id = m.keep_id AND m.keep_id IS NOT NULL AND m.keep_id <> m.twin_id
  AND NOT EXISTS (SELECT 1 FROM school x WHERE x.affiliation_number = m.affiliation AND x.id <> m.twin_id);
-- The twin keeps its number until the kept record has taken it, so the unique index never clashes: delete first.
DELETE FROM school s USING merge_plan m WHERE s.id = m.twin_id AND m.keep_id IS NOT NULL AND m.keep_id <> m.twin_id;
UPDATE school s SET affiliation_number = m.affiliation,
                    education_board_code = coalesce(s.education_board_code, m.education_board_code),
                    pin_code = coalesce(s.pin_code, m.pin_code)
FROM merge_plan m WHERE s.id = m.keep_id AND s.affiliation_number IS DISTINCT FROM m.affiliation;

-- Renames: list name -> name with a place from the school's own address (saras-name-overrides.json).
CREATE TEMP TABLE renames (affiliation text, old_name text, new_name text) ON COMMIT DROP;
INSERT INTO renames VALUES
  ('330018', 'DAV Public School, Patna', 'DAV Public School, Khagaul'),
  ('330066', 'D A V Public School, Patna', 'DAV Public School, Phulwari Sharif'),
  ('330027', 'D A V Public School, Gaya', 'DAV Public School, Cantonment Area, Gaya'),
  ('330101', 'DAV Public School, Gaya', 'DAV Public School, College Road, Gaya'),
  ('700031', 'PM SHRI Kendriya Vidyalaya, Kathua', 'PM SHRI Kendriya Vidyalaya Hiranagar, Kathua'),
  ('900010', 'PM SHRI Kendriya Vidyalaya, Kannur', 'PM SHRI Kendriya Vidyalaya Burnacherry, Kannur'),
  ('900020', 'PM SHRI Kendriya Vidyalaya, Kannur', 'PM SHRI Kendriya Vidyalaya Kannur University Campus'),
  ('1000051', 'PM SHRI Kendriya Vidyalaya, Khargone', 'PM SHRI Kendriya Vidyalaya CISF Barwaha'),
  ('1100027', 'PM SHRI Kendriya Vidyalaya, Pune', 'PM SHRI Kendriya Vidyalaya CME Pune'),
  ('1100038', 'PM SHRI Kendriya Vidyalaya, Pune', 'PM SHRI Kendriya Vidyalaya Wanwari, Pune'),
  ('1700030', 'PM SHRI Kendriya Vidyalaya, Tonk', 'PM SHRI Kendriya Vidyalaya CISF Deoli, Tonk'),
  ('1900006', 'PM SHRI Kendriya Vidyalaya, Chennai', 'PM SHRI Kendriya Vidyalaya CLRI Adyar, Chennai'),
  ('1900022', 'PM SHRI Kendriya Vidyalaya, Chennai', 'PM SHRI Kendriya Vidyalaya DGQA Pazhavanthangal, Chennai'),
  ('1900028', 'PM SHRI Kendriya Vidyalaya, Chennai', 'PM SHRI Kendriya Vidyalaya Anna Nagar, Chennai'),
  ('2762027', 'Govt Sarvodaya Girls Sr Sec, East Delhi', 'Govt Sarvodaya Girls Sr Sec School No. 1, Shakarpur'),
  ('2762033', 'Govt Sarvodaya Girls Sr. Sec, East Delhi', 'Govt Sarvodaya Girls Sr Sec School No. 2, Shakarpur'),
  ('2762058', 'Govt Girls Sr.sec School, East Delhi', 'Govt Girls Sr Sec School, Nand Nagri'),
  ('2762078', 'Govt Girls Sr Sec School, East Delhi', 'Govt Girls Sr Sec School, Shakarpur'),
  ('2768011', 'Govt Girls Sr Sec School, North Delhi', 'Govt Girls Sr Sec School, Kinari Bazar'),
  ('2768028', 'Govt Girls Sr Sec School, North Delhi', 'Govt Girls Sr Sec School, Ballimaran');

UPDATE school s SET name = r.new_name FROM renames r
WHERE s.affiliation_number = r.affiliation AND s.name = r.old_name;

SELECT affiliation_number, name FROM school WHERE affiliation_number IN (SELECT affiliation FROM renames) ORDER BY 1;  -- review

COMMIT;
