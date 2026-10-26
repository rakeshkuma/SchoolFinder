package com.indiaschoolfinder.dto.practice;

import java.util.List;

/** Result of an attempt. Nothing about the attempt is stored. */
public record ScoreResultDto(int total, int attempted, int correct, List<SectionScore> sections, List<QuestionResult> questions) {

    public record SectionScore(String section, int total, int attempted, int correct) {
    }

    public record QuestionResult(String id, Integer chosen, int answer, boolean correct, String explanation) {
    }
}
