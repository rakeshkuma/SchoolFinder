package com.indiaschoolfinder.enums;

/** Editorial state of an exam record. Only VERIFIED records are shown as confirmed; DRAFT records are never published. */
public enum ExamVerificationStatus {
    VERIFIED,
    NEEDS_REVIEW,
    DRAFT
}
