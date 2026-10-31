-- When a practice set's questions, answers and explanations were last checked by a reviewer. A set is only published
-- after review; the date is shown with the questions.
ALTER TABLE practice_set ADD COLUMN reviewed_on DATE;

-- A member's scored practice attempt. Scores are always computed on the server from the stored answers; client_id
-- (generated once per attempt by the browser) makes a repeated submission return the first result instead of a
-- second attempt. Rows go with the account (ON DELETE CASCADE).
CREATE TABLE practice_attempt (
    id                BIGSERIAL     PRIMARY KEY,
    account_id        BIGINT        NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    client_id         UUID          NOT NULL,
    title             VARCHAR(200)  NOT NULL,
    mode              VARCHAR(20)   NOT NULL,
    exam_slug         VARCHAR(80),
    set_slug          VARCHAR(80),
    total             INT           NOT NULL,
    attempted         INT           NOT NULL,
    correct           INT           NOT NULL,
    duration_seconds  INT,
    -- {"questionIds": [...], "answers": {"set/q": 2}, "results": [{"id", "section", "topic", "chosen", "correct"}]}
    responses         JSONB         NOT NULL,
    created_at        TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_practice_attempt_client UNIQUE (account_id, client_id),
    CONSTRAINT ck_practice_attempt_counts CHECK (total > 0 AND attempted BETWEEN 0 AND total AND correct BETWEEN 0 AND attempted),
    CONSTRAINT ck_practice_attempt_duration CHECK (duration_seconds IS NULL OR duration_seconds BETWEEN 0 AND 86400)
);
CREATE INDEX idx_practice_attempt_account ON practice_attempt (account_id, created_at DESC);

-- Exams a member saved ("favourites"), synced across devices. Guests keep theirs in the browser and merge on sign-in.
CREATE TABLE member_saved_exam (
    id          BIGSERIAL    PRIMARY KEY,
    account_id  BIGINT       NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    exam_slug   VARCHAR(80)  NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT uq_member_saved_exam UNIQUE (account_id, exam_slug)
);
