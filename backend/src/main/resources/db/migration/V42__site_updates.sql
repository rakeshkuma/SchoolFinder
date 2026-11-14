-- Editorial updates for the home page's "Latest School & Exam Updates" and the updates page: notices an editor adds by
-- hand, such as teaching job alerts, each citing its official source. Exam notices, open admissions and new practice
-- sets are not stored here; the feed derives them from their own tables. Nothing is shown until an editor publishes
-- it, and an update disappears after its expiry date.
CREATE TABLE site_update (
    id                  BIGSERIAL     PRIMARY KEY,
    category            VARCHAR(12)   NOT NULL,
    title               VARCHAR(160)  NOT NULL,
    summary             VARCHAR(400)  NOT NULL,
    image_url           VARCHAR(600),
    published_on        DATE          NOT NULL,
    event_date          DATE,
    event_label         VARCHAR(60),
    deadline            BOOLEAN       NOT NULL DEFAULT FALSE,
    source_url          VARCHAR(600),
    source_name         VARCHAR(120),
    link_path           VARCHAR(300),
    action_label        VARCHAR(40),
    status              VARCHAR(10)   NOT NULL DEFAULT 'DRAFT',
    verification_status VARCHAR(12)   NOT NULL DEFAULT 'UNVERIFIED',
    expires_on          DATE,
    priority            INTEGER       NOT NULL DEFAULT 0,
    created_at          TIMESTAMPTZ   NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL,
    created_by          VARCHAR(100),
    updated_by          VARCHAR(100),
    CONSTRAINT ck_site_update_category CHECK (category IN ('ADMISSION', 'EXAM', 'PREP', 'JOB')),
    CONSTRAINT ck_site_update_status CHECK (status IN ('DRAFT', 'PUBLISHED', 'ARCHIVED')),
    CONSTRAINT ck_site_update_verification CHECK (verification_status IN ('VERIFIED', 'UNVERIFIED', 'OUTDATED', 'DISPUTED')),
    CONSTRAINT ck_site_update_source CHECK (category = 'PREP' OR source_url IS NOT NULL)
);
CREATE INDEX idx_site_update_published ON site_update (status, published_on DESC);
