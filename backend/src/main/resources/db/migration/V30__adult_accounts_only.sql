-- Accounts are for adults (Terms of Service), so a member's leaderboard entry is an adult's and no guardian is emailed.
-- Under-18s take part as guests. Members keep their listing choice; guests are not touched.
DROP TABLE guardian_consent_request;

UPDATE participant SET age_band = 'ADULT', guardian_consent_at = NULL, consent_method = NULL WHERE account_id IS NOT NULL;

ALTER TABLE participant DROP CONSTRAINT ck_participant_consent;
ALTER TABLE participant ADD CONSTRAINT ck_participant_consent
    CHECK (consent_method IS NULL OR consent_method = 'GUEST_DECLARATION');
