package com.indiaschoolfinder.dto.practice;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** The questions of a practice set, with answers and explanations; stored as one JSON document. */
public record PracticeContent(
        @NotNull List<@Valid Passage> passages,
        @NotEmpty @Size(max = 200) List<@Valid @NotNull Question> questions) {

    public record Passage(@NotBlank @Pattern(regexp = "[a-z0-9-]+") String id, @NotBlank @Size(max = 200) String title,
                          @NotBlank @Size(max = 4000) String text) {
    }

    /**
     * {@code answer} is the index (0-based) of the correct option. {@code passageId} links a question to a passage.
     * {@code figure} is an optional row of problem figures (drawn left to right, followed by "?" when the question asks
     * for the next one); {@code optionFigures}, when present, has one figure per option.
     */
    public record Question(@NotBlank @Pattern(regexp = "[a-z0-9-]+") String id, @NotBlank @Size(max = 60) String section,
                           @Size(max = 80) String topic, String passageId, @NotBlank @Size(max = 1000) String prompt,
                           @NotNull @Size(min = 2, max = 5) List<@NotBlank @Size(max = 300) String> options,
                           @NotNull @Min(0) @Max(4) Integer answer, @NotBlank @Size(max = 1000) String explanation,
                           @Size(max = 6) List<@Valid @NotNull Figure> figure, boolean figureAsksNext,
                           @Size(max = 5) List<@Valid @NotNull Figure> optionFigures) {
    }

    /**
     * A drawing on a 100 × 100 grid made of simple shapes — rendered by the site as SVG, so imported content never
     * carries markup. {@code alt} describes it for screen readers.
     */
    public record Figure(@NotBlank @Size(max = 200) String alt, @NotEmpty @Size(max = 30) List<@Valid @NotNull Shape> shapes) {
    }

    /** Centre (x, y), size (diameter, side or length), clockwise rotation in degrees, outline or filled. */
    public record Shape(@NotBlank @Pattern(regexp = "circle|square|triangle|arrow|dot|line") String kind,
                        @Min(0) @Max(100) double x, @Min(0) @Max(100) double y, @Min(1) @Max(100) double size,
                        @Min(-360) @Max(360) double rotate, boolean filled) {
    }
}
