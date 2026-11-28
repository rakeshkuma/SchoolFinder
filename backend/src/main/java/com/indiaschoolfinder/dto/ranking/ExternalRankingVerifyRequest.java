package com.indiaschoolfinder.dto.ranking;

import com.indiaschoolfinder.enums.VerificationStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * VERIFIED: the entry matches the publisher's page today. DISPUTED: it does not, or the page cannot be reached.
 * OUTDATED: a newer edition has replaced it. Only VERIFIED entries are shown publicly.
 */
public record ExternalRankingVerifyRequest(@NotNull VerificationStatus status, @Size(max = 500) String note) {
}
