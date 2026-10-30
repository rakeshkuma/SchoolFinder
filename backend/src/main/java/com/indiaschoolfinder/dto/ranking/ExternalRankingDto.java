package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.LocalDate;

/**
 * One school's entry in an independently published ranking. {@code sponsored} entries are paid or "featured" listings
 * and must be shown with that label, never as a ranking position.
 */
public record ExternalRankingDto(
        Long id,
        String publisher,
        String rankingName,
        String rankingYear,
        String category,
        Integer rankPosition,
        String scoreText,
        String sourceUrl,
        LocalDate retrievedDate,
        VerificationStatus verificationStatus,
        String publisherCode,
        RankingScope scope,
        String region,
        boolean sponsored,
        String notes,
        LocalDate lastVerifiedDate) {
}
