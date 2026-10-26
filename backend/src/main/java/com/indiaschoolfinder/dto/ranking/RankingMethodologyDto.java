package com.indiaschoolfinder.dto.ranking;

import java.math.BigDecimal;
import java.util.List;

public record RankingMethodologyDto(
        String methodologyVersion,
        String academicYear,
        List<CriterionDto> criteria,
        BigDecimal minimumCoveragePercent,
        int minimumReviewsForParentFeedback,
        int maxEvidenceAgeYears,
        BigDecimal studentTeacherRatioBest,
        BigDecimal studentTeacherRatioWorst,
        List<ChecklistDto> checklists,
        long rankedSchools,
        long provisionalSchools,
        List<String> rules,
        String disclaimer) {

    public record CriterionDto(Long id, String code, String name, String description, BigDecimal weight,
                               int displayOrder, boolean active) {
    }

    /** The published facility checklist that scores a criterion when no verified score exists. */
    public record ChecklistDto(String criterionCode, List<String> items) {
    }
}
