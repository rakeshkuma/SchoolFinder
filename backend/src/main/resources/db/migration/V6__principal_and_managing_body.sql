-- Published by the board or the school itself (e.g. CBSE SARAS); NULL when no official source states them.
ALTER TABLE school ADD COLUMN principal_name VARCHAR(150);
ALTER TABLE school ADD COLUMN managing_body VARCHAR(300);
