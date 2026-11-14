package com.indiaschoolfinder.dto.practice;

import java.math.BigDecimal;
import java.util.List;

/**
 * Result of an attempt, always computed on the server. Counts are plain right/wrong; {@code marks} applies each
 * question's set marking (marks for a correct answer, marks deducted for a wrong one, nothing for a skipped one).
 * This is the site's practice marking as stated on each set, not a claim about an exam's official scheme. Marks are
 * null in attempts saved before marking was recorded.
 */
public record ScoreResultDto(int total, int attempted, int correct, List<SectionScore> sections, List<TopicScore> topics,
                             List<QuestionResult> questions, BigDecimal marks, BigDecimal maxMarks) {

    public record SectionScore(String section, int total, int attempted, int correct, BigDecimal marks, BigDecimal maxMarks) {
    }

    public record TopicScore(String section, String topic, int total, int attempted, int correct) {
    }

    /** {@code explanationHi} is present when the question has a reviewed Hindi version. */
    public record QuestionResult(String id, Integer chosen, int answer, boolean correct, String explanation,
                                 BigDecimal marksAwarded, String explanationHi) {
    }
}
