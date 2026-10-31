-- Challenges reuse the question bank: a challenge lists bank ids ("set/question") and never copies a question.
CREATE TABLE challenge (
    id                  BIGSERIAL     PRIMARY KEY,
    slug                VARCHAR(80)   NOT NULL,
    title               VARCHAR(160)  NOT NULL,
    description         VARCHAR(1000) NOT NULL,
    rules               VARCHAR(2000),
    -- DAILY, WEEKLY, MONTHLY, EXAM or SPECIAL: how it is presented; the schedule is starts_at and ends_at.
    kind                VARCHAR(12)   NOT NULL,
    exam_slug           VARCHAR(80),
    category            VARCHAR(20),
    difficulty          VARCHAR(10)   NOT NULL,
    question_ids        JSONB         NOT NULL,
    duration_minutes    INT           NOT NULL,
    starts_at           TIMESTAMPTZ   NOT NULL,
    ends_at             TIMESTAMPTZ   NOT NULL,
    points_per_correct  INT           NOT NULL DEFAULT 10,
    completion_bonus    INT           NOT NULL DEFAULT 0,
    max_attempts        INT           NOT NULL DEFAULT 1,
    -- IMMEDIATE: score and answers on submission. AFTER_END: both held back until the challenge ends.
    result_release      VARCHAR(12)   NOT NULL DEFAULT 'IMMEDIATE',
    leaderboard_enabled BOOLEAN       NOT NULL DEFAULT TRUE,
    published           BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at          TIMESTAMPTZ   NOT NULL,
    updated_at          TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_challenge_slug UNIQUE (slug),
    CONSTRAINT ck_challenge_kind CHECK (kind IN ('DAILY', 'WEEKLY', 'MONTHLY', 'EXAM', 'SPECIAL')),
    CONSTRAINT ck_challenge_difficulty CHECK (difficulty IN ('EASY', 'MEDIUM', 'HARD', 'MIXED')),
    CONSTRAINT ck_challenge_release CHECK (result_release IN ('IMMEDIATE', 'AFTER_END')),
    CONSTRAINT ck_challenge_window CHECK (ends_at > starts_at),
    CONSTRAINT ck_challenge_numbers CHECK (duration_minutes BETWEEN 1 AND 300 AND points_per_correct BETWEEN 1 AND 100
        AND completion_bonus BETWEEN 0 AND 1000 AND max_attempts BETWEEN 1 AND 10)
);
CREATE INDEX idx_challenge_published ON challenge (published, starts_at);

-- An attempt starts on the server, so its time limit does not depend on the browser's clock.
CREATE TABLE challenge_attempt (
    id                  BIGSERIAL     PRIMARY KEY,
    challenge_id        BIGINT        NOT NULL REFERENCES challenge (id) ON DELETE CASCADE,
    participant_id      BIGINT        NOT NULL REFERENCES participant (id) ON DELETE CASCADE,
    attempt_no          INT           NOT NULL,
    started_at          TIMESTAMPTZ   NOT NULL,
    deadline_at         TIMESTAMPTZ   NOT NULL,
    submitted_at        TIMESTAMPTZ,
    -- The time ran out with nothing submitted; the attempt counts as used and scores nothing.
    expired             BOOLEAN       NOT NULL DEFAULT FALSE,
    practice_attempt_id BIGINT        REFERENCES practice_attempt (id) ON DELETE SET NULL,
    score               INT           NOT NULL DEFAULT 0,
    correct             INT           NOT NULL DEFAULT 0,
    attempted           INT           NOT NULL DEFAULT 0,
    total               INT           NOT NULL DEFAULT 0,
    duration_seconds    INT,
    CONSTRAINT uq_challenge_attempt_no UNIQUE (challenge_id, participant_id, attempt_no)
);
-- At most one attempt in progress per student per challenge.
CREATE UNIQUE INDEX uq_challenge_attempt_open ON challenge_attempt (challenge_id, participant_id) WHERE submitted_at IS NULL;
CREATE INDEX idx_challenge_attempt_board ON challenge_attempt (challenge_id, score DESC);

-- A challenge's attempt also lands in the student's history; until its results are released it stays out of sight.
ALTER TABLE practice_attempt ADD COLUMN challenge_id BIGINT REFERENCES challenge (id) ON DELETE SET NULL;
ALTER TABLE practice_attempt ADD COLUMN results_hidden_until TIMESTAMPTZ;
CREATE INDEX idx_practice_attempt_review ON practice_attempt (review_flag, created_at DESC) WHERE review_flag IS NOT NULL;

ALTER TABLE points_ledger ADD COLUMN challenge_id BIGINT REFERENCES challenge (id) ON DELETE SET NULL;
