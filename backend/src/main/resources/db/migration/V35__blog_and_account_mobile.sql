-- Blog posts, written by staff in the admin area. A post is public only while published_at is set.
CREATE TABLE blog_post (
    id                 BIGSERIAL PRIMARY KEY,
    slug               VARCHAR(160) NOT NULL UNIQUE,
    title              VARCHAR(160) NOT NULL,
    excerpt            VARCHAR(300) NOT NULL,
    body               TEXT         NOT NULL,
    category           VARCHAR(30)  NOT NULL,
    cover_image_url    VARCHAR(500),
    cover_image_alt    VARCHAR(200),
    author_name        VARCHAR(100) NOT NULL,
    author_bio         VARCHAR(400),
    meta_title         VARCHAR(70),
    meta_description   VARCHAR(170),
    published_at       TIMESTAMPTZ,
    created_at         TIMESTAMPTZ  NOT NULL,
    updated_at         TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_blog_category CHECK (category IN ('ADMISSIONS', 'BOARD_COMPARISON', 'FEES_SCHOLARSHIPS', 'PARENTING_TIPS', 'SCHOOL_REVIEWS'))
);

CREATE INDEX idx_blog_post_published ON blog_post (published_at DESC) WHERE published_at IS NOT NULL;

-- Optional, given at sign-up or in the profile, and removed with the account.
ALTER TABLE user_account ADD COLUMN mobile VARCHAR(10);
