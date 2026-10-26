-- Per-fact provenance: a fact added to a profile from a different source than school.source_url (e.g. classes read
-- from the school's own website on a profile imported from CBSE SARAS, or a map location from OpenStreetMap) records
-- that source here, so every published fact can still be traced to the page it came from.
CREATE TABLE school_fact_source (
    id                     BIGSERIAL    PRIMARY KEY,
    school_id              BIGINT       NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    fact                   VARCHAR(20)  NOT NULL,
    source_url             VARCHAR(500) NOT NULL,
    source_retrieved_date  DATE         NOT NULL,
    note                   VARCHAR(500),
    created_at             TIMESTAMPTZ  NOT NULL,
    updated_at             TIMESTAMPTZ  NOT NULL,
    created_by             VARCHAR(100),
    updated_by             VARCHAR(100),
    CONSTRAINT uk_fact_source UNIQUE (school_id, fact),
    CONSTRAINT ck_fact_source_fact CHECK (fact IN ('CLASSES', 'LOCATION', 'CITY'))
);
