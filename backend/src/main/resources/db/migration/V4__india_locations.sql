-- India-wide locations and school identifiers.
-- States/UTs are fixed reference data (ISO 3166-2:IN codes). Districts are NOT pre-seeded: they are created
-- from imported or administrator-entered records, so the list only ever contains districts that have data.

CREATE TABLE state (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code        VARCHAR(2)   NOT NULL,
    name        VARCHAR(80)  NOT NULL,
    slug        VARCHAR(80)  NOT NULL,
    kind        VARCHAR(20)  NOT NULL,
    CONSTRAINT uk_state_code UNIQUE (code),
    CONSTRAINT uk_state_slug UNIQUE (slug),
    CONSTRAINT ck_state_code CHECK (code ~ '^[A-Z]{2}$'),
    CONSTRAINT ck_state_kind CHECK (kind IN ('STATE', 'UNION_TERRITORY'))
);
CREATE UNIQUE INDEX uk_state_name ON state (lower(name));

INSERT INTO state (code, name, slug, kind) VALUES
    ('AP', 'Andhra Pradesh', 'andhra-pradesh', 'STATE'),
    ('AR', 'Arunachal Pradesh', 'arunachal-pradesh', 'STATE'),
    ('AS', 'Assam', 'assam', 'STATE'),
    ('BR', 'Bihar', 'bihar', 'STATE'),
    ('CG', 'Chhattisgarh', 'chhattisgarh', 'STATE'),
    ('GA', 'Goa', 'goa', 'STATE'),
    ('GJ', 'Gujarat', 'gujarat', 'STATE'),
    ('HR', 'Haryana', 'haryana', 'STATE'),
    ('HP', 'Himachal Pradesh', 'himachal-pradesh', 'STATE'),
    ('JH', 'Jharkhand', 'jharkhand', 'STATE'),
    ('KA', 'Karnataka', 'karnataka', 'STATE'),
    ('KL', 'Kerala', 'kerala', 'STATE'),
    ('MP', 'Madhya Pradesh', 'madhya-pradesh', 'STATE'),
    ('MH', 'Maharashtra', 'maharashtra', 'STATE'),
    ('MN', 'Manipur', 'manipur', 'STATE'),
    ('ML', 'Meghalaya', 'meghalaya', 'STATE'),
    ('MZ', 'Mizoram', 'mizoram', 'STATE'),
    ('NL', 'Nagaland', 'nagaland', 'STATE'),
    ('OD', 'Odisha', 'odisha', 'STATE'),
    ('PB', 'Punjab', 'punjab', 'STATE'),
    ('RJ', 'Rajasthan', 'rajasthan', 'STATE'),
    ('SK', 'Sikkim', 'sikkim', 'STATE'),
    ('TN', 'Tamil Nadu', 'tamil-nadu', 'STATE'),
    ('TS', 'Telangana', 'telangana', 'STATE'),
    ('TR', 'Tripura', 'tripura', 'STATE'),
    ('UP', 'Uttar Pradesh', 'uttar-pradesh', 'STATE'),
    ('UK', 'Uttarakhand', 'uttarakhand', 'STATE'),
    ('WB', 'West Bengal', 'west-bengal', 'STATE'),
    ('AN', 'Andaman and Nicobar Islands', 'andaman-and-nicobar-islands', 'UNION_TERRITORY'),
    ('CH', 'Chandigarh', 'chandigarh', 'UNION_TERRITORY'),
    ('DH', 'Dadra and Nagar Haveli and Daman and Diu', 'dadra-and-nagar-haveli-and-daman-and-diu', 'UNION_TERRITORY'),
    ('DL', 'Delhi', 'delhi', 'UNION_TERRITORY'),
    ('JK', 'Jammu and Kashmir', 'jammu-and-kashmir', 'UNION_TERRITORY'),
    ('LA', 'Ladakh', 'ladakh', 'UNION_TERRITORY'),
    ('LD', 'Lakshadweep', 'lakshadweep', 'UNION_TERRITORY'),
    ('PY', 'Puducherry', 'puducherry', 'UNION_TERRITORY');

CREATE TABLE district (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    state_code  VARCHAR(2)   NOT NULL REFERENCES state (code),
    name        VARCHAR(100) NOT NULL,
    slug        VARCHAR(110) NOT NULL,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uk_district_slug UNIQUE (state_code, slug)
);
CREATE UNIQUE INDEX uk_district_name ON district (state_code, lower(name));
CREATE INDEX idx_district_slug ON district (slug);

