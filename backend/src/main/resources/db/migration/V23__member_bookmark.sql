-- Practice questions a member bookmarked to come back to, synced across their devices. question_id is the bank id
-- ("set-slug/question-id"); a bookmark of a question later retired from the bank is simply not offered again.
CREATE TABLE member_bookmark (
    id           BIGSERIAL     PRIMARY KEY,
    account_id   BIGINT        NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    question_id  VARCHAR(170)  NOT NULL,
    created_at   TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_member_bookmark UNIQUE (account_id, question_id),
    CONSTRAINT ck_member_bookmark_id CHECK (question_id ~ '^[a-z0-9-]+/[a-z0-9-]+$')
);
