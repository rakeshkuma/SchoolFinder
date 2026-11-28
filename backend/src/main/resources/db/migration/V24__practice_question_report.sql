-- Problems visitors report in a practice question (a wrong answer key, an unclear question, a typo, a translation
-- mistake). Reviewed by editors; no contact details or IP addresses are stored. account_id links a signed-in reporter
-- (and is cleared if the account is deleted).
CREATE TABLE practice_question_report (
    id               BIGSERIAL      PRIMARY KEY,
    question_id      VARCHAR(170)   NOT NULL,
    set_slug         VARCHAR(80)    NOT NULL,
    reason           VARCHAR(20)    NOT NULL,
    message          VARCHAR(1000),
    status           VARCHAR(12)    NOT NULL DEFAULT 'OPEN',
    account_id       BIGINT         REFERENCES user_account (id) ON DELETE SET NULL,
    resolution_note  VARCHAR(1000),
    resolved_by      VARCHAR(100),
    resolved_at      TIMESTAMPTZ,
    created_at       TIMESTAMPTZ    NOT NULL,
    CONSTRAINT ck_report_reason CHECK (reason IN ('WRONG_ANSWER', 'UNCLEAR', 'TYPO', 'TRANSLATION', 'OTHER')),
    CONSTRAINT ck_report_status CHECK (status IN ('OPEN', 'FIXED', 'DISMISSED')),
    CONSTRAINT ck_report_resolved CHECK ((status = 'OPEN') = (resolved_at IS NULL))
);
CREATE INDEX idx_report_status ON practice_question_report (status, created_at DESC);
CREATE INDEX idx_report_set ON practice_question_report (set_slug) WHERE status = 'OPEN';
