package com.indiaschoolfinder.dto.ranking;

/** A published-ranking entry with the school it belongs to, for lists across schools. */
public record ExternalRankingListItemDto(
        ExternalRankingDto entry,
        Long schoolId,
        String schoolName,
        String schoolSlug,
        String city,
        String stateCode) {
}
