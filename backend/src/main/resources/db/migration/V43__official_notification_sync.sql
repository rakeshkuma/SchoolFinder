-- Daily checks of approved official websites (NTA, Navodaya, Netarhat, KVS, CBSE, ...) add their new notices to the same
-- site_update table editors already use, so the home page ticker, the update cards and /updates read one list.
--
-- A notice found by the checker is published at once only when it comes from an approved source with a publication
-- date printed by that source; anything less certain waits for an editor (PENDING_REVIEW). Notices past their expiry
-- date become EXPIRED. Publication dates are never moved forward: a correction made by the source is recorded in
-- last_changed_at, which is what the "Updated" badge reads.

ALTER TABLE site_update ALTER COLUMN status TYPE VARCHAR(16);
ALTER TABLE site_update DROP CONSTRAINT ck_site_update_status;
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_status
    CHECK (status IN ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'));

-- EDITORIAL: written by an editor. OFFICIAL_SYNC: found by the daily check of an official website.
ALTER TABLE site_update ADD COLUMN origin VARCHAR(16) NOT NULL DEFAULT 'EDITORIAL';
ALTER TABLE site_update ADD CONSTRAINT ck_site_update_origin CHECK (origin IN ('EDITORIAL', 'OFFICIAL_SYNC'));
-- Which checker found it (for example 'nta-aissee') and the source's own identifier for the notice (its id, or the
-- canonical address of the notice when the source has no id). Together they identify one notice across daily runs.
ALTER TABLE site_update ADD COLUMN source_key VARCHAR(40);
ALTER TABLE site_update ADD COLUMN source_item_id VARCHAR(300);
-- The notice's title exactly as the source printed it (the display title may be shortened or edited by staff).
ALTER TABLE site_update ADD COLUMN official_title VARCHAR(400);
-- Fingerprint of what the source says (title, address, dates): a different fingerprint on a later run is a correction.
ALTER TABLE site_update ADD COLUMN content_hash VARCHAR(64);
-- False when the source printed no date and published_on is only the day the checker first saw the notice; such an
-- update is never published automatically, and an editor confirms the date before publishing it.
ALTER TABLE site_update ADD COLUMN date_confirmed BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE site_update ADD COLUMN first_seen_at TIMESTAMPTZ;
ALTER TABLE site_update ADD COLUMN last_seen_at TIMESTAMPTZ;
-- When the source last corrected the notice (title, address or dates).
ALTER TABLE site_update ADD COLUMN last_changed_at TIMESTAMPTZ;
-- A notice missing from a complete official listing is first marked missing; still missing a day later it is treated
-- as withdrawn and taken off the site.
ALTER TABLE site_update ADD COLUMN missing_since TIMESTAMPTZ;
ALTER TABLE site_update ADD COLUMN withdrawn_at TIMESTAMPTZ;
-- A later notice that replaces this one (set by an editor).
ALTER TABLE site_update ADD COLUMN superseded_by BIGINT REFERENCES site_update (id) ON DELETE SET NULL;
-- True once staff edited an automatically found update: later runs then keep the staff wording.
ALTER TABLE site_update ADD COLUMN staff_edited BOOLEAN NOT NULL DEFAULT FALSE;
-- Exam or scheme the update is about (aissee, jnvst, netarhat, kvs, ...), for links and filtering.
ALTER TABLE site_update ADD COLUMN topic VARCHAR(40);
-- Why the checker did not publish it, or what changed at the source, for the editor.
ALTER TABLE site_update ADD COLUMN review_note VARCHAR(600);

ALTER TABLE site_update ADD CONSTRAINT ck_site_update_sync_identity
    CHECK (origin = 'EDITORIAL' OR (source_key IS NOT NULL AND source_item_id IS NOT NULL));

CREATE UNIQUE INDEX ux_site_update_source_item ON site_update (source_key, source_item_id) WHERE source_key IS NOT NULL;
CREATE INDEX idx_site_update_expiry ON site_update (status, expires_on);
CREATE INDEX idx_site_update_source_url ON site_update (source_url);

-- One row per run of the checker: when it ran, what started it, how it went and what each source returned.
CREATE TABLE notification_sync_run (
    id               BIGSERIAL    PRIMARY KEY,
    trigger_kind     VARCHAR(12)  NOT NULL,
    status           VARCHAR(12)  NOT NULL,
    started_at       TIMESTAMPTZ  NOT NULL,
    finished_at      TIMESTAMPTZ,
    triggered_by     VARCHAR(100),
    instance_name    VARCHAR(100),
    sources_checked  INTEGER      NOT NULL DEFAULT 0,
    sources_failed   INTEGER      NOT NULL DEFAULT 0,
    items_found      INTEGER      NOT NULL DEFAULT 0,
    items_created    INTEGER      NOT NULL DEFAULT 0,
    items_updated    INTEGER      NOT NULL DEFAULT 0,
    items_published  INTEGER      NOT NULL DEFAULT 0,
    items_pending    INTEGER      NOT NULL DEFAULT 0,
    items_expired    INTEGER      NOT NULL DEFAULT 0,
    items_withdrawn  INTEGER      NOT NULL DEFAULT 0,
    -- JSON: one entry per source with its outcome, counts, duration and any error message.
    details          TEXT,
    CONSTRAINT ck_sync_run_trigger CHECK (trigger_kind IN ('SCHEDULED', 'STARTUP', 'MANUAL')),
    CONSTRAINT ck_sync_run_status CHECK (status IN ('RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'ABANDONED'))
);
CREATE INDEX idx_sync_run_started ON notification_sync_run (started_at DESC);
