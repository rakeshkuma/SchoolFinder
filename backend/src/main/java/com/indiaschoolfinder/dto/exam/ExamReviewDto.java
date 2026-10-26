package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.ExamStatus;
import com.indiaschoolfinder.enums.ExamVerificationStatus;

import java.time.LocalDate;
import java.util.List;

/** An exam record with the problems an editor should look at (stale verification, passed tentative dates …). */
public record ExamReviewDto(String slug, String shortName, boolean published, ExamVerificationStatus verificationStatus,
                            LocalDate lastVerifiedOn, String currentCycle, ExamStatus status, List<Flag> flags) {

    public record Flag(String code, String message) {
    }
}
