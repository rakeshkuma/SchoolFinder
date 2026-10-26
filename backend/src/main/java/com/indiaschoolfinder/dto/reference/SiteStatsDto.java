package com.indiaschoolfinder.dto.reference;

public record SiteStatsDto(
        long activeSchools,
        long verifiedSchools,
        long localities,
        /* states/UTs and districts that have at least one active school */
        long statesCovered,
        long districtsCovered,
        long schoolsWithCurrentFees,
        String currentAcademicYear) {
}
