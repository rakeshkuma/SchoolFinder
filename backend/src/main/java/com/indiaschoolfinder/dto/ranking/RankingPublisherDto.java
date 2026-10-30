package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.RankingPublisherKind;

/** A ranking publisher; {@code verifiedEntries} counts its checked, non-sponsored entries on this site. */
public record RankingPublisherDto(
        Long id,
        String code,
        String name,
        RankingPublisherKind kind,
        String websiteUrl,
        String methodologyUrl,
        String description,
        boolean active,
        long verifiedEntries) {
}
