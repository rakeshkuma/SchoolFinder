package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * A member's finished attempt, scored and saved by the server. {@code clientId} is generated once per attempt by the
 * browser: sending the same attempt again (double click, retry after a dropped connection, import after sign-in)
 * returns the first result instead of saving a second attempt.
 */
public record AttemptRequest(
        @NotNull UUID clientId,
        @NotBlank @Size(max = 200) String title,
        @NotNull PracticeMode mode,
        @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String examSlug,
        @Pattern(regexp = "[a-z0-9]+(-[a-z0-9]+)*") @Size(max = 80) String setSlug,
        @NotEmpty @Size(max = 100) List<@NotNull @Pattern(regexp = "[a-z0-9-]+/[a-z0-9-]+") String> questionIds,
        @NotNull @Size(max = 100) Map<String, Integer> answers,
        @Min(0) @Max(86400) Integer durationSeconds) {
}
