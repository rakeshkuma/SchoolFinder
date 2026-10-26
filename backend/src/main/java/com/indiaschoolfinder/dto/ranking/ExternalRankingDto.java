package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.LocalDate;

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
        VerificationStatus verificationStatus) {
}
