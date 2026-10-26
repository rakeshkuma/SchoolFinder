package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PastOrPresent;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

public record ExternalRankingRequest(
        @NotBlank @Size(max = 200) String publisher,
        @NotBlank @Size(max = 300) String rankingName,
        @NotBlank @Size(max = 20) String rankingYear,
        @Size(max = 200) String category,
        @Min(1) Integer rankPosition,
        @Size(max = 100) String scoreText,
        @NotBlank @HttpUrl String sourceUrl,
        @NotNull @PastOrPresent LocalDate retrievedDate) {
}
