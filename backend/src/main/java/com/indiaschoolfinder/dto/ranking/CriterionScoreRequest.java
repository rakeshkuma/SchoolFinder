package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.validation.AcademicYear;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/** Evidence-backed score for a criterion. It counts toward rankings only once VERIFIED. */
public record CriterionScoreRequest(
        @NotBlank @Size(max = 40) String criterionCode,
        @NotBlank @AcademicYear String academicYear,
        @NotNull @DecimalMin("0") @Digits(integer = 8, fraction = 2) BigDecimal rawScore,
        @NotNull @DecimalMin(value = "0", inclusive = false) @Digits(integer = 8, fraction = 2) BigDecimal maxScore,
        @Size(max = 2000) String evidenceNotes,
        @NotBlank(message = "a source URL is required for ranking evidence") @HttpUrl String sourceUrl) {

    @AssertTrue(message = "rawScore must not exceed maxScore")
    public boolean isRawWithinMax() {
        return rawScore == null || maxScore == null || rawScore.compareTo(maxScore) <= 0;
    }
}
