package com.indiaschoolfinder.dto.practice;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Map;

/** Chosen option index per question id; unanswered questions are simply left out. */
public record ScoreRequest(@NotNull @Size(max = 200) Map<String, Integer> answers) {
}
