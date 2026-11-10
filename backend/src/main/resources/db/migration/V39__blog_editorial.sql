-- Blog editorial workflow and article details. Existing columns and category codes are kept, so nothing that used them
-- changes; a post is public only when its status is PUBLISHED and its publication time has come (scheduling).
ALTER TABLE blog_post DROP CONSTRAINT ck_blog_category;
ALTER TABLE blog_post ADD CONSTRAINT ck_blog_category CHECK (category IN ('ADMISSIONS', 'BOARDING_SCHOOLS', 'GOVERNMENT_SCHOOLS',
    'ENTRANCE_EXAMS', 'EDUCATION_NEWS', 'PARENTING_TIPS', 'BOARD_COMPARISON', 'SCHOOL_REVIEWS', 'FEES_SCHOLARSHIPS'));

ALTER TABLE blog_post
    -- Draft, then fact check, editorial review and approval before publication.
    ADD COLUMN status           VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    ADD COLUMN featured         BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Paid content is labelled "Sponsored" wherever it appears.
    ADD COLUMN sponsored        BOOLEAN      NOT NULL DEFAULT FALSE,
    -- Comma-separated topics, e.g. "JNVST, Class 6, admission".
    ADD COLUMN tags             VARCHAR(300),
    -- The day the facts were last checked against the sources below.
    ADD COLUMN last_reviewed_on DATE,
    ADD CONSTRAINT ck_blog_status CHECK (status IN ('DRAFT', 'FACT_CHECK', 'REVIEW', 'APPROVED', 'PUBLISHED'));

UPDATE blog_post SET status = 'PUBLISHED' WHERE published_at IS NOT NULL;

-- Sources an article relies on (official notices first), each with the day it was checked.
CREATE TABLE blog_post_source (
    post_id    BIGINT       NOT NULL REFERENCES blog_post (id) ON DELETE CASCADE,
    position   INT          NOT NULL,
    title      VARCHAR(200) NOT NULL,
    url        VARCHAR(500) NOT NULL,
    checked_on DATE,
    PRIMARY KEY (post_id, position)
);

-- Questions and answers shown at the end of an article.
CREATE TABLE blog_post_faq (
    post_id  BIGINT        NOT NULL REFERENCES blog_post (id) ON DELETE CASCADE,
    position INT           NOT NULL,
    question VARCHAR(300)  NOT NULL,
    answer   VARCHAR(2000) NOT NULL,
    PRIMARY KEY (post_id, position)
);

CREATE INDEX idx_blog_post_status ON blog_post (status, published_at DESC);
