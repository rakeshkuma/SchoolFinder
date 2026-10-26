-- Delhi School Finder core schema.
-- Conventions: unknown facts are NULL (never 0 or placeholder text); money is NUMERIC(12,2);
-- every factual record carries a source_url, verification_status and last_verified_date.

CREATE TABLE education_board (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code         VARCHAR(20)  NOT NULL,
    name         VARCHAR(150) NOT NULL,
    website_url  VARCHAR(500),
    description  TEXT,
    CONSTRAINT uk_education_board_code UNIQUE (code)
);

CREATE TABLE school_class (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(20) NOT NULL,
    name        VARCHAR(50) NOT NULL,
    stage       VARCHAR(30) NOT NULL,
    sort_order  INT         NOT NULL,
    CONSTRAINT uk_school_class_code UNIQUE (code),
    CONSTRAINT ck_school_class_stage CHECK (stage IN ('PRE_PRIMARY', 'PRIMARY', 'MIDDLE', 'SECONDARY', 'SENIOR_SECONDARY'))
);

CREATE TABLE school (
    id                      BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name                    VARCHAR(200) NOT NULL,
    slug                    VARCHAR(220) NOT NULL,
    description             TEXT,
    school_type             VARCHAR(20)  NOT NULL,
    education_board_code    VARCHAR(20)  REFERENCES education_board (code),
    gender_type             VARCHAR(10),
    medium_of_instruction   VARCHAR(100),
    website_url             VARCHAR(500),
    admission_portal_url    VARCHAR(500),
    phone                   VARCHAR(120),
    email                   VARCHAR(150),
    address_line            VARCHAR(400),
    locality                VARCHAR(120),
    city                    VARCHAR(80)  NOT NULL DEFAULT 'Delhi',
    state                   VARCHAR(80)  NOT NULL DEFAULT 'Delhi',
    pin_code                VARCHAR(6),
    latitude                DOUBLE PRECISION,
    longitude               DOUBLE PRECISION,
    student_teacher_ratio   NUMERIC(6, 2),
    school_timings          VARCHAR(200),
    established_year        INT,
    has_transport           BOOLEAN,
    has_hostel              BOOLEAN,
    accessibility_features  TEXT,
    logo_url                VARCHAR(500),
    average_rating          NUMERIC(3, 2),
    review_count            INT          NOT NULL DEFAULT 0,
    source_url              VARCHAR(500) NOT NULL,
    source_retrieved_date   DATE,
    verification_status     VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date      DATE,
    active                  BOOLEAN      NOT NULL DEFAULT TRUE,
    version                 BIGINT       NOT NULL DEFAULT 0,
    created_at              TIMESTAMPTZ  NOT NULL,
    updated_at              TIMESTAMPTZ  NOT NULL,
    created_by              VARCHAR(100),
    updated_by              VARCHAR(100),
    CONSTRAINT uk_school_slug UNIQUE (slug),
    CONSTRAINT ck_school_type CHECK (school_type IN ('GOVERNMENT', 'PRIVATE', 'AIDED', 'INTERNATIONAL')),
    CONSTRAINT ck_school_gender CHECK (gender_type IS NULL OR gender_type IN ('CO_ED', 'BOYS', 'GIRLS')),
    CONSTRAINT ck_school_pin CHECK (pin_code IS NULL OR pin_code ~ '^[1-9][0-9]{5}$'),
    CONSTRAINT ck_school_lat CHECK (latitude IS NULL OR latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_school_lon CHECK (longitude IS NULL OR longitude BETWEEN -180 AND 180),
    CONSTRAINT ck_school_coordinates_pair CHECK ((latitude IS NULL) = (longitude IS NULL)),
    CONSTRAINT ck_school_ratio CHECK (student_teacher_ratio IS NULL OR student_teacher_ratio > 0),
    CONSTRAINT ck_school_rating CHECK (average_rating IS NULL OR average_rating BETWEEN 1 AND 5),
    CONSTRAINT ck_school_verification CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'OUTDATED', 'DISPUTED'))
);

-- Duplicate prevention: the same school name cannot appear twice at the same PIN code.
CREATE UNIQUE INDEX uk_school_name_pin ON school (lower(name), coalesce(pin_code, ''));
CREATE INDEX idx_school_name_lower ON school (lower(name));
CREATE INDEX idx_school_locality ON school (lower(locality));
CREATE INDEX idx_school_pin_code ON school (pin_code);
CREATE INDEX idx_school_board ON school (education_board_code);
CREATE INDEX idx_school_type ON school (school_type);
CREATE INDEX idx_school_active ON school (active);
CREATE INDEX idx_school_coordinates ON school (latitude, longitude);

