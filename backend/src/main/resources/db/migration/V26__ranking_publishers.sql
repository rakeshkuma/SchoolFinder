-- Publishers of independent school rankings, surveys, awards and green-school ratings. Only the publisher's name is
-- recorded here; its website and methodology are added by an editor from the publisher's own pages.
CREATE TABLE ranking_publisher (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code             VARCHAR(40)   NOT NULL,
    name             VARCHAR(200)  NOT NULL,
    kind             VARCHAR(20)   NOT NULL,
    website_url      VARCHAR(500),
    methodology_url  VARCHAR(500),
    description      VARCHAR(1000),
    active           BOOLEAN       NOT NULL DEFAULT TRUE,
    created_at       TIMESTAMPTZ   NOT NULL,
    updated_at       TIMESTAMPTZ   NOT NULL,
    created_by       VARCHAR(100),
    updated_by       VARCHAR(100),
    CONSTRAINT uk_ranking_publisher_code UNIQUE (code),
    CONSTRAINT ck_ranking_publisher_kind CHECK (kind IN ('SURVEY', 'AWARD', 'GREEN', 'OTHER'))
);

INSERT INTO ranking_publisher (code, name, kind, website_url, created_at, updated_at, created_by, updated_by) VALUES
    ('EDUCATIONWORLD', 'EducationWorld', 'SURVEY', 'https://www.educationworld.in/', now(), now(), 'system', 'system'),
    ('CFORE', 'C fore', 'SURVEY', NULL, now(), now(), 'system', 'system'),
    ('WIRANKING', 'WIRanking', 'SURVEY', NULL, now(), now(), 'system', 'system');

ALTER TABLE ranking_source
    ADD COLUMN publisher_id       BIGINT REFERENCES ranking_publisher (id),
    ADD COLUMN scope              VARCHAR(20)  NOT NULL DEFAULT 'NATIONAL',
    ADD COLUMN region             VARCHAR(100),
    -- A paid or "featured" listing. Never shown as a ranking position.
    ADD COLUMN sponsored          BOOLEAN      NOT NULL DEFAULT FALSE,
    ADD COLUMN notes              VARCHAR(500),
    ADD COLUMN last_verified_date DATE,
    ADD COLUMN updated_at         TIMESTAMPTZ,
    ADD CONSTRAINT ck_ranking_source_scope CHECK (scope IN ('NATIONAL', 'STATE', 'CITY')),
    ADD CONSTRAINT ck_ranking_source_rank CHECK (rank_position IS NULL OR rank_position > 0);

UPDATE ranking_source s SET publisher_id = p.id FROM ranking_publisher p WHERE lower(s.publisher) = lower(p.name);
UPDATE ranking_source SET updated_at = created_at;

-- One entry per school per published list, so a re-import updates instead of duplicating.
CREATE UNIQUE INDEX uk_ranking_source_entry
    ON ranking_source (school_id, lower(publisher), lower(ranking_name), ranking_year, lower(coalesce(category, '')),
                       lower(coalesce(region, '')));
CREATE INDEX idx_ranking_source_public ON ranking_source (verification_status, ranking_year);
