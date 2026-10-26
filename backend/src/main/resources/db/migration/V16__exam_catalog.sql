-- School entrance exams and admission selection processes. Each record cites official sources and carries the date it
-- was last checked against them. Dates are stored per cycle and marked confirmed (stated in an official notice) or
-- tentative; statuses and countdowns are derived only from confirmed dates.
CREATE TABLE exam (
    id                    BIGSERIAL     PRIMARY KEY,
    slug                  VARCHAR(80)   NOT NULL UNIQUE,
    short_name            VARCHAR(40)   NOT NULL,
    name                  VARCHAR(250)  NOT NULL,
    kind                  VARCHAR(20)   NOT NULL,
    conducting_authority  VARCHAR(300)  NOT NULL,
    scope                 VARCHAR(10)   NOT NULL,
    state_codes           JSONB         NOT NULL DEFAULT '[]',
    school_types          JSONB         NOT NULL DEFAULT '[]',
    entry_classes         JSONB         NOT NULL DEFAULT '[]',
    boarding              VARCHAR(10)   NOT NULL,
    application_free      BOOLEAN,
    exam_mode             VARCHAR(20),
    current_cycle         VARCHAR(40)   NOT NULL,
    academic_session      VARCHAR(9),
    summary               VARCHAR(1000) NOT NULL,
    content               JSONB         NOT NULL,
    display_order         INT           NOT NULL DEFAULT 100,
    last_verified_on      DATE,
    verification_status   VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    published             BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at            TIMESTAMPTZ   NOT NULL,
    updated_at            TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_exam_kind CHECK (kind IN ('ENTRANCE_TEST', 'SELECTION_PROCESS')),
    CONSTRAINT ck_exam_scope CHECK (scope IN ('NATIONAL', 'STATE')),
    CONSTRAINT ck_exam_boarding CHECK (boarding IN ('BOARDING', 'DAY', 'BOTH')),
    CONSTRAINT ck_exam_mode CHECK (exam_mode IS NULL OR exam_mode IN ('PEN_PAPER', 'COMPUTER', 'NO_WRITTEN_TEST')),
    CONSTRAINT ck_exam_verification CHECK (verification_status IN ('VERIFIED', 'NEEDS_REVIEW', 'DRAFT'))
);

CREATE TABLE exam_date (
    id                BIGSERIAL     PRIMARY KEY,
    exam_id           BIGINT        NOT NULL REFERENCES exam (id) ON DELETE CASCADE,
    cycle             VARCHAR(40)   NOT NULL,
    kind              VARCHAR(30)   NOT NULL,
    label             VARCHAR(200)  NOT NULL,
    starts_on         DATE          NOT NULL,
    ends_on           DATE,
    date_precision    VARCHAR(10)   NOT NULL DEFAULT 'DAY',
    confirmed         BOOLEAN       NOT NULL,
    note              VARCHAR(500),
    source_url        VARCHAR(500)  NOT NULL,
    sort_order        INT           NOT NULL DEFAULT 0,
    CONSTRAINT ck_exam_date_kind CHECK (kind IN ('APPLICATION_START', 'APPLICATION_END', 'LATE_APPLICATION_END',
        'ADMIT_CARD', 'EXAM', 'RESULT', 'COUNSELLING', 'SESSION_START', 'OTHER')),
    CONSTRAINT ck_exam_date_precision CHECK (date_precision IN ('DAY', 'MONTH')),
    CONSTRAINT ck_exam_date_range CHECK (ends_on IS NULL OR ends_on >= starts_on)
);
CREATE INDEX idx_exam_date_exam ON exam_date (exam_id);

CREATE TABLE exam_notice (
    id            BIGSERIAL     PRIMARY KEY,
    exam_id       BIGINT        NOT NULL REFERENCES exam (id) ON DELETE CASCADE,
    cycle         VARCHAR(40),
    kind          VARCHAR(20)   NOT NULL,
    title         VARCHAR(300)  NOT NULL,
    published_on  DATE          NOT NULL,
    url           VARCHAR(500)  NOT NULL,
    CONSTRAINT ck_exam_notice_kind CHECK (kind IN ('NOTIFICATION', 'DATE_CHANGE', 'ADMIT_CARD', 'ANSWER_KEY', 'RESULT',
        'COUNSELLING', 'OTHER'))
);
CREATE INDEX idx_exam_notice_published ON exam_notice (published_on DESC);
