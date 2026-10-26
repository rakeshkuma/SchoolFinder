package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.admin.CsvImportResult;

import java.io.InputStream;

public interface CsvImportService {

    enum Mode {
        /** Validate every row and report errors; nothing is saved. */
        VALIDATE_ONLY,
        /** Save only if every row is valid (default). */
        ALL_OR_NOTHING,
        /** Save valid rows and report the invalid ones. */
        VALID_ROWS_ONLY
    }

    String REQUIRED_HEADERS = "name, school_type, source_url";

    CsvImportResult importSchools(InputStream csv, Mode mode, boolean updateExisting);

    /**
     * Same rules as the CSV import, for a JSON array of objects (or {"schools": [...]}) whose keys are the CSV
     * column names. Arrays are joined with ";" (class_codes, facilities). Error rows are 1-based record positions.
     */
    CsvImportResult importJson(InputStream json, Mode mode, boolean updateExisting);
}
