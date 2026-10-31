package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.ProgressDtos;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

/**
 * Badges, awarded only here and only from the student's own stored attempts and points; nothing outside this class
 * writes them. A test counts when at least half of it was answered and it was not flagged (too fast, or untimed).
 * Evaluating is safe to repeat: the unique key means a badge is awarded once, dated when it was reached.
 */
@Service
public class AchievementService {

    /** The top-10 and top-100 badges mean little in a small field, so they wait for enough ranked students. */
    static final int TOP_10_MIN_FIELD = 50;
    static final int TOP_100_MIN_FIELD = 500;
    /** Questions answered before accuracy can earn a badge. */
    static final int ACCURACY_MIN_ANSWERED = 100;
    static final int ACCURACY_PERCENT = 90;

    /** A badge's rule. Thresholds suit the questions the bank really has, so every badge can be earned. */
    private record Rule(String code, String title, String description, String group, int target, String exam, String category) {
    }

    private static Rule rule(String code, String title, String description, String group, int target) {
        return new Rule(code, title, description, group, target, null, null);
    }

    private static final List<Rule> RULES = List.of(
            rule("FIRST_TEST", "First test completed", "Finish your first practice test.", "Getting started", 1),
            rule("FIRST_DAILY", "First daily quiz", "Complete a daily quiz.", "Getting started", 1),
            rule("TESTS_10", "10 tests completed", "Finish 10 practice tests.", "Practice", 10),
            rule("TESTS_50", "50 tests completed", "Finish 50 practice tests.", "Practice", 50),
            rule("STREAK_7", "7-day learning streak", "Practise on 7 days in a row.", "Streaks", 7),
            rule("STREAK_30", "30-day learning streak", "Practise on 30 days in a row.", "Streaks", 30),
            rule("ACCURACY_CHAMPION", "Accuracy champion",
                    "Reach " + ACCURACY_PERCENT + "% accuracy over at least " + ACCURACY_MIN_ANSWERED + " answered questions, not counting retakes.",
                    "Practice", ACCURACY_MIN_ANSWERED),
            rule("NETARHAT_CHALLENGE", "Netarhat challenge finisher", "Finish a Netarhat challenge.", "Exams", 1),
            new Rule("NETARHAT_CHAMPION", "Netarhat practice champion", "Get 100 different Netarhat questions right.", "Exams", 100, "netarhat", null),
            new Rule("JNVST_CHAMPION", "JNVST practice champion", "Get 50 different JNVST questions right.", "Exams", 50, "jnvst", null),
            new Rule("AISSEE_CHAMPION", "AISSEE practice champion", "Get 50 different AISSEE questions right.", "Exams", 50, "aissee", null),
            new Rule("OLYMPIAD_PERFORMER", "Olympiad performer", "Get 10 different Olympiad questions right.", "Exams", 10, null, "OLYMPIAD"),
            rule("TOP_10", "Top 10 performer",
                    "Reach the all-time top 10, once at least " + TOP_10_MIN_FIELD + " students are ranked.", "Rankings", 0),
            rule("TOP_100", "Top 100 performer",
                    "Reach the all-time top 100, once at least " + TOP_100_MIN_FIELD + " students are ranked.", "Rankings", 0));

    /** One stored attempt, without its answers. */
    record Attempt(Instant at, String mode, int total, int attempted, int correct, LocalDate dailyDate, String examSlug,
                   String reviewFlag, int points) {

        /** The Java form of {@link LeaderboardService#COUNTED}. */
        boolean counted() {
            return attempted > 0 && attempted * 2 >= total && (reviewFlag == null || reviewFlag.equals("DAILY_REPEAT"));
        }
    }

    record Outcome(Map<String, Instant> reached, Map<String, Integer> current) {
    }

    private final JdbcTemplate jdbc;
    private final LeaderboardService leaderboard;
    private final Clock clock;

    public AchievementService(JdbcTemplate jdbc, LeaderboardService leaderboard, Clock clock) {
        this.jdbc = jdbc;
        this.leaderboard = leaderboard;
        this.clock = clock;
    }

    /** Every badge, as anyone may read it: what can be earned and how. */
    public List<ProgressDtos.Achievement> catalogue() {
        return RULES.stream().map(r -> view(r, null, 0)).toList();
    }

    /** Awards every badge the participant has reached and not yet got; returns the new ones. */
    public List<ProgressDtos.Earned> evaluate(long participantId) {
        return award(participantId, outcome(participantId));
    }

    /**
     * After a moderator voids an attempt: removes badges the student no longer reaches. Rank badges stay, as they
     * record a position held at the time and cannot be worked out again.
     */
    public void reconcile(long participantId) {
        Set<String> reached = outcome(participantId).reached().keySet();
        List<String> held = jdbc.queryForList("SELECT code FROM participant_achievement WHERE participant_id = ?", String.class, participantId);
        for (String code : held) {
            if (!code.startsWith("TOP_") && !reached.contains(code)) {
                jdbc.update("DELETE FROM participant_achievement WHERE participant_id = ? AND code = ?", participantId, code);
            }
        }
    }

    /** The participant's badges, after awarding any they have reached. */
    public List<ProgressDtos.Achievement> forParticipant(long participantId) {
        Outcome outcome = outcome(participantId);
        award(participantId, outcome);
        Map<String, Instant> earned = new HashMap<>();
        jdbc.query("SELECT code, earned_at FROM participant_achievement WHERE participant_id = ?",
                rs -> { earned.put(rs.getString(1), rs.getTimestamp(2).toInstant()); }, participantId);
        return RULES.stream().map(r -> view(r, earned.get(r.code()), outcome.current().getOrDefault(r.code(), 0))).toList();
    }

