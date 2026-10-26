package com.indiaschoolfinder.dto.admin;

import com.indiaschoolfinder.enums.VerifiableEntityType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.Instant;

public record VerificationHistoryDto(
        Long id,
        VerifiableEntityType entityType,
        Long entityId,
        VerificationStatus previousStatus,
        VerificationStatus newStatus,
        String sourceUrl,
        String notes,
        String verifiedBy,
        Instant verifiedAt) {
}
