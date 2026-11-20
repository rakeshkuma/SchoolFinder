-- Published rankings as a proper catalogue. Existing names are kept: ranking_publisher is the source (who publishes),
-- ranking_source is one school's entry, and school_ranking stays this site's own evidence score.

CREATE TABLE ranking_category (
    id             BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code           VARCHAR(40)   NOT NULL,
    name           VARCHAR(150)  NOT NULL,
    -- OVERALL, ACADEMIC, INFRASTRUCTURE, SPORTS, GOVERNMENT, BOARDING, BOARD or GREEN: which pages it appears on.
    family         VARCHAR(20)   NOT NULL,
    -- Set only when the publisher itself ranks one board, e.g. CBSE. A filter is not a board ranking.
    board_code     VARCHAR(20),
    display_order  INT           NOT NULL DEFAULT 100,
    CONSTRAINT uk_ranking_category_code UNIQUE (code),
    CONSTRAINT ck_ranking_category_family CHECK (family IN ('OVERALL', 'ACADEMIC', 'INFRASTRUCTURE', 'SPORTS', 'GOVERNMENT', 'BOARDING', 'BOARD', 'GREEN'))
);

INSERT INTO ranking_category (code, name, family, display_order) VALUES
    ('ACADEMIC', 'Academic performance', 'ACADEMIC', 10),
    ('GREEN', 'Green school rating', 'GREEN', 20);

-- One published list: a publisher's list for one year, category and place.
CREATE TABLE ranking_edition (
    id                   BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    publisher_id         BIGINT        NOT NULL REFERENCES ranking_publisher (id),
    category_id          BIGINT        REFERENCES ranking_category (id),
    name                 VARCHAR(300)  NOT NULL,
    ranking_year         VARCHAR(20)   NOT NULL,
    category_label       VARCHAR(200),
    scope                VARCHAR(20)   NOT NULL DEFAULT 'NATIONAL',
    region               VARCHAR(100),
    source_url           VARCHAR(500)  NOT NULL,
    published_on         DATE,
    collected_on         DATE          NOT NULL,
    max_score            NUMERIC(10, 2),
    -- A rating (Green, Yellow ...) is not a rank, and the pages must say so.
    rating_based         BOOLEAN       NOT NULL DEFAULT FALSE,
    methodology_summary  VARCHAR(2000),
    created_at           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT ck_ranking_edition_scope CHECK (scope IN ('NATIONAL', 'STATE', 'CITY'))
);
CREATE UNIQUE INDEX uk_ranking_edition ON ranking_edition
    (publisher_id, lower(name), ranking_year, lower(coalesce(category_label, '')), scope, lower(coalesce(region, '')));

-- What the publisher says it evaluates. Weight stays empty unless the publisher states it.
CREATE TABLE ranking_parameter (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    edition_id   BIGINT        NOT NULL REFERENCES ranking_edition (id) ON DELETE CASCADE,
    name         VARCHAR(150)  NOT NULL,
    weight       NUMERIC(6, 2),
    description  VARCHAR(500),
    CONSTRAINT uk_ranking_parameter UNIQUE (edition_id, name)
);

CREATE TABLE ranking_import_job (
    id           BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    file_name    VARCHAR(255),
    mode         VARCHAR(20)   NOT NULL,
    total_rows   INT           NOT NULL,
    valid_rows   INT           NOT NULL,
    created      INT           NOT NULL,
    updated      INT           NOT NULL,
    committed    BOOLEAN       NOT NULL,
    errors       JSONB         NOT NULL DEFAULT '[]',
    imported_by  VARCHAR(100),
    imported_at  TIMESTAMPTZ   NOT NULL,
    approved_by  VARCHAR(100),
    approved_at  TIMESTAMPTZ
);

