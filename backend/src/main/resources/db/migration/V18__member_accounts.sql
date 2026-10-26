-- Member (parent / visitor) accounts. Separate from admin_user: staff sign in to the admin console with their own
-- accounts and roles. Passwords are BCrypt hashes; one-time tokens (email verification, password reset) are stored
-- only as SHA-256 hashes of high-entropy random values, so a database leak does not reveal usable links.
CREATE TABLE user_account (
    id                    BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    email                 VARCHAR(254)  NOT NULL,
    display_name          VARCHAR(80)   NOT NULL,
    password_hash         VARCHAR(100)  NOT NULL,
    role                  VARCHAR(20)   NOT NULL DEFAULT 'USER',
    email_verified_at     TIMESTAMPTZ,
    state_code            VARCHAR(2),
    city                  VARCHAR(80),
    terms_accepted_at     TIMESTAMPTZ   NOT NULL,
    terms_version         VARCHAR(20)   NOT NULL,
    failed_login_count    INT           NOT NULL DEFAULT 0,
    locked_until          TIMESTAMPTZ,
    password_changed_at   TIMESTAMPTZ   NOT NULL,
    last_login_at         TIMESTAMPTZ,
    version               BIGINT        NOT NULL DEFAULT 0,
    created_at            TIMESTAMPTZ   NOT NULL,
    updated_at            TIMESTAMPTZ   NOT NULL,
    CONSTRAINT ck_user_role CHECK (role IN ('USER')),
    CONSTRAINT ck_user_email_lower CHECK (email = lower(email))
);
CREATE UNIQUE INDEX uk_user_account_email ON user_account (email);

CREATE TABLE account_token (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id     BIGINT       NOT NULL REFERENCES user_account (id) ON DELETE CASCADE,
    purpose     VARCHAR(20)  NOT NULL,
    token_hash  VARCHAR(64)  NOT NULL,
    expires_at  TIMESTAMPTZ  NOT NULL,
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ  NOT NULL,
    CONSTRAINT ck_token_purpose CHECK (purpose IN ('VERIFY_EMAIL', 'RESET_PASSWORD'))
);
CREATE UNIQUE INDEX uk_account_token_hash ON account_token (token_hash);
CREATE INDEX idx_account_token_user ON account_token (user_id, purpose);

-- Spring Session JDBC (schema-postgresql.sql of spring-session-jdbc 3.x).
CREATE TABLE SPRING_SESSION (
    PRIMARY_ID CHAR(36) NOT NULL,
    SESSION_ID CHAR(36) NOT NULL,
    CREATION_TIME BIGINT NOT NULL,
    LAST_ACCESS_TIME BIGINT NOT NULL,
    MAX_INACTIVE_INTERVAL INT NOT NULL,
    EXPIRY_TIME BIGINT NOT NULL,
    PRINCIPAL_NAME VARCHAR(100),
    CONSTRAINT SPRING_SESSION_PK PRIMARY KEY (PRIMARY_ID)
);
CREATE UNIQUE INDEX SPRING_SESSION_IX1 ON SPRING_SESSION (SESSION_ID);
CREATE INDEX SPRING_SESSION_IX2 ON SPRING_SESSION (EXPIRY_TIME);
CREATE INDEX SPRING_SESSION_IX3 ON SPRING_SESSION (PRINCIPAL_NAME);

CREATE TABLE SPRING_SESSION_ATTRIBUTES (
    SESSION_PRIMARY_ID CHAR(36) NOT NULL,
    ATTRIBUTE_NAME VARCHAR(200) NOT NULL,
    ATTRIBUTE_BYTES BYTEA NOT NULL,
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_PK PRIMARY KEY (SESSION_PRIMARY_ID, ATTRIBUTE_NAME),
    CONSTRAINT SPRING_SESSION_ATTRIBUTES_FK FOREIGN KEY (SESSION_PRIMARY_ID) REFERENCES SPRING_SESSION (PRIMARY_ID) ON DELETE CASCADE
);
