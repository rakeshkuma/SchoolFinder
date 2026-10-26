package com.indiaschoolfinder.dto.admin;

import com.indiaschoolfinder.enums.VerifiableEntityType;
import com.indiaschoolfinder.enums.VerificationStatus;
import com.indiaschoolfinder.validation.HttpUrl;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * One verification decision applied to several records of the same school (for example every facility listed on the
 * school's own facilities page), all checked against the same cited source. Each record gets its own history entry.
 */
public record BatchVerifyRequest(
        @NotNull VerifiableEntityType entityType,
        @NotEmpty @Size(max = 50) List<@NotNull Long> entityIds,
        @NotNull VerificationStatus status,
        @NotBlank(message = "cite the source used to verify") @HttpUrl String sourceUrl,
        @Size(max = 1000) String notes) {
}
