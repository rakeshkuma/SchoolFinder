package com.indiaschoolfinder.service;

import com.indiaschoolfinder.dto.practice.ScoreResultDto;
import com.indiaschoolfinder.entity.Challenge;
import com.indiaschoolfinder.entity.PracticeAttempt;
import com.indiaschoolfinder.dto.practice.PracticeMode;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Map;

/**
 * Leaderboard points, decided only here and only from the server's own scoring. Points are not marks: an attempt's
 * raw marks follow its set's marking scheme, while points reward learning new questions without letting a small bank
 * be farmed:
 * <ul>
 *   <li>a question earns {@link #POINTS_PER_CORRECT} the first time the participant answers it correctly;</li>
 *   <li>the daily quiz earns {@link #POINTS_PER_CORRECT} per correct answer once per date, and only when the
 *       questions submitted are that date's draw;</li>
 *   <li>wrong and unanswered questions earn nothing, and there is no speed bonus;</li>
 *   <li>an attempt without timing, or answered faster than {@link #MIN_SECONDS_PER_ANSWER} per question, earns
 *       nothing and is flagged for review.</li>
 * </ul>
 * Each award is a row in points_ledger with a unique key per participant, so a repeated or concurrent submission can
 * never award twice. Statements run one by one (no surrounding transaction): every one is safe to repeat, and a lost
 * race on the daily claim only means the attempt is not that day's quiz.
 */
@Service
public class PointsService {

    public static final int POINTS_PER_CORRECT = 10;
    public static final double MIN_SECONDS_PER_ANSWER = 1.5;
    /** Below this many answers, timing is not checked (a single quick answer is plausible). */
    static final int TIMING_CHECK_FROM = 5;

    private final JdbcTemplate jdbc;
    private final PracticeService practiceService;
    private final Clock clock;

    public PointsService(JdbcTemplate jdbc, PracticeService practiceService, Clock clock) {
        this.jdbc = jdbc;
        this.practiceService = practiceService;
        this.clock = clock;
    }

    /** Awards a newly saved attempt's points (it must have its participant) and records them on the row and object. */
    public void award(PracticeAttempt attempt) {
        String flag = timingFlag(attempt);
        LocalDate daily = null;
        if (flag == null && attempt.getMode() == PracticeMode.DAILY && isTodaysDraw(attempt)) {
            daily = claimDaily(attempt, LocalDate.now(clock));
            if (daily == null) {
                flag = "DAILY_REPEAT"; // today's quiz already counted; a retake must not earn its questions again
            }
        }
        finish(attempt, flag, daily);
    }

    /**
     * Counts an attempt again for the participant it now belongs to (a guest's attempts moved into a member's
     * account), after its daily_date was cleared for the move. It counts as {@code formerDailyDate}'s quiz again
     * unless that date is already counted, and keeps its review flag.
     */
    public void carryOver(PracticeAttempt attempt, LocalDate formerDailyDate) {
        LocalDate daily = formerDailyDate == null ? null : claimDaily(attempt, formerDailyDate);
        finish(attempt, attempt.getReviewFlag(), daily);
    }

    private void finish(PracticeAttempt attempt, String flag, LocalDate daily) {
        int points = 0;
        if (flag == null) {
            Map<String, PracticeService.BankItem> bank = practiceService.bankIndex();
            for (ScoreResultDto.QuestionResult q : attempt.getResponses().score().questions()) {
                PracticeService.BankItem item = bank.get(q.id());
                if (!q.correct() || item == null) continue;
                points += POINTS_PER_CORRECT * jdbc.update("""
                        INSERT INTO points_ledger (participant_id, attempt_id, award_key, question_id, set_slug, exam_slug,
                                                   category, section, source, points, earned_at)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT (participant_id, award_key) DO NOTHING""",
                        attempt.getParticipantId(), attempt.getId(), daily != null ? "d:" + daily + ":" + q.id() : "q:" + q.id(),
                        q.id(), item.set().getSlug(), item.set().getExamSlug(),
                        item.set().getCategory() == null ? null : item.set().getCategory().name(), item.question().section(),
                        daily != null ? "DAILY" : "PRACTICE", POINTS_PER_CORRECT, Timestamp.from(attempt.getCreatedAt()));
            }
        }
        jdbc.update("UPDATE practice_attempt SET points = ?, review_flag = ? WHERE id = ?", points, flag, attempt.getId());
        attempt.setPoints(points);
        attempt.setReviewFlag(flag);
        attempt.setDailyDate(daily);
    }

