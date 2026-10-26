package com.indiaschoolfinder.dto.admission;

import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.RequirementType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record AdmissionDto(
        Long id,
        Long schoolId,
        String schoolName,
        String schoolSlug,
        String classCode,
        String className,
        String academicYear,
        AdmissionCategory category,
        LocalDate applicationStartDate,
        LocalDate applicationEndDate,
        AdmissionStatus status,
        boolean statusOverridden,
        String statusOverrideReason,
        String ageEligibility,
        String selectionCriteria,
        String officialNotificationUrl,
        String applicationUrl,
        List<Requirement> requirements,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate,
        String notes,
        Instant updatedAt) {

    public record Requirement(RequirementType type, String description, boolean mandatory, Integer points) {
    }
}
