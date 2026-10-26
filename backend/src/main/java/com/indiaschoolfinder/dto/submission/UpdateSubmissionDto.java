package com.indiaschoolfinder.dto.submission;

import com.indiaschoolfinder.enums.SubmissionStatus;
import com.indiaschoolfinder.enums.SubmitterRole;
import com.indiaschoolfinder.enums.UpdateTopic;

import java.time.Instant;

/** Admin view of a suggested update (contactEmail is null once the submission is closed). */
public record UpdateSubmissionDto(
        Long id,
        Long schoolId,
        String schoolName,
        String schoolSlug,
        UpdateTopic topic,
        String message,
        String sourceUrl,
        SubmitterRole role,
        String contactEmail,
        SubmissionStatus status,
        String reviewerNote,
        String reviewedBy,
        Instant reviewedAt,
        Instant createdAt) {
}
