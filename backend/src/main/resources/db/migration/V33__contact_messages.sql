-- Messages from the contact form, read by staff in the admin area. The sender's name and email are kept only to reply,
-- and are removed when a message is marked handled.
CREATE TABLE contact_message (
    id          BIGSERIAL     PRIMARY KEY,
    topic       VARCHAR(20)   NOT NULL,
    name        VARCHAR(100),
    email       VARCHAR(254),
    subject     VARCHAR(150)  NOT NULL,
    message     VARCHAR(4000) NOT NULL,
    status      VARCHAR(10)   NOT NULL DEFAULT 'OPEN',
    created_at  TIMESTAMPTZ   NOT NULL,
    handled_at  TIMESTAMPTZ,
    handled_by  VARCHAR(100),
    CONSTRAINT ck_contact_topic CHECK (topic IN ('FEEDBACK', 'CORRECTION', 'LISTING', 'RANKING', 'TECHNICAL')),
    CONSTRAINT ck_contact_status CHECK (status IN ('OPEN', 'HANDLED'))
);
CREATE INDEX idx_contact_message_status ON contact_message (status, created_at DESC);