CREATE TABLE school_class_offered (
    school_id BIGINT NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_id  BIGINT NOT NULL REFERENCES school_class (id),
    PRIMARY KEY (school_id, class_id)
);
CREATE INDEX idx_class_offered_class ON school_class_offered (class_id);

CREATE TABLE school_image (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    image_type           VARCHAR(20)  NOT NULL,
    url                  VARCHAR(600) NOT NULL,
    storage_public_id    VARCHAR(300),
    caption              VARCHAR(300),
    alt_text             VARCHAR(300) NOT NULL,
    credit               VARCHAR(200),
    license              VARCHAR(200) NOT NULL,
    source_url           VARCHAR(500) NOT NULL,
    width                INT,
    height               INT,
    sort_order           INT          NOT NULL DEFAULT 0,
    verification_status  VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date   DATE,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    CONSTRAINT ck_image_type CHECK (image_type IN ('LOGO', 'CAMPUS', 'CLASSROOM', 'LABORATORY', 'LIBRARY', 'SPORTS', 'EVENT', 'OTHER'))
);
CREATE INDEX idx_school_image_school ON school_image (school_id, sort_order);

CREATE TABLE school_fee (
    id                          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id                   BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_id                    BIGINT        NOT NULL REFERENCES school_class (id),
    academic_year               VARCHAR(7)    NOT NULL,
    registration_fee            NUMERIC(12, 2),
    admission_fee               NUMERIC(12, 2),
    monthly_tuition             NUMERIC(12, 2),
    tuition_months              INT           NOT NULL DEFAULT 12,
    annual_charges              NUMERIC(12, 2),
    development_charges         NUMERIC(12, 2),
    security_deposit            NUMERIC(12, 2),
    security_deposit_refundable BOOLEAN       NOT NULL DEFAULT TRUE,
    transport_monthly           NUMERIC(12, 2),
    transport_months            INT,
    books_uniform_estimate      NUMERIC(12, 2),
    other_charges               NUMERIC(12, 2),
    other_charges_description   VARCHAR(500),
    recurring_annual_official   NUMERIC(12, 2),
    first_year_official         NUMERIC(12, 2),
    currency                    VARCHAR(3)    NOT NULL DEFAULT 'INR',
    source_url                  VARCHAR(500)  NOT NULL,
    verification_status         VARCHAR(20)   NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date          DATE,
    notes                       TEXT,
    version                     BIGINT        NOT NULL DEFAULT 0,
    created_at                  TIMESTAMPTZ   NOT NULL,
    updated_at                  TIMESTAMPTZ   NOT NULL,
    created_by                  VARCHAR(100),
    updated_by                  VARCHAR(100),
    CONSTRAINT uk_school_fee_year UNIQUE (school_id, class_id, academic_year),
    CONSTRAINT ck_fee_academic_year CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
    CONSTRAINT ck_fee_tuition_months CHECK (tuition_months BETWEEN 1 AND 12),
    CONSTRAINT ck_fee_transport_months CHECK (transport_months IS NULL OR transport_months BETWEEN 1 AND 12),
    CONSTRAINT ck_fee_non_negative CHECK (
        coalesce(registration_fee, 0) >= 0 AND coalesce(admission_fee, 0) >= 0 AND
        coalesce(monthly_tuition, 0) >= 0 AND coalesce(annual_charges, 0) >= 0 AND
        coalesce(development_charges, 0) >= 0 AND coalesce(security_deposit, 0) >= 0 AND
        coalesce(transport_monthly, 0) >= 0 AND coalesce(books_uniform_estimate, 0) >= 0 AND
        coalesce(other_charges, 0) >= 0)
);
CREATE INDEX idx_school_fee_school_year ON school_fee (school_id, academic_year);
CREATE INDEX idx_school_fee_recurring ON school_fee (academic_year, recurring_annual_official);

