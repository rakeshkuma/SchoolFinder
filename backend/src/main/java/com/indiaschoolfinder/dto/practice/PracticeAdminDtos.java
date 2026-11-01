package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeQuestionReport;
import com.indiaschoolfinder.entity.PracticeSet;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** Practice content administration: sets with what needs checking, and reports about questions. */
public final class PracticeAdminDtos {

    private PracticeAdminDtos() {
    }

    /** Every set, published or not. {@code flags} name what an editor should look at. */
    public record SetRow(String slug, String examSlug, String title, PracticeSet.Kind kind, PracticeSet.Category category,
                         String level, int questionCount, int hindiQuestions, int chapterTagged, BigDecimal marksPerQuestion,
                         BigDecimal negativeMarks, boolean published, LocalDate reviewedOn, int displayOrder, long openReports,
                         Instant updatedAt, List<Flag> flags) {
    }

    public record Flag(String code, String message) {
    }

    /** Publish or unpublish a set. Publishing needs a review date (the set's own, or {@code reviewedOn} given here). */
    public record PublishRequest(@NotNull Boolean published, LocalDate reviewedOn) {
    }

    /** Record that a reviewer re-checked every question, answer and explanation of the set today. */
    public record ReviewRequest(@Size(max = 500) String note) {
    }

    public record CsvImportResult(String slug, int questions, int hindiQuestions, boolean published, String message) {
    }

    /** A report with the question it is about, so the editor can judge it without opening the set. */
    public record ReportRow(long id, String questionId, String setSlug, String setTitle, PracticeQuestionReport.Reason reason,
                            String message, PracticeQuestionReport.Status status, boolean signedIn, Instant createdAt,
                            String resolutionNote, String resolvedBy, Instant resolvedAt, QuestionView question) {
    }

    /** null when the question is no longer in the set. */
    public record QuestionView(String section, String topic, String prompt, List<String> options, int answer,
                               String explanation, PracticeContent.QuestionText hi) {
    }

    public record ResolveRequest(@NotNull PracticeQuestionReport.Status status, @Size(max = 1000) String note) {
    }
}
