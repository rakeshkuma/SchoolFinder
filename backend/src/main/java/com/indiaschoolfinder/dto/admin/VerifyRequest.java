package com.indiaschoolfinder.dto.admin;

import com.indiaschoolfinder.enums.VerifiableEntityType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Records a verification decision for the school itself (entityType SCHOOL, entityId optional)
 * or one of its child records. The cited source URL is stored in the verification history.
 */
public record VerifyRequest(
        @NotNull VerifiableEntityType entityType,
        Long entityId,
        @NotNull VerificationStatus status,
        @NotBlank(message = "cite the source used to verify") @HttpUrl String sourceUrl,
        @Size(max = 1000) String notes) {
}
