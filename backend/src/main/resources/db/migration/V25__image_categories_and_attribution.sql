-- School photographs: more categories (main building, hostel, playground, school activities), and the author and
-- title as published at the source, kept apart from the display credit. (When an image was added is already recorded
-- in created_at.)
ALTER TABLE school_image DROP CONSTRAINT ck_image_type;
ALTER TABLE school_image ADD CONSTRAINT ck_image_type CHECK (image_type IN
    ('LOGO', 'CAMPUS', 'MAIN_BUILDING', 'CLASSROOM', 'HOSTEL', 'LIBRARY', 'PLAYGROUND', 'LABORATORY', 'SPORTS', 'EVENT',
     'ACTIVITIES', 'OTHER'));

ALTER TABLE school_image
    ADD COLUMN author VARCHAR(200),
    ADD COLUMN title  VARCHAR(300);
