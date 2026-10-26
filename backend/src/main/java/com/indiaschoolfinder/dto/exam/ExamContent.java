package com.indiaschoolfinder.dto.exam;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/**
 * The guide text of an exam, stored as one JSON document. Facts (eligibility, pattern, syllabus, fee) come from the
 * official sources; {@code preparation} and {@code faq} answers marked {@code guidance} are this site's own advice and
 * are labelled as such on the page.
 */
public record ExamContent(
        @NotBlank @Size(max = 500) String forSchools,
        @NotBlank @Size(max = 300) String entryClassText,
        @NotEmpty List<@NotBlank @Size(max = 600) String> eligibility,
        @NotNull List<@Valid PatternBlock> pattern,
        @NotNull List<@Valid SyllabusArea> syllabus,
        @NotNull List<@NotBlank @Size(max = 600) String> selection,
        @Size(max = 1000) String fee,
        @NotNull List<@Valid PrepStep> preparation,
        List<@NotBlank @Size(max = 300) String> documents,
        List<@Valid Faq> faq,
        @NotNull List<@Valid Paper> papers,
        @Size(max = 1000) String papersNote,
        @NotEmpty List<@Valid Link> officialLinks,
        @NotEmpty List<@Valid Link> sources,
        @Size(max = 300) String languages,
        /** How to apply, as the official notice describes it (not this site's advice). */
        List<@NotBlank @Size(max = 600) String> applicationSteps,
        /** Exam-day rules from the official notice: admit card, ID, pens, answer sheet, timing. */
        List<@NotBlank @Size(max = 600) String> examDay) {

    public record PatternBlock(@NotBlank @Size(max = 200) String title, @NotNull List<@Valid Section> sections,
                               @NotNull List<@NotBlank @Size(max = 400) String> notes) {
    }

    public record Section(@NotBlank @Size(max = 200) String name, Integer questions, Integer marks,
                          @Size(max = 40) String duration) {
    }

    public record SyllabusArea(@NotBlank @Size(max = 200) String area, @NotEmpty List<@NotBlank @Size(max = 400) String> topics) {
    }

    public record PrepStep(@NotBlank @Size(max = 200) String step, @NotBlank @Size(max = 600) String detail) {
    }

    /** {@code guidance}: true when the answer is this site's advice rather than an official rule. */
    public record Faq(@NotBlank @Size(max = 300) String question, @NotBlank @Size(max = 1000) String answer, boolean guidance) {
    }

    public record Paper(@NotBlank @Size(max = 40) String year, @NotBlank @Size(max = 200) String title,
                        @NotBlank @Size(max = 40) String kind, @NotBlank @Pattern(regexp = "https?://\\S+") String url,
                        @Size(max = 300) String note) {
    }

    public record Link(@NotBlank @Size(max = 200) String label, @NotBlank @Pattern(regexp = "https?://\\S+") @Size(max = 500) String url) {
    }
}
