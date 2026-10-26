package com.indiaschoolfinder.dto.exam;

import java.util.List;

public record ExamImportResult(int created, int updated, List<String> slugs) {
}
