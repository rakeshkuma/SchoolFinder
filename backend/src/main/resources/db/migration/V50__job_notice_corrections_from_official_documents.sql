-- Corrections taken from the official documents on 26 Nov 2026, while every current job notice was read for published pay
-- (none of the 37 states any). Each is what an editor would enter in the admin: marked staff-edited, so the daily check
-- keeps it, and recorded in the audit log. Every change applies only if the record is still as it was found.

-- Mayo College General Council, Ajmer: both advertisements (images on mayocollege.com) say "LAST DATE TO APPLY:
-- 25 November 2026". The daily check reads no date from an image, so both were listed as open without a last date.
-- With it they move to past jobs, as an opening does after its last date.
WITH fixed AS (
    UPDATE site_update
    SET closes_on = DATE '2026-11-25', expires_on = DATE '2026-11-25', event_date = DATE '2026-11-25',
        event_label = 'Last date', deadline = TRUE, staff_edited = TRUE, updated_at = now()
    WHERE slug IN ('mayo-college-engineering-associate-mcgc', 'mayo-college-lead-engineer-mcgc') AND closes_on IS NULL
    RETURNING id, slug
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'NOTICE_CORRECTED', 'SITE_UPDATE', id,
       'Last date 25 Nov 2026, as the official advertisement states (' || slug || '). Migration V50.', now()
FROM fixed;

-- PM SHRI Kendriya Vidyalaya Thrissur: "Walk in interview for PGT Maths and Hindi- 26/11", published on 22 Nov 2026, so
-- the interview is on 26 Nov 2026 (the title gives the day without the year).
WITH fixed AS (
    UPDATE site_update
    SET closes_on = DATE '2026-11-26', expires_on = DATE '2026-11-26', event_date = DATE '2026-11-26',
        event_label = 'Walk-in interview', deadline = TRUE, staff_edited = TRUE, updated_at = now()
    WHERE slug = 'pm-shri-kendriya-vidyalaya-thrissur-walk-in-interview-for-pgt-maths-and' AND closes_on IS NULL
    RETURNING id, slug
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'NOTICE_CORRECTED', 'SITE_UPDATE', id,
       'Walk-in interview on 26 Nov 2026, as the official title "… 26/11" (published 22 Nov 2026) states (' || slug
           || '). Migration V50.', now()
FROM fixed;

-- Kendriya Vidyalaya RWF Yelahanka, Bengaluru: PIN 560064 on its own website's contact page (the website its profile
-- lists) and on the letterhead of its walk-in notice of November 2026; the profile had 560106. Job data now carries the
-- profile's address, so the PIN must be the school's own.
WITH fixed AS (
    UPDATE school
    SET pin_code = '560064', updated_at = now()
    WHERE slug = 'kendriya-vidyalaya-rail-wheel-factory-yelahanka-bangalore' AND pin_code = '560106'
    RETURNING id
)
INSERT INTO admin_audit_log (actor, action, entity_type, entity_id, details, created_at)
SELECT 'system', 'SCHOOL_CORRECTED', 'SCHOOL', id,
       'PIN code 560106 -> 560064, as the Vidyalaya''s website (contact page) and its walk-in notice of Nov 2026 state. '
           || 'Migration V50.', now()
FROM fixed;
