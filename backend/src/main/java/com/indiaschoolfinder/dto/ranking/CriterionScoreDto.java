package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.VerificationStatus;

import java.math.BigDecimal;
import java.time.LocalDate;

public record CriterionScoreDto(
        Long id,
        Long schoolId,
        String criterionCode,
        String academicYear,
        BigDecimal rawScore,
        BigDecimal maxScore,
        BigDecimal normalizedScore,
        String evidenceNotes,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate) {
}
