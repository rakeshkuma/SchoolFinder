package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.ChallengeDtos;
import com.indiaschoolfinder.dto.practice.LeaderboardDtos;
import com.indiaschoolfinder.dto.practice.PracticeMode;
import com.indiaschoolfinder.dto.practice.ProgressDtos;
import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.entity.Challenge;
import com.indiaschoolfinder.entity.Participant;
import com.indiaschoolfinder.entity.PracticeAttempt;
import com.indiaschoolfinder.exception.AccountException;
import com.indiaschoolfinder.exception.ResourceNotFoundException;
import com.indiaschoolfinder.repository.ChallengeRepository;
import com.indiaschoolfinder.repository.PracticeAttemptRepository;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Challenges over the existing question bank. An attempt starts on the server, so its time limit does not rest on the
 * browser's clock; the server scores it, and a second submission returns the first result. Browser-based tests cannot
 * fully prevent cheating: bank questions can also be seen in ordinary practice, so timing checks and moderator review
 * reduce misuse without ruling it out.
 */
@Service
public class ChallengeService {

    /** Allowance for the network after the deadline; the browser submits by itself when time is up. */
    static final Duration GRACE = Duration.ofSeconds(60);

    private final ChallengeRepository challenges;
    private final PracticeService practice;
    private final PracticeAttemptRepository attempts;
    private final PointsService points;
    private final AchievementService achievements;
    private final MemberPracticeService memberPractice;
    private final LeaderboardService leaderboard;
    private final JdbcTemplate jdbc;
    private final Clock clock;

    public ChallengeService(ChallengeRepository challenges, PracticeService practice, PracticeAttemptRepository attempts,
                            PointsService points, AchievementService achievements, MemberPracticeService memberPractice,
                            LeaderboardService leaderboard, JdbcTemplate jdbc, Clock clock) {
        this.challenges = challenges;
        this.practice = practice;
        this.attempts = attempts;
        this.points = points;
        this.achievements = achievements;
        this.memberPractice = memberPractice;
        this.leaderboard = leaderboard;
        this.jdbc = jdbc;
        this.clock = clock;
    }

    static ChallengeDtos.Status status(Challenge c, Instant now) {
        return now.isBefore(c.getStartsAt()) ? ChallengeDtos.Status.UPCOMING
                : now.isBefore(c.getEndsAt()) ? ChallengeDtos.Status.ACTIVE : ChallengeDtos.Status.COMPLETED;
    }

    static int maxScore(Challenge c) {
        return c.getQuestionIds().size() * c.getPointsPerCorrect() + c.getCompletionBonus();
    }

    /** Open challenges first, soonest to close; then upcoming, soonest first; then finished, latest first. */
    public List<ChallengeDtos.Summary> list() {
        Instant now = Instant.now(clock);
        Map<Long, Long> counts = participantCounts();
        Comparator<Challenge> order = Comparator.comparingInt((Challenge c) -> status(c, now).ordinal() == 1 ? 0 : status(c, now).ordinal() == 0 ? 1 : 2)
                .thenComparingLong(c -> switch (status(c, now)) {
                    case ACTIVE -> c.getEndsAt().toEpochMilli();
                    case UPCOMING -> c.getStartsAt().toEpochMilli();
                    case COMPLETED -> -c.getEndsAt().toEpochMilli();
                });
        return challenges.findByPublishedTrueOrderByStartsAtDesc().stream().sorted(order)
                .map(c -> summary(c, counts.getOrDefault(c.getId(), 0L), now)).toList();
    }

    public ChallengeDtos.Detail detail(String slug, Long participantId) {
        Challenge c = published(slug);
        Instant now = Instant.now(clock);
        return new ChallengeDtos.Detail(summary(c, participantCounts().getOrDefault(c.getId(), 0L), now), c.getRules(), c.getPointsPerCorrect(),
                c.getCompletionBonus(), c.isLeaderboardEnabled(), released(c, now), participantId == null ? null : mine(c, participantId, now));
    }

    /** Starts an attempt, or returns the one in progress so a reload does not restart the clock. */
    public ChallengeDtos.Started start(String slug, long participantId) {
        Challenge c = published(slug);
        Instant now = Instant.now(clock);
        if (status(c, now) != ChallengeDtos.Status.ACTIVE) throw conflict("CHALLENGE_CLOSED", "This challenge is not open right now.");
        expireOverdue(c.getId(), participantId, now);
        Open open = open(c.getId(), participantId);
        if (open == null) {
            Integer used = jdbc.queryForObject("SELECT count(*) FROM challenge_attempt WHERE challenge_id = ? AND participant_id = ?",
                    Integer.class, c.getId(), participantId);
            int taken = used == null ? 0 : used;
            if (taken < c.getMaxAttempts()) {
                Instant limit = now.plus(Duration.ofMinutes(c.getDurationMinutes()));
                Instant deadline = limit.isBefore(c.getEndsAt()) ? limit : c.getEndsAt();
                // Two starts at once: the unique indexes let one through, and the other picks up its attempt.
                jdbc.update("""
                        INSERT INTO challenge_attempt (challenge_id, participant_id, attempt_no, started_at, deadline_at)
                        VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING""",
                        c.getId(), participantId, taken + 1, Timestamp.from(now), Timestamp.from(deadline));
            }
            open = open(c.getId(), participantId); // also finds an attempt a concurrent start has just counted
            if (open == null) throw conflict("CHALLENGE_LIMIT", "You have used every attempt at this challenge.");
        }
        return new ChallengeDtos.Started(open.id, open.startedAt, open.deadlineAt,
                practice.session(PracticeMode.RETRY, new PracticeService.BankFilter(null, null, null, null, null), null, c.getQuestionIds(), null));
    }

