-- Official notices (PDF or image) uploaded for review. The text is read from the PDF's text layer, or by OCR when an
-- engine is configured; a reviewer checks it against the page images before anything taken from it is used.
CREATE TABLE source_document (
    id                 BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    school_id          BIGINT        REFERENCES school (id) ON DELETE SET NULL,
    exam_slug          VARCHAR(60),
    title              VARCHAR(300)  NOT NULL,
    source_url         VARCHAR(600)  NOT NULL,
    published_on       DATE,
    file_name          VARCHAR(255)  NOT NULL,
    content_type       VARCHAR(100)  NOT NULL,
    size_bytes         BIGINT        NOT NULL,
    sha256             VARCHAR(64)   NOT NULL,
    page_count         INT           NOT NULL,
    extraction_method  VARCHAR(20)   NOT NULL,
    extracted_text     TEXT,
    reviewed_text      TEXT,
    status             VARCHAR(20)   NOT NULL DEFAULT 'PENDING_REVIEW',
    review_note        VARCHAR(1000),
    reviewed_by        VARCHAR(100),
    reviewed_at        TIMESTAMPTZ,
    created_at         TIMESTAMPTZ   NOT NULL,
    updated_at         TIMESTAMPTZ   NOT NULL,
    created_by         VARCHAR(100),
    updated_by         VARCHAR(100),
    CONSTRAINT uk_source_document_sha UNIQUE (sha256),
    CONSTRAINT ck_source_document_status CHECK (status IN ('PENDING_REVIEW', 'VERIFIED', 'REJECTED')),
    CONSTRAINT ck_source_document_method CHECK (extraction_method IN ('TEXT_LAYER', 'OCR', 'NONE'))
);
CREATE INDEX idx_source_document_status ON source_document (status, created_at DESC);
CREATE INDEX idx_source_document_school ON source_document (school_id);

-- The file itself, kept apart so lists and reviews never load it.
CREATE TABLE source_document_file (
    document_id  BIGINT PRIMARY KEY REFERENCES source_document (id) ON DELETE CASCADE,
    data         BYTEA  NOT NULL
);

-- Pairs an editor has checked and found NOT to be duplicates, so the report stops showing them.
CREATE TABLE duplicate_dismissal (
    school_a    BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    school_b    BIGINT        NOT NULL REFERENCES school (id) ON DELETE CASCADE,
    note        VARCHAR(500),
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now(),
    created_by  VARCHAR(100),
    PRIMARY KEY (school_a, school_b),
    CONSTRAINT ck_duplicate_dismissal_order CHECK (school_a < school_b)
);
