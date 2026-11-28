-- Job postings: what the employer itself states (Search Console, 24 Nov 2026: JobPosting data missing employmentType,
-- baseSalary and the street address and PIN code of jobLocation).
--
-- "Full-time" becomes an employment type of its own, for employers who say only that (schema.org FULL_TIME): a private
-- school's full-time post is not "regular" (permanent) in the sense government notices use.
ALTER TABLE site_update DROP CONSTRAINT ck_site_update_employment;
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_employment
    CHECK (employment_type IS NULL OR employment_type IN ('REGULAR', 'FULL_TIME', 'CONTRACT', 'PART_TIME', 'TEMPORARY'));

-- Doon International School, Bhubaneswar: its careers page marks every opening FULL_TIME in its own JobPosting data
-- (28 of 28 on 25 Nov 2026). The daily check now reads that field for new openings; these are the ones stored before.
UPDATE site_update
SET employment_type = 'FULL_TIME'
WHERE source_key = 'doon-international-bbsr' AND category = 'JOB' AND employment_type IS NULL AND NOT staff_edited;

-- The same notices, linked to the school's profile (its website is the careers page's site), so their job data carries
-- the campus address and PIN code from the profile. The source registry links new ones ("school" in sources.json).
UPDATE site_update
SET school_id = (SELECT id FROM school WHERE slug = 'doon-international-school-3')
WHERE source_key = 'doon-international-bbsr' AND school_id IS NULL
  AND EXISTS (SELECT 1 FROM school WHERE slug = 'doon-international-school-3');
