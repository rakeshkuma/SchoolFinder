package com.indiaschoolfinder.dto.admin;

import java.time.Instant;
import java.util.List;

public record DataQualityReport(
        Instant generatedAt,
        String currentAcademicYear,
        long totalSchools,
        long activeSchools,
        long verifiedSchools,
        long unverifiedSchools,
        long staleVerifications,
        long missingCoordinates,
        long missingContactDetails,
        long missingBoard,
        long schoolsWithoutCurrentFees,
        long admissionsWithoutDates,
        long pendingReviews,
        long provisionalRankings,
        long definitiveRankings,
        List<SchoolIssues> schoolsNeedingAttention) {

    public record SchoolIssues(Long schoolId, String name, String slug, List<String> issues) {
    }
}
