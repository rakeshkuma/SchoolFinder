package com.indiaschoolfinder.dto.practice;

import com.indiaschoolfinder.entity.PracticeSet;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Practice sets in the import format of backend/src/main/resources/seed/practice.json; each replaces the set with its slug. */
public record PracticeImportRequest(@NotEmpty @Size(max = 100) List<@Valid @NotNull SetRecord> sets) {

    public record SetRecord(
            @NotBlank @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String slug,
            @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") String examSlug,
            @NotBlank @Size(max = 200) String title,
            @NotNull PracticeSet.Kind kind,
            @NotBlank @Size(max = 100) String level,
            @NotBlank @Size(max = 1000) String description,
            @Min(1) @Max(300) Integer durationMinutes,
            Integer displayOrder,
            boolean published,
            @NotNull @Valid PracticeContent content) {
    }
}
