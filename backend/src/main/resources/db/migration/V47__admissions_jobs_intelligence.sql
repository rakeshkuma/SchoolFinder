-- Admissions and school jobs found on official websites, with the facts a parent or a teacher needs, a page of their
-- own, and a registry of the official sources the daily check reads.
--
-- Everything here is additive: new nullable columns on site_update (existing rows keep working unchanged and are
-- filled in by the daily check), and three new tables. Nothing is dropped, renamed or rewritten.
--
-- Rule kept from V43: a fact is stored only when the official source states it. A column left NULL means "not given by
-- the official source", and the site says so; it is never guessed or estimated.

-- --- site_update: the facts of an admission or a job notice -------------------------------------------------------

-- Address of the notice's own page (/jobs/{slug} or /admissions/{slug}). Set once and never changed, so links stay valid.
ALTER TABLE site_update ADD COLUMN slug VARCHAR(170);
-- Who is admitting or hiring (a school, a school system or a recruitment body), and the campus when it has several.
ALTER TABLE site_update ADD COLUMN institution_name VARCHAR(160);
ALTER TABLE site_update ADD COLUMN campus VARCHAR(120);
-- The school's profile on this site, when the notice is one school's own.
ALTER TABLE site_update ADD COLUMN school_id BIGINT REFERENCES school (id) ON DELETE SET NULL;
-- GOVERNMENT or PRIVATE, and whether the institution is residential (boarding).
ALTER TABLE site_update ADD COLUMN sector VARCHAR(12);
ALTER TABLE site_update ADD COLUMN boarding BOOLEAN;
-- Where: a state code (as in the state table) and a city or town; NULL for notices that cover all of India.
ALTER TABLE site_update ADD COLUMN state_code VARCHAR(2);
ALTER TABLE site_update ADD COLUMN city VARCHAR(80);
-- What kind of notice it is: an OPENING (applications invited), or a later step of one (RESULT, ADMIT_CARD, SCHEDULE,
-- CORRIGENDUM, EXTENSION), or OTHER. Openings are what the Admissions and Jobs lists put first.
ALTER TABLE site_update ADD COLUMN notice_type VARCHAR(12);
-- Application window and exam (or interview) date, only as the official source states them. The publication date
-- (published_on) is a different thing and is never used as either.
ALTER TABLE site_update ADD COLUMN opens_on DATE;
ALTER TABLE site_update ADD COLUMN closes_on DATE;
ALTER TABLE site_update ADD COLUMN exam_on DATE;
-- Admissions: the academic session ("2027-28") and the classes ("VI, IX") the notice names.
ALTER TABLE site_update ADD COLUMN academic_session VARCHAR(9);
ALTER TABLE site_update ADD COLUMN classes VARCHAR(80);
-- Jobs: post types (codes such as PGT,TGT,PRT,PRINCIPAL), subjects, teaching or not, kind of employment, number of posts.
ALTER TABLE site_update ADD COLUMN post_types VARCHAR(160);
ALTER TABLE site_update ADD COLUMN subjects VARCHAR(240);
ALTER TABLE site_update ADD COLUMN staff_kind VARCHAR(14);
ALTER TABLE site_update ADD COLUMN employment_type VARCHAR(12);
ALTER TABLE site_update ADD COLUMN vacancies INTEGER;
-- Requirements and terms, in the official notice's own words (entered or confirmed by an editor).
ALTER TABLE site_update ADD COLUMN eligibility VARCHAR(600);
ALTER TABLE site_update ADD COLUMN experience VARCHAR(300);
ALTER TABLE site_update ADD COLUMN tet_requirement VARCHAR(200);
ALTER TABLE site_update ADD COLUMN age_limit VARCHAR(200);
ALTER TABLE site_update ADD COLUMN salary_text VARCHAR(200);
ALTER TABLE site_update ADD COLUMN application_fee VARCHAR(200);
ALTER TABLE site_update ADD COLUMN selection_process VARCHAR(400);
-- The official application page, when it is not the notice itself.
ALTER TABLE site_update ADD COLUMN apply_url VARCHAR(600);

