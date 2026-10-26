-- Boarding profile: one optional row per residential school, with its own cited source and verification status.
-- Text fields hold only what the cited source states; NULL means "not stated", never "not available".
CREATE TABLE school_boarding (
    school_id            BIGINT       PRIMARY KEY REFERENCES school (id) ON DELETE CASCADE,
    boarding_type        VARCHAR(20)  NOT NULL,
    residential_system   VARCHAR(30)  NOT NULL,
    entrance_exam        VARCHAR(20),
    entry_classes        VARCHAR(100),
    summary              VARCHAR(500),
    accommodation        VARCHAR(2000),
    pastoral_care        VARCHAR(2000),
    dining               VARCHAR(1000),
    medical_care         VARCHAR(1000),
    nearest_transport    VARCHAR(500),
    academic_session     VARCHAR(200),
    source_url           VARCHAR(500) NOT NULL,
    verification_status  VARCHAR(20)  NOT NULL DEFAULT 'UNVERIFIED',
    last_verified_date   DATE,
    version              BIGINT       NOT NULL DEFAULT 0,
    created_at           TIMESTAMPTZ  NOT NULL,
    updated_at           TIMESTAMPTZ  NOT NULL,
    created_by           VARCHAR(100),
    updated_by           VARCHAR(100),
    CONSTRAINT ck_boarding_type CHECK (boarding_type IN ('FULL_BOARDING', 'WEEKLY_BOARDING', 'DAY_CUM_BOARDING')),
    CONSTRAINT ck_boarding_system CHECK (residential_system IN ('NAVODAYA', 'SAINIK', 'MILITARY_SCHOOL', 'MILITARY_COLLEGE',
        'STATE_RESIDENTIAL', 'TRIBAL_RESIDENTIAL', 'PRIVATE_BOARDING')),
    CONSTRAINT ck_boarding_exam CHECK (entrance_exam IS NULL OR entrance_exam IN ('JNVST', 'AISSEE', 'RMS_CET', 'RIMC',
        'NETARHAT', 'SCHOOL_TEST')),
    CONSTRAINT ck_boarding_verification CHECK (verification_status IN ('UNVERIFIED', 'VERIFIED', 'OUTDATED', 'DISPUTED'))
);
CREATE INDEX idx_boarding_system ON school_boarding (residential_system);
CREATE INDEX idx_boarding_type ON school_boarding (boarding_type);
CREATE INDEX idx_boarding_exam ON school_boarding (entrance_exam);

-- Rashtriya Military Schools are a distinct Ministry of Defence system.
ALTER TABLE school DROP CONSTRAINT ck_school_network;
ALTER TABLE school ADD CONSTRAINT ck_school_network CHECK (network IS NULL OR network IN ('KENDRIYA_VIDYALAYA',
    'JAWAHAR_NAVODAYA_VIDYALAYA', 'SAINIK_SCHOOL', 'EKLAVYA_MODEL_RESIDENTIAL_SCHOOL', 'RASHTRIYA_MILITARY_SCHOOL'));

-- Facility verification queue and boarding filters read facilities by school and status.
CREATE INDEX IF NOT EXISTS idx_facility_school_status ON school_facility (school_id, verification_status);