    List<Attempt> attempts(long participantId) {
        return jdbc.query("""
                SELECT created_at, mode, total, attempted, correct, daily_date, exam_slug, review_flag, points
                FROM practice_attempt WHERE participant_id = ? AND (results_hidden_until IS NULL OR results_hidden_until <= now())
                ORDER BY created_at, id""",
                (rs, i) -> new Attempt(rs.getTimestamp(1).toInstant(), rs.getString(2), rs.getInt(3), rs.getInt(4), rs.getInt(5),
                        rs.getObject(6, LocalDate.class), rs.getString(7), rs.getString(8), rs.getInt(9)), participantId);
    }

    private static ProgressDtos.Achievement view(Rule r, Instant earnedAt, int current) {
        return new ProgressDtos.Achievement(r.code(), r.title(), r.description(), r.group(), earnedAt, Math.min(current, r.target()), r.target());
    }

    private List<ProgressDtos.Earned> award(long participantId, Outcome outcome) {
        List<ProgressDtos.Earned> fresh = new ArrayList<>();
        for (Rule r : RULES) {
            Instant at = outcome.reached().get(r.code());
            if (at == null) continue;
            int added = jdbc.update("""
                    INSERT INTO participant_achievement (participant_id, code, earned_at) VALUES (?, ?, ?)
                    ON CONFLICT (participant_id, code) DO NOTHING""", participantId, r.code(), Timestamp.from(at));
            if (added == 1) fresh.add(new ProgressDtos.Earned(r.code(), r.title()));
        }
        return fresh;
    }

    private Outcome outcome(long participantId) {
        Outcome o = fromAttempts(attempts(participantId), clock.getZone());
        fromPoints(participantId, o);
        LeaderboardService.Position position = leaderboard.position(participantId);
        if (position != null) {
            Instant now = Instant.now(clock);
            if (position.rank() <= 10 && position.participants() >= TOP_10_MIN_FIELD) o.reached().put("TOP_10", now);
            if (position.rank() <= 100 && position.participants() >= TOP_100_MIN_FIELD) o.reached().put("TOP_100", now);
        }
        return o;
    }

    /** Walks the attempts in order, so each badge is dated when it was really reached. */
    static Outcome fromAttempts(List<Attempt> attempts, java.time.ZoneId zone) {
        Map<String, Instant> reached = new HashMap<>();
        Map<String, Integer> current = new HashMap<>();
        int tests = 0;
        int answered = 0;
        int correct = 0;
        int run = 0;
        int bestRun = 0;
        LocalDate lastDay = null;
        for (Attempt a : attempts) {
            if (!a.counted()) continue;
            tests++;
            if (tests >= 1) reached.putIfAbsent("FIRST_TEST", a.at());
            if (tests >= 10) reached.putIfAbsent("TESTS_10", a.at());
            if (tests >= 50) reached.putIfAbsent("TESTS_50", a.at());
            if (a.dailyDate() != null) {
                reached.putIfAbsent("FIRST_DAILY", a.at());
                current.put("FIRST_DAILY", 1);
            }
            if ("CHALLENGE".equals(a.mode()) && "netarhat".equals(a.examSlug())) {
                reached.putIfAbsent("NETARHAT_CHALLENGE", a.at());
                current.put("NETARHAT_CHALLENGE", 1);
            }
            LocalDate day = a.at().atZone(zone).toLocalDate();
            if (!day.equals(lastDay)) {
                run = day.minusDays(1).equals(lastDay) ? run + 1 : 1;
                lastDay = day;
                bestRun = Math.max(bestRun, run);
            }
            if (run >= 7) reached.putIfAbsent("STREAK_7", a.at());
            if (run >= 30) reached.putIfAbsent("STREAK_30", a.at());
            if (!Objects.equals(a.mode(), "RETRY") && !Objects.equals(a.mode(), "REVISION")) {
                answered += a.attempted();
                correct += a.correct();
                if (answered >= ACCURACY_MIN_ANSWERED && correct * 100 >= answered * ACCURACY_PERCENT) {
                    reached.putIfAbsent("ACCURACY_CHAMPION", a.at());
                }
            }
        }
        current.put("FIRST_TEST", tests);
        current.put("TESTS_10", tests);
        current.put("TESTS_50", tests);
        current.put("STREAK_7", bestRun);
        current.put("STREAK_30", bestRun);
        current.put("ACCURACY_CHAMPION", answered);
        return new Outcome(reached, current);
    }

    /** Exam badges count different questions answered correctly, so retakes add nothing. */
    private void fromPoints(long participantId, Outcome o) {
        List<Rule> examRules = RULES.stream().filter(r -> r.exam() != null || r.category() != null).toList();
        jdbc.query("""
                SELECT exam_slug, category, min(earned_at) FROM points_ledger WHERE participant_id = ?
                GROUP BY question_id, exam_slug, category ORDER BY min(earned_at)""", rs -> {
            String exam = rs.getString(1);
            String category = rs.getString(2);
            for (Rule r : examRules) {
                if (r.exam() != null ? !r.exam().equals(exam) : !r.category().equals(category)) continue;
                int n = o.current().merge(r.code(), 1, Integer::sum);
                if (n == r.target()) o.reached().putIfAbsent(r.code(), rs.getTimestamp(3).toInstant());
            }
        }, participantId);
    }
}
