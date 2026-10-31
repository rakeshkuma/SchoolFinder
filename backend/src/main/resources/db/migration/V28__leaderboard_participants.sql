-- Leaderboard participation. A participant is either a member (account_id) or a guest who holds a secret token in
-- their browser (only its SHA-256 is stored). Nicknames only: no email, phone or real name is shown anywhere, and a
-- participant is listed publicly only after opting in; under-18s also need a parent's or guardian's consent.
CREATE TABLE participant (
    id                   BIGSERIAL     PRIMARY KEY,
    public_id            VARCHAR(12)   NOT NULL,
    account_id           BIGINT        REFERENCES user_account (id) ON DELETE CASCADE,
    guest_token_hash     VARCHAR(64),
    nickname             VARCHAR(24)   NOT NULL,
    state_code           VARCHAR(2),
    city                 VARCHAR(80),
    show_city            BOOLEAN       NOT NULL DEFAULT FALSE,
    -- What the student prepares for, e.g. JNVST, CLASS_10 (a free code chosen from the site's list).
    track                VARCHAR(40),
    -- ADULT (18 or over, self-declared), MINOR, or UNKNOWN (not asked yet: never listed publicly).
    age_band             VARCHAR(10)   NOT NULL DEFAULT 'UNKNOWN',
    public_listing       BOOLEAN       NOT NULL DEFAULT FALSE,
    -- For a MINOR: when and how a parent or guardian agreed to the public listing.
    guardian_consent_at  TIMESTAMPTZ,
    consent_method       VARCHAR(20),
    -- Set by a moderator: the participant is ranked privately but never shown (e.g. an offensive nickname).
    hidden               BOOLEAN       NOT NULL DEFAULT FALSE,
    created_at           TIMESTAMPTZ   NOT NULL,
    updated_at           TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_participant_public_id UNIQUE (public_id),
    CONSTRAINT uq_participant_account UNIQUE (account_id),
    CONSTRAINT uq_participant_guest_token UNIQUE (guest_token_hash),
    CONSTRAINT ck_participant_owner CHECK (account_id IS NOT NULL OR guest_token_hash IS NOT NULL),
    CONSTRAINT ck_participant_age CHECK (age_band IN ('ADULT', 'MINOR', 'UNKNOWN')),
    CONSTRAINT ck_participant_consent CHECK (consent_method IS NULL OR consent_method IN ('GUEST_DECLARATION', 'GUARDIAN_EMAIL')),
    -- Public only when the person is an adult, or a minor whose guardian agreed.
    CONSTRAINT ck_participant_public CHECK (NOT public_listing OR age_band = 'ADULT'
        OR (age_band = 'MINOR' AND guardian_consent_at IS NOT NULL))
);

-- Attempts now belong to a participant; a guest attempt has no account. account_id stays for members' existing queries.
ALTER TABLE practice_attempt ALTER COLUMN account_id DROP NOT NULL;
ALTER TABLE practice_attempt ADD COLUMN participant_id BIGINT REFERENCES participant (id) ON DELETE CASCADE;
-- Leaderboard points awarded for this attempt (kept apart from its raw marks).
ALTER TABLE practice_attempt ADD COLUMN points INT NOT NULL DEFAULT 0;
-- The date of the daily quiz this attempt counted for (one per participant per date).
ALTER TABLE practice_attempt ADD COLUMN daily_date DATE;
-- Why an attempt earned nothing despite correct answers (e.g. TOO_FAST); moderators review these.
ALTER TABLE practice_attempt ADD COLUMN review_flag VARCHAR(30);
ALTER TABLE practice_attempt ADD CONSTRAINT ck_practice_attempt_owner CHECK (account_id IS NOT NULL OR participant_id IS NOT NULL);
ALTER TABLE practice_attempt ADD CONSTRAINT uq_practice_attempt_participant_client UNIQUE (participant_id, client_id);
CREATE UNIQUE INDEX uq_practice_attempt_daily ON practice_attempt (participant_id, daily_date) WHERE daily_date IS NOT NULL;
CREATE INDEX idx_practice_attempt_participant ON practice_attempt (participant_id, created_at DESC);

-- One row per question that earned points. award_key makes each award happen once: "q:<question>" the first time a
-- question is answered correctly, "d:<date>:<question>" for the daily quiz of that date. Leaderboards for any exam,
-- subject or period are sums over these rows.
CREATE TABLE points_ledger (
    id              BIGSERIAL     PRIMARY KEY,
    participant_id  BIGINT        NOT NULL REFERENCES participant (id) ON DELETE CASCADE,
    attempt_id      BIGINT        NOT NULL REFERENCES practice_attempt (id) ON DELETE CASCADE,
    award_key       VARCHAR(200)  NOT NULL,
    question_id     VARCHAR(161)  NOT NULL,
    set_slug        VARCHAR(80)   NOT NULL,
    exam_slug       VARCHAR(80),
    category        VARCHAR(20),
    source          VARCHAR(12)   NOT NULL,
    points          INT           NOT NULL,
    earned_at       TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_points_ledger_award UNIQUE (participant_id, award_key),
    CONSTRAINT ck_points_ledger_source CHECK (source IN ('PRACTICE', 'DAILY', 'CHALLENGE')),
    CONSTRAINT ck_points_ledger_points CHECK (points > 0)
);
CREATE INDEX idx_points_ledger_earned ON points_ledger (earned_at);
CREATE INDEX idx_points_ledger_exam ON points_ledger (exam_slug, earned_at);
CREATE INDEX idx_points_ledger_category ON points_ledger (category, earned_at);
