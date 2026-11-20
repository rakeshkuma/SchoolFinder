package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeQuestionReport;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * A visitor's report about a practice question. {@code message} is optional (needed for OTHER); {@code website} is a
 * honeypot that people never see or fill.
 */
public record QuestionReportRequest(@NotNull PracticeQuestionReport.Reason reason, @Size(max = 1000) String message,
                                    @Size(max = 200) String website) {
}
