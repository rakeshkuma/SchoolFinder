package com.indiaschoolfinder.dto.practice;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** A student's own progress, shown only to that student. */
public final class ProgressDtos {

    private ProgressDtos() {
    }

    /**
     * A badge and how far along the student is. {@code earnedAt}: null until earned. {@code current} of {@code target}
     * is the progress towards it; {@code target} is 0 for rank badges, which have no progress to show.
     */
    public record Achievement(String code, String title, String description, String group, Instant earnedAt, int current, int target) {
    }

    /** A badge earned by the attempt just submitted. */
    public record Earned(String code, String title) {
    }

    /** One week or month, from {@code start}; {@code accuracy} is null when nothing was answered. */
    public record Period(LocalDate start, int tests, int answered, int correct, Integer accuracy, long points) {
    }

    /** Results for one exam; {@code bestScore}: the highest test score, as a whole percentage. */
    public record ExamRow(String examSlug, String examName, int tests, int answered, int correct, Integer accuracy, int bestScore) {
    }

    /** One date's counted daily quiz. */
    public record DailyDay(LocalDate date, int total, int attempted, int correct, int points) {
    }

    /**
     * Everything is worked out from the student's stored attempts. {@code rank}: all-time position among the
     * {@code participants} ranked students, null before any points. {@code activeDays}: days with a counted test in the
     * last 12 weeks.
     */
    public record Report(long points, Integer rank, long participants, int currentStreak, int longestStreak, int dailyStreak,
                         List<LocalDate> activeDays, List<Period> weeks, List<Period> months, List<ExamRow> exams,
                         List<DailyDay> daily, List<Achievement> achievements) {
    }
}
