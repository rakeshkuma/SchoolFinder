package com.indiaschoolfinder.dto.admission;

import com.indiaschoolfinder.enums.AdmissionCategory;
import com.indiaschoolfinder.enums.AdmissionStatus;
import com.indiaschoolfinder.enums.RequirementType;
import com.indiaschoolfinder.validation.AcademicYear;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * One admission cycle. statusOverride lets an administrator record an exceptional status from an
 * official notice (e.g. deadline extended); otherwise status is derived from the dates.
 */
public record AdmissionRequest(
        @NotBlank @Size(max = 20) String classCode,
        @NotBlank @AcademicYear String academicYear,
        @NotNull AdmissionCategory category,
        LocalDate applicationStartDate,
        LocalDate applicationEndDate,
        AdmissionStatus statusOverride,
        @Size(max = 500) String statusOverrideReason,
        @Size(max = 500) String ageEligibility,
        @Size(max = 5000) String selectionCriteria,
        @HttpUrl String officialNotificationUrl,
        @HttpUrl String applicationUrl,
        @Size(max = 50) List<@Valid RequirementRequest> requirements,
        @NotBlank(message = "a source URL (official notice) is required") @HttpUrl String sourceUrl,
        @Size(max = 2000) String notes) {

    @AssertTrue(message = "applicationEndDate must not be before applicationStartDate")
    public boolean isDateRangeValid() {
        return applicationStartDate == null || applicationEndDate == null
                || !applicationEndDate.isBefore(applicationStartDate);
    }

    @AssertTrue(message = "statusOverrideReason is required when statusOverride is set")
    public boolean isOverrideReasonPresent() {
        return statusOverride == null || (statusOverrideReason != null && !statusOverrideReason.isBlank());
    }

    public record RequirementRequest(
            @NotNull RequirementType type,
            @NotBlank @Size(max = 1000) String description,
            Boolean mandatory,
            @Min(0) @Max(1000) Integer points) {
    }
}
