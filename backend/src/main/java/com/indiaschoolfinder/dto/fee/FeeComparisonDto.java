package com.indiaschoolfinder.dto.fee;

import java.util.List;

/** Side-by-side fees for the same class and academic year. */
public record FeeComparisonDto(
        String academicYear,
        String classCode,
        List<Entry> schools) {

    public record Entry(Long schoolId, String schoolName, String slug, boolean available, FeeDto fee) {
    }
}
