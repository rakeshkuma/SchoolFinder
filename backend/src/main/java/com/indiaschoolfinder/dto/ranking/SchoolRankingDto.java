package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.dto.school.SchoolSummaryDto;
import com.indiaschoolfinder.entity.SchoolRanking;
import com.indiaschoolfinder.enums.RankingStatus;
import com.indiaschoolfinder.enums.SchoolType;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/**
 * rankPosition is the all-India position; scopePosition is the position within the requested scope (state, district,
 * board, ...). Both are null for provisional results, and ties share a position ("1, 2, 2, 4").
 */
public record SchoolRankingDto(
        Long schoolId,
        String schoolName,
        String slug,
        String locality,
        String city,
        String districtName,
        String stateCode,
        String stateName,
        String boardCode,
        SchoolType schoolType,
        String academicYear,
        BigDecimal totalScore,
        Integer rankPosition,
        Integer scopePosition,
        RankingStatus status,
        boolean provisional,
        /* share of weight backed by any evidence */
        BigDecimal coveragePercent,
        /* share of weight backed by verified evidence; a definitive rank needs the published minimum */
        BigDecimal verifiedCoveragePercent,
        List<SchoolRanking.CriterionContribution> breakdown,
        String methodologyVersion,
        Instant calculatedAt,
        /* card facts: publishable cover image, lowest official annual fee, admission status; never part of the score */
        SchoolSummaryDto card,
        /* lowest and highest class offered, or null when not published */
        String lowestClass,
        String highestClass) {
}
