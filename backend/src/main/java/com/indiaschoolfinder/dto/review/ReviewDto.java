package com.indiaschoolfinder.dto.review;

import com.indiaschoolfinder.enums.ReviewStatus;
import com.indiaschoolfinder.enums.ReviewerRelationship;

import java.time.Instant;

public record ReviewDto(
        Long id,
        Long schoolId,
        String reviewerName,
        ReviewerRelationship relationship,
        int rating,
        String title,
        String comment,
        ReviewStatus status,
        Instant createdAt) {
}
