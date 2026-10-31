package com.indiaschoolfinder.dto.practice;

import java.time.Instant;
import java.util.List;
import java.util.Map;

/** A member's saved practice attempts, as returned to that member only. */
public final class AttemptDtos {

    private AttemptDtos() {
    }

    public record Summary(long id, java.util.UUID clientId, String title, PracticeMode mode, String examSlug, String setSlug, int total,
                          int attempted, int correct, Integer durationSeconds, Instant createdAt,
                          List<ScoreResultDto.SectionScore> sections,
                          /* null for attempts saved before marking was recorded */
                          java.math.BigDecimal marks, java.math.BigDecimal maxMarks) {
    }

    /** {@code duplicate}: true when this attempt had already been saved (same clientId) and nothing new was stored. */
    public record Saved(Summary attempt, ScoreResultDto score, boolean duplicate, Points points) {
    }

    /**
     * Leaderboard points for an attempt (separate from its marks). {@code dailyQuiz}: it counted as that day's quiz.
     * {@code reviewFlag}: why correct answers earned nothing (NO_TIMING, TOO_FAST); null otherwise. {@code rank}: all-time
     * position among {@code participants}, null before any points. {@code previousBest}: best earlier score on this set,
     * as a percentage, null if there is none. {@code achievements}: badges this attempt earned.
     */
    public record Points(int earned, boolean dailyQuiz, String reviewFlag, Integer rank, long participants, Integer previousBest,
                         List<ProgressDtos.Earned> achievements) {
    }

    public record Detail(Summary attempt, List<String> questionIds, Map<String, Integer> answers, ScoreResultDto score) {
    }

    /**
     * One attempt for the progress dashboard: its summary, topic scores and, per question, whether it was attempted
     * and right. No question text, answers or explanations.
     */
    public record HistoryItem(Summary attempt, List<ScoreResultDto.TopicScore> topics, List<QuestionOutcome> questions) {
    }

    public record QuestionOutcome(String id, boolean attempted, boolean correct) {
    }

    /** Question ids whose most recent answer was wrong, newest mistake first: the revision mode's questions. */
    public record Revision(List<String> questionIds) {
    }
}
