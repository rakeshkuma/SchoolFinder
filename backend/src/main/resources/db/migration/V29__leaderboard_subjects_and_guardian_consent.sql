-- The subject (practice section, e.g. "Arithmetic", "Physics") of each awarded question, for subject leaderboards.
ALTER TABLE points_ledger ADD COLUMN section VARCHAR(60);
CREATE INDEX idx_points_ledger_section ON points_ledger (section, earned_at);
CREATE INDEX idx_points_ledger_participant ON points_ledger (participant_id, earned_at);

-- An under-18 member's request that a parent or guardian allow their nickname on public leaderboards. The guardian
-- confirms or declines through an emailed link (only the token's hash is kept); the guardian's email is deleted once
-- they answer, and an unanswered request simply expires.
CREATE TABLE guardian_consent_request (
    id              BIGSERIAL     PRIMARY KEY,
    participant_id  BIGINT        NOT NULL REFERENCES participant (id) ON DELETE CASCADE,
    token_hash      VARCHAR(64)   NOT NULL,
    guardian_email  VARCHAR(254),
    created_at      TIMESTAMPTZ   NOT NULL,
    expires_at      TIMESTAMPTZ   NOT NULL,
    answered_at     TIMESTAMPTZ,
    outcome         VARCHAR(10),
    CONSTRAINT uq_guardian_consent_token UNIQUE (token_hash),
    CONSTRAINT ck_guardian_consent_outcome CHECK (outcome IS NULL OR outcome IN ('GRANTED', 'DECLINED'))
);
CREATE INDEX idx_guardian_consent_participant ON guardian_consent_request (participant_id, created_at DESC);
