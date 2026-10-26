-- Monthly non-tuition charges (e.g. development fund or smart-class fee billed every month alongside tuition).
ALTER TABLE school_fee ADD COLUMN monthly_charges NUMERIC(12, 2);
ALTER TABLE school_fee ADD COLUMN monthly_charges_description VARCHAR(500);
ALTER TABLE school_fee ADD CONSTRAINT ck_school_fee_monthly_charges CHECK (monthly_charges IS NULL OR monthly_charges >= 0);

-- Derived search text: name initials ("dps", "kv", "tbs"), the name without punctuation and the board code.
-- Maintained by the School entity on every save; backfilled here for existing rows.
ALTER TABLE school ADD COLUMN search_keywords VARCHAR(1000);
UPDATE school SET search_keywords = concat_ws(' ',
        array_to_string(ARRAY(SELECT left(w, 1) FROM regexp_split_to_table(lower(name), '[^a-z0-9]+') AS w WHERE w <> ''), ''),
        regexp_replace(lower(name), '[^a-z0-9]+', '', 'g'),
        lower(education_board_code));