-- National, state and city ranks are different facts and are never interchangeable.
ALTER TABLE ranking_source
    ADD COLUMN edition_id     BIGINT REFERENCES ranking_edition (id),
    ADD COLUMN national_rank  INT,
    ADD COLUMN state_rank     INT,
    ADD COLUMN city_rank      INT,
    ADD COLUMN score          NUMERIC(10, 2),
    ADD COLUMN max_score      NUMERIC(10, 2),
    ADD COLUMN rating         VARCHAR(10),
    ADD COLUMN import_job_id  BIGINT REFERENCES ranking_import_job (id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_ranking_source_ranks CHECK (coalesce(national_rank, 1) > 0 AND coalesce(state_rank, 1) > 0 AND coalesce(city_rank, 1) > 0),
    ADD CONSTRAINT ck_ranking_source_rating CHECK (rating IS NULL OR rating IN ('GREEN', 'YELLOW', 'ORANGE', 'RED'));
CREATE INDEX idx_ranking_source_edition ON ranking_source (edition_id, verification_status, national_rank);
CREATE INDEX idx_ranking_source_job ON ranking_source (import_job_id);

-- Every decision on an entry, kept as history.
CREATE TABLE ranking_verification (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    ranking_source_id  BIGINT        NOT NULL REFERENCES ranking_source (id) ON DELETE CASCADE,
    status             VARCHAR(20)   NOT NULL,
    note               VARCHAR(500),
    verified_by        VARCHAR(100),
    verified_at        TIMESTAMPTZ   NOT NULL
);
CREATE INDEX idx_ranking_verification_source ON ranking_verification (ranking_source_id, verified_at DESC);

-- Existing entries move into editions, each rank into its own column.
INSERT INTO ranking_edition (publisher_id, name, ranking_year, category_label, scope, region, source_url, collected_on)
SELECT publisher_id, ranking_name, ranking_year, category, scope, region, min(source_url), min(retrieved_date)
FROM ranking_source WHERE publisher_id IS NOT NULL
GROUP BY publisher_id, ranking_name, ranking_year, category, scope, region;

UPDATE ranking_source r SET edition_id = e.id
FROM ranking_edition e
WHERE e.publisher_id = r.publisher_id AND e.name = r.ranking_name AND e.ranking_year = r.ranking_year
  AND e.category_label IS NOT DISTINCT FROM r.category AND e.scope = r.scope AND e.region IS NOT DISTINCT FROM r.region;

UPDATE ranking_source SET national_rank = rank_position WHERE scope = 'NATIONAL';
UPDATE ranking_source SET state_rank = rank_position WHERE scope = 'STATE';
UPDATE ranking_source SET city_rank = rank_position WHERE scope = 'CITY';
-- IIRF printed a state position beside each school; it was recorded in the notes.
UPDATE ranking_source SET state_rank = (substring(notes FROM 'State position #([0-9]+)'))::int
WHERE scope = 'NATIONAL' AND notes ~ 'State position #[0-9]+';

-- IIRF may not be recorded yet on a server where its entries have not been imported: the list must exist before they arrive.
INSERT INTO ranking_publisher (code, name, kind, website_url, created_at, updated_at, created_by, updated_by)
VALUES ('IIRF', 'IIRF (International Institutional Ranking Framework)', 'SURVEY', 'https://iirfranking.com/', now(), now(), 'system', 'system')
ON CONFLICT (code) DO NOTHING;

INSERT INTO ranking_edition (publisher_id, name, ranking_year, category_label, source_url, collected_on)
SELECT p.id, 'Top (10+2) Schools in India: Best Schools in Academic Performance', '2026', '(10+2) Schools',
       'https://iirfranking.com/ranking/top-schools-india', DATE '2026-10-30'
FROM ranking_publisher p
WHERE p.code = 'IIRF' AND NOT EXISTS (SELECT 1 FROM ranking_edition e WHERE e.publisher_id = p.id AND e.ranking_year = '2026');

UPDATE ranking_edition e SET category_id = c.id, methodology_summary =
    'IIRF describes weighing academic excellence, infrastructure, faculty quality, extracurricular activities and student satisfaction. It does not publish weights or scores for this list.'
FROM ranking_category c, ranking_publisher p
WHERE c.code = 'ACADEMIC' AND p.id = e.publisher_id AND p.code = 'IIRF';

INSERT INTO ranking_parameter (edition_id, name)
SELECT e.id, v.name FROM ranking_edition e JOIN ranking_publisher p ON p.id = e.publisher_id,
    (VALUES ('Academic excellence'), ('Infrastructure'), ('Faculty quality'), ('Extracurricular activities'), ('Student satisfaction')) AS v(name)
WHERE p.code = 'IIRF';

-- Sources read in the 2026 review. Website only: no entry is created from them here.
UPDATE ranking_publisher SET website_url = 'https://www.cforerankings.com/', name = 'Cfore', updated_at = now() WHERE code = 'CFORE';
UPDATE ranking_source SET publisher = 'Cfore' WHERE publisher = 'C fore';
INSERT INTO ranking_publisher (code, name, kind, website_url, created_at, updated_at, created_by, updated_by) VALUES
    ('EDUCATIONTODAY', 'Education Today', 'SURVEY', 'https://www.educationtoday.co/rankings', now(), now(), 'system', 'system'),
    ('GSP', 'Green Schools Programme, Centre for Science and Environment', 'GREEN', 'https://www.greenschoolsprogramme.org/', now(), now(), 'system', 'system');

INSERT INTO ranking_edition (publisher_id, category_id, name, ranking_year, category_label, source_url, collected_on, rating_based, methodology_summary)
SELECT p.id, c.id, 'Is Your School Green?', '2025-26', 'Green school rating',
       'https://www.greenschoolsprogramme.org/schools/gsp-audit/green-schools-awards/is-your-school-green-2025-26/', DATE '2026-10-31', TRUE,
       'A rating from the programme''s environmental audit, in four bands: Green (70% and above), Yellow (50 to 69.9%), Orange (35 to 49.9%) and Red (below 34.9%). It is not a rank, and scores are not published school by school.'
FROM ranking_publisher p, ranking_category c WHERE p.code = 'GSP' AND c.code = 'GREEN';
