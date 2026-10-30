package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.RankingScope;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/**
 * Records a school's entry exactly as the publisher printed it, with the page it appears on. Give either
 * publisherCode (a recorded publisher) or publisher (its name). Saved as UNVERIFIED until an editor checks it.
 */
public record ExternalRankingRequest(
        @Size(max = 200) String publisher,
        @NotBlank @Size(max = 300) String rankingName,
        @NotBlank @Size(max = 20) String rankingYear,
        @Size(max = 200) String category,
        @Min(1) Integer rankPosition,
        @Size(max = 100) String scoreText,
        @NotBlank @HttpUrl String sourceUrl,
        @NotNull @PastOrPresent LocalDate retrievedDate,
        @Size(max = 40) String publisherCode,
        RankingScope scope,
        @Size(max = 100) String region,
        Boolean sponsored,
        @Size(max = 500) String notes) {
}
