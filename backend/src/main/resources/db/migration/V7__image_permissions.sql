-- Records why each image may be shown. Only images with a confirmed basis are published; PENDING and REVOKED
-- images are kept for the admin team but never served by the public API.
ALTER TABLE school_image ADD COLUMN thumbnail_url VARCHAR(600);
ALTER TABLE school_image ADD COLUMN attribution_text VARCHAR(500);
ALTER TABLE school_image ADD COLUMN permission_status VARCHAR(30) NOT NULL DEFAULT 'PENDING';
ALTER TABLE school_image ADD COLUMN permission_note VARCHAR(500);
ALTER TABLE school_image ADD COLUMN illustrative BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE school_image ADD CONSTRAINT ck_image_permission CHECK (permission_status IN
    ('PUBLIC_DOMAIN', 'OPEN_LICENCE', 'WRITTEN_PERMISSION', 'PURCHASED_LICENCE', 'OWN_WORK', 'PENDING', 'REVOKED'));
-- An illustration is never a logo: logos identify a real school and need the owner's permission.
ALTER TABLE school_image ADD CONSTRAINT ck_image_illustrative_not_logo CHECK (NOT (illustrative AND image_type = 'LOGO'));

-- Existing rows were hand-checked Wikimedia Commons files; classify them from their recorded licence.
UPDATE school_image SET permission_status = 'PUBLIC_DOMAIN'
 WHERE lower(license) IN ('public domain', 'cc0', 'cc0 1.0', 'pd');
UPDATE school_image SET permission_status = 'OPEN_LICENCE',
       attribution_text = concat_ws(', ', credit, license)
 WHERE permission_status = 'PENDING' AND license ILIKE 'CC BY%';

CREATE INDEX idx_school_image_permission ON school_image (school_id, permission_status);
