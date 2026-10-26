-- Many official sites say "boarding school" without stating whether every student boards or day scholars are also
-- admitted. NULL boarding_type records exactly that ("arrangement not stated") instead of forcing a guess.
ALTER TABLE school_boarding ALTER COLUMN boarding_type DROP NOT NULL;
ALTER TABLE school_boarding DROP CONSTRAINT ck_boarding_type;
ALTER TABLE school_boarding ADD CONSTRAINT ck_boarding_type
    CHECK (boarding_type IS NULL OR boarding_type IN ('FULL_BOARDING', 'WEEKLY_BOARDING', 'DAY_CUM_BOARDING'));
