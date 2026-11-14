-- Whether a ranking publisher has agreed to SchoolDhundo showing its ranks. Entries of private publishers are entered by
-- an administrator only after permission; government and board sources need none. The status is recorded, not enforced:
-- an administrator still verifies and publishes each entry.
ALTER TABLE ranking_publisher
    ADD COLUMN permission_status VARCHAR(20) NOT NULL DEFAULT 'NOT_REQUESTED',
    ADD COLUMN permission_updated_on DATE,
    ADD CONSTRAINT ck_ranking_publisher_permission
        CHECK (permission_status IN ('NOT_REQUESTED', 'REQUESTED', 'GRANTED', 'NOT_NEEDED'));