    /**
     * Scores a submission once. Time comes from the server. A repeat returns the first result; answers arriving after
     * the deadline and its allowance are refused, and the attempt counts as used.
     */
    public ChallengeDtos.Submitted submit(String slug, long attemptId, Participant who, Map<String, Integer> answers) {
        Challenge c = published(slug);
        Instant now = Instant.now(clock);
        List<Map<String, Object>> rows = jdbc.queryForList("""
                SELECT started_at, deadline_at, submitted_at, expired, practice_attempt_id FROM challenge_attempt
                WHERE id = ? AND challenge_id = ? AND participant_id = ?""", attemptId, c.getId(), who.getId());
        if (rows.isEmpty()) throw new ResourceNotFoundException("Challenge attempt", attemptId);
        Map<String, Object> row = rows.get(0);
        if (row.get("submitted_at") != null) return alreadySubmitted(c, row, now);
        Instant startedAt = ((Timestamp) row.get("started_at")).toInstant();
        Instant deadline = ((Timestamp) row.get("deadline_at")).toInstant();
        if (now.isAfter(deadline.plus(GRACE))) {
            expireOverdue(c.getId(), who.getId(), now);
            throw conflict("CHALLENGE_TIME_UP", "The time for this attempt ended before your answers arrived.");
        }
        List<String> ids = c.getQuestionIds().stream().filter(practice.bankIndex()::containsKey).toList();
        if (ids.isEmpty()) throw conflict("CHALLENGE_CLOSED", "This challenge's questions are no longer available.");
        ScoreResultDto score = practice.scoreBank(ids, answers); // refuses bad answers before the attempt is used up
        int claimed = jdbc.update("UPDATE challenge_attempt SET submitted_at = ? WHERE id = ? AND submitted_at IS NULL",
                Timestamp.from(now), attemptId);
        if (claimed == 0) { // a concurrent submission got there first
            return alreadySubmitted(c, jdbc.queryForMap("""
                    SELECT started_at, deadline_at, submitted_at, expired, practice_attempt_id FROM challenge_attempt WHERE id = ?""", attemptId), now);
        }
        int seconds = (int) Math.min(86400, Math.max(0, Duration.between(startedAt, now).toSeconds()));
        PracticeAttempt a = new PracticeAttempt();
        a.setAccountId(who.getAccountId());
        a.setParticipantId(who.getId());
        a.setClientId(UUID.nameUUIDFromBytes(("challenge-attempt-" + attemptId).getBytes(StandardCharsets.UTF_8)));
        a.setTitle(c.getTitle());
        a.setMode(PracticeMode.CHALLENGE);
        a.setExamSlug(c.getExamSlug());
        a.setTotal(score.total());
        a.setAttempted(score.attempted());
        a.setCorrect(score.correct());
        a.setMarks(score.marks());
        a.setMaxMarks(score.maxMarks());
        a.setDurationSeconds(seconds);
        a.setChallengeId(c.getId());
        if (!released(c, now)) a.setResultsHiddenUntil(c.getEndsAt());
        a.setResponses(new PracticeAttempt.Responses(List.copyOf(ids), Map.copyOf(answers), score));
        a = attempts.saveAndFlush(a);
        points.awardChallenge(a, c, false);
        int attemptScore = score.correct() * c.getPointsPerCorrect() + (score.attempted() > 0 ? c.getCompletionBonus() : 0);
        jdbc.update("""
                UPDATE challenge_attempt SET practice_attempt_id = ?, score = ?, correct = ?, attempted = ?, total = ?, duration_seconds = ?
                WHERE id = ?""", a.getId(), attemptScore, score.correct(), score.attempted(), score.total(), seconds, attemptId);
        List<ProgressDtos.Earned> earned = achievements.evaluate(who.getId());
        if (!released(c, now)) return new ChallengeDtos.Submitted(false, c.getEndsAt(), null, null, seconds);
        return new ChallengeDtos.Submitted(true, null, score, memberPractice.pointsOf(a, earned), seconds);
    }

