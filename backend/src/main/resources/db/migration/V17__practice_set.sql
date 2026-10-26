-- Practice quizzes and mock tests written by India School Finder (never official questions). Questions, passages and
-- answers are one JSON document per set; answers are only used for server-side scoring and never sent with a set.
CREATE TABLE practice_set (
    id                BIGSERIAL     PRIMARY KEY,
    slug              VARCHAR(80)   NOT NULL UNIQUE,
    exam_slug         VARCHAR(80),
    title             VARCHAR(200)  NOT NULL,
    kind              VARCHAR(10)   NOT NULL,
    level             VARCHAR(100)  NOT NULL,
    description       VARCHAR(1000) NOT NULL,
    duration_minutes  INT,
    content           JSONB         NOT NULL,
    display_order     INT           NOT NULL DEFAULT 100,
    published         BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ   NOT NULL,
    updated_at        TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_practice_kind CHECK (kind IN ('QUIZ', 'MOCK')),
    CONSTRAINT ck_practice_duration CHECK (duration_minutes IS NULL OR duration_minutes BETWEEN 1 AND 300)
);
CREATE INDEX idx_practice_exam ON practice_set (exam_slug);
