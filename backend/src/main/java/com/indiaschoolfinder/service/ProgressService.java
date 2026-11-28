package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.ProgressDtos;
import com.indiaschoolfinder.entity.Exam;
import com.indiaschoolfinder.repository.ExamRepository;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * A student's progress, worked out from their stored attempts on every request (no stored copy that could drift), for
 * members and guests alike. All of it is returned only to the student it belongs to.
 */
@Service
public class ProgressService {

    static final int WEEKS = 8;
    static final int MONTHS = 6;
    static final int ACTIVE_DAYS = 84;
    static final int DAILY_HISTORY = 30;

    private final AchievementService achievements;
    private final LeaderboardService leaderboard;
    private final ExamRepository exams;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ProgressService(AchievementService achievements, LeaderboardService leaderboard, ExamRepository exams, JdbcTemplate jdbc, Clock clock) {
        this.achievements = achievements;
        this.leaderboard = leaderboard;
        this.exams = exams;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    public ProgressDtos.Report report(long participantId) {
        ZoneId zone = clock.getZone();
        LocalDate today = LocalDate.now(clock);
        List<AchievementService.Attempt> attempts = achievements.attempts(participantId);
        Set<LocalDate> days = new HashSet<>();
        Set<LocalDate> quizDays = new HashSet<>();
        for (AchievementService.Attempt a : attempts) {
            if (a.counted()) days.add(day(a, zone));
            if (a.dailyDate() != null) quizDays.add(a.dailyDate());
        }
        List<LocalDate> recent = days.stream().filter(d -> d.isAfter(today.minusDays(ACTIVE_DAYS))).sorted().toList();
        LeaderboardService.Position position = leaderboard.position(participantId);
        long points = attempts.stream().mapToLong(AchievementService.Attempt::points).sum();
        LocalDate thisWeek = today.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate thisMonth = today.withDayOfMonth(1);
        List<LocalDate> weekStarts = new ArrayList<>();
        for (int i = WEEKS - 1; i >= 0; i--) weekStarts.add(thisWeek.minusWeeks(i));
        List<LocalDate> monthStarts = new ArrayList<>();
        for (int i = MONTHS - 1; i >= 0; i--) monthStarts.add(thisMonth.minusMonths(i));
        return new ProgressDtos.Report(points, position == null ? null : position.rank(), position == null ? 0 : position.participants(),
                LeaderboardService.streak(days, today), longest(days), LeaderboardService.streak(quizDays, today), recent,
                periods(attempts, weekStarts, d -> d.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY)), zone),
                periods(attempts, monthStarts, d -> d.withDayOfMonth(1), zone),
                examRows(attempts), daily(attempts), achievements.forParticipant(participantId));
    }

    /** The student's best score on this set before this attempt, as a whole percentage; null if it is their first. */
    public Integer previousBest(long participantId, String setSlug, long attemptId, Instant before) {
        if (setSlug == null) return null;
        return jdbc.queryForObject("SELECT max(round(100.0 * correct / total))::int FROM practice_attempt"
                + " WHERE participant_id = ? AND set_slug = ? AND id <> ? AND created_at < ? AND total > 0 AND " + LeaderboardService.COUNTED,
                Integer.class, participantId, setSlug, attemptId, Timestamp.from(before));
    }

    static int longest(Set<LocalDate> days) {
        int best = 0;
        for (LocalDate d : days) {
            if (days.contains(d.minusDays(1))) continue; // only count from the start of a run
            int run = 0;
            for (LocalDate x = d; days.contains(x); x = x.plusDays(1)) run++;
            best = Math.max(best, run);
        }
        return best;
    }

    private static LocalDate day(AchievementService.Attempt a, ZoneId zone) {
        return a.at().atZone(zone).toLocalDate();
    }

    /** Every period in {@code starts}, with empty ones kept so a chart shows the gaps honestly. */
    private static List<ProgressDtos.Period> periods(List<AchievementService.Attempt> attempts, List<LocalDate> starts,
                                                     Function<LocalDate, LocalDate> startOf, ZoneId zone) {
        Map<LocalDate, List<AchievementService.Attempt>> by = attempts.stream().filter(a -> a.attempted() > 0)
                .collect(Collectors.groupingBy(a -> startOf.apply(day(a, zone))));
        return starts.stream().map(s -> {
            List<AchievementService.Attempt> in = by.getOrDefault(s, List.of());
            int answered = in.stream().mapToInt(AchievementService.Attempt::attempted).sum();
            int correct = in.stream().mapToInt(AchievementService.Attempt::correct).sum();
            return new ProgressDtos.Period(s, in.size(), answered, correct, percent(correct, answered),
                    in.stream().mapToLong(AchievementService.Attempt::points).sum());
        }).toList();
    }

    private List<ProgressDtos.ExamRow> examRows(List<AchievementService.Attempt> attempts) {
        Map<String, List<AchievementService.Attempt>> by = new LinkedHashMap<>();
        for (AchievementService.Attempt a : attempts) {
            if (a.examSlug() != null && a.attempted() > 0) by.computeIfAbsent(a.examSlug(), k -> new ArrayList<>()).add(a);
        }
        if (by.isEmpty()) return List.of();
        Map<String, String> names = new HashMap<>();
        for (Exam e : exams.findByPublishedTrueOrderByDisplayOrderAscShortNameAsc()) names.put(e.getSlug(), e.getShortName());
        List<ProgressDtos.ExamRow> rows = new ArrayList<>();
        by.forEach((slug, in) -> {
            int answered = in.stream().mapToInt(AchievementService.Attempt::attempted).sum();
            int correct = in.stream().mapToInt(AchievementService.Attempt::correct).sum();
            int best = in.stream().filter(a -> a.total() > 0).mapToInt(a -> (int) Math.round(100.0 * a.correct() / a.total())).max().orElse(0);
            rows.add(new ProgressDtos.ExamRow(slug, names.getOrDefault(slug, slug), in.size(), answered, correct, percent(correct, answered), best));
        });
        rows.sort(Comparator.comparingInt(ProgressDtos.ExamRow::tests).reversed());
        return rows;
    }

    private static List<ProgressDtos.DailyDay> daily(List<AchievementService.Attempt> attempts) {
        return attempts.stream().filter(a -> a.dailyDate() != null)
                .sorted(Comparator.comparing(AchievementService.Attempt::dailyDate).reversed()).limit(DAILY_HISTORY)
                .map(a -> new ProgressDtos.DailyDay(a.dailyDate(), a.total(), a.attempted(), a.correct(), a.points())).toList();
    }

    private static Integer percent(int part, int whole) {
        return whole == 0 ? null : (int) Math.round(100.0 * part / whole);
    }
}
