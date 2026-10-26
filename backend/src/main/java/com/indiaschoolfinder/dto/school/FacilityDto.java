package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.FacilityCategory;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.LocalDate;

public record FacilityDto(
        Long id,
        FacilityCategory category,
        String name,
        String description,
        Boolean available,
        String sourceUrl,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate) {
}
