package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;

/** Exam slugs saved in the browser before signing in, to add to the member's saved exams. Unknown slugs are skipped. */
public record SavedExamsRequest(@NotNull @Size(max = 50) List<@NotNull @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") String> slugs) {
}
