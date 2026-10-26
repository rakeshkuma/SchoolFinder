-- Updates and corrections suggested by schools or parents. Nothing here is published: an editor checks the cited
-- official page and applies the change through the normal, sourced admin tools. The optional reply e-mail is erased
-- when the submission is closed (accepted or rejected).
CREATE TABLE school_update_submission (
    id              BIGSERIAL     PRIMARY KEY,
    school_id       BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    topic           VARCHAR(20)   NOT NULL,
    message         VARCHAR(2000) NOT NULL,
    source_url      VARCHAR(500)  NOT NULL,
    submitter_role  VARCHAR(20)   NOT NULL,
    contact_email   VARCHAR(200),
    status          VARCHAR(20)   NOT NULL DEFAULT 'NEW',
    reviewer_note   VARCHAR(500),
    reviewed_by     VARCHAR(100),
    reviewed_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_submission_topic CHECK (topic IN ('FEES', 'ADMISSIONS', 'CLASSES', 'CONTACT', 'FACILITIES', 'PHOTOS',
        'CORRECTION', 'OTHER')),
    CONSTRAINT ck_submission_role CHECK (submitter_role IN ('SCHOOL', 'PARENT', 'OTHER')),
    CONSTRAINT ck_submission_status CHECK (status IN ('NEW', 'ACCEPTED', 'REJECTED'))
);
CREATE INDEX idx_submission_status_created ON school_update_submission (status, created_at);
