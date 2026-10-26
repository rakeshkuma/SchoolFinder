package com.indiaschoolfinder.dto.submission;

import com.indiaschoolfinder.enums.SubmissionStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Closes a submission: ACCEPTED once the change has been applied with the admin tools, or REJECTED. */
public record SubmissionReviewRequest(@NotNull SubmissionStatus status, @Size(max = 500) String note) {
}
