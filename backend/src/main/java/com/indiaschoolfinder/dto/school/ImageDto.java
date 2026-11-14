package com.indiaschoolfinder.dto.school;

import com.indiaschoolfinder.enums.ImagePermission;
import com.indiaschoolfinder.enums.ImageType;
import com.indiaschoolfinder.enums.VerificationStatus;

import java.time.Instant;
import java.time.LocalDate;

/**
 * A school image with its source and licence. {@code sourceWebsite} is the host of the source page (e.g.
 * commons.wikimedia.org); {@code createdAt} is when it was added here.
 */
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
        LocalDate lastVerifiedDate,
        String author,
        String title,
        String sourceWebsite,
        String permissionNote,
        Instant createdAt) {
}
