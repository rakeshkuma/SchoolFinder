package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.Map;

/** The questions of a bank session ("set/question" ids, as served) and the option chosen for each answered one. */
public record BankScoreRequest(
        @NotEmpty @Size(max = 100) List<@NotNull @Pattern(regexp = "[a-z0-9-]+/[a-z0-9-]+") String> questionIds,
        @NotNull @Size(max = 100) Map<String, Integer> answers) {
}
