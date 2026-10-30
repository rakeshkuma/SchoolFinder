package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.RankingPublisherKind;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Describes a publisher from its own website; the description must not copy its ranked lists. */
public record RankingPublisherRequest(
        @NotBlank @Size(max = 200) String name,
        @NotNull RankingPublisherKind kind,
        @HttpUrl String websiteUrl,
        @HttpUrl String methodologyUrl,
        @Size(max = 1000) String description,
        Boolean active) {
}