-- School location and identifiers.
ALTER TABLE school ADD COLUMN state_code VARCHAR(2) REFERENCES state (code);
UPDATE school s SET state_code = st.code FROM state st WHERE lower(st.name) = lower(s.state);
-- Rows whose free-text state matched nothing cannot be placed; fail loudly instead of guessing.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM school WHERE state_code IS NULL) THEN
        RAISE EXCEPTION 'V4: some schools have a state that matches no Indian state/UT name; fix school.state first';
    END IF;
END $$;
ALTER TABLE school ALTER COLUMN state_code SET NOT NULL;
ALTER TABLE school DROP COLUMN state;
ALTER TABLE school ALTER COLUMN city DROP DEFAULT;
ALTER TABLE school ALTER COLUMN city DROP NOT NULL;

ALTER TABLE school ADD COLUMN district_id BIGINT REFERENCES district (id);
ALTER TABLE school ADD COLUMN udise_code VARCHAR(11);
ALTER TABLE school ADD COLUMN affiliation_number VARCHAR(30);
ALTER TABLE school ADD COLUMN management VARCHAR(30);
ALTER TABLE school ADD COLUMN network VARCHAR(40);
ALTER TABLE school ADD CONSTRAINT ck_school_udise CHECK (udise_code IS NULL OR udise_code ~ '^[0-9]{11}$');
ALTER TABLE school ADD CONSTRAINT ck_school_management CHECK (management IS NULL OR management IN (
    'CENTRAL_GOVERNMENT', 'STATE_GOVERNMENT', 'LOCAL_BODY', 'GOVERNMENT_AIDED', 'PRIVATE_UNAIDED', 'OTHER'));
ALTER TABLE school ADD CONSTRAINT ck_school_network CHECK (network IS NULL OR network IN (
    'KENDRIYA_VIDYALAYA', 'JAWAHAR_NAVODAYA_VIDYALAYA', 'SAINIK_SCHOOL', 'EKLAVYA_MODEL_RESIDENTIAL_SCHOOL'));
CREATE UNIQUE INDEX uk_school_udise ON school (udise_code) WHERE udise_code IS NOT NULL;

-- Identity: the UDISE code when known. Without one, name + PIN within a state is the duplicate rule
-- (generic names such as "Government Primary School" legitimately repeat across states).
DROP INDEX uk_school_name_pin;
CREATE UNIQUE INDEX uk_school_name_pin ON school (state_code, lower(name), coalesce(pin_code, ''))
    WHERE udise_code IS NULL;

-- The official name itself states membership of these central networks, both of which are run by the
-- Ministry of Education (KVS and NVS); nothing else is inferred.
UPDATE school SET network = 'KENDRIYA_VIDYALAYA', management = 'CENTRAL_GOVERNMENT'
    WHERE name ~* 'kendriya\s+vidyalaya';
UPDATE school SET network = 'JAWAHAR_NAVODAYA_VIDYALAYA', management = 'CENTRAL_GOVERNMENT'
    WHERE name ~* 'navodaya\s+vidyalaya';

CREATE INDEX idx_school_state ON school (state_code, active);
CREATE INDEX idx_school_district ON school (district_id);
CREATE INDEX idx_school_city ON school (state_code, lower(city));
CREATE INDEX idx_school_management ON school (management);
CREATE INDEX idx_school_network ON school (network);
CREATE INDEX idx_school_last_verified ON school (last_verified_date DESC NULLS LAST);

-- Substring search ("LIKE '%term%'") over hundreds of thousands of rows needs trigram indexes.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_school_name_trgm ON school USING gin (lower(name) gin_trgm_ops);
CREATE INDEX idx_school_locality_trgm ON school USING gin (lower(locality) gin_trgm_ops);
CREATE INDEX idx_school_city_trgm ON school USING gin (lower(city) gin_trgm_ops);
CREATE INDEX idx_school_keywords_trgm ON school USING gin (search_keywords gin_trgm_ops);

-- A generic code for state/UT boards; the school's state identifies which board it is.
INSERT INTO education_board (code, name, website_url, description) VALUES
    ('STATE', 'State / UT board', NULL, 'The school education board of the state or union territory the school is in.');

INSERT INTO data_source (name, url, source_type, publisher, description) VALUES
    ('UDISE+ (Unified District Information System for Education Plus)', 'https://udiseplus.gov.in/', 'GOVERNMENT',
     'Ministry of Education, Government of India', 'National school registry: UDISE codes, management, enrolment and infrastructure.'),
    ('Kendriya Vidyalaya Sangathan', 'https://kvsangathan.nic.in/', 'GOVERNMENT',
     'Ministry of Education, Government of India', 'Official list and admission notices of Kendriya Vidyalayas.'),
    ('Navodaya Vidyalaya Samiti', 'https://navodaya.gov.in/', 'GOVERNMENT',
     'Ministry of Education, Government of India', 'Jawahar Navodaya Vidyalayas and the JNV Selection Test.');
