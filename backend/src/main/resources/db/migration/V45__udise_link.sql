-- UDISE+ (Know Your School) links on school profiles. Additive and nullable: no row is changed, and a null column takes
-- no space, so the 33,000 schools without UDISE details cost nothing.
--
-- school.udise_code (V4: VARCHAR(11), eleven digits, unique) stays the place for the code itself.
--
-- A direct Know Your School address is not built from the code: the portal's own links are
-- /#/schooldetail/{its internal school id}/{academic year id}, which a code alone does not give. A direct link is stored
-- only after an editor has found the school on the portal and checked that the page shows this school; every other
-- school links to the portal's search.

ALTER TABLE school ADD COLUMN udise_profile_url VARCHAR(120);
ALTER TABLE school ADD COLUMN udise_verified_on DATE;
-- VERIFIED_MATCH: the code (and link, if any) is confirmed for this school. PENDING_REVIEW: a matching run found
-- candidates that need a person. NOT_MATCHED: a matching run found nothing. Null: never checked.
ALTER TABLE school ADD COLUMN udise_match_status VARCHAR(16);

ALTER TABLE school ADD CONSTRAINT ck_school_udise_match_status
    CHECK (udise_match_status IS NULL OR udise_match_status IN ('VERIFIED_MATCH', 'PENDING_REVIEW', 'NOT_MATCHED'));
-- Only the official portal, over https, and only a school-detail page.
ALTER TABLE school ADD CONSTRAINT ck_school_udise_profile_url
    CHECK (udise_profile_url IS NULL OR udise_profile_url ~ '^https://kys\.udiseplus\.gov\.in/#/schooldetail1?/[0-9]{1,20}/[0-9]{1,4}$');

-- Rollback (if ever needed):
-- ALTER TABLE school DROP CONSTRAINT ck_school_udise_profile_url, DROP CONSTRAINT ck_school_udise_match_status,
--     DROP COLUMN udise_match_status, DROP COLUMN udise_verified_on, DROP COLUMN udise_profile_url;
