-- "Continue with Google": an account may be linked to one Google account (the stable OpenID Connect "sub" claim).
-- Members who signed up with Google have no password until they set one through a password-reset email.
-- No Google access or refresh tokens are stored.
ALTER TABLE user_account ALTER COLUMN password_hash DROP NOT NULL;
ALTER TABLE user_account ADD COLUMN google_subject VARCHAR(255);
CREATE UNIQUE INDEX uk_user_account_google_subject ON user_account (google_subject) WHERE google_subject IS NOT NULL;