CREATE TABLE admission_schedule (
    id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id                BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    class_id                 BIGINT       NOT NULL REFERENCES school_class (id),
    academic_year            VARCHAR(7)   NOT NULL,
    category                 VARCHAR(20)  NOT NULL,
    application_start_date   DATE,
    application_end_date     DATE,
    status                   VARCHAR(20)  NOT NULL,
    status_overridden        BOOLEAN      NOT NULL DEFAULT FALSE,
    status_override_reason   VARCHAR(500),
    age_eligibility          VARCHAR(500),
    selection_criteria       TEXT,
    official_notification_url VARCHAR(500),
    application_url          VARCHAR(500),
    source_url               VARCHAR(500) NOT NULL,
    verification_status      VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date       DATE,
    notes                    TEXT,
    version                  BIGINT       NOT NULL DEFAULT 0,
    created_at               TIMESTAMPTZ  NOT NULL,
    updated_at               TIMESTAMPTZ  NOT NULL,
    created_by               VARCHAR(100),
    updated_by               VARCHAR(100),
    CONSTRAINT uk_admission_cycle UNIQUE (school_id, class_id, academic_year, category),
    CONSTRAINT ck_admission_year CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$'),
    CONSTRAINT ck_admission_category CHECK (category IN ('GENERAL', 'EWS_DG', 'CWSN')),
    CONSTRAINT ck_admission_status CHECK (status IN ('UPCOMING', 'OPEN', 'CLOSED', 'NOT_ANNOUNCED')),
    CONSTRAINT ck_admission_dates CHECK (application_start_date IS NULL OR application_end_date IS NULL
        OR application_end_date >= application_start_date),
    CONSTRAINT ck_admission_override_reason CHECK (NOT status_overridden OR status_override_reason IS NOT NULL)
);
CREATE INDEX idx_admission_school ON admission_schedule (school_id, academic_year);
CREATE INDEX idx_admission_status ON admission_schedule (status, application_end_date);

CREATE TABLE admission_requirement (
    id                     BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    admission_schedule_id  BIGINT       NOT NULL REFERENCES admission_schedule (id) ON DELETE CASCADE,
    requirement_type       VARCHAR(30)  NOT NULL,
    description            VARCHAR(1000) NOT NULL,
    mandatory              BOOLEAN      NOT NULL DEFAULT TRUE,
    points                 INT,
    sort_order             INT          NOT NULL DEFAULT 0,
    CONSTRAINT ck_requirement_type CHECK (requirement_type IN ('DOCUMENT', 'ELIGIBILITY', 'SELECTION_CRITERION'))
);
CREATE INDEX idx_requirement_schedule ON admission_requirement (admission_schedule_id, sort_order);

CREATE TABLE school_facility (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    category             VARCHAR(30)  NOT NULL,
    name                 VARCHAR(150) NOT NULL,
    description          VARCHAR(1000),
    available            BOOLEAN,
    source_url           VARCHAR(500) NOT NULL,
    verification_status  VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date   DATE,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_facility_category CHECK (category IN ('SPORTS', 'LIBRARY', 'LABORATORY', 'COMPUTER', 'TRANSPORT',
        'HOSTEL', 'ACCESSIBILITY', 'EXTRACURRICULAR', 'ARTS', 'HEALTH', 'OTHER'))
);
CREATE UNIQUE INDEX uk_facility_school_name ON school_facility (school_id, category, lower(name));

CREATE TABLE ranking_criterion (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           VARCHAR(40)   NOT NULL,
    name           VARCHAR(120)  NOT NULL,
    description    VARCHAR(1000) NOT NULL,
    weight         NUMERIC(5, 2) NOT NULL,
    display_order  INT           NOT NULL,
    active         BOOLEAN       NOT NULL DEFAULT TRUE,
    version        BIGINT        NOT NULL DEFAULT 0,
    updated_at     TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT uk_ranking_criterion_code UNIQUE (code),
    CONSTRAINT ck_criterion_weight CHECK (weight >= 0 AND weight <= 100)
);

CREATE TABLE school_criterion_score (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    criterion_id         BIGINT        NOT NULL REFERENCES ranking_criterion (id),
    academic_year        VARCHAR(7)    NOT NULL,
    raw_score            NUMERIC(10, 2) NOT NULL,
    max_score            NUMERIC(10, 2) NOT NULL,
    normalized_score     NUMERIC(5, 2)  NOT NULL,
    evidence_notes       TEXT,
    source_url           VARCHAR(500)  NOT NULL,
    verification_status  VARCHAR(20)   NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date   DATE,
    version              BIGINT        NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ   NOT NULL,
    updated_at           TIMESTAMPTZ   NOT NULL,
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    CONSTRAINT uk_criterion_score UNIQUE (school_id, criterion_id, academic_year),
    CONSTRAINT ck_score_range CHECK (max_score > 0 AND raw_score >= 0 AND raw_score <= max_score),
    CONSTRAINT ck_score_year CHECK (academic_year ~ '^[0-9]{4}-[0-9]{2}$')
);

