-- SchoolDhundo's directory of premier and boarding schools (the owner's "Top 100" document). It is a curated directory,
-- not a ranking: source_order is the document's serial number, kept for reference only and never shown as a rank.
-- Published ranks stay in ranking_source. Each stated fact carries a confirmed flag: true only when the school's official
-- website or its CBSE / CISCE record says the same; unconfirmed facts are shown with a "not yet confirmed" mark.
CREATE TABLE premier_school (
    id                  BIGSERIAL PRIMARY KEY,
    entry_key           VARCHAR(80)  NOT NULL UNIQUE,
    source_order        INT          NOT NULL,
    section             VARCHAR(30)  NOT NULL,
    name                VARCHAR(200) NOT NULL,
    city                VARCHAR(120),
    state_code          VARCHAR(5)   NOT NULL,
    -- Profile hint from the seed; school_id is resolved from it (or from the name) at every start.
    school_slug         VARCHAR(200),
    school_id           BIGINT REFERENCES school (id) ON DELETE SET NULL,
    -- Set when several campuses share the name and the document does not say which one is meant.
    campus_search       VARCHAR(120),
    curriculum_note     VARCHAR(120),
    gender              VARCHAR(10),
    gender_confirmed    BOOLEAN      NOT NULL DEFAULT FALSE,
    residence           VARCHAR(20),
    residence_confirmed BOOLEAN      NOT NULL DEFAULT FALSE,
    classes_label       VARCHAR(60),
    lowest_class        SMALLINT,
    highest_class       SMALLINT,
    classes_confirmed   BOOLEAN      NOT NULL DEFAULT FALSE,
    -- The document's approximate yearly fee range: an estimate, always labelled as one.
    fee_min_inr         INT,
    fee_max_inr         INT,
    fee_text            VARCHAR(120),
    website_url         VARCHAR(300),
    website_checked     BOOLEAN      NOT NULL DEFAULT FALSE,
    note                VARCHAR(400),
    checked_on          DATE,
    seed_version        INT          NOT NULL,
    -- Editorial placement, set by editors only. Paid placement is always labelled and never changes a published rank.
    featured            BOOLEAN      NOT NULL DEFAULT FALSE,
    sponsored           BOOLEAN      NOT NULL DEFAULT FALSE,
    CONSTRAINT ck_premier_section CHECK (section IN ('BOYS_RESIDENTIAL', 'GIRLS_BOARDING', 'COED_BOARDING', 'INTERNATIONAL', 'ALTERNATIVE', 'METRO', 'REGIONAL')),
    CONSTRAINT ck_premier_gender CHECK (gender IN ('BOYS', 'GIRLS', 'CO_ED')),
    CONSTRAINT ck_premier_residence CHECK (residence IN ('BOARDING', 'DAY_CUM_BOARDING', 'DAY'))
);

CREATE TABLE premier_school_board (
    premier_school_id BIGINT      NOT NULL REFERENCES premier_school (id) ON DELETE CASCADE,
    board_code        VARCHAR(20) NOT NULL,
    confirmed         BOOLEAN     NOT NULL DEFAULT FALSE,
    PRIMARY KEY (premier_school_id, board_code)
);

-- One directory entry per school profile, however many categories it appears in.
CREATE UNIQUE INDEX uq_premier_school_school ON premier_school (school_id) WHERE school_id IS NOT NULL;
CREATE INDEX idx_premier_school_state ON premier_school (state_code, lower(city));
CREATE INDEX idx_premier_school_section ON premier_school (section);
CREATE INDEX idx_premier_school_kind ON premier_school (residence, gender);
CREATE INDEX idx_premier_school_board ON premier_school_board (board_code);
