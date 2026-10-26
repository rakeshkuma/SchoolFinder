-- Recommended directory order: definitively ranked schools first, then the best-documented profiles. profile_score is
-- maintained by ProfileScoreService from published, sourced facts only; it measures documentation, not school quality.
ALTER TABLE school ADD COLUMN profile_score INTEGER NOT NULL DEFAULT 0;
CREATE INDEX idx_school_recommended ON school (profile_score DESC, name, id) WHERE active;