CREATE TABLE school_ranking (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    academic_year        VARCHAR(7)    NOT NULL,
    total_score          NUMERIC(5, 2) NOT NULL,
    rank_position        INT,
    provisional          BOOLEAN       NOT NULL,
    coverage_percent     NUMERIC(5, 2) NOT NULL,
    breakdown            JSONB         NOT NULL,
    methodology_version  VARCHAR(20)   NOT NULL,
    calculated_at        TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uk_school_ranking_year UNIQUE (school_id, academic_year),
    CONSTRAINT ck_ranking_position CHECK (rank_position IS NULL OR (rank_position > 0 AND NOT provisional))
);
CREATE INDEX idx_ranking_year_score ON school_ranking (academic_year, provisional, total_score DESC);

-- Independently published rankings (e.g. by magazines); never mixed with this site's own score.
CREATE TABLE ranking_source (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id            BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    publisher            VARCHAR(200) NOT NULL,
    ranking_name         VARCHAR(300) NOT NULL,
    ranking_year         VARCHAR(20)  NOT NULL,
    category             VARCHAR(200),
    rank_position        INT,
    score_text           VARCHAR(100),
    source_url           VARCHAR(500) NOT NULL,
    retrieved_date       DATE         NOT NULL,
    verification_status  VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    created_at           TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_ranking_source_school ON ranking_source (school_id);

CREATE TABLE school_review (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id        BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    reviewer_name    VARCHAR(80),
    relationship     VARCHAR(20)   NOT NULL,
    rating           SMALLINT      NOT NULL,
    title            VARCHAR(150)  NOT NULL,
    comment          VARCHAR(3000) NOT NULL,
    consent_given    BOOLEAN       NOT NULL,
    status           VARCHAR(20)   NOT NULL DEFAULT 'PENDING',
    moderation_note  VARCHAR(500),
    moderated_by     VARCHAR(100),
    moderated_at     TIMESTAMPTZ,
    created_at       TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_review_rating CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT ck_review_consent CHECK (consent_given),
    CONSTRAINT ck_review_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT ck_review_relationship CHECK (relationship IN ('PARENT', 'GUARDIAN', 'ALUMNUS', 'OTHER'))
);
CREATE INDEX idx_review_school_status ON school_review (school_id, status, created_at DESC);

CREATE TABLE data_source (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name               VARCHAR(200) NOT NULL,
    url                VARCHAR(500) NOT NULL,
    source_type        VARCHAR(30)  NOT NULL,
    publisher          VARCHAR(200),
    description        VARCHAR(1000),
    last_checked_date  DATE,
    active             BOOLEAN      NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_data_source_url UNIQUE (url),
    CONSTRAINT ck_data_source_type CHECK (source_type IN ('GOVERNMENT', 'EDUCATION_BOARD', 'SCHOOL_WEBSITE',
        'OFFICIAL_CIRCULAR', 'MAP_DATA', 'PUBLISHED_RANKING', 'OTHER'))
);

CREATE TABLE verification_history (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    entity_type      VARCHAR(40)  NOT NULL,
    entity_id        BIGINT       NOT NULL,
    school_id        BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    previous_status  VARCHAR(20),
    new_status       VARCHAR(20)  NOT NULL,
    source_url       VARCHAR(500) NOT NULL,
    notes            VARCHAR(1000),
    verified_by      VARCHAR(100) NOT NULL,
    verified_at      TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_verification_entity ON verification_history (entity_type, entity_id);
CREATE INDEX idx_verification_school ON verification_history (school_id, verified_at DESC);

CREATE TABLE admin_user (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username       VARCHAR(60)  NOT NULL,
    password_hash  VARCHAR(100) NOT NULL,
    role           VARCHAR(20)  NOT NULL,
    enabled        BOOLEAN      NOT NULL DEFAULT TRUE,
    last_login_at  TIMESTAMPTZ,
    version        BIGINT       NOT NULL DEFAULT 0,
    created_at     TIMESTAMPTZ  NOT NULL,
    updated_at     TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uk_admin_username UNIQUE (username),
    CONSTRAINT ck_admin_role CHECK (role IN ('ADMIN', 'EDITOR'))
);

CREATE TABLE admin_audit_log (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor        VARCHAR(100) NOT NULL,
    action       VARCHAR(60)  NOT NULL,
    entity_type  VARCHAR(40)  NOT NULL,
    entity_id    BIGINT,
    details      VARCHAR(2000),
    created_at   TIMESTAMPTZ  NOT NULL
);
CREATE INDEX idx_audit_created ON admin_audit_log (created_at DESC);
