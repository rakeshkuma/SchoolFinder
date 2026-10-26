package com.indiaschoolfinder.dto.review;

import com.indiaschoolfinder.enums.ReviewStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record ReviewModerationRequest(@NotNull ReviewStatus status, @Size(max = 500) String note) {
}