    /** The challenge's ranking; empty when its leaderboard is off or its results are not released yet. */
    public LeaderboardDtos.Page board(String slug, int page, int size, Long participantId) {
        Challenge c = published(slug);
        if (!c.isLeaderboardEnabled() || !released(c, Instant.now(clock))) {
            return new LeaderboardDtos.Page(LeaderboardDtos.Period.ALL, c.getStartsAt(), 0, 0, 0, size, List.of(), null);
        }
        return leaderboard.challenge(c.getId(), c.getStartsAt(), page, size, participantId);
    }

    private ChallengeDtos.Submitted alreadySubmitted(Challenge c, Map<String, Object> row, Instant now) {
        if (Boolean.TRUE.equals(row.get("expired"))) {
            throw conflict("CHALLENGE_TIME_UP", "The time for this attempt ended before your answers arrived.");
        }
        Number practiceId = (Number) row.get("practice_attempt_id");
        if (!released(c, now) || practiceId == null) return new ChallengeDtos.Submitted(false, c.getEndsAt(), null, null, null);
        PracticeAttempt a = attempts.findById(practiceId.longValue()).orElseThrow();
        return new ChallengeDtos.Submitted(true, null, a.getResponses().score(), memberPractice.pointsOf(a, List.of()), a.getDurationSeconds());
    }

    private Challenge published(String slug) {
        return challenges.findBySlugAndPublishedTrue(slug).orElseThrow(() -> new ResourceNotFoundException("Challenge", slug));
    }

    private static boolean released(Challenge c, Instant now) {
        return c.getResultRelease() == Challenge.ResultRelease.IMMEDIATE || !now.isBefore(c.getEndsAt());
    }

    private record Open(long id, Instant startedAt, Instant deadlineAt) {
    }

    private Open open(long challengeId, long participantId) {
        return jdbc.query("SELECT id, started_at, deadline_at FROM challenge_attempt WHERE challenge_id = ? AND participant_id = ? AND submitted_at IS NULL",
                (rs, i) -> new Open(rs.getLong(1), rs.getTimestamp(2).toInstant(), rs.getTimestamp(3).toInstant()),
                challengeId, participantId).stream().findFirst().orElse(null);
    }

    /** An attempt left past its deadline and allowance is over: used, with nothing scored. */
    private void expireOverdue(long challengeId, long participantId, Instant now) {
        jdbc.update("""
                UPDATE challenge_attempt SET submitted_at = deadline_at, expired = TRUE
                WHERE challenge_id = ? AND participant_id = ? AND submitted_at IS NULL AND deadline_at < ?""",
                challengeId, participantId, Timestamp.from(now.minus(GRACE)));
    }

    private ChallengeDtos.Mine mine(Challenge c, long participantId, Instant now) {
        expireOverdue(c.getId(), participantId, now);
        Integer used = jdbc.queryForObject("SELECT count(*) FROM challenge_attempt WHERE challenge_id = ? AND participant_id = ?",
                Integer.class, c.getId(), participantId);
        int taken = used == null ? 0 : used;
        ChallengeDtos.MyResult best = !released(c, now) ? null : jdbc.query("""
                SELECT ca.practice_attempt_id, ca.score, ca.correct, ca.total, ca.duration_seconds, ca.submitted_at, a.review_flag
                FROM challenge_attempt ca JOIN practice_attempt a ON a.id = ca.practice_attempt_id
                WHERE ca.challenge_id = ? AND ca.participant_id = ? ORDER BY ca.score DESC, ca.duration_seconds ASC LIMIT 1""",
                (rs, i) -> new ChallengeDtos.MyResult(rs.getLong(1), rs.getInt(2), rs.getInt(3), rs.getInt(4), (Integer) rs.getObject(5),
                        rs.getTimestamp(6).toInstant(), rs.getString(7)), c.getId(), participantId).stream().findFirst().orElse(null);
        return new ChallengeDtos.Mine(taken, Math.max(0, c.getMaxAttempts() - taken), open(c.getId(), participantId) != null, best);
    }

    ChallengeDtos.Summary summary(Challenge c, long participants, Instant now) {
        return new ChallengeDtos.Summary(c.getSlug(), c.getTitle(), c.getDescription(), c.getKind(), c.getExamSlug(), c.getCategory(),
                c.getDifficulty(), c.getQuestionIds().size(), c.getDurationMinutes(), c.getStartsAt(), c.getEndsAt(), maxScore(c),
                c.getMaxAttempts(), participants, status(c, now), c.getResultRelease());
    }

    /** Students with a submitted attempt, per challenge. */
    Map<Long, Long> participantCounts() {
        Map<Long, Long> counts = new HashMap<>();
        jdbc.query("SELECT challenge_id, count(DISTINCT participant_id) FROM challenge_attempt WHERE practice_attempt_id IS NOT NULL GROUP BY challenge_id",
                rs -> { counts.put(rs.getLong(1), rs.getLong(2)); });
        return counts;
    }

    private static AccountException conflict(String code, String message) {
        return new AccountException(HttpStatus.CONFLICT, code, message);
    }
}
