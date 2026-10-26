package com.indiaschoolfinder.dto.review;

import com.indiaschoolfinder.enums.ReviewerRelationship;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Public review submission. No email, phone or child details are requested. The reviewer must
 * consent to publication; the review is held for moderation before it appears.
 */
public record ReviewRequest(
        @Size(max = 80) String reviewerName,
        @NotNull ReviewerRelationship relationship,
        @NotNull @Min(1) @Max(5) Integer rating,
        @NotBlank @Size(min = 5, max = 150) String title,
        @NotBlank @Size(min = 30, max = 3000) String comment,
        @AssertTrue(message = "consent to publish the review is required") boolean consentGiven) {
}
