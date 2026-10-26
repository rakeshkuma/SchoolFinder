package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.LocalDate;

public record ImageDto(
        Long id,
        ImageType imageType,
        String url,
        String thumbnailUrl,
        String caption,
        String altText,
        String credit,
        String license,
        String attributionText,
        ImagePermission permissionStatus,
        boolean illustrative,
        String sourceUrl,
        Integer width,
        Integer height,
        int sortOrder,
        VerificationStatus verificationStatus,
        LocalDate lastVerifiedDate) {
}