ALTER TABLE site_update ADD CONSTRAINT ck_site_update_sector CHECK (sector IS NULL OR sector IN ('GOVERNMENT', 'PRIVATE'));
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_notice_type
    CHECK (notice_type IS NULL OR notice_type IN ('OPENING', 'EXTENSION', 'CORRIGENDUM', 'SCHEDULE', 'ADMIT_CARD', 'RESULT', 'OTHER'));
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_staff_kind
    CHECK (staff_kind IS NULL OR staff_kind IN ('TEACHING', 'NON_TEACHING', 'MIXED'));
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_employment
    CHECK (employment_type IS NULL OR employment_type IN ('REGULAR', 'CONTRACT', 'PART_TIME', 'TEMPORARY'));
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_vacancies CHECK (vacancies IS NULL OR vacancies > 0);
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_window CHECK (opens_on IS NULL OR closes_on IS NULL OR opens_on <= closes_on);

CREATE UNIQUE INDEX ux_site_update_slug ON site_update (slug) WHERE slug IS NOT NULL;
-- The Admissions and Jobs lists filter published notices of one category, often by state.
CREATE INDEX idx_site_update_category_status ON site_update (category, status, state_code);
CREATE INDEX idx_site_update_school ON site_update (school_id) WHERE school_id IS NOT NULL;

-- --- the posts of a recruitment notice ----------------------------------------------------------------------------

-- One recruitment notice often advertises several posts (PGT Physics, TGT Maths, Librarian...). Each is a row here,
-- read from the notice's title (origin TITLE) or entered by an editor from the notice (origin EDITOR).
CREATE TABLE site_update_position (
    id              BIGSERIAL     PRIMARY KEY,
    site_update_id  BIGINT        NOT NULL REFERENCES site_update (id) ON DELETE CASCADE,
    post_name       VARCHAR(120)  NOT NULL,
    post_type       VARCHAR(20),
    subject         VARCHAR(80),
    post_code       VARCHAR(40),
    vacancies       INTEGER,
    pay_scale       VARCHAR(120),
    qualification   VARCHAR(400),
    sort_order      INTEGER       NOT NULL DEFAULT 0,
    origin          VARCHAR(8)    NOT NULL DEFAULT 'TITLE',
    CONSTRAINT ck_position_origin CHECK (origin IN ('TITLE', 'EDITOR')),
    CONSTRAINT ck_position_vacancies CHECK (vacancies IS NULL OR vacancies > 0)
);
CREATE INDEX idx_position_update ON site_update_position (site_update_id, sort_order);

-- --- registry of official sources --------------------------------------------------------------------------------

-- Every official website the daily check reads, with who runs it, what it publishes, how it is read, and how its last
-- checks went. The definitions come from the application (built-in adapters and the reviewed source list in
-- notifications/sources.json) and are written here on each run; the check fills in the health columns. Staff see this
-- table; the public site never does.
CREATE TABLE notification_source (
    source_key            VARCHAR(40)   PRIMARY KEY,
    name                  VARCHAR(160)  NOT NULL,
    institution           VARCHAR(160),
    official_domain       VARCHAR(120),
    listing_url           VARCHAR(600)  NOT NULL,
    -- RECRUITMENT_BODY, SCHOOL_SYSTEM, SCHOOL, EXAM_BODY, EDUCATION_DEPARTMENT
    source_category       VARCHAR(24)   NOT NULL,
    sector                VARCHAR(12),
    boarding              BOOLEAN,
    state_code            VARCHAR(2),
    city                  VARCHAR(80),
    -- Comma-separated categories it publishes: ADMISSION, EXAM, JOB
    notice_types          VARCHAR(60)   NOT NULL,
    -- API, WP_MEDIA, S3WAAS_DOCS, HTML_ITEMS, HTML (built-in adapters)
    extraction_method     VARCHAR(20)   NOT NULL,
    -- OFFICIAL_PORTAL (a government or examining body's own site) or OFFICIAL_SCHOOL_SITE (the school's own site)
    reliability           VARCHAR(24)   NOT NULL,
    auto_publish          BOOLEAN       NOT NULL,
    enabled               BOOLEAN       NOT NULL,
    school_id             BIGINT        REFERENCES school (id) ON DELETE SET NULL,
    last_attempt_at       TIMESTAMPTZ,
    last_success_at       TIMESTAMPTZ,
    -- OK, FAILED, BLOCKED or SKIPPED, as in the run details
    last_outcome          VARCHAR(10),
    last_error            VARCHAR(300),
    consecutive_failures  INTEGER       NOT NULL DEFAULT 0,
    last_listed           INTEGER,
    last_relevant         INTEGER,
    registered_at         TIMESTAMPTZ   NOT NULL,
    updated_at            TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_source_sector CHECK (sector IS NULL OR sector IN ('GOVERNMENT', 'PRIVATE'))
);
