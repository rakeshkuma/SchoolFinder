-- Within one profile_score tier, states take turns (each state's first school by name, then each state's second, ...)
-- so no single state fills whole pages of the recommended order. Maintained by ProfileScoreService; NULL until computed.
ALTER TABLE school ADD COLUMN recommended_turn INTEGER;
DROP INDEX IF EXISTS idx_school_recommended;
CREATE INDEX idx_school_recommended ON school (profile_score DESC, recommended_turn, name, id) WHERE active;
