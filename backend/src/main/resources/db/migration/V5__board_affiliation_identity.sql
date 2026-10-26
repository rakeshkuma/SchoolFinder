-- A board affiliation number identifies a school as reliably as a UDISE code: unique within its board.
CREATE UNIQUE INDEX uk_school_board_affiliation ON school (education_board_code, affiliation_number)
    WHERE education_board_code IS NOT NULL AND affiliation_number IS NOT NULL;

-- Name + PIN within a state is now the duplicate rule only for schools with neither identifier.
DROP INDEX uk_school_name_pin;
CREATE UNIQUE INDEX uk_school_name_pin ON school (state_code, lower(name), coalesce(pin_code, ''))
    WHERE udise_code IS NULL AND (education_board_code IS NULL OR affiliation_number IS NULL);
