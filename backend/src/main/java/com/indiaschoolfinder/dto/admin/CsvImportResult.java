package com.indiaschoolfinder.dto.admin;

import java.util.List;

public record CsvImportResult(
        String mode,
        int totalRows,
        int validRows,
        int created,
        int updated,
        int skipped,
        boolean committed,
        List<RowError> errors) {

    public record RowError(int row, String field, String message) {
    }
}
