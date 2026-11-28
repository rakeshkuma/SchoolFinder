-- Lists of schools compiled by the site's owner. They are not rankings: nothing here is a rank, and the order of the
-- source document is kept only for reference. An item may name a school the directory does not have yet.
CREATE TABLE school_list (
    id             BIGSERIAL PRIMARY KEY,
    list_key       VARCHAR(40)  NOT NULL UNIQUE,
    kind           VARCHAR(20)  NOT NULL,
    code           VARCHAR(20),
    title          VARCHAR(120) NOT NULL,
    seed_version   INT          NOT NULL,
    CONSTRAINT ck_school_list_kind CHECK (kind IN ('TOP', 'STATE', 'CITY', 'BOARD', 'GOVERNMENT', 'BOARDING'))
);

CREATE TABLE school_list_item (
    id             BIGSERIAL PRIMARY KEY,
    list_id        BIGINT       NOT NULL REFERENCES school_list (id) ON DELETE CASCADE,
    source_order   INT          NOT NULL,
    name           VARCHAR(200) NOT NULL,
    place          VARCHAR(120) NOT NULL,
    state_code     VARCHAR(2),
    board_label    VARCHAR(60),
    type_label     VARCHAR(60)  NOT NULL,
    website_url    VARCHAR(300),
    -- Set only when exactly one directory school fits; otherwise the item has no profile to open.
    school_id      BIGINT REFERENCES school (id) ON DELETE SET NULL,
    UNIQUE (list_id, source_order)
);

CREATE INDEX idx_school_list_item_list ON school_list_item (list_id, name);
