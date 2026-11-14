-- Profile photo of members who sign in with Google: the address of the picture Google reports
-- (lh3.googleusercontent.com), refreshed at each Google sign-in. The image itself is not copied.
ALTER TABLE user_account ADD COLUMN picture_url VARCHAR(500);
