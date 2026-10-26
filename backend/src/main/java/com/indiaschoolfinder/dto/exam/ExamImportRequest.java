package com.indiaschoolfinder.dto.exam;

import com.indiaschoolfinder.enums.DatePrecision;
import com.indiaschoolfinder.enums.ExamBoarding;
import com.indiaschoolfinder.enums.ExamDateKind;
import com.indiaschoolfinder.enums.ExamKind;
import com.indiaschoolfinder.enums.ExamMode;
import com.indiaschoolfinder.enums.ExamNoticeKind;
import com.indiaschoolfinder.enums.ExamSchoolType;
import com.indiaschoolfinder.enums.ExamScope;
import com.indiaschoolfinder.enums.ExamVerificationStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.List;

/**
 * Exam records in the repeatable JSON import format (see backend/src/main/resources/seed/exams.json). Each record
 * replaces the stored exam with the same slug, including its dates and notices.
 */
public record ExamImportRequest(@NotEmpty @Size(max = 200) List<@Valid @NotNull ExamRecord> exams) {

    public record ExamRecord(
            @NotBlank @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String slug,
            @NotBlank @Size(max = 40) String shortName,
            @NotBlank @Size(max = 250) String name,
            @NotNull ExamKind kind,
            @NotBlank @Size(max = 300) String conductingAuthority,
            @NotNull ExamScope scope,
            @NotNull List<@NotBlank @Pattern(regexp = "[A-Z]{2}") String> stateCodes,
            @NotEmpty List<@NotNull ExamSchoolType> schoolTypes,
            @NotEmpty List<@NotNull @Min(1) @Max(12) Integer> entryClasses,
            @NotNull ExamBoarding boarding,
            Boolean applicationFree,
            ExamMode examMode,
            @NotBlank @Size(max = 40) String currentCycle,
            @Pattern(regexp = "\\d{4}-\\d{2}") String academicSession,
            @NotBlank @Size(max = 1000) String summary,
            @NotNull @Valid ExamContent content,
            Integer displayOrder,
            LocalDate lastVerifiedOn,
            @NotNull ExamVerificationStatus verificationStatus,
            boolean published,
            @NotNull List<@Valid @NotNull DateRecord> dates,
            @NotNull List<@Valid @NotNull NoticeRecord> notices) {
    }

    public record DateRecord(
            @NotBlank @Size(max = 40) String cycle,
            @NotNull ExamDateKind kind,
            @NotBlank @Size(max = 200) String label,
            @NotNull LocalDate startsOn,
            LocalDate endsOn,
            DatePrecision precision,
            boolean confirmed,
            @Size(max = 500) String note,
            @NotBlank @Pattern(regexp = "https?://\\S+") @Size(max = 500) String sourceUrl) {
    }

    public record NoticeRecord(
            @Size(max = 40) String cycle,
            @NotNull ExamNoticeKind kind,
            @NotBlank @Size(max = 300) String title,
            @NotNull LocalDate publishedOn,
            @NotBlank @Pattern(regexp = "https?://\\S+") @Size(max = 500) String url) {
    }
}
