package com.indiaschoolfinder.dto.admin;

import java.time.Instant;
import java.util.List;

/**
 * How much of each state's directory is filled in. Counts are of active schools in this database only; they say
 * nothing about how many schools the state actually has, so no state is ever reported as "complete".
 */
public record CoverageReport(Instant generatedAt, List<StateCoverage> states) {

    public record StateCoverage(
            String code,
            String name,
            boolean priority,
            long schools,
            long privateSchools,
            long verified,
            long withPhoto,
            long withFees,
            long withAdmissions,
            long withContact,
            long withCoordinates,
            long withClasses,
            Instant lastUpdated) {
    }
}