    /**
     * Awards a challenge attempt by the challenge's own scoring: its points for each correct answer, once per question
     * for that challenge, and its completion bonus once. An implausibly fast attempt earns nothing and is flagged,
     * unless {@code timingReviewed}: a moderator has cleared it.
     */
    public void awardChallenge(PracticeAttempt attempt, Challenge c, boolean timingReviewed) {
        String flag = timingReviewed ? null : timingFlag(attempt);
        int points = 0;
        if (flag == null) {
            Map<String, PracticeService.BankItem> bank = practiceService.bankIndex();
            String category = c.getCategory() == null ? null : c.getCategory().name();
            for (ScoreResultDto.QuestionResult q : attempt.getResponses().score().questions()) {
                PracticeService.BankItem item = bank.get(q.id());
                if (!q.correct() || item == null) continue;
                points += challengeAward(attempt, c, "c:" + c.getId() + ":" + q.id(), q.id(), item.set().getSlug(),
                        item.set().getExamSlug(), item.set().getCategory() == null ? category : item.set().getCategory().name(),
                        item.question().section(), c.getPointsPerCorrect());
            }
            if (c.getCompletionBonus() > 0 && attempt.getAttempted() > 0) {
                points += challengeAward(attempt, c, "c:" + c.getId() + ":bonus", "bonus", c.getSlug(), c.getExamSlug(), category, null,
                        c.getCompletionBonus());
            }
        }
        jdbc.update("UPDATE practice_attempt SET points = ?, review_flag = ? WHERE id = ?", points, flag, attempt.getId());
        attempt.setPoints(points);
        attempt.setReviewFlag(flag);
    }

    private int challengeAward(PracticeAttempt attempt, Challenge c, String key, String questionId, String setSlug, String examSlug,
                               String category, String section, int points) {
        return points * jdbc.update("""
                INSERT INTO points_ledger (participant_id, attempt_id, award_key, question_id, set_slug, exam_slug, category, section,
                                           source, points, earned_at, challenge_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'CHALLENGE', ?, ?, ?)
                ON CONFLICT (participant_id, award_key) DO NOTHING""",
                attempt.getParticipantId(), attempt.getId(), key, questionId, setSlug, examSlug, category, section, points,
                Timestamp.from(attempt.getCreatedAt()), c.getId());
    }

    /** A moderator cleared this flagged practice attempt: it counts as an ordinary attempt. */
    public void clearFlag(PracticeAttempt attempt) {
        finish(attempt, null, attempt.getDailyDate());
    }

    /** A moderator voided this attempt: it earns nothing and never counts again. */
    public void voidAttempt(PracticeAttempt attempt) {
        jdbc.update("DELETE FROM points_ledger WHERE attempt_id = ?", attempt.getId());
        jdbc.update("UPDATE practice_attempt SET points = 0, daily_date = NULL, review_flag = 'VOIDED' WHERE id = ?", attempt.getId());
    }

    /** NO_TIMING or TOO_FAST when correct answers cannot earn points; null when the timing is plausible. */
    static String timingFlag(PracticeAttempt attempt) {
        ScoreResultDto score = attempt.getResponses().score();
        if (score.correct() == 0) return null;
        if (attempt.getDurationSeconds() == null) return "NO_TIMING";
        if (score.attempted() >= TIMING_CHECK_FROM && attempt.getDurationSeconds() < score.attempted() * MIN_SECONDS_PER_ANSWER) {
            return "TOO_FAST";
        }
        return null;
    }

    /** Marks the attempt as the participant's quiz for that date; null if another attempt already is. */
    private LocalDate claimDaily(PracticeAttempt attempt, LocalDate date) {
        try {
            int claimed = jdbc.update("""
                    UPDATE practice_attempt SET daily_date = ? WHERE id = ? AND NOT EXISTS (
                        SELECT 1 FROM practice_attempt o WHERE o.participant_id = ? AND o.daily_date = ? AND o.id <> ?)""",
                    date, attempt.getId(), attempt.getParticipantId(), date, attempt.getId());
            return claimed == 1 ? date : null;
        } catch (DataIntegrityViolationException raced) {
            return null; // a concurrent attempt claimed the date first (unique index)
        }
    }

    /** The submitted questions are exactly the daily draw for the attempt's exam filter today. */
    private boolean isTodaysDraw(PracticeAttempt attempt) {
        List<String> drawn = practiceService.session(PracticeMode.DAILY,
                        new PracticeService.BankFilter(attempt.getExamSlug(), null, null, null, null), null, null, null)
                .questions().stream().map(q -> q.id()).toList();
        return !drawn.isEmpty() && new HashSet<>(drawn).equals(new HashSet<>(attempt.getResponses().questionIds()));
    }
}
