-- Badges a participant has earned, awarded only by AchievementService from their own attempts and points. A badge stays
-- once earned (a rank can fall later), and the unique key means concurrent submissions award it once.
CREATE TABLE participant_achievement (
    id              BIGSERIAL     PRIMARY KEY,
    participant_id  BIGINT        NOT NULL REFERENCES participant (id) ON DELETE CASCADE,
    code            VARCHAR(40)   NOT NULL,
    earned_at       TIMESTAMPTZ   NOT NULL,
    CONSTRAINT uq_participant_achievement UNIQUE (participant_id, code)
);
