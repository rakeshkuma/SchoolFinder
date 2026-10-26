package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.RankingStatus;

import java.util.List;

/**
 * Ranking tab of a school profile: this site's score (if any) plus independently published rankings.
 * status is NOT_YET_RANKED when the school has no usable evidence (siteRanking is then null).
 */
public record SchoolRankingDetailDto(
        Long schoolId,
        RankingStatus status,
        SchoolRankingDto siteRanking,
        List<ExternalRankingDto> externalRankings,
        String disclaimer) {
}
