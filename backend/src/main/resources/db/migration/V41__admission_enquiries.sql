-- Admission enquiries from parents on a school's profile, worked by staff in the admin area. Only what is needed to
-- answer is kept: the parent's name, a phone number, an optional email, the class sought and a short message. The parent
-- must agree (consented_at) to the enquiry being shared with that school. Contact details are removed when the enquiry is
-- closed, leaving an anonymous record of demand per school and class.
CREATE TABLE admission_enquiry (
    id            BIGSERIAL     PRIMARY KEY,
    school_id     BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    parent_name   VARCHAR(100),
    phone         VARCHAR(15),
    email         VARCHAR(254),
    class_code    VARCHAR(20)   NOT NULL,
    academic_year VARCHAR(9),
    message       VARCHAR(1000),
    consented_at  TIMESTAMPTZ   NOT NULL,
    status        VARCHAR(12)   NOT NULL DEFAULT 'NEW',
    staff_note    VARCHAR(500),
    created_at    TIMESTAMPTZ   NOT NULL,
    updated_at    TIMESTAMPTZ,
    handled_by    VARCHAR(100),
    CONSTRAINT ck_enquiry_status CHECK (status IN ('NEW', 'FORWARDED', 'CLOSED'))
);
CREATE INDEX idx_admission_enquiry_status ON admission_enquiry (status, created_at DESC);
CREATE INDEX idx_admission_enquiry_school ON admission_enquiry (school_id);

-- Schools asking to manage their profile, and advertisers, write through the contact form under their own topics.
ALTER TABLE contact_message DROP CONSTRAINT ck_contact_topic;
ALTER TABLE contact_message ADD CONSTRAINT ck_contact_topic
    CHECK (topic IN ('FEEDBACK', 'CORRECTION', 'LISTING', 'RANKING', 'TECHNICAL', 'CLAIM', 'ADVERTISING'));
